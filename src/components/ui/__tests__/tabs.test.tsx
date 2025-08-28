import React from 'react';
import { render, screen, fireEvent } from '../../../test/test-utils';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../tabs';

describe('Tabs Components', () => {
  describe('Tabs', () => {
    it('renders with default props', () => {
      render(
        <Tabs data-testid="tabs" defaultValue="tab1">
          <TabsList>
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
          </TabsList>
          <TabsContent value="tab1">Content 1</TabsContent>
        </Tabs>
      );

      const tabs = screen.getByTestId('tabs');
      expect(tabs).toBeInTheDocument();
      expect(tabs).toHaveAttribute('data-orientation', 'horizontal');
    });

    it('renders with custom orientation', () => {
      render(
        <Tabs data-testid="tabs" defaultValue="tab1" orientation="vertical">
          <TabsList>
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
          </TabsList>
          <TabsContent value="tab1">Content 1</TabsContent>
        </Tabs>
      );

      const tabs = screen.getByTestId('tabs');
      expect(tabs).toHaveAttribute('data-orientation', 'vertical');
    });

    it('forwards additional props', () => {
      render(
        <Tabs
          data-testid="tabs"
          defaultValue="tab1"
          aria-label="Test tabs"
          className="custom-tabs"
        >
          <TabsList>
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
          </TabsList>
          <TabsContent value="tab1">Content 1</TabsContent>
        </Tabs>
      );

      const tabs = screen.getByTestId('tabs');
      expect(tabs).toHaveAttribute('aria-label', 'Test tabs');
      expect(tabs).toHaveClass('custom-tabs');
    });
  });

  describe('TabsList', () => {
    it('renders with default props', () => {
      render(
        <Tabs defaultValue="tab1">
          <TabsList data-testid="tabs-list">
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
          </TabsList>
          <TabsContent value="tab1">Content 1</TabsContent>
        </Tabs>
      );

      const tabsList = screen.getByTestId('tabs-list');
      expect(tabsList).toBeInTheDocument();
      expect(tabsList).toHaveClass(
        'inline-flex',
        'h-10',
        'items-center',
        'justify-center',
        'rounded-md',
        'bg-muted',
        'p-1',
        'text-muted-foreground'
      );
    });

    it('renders with custom className', () => {
      render(
        <Tabs defaultValue="tab1">
          <TabsList className="custom-tabs-list" data-testid="tabs-list">
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
          </TabsList>
          <TabsContent value="tab1">Content 1</TabsContent>
        </Tabs>
      );

      const tabsList = screen.getByTestId('tabs-list');
      expect(tabsList).toHaveClass('custom-tabs-list');
    });

    it('forwards ref correctly', () => {
      const ref = React.createRef<HTMLDivElement>();
      render(
        <Tabs defaultValue="tab1">
          <TabsList ref={ref} data-testid="tabs-list">
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
          </TabsList>
          <TabsContent value="tab1">Content 1</TabsContent>
        </Tabs>
      );

      expect(ref.current).toBeInstanceOf(HTMLDivElement);
    });

    it('forwards additional props', () => {
      render(
        <Tabs defaultValue="tab1">
          <TabsList
            data-testid="tabs-list"
            aria-label="Tab navigation"
            role="tablist"
          >
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
          </TabsList>
          <TabsContent value="tab1">Content 1</TabsContent>
        </Tabs>
      );

      const tabsList = screen.getByTestId('tabs-list');
      expect(tabsList).toHaveAttribute('aria-label', 'Tab navigation');
      expect(tabsList).toHaveAttribute('role', 'tablist');
    });
  });

  describe('TabsTrigger', () => {
    it('renders with default props', () => {
      render(
        <Tabs defaultValue="tab1">
          <TabsList>
            <TabsTrigger value="tab1" data-testid="tab-trigger">
              Tab 1
            </TabsTrigger>
          </TabsList>
          <TabsContent value="tab1">Content 1</TabsContent>
        </Tabs>
      );

      const tabTrigger = screen.getByTestId('tab-trigger');
      expect(tabTrigger).toBeInTheDocument();
      expect(tabTrigger).toHaveTextContent('Tab 1');
      expect(tabTrigger).toHaveAttribute('role', 'tab');
      expect(tabTrigger).toHaveAttribute('aria-selected', 'true');
      expect(tabTrigger).toHaveClass(
        'inline-flex',
        'items-center',
        'justify-center',
        'whitespace-nowrap',
        'rounded-sm',
        'px-3',
        'py-1.5',
        'text-sm',
        'font-medium',
        'ring-offset-background',
        'transition-all',
        'focus-visible:outline-none',
        'focus-visible:ring-2',
        'focus-visible:ring-ring',
        'focus-visible:ring-offset-2',
        'disabled:pointer-events-none',
        'disabled:opacity-50',
        'data-[state=active]:bg-background',
        'data-[state=active]:text-foreground',
        'data-[state=active]:shadow-sm'
      );
    });

    it('renders with custom className', () => {
      render(
        <Tabs defaultValue="tab1">
          <TabsList>
            <TabsTrigger
              value="tab1"
              className="custom-tab-trigger"
              data-testid="tab-trigger"
            >
              Tab 1
            </TabsTrigger>
          </TabsList>
          <TabsContent value="tab1">Content 1</TabsContent>
        </Tabs>
      );

      const tabTrigger = screen.getByTestId('tab-trigger');
      expect(tabTrigger).toHaveClass('custom-tab-trigger');
    });

    it('forwards ref correctly', () => {
      const ref = React.createRef<HTMLButtonElement>();
      render(
        <Tabs defaultValue="tab1">
          <TabsList>
            <TabsTrigger ref={ref} value="tab1" data-testid="tab-trigger">
              Tab 1
            </TabsTrigger>
          </TabsList>
          <TabsContent value="tab1">Content 1</TabsContent>
        </Tabs>
      );

      expect(ref.current).toBeInstanceOf(HTMLButtonElement);
    });

    it('handles disabled state', () => {
      render(
        <Tabs defaultValue="tab1">
          <TabsList>
            <TabsTrigger value="tab1" disabled data-testid="tab-trigger">
              Tab 1
            </TabsTrigger>
          </TabsList>
          <TabsContent value="tab1">Content 1</TabsContent>
        </Tabs>
      );

      const tabTrigger = screen.getByTestId('tab-trigger');
      expect(tabTrigger).toBeDisabled();
      expect(tabTrigger).toHaveClass(
        'disabled:pointer-events-none',
        'disabled:opacity-50'
      );
    });

    it('handles keyboard navigation', () => {
      const onValueChange = jest.fn();
      render(
        <Tabs defaultValue="tab1" onValueChange={onValueChange}>
          <TabsList>
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
            <TabsTrigger value="tab2" data-testid="tab-trigger">
              Tab 2
            </TabsTrigger>
          </TabsList>
          <TabsContent value="tab1">Content 1</TabsContent>
          <TabsContent value="tab2">Content 2</TabsContent>
        </Tabs>
      );

      const tabTrigger = screen.getByTestId('tab-trigger');

      // Enter key should activate the tab
      fireEvent.keyDown(tabTrigger, { key: 'Enter' });
      expect(onValueChange).toHaveBeenCalledWith('tab2');

      // Space key should also activate the tab
      fireEvent.keyDown(tabTrigger, { key: ' ' });
      expect(onValueChange).toHaveBeenCalledWith('tab2');
    });
  });

  describe('TabsContent', () => {
    it('renders with default props', () => {
      render(
        <Tabs defaultValue="tab1">
          <TabsList>
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
          </TabsList>
          <TabsContent value="tab1" data-testid="tab-content">
            Content 1
          </TabsContent>
        </Tabs>
      );

      const tabContent = screen.getByTestId('tab-content');
      expect(tabContent).toBeInTheDocument();
      expect(tabContent).toHaveTextContent('Content 1');
      expect(tabContent).toHaveAttribute('role', 'tabpanel');
      expect(tabContent).toHaveClass(
        'mt-2',
        'ring-offset-background',
        'focus-visible:outline-none',
        'focus-visible:ring-2',
        'focus-visible:ring-ring',
        'focus-visible:ring-offset-2'
      );
    });

    it('renders with custom className', () => {
      render(
        <Tabs defaultValue="tab1">
          <TabsList>
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
          </TabsList>
          <TabsContent
            value="tab1"
            className="custom-tab-content"
            data-testid="tab-content"
          >
            Content 1
          </TabsContent>
        </Tabs>
      );

      const tabContent = screen.getByTestId('tab-content');
      expect(tabContent).toHaveClass('custom-tab-content');
    });

    it('forwards ref correctly', () => {
      const ref = React.createRef<HTMLDivElement>();
      render(
        <Tabs defaultValue="tab1">
          <TabsList>
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
          </TabsList>
          <TabsContent ref={ref} value="tab1" data-testid="tab-content">
            Content 1
          </TabsContent>
        </Tabs>
      );

      expect(ref.current).toBeInstanceOf(HTMLDivElement);
    });

    it('only shows content for active tab', () => {
      render(
        <Tabs defaultValue="tab1">
          <TabsList>
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
            <TabsTrigger value="tab2">Tab 2</TabsTrigger>
          </TabsList>
          <TabsContent value="tab1" data-testid="content-1">
            Content 1
          </TabsContent>
          <TabsContent value="tab2" data-testid="content-2">
            Content 2
          </TabsContent>
        </Tabs>
      );

      expect(screen.getByTestId('content-1')).toBeInTheDocument();
      expect(screen.getByTestId('content-2')).not.toBeVisible();
    });
  });

  describe('Tabs Integration', () => {
    it('renders a complete tabs component', () => {
      render(
        <Tabs defaultValue="tab1" data-testid="tabs">
          <TabsList data-testid="tabs-list">
            <TabsTrigger value="tab1" data-testid="trigger-1">
              Tab 1
            </TabsTrigger>
            <TabsTrigger value="tab2" data-testid="trigger-2">
              Tab 2
            </TabsTrigger>
          </TabsList>
          <TabsContent value="tab1" data-testid="content-1">
            Content 1
          </TabsContent>
          <TabsContent value="tab2" data-testid="content-2">
            Content 2
          </TabsContent>
        </Tabs>
      );

      expect(screen.getByTestId('tabs')).toBeInTheDocument();
      expect(screen.getByTestId('tabs-list')).toBeInTheDocument();
      expect(screen.getByTestId('trigger-1')).toBeInTheDocument();
      expect(screen.getByTestId('trigger-2')).toBeInTheDocument();
      expect(screen.getByTestId('content-1')).toBeInTheDocument();
      expect(screen.getByTestId('content-2')).toBeInTheDocument();
    });

    it('maintains proper accessibility attributes', () => {
      render(
        <Tabs defaultValue="tab1">
          <TabsList aria-label="Tab navigation">
            <TabsTrigger value="tab1" data-testid="trigger-1">
              Tab 1
            </TabsTrigger>
            <TabsTrigger value="tab2" data-testid="trigger-2">
              Tab 2
            </TabsTrigger>
          </TabsList>
          <TabsContent value="tab1" data-testid="content-1">
            Content 1
          </TabsContent>
          <TabsContent value="tab2" data-testid="content-2">
            Content 2
          </TabsContent>
        </Tabs>
      );

      const tabsList = screen.getByLabelText('Tab navigation');
      const trigger1 = screen.getByTestId('trigger-1');
      const trigger2 = screen.getByTestId('trigger-2');
      const content1 = screen.getByTestId('content-1');
      const content2 = screen.getByTestId('content-2');

      expect(tabsList).toHaveAttribute('role', 'tablist');
      expect(trigger1).toHaveAttribute('role', 'tab');
      expect(trigger2).toHaveAttribute('role', 'tab');
      expect(content1).toHaveAttribute('role', 'tabpanel');
      expect(content2).toHaveAttribute('role', 'tabpanel');

      // First tab should be selected by default
      expect(trigger1).toHaveAttribute('aria-selected', 'true');
      expect(trigger2).toHaveAttribute('aria-selected', 'false');

      // Content should be properly associated
      expect(trigger1).toHaveAttribute('aria-controls', content1.id);
      expect(trigger2).toHaveAttribute('aria-controls', content2.id);
      expect(content1).toHaveAttribute('aria-labelledby', trigger1.id);
      expect(content2).toHaveAttribute('aria-labelledby', trigger2.id);
    });
  });
});
