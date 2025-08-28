import React from 'react';
import { render, screen } from '../../../test/test-utils';
import { Label } from '../label';

describe('Label Component', () => {
  it('renders with default props', () => {
    render(<Label data-testid="label">Test Label</Label>);
    const label = screen.getByTestId('label');
    expect(label).toBeInTheDocument();
    expect(label).toHaveTextContent('Test Label');
    expect(label.tagName).toBe('LABEL');
    expect(label).toHaveClass(
      'text-sm',
      'font-medium',
      'leading-none',
      'peer-disabled:cursor-not-allowed',
      'peer-disabled:opacity-70'
    );
  });

  it('renders with custom className', () => {
    render(
      <Label className="custom-label" data-testid="label">
        Test Label
      </Label>
    );
    const label = screen.getByTestId('label');
    expect(label).toHaveClass('custom-label');
  });

  it('forwards ref correctly', () => {
    const ref = React.createRef<HTMLLabelElement>();
    render(
      <Label ref={ref} data-testid="label">
        Test Label
      </Label>
    );
    expect(ref.current).toBeInstanceOf(HTMLLabelElement);
  });

  it('forwards additional props', () => {
    render(
      <Label
        data-testid="label"
        htmlFor="test-input"
        aria-describedby="description"
        className="test-class"
      >
        Test Label
      </Label>
    );

    const label = screen.getByTestId('label');
    expect(label).toHaveAttribute('for', 'test-input');
    expect(label).toHaveAttribute('aria-describedby', 'description');
    expect(label).toHaveClass('test-class');
  });

  it('handles htmlFor attribute correctly', () => {
    render(
      <Label htmlFor="input-id" data-testid="label">
        Test Label
      </Label>
    );
    const label = screen.getByTestId('label');
    expect(label).toHaveAttribute('for', 'input-id');
  });

  it('handles aria attributes correctly', () => {
    render(
      <Label
        data-testid="label"
        aria-label="Accessible label"
        aria-required="true"
        aria-invalid="false"
      >
        Test Label
      </Label>
    );

    const label = screen.getByTestId('label');
    expect(label).toHaveAttribute('aria-label', 'Accessible label');
    expect(label).toHaveAttribute('aria-required', 'true');
    expect(label).toHaveAttribute('aria-invalid', 'false');
  });

  it('handles data attributes correctly', () => {
    render(
      <Label
        data-testid="label"
        data-test="test-value"
        data-custom="custom-value"
      >
        Test Label
      </Label>
    );

    const label = screen.getByTestId('label');
    expect(label).toHaveAttribute('data-test', 'test-value');
    expect(label).toHaveAttribute('data-custom', 'custom-value');
  });

  it('handles event handlers correctly', () => {
    const onClick = jest.fn();

    render(
      <Label onClick={onClick} data-testid="label">
        Test Label
      </Label>
    );

    const label = screen.getByTestId('label');

    // Labels can receive click events
    label.click();
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('maintains proper styling with variants', () => {
    render(<Label data-testid="label">Test Label</Label>);
    const label = screen.getByTestId('label');

    // Should have all the variant classes
    expect(label).toHaveClass('text-sm');
    expect(label).toHaveClass('font-medium');
    expect(label).toHaveClass('leading-none');
    expect(label).toHaveClass('peer-disabled:cursor-not-allowed');
    expect(label).toHaveClass('peer-disabled:opacity-70');
  });

  it('combines custom classes with variant classes correctly', () => {
    render(
      <Label className="bg-blue-500 text-white p-2" data-testid="label">
        Test Label
      </Label>
    );

    const label = screen.getByTestId('label');

    // Should have both variant and custom classes
    expect(label).toHaveClass('bg-blue-500', 'text-white', 'p-2');
    expect(label).toHaveClass('text-sm', 'font-medium'); // Variant classes
  });

  it('handles empty content gracefully', () => {
    render(<Label data-testid="label" />);
    const label = screen.getByTestId('label');
    expect(label).toBeInTheDocument();
    expect(label).toHaveTextContent('');
  });

  it('handles complex content correctly', () => {
    render(
      <Label data-testid="label">
        <span>Complex</span> <strong>Label</strong> <em>Content</em>
      </Label>
    );

    const label = screen.getByTestId('label');
    expect(label).toHaveTextContent('Complex Label Content');
    expect(label.querySelector('span')).toHaveTextContent('Complex');
    expect(label.querySelector('strong')).toHaveTextContent('Label');
    expect(label.querySelector('em')).toHaveTextContent('Content');
  });

  it('maintains accessibility when used with form controls', () => {
    render(
      <div>
        <Label htmlFor="test-input" data-testid="label">
          Test Label
        </Label>
        <input id="test-input" data-testid="input" />
      </div>
    );

    const label = screen.getByTestId('label');
    const input = screen.getByTestId('input');

    // The label should be associated with the input
    expect(label).toHaveAttribute('for', 'test-input');
    expect(input).toHaveAttribute('id', 'test-input');

    // The label should be properly associated with the input for screen readers
    expect(label).toHaveAttribute('for', 'test-input');
  });

  it('handles disabled state of associated form controls', () => {
    render(
      <div>
        <Label htmlFor="test-input" data-testid="label">
          Test Label
        </Label>
        <input id="test-input" data-testid="input" className="peer" disabled />
      </div>
    );

    const label = screen.getByTestId('label');
    const input = screen.getByTestId('input');

    // The label should have peer-disabled classes that respond to the input's disabled state
    expect(label).toHaveClass(
      'peer-disabled:cursor-not-allowed',
      'peer-disabled:opacity-70'
    );
    expect(input).toBeDisabled();
  });
});
