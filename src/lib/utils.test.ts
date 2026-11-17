import { describe, expect, it } from 'vitest';
import { cn } from './utils';

describe('cn', () => {
  it('joins classes and drops falsy values', () => {
    const hidden = false;
    expect(cn('flex', hidden && 'hidden', undefined, null, 'gap-2')).toBe(
      'flex gap-2'
    );
    expect(cn({ 'cursor-pointer': true, 'opacity-50': false })).toBe(
      'cursor-pointer'
    );
  });

  it('lets a later utility override a conflicting earlier one', () => {
    expect(cn('px-2 py-1', 'px-4')).toBe('py-1 px-4');
    expect(cn('bg-background', 'bg-primary')).toBe('bg-primary');
  });

  it('knows the Tailwind v4 class names', () => {
    expect(cn('shadow-xs', 'shadow-lg')).toBe('shadow-lg');
    expect(cn('outline-hidden', 'outline-dashed')).toBe('outline-dashed');
    expect(cn('rounded-xs', 'rounded-md')).toBe('rounded-md');
  });

  it('merges Tailwind v4 important utilities, written with a trailing !', () => {
    expect(cn('bg-muted!', 'bg-primary!')).toBe('bg-primary!');
    expect(cn('text-foreground!', 'p-2')).toBe('text-foreground! p-2');
  });
});
