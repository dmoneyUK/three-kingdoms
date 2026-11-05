export type PublicResultObstacle = { left: number; top: number; right: number; bottom: number };
export type PublicResultPlacement = { centerX: number; centerY: number };
export type PublicResultLayout = {
  cardWidth: number;
  cardHeight: number;
  rows: number;
  columns: number;
  placements: readonly PublicResultPlacement[];
};

const CARD_HEIGHT_RATIO = 156 / 108;
const HORIZONTAL_GAP = 6;
const VERTICAL_GAP = 8;
const SAFE_INSET = 8;
const SAFE_GAP = 3;

function positions(start: number, end: number, step: number) {
  if (end < start) return [];
  const values: number[] = [];
  for (let value = start; value <= end; value += step) values.push(value);
  if (values.at(-1) !== end) values.push(end);
  return values;
}

function intersects(left: number, top: number, right: number, bottom: number, obstacle: PublicResultObstacle) {
  return left < obstacle.right + SAFE_GAP && right > obstacle.left - SAFE_GAP
    && top < obstacle.bottom + SAFE_GAP && bottom > obstacle.top - SAFE_GAP;
}

/**
 * Places committed result CardFaces inside a measured table rectangle. It keeps
 * 3–5 cards on one row, uses two rows for 6–10, and avoids measured public UI.
 * Returning null means there is no honest, non-overlapping phone-sized layout.
 */
export function layoutPublicResultCards(
  count: number,
  bounds: { width: number; height: number },
  obstacles: readonly PublicResultObstacle[] = [],
  options: { maxCardWidth?: number; minCardWidth?: number } = {},
): PublicResultLayout | null {
  if (!Number.isSafeInteger(count) || count < 1 || !Number.isFinite(bounds.width) || !Number.isFinite(bounds.height)
    || bounds.width <= SAFE_INSET * 2 || bounds.height <= SAFE_INSET * 2) return null;

  const columns = count <= 5 ? count : Math.min(5, Math.ceil(count / 2));
  const rows = Math.ceil(count / columns);
  const maxCardWidth = options.maxCardWidth ?? 108;
  const minCardWidth = options.minCardWidth ?? 40;
  const maxFitWidth = Math.min(maxCardWidth,
    (bounds.width - SAFE_INSET * 2 - HORIZONTAL_GAP * (columns - 1)) / columns,
    (bounds.height - SAFE_INSET * 2 - VERTICAL_GAP * (rows - 1)) / (rows * CARD_HEIGHT_RATIO));
  const startWidth = Math.floor(maxFitWidth);
  const xStep = 8;
  const yStep = 8;

  for (let cardWidth = startWidth; cardWidth >= minCardWidth; cardWidth -= 2) {
    const cardHeight = cardWidth * CARD_HEIGHT_RATIO;
    const groupWidth = columns * cardWidth + (columns - 1) * HORIZONTAL_GAP;
    const groupHeight = rows * cardHeight + (rows - 1) * VERTICAL_GAP;
    const maxLeft = bounds.width - SAFE_INSET - groupWidth;
    const maxTop = bounds.height - SAFE_INSET - groupHeight;
    const lefts = positions(SAFE_INSET, maxLeft, xStep);
    const tops = positions(SAFE_INSET, maxTop, yStep);
    let best: { left: number; top: number; score: number } | null = null;

    for (const top of tops) for (const left of lefts) {
      const right = left + groupWidth;
      const bottom = top + groupHeight;
      if (obstacles.some((obstacle) => intersects(left, top, right, bottom, obstacle))) continue;
      const centerX = left + groupWidth / 2;
      const centerY = top + groupHeight / 2;
      const score = Math.abs(centerX - bounds.width / 2) + Math.abs(centerY - bounds.height * .48) * .75;
      if (!best || score < best.score) best = { left, top, score };
    }

    if (!best) continue;
    const placements = Array.from({ length: count }, (_, index) => {
      const row = Math.floor(index / columns);
      const rowStart = row * columns;
      const rowCardCount = Math.min(columns, count - rowStart);
      const column = index - rowStart;
      const rowWidth = rowCardCount * cardWidth + (rowCardCount - 1) * HORIZONTAL_GAP;
      const rowLeft = best!.left + (groupWidth - rowWidth) / 2;
      return {
        centerX: rowLeft + column * (cardWidth + HORIZONTAL_GAP) + cardWidth / 2,
        centerY: best!.top + row * (cardHeight + VERTICAL_GAP) + cardHeight / 2,
      };
    });
    return { cardWidth, cardHeight, rows, columns, placements };
  }
  return null;
}
