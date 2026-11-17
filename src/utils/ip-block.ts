export type IpFamily = 'ipv4' | 'ipv6';

export interface IpAddress {
  family: IpFamily;
  value: bigint;
}

export interface IpBlock {
  address: IpAddress;
  prefixLength: number;
}

const ADDRESS_BITS: Record<IpFamily, number> = { ipv4: 32, ipv6: 128 };
const IPV4_OCTET = /^(0|[1-9]\d{0,2})$/;
const IPV6_GROUP = /^[0-9a-f]{1,4}$/i;
const PREFIX_LENGTH = /^(0|[1-9]\d{0,2})$/;
const IPV6_GROUP_COUNT = 8;

function parseIpv4(text: string): bigint | null {
  const octets = text.split('.');
  if (
    octets.length !== 4 ||
    !octets.every(octet => IPV4_OCTET.test(octet) && Number(octet) <= 255)
  ) {
    return null;
  }
  return octets.reduce((value, octet) => (value << 8n) | BigInt(octet), 0n);
}

function ipv6Groups(text: string, mayEndInIpv4: boolean): number[] | null {
  if (text === '') {
    return [];
  }
  const pieces = text.split(':');
  const groups: number[] = [];
  for (const [index, piece] of pieces.entries()) {
    const isLast = index === pieces.length - 1;
    if (isLast && mayEndInIpv4 && piece.includes('.')) {
      const ipv4 = parseIpv4(piece);
      if (ipv4 === null) {
        return null;
      }
      groups.push(Number(ipv4 >> 16n), Number(ipv4 & 0xffffn));
    } else if (IPV6_GROUP.test(piece)) {
      groups.push(parseInt(piece, 16));
    } else {
      return null;
    }
  }
  return groups;
}

function parseIpv6(text: string): bigint | null {
  const halves = text.split('::');
  if (halves.length > 2) {
    return null;
  }
  const compressed = halves.length === 2;
  const head = ipv6Groups(halves[0], !compressed);
  const tail = compressed ? ipv6Groups(halves[1], true) : [];
  if (head === null || tail === null) {
    return null;
  }

  const written = head.length + tail.length;
  const fitsWithoutCompression = !compressed && written === IPV6_GROUP_COUNT;
  const fitsWithCompression = compressed && written < IPV6_GROUP_COUNT;
  if (!fitsWithoutCompression && !fitsWithCompression) {
    return null;
  }

  const zeros = Array<number>(IPV6_GROUP_COUNT - written).fill(0);
  return [...head, ...zeros, ...tail].reduce(
    (value, group) => (value << 16n) | BigInt(group),
    0n
  );
}

export function parseIpAddress(text: string): IpAddress | null {
  if (text.includes(':')) {
    const value = parseIpv6(text);
    return value === null ? null : { family: 'ipv6', value };
  }
  const value = parseIpv4(text);
  return value === null ? null : { family: 'ipv4', value };
}

export function parseIpBlock(text: string): IpBlock | null {
  const parts = text.split('/');
  if (parts.length !== 2 || !PREFIX_LENGTH.test(parts[1])) {
    return null;
  }
  const address = parseIpAddress(parts[0]);
  const prefixLength = Number(parts[1]);
  if (address === null || prefixLength > ADDRESS_BITS[address.family]) {
    return null;
  }
  return { address, prefixLength };
}

function networkMask(family: IpFamily, prefixLength: number): bigint {
  const bits = BigInt(ADDRESS_BITS[family]);
  const hostBits = bits - BigInt(prefixLength);
  return ((1n << bits) - 1n) ^ ((1n << hostBits) - 1n);
}

export function withoutHostBits(block: IpBlock): IpBlock {
  const { family, value } = block.address;
  return {
    address: { family, value: value & networkMask(family, block.prefixLength) },
    prefixLength: block.prefixLength,
  };
}

export function hasHostBits(block: IpBlock): boolean {
  return withoutHostBits(block).address.value !== block.address.value;
}

export function blockContainsAddress(
  block: IpBlock,
  address: IpAddress
): boolean {
  const { family, value } = block.address;
  const mask = networkMask(family, block.prefixLength);
  return address.family === family && (address.value & mask) === (value & mask);
}

export function blockContainsBlock(outer: IpBlock, inner: IpBlock): boolean {
  return (
    inner.prefixLength >= outer.prefixLength &&
    blockContainsAddress(outer, inner.address)
  );
}

function formatIpv4(value: bigint): string {
  return [24n, 16n, 8n, 0n]
    .map(shift => ((value >> shift) & 0xffn).toString())
    .join('.');
}

function longestZeroRun(groups: number[]): { start: number; length: number } {
  let longest = { start: -1, length: 0 };
  let start = -1;
  groups.forEach((group, index) => {
    if (group !== 0) {
      start = -1;
      return;
    }
    start = start === -1 ? index : start;
    const length = index - start + 1;
    if (length > longest.length) {
      longest = { start, length };
    }
  });
  return longest;
}

function formatIpv6(value: bigint): string {
  const groups = Array.from({ length: IPV6_GROUP_COUNT }, (_, index) =>
    Number((value >> BigInt(16 * (IPV6_GROUP_COUNT - 1 - index))) & 0xffffn)
  );
  const hex = (part: number[]) =>
    part.map(group => group.toString(16)).join(':');

  const zeros = longestZeroRun(groups);
  if (zeros.length < 2) {
    return hex(groups);
  }
  const head = groups.slice(0, zeros.start);
  const tail = groups.slice(zeros.start + zeros.length);
  return `${hex(head)}::${hex(tail)}`;
}

export function formatIpAddress(address: IpAddress): string {
  return address.family === 'ipv4'
    ? formatIpv4(address.value)
    : formatIpv6(address.value);
}

export function formatIpBlock(block: IpBlock): string {
  return `${formatIpAddress(block.address)}/${block.prefixLength}`;
}
