export function usd(cents: number): string {
  return "$" + (cents / 100).toFixed(cents % 100 === 0 ? 0 : 2);
}

export function editionLabel(edition: number, size = 300): string {
  return `${String(edition).padStart(3, "0")} / ${size}`;
}
