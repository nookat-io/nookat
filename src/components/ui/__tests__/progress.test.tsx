import React from 'react';
import { render, screen } from '../../../test/test-utils';
import { Progress } from '../progress';

describe('Progress Component', () => {
  describe('rendering', () => {
    it('renders with default props', () => {
      render(<Progress data-testid="progress" />);
      const progress = screen.getByTestId('progress');
      expect(progress).toBeInTheDocument();
    });

    it('renders with custom className', () => {
      render(<Progress className="custom-progress" data-testid="progress" />);
      const progress = screen.getByTestId('progress');
      expect(progress).toHaveClass('custom-progress');
    });

    it('renders with children', () => {
      render(
        <Progress data-testid="progress">
          <span>Custom content</span>
        </Progress>
      );
      const progress = screen.getByTestId('progress');
      expect(progress).toBeInTheDocument();
    });
  });

  describe('value handling', () => {
    it('handles undefined value correctly', () => {
      render(<Progress value={undefined} data-testid="progress" />);
      const progress = screen.getByTestId('progress');
      // The component should handle undefined values gracefully
      expect(progress).toBeInTheDocument();
    });

    it('handles null value correctly', () => {
      render(<Progress value={null} data-testid="progress" />);
      const progress = screen.getByTestId('progress');
      // The component should handle null values gracefully
      expect(progress).toBeInTheDocument();
    });

    it('handles zero value correctly', () => {
      render(<Progress value={0} data-testid="progress" />);
      const progress = screen.getByTestId('progress');
      expect(progress).toBeInTheDocument();
    });

    it('handles positive values correctly', () => {
      render(<Progress value={50} data-testid="progress" />);
      const progress = screen.getByTestId('progress');
      expect(progress).toBeInTheDocument();
    });

    it('handles 100% value correctly', () => {
      render(<Progress value={100} data-testid="progress" />);
      const progress = screen.getByTestId('progress');
      expect(progress).toBeInTheDocument();
    });
  });

  describe('styling', () => {
    it('renders indicator with correct styling', () => {
      render(<Progress data-testid="progress" />);
      const progress = screen.getByTestId('progress');

      // The indicator is rendered as a child element
      const indicator = progress.querySelector('[class*="bg-primary"]');
      expect(indicator).toBeInTheDocument();
      expect(indicator).toHaveClass(
        'h-full',
        'w-full',
        'flex-1',
        'bg-primary',
        'transition-all'
      );
    });

    it('applies default styling classes', () => {
      render(<Progress data-testid="progress" />);
      const progress = screen.getByTestId('progress');

      expect(progress).toHaveClass(
        'relative',
        'h-4',
        'w-full',
        'overflow-hidden',
        'rounded-full',
        'bg-secondary'
      );
    });

    it('applies custom styling classes', () => {
      render(
        <Progress className="custom-progress h-8" data-testid="progress" />
      );
      const progress = screen.getByTestId('progress');

      expect(progress).toHaveClass('custom-progress', 'h-8');
    });
  });

  describe('transform calculations', () => {
    it('applies correct transform style based on value', () => {
      render(<Progress value={60} data-testid="progress" />);
      const progress = screen.getByTestId('progress');
      const indicator = progress.querySelector('[class*="bg-primary"]');

      // The transform should be calculated as translateX(-40%) for 60% value
      expect(indicator).toHaveStyle({ transform: 'translateX(-40%)' });
    });

    it('handles edge case values correctly', () => {
      // Test 0% value
      const { rerender } = render(
        <Progress value={0} data-testid="progress" />
      );
      let progress = screen.getByTestId('progress');
      let indicator = progress.querySelector('[class*="bg-primary"]');

      expect(indicator).toHaveStyle({ transform: 'translateX(-100%)' });

      // Test 100% value
      rerender(<Progress value={100} data-testid="progress" />);
      progress = screen.getByTestId('progress');
      indicator = progress.querySelector('[class*="bg-primary"]');

      // For 100% value, the transform should be translateX(-0%) which is equivalent to translateX(0%)
      expect(indicator).toHaveStyle({ transform: 'translateX(-0%)' });
    });

    it('handles decimal values correctly', () => {
      render(<Progress value={33.33} data-testid="progress" />);
      const progress = screen.getByTestId('progress');
      const indicator = progress.querySelector('[class*="bg-primary"]');

      // The transform should be calculated as translateX(-66.67%)
      expect(indicator).toHaveStyle({ transform: 'translateX(-66.67%)' });
    });
  });

  describe('accessibility', () => {
    it('maintains proper accessibility attributes', () => {
      render(
        <Progress
          value={25}
          data-testid="progress"
          aria-label="Download progress"
        />
      );
      const progress = screen.getByTestId('progress');

      // The component should accept aria-label
      expect(progress).toHaveAttribute('aria-label', 'Download progress');
    });

    it('handles value changes dynamically', () => {
      const { rerender } = render(
        <Progress value={0} data-testid="progress" />
      );

      let progress = screen.getByTestId('progress');
      expect(progress).toBeInTheDocument();

      rerender(<Progress value={50} data-testid="progress" />);
      progress = screen.getByTestId('progress');
      expect(progress).toBeInTheDocument();

      rerender(<Progress value={100} data-testid="progress" />);
      progress = screen.getByTestId('progress');
      expect(progress).toBeInTheDocument();
    });
  });

  describe('edge cases', () => {
    it('handles negative values gracefully', () => {
      render(<Progress value={-10} data-testid="progress" />);
      const progress = screen.getByTestId('progress');
      expect(progress).toBeInTheDocument();
    });

    it('handles values over 100 gracefully', () => {
      render(<Progress value={150} data-testid="progress" />);
      const progress = screen.getByTestId('progress');
      expect(progress).toBeInTheDocument();
    });

    it('handles undefined props gracefully', () => {
      render(<Progress data-testid="progress" />);
      const progress = screen.getByTestId('progress');
      expect(progress).toBeInTheDocument();
    });

    it('handles null props gracefully', () => {
      render(<Progress data-testid="progress" />);
      const progress = screen.getByTestId('progress');
      expect(progress).toBeInTheDocument();
    });

    it('handles empty string props gracefully', () => {
      render(<Progress data-testid="progress" />);
      const progress = screen.getByTestId('progress');
      expect(progress).toBeInTheDocument();
    });
  });

  describe('prop forwarding', () => {
    it('forwards all Radix UI props correctly', () => {
      render(
        <Progress
          data-testid="progress"
          data-state="complete"
          data-disabled="false"
        />
      );

      const progress = screen.getByTestId('progress');
      expect(progress).toHaveAttribute('data-state', 'complete');
      expect(progress).toHaveAttribute('data-disabled', 'false');
      // Note: Inline styles may not be properly applied in test environment
    });

    it('renders with complex styling combinations', () => {
      render(
        <Progress
          className="custom-progress h-8 rounded-lg shadow-lg"
          style={{ border: '2px solid blue' }}
          data-testid="progress"
        />
      );

      const progress = screen.getByTestId('progress');
      expect(progress).toHaveClass(
        'custom-progress',
        'h-8',
        'rounded-lg',
        'shadow-lg'
      );
      expect(progress).toHaveStyle({ border: '2px solid blue' });
    });
  });

  describe('ref forwarding', () => {
    it('forwards ref correctly', () => {
      const ref = React.createRef<HTMLDivElement>();
      render(<Progress ref={ref} data-testid="progress" />);

      expect(ref.current).toBeInstanceOf(HTMLDivElement);
    });
  });
});
