import { describe, expect, it } from 'vitest';
import {
  blockContainsAddress,
  blockContainsBlock,
  formatIpBlock,
  hasHostBits,
  parseIpAddress,
  parseIpBlock,
  withoutHostBits,
} from './ip-block';

const block = (text: string) => {
  const parsed = parseIpBlock(text);
  if (!parsed) {
    throw new Error(`${text} should parse`);
  }
  return parsed;
};

const address = (text: string) => {
  const parsed = parseIpAddress(text);
  if (!parsed) {
    throw new Error(`${text} should parse`);
  }
  return parsed;
};

describe('parseIpAddress', () => {
  it.each([
    ['172.20.0.1', 'ipv4'],
    ['0.0.0.0', 'ipv4'],
    ['255.255.255.255', 'ipv4'],
    ['::', 'ipv6'],
    ['::1', 'ipv6'],
    ['fd00:1::1', 'ipv6'],
    ['FD00:0001:0000:0000:0000:0000:0000:0001', 'ipv6'],
    ['2001:db8::192.0.2.33', 'ipv6'],
    ['::ffff:10.0.0.1', 'ipv6'],
  ])('reads %s as %s', (text, family) => {
    expect(parseIpAddress(text)?.family).toBe(family);
  });

  it.each([
    '',
    '172.20.0',
    '172.20.0.256',
    '172.20.0.01',
    '172.20.0.1.5',
    ' 172.20.0.1',
    '1:2:3:4:5:6:7:8:9',
    '1:2:3:4:5:6:7',
    '1::2::3',
    '1:2:3:4:5:6:7::8',
    'fd00::12345',
    'fd00::g',
    'fe80::1%eth0',
    '10.0.0.1::',
    'localhost',
  ])('rejects %j', text => {
    expect(parseIpAddress(text)).toBeNull();
  });

  it('gives equal values to equal IPv6 addresses written differently', () => {
    expect(address('fd00:0:0::1').value).toBe(address('FD00::0001').value);
  });
});

describe('parseIpBlock', () => {
  it.each(['172.20.0.0/16', '10.0.0.0/8', '0.0.0.0/0', 'fd00:1::/64', '::/0'])(
    'reads %s',
    text => {
      expect(parseIpBlock(text)).not.toBeNull();
    }
  );

  it.each([
    '172.20.0.0',
    '172.20.0.0/',
    '172.20.0.0/33',
    '172.20.0.0/016',
    '172.20.0.0/-1',
    '172.20.0.0/16/1',
    'fd00::/129',
    '/16',
  ])('rejects %j', text => {
    expect(parseIpBlock(text)).toBeNull();
  });
});

describe('host bits', () => {
  it('finds host bits set below the prefix', () => {
    expect(hasHostBits(block('172.20.0.1/16'))).toBe(true);
    expect(hasHostBits(block('fd00:1::1/64'))).toBe(true);
    expect(hasHostBits(block('172.20.0.0/16'))).toBe(false);
    expect(hasHostBits(block('fd00:1::/64'))).toBe(false);
  });

  it('clears them to give the network address', () => {
    expect(formatIpBlock(withoutHostBits(block('172.20.5.9/16')))).toBe(
      '172.20.0.0/16'
    );
    expect(formatIpBlock(withoutHostBits(block('fd00:1::9/64')))).toBe(
      'fd00:1::/64'
    );
  });
});

describe('containment', () => {
  it('knows which addresses are inside a block', () => {
    const subnet = block('172.20.0.0/16');

    expect(blockContainsAddress(subnet, address('172.20.0.1'))).toBe(true);
    expect(blockContainsAddress(subnet, address('172.20.255.255'))).toBe(true);
    expect(blockContainsAddress(subnet, address('172.21.0.1'))).toBe(false);
    expect(blockContainsAddress(subnet, address('::ffff:172.20.0.1'))).toBe(
      false
    );
  });

  it('knows which blocks are inside a block', () => {
    const subnet = block('172.20.0.0/16');

    expect(blockContainsBlock(subnet, block('172.20.10.0/24'))).toBe(true);
    expect(blockContainsBlock(subnet, block('172.20.0.0/16'))).toBe(true);
    expect(blockContainsBlock(subnet, block('172.0.0.0/8'))).toBe(false);
    expect(blockContainsBlock(subnet, block('172.21.0.0/24'))).toBe(false);
    expect(blockContainsBlock(subnet, block('fd00::/120'))).toBe(false);
  });
});

describe('formatIpBlock', () => {
  it.each([
    ['172.20.0.0/16', '172.20.0.0/16'],
    ['FD00:0001:0000::/64', 'fd00:1::/64'],
    ['2001:db8:0:0:1:0:0:1/128', '2001:db8::1:0:0:1/128'],
    ['2001:0:0:1:0:0:0:1/128', '2001:0:0:1::1/128'],
    ['2001:db8:0:1:1:1:1:1/128', '2001:db8:0:1:1:1:1:1/128'],
    ['::/0', '::/0'],
    ['fd00::/8', 'fd00::/8'],
  ])('writes %s as %s', (text, expected) => {
    expect(formatIpBlock(block(text))).toBe(expected);
  });
});
