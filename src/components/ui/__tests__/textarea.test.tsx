import React from 'react';
import { render, screen, fireEvent } from '../../../test/test-utils';
import { Textarea } from '../textarea';

describe('Textarea Component', () => {
  it('renders with default props', () => {
    render(<Textarea data-testid="textarea" />);
    const textarea = screen.getByTestId('textarea');
    expect(textarea).toBeInTheDocument();
    expect(textarea.tagName).toBe('TEXTAREA');
    expect(textarea).toHaveClass(
      'flex',
      'min-h-[80px]',
      'w-full',
      'rounded-md',
      'border',
      'border-input',
      'bg-background',
      'px-3',
      'py-2',
      'text-sm',
      'ring-offset-background',
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
    render(<Textarea className="custom-textarea" data-testid="textarea" />);
    const textarea = screen.getByTestId('textarea');
    expect(textarea).toHaveClass('custom-textarea');
  });

  it('forwards ref correctly', () => {
    const ref = React.createRef<HTMLTextAreaElement>();
    render(<Textarea ref={ref} data-testid="textarea" />);
    expect(ref.current).toBeInstanceOf(HTMLTextAreaElement);
  });

  it('forwards additional props', () => {
    render(
      <Textarea
        data-testid="textarea"
        placeholder="Enter text"
        aria-label="Test textarea"
        disabled
        rows={5}
        cols={50}
      />
    );

    const textarea = screen.getByTestId('textarea');
    expect(textarea).toHaveAttribute('placeholder', 'Enter text');
    expect(textarea).toHaveAttribute('aria-label', 'Test textarea');
    expect(textarea).toBeDisabled();
    expect(textarea).toHaveAttribute('rows', '5');
    expect(textarea).toHaveAttribute('cols', '50');
  });

  it('handles value changes', () => {
    render(<Textarea data-testid="textarea" />);
    const textarea = screen.getByTestId('textarea');

    fireEvent.change(textarea, { target: { value: 'test value' } });
    expect(textarea).toHaveValue('test value');
  });

  it('handles focus and blur events', () => {
    const onFocus = jest.fn();
    const onBlur = jest.fn();

    render(
      <Textarea data-testid="textarea" onFocus={onFocus} onBlur={onBlur} />
    );

    const textarea = screen.getByTestId('textarea');

    fireEvent.focus(textarea);
    expect(onFocus).toHaveBeenCalledTimes(1);

    fireEvent.blur(textarea);
    expect(onBlur).toHaveBeenCalledTimes(1);
  });

  it('handles key events', () => {
    const onKeyDown = jest.fn();
    const onKeyUp = jest.fn();

    render(
      <Textarea
        data-testid="textarea"
        onKeyDown={onKeyDown}
        onKeyUp={onKeyUp}
      />
    );

    const textarea = screen.getByTestId('textarea');

    fireEvent.keyDown(textarea, { key: 'Enter' });
    expect(onKeyDown).toHaveBeenCalledTimes(1);

    fireEvent.keyUp(textarea, { key: 'Enter' });
    expect(onKeyUp).toHaveBeenCalledTimes(1);

    // Note: onKeyPress is deprecated in React and not supported
  });

  it('applies disabled state correctly', () => {
    render(<Textarea data-testid="textarea" disabled />);
    const textarea = screen.getByTestId('textarea');

    expect(textarea).toBeDisabled();
    expect(textarea).toHaveClass(
      'disabled:cursor-not-allowed',
      'disabled:opacity-50'
    );
  });

  it('applies read-only state correctly', () => {
    render(<Textarea data-testid="textarea" readOnly />);
    const textarea = screen.getByTestId('textarea');

    expect(textarea).toHaveAttribute('readonly');
  });

  it('handles controlled input correctly', () => {
    const TestComponent = () => {
      const [value, setValue] = React.useState('');
      return (
        <Textarea
          data-testid="textarea"
          value={value}
          onChange={e => setValue(e.target.value)}
        />
      );
    };

    render(<TestComponent />);
    const textarea = screen.getByTestId('textarea');

    fireEvent.change(textarea, { target: { value: 'controlled value' } });
    expect(textarea).toHaveValue('controlled value');
  });

  it('maintains accessibility attributes', () => {
    render(
      <Textarea
        data-testid="textarea"
        id="test-textarea"
        name="test-textarea"
        aria-describedby="description"
        aria-invalid="true"
        aria-required="true"
        aria-label="Test textarea"
      />
    );

    const textarea = screen.getByTestId('textarea');
    expect(textarea).toHaveAttribute('id', 'test-textarea');
    expect(textarea).toHaveAttribute('name', 'test-textarea');
    expect(textarea).toHaveAttribute('aria-describedby', 'description');
    expect(textarea).toHaveAttribute('aria-invalid', 'true');
    expect(textarea).toHaveAttribute('aria-required', 'true');
    expect(textarea).toHaveAttribute('aria-label', 'Test textarea');
  });

  it('handles placeholder text correctly', () => {
    render(
      <Textarea placeholder="Enter your message here" data-testid="textarea" />
    );
    const textarea = screen.getByTestId('textarea');

    expect(textarea).toHaveAttribute('placeholder', 'Enter your message here');
  });

  it('handles rows and cols attributes', () => {
    render(<Textarea rows={10} cols={80} data-testid="textarea" />);
    const textarea = screen.getByTestId('textarea');

    expect(textarea).toHaveAttribute('rows', '10');
    expect(textarea).toHaveAttribute('cols', '80');
  });

  it('handles maxlength and minlength attributes', () => {
    render(<Textarea maxLength={100} minLength={10} data-testid="textarea" />);
    const textarea = screen.getByTestId('textarea');

    expect(textarea).toHaveAttribute('maxlength', '100');
    expect(textarea).toHaveAttribute('minlength', '10');
  });

  it('handles wrap attribute', () => {
    render(<Textarea wrap="hard" data-testid="textarea" />);
    const textarea = screen.getByTestId('textarea');

    expect(textarea).toHaveAttribute('wrap', 'hard');
  });

  it('handles spellcheck attribute', () => {
    render(<Textarea spellCheck={false} data-testid="textarea" />);
    const textarea = screen.getByTestId('textarea');

    expect(textarea).toHaveAttribute('spellcheck', 'false');
  });

  it('handles autoComplete attribute', () => {
    render(<Textarea autoComplete="off" data-testid="textarea" />);
    const textarea = screen.getByTestId('textarea');

    expect(textarea).toHaveAttribute('autocomplete', 'off');
  });

  it('handles resize attribute', () => {
    render(<Textarea style={{ resize: 'none' }} data-testid="textarea" />);
    const textarea = screen.getByTestId('textarea');

    expect(textarea).toHaveStyle({ resize: 'none' });
  });

  it('combines custom classes with default classes correctly', () => {
    render(
      <Textarea className="bg-red-500 text-white" data-testid="textarea" />
    );
    const textarea = screen.getByTestId('textarea');

    // Should have both default and custom classes
    expect(textarea).toHaveClass('bg-red-500', 'text-white');
    expect(textarea).toHaveClass('flex', 'min-h-[80px]', 'w-full'); // Default classes
  });

  it('handles form integration correctly', () => {
    const onSubmit = jest.fn();

    render(
      <form onSubmit={onSubmit}>
        <Textarea name="message" data-testid="textarea" />
        <button type="submit">Submit</button>
      </form>
    );

    const textarea = screen.getByTestId('textarea');
    const submitButton = screen.getByText('Submit');

    // Enter some text
    fireEvent.change(textarea, { target: { value: 'Test message' } });
    expect(textarea).toHaveValue('Test message');

    // Submit the form
    fireEvent.click(submitButton);
    expect(onSubmit).toHaveBeenCalled();
  });

  it('handles multiline text correctly', () => {
    render(<Textarea data-testid="textarea" />);
    const textarea = screen.getByTestId('textarea') as HTMLTextAreaElement;

    const multilineText = 'Line 1\nLine 2\nLine 3';
    fireEvent.change(textarea, { target: { value: multilineText } });

    expect(textarea).toHaveValue(multilineText);
    expect(textarea.value).toContain('\n');
  });

  it('maintains minimum height constraint', () => {
    render(<Textarea data-testid="textarea" />);
    const textarea = screen.getByTestId('textarea');

    // Should have the minimum height class
    expect(textarea).toHaveClass('min-h-[80px]');
  });

  it('handles resize styling correctly', () => {
    render(<Textarea data-testid="textarea" style={{ resize: 'both' }} />);

    const textarea = screen.getByTestId('textarea');

    // Should have the resize style applied
    expect(textarea).toHaveStyle({ resize: 'both' });
  });
});
