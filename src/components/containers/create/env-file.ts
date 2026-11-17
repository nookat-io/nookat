import { KeyValue } from './create-container-types';

export interface EnvFileImport {
  entries: KeyValue[];
  skippedLines: number[];
}

const EXPORT_PREFIX = /^export\s+/;
const INLINE_COMMENT = /\s+#.*$/;
const DOUBLE_QUOTE_ESCAPE = /\\(["\\n])/g;

function unquote(rawValue: string): string {
  const value = rawValue.trim();
  const quote = value[0];
  const isQuoted =
    value.length >= 2 &&
    (quote === '"' || quote === "'") &&
    value.endsWith(quote);

  if (!isQuoted) {
    return value.replace(INLINE_COMMENT, '');
  }
  const inner = value.slice(1, -1);
  if (quote === "'") {
    return inner;
  }
  return inner.replace(DOUBLE_QUOTE_ESCAPE, (_, escaped: string) =>
    escaped === 'n' ? '\n' : escaped
  );
}

export function parseEnvFile(text: string): EnvFileImport {
  const entries: KeyValue[] = [];
  const skippedLines: number[] = [];

  text.split(/\r?\n/).forEach((rawLine, index) => {
    const line = rawLine.trim();
    if (line === '' || line.startsWith('#')) {
      return;
    }
    const assignment = line.replace(EXPORT_PREFIX, '');
    const separator = assignment.indexOf('=');
    const key = assignment.slice(0, separator).trim();
    if (separator === -1 || key === '') {
      skippedLines.push(index + 1);
      return;
    }
    entries.push({ key, value: unquote(assignment.slice(separator + 1)) });
  });

  return { entries, skippedLines };
}
