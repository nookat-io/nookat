import { renderHook, act } from '@testing-library/react';
import { useTableSort } from '../use-table-sort';

interface TestItem {
  id: number;
  name: string;
  age: number;
  active: boolean;
  created: Date;
  nested: {
    value: string;
    deep: {
      field: number;
    };
  };
  names?: string[];
  ports?: unknown[];
}

describe('useTableSort hook', () => {
  const mockData: TestItem[] = [
    {
      id: 3,
      name: 'Charlie',
      age: 30,
      active: true,
      created: new Date('2023-01-01'),
      nested: { value: 'C', deep: { field: 3 } },
      names: ['/container3'],
      ports: ['8080', '9090'],
    },
    {
      id: 1,
      name: 'Alice',
      age: 25,
      active: false,
      created: new Date('2023-03-01'),
      nested: { value: 'A', deep: { field: 1 } },
      names: ['/container1'],
      ports: ['8080'],
    },
    {
      id: 2,
      name: 'Bob',
      age: 35,
      active: true,
      created: new Date('2023-02-01'),
      nested: { value: 'B', deep: { field: 2 } },
      names: ['/container2'],
      ports: ['8080', '9090', '10000'],
    },
    {
      id: 4,
      name: 'David',
      age: 28,
      active: false,
      created: new Date('2023-04-01'),
      nested: { value: 'D', deep: { field: 4 } },
      names: ['/container4'],
      ports: ['8080'],
    },
  ];

  describe('initialization', () => {
    it('initializes with default values when no parameters provided', () => {
      const { result } = renderHook(() => useTableSort(mockData));

      expect(result.current.sortConfig.key).toBe(null);
      expect(result.current.sortConfig.direction).toBe('asc');
      expect(result.current.sortedData).toEqual(mockData);
    });

    it('initializes with custom default sort key', () => {
      const { result } = renderHook(() => useTableSort(mockData, 'name'));

      expect(result.current.sortConfig.key).toBe('name');
      expect(result.current.sortConfig.direction).toBe('asc');
    });

    it('initializes with custom default direction', () => {
      const { result } = renderHook(() =>
        useTableSort(mockData, 'name', 'desc')
      );

      expect(result.current.sortConfig.key).toBe('name');
      expect(result.current.sortConfig.direction).toBe('desc');
    });
  });

  describe('string sorting', () => {
    it('sorts strings in ascending order', () => {
      const { result } = renderHook(() => useTableSort(mockData, 'name'));

      expect(result.current.sortedData[0].name).toBe('Alice');
      expect(result.current.sortedData[1].name).toBe('Bob');
      expect(result.current.sortedData[2].name).toBe('Charlie');
      expect(result.current.sortedData[3].name).toBe('David');
    });

    it('sorts strings in descending order', () => {
      const { result } = renderHook(() =>
        useTableSort(mockData, 'name', 'desc')
      );

      expect(result.current.sortedData[0].name).toBe('David');
      expect(result.current.sortedData[1].name).toBe('Charlie');
      expect(result.current.sortedData[2].name).toBe('Bob');
      expect(result.current.sortedData[3].name).toBe('Alice');
    });

    it('handles case-sensitive string sorting', () => {
      const dataWithCase = [
        { id: 1, name: 'alice' },
        { id: 2, name: 'Alice' },
        { id: 3, name: 'BOB' },
        { id: 4, name: 'bob' },
      ];

      const { result } = renderHook(() => useTableSort(dataWithCase, 'name'));

      // Algorithm groups by lowercase first, then places uppercase before lowercase within each group
      // So: Alice, alice, BOB, bob
      expect(result.current.sortedData[0].name).toBe('Alice');
      expect(result.current.sortedData[1].name).toBe('alice');
      expect(result.current.sortedData[2].name).toBe('BOB');
      expect(result.current.sortedData[3].name).toBe('bob');
    });
  });

  describe('number sorting', () => {
    it('sorts numbers in ascending order', () => {
      const { result } = renderHook(() => useTableSort(mockData, 'age'));

      expect(result.current.sortedData[0].age).toBe(25);
      expect(result.current.sortedData[1].age).toBe(28);
      expect(result.current.sortedData[2].age).toBe(30);
      expect(result.current.sortedData[3].age).toBe(35);
    });

    it('sorts numbers in descending order', () => {
      const { result } = renderHook(() =>
        useTableSort(mockData, 'age', 'desc')
      );

      expect(result.current.sortedData[0].age).toBe(35);
      expect(result.current.sortedData[1].age).toBe(30);
      expect(result.current.sortedData[2].age).toBe(28);
      expect(result.current.sortedData[3].age).toBe(25);
    });
  });

  describe('boolean sorting', () => {
    it('sorts booleans in ascending order', () => {
      const { result } = renderHook(() => useTableSort(mockData, 'active'));

      expect(result.current.sortedData[0].active).toBe(false);
      expect(result.current.sortedData[1].active).toBe(false);
      expect(result.current.sortedData[2].active).toBe(true);
      expect(result.current.sortedData[3].active).toBe(true);
    });

    it('sorts booleans in descending order', () => {
      const { result } = renderHook(() =>
        useTableSort(mockData, 'active', 'desc')
      );

      expect(result.current.sortedData[0].active).toBe(true);
      expect(result.current.sortedData[1].active).toBe(true);
      expect(result.current.sortedData[2].active).toBe(false);
      expect(result.current.sortedData[3].active).toBe(false);
    });
  });

  describe('date sorting', () => {
    it('sorts dates in ascending order', () => {
      const { result } = renderHook(() => useTableSort(mockData, 'created'));

      expect(result.current.sortedData[0].created).toEqual(
        new Date('2023-01-01')
      );
      expect(result.current.sortedData[1].created).toEqual(
        new Date('2023-02-01')
      );
      expect(result.current.sortedData[2].created).toEqual(
        new Date('2023-03-01')
      );
      expect(result.current.sortedData[3].created).toEqual(
        new Date('2023-04-01')
      );
    });

    it('sorts dates in descending order', () => {
      const { result } = renderHook(() =>
        useTableSort(mockData, 'created', 'desc')
      );

      expect(result.current.sortedData[0].created).toEqual(
        new Date('2023-04-01')
      );
      expect(result.current.sortedData[1].created).toEqual(
        new Date('2023-03-01')
      );
      expect(result.current.sortedData[2].created).toEqual(
        new Date('2023-02-01')
      );
      expect(result.current.sortedData[3].created).toEqual(
        new Date('2023-01-01')
      );
    });
  });

  describe('nested object sorting', () => {
    it('sorts by nested object properties', () => {
      const { result } = renderHook(() =>
        useTableSort(mockData, 'nested.value')
      );

      expect(result.current.sortedData[0].nested.value).toBe('A');
      expect(result.current.sortedData[1].nested.value).toBe('B');
      expect(result.current.sortedData[2].nested.value).toBe('C');
      expect(result.current.sortedData[3].nested.value).toBe('D');
    });

    it('sorts by deeply nested object properties', () => {
      const { result } = renderHook(() =>
        useTableSort(mockData, 'nested.deep.field')
      );

      expect(result.current.sortedData[0].nested.deep.field).toBe(1);
      expect(result.current.sortedData[1].nested.deep.field).toBe(2);
      expect(result.current.sortedData[2].nested.deep.field).toBe(3);
      expect(result.current.sortedData[3].nested.deep.field).toBe(4);
    });
  });

  describe('special field handling', () => {
    it('handles names field correctly', () => {
      const { result } = renderHook(() => useTableSort(mockData, 'names'));

      expect(result.current.sortedData[0].names?.[0]).toBe('/container1');
      expect(result.current.sortedData[1].names?.[0]).toBe('/container2');
      expect(result.current.sortedData[2].names?.[0]).toBe('/container3');
      expect(result.current.sortedData[3].names?.[0]).toBe('/container4');
    });

    it('handles ports field correctly', () => {
      const { result } = renderHook(() => useTableSort(mockData, 'ports'));

      // Sorted ascending by number of ports (1,1,2,3)
      expect(result.current.sortedData[0].ports).toHaveLength(1);
      expect(result.current.sortedData[1].ports).toHaveLength(1);
      expect(result.current.sortedData[2].ports).toHaveLength(2);
      expect(result.current.sortedData[3].ports).toHaveLength(3);
    });
  });

  describe('null and undefined handling', () => {
    it('handles null values correctly', () => {
      const dataWithNulls = [
        { id: 1, name: 'Alice', value: null },
        { id: 2, name: 'Bob', value: 'test' },
        { id: 3, name: 'Charlie', value: null },
      ];

      const { result } = renderHook(() => useTableSort(dataWithNulls, 'value'));

      expect(result.current.sortedData[0].value).toBe('test');
      expect(result.current.sortedData[1].value).toBe(null);
      expect(result.current.sortedData[2].value).toBe(null);
    });

    it('handles undefined values correctly', () => {
      const dataWithUndefined = [
        { id: 1, name: 'Alice', value: undefined },
        { id: 2, name: 'Bob', value: 'test' },
        { id: 3, name: 'Charlie', value: undefined },
      ];

      const { result } = renderHook(() =>
        useTableSort(dataWithUndefined, 'value')
      );

      expect(result.current.sortedData[0].value).toBe('test');
      expect(result.current.sortedData[1].value).toBe(undefined);
      expect(result.current.sortedData[2].value).toBe(undefined);
    });
  });

  describe('mixed type handling', () => {
    it('handles mixed types by converting to string', () => {
      const mixedData = [
        { id: 1, value: 'string' },
        { id: 2, value: 42 },
        { id: 3, value: true },
        { id: 4, value: 'another string' },
      ];

      const { result } = renderHook(() => useTableSort(mixedData, 'value'));

      expect(result.current.sortedData[0].value).toBe(42);
      expect(result.current.sortedData[1].value).toBe('another string');
      expect(result.current.sortedData[2].value).toBe('string');
      expect(result.current.sortedData[3].value).toBe(true);
    });
  });

  describe('sort cycling', () => {
    it('cycles through sort directions correctly', () => {
      const { result } = renderHook(() => useTableSort(mockData, 'name'));

      // First click: should be ascending (already set)
      expect(result.current.sortConfig.direction).toBe('asc');

      // Second click: should be descending
      act(() => {
        result.current.handleSort('name');
      });
      expect(result.current.sortConfig.direction).toBe('desc');

      // Third click: should remove sorting
      act(() => {
        result.current.handleSort('name');
      });
      expect(result.current.sortConfig.key).toBe(null);
      expect(result.current.sortConfig.direction).toBe(null);
    });

    it('sets new sort key with ascending direction', () => {
      const { result } = renderHook(() => useTableSort(mockData, 'name'));

      // Change to different sort key
      act(() => {
        result.current.handleSort('age');
      });

      expect(result.current.sortConfig.key).toBe('age');
      expect(result.current.sortConfig.direction).toBe('asc');
    });
  });

  describe('edge cases', () => {
    it('handles empty data array', () => {
      const { result } = renderHook(() => useTableSort([]));

      expect(result.current.sortedData).toEqual([]);
    });

    it('handles single item array', () => {
      const singleItem = [{ id: 1, name: 'Test' }];
      const { result } = renderHook(() => useTableSort(singleItem, 'name'));

      expect(result.current.sortedData).toEqual(singleItem);
    });

    it('handles non-existent nested paths gracefully', () => {
      const { result } = renderHook(() =>
        useTableSort(mockData, 'nonexistent.path')
      );

      expect(result.current.sortedData).toEqual(mockData);
    });

    it('handles objects without specified properties', () => {
      const incompleteData = [
        { id: 1, name: 'Alice' },
        { id: 2 }, // missing name
        { id: 3, name: 'Charlie' },
      ];

      const { result } = renderHook(() => useTableSort(incompleteData, 'name'));

      expect(result.current.sortedData[0].name).toBe('Alice');
      expect(result.current.sortedData[1].name).toBe('Charlie');
      expect(result.current.sortedData[2].name).toBeUndefined();
    });
  });

  describe('performance', () => {
    it('maintains reference equality when no sorting is applied', () => {
      const { result } = renderHook(() => useTableSort(mockData));

      expect(result.current.sortedData).toBe(mockData);
    });

    it('creates new array when sorting is applied', () => {
      const { result } = renderHook(() => useTableSort(mockData, 'name'));

      expect(result.current.sortedData).not.toBe(mockData);
      expect(result.current.sortedData).toEqual(
        [...mockData].sort((a, b) => a.name.localeCompare(b.name))
      );
    });
  });
});
