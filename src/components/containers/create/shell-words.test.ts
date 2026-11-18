import { describe, expect, it } from 'vitest';
import { shellQuote, splitShellWords } from './shell-words';

describe('splitShellWords', () => {
  it('splits on any run of whitespace', () => {
    expect(splitShellWords('  redis-server   --appendonly\tyes ')).toEqual({
      words: ['redis-server', '--appendonly', 'yes'],
    });
  });

  it('keeps quoted text together as one argument', () => {
    expect(splitShellWords(`sh -c "echo 'hi there' && sleep 1"`)).toEqual({
      words: ['sh', '-c', "echo 'hi there' && sleep 1"],
    });
    expect(splitShellWords(`printf '%s "x"'`)).toEqual({
      words: ['printf', '%s "x"'],
    });
  });

  it('joins adjacent quoted and bare parts into one word', () => {
    expect(splitShellWords(`--name="my app"x`)).toEqual({
      words: ['--name=my appx'],
    });
  });

  it('keeps empty quoted arguments', () => {
    expect(splitShellWords(`echo "" ''`)).toEqual({
      words: ['echo', '', ''],
    });
  });

  it('honours backslash escapes outside single quotes only', () => {
    expect(splitShellWords(String.raw`echo a\ b "c\"d" 'e\f'`)).toEqual({
      words: ['echo', 'a b', 'c"d', String.raw`e\f`],
    });
  });

  it('reports an unclosed quote instead of guessing', () => {
    expect(splitShellWords(`echo "unfinished`)).toEqual({
      error: 'Close the " quote',
    });
    expect(splitShellWords(`echo 'unfinished`)).toEqual({
      error: "Close the ' quote",
    });
  });

  it('reports a trailing backslash', () => {
    expect(splitShellWords('echo \\')).toEqual({
      error: 'Remove the trailing backslash',
    });
  });

  it('returns no words for blank input', () => {
    expect(splitShellWords('   ')).toEqual({ words: [] });
  });
});

describe('shellQuote', () => {
  it('leaves words made of safe characters bare', () => {
    expect(shellQuote('nginx:1.27')).toBe('nginx:1.27');
    expect(shellQuote('--memory=512m')).toBe('--memory=512m');
    expect(shellQuote('type=bind,source=/srv,target=/data')).toBe(
      'type=bind,source=/srv,target=/data'
    );
  });

  it('single-quotes anything a shell would interpret', () => {
    expect(shellQuote('hello world')).toBe("'hello world'");
    expect(shellQuote('$HOME')).toBe("'$HOME'");
    expect(shellQuote('~/site')).toBe("'~/site'");
    expect(shellQuote('[::1]:8080:80')).toBe("'[::1]:8080:80'");
    expect(shellQuote('a;b')).toBe("'a;b'");
  });

  it('escapes single quotes inside a quoted word', () => {
    expect(shellQuote("it's")).toBe(`'it'\\''s'`);
  });

  it('quotes the empty string so it survives as an argument', () => {
    expect(shellQuote('')).toBe("''");
  });

  it('round-trips through splitShellWords', () => {
    const words = ['sh', '-c', `echo "it's" $HOME; ls`, '', 'a\\b'];
    expect(splitShellWords(words.map(shellQuote).join(' '))).toEqual({
      words,
    });
  });
});
