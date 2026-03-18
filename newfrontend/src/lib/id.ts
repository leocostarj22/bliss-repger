/** Simple unique ID generator (no external dep needed) */
let counter = 0;
export function v4Fallback(): string {
  counter++;
  return `block-${Date.now()}-${counter}-${Math.random().toString(36).slice(2, 8)}`;
}