import React from 'react';
import { render, screen } from '../../../test/test-utils';
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from '../dialog';

describe('Dialog Components', () => {
  describe('Dialog', () => {
    it('renders with default props', () => {
      render(
        <Dialog>
          <DialogTrigger>Open Dialog</DialogTrigger>
          <DialogContent>
            <DialogTitle>Test Dialog</DialogTitle>
            <DialogDescription>Test description</DialogDescription>
          </DialogContent>
        </Dialog>
      );

      expect(screen.getByText('Open Dialog')).toBeInTheDocument();
    });

    it('handles open state correctly', () => {
      render(
        <Dialog defaultOpen>
          <DialogTrigger>Open Dialog</DialogTrigger>
          <DialogContent>
            <DialogTitle>Test Dialog</DialogTitle>
          </DialogContent>
        </Dialog>
      );

      expect(screen.getByText('Test Dialog')).toBeInTheDocument();
    });
  });

  describe('DialogTrigger', () => {
    it('renders with children', () => {
      render(
        <Dialog>
          <DialogTrigger>Click me</DialogTrigger>
        </Dialog>
      );
      expect(screen.getByText('Click me')).toBeInTheDocument();
    });

    it('forwards ref correctly', () => {
      const ref = React.createRef<HTMLButtonElement>();
      render(
        <Dialog>
          <DialogTrigger ref={ref}>Click me</DialogTrigger>
        </Dialog>
      );
      expect(ref.current).toBeInstanceOf(HTMLButtonElement);
    });

    it('forwards additional props', () => {
      render(
        <Dialog>
          <DialogTrigger data-testid="trigger" aria-label="Open dialog">
            Click me
          </DialogTrigger>
        </Dialog>
      );

      const trigger = screen.getByTestId('trigger');
      expect(trigger).toHaveAttribute('aria-label', 'Open dialog');
    });
  });

  describe('DialogContent', () => {
    it('renders with children', () => {
      render(
        <Dialog defaultOpen>
          <DialogContent>
            <DialogTitle>Title</DialogTitle>
            <div>Content</div>
          </DialogContent>
        </Dialog>
      );

      expect(screen.getByText('Content')).toBeInTheDocument();
    });

    it('forwards ref correctly', () => {
      const ref = React.createRef<HTMLDivElement>();
      render(
        <Dialog defaultOpen>
          <DialogContent ref={ref}>
            <DialogTitle>Title</DialogTitle>
            <div>Content</div>
          </DialogContent>
        </Dialog>
      );

      expect(ref.current).toBeInstanceOf(HTMLDivElement);
    });

    it('forwards additional props', () => {
      render(
        <Dialog defaultOpen>
          <DialogContent data-testid="content" aria-label="Dialog content">
            <DialogTitle>Title</DialogTitle>
            <div>Content</div>
          </DialogContent>
        </Dialog>
      );

      const content = screen.getByTestId('content');
      expect(content).toHaveAttribute('aria-label', 'Dialog content');
    });

    it('applies custom className', () => {
      render(
        <Dialog defaultOpen>
          <DialogContent className="custom-dialog">
            <DialogTitle>Title</DialogTitle>
            <div>Content</div>
          </DialogContent>
        </Dialog>
      );

      const content = screen
        .getByText('Content')
        .closest('[class*="custom-dialog"]');
      expect(content).toHaveClass('custom-dialog');
    });
  });

  describe('DialogHeader', () => {
    it('renders with children', () => {
      render(
        <Dialog defaultOpen>
          <DialogContent>
            <DialogTitle>Title</DialogTitle>
            <DialogHeader>
              <div>Header content</div>
            </DialogHeader>
          </DialogContent>
        </Dialog>
      );

      expect(screen.getByText('Header content')).toBeInTheDocument();
    });

    it('applies custom className', () => {
      render(
        <Dialog defaultOpen>
          <DialogContent>
            <DialogTitle>Title</DialogTitle>
            <DialogHeader className="custom-header">
              <div>Header content</div>
            </DialogHeader>
          </DialogContent>
        </Dialog>
      );

      const header = screen
        .getByText('Header content')
        .closest('[class*="custom-header"]');
      expect(header).toHaveClass('custom-header');
    });

    it('forwards additional props', () => {
      render(
        <Dialog defaultOpen>
          <DialogContent>
            <DialogTitle>Title</DialogTitle>
            <DialogHeader data-testid="header" aria-label="Dialog header">
              <div>Header content</div>
            </DialogHeader>
          </DialogContent>
        </Dialog>
      );

      const header = screen.getByTestId('header');
      expect(header).toHaveAttribute('aria-label', 'Dialog header');
    });
  });

  describe('DialogFooter', () => {
    it('renders with children', () => {
      render(
        <Dialog defaultOpen>
          <DialogContent>
            <DialogTitle>Title</DialogTitle>
            <DialogFooter>
              <div>Footer content</div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      );

      expect(screen.getByText('Footer content')).toBeInTheDocument();
    });

    it('applies custom className', () => {
      render(
        <Dialog defaultOpen>
          <DialogContent>
            <DialogTitle>Title</DialogTitle>
            <DialogFooter className="custom-footer">
              <div>Footer content</div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      );

      const footer = screen
        .getByText('Footer content')
        .closest('[class*="custom-footer"]');
      expect(footer).toHaveClass('custom-footer');
    });

    it('forwards additional props', () => {
      render(
        <Dialog defaultOpen>
          <DialogContent>
            <DialogTitle>Title</DialogTitle>
            <DialogFooter data-testid="footer" aria-label="Dialog footer">
              <div>Footer content</div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      );

      const footer = screen.getByTestId('footer');
      expect(footer).toHaveAttribute('aria-label', 'Dialog footer');
    });
  });

  describe('DialogTitle', () => {
    it('renders with children', () => {
      render(
        <Dialog defaultOpen>
          <DialogContent>
            <DialogTitle>Dialog Title</DialogTitle>
          </DialogContent>
        </Dialog>
      );

      expect(screen.getByText('Dialog Title')).toBeInTheDocument();
    });

    it('forwards ref correctly', () => {
      const ref = React.createRef<HTMLHeadingElement>();
      render(
        <Dialog defaultOpen>
          <DialogContent>
            <DialogTitle ref={ref}>Dialog Title</DialogTitle>
          </DialogContent>
        </Dialog>
      );

      expect(ref.current).toBeInstanceOf(HTMLHeadingElement);
    });

    it('applies custom className', () => {
      render(
        <Dialog defaultOpen>
          <DialogContent>
            <DialogTitle className="custom-title">Dialog Title</DialogTitle>
          </DialogContent>
        </Dialog>
      );

      const title = screen.getByText('Dialog Title');
      expect(title).toHaveClass('custom-title');
    });

    it('forwards additional props', () => {
      render(
        <Dialog defaultOpen>
          <DialogContent>
            <DialogTitle data-testid="title" aria-label="Dialog title">
              Dialog Title
            </DialogTitle>
          </DialogContent>
        </Dialog>
      );

      const title = screen.getByTestId('title');
      expect(title).toHaveAttribute('aria-label', 'Dialog title');
    });
  });

  describe('DialogDescription', () => {
    it('renders with children', () => {
      render(
        <Dialog defaultOpen>
          <DialogContent>
            <DialogDescription>Dialog description</DialogDescription>
          </DialogContent>
        </Dialog>
      );

      expect(screen.getByText('Dialog description')).toBeInTheDocument();
    });

    it('forwards ref correctly', () => {
      const ref = React.createRef<HTMLParagraphElement>();
      render(
        <Dialog defaultOpen>
          <DialogContent>
            <DialogDescription ref={ref}>Dialog description</DialogDescription>
          </DialogContent>
        </Dialog>
      );

      expect(ref.current).toBeInstanceOf(HTMLParagraphElement);
    });

    it('applies custom className', () => {
      render(
        <Dialog defaultOpen>
          <DialogContent>
            <DialogDescription className="custom-description">
              Dialog description
            </DialogDescription>
          </DialogContent>
        </Dialog>
      );

      const description = screen.getByText('Dialog description');
      expect(description).toHaveClass('custom-description');
    });

    it('forwards additional props', () => {
      render(
        <Dialog defaultOpen>
          <DialogContent>
            <DialogDescription
              data-testid="description"
              aria-label="Dialog description"
            >
              Dialog description
            </DialogDescription>
          </DialogContent>
        </Dialog>
      );

      const description = screen.getByTestId('description');
      expect(description).toHaveAttribute('aria-label', 'Dialog description');
    });
  });

  describe('DialogClose', () => {
    it('renders close button', () => {
      render(
        <Dialog defaultOpen>
          <DialogContent>
            <DialogTitle>Title</DialogTitle>
            <DialogClose>Close</DialogClose>
          </DialogContent>
        </Dialog>
      );

      // Disambiguate between visible button text and sr-only span
      const closeButtons = screen.getAllByText('Close');
      expect(
        closeButtons.some(el => el.tagName.toLowerCase() === 'button')
      ).toBe(true);
    });

    it('forwards ref correctly', () => {
      const ref = React.createRef<HTMLButtonElement>();
      render(
        <Dialog defaultOpen>
          <DialogContent>
            <DialogClose ref={ref}>Close</DialogClose>
          </DialogContent>
        </Dialog>
      );

      expect(ref.current).toBeInstanceOf(HTMLButtonElement);
    });

    it('forwards additional props', () => {
      render(
        <Dialog defaultOpen>
          <DialogContent>
            <DialogClose data-testid="close" aria-label="Close dialog">
              Close
            </DialogClose>
          </DialogContent>
        </Dialog>
      );

      const closeButton = screen.getByTestId('close');
      expect(closeButton).toHaveAttribute('aria-label', 'Close dialog');
    });
  });

  describe('Dialog Composition', () => {
    it('renders a complete dialog with all components', () => {
      render(
        <Dialog defaultOpen>
          <DialogTrigger>Open Dialog</DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Complete Dialog</DialogTitle>
              <DialogDescription>
                This is a complete dialog example
              </DialogDescription>
            </DialogHeader>
            <div>Main content goes here</div>
            <DialogFooter>
              <DialogClose>Cancel</DialogClose>
              <button>Confirm</button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      );

      expect(screen.getByText('Complete Dialog')).toBeInTheDocument();
      expect(
        screen.getByText('This is a complete dialog example')
      ).toBeInTheDocument();
      expect(screen.getByText('Main content goes here')).toBeInTheDocument();
      expect(screen.getByText('Cancel')).toBeInTheDocument();
      expect(screen.getByText('Confirm')).toBeInTheDocument();
    });

    it('maintains proper styling hierarchy', () => {
      render(
        <Dialog defaultOpen>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Styled Dialog</DialogTitle>
            </DialogHeader>
            <DialogFooter>
              <button>Action</button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      );

      const title = screen.getByText('Styled Dialog');
      const footer = screen.getByText('Action').closest('div');

      expect(title).toHaveClass('text-lg', 'font-semibold');
      expect(footer).toHaveClass('flex', 'flex-col-reverse', 'sm:flex-row');
    });
  });
});
