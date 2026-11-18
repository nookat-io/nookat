export type ShellWords = { words: string[] } | { error: string };

const SAFE_WORD = /^[A-Za-z0-9_@%+=:,./-]+$/;
const ESCAPABLE_IN_DOUBLE_QUOTES = new Set(['"', '\\', '$', '`', '\n']);

export function splitShellWords(input: string): ShellWords {
  const words: string[] = [];
  let word = '';
  let inWord = false;
  let quote: "'" | '"' | null = null;

  for (let index = 0; index < input.length; index++) {
    const char = input[index];

    if (quote === "'") {
      if (char === "'") {
        quote = null;
      } else {
        word += char;
      }
      continue;
    }

    if (char === '\\') {
      const next = input[index + 1];
      if (next === undefined) {
        return { error: 'Remove the trailing backslash' };
      }
      const escapes = quote !== '"' || ESCAPABLE_IN_DOUBLE_QUOTES.has(next);
      word += escapes ? next : char + next;
      inWord = true;
      index++;
      continue;
    }

    if (quote === '"') {
      if (char === '"') {
        quote = null;
      } else {
        word += char;
      }
      continue;
    }

    if (char === "'" || char === '"') {
      quote = char;
      inWord = true;
    } else if (/\s/.test(char)) {
      if (inWord) {
        words.push(word);
        word = '';
        inWord = false;
      }
    } else {
      word += char;
      inWord = true;
    }
  }

  if (quote) {
    return { error: `Close the ${quote} quote` };
  }
  if (inWord) {
    words.push(word);
  }
  return { words };
}

export function shellQuote(word: string): string {
  if (SAFE_WORD.test(word)) {
    return word;
  }
  return `'${word.replace(/'/g, `'\\''`)}'`;
}
