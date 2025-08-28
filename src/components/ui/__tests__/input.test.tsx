import React from 'react';
import { render, screen, fireEvent } from '../../../test/test-utils';
import { Input } from '../input';

describe('Input Component', () => {
  it('renders with default props', () => {
    render(<Input data-testid="input" />);
    const input = screen.getByTestId('input');
    expect(input).toBeInTheDocument();
    expect(input.tagName).toBe('INPUT');
    expect(input).toHaveClass(
      'flex',
      'h-10',
      'w-full',
      'rounded-md',
      'border',
      'border-input',
      'bg-background',
      'px-3',
      'py-2',
      'text-sm',
      'ring-offset-background',
      'file:border-0',
      'file:bg-transparent',
      'file:text-sm',
      'file:font-medium',
      'file:text-foreground',
      'placeholder:text-muted-foreground',
      'focus-visible:outline-none',
      'focus-visible:ring-2',
      'focus-visible:ring-ring',
      'focus-visible:ring-offset-2',
      'disabled:cursor-not-allowed',
      'disabled:opacity-50'
    );
  });

  it('renders with custom className', () => {
    render(<Input className="custom-input" data-testid="input" />);
    const input = screen.getByTestId('input');
    expect(input).toHaveClass('custom-input');
  });

  it('forwards ref correctly', () => {
    const ref = React.createRef<HTMLInputElement>();
    render(<Input ref={ref} data-testid="input" />);
    expect(ref.current).toBeInstanceOf(HTMLInputElement);
  });

  it('forwards additional props', () => {
    render(
      <Input
        data-testid="input"
        placeholder="Enter text"
        aria-label="Test input"
        disabled
      />
    );
    const input = screen.getByTestId('input');
    expect(input).toHaveAttribute('placeholder', 'Enter text');
    expect(input).toHaveAttribute('aria-label', 'Test input');
    expect(input).toBeDisabled();
  });

  it('handles different input types', () => {
    const { rerender } = render(<Input type="text" data-testid="input" />);
    expect(screen.getByTestId('input')).toHaveAttribute('type', 'text');

    rerender(<Input type="password" data-testid="input" />);
    expect(screen.getByTestId('input')).toHaveAttribute('type', 'password');

    rerender(<Input type="email" data-testid="input" />);
    expect(screen.getByTestId('input')).toHaveAttribute('type', 'email');

    rerender(<Input type="number" data-testid="input" />);
    expect(screen.getByTestId('input')).toHaveAttribute('type', 'number');
  });

  it('handles value changes', () => {
    render(<Input data-testid="input" />);
    const input = screen.getByTestId('input');

    fireEvent.change(input, { target: { value: 'test value' } });
    expect(input).toHaveValue('test value');
  });

  it('handles focus and blur events', () => {
    const onFocus = jest.fn();
    const onBlur = jest.fn();

    render(<Input data-testid="input" onFocus={onFocus} onBlur={onBlur} />);

    const input = screen.getByTestId('input');

    fireEvent.focus(input);
    expect(onFocus).toHaveBeenCalledTimes(1);

    fireEvent.blur(input);
    expect(onBlur).toHaveBeenCalledTimes(1);
  });

  it('handles key events', () => {
    const onKeyDown = jest.fn();
    const onKeyUp = jest.fn();

    render(
      <Input data-testid="input" onKeyDown={onKeyDown} onKeyUp={onKeyUp} />
    );

    const input = screen.getByTestId('input');

    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onKeyDown).toHaveBeenCalledTimes(1);

    fireEvent.keyUp(input, { key: 'Enter' });
    expect(onKeyUp).toHaveBeenCalledTimes(1);

    // Note: onKeyPress is deprecated in React and not supported
  });

  it('applies disabled state correctly', () => {
    render(<Input data-testid="input" disabled />);
    const input = screen.getByTestId('input');

    expect(input).toBeDisabled();
    expect(input).toHaveClass(
      'disabled:cursor-not-allowed',
      'disabled:opacity-50'
    );
  });

  it('applies read-only state correctly', () => {
    render(<Input data-testid="input" readOnly />);
    const input = screen.getByTestId('input');

    expect(input).toHaveAttribute('readonly');
  });

  it('handles controlled input correctly', () => {
    const TestComponent = () => {
      const [value, setValue] = React.useState('');
      return (
        <Input
          data-testid="input"
          value={value}
          onChange={e => setValue(e.target.value)}
        />
      );
    };

    render(<TestComponent />);
    const input = screen.getByTestId('input');

    fireEvent.change(input, { target: { value: 'controlled value' } });
    expect(input).toHaveValue('controlled value');
  });

  it('maintains accessibility attributes', () => {
    render(
      <Input
        data-testid="input"
        id="test-input"
        name="test-input"
        aria-describedby="description"
        aria-invalid="true"
        aria-required="true"
      />
    );

    const input = screen.getByTestId('input');
    expect(input).toHaveAttribute('id', 'test-input');
    expect(input).toHaveAttribute('name', 'test-input');
    expect(input).toHaveAttribute('aria-describedby', 'description');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAttribute('aria-required', 'true');
  });

  it('handles file input type correctly', () => {
    render(<Input type="file" data-testid="input" />);
    const input = screen.getByTestId('input');

    expect(input).toHaveAttribute('type', 'file');
    // File inputs should have the file-specific classes
    expect(input).toHaveClass(
      'file:border-0',
      'file:bg-transparent',
      'file:text-sm',
      'file:font-medium',
      'file:text-foreground'
    );
  });

  it('combines custom classes with default classes correctly', () => {
    render(<Input className="bg-red-500 text-white" data-testid="input" />);
    const input = screen.getByTestId('input');

    // Should have both default and custom classes
    expect(input).toHaveClass('bg-red-500', 'text-white');
    expect(input).toHaveClass('flex', 'h-10', 'w-full'); // Default classes
  });
});
