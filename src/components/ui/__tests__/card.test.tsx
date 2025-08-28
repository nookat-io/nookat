import React from 'react';
import { render, screen } from '../../../test/test-utils';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '../card';

describe('Card Components', () => {
  describe('Card', () => {
    it('renders with default props', () => {
      render(<Card data-testid="card">Card content</Card>);
      const card = screen.getByTestId('card');
      expect(card).toBeInTheDocument();
      expect(card).toHaveTextContent('Card content');
      expect(card).toHaveClass(
        'rounded-lg',
        'border',
        'bg-card',
        'text-card-foreground',
        'shadow-sm'
      );
    });

    it('renders with custom className', () => {
      render(
        <Card className="custom-class" data-testid="card">
          Card content
        </Card>
      );
      const card = screen.getByTestId('card');
      expect(card).toHaveClass('custom-class');
    });

    it('forwards ref correctly', () => {
      const ref = React.createRef<HTMLDivElement>();
      render(
        <Card ref={ref} data-testid="card">
          Card content
        </Card>
      );
      expect(ref.current).toBeInstanceOf(HTMLDivElement);
    });

    it('forwards additional props', () => {
      render(
        <Card data-testid="card" aria-label="Test card">
          Card content
        </Card>
      );
      const card = screen.getByTestId('card');
      expect(card).toHaveAttribute('aria-label', 'Test card');
    });
  });

  describe('CardHeader', () => {
    it('renders with default props', () => {
      render(<CardHeader data-testid="header">Header content</CardHeader>);
      const header = screen.getByTestId('header');
      expect(header).toBeInTheDocument();
      expect(header).toHaveTextContent('Header content');
      expect(header).toHaveClass('flex', 'flex-col', 'space-y-1.5', 'p-6');
    });

    it('renders with custom className', () => {
      render(
        <CardHeader className="custom-header" data-testid="header">
          Header content
        </CardHeader>
      );
      const header = screen.getByTestId('header');
      expect(header).toHaveClass('custom-header');
    });

    it('forwards ref correctly', () => {
      const ref = React.createRef<HTMLDivElement>();
      render(
        <CardHeader ref={ref} data-testid="header">
          Header content
        </CardHeader>
      );
      expect(ref.current).toBeInstanceOf(HTMLDivElement);
    });
  });

  describe('CardTitle', () => {
    it('renders with default props', () => {
      render(<CardTitle data-testid="title">Card Title</CardTitle>);
      const title = screen.getByTestId('title');
      expect(title).toBeInTheDocument();
      expect(title).toHaveTextContent('Card Title');
      expect(title.tagName).toBe('H3');
      expect(title).toHaveClass(
        'text-2xl',
        'font-semibold',
        'leading-none',
        'tracking-tight'
      );
    });

    it('renders with custom className', () => {
      render(
        <CardTitle className="custom-title" data-testid="title">
          Card Title
        </CardTitle>
      );
      const title = screen.getByTestId('title');
      expect(title).toHaveClass('custom-title');
    });

    it('forwards ref correctly', () => {
      const ref = React.createRef<HTMLHeadingElement>();
      render(
        <CardTitle ref={ref} data-testid="title">
          Card Title
        </CardTitle>
      );
      expect(ref.current).toBeInstanceOf(HTMLHeadingElement);
    });
  });

  describe('CardDescription', () => {
    it('renders with default props', () => {
      render(
        <CardDescription data-testid="description">
          Card description
        </CardDescription>
      );
      const description = screen.getByTestId('description');
      expect(description).toBeInTheDocument();
      expect(description).toHaveTextContent('Card description');
      expect(description.tagName).toBe('P');
      expect(description).toHaveClass('text-sm', 'text-muted-foreground');
    });

    it('renders with custom className', () => {
      render(
        <CardDescription
          className="custom-description"
          data-testid="description"
        >
          Card description
        </CardDescription>
      );
      const description = screen.getByTestId('description');
      expect(description).toHaveClass('custom-description');
    });

    it('forwards ref correctly', () => {
      const ref = React.createRef<HTMLParagraphElement>();
      render(
        <CardDescription ref={ref} data-testid="description">
          Card description
        </CardDescription>
      );
      expect(ref.current).toBeInstanceOf(HTMLParagraphElement);
    });
  });

  describe('CardContent', () => {
    it('renders with default props', () => {
      render(<CardContent data-testid="content">Content</CardContent>);
      const content = screen.getByTestId('content');
      expect(content).toBeInTheDocument();
      expect(content).toHaveTextContent('Content');
      expect(content).toHaveClass('p-6', 'pt-0');
    });

    it('renders with custom className', () => {
      render(
        <CardContent className="custom-content" data-testid="content">
          Content
        </CardContent>
      );
      const content = screen.getByTestId('content');
      expect(content).toHaveClass('custom-content');
    });

    it('forwards ref correctly', () => {
      const ref = React.createRef<HTMLDivElement>();
      render(
        <CardContent ref={ref} data-testid="content">
          Content
        </CardContent>
      );
      expect(ref.current).toBeInstanceOf(HTMLDivElement);
    });
  });

  describe('CardFooter', () => {
    it('renders with default props', () => {
      render(<CardFooter data-testid="footer">Footer content</CardFooter>);
      const footer = screen.getByTestId('footer');
      expect(footer).toBeInTheDocument();
      expect(footer).toHaveTextContent('Footer content');
      expect(footer).toHaveClass('flex', 'items-center', 'p-6', 'pt-0');
    });

    it('renders with custom className', () => {
      render(
        <CardFooter className="custom-footer" data-testid="footer">
          Footer content
        </CardFooter>
      );
      const footer = screen.getByTestId('footer');
      expect(footer).toHaveClass('custom-footer');
    });

    it('forwards ref correctly', () => {
      const ref = React.createRef<HTMLDivElement>();
      render(
        <CardFooter ref={ref} data-testid="footer">
          Footer content
        </CardFooter>
      );
      expect(ref.current).toBeInstanceOf(HTMLDivElement);
    });
  });

  describe('Card Composition', () => {
    it('renders a complete card with all components', () => {
      render(
        <Card data-testid="card">
          <CardHeader data-testid="header">
            <CardTitle data-testid="title">Test Card</CardTitle>
            <CardDescription data-testid="description">
              Test description
            </CardDescription>
          </CardHeader>
          <CardContent data-testid="content">
            <p>Main content</p>
          </CardContent>
          <CardFooter data-testid="footer">
            <button>Action</button>
          </CardFooter>
        </Card>
      );

      expect(screen.getByTestId('card')).toBeInTheDocument();
      expect(screen.getByTestId('header')).toBeInTheDocument();
      expect(screen.getByTestId('title')).toHaveTextContent('Test Card');
      expect(screen.getByTestId('description')).toHaveTextContent(
        'Test description'
      );
      expect(screen.getByTestId('content')).toHaveTextContent('Main content');
      expect(screen.getByTestId('footer')).toHaveTextContent('Action');
    });

    it('maintains proper styling hierarchy', () => {
      render(
        <Card className="main-card">
          <CardHeader className="header-class">
            <CardTitle className="title-class">Title</CardTitle>
          </CardHeader>
          <CardContent className="content-class">Content</CardContent>
        </Card>
      );

      const card = screen.getByText('Title').closest('[class*="main-card"]');
      const header = screen
        .getByText('Title')
        .closest('[class*="header-class"]');
      const title = screen.getByText('Title');
      const content = screen.getByText('Content');

      expect(card).toHaveClass('main-card');
      expect(header).toHaveClass('header-class');
      expect(title).toHaveClass('title-class');
      expect(content).toHaveClass('content-class');
    });
  });
});
