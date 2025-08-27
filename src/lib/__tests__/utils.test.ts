import { cn } from '../utils';

describe('cn utility function', () => {
  it('should merge class names correctly', () => {
    const result = cn('px-4', 'py-2', 'bg-blue-500');
    expect(result).toBe('px-4 py-2 bg-blue-500');
  });

  it('should handle conditional classes', () => {
    const isActive = true;
    const isDisabled = false;

    const result = cn(
      'base-class',
      isActive && 'active-class',
      isDisabled && 'disabled-class'
    );

    expect(result).toBe('base-class active-class');
  });

  it('should handle undefined and null values', () => {
    const result = cn('base-class', undefined, null, 'valid-class');
    expect(result).toBe('base-class valid-class');
  });

  it('should handle empty strings', () => {
    const result = cn('base-class', '', 'valid-class');
    expect(result).toBe('base-class valid-class');
  });

  it('should handle arrays of classes', () => {
    const result = cn(['px-4', 'py-2'], 'bg-blue-500', [
      'text-white',
      'rounded',
    ]);
    expect(result).toBe('px-4 py-2 bg-blue-500 text-white rounded');
  });

  it('should handle objects with boolean values', () => {
    const result = cn('base-class', {
      'active-class': true,
      'disabled-class': false,
      'conditional-class': true,
    });

    expect(result).toBe('base-class active-class conditional-class');
  });

  it('should deduplicate conflicting Tailwind classes', () => {
    const result = cn('px-4', 'px-6', 'py-2', 'py-4');
    // Tailwind merge should keep the last conflicting class
    expect(result).toBe('px-6 py-4');
  });

  it('should handle complex nested structures', () => {
    const result = cn(
      'base-class',
      ['nested-array', 'with-classes'],
      {
        conditional: true,
        nested: {
          object: true,
        },
      },
      'final-class'
    );

    expect(result).toContain('base-class');
    expect(result).toContain('nested-array');
    expect(result).toContain('with-classes');
    expect(result).toContain('conditional');
    expect(result).toContain('final-class');
  });
});
