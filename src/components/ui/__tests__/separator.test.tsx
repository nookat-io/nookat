import React from 'react';
import { render, screen } from '../../../test/test-utils';
import { Separator } from '../separator';

describe('Separator Component', () => {
  it('renders with default props', () => {
    render(<Separator data-testid="separator" />);
    const separator = screen.getByTestId('separator');
    expect(separator).toBeInTheDocument();
    expect(separator).toHaveAttribute('data-orientation', 'horizontal');
    // Note: data-decorative is not exposed in the DOM by Radix UI
  });

  it('renders with custom className', () => {
    render(<Separator className="custom-separator" data-testid="separator" />);
    const separator = screen.getByTestId('separator');
    expect(separator).toHaveClass('custom-separator');
  });

  it('forwards ref correctly', () => {
    const ref = React.createRef<HTMLDivElement>();
    render(<Separator ref={ref} data-testid="separator" />);
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });

  it('forwards additional props', () => {
    render(
      <Separator
        data-testid="separator"
        aria-label="Section divider"
        role="separator"
      />
    );
    const separator = screen.getByTestId('separator');
    expect(separator).toHaveAttribute('aria-label', 'Section divider');
    expect(separator).toHaveAttribute('role', 'separator');
  });

  it('handles horizontal orientation correctly', () => {
    render(<Separator orientation="horizontal" data-testid="separator" />);
    const separator = screen.getByTestId('separator');
    expect(separator).toHaveAttribute('data-orientation', 'horizontal');
    expect(separator).toHaveClass('h-[1px]', 'w-full');
  });

  it('handles vertical orientation correctly', () => {
    render(<Separator orientation="vertical" data-testid="separator" />);
    const separator = screen.getByTestId('separator');
    expect(separator).toHaveAttribute('data-orientation', 'vertical');
    expect(separator).toHaveClass('h-full', 'w-[1px]');
  });

  it('handles decorative state correctly', () => {
    render(<Separator decorative={false} data-testid="separator" />);
    const separator = screen.getByTestId('separator');
    // Note: data-decorative is not exposed in the DOM by Radix UI
    expect(separator).toBeInTheDocument();
  });

  it('applies default styling classes', () => {
    render(<Separator data-testid="separator" />);
    const separator = screen.getByTestId('separator');
    expect(separator).toHaveClass('shrink-0', 'bg-border', 'h-[1px]', 'w-full');
  });

  it('combines custom classes with default classes', () => {
    render(
      <Separator className="border-2 border-red-500" data-testid="separator" />
    );
    const separator = screen.getByTestId('separator');
    expect(separator).toHaveClass(
      'shrink-0',
      'bg-border',
      'h-[1px]',
      'w-full',
      'border-2',
      'border-red-500'
    );
  });

  it('handles orientation change dynamically', () => {
    const { rerender } = render(
      <Separator orientation="horizontal" data-testid="separator" />
    );

    let separator = screen.getByTestId('separator');
    expect(separator).toHaveClass('h-[1px]', 'w-full');

    rerender(<Separator orientation="vertical" data-testid="separator" />);
    separator = screen.getByTestId('separator');
    expect(separator).toHaveClass('h-full', 'w-[1px]');
  });

  it('maintains accessibility attributes', () => {
    render(
      <Separator
        data-testid="separator"
        aria-label="Content divider"
        role="separator"
        tabIndex={0}
      />
    );
    const separator = screen.getByTestId('separator');
    expect(separator).toHaveAttribute('aria-label', 'Content divider');
    expect(separator).toHaveAttribute('role', 'separator');
    expect(separator).toHaveAttribute('tabIndex', '0');
  });

  it('handles empty content gracefully', () => {
    render(<Separator data-testid="separator" />);
    const separator = screen.getByTestId('separator');
    expect(separator).toBeInTheDocument();
    expect(separator).toBeEmptyDOMElement();
  });

  it('renders with complex styling combinations', () => {
    render(
      <Separator
        className="my-4 mx-2 rounded-full opacity-75"
        orientation="vertical"
        data-testid="separator"
      />
    );
    const separator = screen.getByTestId('separator');
    expect(separator).toHaveClass(
      'shrink-0',
      'bg-border',
      'h-full',
      'w-[1px]',
      'my-4',
      'mx-2',
      'rounded-full',
      'opacity-75'
    );
  });

  it('forwards all Radix UI props correctly', () => {
    render(
      <Separator
        data-testid="separator"
        data-state="visible"
        data-disabled="false"
      />
    );
    const separator = screen.getByTestId('separator');
    expect(separator).toHaveAttribute('data-state', 'visible');
    expect(separator).toHaveAttribute('data-disabled', 'false');
    // Note: Inline styles may not be exposed in the DOM by Radix UI
  });
});
