// Small text helpers shared across pattern and insight composition.

export function joinWithAnd(items: string[]): string {
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(', ')}, and ${items[items.length - 1]}`;
}

export function countPhrase(n: number): string {
  if (n <= 0) return 'not yet';
  if (n === 1) return 'once';
  if (n === 2) return 'twice';
  return `${n} times`;
}
