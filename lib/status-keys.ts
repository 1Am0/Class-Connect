/**
 * Which status button a key moves focus to, or null for other keys. With
 * `vertical` off, up and down are left for moving between students.
 */
export function statusKeyTarget(
  key: string,
  index: number,
  count: number,
  vertical = true,
): number | null {
  if (key === "Home") return 0;
  if (key === "End") return count - 1;
  const step =
    key === "ArrowRight" || (vertical && key === "ArrowDown")
      ? 1
      : key === "ArrowLeft" || (vertical && key === "ArrowUp")
        ? -1
        : 0;
  return step ? (index + step + count) % count : null;
}
