export function damerauLevenshteinDistance(a: string, b: string): number {
  const source = [...a];
  const target = [...b];
  const unreachable = source.length + target.length;
  const lastRowContaining = new Map<string, number>();

  const distances = Array.from({ length: source.length + 2 }, () =>
    Array<number>(target.length + 2).fill(0)
  );
  distances[0][0] = unreachable;
  for (let row = 0; row <= source.length; row++) {
    distances[row + 1][0] = unreachable;
    distances[row + 1][1] = row;
  }
  for (let column = 0; column <= target.length; column++) {
    distances[0][column + 1] = unreachable;
    distances[1][column + 1] = column;
  }

  for (let row = 1; row <= source.length; row++) {
    let lastMatchingColumn = 0;
    for (let column = 1; column <= target.length; column++) {
      const swapRow = lastRowContaining.get(target[column - 1]) ?? 0;
      const swapColumn = lastMatchingColumn;
      const matches = source[row - 1] === target[column - 1];
      if (matches) {
        lastMatchingColumn = column;
      }

      const substitution = distances[row][column] + (matches ? 0 : 1);
      const insertion = distances[row + 1][column] + 1;
      const deletion = distances[row][column + 1] + 1;
      const transposition =
        distances[swapRow][swapColumn] +
        (row - swapRow - 1) +
        1 +
        (column - swapColumn - 1);

      distances[row + 1][column + 1] = Math.min(
        substitution,
        insertion,
        deletion,
        transposition
      );
    }
    lastRowContaining.set(source[row - 1], row);
  }

  return distances[source.length + 1][target.length + 1];
}
