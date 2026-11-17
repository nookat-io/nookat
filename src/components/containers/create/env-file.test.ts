import { describe, expect, it } from 'vitest';
import { parseEnvFile } from './env-file';

describe('parseEnvFile', () => {
  it('reads KEY=value lines in order', () => {
    expect(parseEnvFile('MODE=dev\nPORT=8080')).toEqual({
      entries: [
        { key: 'MODE', value: 'dev' },
        { key: 'PORT', value: '8080' },
      ],
      skippedLines: [],
    });
  });

  it('ignores blank lines and comments and accepts Windows line endings', () => {
    expect(parseEnvFile('# settings\r\n\r\nMODE=dev\r\n  # indented')).toEqual({
      entries: [{ key: 'MODE', value: 'dev' }],
      skippedLines: [],
    });
  });

  it('drops a leading export and trims around the key and value', () => {
    expect(parseEnvFile('export  MODE = dev ')).toEqual({
      entries: [{ key: 'MODE', value: 'dev' }],
      skippedLines: [],
    });
  });

  it('keeps everything after the first equals sign', () => {
    expect(parseEnvFile('URL=postgres://u:p@db/app?ssl=true')).toEqual({
      entries: [{ key: 'URL', value: 'postgres://u:p@db/app?ssl=true' }],
      skippedLines: [],
    });
  });

  it('unwraps quoted values, unescaping only inside double quotes', () => {
    expect(
      parseEnvFile(
        [
          `GREETING="hello # not a comment"`,
          `MULTI="line one\\nline two \\"quoted\\""`,
          `RAW='keep \\n and # as is'`,
        ].join('\n')
      ).entries
    ).toEqual([
      { key: 'GREETING', value: 'hello # not a comment' },
      { key: 'MULTI', value: 'line one\nline two "quoted"' },
      { key: 'RAW', value: 'keep \\n and # as is' },
    ]);
  });

  it('strips an inline comment after an unquoted value', () => {
    expect(parseEnvFile('MODE=dev # local only\nCOLOR=#fff').entries).toEqual([
      { key: 'MODE', value: 'dev' },
      { key: 'COLOR', value: '#fff' },
    ]);
  });

  it('allows an empty value', () => {
    expect(parseEnvFile('EMPTY=').entries).toEqual([
      { key: 'EMPTY', value: '' },
    ]);
  });

  it('reports the line numbers it could not read', () => {
    expect(parseEnvFile('MODE=dev\njust words\n=value\nOK=1')).toEqual({
      entries: [
        { key: 'MODE', value: 'dev' },
        { key: 'OK', value: '1' },
      ],
      skippedLines: [2, 3],
    });
  });
});
