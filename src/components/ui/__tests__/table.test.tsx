import React from 'react';
import { render, screen } from '../../../test/test-utils';
import {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
} from '../table';

describe('Table Components', () => {
  describe('Table', () => {
    it('renders with default props', () => {
      render(<Table data-testid="table" />);
      const table = screen.getByTestId('table');
      expect(table).toBeInTheDocument();
      expect(table.tagName).toBe('TABLE');
      expect(table).toHaveClass('w-full', 'caption-bottom', 'text-sm');
    });

    it('renders with custom className', () => {
      render(<Table className="custom-table" data-testid="table" />);
      const table = screen.getByTestId('table');
      expect(table).toHaveClass('custom-table');
    });

    it('forwards ref correctly', () => {
      const ref = React.createRef<HTMLTableElement>();
      render(<Table ref={ref} data-testid="table" />);
      expect(ref.current).toBeInstanceOf(HTMLTableElement);
    });

    it('forwards additional props', () => {
      render(<Table data-testid="table" aria-label="Test table" />);
      const table = screen.getByTestId('table');
      expect(table).toHaveAttribute('aria-label', 'Test table');
    });

    it('wraps table in overflow container', () => {
      render(<Table data-testid="table" />);
      const table = screen.getByTestId('table');
      const container = table.parentElement;

      expect(container).toHaveClass('relative', 'w-full', 'overflow-auto');
    });
  });

  describe('TableHeader', () => {
    it('renders with default props', () => {
      render(<TableHeader data-testid="header" />);
      const header = screen.getByTestId('header');
      expect(header).toBeInTheDocument();
      expect(header.tagName).toBe('THEAD');
      expect(header).toHaveClass('[&_tr]:border-b');
    });

    it('renders with custom className', () => {
      render(<TableHeader className="custom-header" data-testid="header" />);
      const header = screen.getByTestId('header');
      expect(header).toHaveClass('custom-header');
    });

    it('forwards ref correctly', () => {
      const ref = React.createRef<HTMLTableSectionElement>();
      render(<TableHeader ref={ref} data-testid="header" />);
      expect(ref.current).toBeInstanceOf(HTMLTableSectionElement);
    });
  });

  describe('TableBody', () => {
    it('renders with default props', () => {
      render(<TableBody data-testid="body" />);
      const body = screen.getByTestId('body');
      expect(body).toBeInTheDocument();
      expect(body.tagName).toBe('TBODY');
      expect(body).toHaveClass('[&_tr:last-child]:border-0');
    });

    it('renders with custom className', () => {
      render(<TableBody className="custom-body" data-testid="body" />);
      const body = screen.getByTestId('body');
      expect(body).toHaveClass('custom-body');
    });

    it('forwards ref correctly', () => {
      const ref = React.createRef<HTMLTableSectionElement>();
      render(<TableBody ref={ref} data-testid="body" />);
      expect(ref.current).toBeInstanceOf(HTMLTableSectionElement);
    });
  });

  describe('TableFooter', () => {
    it('renders with default props', () => {
      render(<TableFooter data-testid="footer" />);
      const footer = screen.getByTestId('footer');
      expect(footer).toBeInTheDocument();
      expect(footer.tagName).toBe('TFOOT');
      expect(footer).toHaveClass(
        'border-t',
        'bg-muted/50',
        'font-medium',
        '[&>tr]:last:border-b-0'
      );
    });

    it('renders with custom className', () => {
      render(<TableFooter className="custom-footer" data-testid="footer" />);
      const footer = screen.getByTestId('footer');
      expect(footer).toHaveClass('custom-footer');
    });

    it('forwards ref correctly', () => {
      const ref = React.createRef<HTMLTableSectionElement>();
      render(<TableFooter ref={ref} data-testid="footer" />);
      expect(ref.current).toBeInstanceOf(HTMLTableSectionElement);
    });
  });

  describe('TableRow', () => {
    it('renders with default props', () => {
      render(<TableRow data-testid="row" />);
      const row = screen.getByTestId('row');
      expect(row).toBeInTheDocument();
      expect(row.tagName).toBe('TR');
      expect(row).toHaveClass(
        'border-b',
        'transition-colors',
        'hover:bg-muted/50',
        'data-[state=selected]:bg-muted'
      );
    });

    it('renders with custom className', () => {
      render(<TableRow className="custom-row" data-testid="row" />);
      const row = screen.getByTestId('row');
      expect(row).toHaveClass('custom-row');
    });

    it('forwards ref correctly', () => {
      const ref = React.createRef<HTMLTableRowElement>();
      render(<TableRow ref={ref} data-testid="row" />);
      expect(ref.current).toBeInstanceOf(HTMLTableRowElement);
    });

    it('handles data attributes', () => {
      render(<TableRow data-testid="row" data-state="selected" />);
      const row = screen.getByTestId('row');
      expect(row).toHaveAttribute('data-state', 'selected');
    });
  });

  describe('TableHead', () => {
    it('renders with default props', () => {
      render(<TableHead data-testid="head">Header</TableHead>);
      const head = screen.getByTestId('head');
      expect(head).toBeInTheDocument();
      expect(head.tagName).toBe('TH');
      expect(head).toHaveTextContent('Header');
      expect(head).toHaveClass(
        'h-12',
        'px-4',
        'text-left',
        'align-middle',
        'font-medium',
        'text-muted-foreground',
        '[&:has([role=checkbox])]:pr-0'
      );
    });

    it('renders with custom className', () => {
      render(
        <TableHead className="custom-head" data-testid="head">
          Header
        </TableHead>
      );
      const head = screen.getByTestId('head');
      expect(head).toHaveClass('custom-head');
    });

    it('forwards ref correctly', () => {
      const ref = React.createRef<HTMLTableCellElement>();
      render(
        <TableHead ref={ref} data-testid="head">
          Header
        </TableHead>
      );
      expect(ref.current).toBeInstanceOf(HTMLTableCellElement);
    });

    it('handles scope attribute', () => {
      render(
        <TableHead scope="col" data-testid="head">
          Header
        </TableHead>
      );
      const head = screen.getByTestId('head');
      expect(head).toHaveAttribute('scope', 'col');
    });
  });

  describe('TableCell', () => {
    it('renders with default props', () => {
      render(<TableCell data-testid="cell">Cell content</TableCell>);
      const cell = screen.getByTestId('cell');
      expect(cell).toBeInTheDocument();
      expect(cell.tagName).toBe('TD');
      expect(cell).toHaveTextContent('Cell content');
      expect(cell).toHaveClass(
        'p-4',
        'align-middle',
        '[&:has([role=checkbox])]:pr-0'
      );
    });

    it('renders with custom className', () => {
      render(
        <TableCell className="custom-cell" data-testid="cell">
          Cell content
        </TableCell>
      );
      const cell = screen.getByTestId('cell');
      expect(cell).toHaveClass('custom-cell');
    });

    it('forwards ref correctly', () => {
      const ref = React.createRef<HTMLTableCellElement>();
      render(
        <TableCell ref={ref} data-testid="cell">
          Cell content
        </TableCell>
      );
      expect(ref.current).toBeInstanceOf(HTMLTableCellElement);
    });

    it('handles colspan and rowspan', () => {
      render(
        <TableCell colSpan={2} rowSpan={3} data-testid="cell">
          Cell content
        </TableCell>
      );
      const cell = screen.getByTestId('cell');
      expect(cell).toHaveAttribute('colspan', '2');
      expect(cell).toHaveAttribute('rowspan', '3');
    });
  });

  describe('TableCaption', () => {
    it('renders with default props', () => {
      render(
        <TableCaption data-testid="caption">Table description</TableCaption>
      );
      const caption = screen.getByTestId('caption');
      expect(caption).toBeInTheDocument();
      expect(caption.tagName).toBe('CAPTION');
      expect(caption).toHaveTextContent('Table description');
      expect(caption).toHaveClass('mt-4', 'text-sm', 'text-muted-foreground');
    });

    it('renders with custom className', () => {
      render(
        <TableCaption className="custom-caption" data-testid="caption">
          Table description
        </TableCaption>
      );
      const caption = screen.getByTestId('caption');
      expect(caption).toHaveClass('custom-caption');
    });

    it('forwards ref correctly', () => {
      const ref = React.createRef<HTMLTableCaptionElement>();
      render(
        <TableCaption ref={ref} data-testid="caption">
          Table description
        </TableCaption>
      );
      expect(ref.current).toBeInstanceOf(HTMLTableCaptionElement);
    });
  });

  describe('Table Composition', () => {
    it('renders a complete table with all components', () => {
      render(
        <Table data-testid="table">
          <TableCaption data-testid="caption">Test Table</TableCaption>
          <TableHeader data-testid="header">
            <TableRow data-testid="header-row">
              <TableHead data-testid="header-cell-1">Name</TableHead>
              <TableHead data-testid="header-cell-2">Age</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody data-testid="body">
            <TableRow data-testid="body-row">
              <TableCell data-testid="body-cell-1">John</TableCell>
              <TableCell data-testid="body-cell-2">25</TableCell>
            </TableRow>
          </TableBody>
          <TableFooter data-testid="footer">
            <TableRow data-testid="footer-row">
              <TableCell data-testid="footer-cell">Total: 1</TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      );

      expect(screen.getByTestId('table')).toBeInTheDocument();
      expect(screen.getByTestId('caption')).toHaveTextContent('Test Table');
      expect(screen.getByTestId('header')).toBeInTheDocument();
      expect(screen.getByTestId('body')).toBeInTheDocument();
      expect(screen.getByTestId('footer')).toBeInTheDocument();

      expect(screen.getByTestId('header-cell-1')).toHaveTextContent('Name');
      expect(screen.getByTestId('header-cell-2')).toHaveTextContent('Age');
      expect(screen.getByTestId('body-cell-1')).toHaveTextContent('John');
      expect(screen.getByTestId('body-cell-2')).toHaveTextContent('25');
      expect(screen.getByTestId('footer-cell')).toHaveTextContent('Total: 1');
    });

    it('maintains proper styling hierarchy', () => {
      render(
        <Table className="main-table">
          <TableHeader className="header-class">
            <TableRow className="row-class">
              <TableHead className="head-class">Header</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="body-class">
            <TableRow className="row-class">
              <TableCell className="cell-class">Content</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      );

      const table = screen.getByText('Header').closest('table');
      const header = screen.getByText('Header').closest('thead');
      const body = screen.getByText('Content').closest('tbody');
      const row = screen.getByText('Content').closest('tr');
      const cell = screen.getByText('Content');

      expect(table).toHaveClass('main-table');
      expect(header).toHaveClass('header-class');
      expect(body).toHaveClass('body-class');
      expect(row).toHaveClass('row-class');
      expect(cell).toHaveClass('cell-class');
    });

    it('handles complex table structures', () => {
      render(
        <Table>
          <TableCaption>Complex Table</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead scope="col">Name</TableHead>
              <TableHead scope="col">Details</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell>
                <strong>John Doe</strong>
              </TableCell>
              <TableCell>
                <span>Age: 25</span>
                <br />
                <span>City: NYC</span>
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell>
                <em>Jane Smith</em>
              </TableCell>
              <TableCell>
                <span>Age: 30</span>
                <br />
                <span>City: LA</span>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      );

      expect(screen.getByText('Complex Table')).toBeInTheDocument();
      expect(screen.getByText('Name')).toBeInTheDocument();
      expect(screen.getByText('Details')).toBeInTheDocument();
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      expect(screen.getByText('Age: 25')).toBeInTheDocument();
      expect(screen.getByText('City: NYC')).toBeInTheDocument();
    });
  });
});
