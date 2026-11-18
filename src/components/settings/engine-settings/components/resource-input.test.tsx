import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { ResourceInput } from './resource-input';

function ControlledResourceInput({ initial }: { initial: number }) {
  const [value, setValue] = useState(initial);
  return (
    <>
      <ResourceInput
        id="cpu"
        label="CPU Cores"
        value={value}
        min={1}
        max={12}
        onChange={setValue}
      />
      <output aria-label="committed">{value}</output>
    </>
  );
}

describe('ResourceInput', () => {
  it('lets the user clear the field and type a new value', async () => {
    const user = userEvent.setup();
    render(<ControlledResourceInput initial={8} />);
    const input = screen.getByLabelText('CPU Cores');

    await user.clear(input);
    await user.type(input, '4');

    expect(input).toHaveValue(4);
    expect(screen.getByLabelText('committed')).toHaveTextContent('4');
  });

  it('brings an out of range value back into range when the field loses focus', async () => {
    const user = userEvent.setup();
    render(<ControlledResourceInput initial={8} />);
    const input = screen.getByLabelText('CPU Cores');

    await user.clear(input);
    await user.type(input, '64');
    await user.tab();

    expect(input).toHaveValue(12);
    expect(screen.getByLabelText('committed')).toHaveTextContent('12');
  });

  it('restores the last value when the field is left empty', async () => {
    const user = userEvent.setup();
    render(<ControlledResourceInput initial={8} />);
    const input = screen.getByLabelText('CPU Cores');

    await user.clear(input);
    await user.tab();

    expect(input).toHaveValue(8);
  });
});
