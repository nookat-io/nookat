import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { TagSelector } from './tag-selector';

const TAGS = ['latest', 'lts', '3.12', '3.12-slim', '3.11'];

function PullFormTag({
  initialTag = '',
  suggestions = TAGS,
}: {
  initialTag?: string;
  suggestions?: string[];
}) {
  const [tag, setTag] = useState(initialTag);
  return (
    <>
      <TagSelector
        tag={tag}
        onTagChange={setTag}
        tagSuggestions={suggestions}
      />
      <button onClick={() => setTag('latest')}>pick image</button>
      <output>form tag: {tag}</output>
    </>
  );
}

const tagInput = () => screen.getByLabelText('Tag');
const optionNames = () =>
  screen.queryAllByRole('option').map(option => option.textContent);
const highlightedOption = () =>
  screen
    .queryAllByRole('option')
    .find(option => option.getAttribute('aria-selected') === 'true')
    ?.textContent ?? null;

describe('TagSelector', () => {
  it('lists every suggestion while the tag is blank', async () => {
    const user = userEvent.setup();
    render(<PullFormTag />);

    await user.click(tagInput());

    expect(optionNames()).toEqual(TAGS);
  });

  it('narrows suggestions to tags starting with what was typed, ignoring case', async () => {
    const user = userEvent.setup();
    render(<PullFormTag suggestions={['Latest', 'lts', '3.12']} />);

    await user.type(tagInput(), 'LA');

    expect(optionNames()).toEqual(['Latest']);
    expect(screen.getByText('form tag: LA')).toBeInTheDocument();
  });

  it('shows the tag the form sets from outside, such as the default after picking an image', async () => {
    const user = userEvent.setup();
    render(<PullFormTag initialTag="3.11" />);
    expect(tagInput()).toHaveValue('3.11');

    await user.click(screen.getByRole('button', { name: 'pick image' }));

    expect(tagInput()).toHaveValue('latest');
  });

  it('walks the suggestions with the arrow keys, wrapping at both ends', async () => {
    const user = userEvent.setup();
    render(<PullFormTag suggestions={['a1', 'a2', 'a3']} />);
    await user.click(tagInput());

    await user.keyboard('{ArrowDown}');
    expect(highlightedOption()).toBe('a1');
    await user.keyboard('{ArrowUp}');
    expect(highlightedOption()).toBe('a3');
    await user.keyboard('{ArrowDown}');
    expect(highlightedOption()).toBe('a1');
  });

  it('picks the highlighted suggestion with Enter and closes the list', async () => {
    const user = userEvent.setup();
    render(<PullFormTag />);
    await user.type(tagInput(), '3.1');

    await user.keyboard('{ArrowDown}{ArrowDown}{Enter}');

    expect(tagInput()).toHaveValue('3.12-slim');
    expect(screen.getByText('form tag: 3.12-slim')).toBeInTheDocument();
    expect(optionNames()).toEqual([]);
  });

  it('drops the highlight when typing changes the list, so Enter cannot pick a tag that moved', async () => {
    const user = userEvent.setup();
    render(<PullFormTag />);
    await user.click(tagInput());
    await user.keyboard('{ArrowDown}{ArrowDown}');
    expect(highlightedOption()).toBe('lts');

    await user.type(tagInput(), '3');

    expect(optionNames()).toEqual(['3.12', '3.12-slim', '3.11']);
    expect(highlightedOption()).toBeNull();
    await user.keyboard('{Enter}');
    expect(tagInput()).toHaveValue('3');
  });

  it('drops the highlight when new suggestions arrive for the image', async () => {
    const user = userEvent.setup();
    const { rerender } = render(<PullFormTag suggestions={['a1', 'a2']} />);
    await user.click(tagInput());
    await user.keyboard('{ArrowDown}');
    expect(highlightedOption()).toBe('a1');

    rerender(<PullFormTag suggestions={['b1', 'b2']} />);

    expect(optionNames()).toEqual(['b1', 'b2']);
    expect(highlightedOption()).toBeNull();
  });

  it('closes the list with Escape', async () => {
    const user = userEvent.setup();
    render(<PullFormTag />);
    await user.click(tagInput());
    expect(optionNames()).not.toEqual([]);

    await user.keyboard('{Escape}');

    expect(optionNames()).toEqual([]);
  });

  it('closes the list as soon as focus leaves the tag', async () => {
    const user = userEvent.setup();
    render(<PullFormTag />);
    await user.click(tagInput());
    expect(optionNames()).not.toEqual([]);

    await user.tab();

    expect(optionNames()).toEqual([]);
  });

  it('keeps focus on the tag while a suggestion is pressed', async () => {
    const user = userEvent.setup();
    render(<PullFormTag />);
    await user.click(tagInput());

    await user.pointer({
      keys: '[MouseLeft>]',
      target: screen.getByRole('option', { name: 'lts' }),
    });

    expect(tagInput()).toHaveFocus();
    expect(optionNames()).toEqual(TAGS);
  });

  it('picks a suggestion with the mouse', async () => {
    const user = userEvent.setup();
    render(<PullFormTag />);
    await user.click(tagInput());

    await user.click(screen.getByRole('option', { name: 'lts' }));

    expect(tagInput()).toHaveValue('lts');
  });
});
