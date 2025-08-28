import { render, screen } from '../../../test/test-utils';
import { LoadingSpinner, LoadingScreen } from '../loading-spinner';

describe('LoadingSpinner Component', () => {
  it('renders with default props', () => {
    render(<LoadingSpinner data-testid="spinner" />);
    const spinner = screen.getByTestId('spinner');
    expect(spinner).toBeInTheDocument();
    expect(spinner).toHaveClass(
      'flex',
      'flex-col',
      'items-center',
      'justify-center'
    );
  });

  it('renders with custom className', () => {
    render(<LoadingSpinner className="custom-spinner" data-testid="spinner" />);
    const spinner = screen.getByTestId('spinner');
    expect(spinner).toHaveClass('custom-spinner');
  });

  it('renders with small size', () => {
    render(<LoadingSpinner size="sm" data-testid="spinner" />);
    const spinner = screen.getByTestId('spinner');
    const spinnerElement = spinner.querySelector('div[class*="animate-spin"]');
    expect(spinnerElement).toHaveClass('h-4', 'w-4');
  });

  it('renders with medium size (default)', () => {
    render(<LoadingSpinner data-testid="spinner" />);
    const spinner = screen.getByTestId('spinner');
    const spinnerElement = spinner.querySelector('div[class*="animate-spin"]');
    expect(spinnerElement).toHaveClass('h-8', 'w-8');
  });

  it('renders with large size', () => {
    render(<LoadingSpinner size="lg" data-testid="spinner" />);
    const spinner = screen.getByTestId('spinner');
    const spinnerElement = spinner.querySelector('div[class*="animate-spin"]');
    expect(spinnerElement).toHaveClass('h-12', 'w-12');
  });

  it('renders without message when not provided', () => {
    render(<LoadingSpinner data-testid="spinner" />);
    const spinner = screen.getByTestId('spinner');
    const message = spinner.querySelector('p');
    expect(message).not.toBeInTheDocument();
  });

  it('renders with message when provided', () => {
    render(<LoadingSpinner message="Loading data..." data-testid="spinner" />);
    const spinner = screen.getByTestId('spinner');
    const message = spinner.querySelector('p');
    expect(message).toBeInTheDocument();
    expect(message).toHaveTextContent('Loading data...');
    expect(message).toHaveClass('text-muted-foreground', 'text-sm');
  });

  it('applies correct spinner styling classes', () => {
    render(<LoadingSpinner data-testid="spinner" />);
    const spinner = screen.getByTestId('spinner');
    const spinnerElement = spinner.querySelector('div[class*="animate-spin"]');

    expect(spinnerElement).toHaveClass(
      'animate-spin',
      'rounded-full',
      'border-2',
      'border-gray-300',
      'border-t-primary',
      'h-8',
      'w-8',
      'mb-2'
    );
  });

  it('combines custom classes with default classes', () => {
    render(
      <LoadingSpinner
        className="p-4 bg-gray-100 rounded-lg"
        data-testid="spinner"
      />
    );
    const spinner = screen.getByTestId('spinner');
    expect(spinner).toHaveClass(
      'flex',
      'flex-col',
      'items-center',
      'justify-center',
      'p-4',
      'bg-gray-100',
      'rounded-lg'
    );
  });

  it('handles empty message string', () => {
    render(<LoadingSpinner message="" data-testid="spinner" />);
    const spinner = screen.getByTestId('spinner');
    const message = spinner.querySelector('p');
    expect(message).toBeInTheDocument();
    expect(message).toHaveTextContent('');
  });

  it('handles long message text', () => {
    const longMessage =
      'This is a very long loading message that should be displayed correctly without breaking the layout';
    render(<LoadingSpinner message={longMessage} data-testid="spinner" />);
    const spinner = screen.getByTestId('spinner');
    const message = spinner.querySelector('p');
    expect(message).toHaveTextContent(longMessage);
  });

  it('maintains proper spacing with message', () => {
    render(<LoadingSpinner message="Loading..." data-testid="spinner" />);
    const spinner = screen.getByTestId('spinner');
    const spinnerElement = spinner.querySelector('div[class*="animate-spin"]');
    expect(spinnerElement).toHaveClass('mb-2');
  });

  it('renders with different size variants correctly', () => {
    const { rerender } = render(
      <LoadingSpinner size="sm" data-testid="spinner" />
    );

    let spinner = screen.getByTestId('spinner');
    let spinnerElement = spinner.querySelector('div[class*="animate-spin"]');
    expect(spinnerElement).toHaveClass('h-4', 'w-4');

    rerender(<LoadingSpinner size="md" data-testid="spinner" />);
    spinner = screen.getByTestId('spinner');
    spinnerElement = spinner.querySelector('div[class*="animate-spin"]');
    expect(spinnerElement).toHaveClass('h-8', 'w-8');

    rerender(<LoadingSpinner size="lg" data-testid="spinner" />);
    spinner = screen.getByTestId('spinner');
    spinnerElement = spinner.querySelector('div[class*="animate-spin"]');
    expect(spinnerElement).toHaveClass('h-12', 'w-12');
  });

  it('handles complex custom styling', () => {
    render(
      <LoadingSpinner
        className="min-h-screen bg-gradient-to-r from-blue-500 to-purple-600"
        message="Initializing application..."
        data-testid="spinner"
      />
    );
    const spinner = screen.getByTestId('spinner');
    expect(spinner).toHaveClass(
      'flex',
      'flex-col',
      'items-center',
      'justify-center',
      'min-h-screen',
      'bg-gradient-to-r',
      'from-blue-500',
      'to-purple-600'
    );

    const message = spinner.querySelector('p');
    expect(message).toHaveTextContent('Initializing application...');
  });
});

describe('LoadingScreen Component', () => {
  it('renders correctly', () => {
    render(<LoadingScreen data-testid="loading-screen" />);
    const loadingScreen = screen.getByTestId('loading-screen');
    expect(loadingScreen).toBeInTheDocument();
  });

  it('applies correct positioning classes', () => {
    render(<LoadingScreen data-testid="loading-screen" />);
    const fixedContainer = screen.getByTestId('loading-screen');
    expect(fixedContainer).toHaveClass(
      'fixed',
      'inset-0',
      'bg-background',
      'flex',
      'items-center',
      'justify-center'
    );
  });

  it('renders with large spinner', () => {
    render(<LoadingScreen data-testid="loading-screen" />);
    const loadingScreen = screen.getByTestId('loading-screen');
    const spinner = loadingScreen.querySelector('div[class*="animate-spin"]');
    expect(spinner).toHaveClass('h-12', 'w-12');
  });

  it('renders with default loading message', () => {
    render(<LoadingScreen />);
    const message = screen.getByText('Loading configuration...');
    expect(message).toHaveTextContent('Loading configuration...');
    expect(message).toHaveClass('text-muted-foreground');
  });

  it('applies correct spinner margin', () => {
    render(<LoadingScreen data-testid="loading-screen" />);
    const loadingScreen = screen.getByTestId('loading-screen');
    const spinner = loadingScreen.querySelector('div[class*="animate-spin"]');
    expect(spinner).toHaveClass('mb-2');
  });

  it('maintains proper layout structure', () => {
    render(<LoadingScreen data-testid="loading-screen" />);
    const loadingScreen = screen.getByTestId('loading-screen');
    const textCenter = loadingScreen.querySelector('.text-center');
    expect(textCenter).toHaveClass('text-center');
  });
});
