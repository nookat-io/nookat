import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useTableSort } from './use-table-sort';

interface Row {
  id: string;
  name?: string | null;
  size?: number;
  in_use?: boolean;
  created?: Date;
  labels?: { tier?: string };
  names?: string[];
  ports?: unknown[];
}

const ids = (rows: Row[]) => rows.map(row => row.id);

function sortBy(data: Row[], key: string, direction: 'asc' | 'desc' = 'asc') {
  const { result } = renderHook(() => useTableSort(data, key, direction));
  return ids(result.current.sortedData);
}

describe('useTableSort', () => {
  it('keeps the original order when no sort key is set', () => {
    const data: Row[] = [{ id: 'b' }, { id: 'a' }];
    const { result } = renderHook(() => useTableSort(data));

    expect(result.current.sortedData).toBe(data);
    expect(result.current.sortConfig).toEqual({ key: null, direction: 'asc' });
  });

  it('sorts strings, numbers, booleans and dates in both directions', () => {
    const data: Row[] = [
      {
        id: '1',
        name: 'beta',
        size: 30,
        in_use: true,
        created: new Date(2024, 1),
      },
      {
        id: '2',
        name: 'alpha',
        size: 10,
        in_use: false,
        created: new Date(2024, 2),
      },
      {
        id: '3',
        name: 'gamma',
        size: 20,
        in_use: false,
        created: new Date(2024, 0),
      },
    ];

    expect(sortBy(data, 'name')).toEqual(['2', '1', '3']);
    expect(sortBy(data, 'name', 'desc')).toEqual(['3', '1', '2']);
    expect(sortBy(data, 'size')).toEqual(['2', '3', '1']);
    expect(sortBy(data, 'size', 'desc')).toEqual(['1', '3', '2']);
    expect(sortBy(data, 'in_use')).toEqual(['2', '3', '1']);
    expect(sortBy(data, 'created')).toEqual(['3', '1', '2']);
  });

  it('puts missing values last in both directions', () => {
    const data: Row[] = [
      { id: 'none', name: null },
      { id: 'b', name: 'b' },
      { id: 'a', name: 'a' },
    ];

    expect(sortBy(data, 'name')).toEqual(['a', 'b', 'none']);
    expect(sortBy(data, 'name', 'desc')).toEqual(['b', 'a', 'none']);
  });

  it('sorts by a nested field written in dot notation', () => {
    const data: Row[] = [
      { id: 'web', labels: { tier: 'frontend' } },
      { id: 'db', labels: { tier: 'backend' } },
      { id: 'tmp', labels: {} },
    ];

    expect(sortBy(data, 'labels.tier')).toEqual(['db', 'web', 'tmp']);
  });

  it('sorts containers by their first name without the leading slash', () => {
    const data: Row[] = [
      { id: '1', names: ['/zeta'] },
      { id: '2', names: ['/alpha', '/zzz-alias'] },
      { id: '3', names: [] },
    ];

    // A container without names sorts as an empty name, so it comes first.
    expect(sortBy(data, 'names')).toEqual(['3', '2', '1']);
  });

  it('sorts containers by how many ports they publish', () => {
    const data: Row[] = [
      { id: 'two', ports: [{}, {}] },
      { id: 'none' },
      { id: 'one', ports: [{}] },
    ];

    expect(sortBy(data, 'ports')).toEqual(['none', 'one', 'two']);
  });

  it('does not reorder the array it was given', () => {
    const data: Row[] = [
      { id: 'b', name: 'b' },
      { id: 'a', name: 'a' },
    ];
    sortBy(data, 'name');

    expect(ids(data)).toEqual(['b', 'a']);
  });

  it('cycles a column through ascending, descending and unsorted', () => {
    const data: Row[] = [
      { id: 'b', name: 'b', size: 1 },
      { id: 'c', name: 'c', size: 3 },
      { id: 'a', name: 'a', size: 2 },
    ];
    const { result } = renderHook(() => useTableSort(data));

    act(() => result.current.handleSort('name'));
    expect(result.current.sortConfig).toEqual({
      key: 'name',
      direction: 'asc',
    });
    expect(ids(result.current.sortedData)).toEqual(['a', 'b', 'c']);

    act(() => result.current.handleSort('name'));
    expect(result.current.sortConfig).toEqual({
      key: 'name',
      direction: 'desc',
    });
    expect(ids(result.current.sortedData)).toEqual(['c', 'b', 'a']);

    act(() => result.current.handleSort('name'));
    expect(result.current.sortConfig).toEqual({ key: null, direction: null });
    expect(ids(result.current.sortedData)).toEqual(['b', 'c', 'a']);
  });

  it('starts a newly clicked column in ascending order', () => {
    const data: Row[] = [
      { id: 'b', name: 'b', size: 1 },
      { id: 'a', name: 'a', size: 2 },
    ];
    const { result } = renderHook(() => useTableSort(data, 'name', 'desc'));

    act(() => result.current.handleSort('size'));

    expect(result.current.sortConfig).toEqual({
      key: 'size',
      direction: 'asc',
    });
    expect(ids(result.current.sortedData)).toEqual(['b', 'a']);
  });
});
