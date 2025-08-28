import React from 'react';
import { render, screen, fireEvent } from '../../../test/test-utils';
import {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem,
  SelectSeparator,
} from '../select';

describe('Select Components', () => {
  describe('Select', () => {
    it('renders with default props', () => {
      render(
        <Select>
          <SelectTrigger>
            <SelectValue placeholder="Select an option" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="option1">Option 1</SelectItem>
          </SelectContent>
        </Select>
      );

      expect(screen.getByText('Select an option')).toBeInTheDocument();
    });

    it('handles value changes', () => {
      const onValueChange = jest.fn();
      render(
        <Select onValueChange={onValueChange}>
          <SelectTrigger>
            <SelectValue placeholder="Select an option" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="option1">Option 1</SelectItem>
          </SelectContent>
        </Select>
      );

      const trigger = screen.getByRole('combobox');
      fireEvent.click(trigger);

      const option = screen.getByText('Option 1');
      fireEvent.click(option);

      expect(onValueChange).toHaveBeenCalledWith('option1');
    });
  });

  describe('SelectTrigger', () => {
    it('renders with children', () => {
      render(
        <Select>
          <SelectTrigger>
            <SelectValue placeholder="Select an option" />
          </SelectTrigger>
        </Select>
      );

      expect(screen.getByText('Select an option')).toBeInTheDocument();
    });

    it('forwards ref correctly', () => {
      const ref = React.createRef<HTMLButtonElement>();
      render(
        <Select>
          <SelectTrigger ref={ref}>
            <SelectValue placeholder="Select an option" />
          </SelectTrigger>
        </Select>
      );

      expect(ref.current).toBeInstanceOf(HTMLButtonElement);
    });

    it('applies custom className', () => {
      render(
        <Select>
          <SelectTrigger className="custom-trigger">
            <SelectValue placeholder="Select an option" />
          </SelectTrigger>
        </Select>
      );

      const trigger = screen.getByRole('combobox');
      expect(trigger).toHaveClass('custom-trigger');
    });

    it('forwards additional props', () => {
      render(
        <Select>
          <SelectTrigger data-testid="trigger" aria-label="Select option">
            <SelectValue placeholder="Select an option" />
          </SelectTrigger>
        </Select>
      );

      const trigger = screen.getByTestId('trigger');
      expect(trigger).toHaveAttribute('aria-label', 'Select option');
    });

    it('applies disabled state correctly', () => {
      render(
        <Select>
          <SelectTrigger disabled>
            <SelectValue placeholder="Select an option" />
          </SelectTrigger>
        </Select>
      );

      const trigger = screen.getByRole('combobox');
      expect(trigger).toBeDisabled();
      expect(trigger).toHaveClass(
        'disabled:cursor-not-allowed',
        'disabled:opacity-50'
      );
    });
  });

  describe('SelectValue', () => {
    it('renders placeholder when no value is selected', () => {
      render(
        <Select>
          <SelectTrigger>
            <SelectValue placeholder="Select an option" />
          </SelectTrigger>
        </Select>
      );
      expect(screen.getByText('Select an option')).toBeInTheDocument();
    });

    it('renders selected value', () => {
      render(
        <Select value="option1">
          <SelectTrigger>
            <SelectValue>option1</SelectValue>
          </SelectTrigger>
        </Select>
      );
      expect(screen.getByText('option1')).toBeInTheDocument();
    });

    it('forwards additional props', () => {
      render(
        <Select>
          <SelectTrigger>
            <SelectValue
              placeholder="Select an option"
              data-testid="value"
              aria-label="Selected value"
            />
          </SelectTrigger>
        </Select>
      );

      const value = screen.getByTestId('value');
      expect(value).toHaveAttribute('aria-label', 'Selected value');
    });
  });

  describe('SelectContent', () => {
    it('renders with children', () => {
      render(
        <Select defaultOpen>
          <SelectTrigger>
            <SelectValue placeholder="Select an option" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="option1">Option 1</SelectItem>
          </SelectContent>
        </Select>
      );

      expect(screen.getByText('Option 1')).toBeInTheDocument();
    });

    it('forwards ref correctly', () => {
      const ref = React.createRef<HTMLDivElement>();
      render(
        <Select defaultOpen>
          <SelectTrigger>
            <SelectValue placeholder="Select an option" />
          </SelectTrigger>
          <SelectContent ref={ref}>
            <SelectItem value="option1">Option 1</SelectItem>
          </SelectContent>
        </Select>
      );

      expect(ref.current).toBeInstanceOf(HTMLDivElement);
    });

    it('applies custom className', () => {
      render(
        <Select defaultOpen>
          <SelectTrigger>
            <SelectValue placeholder="Select an option" />
          </SelectTrigger>
          <SelectContent className="custom-content">
            <SelectItem value="option1">Option 1</SelectItem>
          </SelectContent>
        </Select>
      );

      const content = screen.getByText('Option 1').closest('[role="listbox"]');
      expect(content).toHaveClass('custom-content');
    });

    it('forwards additional props', () => {
      render(
        <Select defaultOpen>
          <SelectTrigger>
            <SelectValue placeholder="Select an option" />
          </SelectTrigger>
          <SelectContent data-testid="content" aria-label="Select options">
            <SelectItem value="option1">Option 1</SelectItem>
          </SelectContent>
        </Select>
      );

      const content = screen.getByTestId('content');
      expect(content).toHaveAttribute('aria-label', 'Select options');
    });
  });

  describe('SelectLabel', () => {
    it('renders with children', () => {
      render(
        <Select defaultOpen>
          <SelectTrigger>
            <SelectValue placeholder="Select an option" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel>Group Label</SelectLabel>
              <SelectItem value="option1">Option 1</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
      );

      expect(screen.getByText('Group Label')).toBeInTheDocument();
    });

    it('forwards ref correctly', () => {
      const ref = React.createRef<HTMLDivElement>();
      render(
        <Select defaultOpen>
          <SelectTrigger>
            <SelectValue placeholder="Select an option" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel ref={ref}>Group Label</SelectLabel>
              <SelectItem value="option1">Option 1</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
      );

      expect(ref.current).toBeInstanceOf(HTMLDivElement);
    });

    it('applies custom className', () => {
      render(
        <Select defaultOpen>
          <SelectTrigger>
            <SelectValue placeholder="Select an option" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel className="custom-label">Group Label</SelectLabel>
              <SelectItem value="option1">Option 1</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
      );

      const label = screen.getByText('Group Label');
      expect(label).toHaveClass('custom-label');
    });

    it('forwards additional props', () => {
      render(
        <Select defaultOpen>
          <SelectTrigger>
            <SelectValue placeholder="Select an option" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel data-testid="label" aria-label="Group label">
                Group Label
              </SelectLabel>
              <SelectItem value="option1">Option 1</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
      );

      const label = screen.getByTestId('label');
      expect(label).toHaveAttribute('aria-label', 'Group label');
    });
  });

  describe('SelectItem', () => {
    it('renders with children', () => {
      render(
        <Select defaultOpen>
          <SelectTrigger>
            <SelectValue placeholder="Select an option" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="option1">Option 1</SelectItem>
          </SelectContent>
        </Select>
      );

      expect(screen.getByText('Option 1')).toBeInTheDocument();
    });

    it('forwards ref correctly', () => {
      const ref = React.createRef<HTMLDivElement>();
      render(
        <Select defaultOpen>
          <SelectTrigger>
            <SelectValue placeholder="Select an option" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem ref={ref} value="option1">
              Option 1
            </SelectItem>
          </SelectContent>
        </Select>
      );

      expect(ref.current).toBeInstanceOf(HTMLDivElement);
    });

    it('applies custom className', () => {
      render(
        <Select defaultOpen>
          <SelectTrigger>
            <SelectValue placeholder="Select an option" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem className="custom-item" value="option1">
              Option 1
            </SelectItem>
          </SelectContent>
        </Select>
      );

      const item = screen.getByText('Option 1');
      // Radix UI applies classes to the parent div, not the text span
      expect(item.closest('[role="option"]')).toHaveClass('custom-item');
    });

    it('forwards additional props', () => {
      render(
        <Select defaultOpen>
          <SelectTrigger>
            <SelectValue placeholder="Select an option" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem
              data-testid="item"
              aria-label="Option 1"
              value="option1"
            >
              Option 1
            </SelectItem>
          </SelectContent>
        </Select>
      );

      const item = screen.getByTestId('item');
      expect(item).toHaveAttribute('aria-label', 'Option 1');
    });

    it('handles disabled state correctly', () => {
      render(
        <Select defaultOpen>
          <SelectTrigger>
            <SelectValue placeholder="Select an option" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem disabled value="option1">
              Option 1
            </SelectItem>
          </SelectContent>
        </Select>
      );

      const item = screen.getByText('Option 1');
      // Radix UI uses data-disabled for disabled items
      expect(item.closest('[role="option"]')).toHaveAttribute('data-disabled');
    });
  });

  describe('SelectSeparator', () => {
    it('renders separator', () => {
      render(
        <Select defaultOpen>
          <SelectTrigger>
            <SelectValue placeholder="Select an option" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="option1">Option 1</SelectItem>
            <SelectSeparator />
            <SelectItem value="option2">Option 2</SelectItem>
          </SelectContent>
        </Select>
      );

      // The separator is rendered as a div with aria-hidden, so we check for its presence
      const separator = screen
        .getByText('Option 1')
        .closest('[role="listbox"]')
        ?.querySelector('[aria-hidden="true"]');
      expect(separator).toBeInTheDocument();
    });

    it('forwards ref correctly', () => {
      const ref = React.createRef<HTMLDivElement>();
      render(
        <Select defaultOpen>
          <SelectTrigger>
            <SelectValue placeholder="Select an option" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="option1">Option 1</SelectItem>
            <SelectSeparator ref={ref} />
            <SelectItem value="option2">Option 2</SelectItem>
          </SelectContent>
        </Select>
      );

      expect(ref.current).toBeInstanceOf(HTMLDivElement);
    });

    it('applies custom className', () => {
      render(
        <Select defaultOpen>
          <SelectTrigger>
            <SelectValue placeholder="Select an option" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="option1">Option 1</SelectItem>
            <SelectSeparator className="custom-separator" />
            <SelectItem value="option2">Option 2</SelectItem>
          </SelectContent>
        </Select>
      );

      const separator = screen
        .getByText('Option 1')
        .closest('[role="listbox"]')
        ?.querySelector('.custom-separator');
      expect(separator).toBeInTheDocument();
    });
  });

  describe('SelectGroup', () => {
    it('renders group with children', () => {
      render(
        <Select defaultOpen>
          <SelectTrigger>
            <SelectValue placeholder="Select an option" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel>Group 1</SelectLabel>
              <SelectItem value="option1">Option 1</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
      );

      expect(screen.getByText('Group 1')).toBeInTheDocument();
      expect(screen.getByText('Option 1')).toBeInTheDocument();
    });
  });

  describe('Select Composition', () => {
    it('renders a complete select with all components', () => {
      render(
        <Select defaultOpen>
          <SelectTrigger>
            <SelectValue placeholder="Select an option" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel>Fruits</SelectLabel>
              <SelectItem value="apple">Apple</SelectItem>
              <SelectItem value="banana">Banana</SelectItem>
            </SelectGroup>
            <SelectSeparator />
            <SelectGroup>
              <SelectLabel>Vegetables</SelectLabel>
              <SelectItem value="carrot">Carrot</SelectItem>
              <SelectItem value="lettuce">Lettuce</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
      );

      expect(screen.getByText('Fruits')).toBeInTheDocument();
      expect(screen.getByText('Apple')).toBeInTheDocument();
      expect(screen.getByText('Banana')).toBeInTheDocument();
      expect(screen.getByText('Vegetables')).toBeInTheDocument();
      expect(screen.getByText('Carrot')).toBeInTheDocument();
      expect(screen.getByText('Lettuce')).toBeInTheDocument();
    });

    it('maintains proper styling hierarchy', () => {
      render(
        <Select defaultOpen>
          <SelectTrigger>
            <SelectValue placeholder="Select an option" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="option1">Option 1</SelectItem>
          </SelectContent>
        </Select>
      );

      // When the select is open, the trigger is not accessible via combobox role
      // We can check the item styling instead
      const item = screen.getByText('Option 1');

      expect(item.closest('[role="option"]')).toHaveClass(
        'relative',
        'flex',
        'w-full'
      );
    });
  });
});
