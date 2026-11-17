import { describe, expect, it } from 'vitest';
import { errorMessage } from './error-message';

describe('errorMessage', () => {
  it('returns the message a Tauri command rejects with, which arrives as a plain string', () => {
    expect(errorMessage('network web has active endpoints')).toBe(
      'network web has active endpoints'
    );
  });

  it('returns the message of a thrown Error', () => {
    expect(errorMessage(new Error('connection refused'))).toBe(
      'connection refused'
    );
  });

  it('returns the message of an error object that is not an Error instance', () => {
    expect(errorMessage({ message: 'permission denied' })).toBe(
      'permission denied'
    );
  });

  it.each([undefined, null, '', {}, { message: '' }, 42])(
    'falls back to the given description when %j carries no message',
    error => {
      expect(errorMessage(error, 'Failed to delete network')).toBe(
        'Failed to delete network'
      );
    }
  );

  it('falls back to a generic description when the caller gives none', () => {
    expect(errorMessage(undefined)).toBe('An unknown error occurred');
  });
});
