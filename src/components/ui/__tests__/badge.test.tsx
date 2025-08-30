import { render, screen } from '../../../test/test-utils';
import { Badge } from '../badge';

describe('Badge', () => {
  it('renders with default variant', () => {
    render(<Badge>Test Badge</Badge>);

    const badge = screen.getByText('Test Badge');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass('inline-flex', 'items-center', 'rounded-full');
  });

  it('renders with custom variant', () => {
    render(<Badge variant="secondary">Secondary Badge</Badge>);

    const badge = screen.getByText('Secondary Badge');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass('bg-secondary');
  });

  it('renders with custom className', () => {
    render(<Badge className="custom-class">Custom Badge</Badge>);

    const badge = screen.getByText('Custom Badge');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass('custom-class');
  });

  it('renders with different variants', () => {
    const { rerender } = render(
      <Badge variant="destructive">Destructive</Badge>
    );

    let badge = screen.getByText('Destructive');
    expect(badge).toHaveClass('bg-destructive');

    rerender(<Badge variant="outline">Outline</Badge>);
    badge = screen.getByText('Outline');
    expect(badge).toHaveClass('text-foreground');
  });

  it('forwards additional props', () => {
    render(
      <Badge data-testid="test-badge" aria-label="Test">
        Test
      </Badge>
    );

    const badge = screen.getByTestId('test-badge');
    expect(badge).toHaveAttribute('aria-label', 'Test');
  });
});
