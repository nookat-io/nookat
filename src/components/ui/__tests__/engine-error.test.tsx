import { render, screen, fireEvent } from '../../../test/test-utils';
import EngineErrorGate from '../engine-error';

// Mock the useEngineStatus hook
const mockUseEngineStatus = jest.fn();
jest.mock('../../../hooks/use-engine-status', () => ({
  useEngineStatus: mockUseEngineStatus,
}));

describe('EngineErrorGate Component', () => {
  const defaultProps = {
    children: <div data-testid="children">Test Content</div>,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders children when engine status is not unknown', () => {
    mockUseEngineStatus.mockReturnValue({
      status: 'Running',
      refetch: jest.fn(),
      isChecking: false,
    });

    render(<EngineErrorGate {...defaultProps} />);

    expect(screen.getByTestId('children')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('renders children when engine is checking', () => {
    mockUseEngineStatus.mockReturnValue({
      status: 'Unknown',
      refetch: jest.fn(),
      isChecking: true,
    });

    render(<EngineErrorGate {...defaultProps} />);

    expect(screen.getByTestId('children')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('renders error display when engine status is unknown and not checking', () => {
    const mockRefetch = jest.fn();
    mockUseEngineStatus.mockReturnValue({
      status: 'Unknown',
      refetch: mockRefetch,
      isChecking: false,
    });

    render(<EngineErrorGate {...defaultProps} />);

    expect(screen.queryByTestId('children')).not.toBeInTheDocument();
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText('Engine status is unknown')).toBeInTheDocument();
  });

  it('renders error display with correct styling classes', () => {
    mockUseEngineStatus.mockReturnValue({
      status: 'Unknown',
      refetch: jest.fn(),
      isChecking: false,
    });

    render(<EngineErrorGate {...defaultProps} />);

    const errorContainer = screen.getByRole('alert');
    expect(errorContainer).toHaveClass(
      'p-6',
      'h-full',
      'flex',
      'items-center',
      'justify-center'
    );
  });

  it('renders error display with correct accessibility attributes', () => {
    mockUseEngineStatus.mockReturnValue({
      status: 'Unknown',
      refetch: jest.fn(),
      isChecking: false,
    });

    render(<EngineErrorGate {...defaultProps} />);

    const errorContainer = screen.getByRole('alert');
    expect(errorContainer).toHaveAttribute('role', 'alert');
    expect(errorContainer).toHaveAttribute('aria-live', 'assertive');
  });

  it('calls refetch when retry button is clicked', () => {
    const mockRefetch = jest.fn();
    mockUseEngineStatus.mockReturnValue({
      status: 'Unknown',
      refetch: mockRefetch,
      isChecking: false,
    });

    render(<EngineErrorGate {...defaultProps} />);

    const retryButton = screen.getByRole('button', { name: /retry/i });
    fireEvent.click(retryButton);

    expect(mockRefetch).toHaveBeenCalledTimes(1);
  });

  it('renders ErrorDisplay component with correct props', () => {
    const mockRefetch = jest.fn();
    mockUseEngineStatus.mockReturnValue({
      status: 'Unknown',
      refetch: mockRefetch,
      isChecking: false,
    });

    render(<EngineErrorGate {...defaultProps} />);

    // The ErrorDisplay component should be rendered with the error message
    expect(screen.getByText('Engine status is unknown')).toBeInTheDocument();

    // The retry button should be present and functional
    const retryButton = screen.getByRole('button', { name: /retry/i });
    expect(retryButton).toBeInTheDocument();
  });

  it('handles different engine statuses correctly', () => {
    const mockRefetch = jest.fn();

    // Test with 'Running' status
    mockUseEngineStatus.mockReturnValue({
      status: 'Running',
      refetch: mockRefetch,
      isChecking: false,
    });

    const { rerender } = render(<EngineErrorGate {...defaultProps} />);
    expect(screen.getByTestId('children')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();

    // Test with 'Stopped' status
    mockUseEngineStatus.mockReturnValue({
      status: 'Stopped',
      refetch: mockRefetch,
      isChecking: false,
    });

    rerender(<EngineErrorGate {...defaultProps} />);
    expect(screen.getByTestId('children')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();

    // Test with 'Error' status
    mockUseEngineStatus.mockReturnValue({
      status: 'Error',
      refetch: mockRefetch,
      isChecking: false,
    });

    rerender(<EngineErrorGate {...defaultProps} />);
    expect(screen.getByTestId('children')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('handles checking state correctly', () => {
    const mockRefetch = jest.fn();

    // Test when checking is true
    mockUseEngineStatus.mockReturnValue({
      status: 'Unknown',
      refetch: mockRefetch,
      isChecking: true,
    });

    render(<EngineErrorGate {...defaultProps} />);
    expect(screen.getByTestId('children')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('shows error when checking is false and status is unknown', () => {
    const mockRefetch = jest.fn();

    mockUseEngineStatus.mockReturnValue({
      status: 'Unknown',
      refetch: mockRefetch,
      isChecking: false,
    });

    render(<EngineErrorGate {...defaultProps} />);

    expect(screen.queryByTestId('children')).not.toBeInTheDocument();
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('renders children with complex content', () => {
    const complexChildren = (
      <div>
        <h1>Complex Title</h1>
        <p>
          Complex paragraph with <strong>bold text</strong>
        </p>
        <button>Click me</button>
      </div>
    );

    mockUseEngineStatus.mockReturnValue({
      status: 'Running',
      refetch: jest.fn(),
      isChecking: false,
    });

    render(<EngineErrorGate children={complexChildren} />);

    expect(screen.getByText('Complex Title')).toBeInTheDocument();
    expect(screen.getByText('Complex paragraph with')).toBeInTheDocument();
    expect(screen.getByText('bold text')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Click me' })
    ).toBeInTheDocument();
  });

  it('maintains error state when refetch is called', () => {
    const mockRefetch = jest.fn();
    mockUseEngineStatus.mockReturnValue({
      status: 'Unknown',
      refetch: mockRefetch,
      isChecking: false,
    });

    render(<EngineErrorGate {...defaultProps} />);

    expect(screen.getByRole('alert')).toBeInTheDocument();

    const retryButton = screen.getByRole('button', { name: /retry/i });
    fireEvent.click(retryButton);

    // The error should still be displayed after clicking retry
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(mockRefetch).toHaveBeenCalledTimes(1);
  });

  it('handles empty children gracefully', () => {
    mockUseEngineStatus.mockReturnValue({
      status: 'Running',
      refetch: jest.fn(),
      isChecking: false,
    });

    render(<EngineErrorGate children={null} />);

    // Should render without errors even with null children
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('handles undefined children gracefully', () => {
    mockUseEngineStatus.mockReturnValue({
      status: 'Running',
      refetch: jest.fn(),
      isChecking: false,
    });

    render(<EngineErrorGate children={undefined} />);

    // Should render without errors even with undefined children
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
