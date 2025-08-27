import { render, screen, fireEvent } from '../../../test/test-utils';
import { Button } from '../button';

describe('Button', () => {
  it('renders with default props', () => {
    render(<Button>Click me</Button>);

    const button = screen.getByRole('button', { name: 'Click me' });
    expect(button).toBeInTheDocument();
    expect(button).toHaveClass('inline-flex', 'items-center', 'justify-center');
  });

  it('renders with different variants', () => {
    const { rerender } = render(<Button variant="secondary">Secondary</Button>);

    let button = screen.getByRole('button', { name: 'Secondary' });
    expect(button).toHaveClass('bg-secondary');

    rerender(<Button variant="destructive">Destructive</Button>);
    button = screen.getByRole('button', { name: 'Destructive' });
    expect(button).toHaveClass('bg-destructive');

    rerender(<Button variant="outline">Outline</Button>);
    button = screen.getByRole('button', { name: 'Outline' });
    expect(button).toHaveClass('border', 'border-input');

    rerender(<Button variant="ghost">Ghost</Button>);
    button = screen.getByRole('button', { name: 'Ghost' });
    expect(button).toHaveClass('hover:bg-accent');

    rerender(<Button variant="link">Link</Button>);
    button = screen.getByRole('button', { name: 'Link' });
    expect(button).toHaveClass('underline-offset-4');
  });

  it('renders with different sizes', () => {
    const { rerender } = render(<Button size="sm">Small</Button>);

    let button = screen.getByRole('button', { name: 'Small' });
    expect(button).toHaveClass('h-9', 'px-3');

    rerender(<Button size="lg">Large</Button>);
    button = screen.getByRole('button', { name: 'Large' });
    expect(button).toHaveClass('h-11', 'px-8');

    rerender(<Button size="icon">Icon</Button>);
    button = screen.getByRole('button', { name: 'Icon' });
    expect(button).toHaveClass('h-10', 'w-10');
  });

  it('handles click events', () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Click me</Button>);

    const button = screen.getByRole('button', { name: 'Click me' });
    fireEvent.click(button);

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('renders as child when asChild is true', () => {
    render(
      <Button asChild>
        <a href="/test">Link Button</a>
      </Button>
    );

    const link = screen.getByRole('link', { name: 'Link Button' });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/test');
    expect(link).toHaveClass('inline-flex', 'items-center', 'justify-center');
  });

  it('forwards ref correctly', () => {
    const ref = jest.fn();
    render(<Button ref={ref}>Ref Button</Button>);

    expect(ref).toHaveBeenCalled();
  });

  it('applies custom className', () => {
    render(<Button className="custom-class">Custom</Button>);

    const button = screen.getByRole('button', { name: 'Custom' });
    expect(button).toHaveClass('custom-class');
  });

  it('forwards additional props', () => {
    render(
      <Button data-testid="test-button" aria-label="Test Button" disabled>
        Disabled
      </Button>
    );

    const button = screen.getByTestId('test-button');
    expect(button).toHaveAttribute('aria-label', 'Test Button');
    expect(button).toBeDisabled();
  });
});
