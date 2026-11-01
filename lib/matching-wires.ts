export interface WirePoint {
  x: number;
  y: number;
}

export interface MatchingEndpoint {
  side: "word" | "meaning";
  id: string;
}

export function chooseMatchingEndpoint(
  selected: MatchingEndpoint | null,
  clicked: MatchingEndpoint,
): { selected: MatchingEndpoint | null; matchedId: string | null } {
  if (!selected || selected.side === clicked.side)
    return { selected: clicked, matchedId: null };
  if (selected.id === clicked.id)
    return { selected: null, matchedId: clicked.id };
  return { selected, matchedId: null };
}

const wireColors = [
  "#e5484d",
  "#376ef5",
  "#e0a800",
  "#10a66e",
  "#a855f7",
  "#ed6b25",
  "#08a9bb",
  "#d946aa",
  "#667d2c",
  "#8454d9",
  "#bd5935",
  "#13819f",
] as const;

export function matchingWireColor(index: number): string {
  return wireColors[index % wireColors.length];
}

export function matchingWirePath(from: WirePoint, to: WirePoint): string {
  const bend = Math.abs(to.x - from.x) * 0.35;
  const direction = to.x >= from.x ? 1 : -1;
  return `M ${from.x} ${from.y} C ${from.x + bend * direction} ${from.y}, ${to.x - bend * direction} ${to.y}, ${to.x} ${to.y}`;
}
