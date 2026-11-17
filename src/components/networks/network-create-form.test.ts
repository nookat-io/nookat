import { describe, expect, it } from 'vitest';
import {
  AddressingFields,
  NEW_NETWORK_FORM,
  NetworkCreateForm,
  toNetworkCreateOptions,
  validateNetworkCreateForm,
} from './network-create-form';

const form = (changes: Partial<NetworkCreateForm>): NetworkCreateForm => ({
  ...NEW_NETWORK_FORM,
  name: 'payments',
  ...changes,
});

const ipv4 = (fields: Partial<AddressingFields>): AddressingFields => ({
  ...NEW_NETWORK_FORM.ipv4,
  ...fields,
});

const ipv6 = (fields: Partial<AddressingFields>): AddressingFields => ({
  ...NEW_NETWORK_FORM.ipv6,
  enabled: true,
  ...fields,
});

const errorsFor = (changes: Partial<NetworkCreateForm>) =>
  validateNetworkCreateForm(form(changes), ['backend']);

describe('validateNetworkCreateForm', () => {
  it('accepts a new form once it has a name', () => {
    expect(errorsFor({})).toEqual({});
  });

  it.each([
    ['', 'Network name is required'],
    ['   ', 'Network name is required'],
    ['n'.repeat(129), 'Network name must be at most 128 characters'],
    [
      '-backend',
      "Network name must start with a letter or digit and use only letters, digits, '_', '.' and '-'",
    ],
    [
      'my app',
      "Network name must start with a letter or digit and use only letters, digits, '_', '.' and '-'",
    ],
    [
      'container:web',
      "Network name must start with a letter or digit and use only letters, digits, '_', '.' and '-'",
    ],
    ['bridge', '"bridge" is reserved by Docker'],
    ['Default', '"Default" is reserved by Docker'],
    ['container', '"container" is reserved by Docker'],
    ['backend', 'A network named "backend" already exists'],
    [' backend ', 'A network named "backend" already exists'],
  ])('rejects the name %j', (name, message) => {
    expect(errorsFor({ name }).name).toBe(message);
  });

  it.each(['a', 'Backend', 'my-app_default', 'app.v2', '9lives'])(
    'accepts the name %j',
    name => {
      expect(errorsFor({ name }).name).toBeUndefined();
    }
  );

  it('needs at least one address family', () => {
    expect(errorsFor({ ipv4: ipv4({ enabled: false }) }).addressFamilies).toBe(
      'Enable IPv4, IPv6 or both'
    );
  });

  it.each([
    [
      { subnet: '172.20.0.0' },
      'ipv4.subnet',
      'IPv4 subnet must be an IPv4 CIDR block, like 172.20.0.0/16',
    ],
    [
      { subnet: 'fd00:1::/64' },
      'ipv4.subnet',
      'IPv4 subnet must be an IPv4 CIDR block, like 172.20.0.0/16',
    ],
    [
      { subnet: '172.20.0.1/16' },
      'ipv4.subnet',
      'IPv4 subnet has host bits set; use 172.20.0.0/16',
    ],
    [{ gateway: '172.20.0.1' }, 'ipv4.gateway', 'IPv4 gateway needs a subnet'],
    [
      { ipRange: '172.20.10.0/24' },
      'ipv4.ipRange',
      'IPv4 IP range needs a subnet',
    ],
    [
      { subnet: '172.20.0.0/16', gateway: '172.20.0.300' },
      'ipv4.gateway',
      'IPv4 gateway must be an IPv4 address, like 172.20.0.1',
    ],
    [
      { subnet: '172.20.0.0/16', gateway: '172.21.0.1' },
      'ipv4.gateway',
      'IPv4 gateway must be inside 172.20.0.0/16',
    ],
    [
      { subnet: '172.20.0.0/16', ipRange: '172.20.10.1/24' },
      'ipv4.ipRange',
      'IPv4 IP range has host bits set; use 172.20.10.0/24',
    ],
    [
      { subnet: '172.20.0.0/16', ipRange: '172.0.0.0/8' },
      'ipv4.ipRange',
      'IPv4 IP range must be inside 172.20.0.0/16',
    ],
  ])('checks IPv4 addressing %j', (fields, field, message) => {
    expect(errorsFor({ ipv4: ipv4(fields) })).toEqual({ [field]: message });
  });

  it('checks a gateway is an address even while the subnet is wrong', () => {
    expect(
      errorsFor({ ipv4: ipv4({ subnet: '172.20.0.0', gateway: 'gateway' }) })
    ).toEqual({
      'ipv4.subnet':
        'IPv4 subnet must be an IPv4 CIDR block, like 172.20.0.0/16',
      'ipv4.gateway': 'IPv4 gateway must be an IPv4 address, like 172.20.0.1',
    });
  });

  it('checks IPv6 addressing against IPv6 blocks', () => {
    expect(errorsFor({ ipv6: ipv6({ subnet: '172.20.0.0/16' }) })).toEqual({
      'ipv6.subnet': 'IPv6 subnet must be an IPv6 CIDR block, like fd00:1::/64',
    });
    expect(
      errorsFor({ ipv6: ipv6({ subnet: 'fd00:1::/64', gateway: 'fd00:2::1' }) })
    ).toEqual({ 'ipv6.gateway': 'IPv6 gateway must be inside fd00:1::/64' });
  });

  it('ignores addressing typed for a family that is switched off', () => {
    expect(
      errorsFor({ ipv6: ipv6({ enabled: false, subnet: 'not a block' }) })
    ).toEqual({});
  });

  it('only checks the parent interface of macvlan and ipvlan networks', () => {
    const invalidParent = 'eth0/1';

    expect(
      errorsFor({ driver: 'bridge', parentInterface: invalidParent })
    ).toEqual({});
    expect(
      errorsFor({ driver: 'macvlan', parentInterface: invalidParent })
        .parentInterface
    ).toBe(
      "Parent interface must be a Linux interface name: up to 15 characters, no spaces, '/' or ':'"
    );
    expect(errorsFor({ driver: 'ipvlan', parentInterface: 'eth0.10' })).toEqual(
      {}
    );
  });

  it('needs a unique key on every label that is not blank', () => {
    expect(
      errorsFor({
        labels: [
          { id: 0, key: 'team', value: 'payments' },
          { id: 1, key: '', value: 'orphan' },
          { id: 2, key: 'team ', value: 'billing' },
          { id: 3, key: '', value: '' },
        ],
      })
    ).toEqual({
      'label.1': 'Label key is required',
      'label.2': 'Label key "team" is used more than once',
    });
  });
});

describe('toNetworkCreateOptions', () => {
  it('sends only the name, driver and switches for a plain network', () => {
    expect(toNetworkCreateOptions(form({ name: ' payments ' }))).toEqual({
      name: 'payments',
      driver: 'bridge',
      internal: false,
      attachable: false,
      ipv4: { enabled: true },
      ipv6: { enabled: false },
      labels: [],
    });
  });

  it('sends trimmed addressing, the parent interface and non-blank labels', () => {
    const options = toNetworkCreateOptions(
      form({
        driver: 'macvlan',
        parentInterface: ' eth0 ',
        internal: true,
        attachable: true,
        ipv4: ipv4({
          subnet: ' 172.20.0.0/16 ',
          gateway: '172.20.0.1',
          ipRange: '',
        }),
        ipv6: ipv6({ subnet: 'fd00:1::/64' }),
        labels: [
          { id: 0, key: ' team ', value: 'payments' },
          { id: 1, key: '', value: '' },
        ],
      })
    );

    expect(options).toEqual({
      name: 'payments',
      driver: 'macvlan',
      parent_interface: 'eth0',
      internal: true,
      attachable: true,
      ipv4: { enabled: true, subnet: '172.20.0.0/16', gateway: '172.20.0.1' },
      ipv6: { enabled: true, subnet: 'fd00:1::/64' },
      labels: [{ key: 'team', value: 'payments' }],
    });
  });

  it('leaves out what does not apply to the chosen settings', () => {
    const options = toNetworkCreateOptions(
      form({
        driver: 'bridge',
        parentInterface: 'eth0',
        ipv6: ipv6({ enabled: false, subnet: 'fd00:1::/64' }),
      })
    );

    expect(options.parent_interface).toBeUndefined();
    expect(options.ipv6).toEqual({ enabled: false });
  });
});
