import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { useTableSort } from '../../hooks/use-table-sort';
import { SortableTableHeader } from './sortable-table-header';
import { Table, TableBody, TableCell, TableHeader, TableRow } from './table';

function renderHeader(props: { sortKey: string; sortable?: boolean }) {
  const onSort = vi.fn();
  render(
    <Table>
      <TableHeader>
        <TableRow>
          <SortableTableHeader onSort={onSort} {...props}>
            Column
          </SortableTableHeader>
        </TableRow>
      </TableHeader>
    </Table>
  );
  return onSort;
}

describe('SortableTableHeader', () => {
  it('reports its sort key when clicked', async () => {
    const onSort = renderHeader({ sortKey: 'name' });

    await userEvent.click(screen.getByRole('columnheader'));

    expect(onSort).toHaveBeenCalledExactlyOnceWith('name');
  });

  it.each([
    { name: 'the actions column', props: { sortKey: 'actions' } },
    { name: 'the checkbox column', props: { sortKey: 'checkbox' } },
    {
      name: 'a column marked not sortable',
      props: { sortKey: 'name', sortable: false },
    },
  ])('ignores clicks on $name', async ({ props }) => {
    const onSort = renderHeader(props);

    await userEvent.click(screen.getByRole('columnheader'));

    expect(onSort).not.toHaveBeenCalled();
  });
});

interface Volume {
  name: string;
  size: number;
}

function VolumesTable({ volumes }: { volumes: Volume[] }) {
  const { sortedData, handleSort } = useTableSort(volumes);
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <SortableTableHeader sortKey="name" onSort={handleSort}>
            Name
          </SortableTableHeader>
          <SortableTableHeader sortKey="size" onSort={handleSort}>
            Size
          </SortableTableHeader>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sortedData.map(volume => (
          <TableRow key={volume.name}>
            <TableCell>{volume.name}</TableCell>
            <TableCell>{volume.size}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

describe('a table sorted through its headers', () => {
  const firstColumn = () =>
    within(screen.getAllByRole('rowgroup')[1])
      .getAllByRole('row')
      .map(row => within(row).getAllByRole('cell')[0].textContent);

  it('sorts by the clicked column, then reverses, then restores the order', async () => {
    render(
      <VolumesTable
        volumes={[
          { name: 'cache', size: 3 },
          { name: 'app-data', size: 1 },
          { name: 'logs', size: 2 },
        ]}
      />
    );
    const nameHeader = screen.getByRole('columnheader', { name: 'Name' });

    await userEvent.click(nameHeader);
    expect(firstColumn()).toEqual(['app-data', 'cache', 'logs']);

    await userEvent.click(nameHeader);
    expect(firstColumn()).toEqual(['logs', 'cache', 'app-data']);

    await userEvent.click(nameHeader);
    expect(firstColumn()).toEqual(['cache', 'app-data', 'logs']);

    await userEvent.click(screen.getByRole('columnheader', { name: 'Size' }));
    expect(firstColumn()).toEqual(['app-data', 'logs', 'cache']);
  });
});
