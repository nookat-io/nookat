import { describe, expect, it } from 'vitest';
import packageJson from '../../package.json';

describe('tooling versions', () => {
  it('pins prettier to an exact stable release', () => {
    expect(packageJson.devDependencies.prettier).toMatch(/^\d+\.\d+\.\d+$/);
  });
});
