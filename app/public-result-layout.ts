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

/**
 * Packs committed result CardFaces around one fixed, nominal table-local
 * centre. Responsive card size depends only on the measured board and group
 * count; passive component overlap never moves, hides, or rescales the group.
 */
export function layoutPublicResultCards(
  count: number,
  bounds: { width: number; height: number },
  preferredCenter: PublicResultPlacement,
  options: { maxCardWidth?: number; minCardWidth?: number } = {},
): PublicResultLayout | null {
  const maxCardWidth = options.maxCardWidth ?? 108;
  const minCardWidth = options.minCardWidth ?? 40;
  if (!Number.isSafeInteger(count) || count < 1 || !Number.isFinite(bounds.width) || !Number.isFinite(bounds.height)
    || bounds.width <= SAFE_INSET * 2 || bounds.height <= SAFE_INSET * 2
    || ![preferredCenter.centerX, preferredCenter.centerY, maxCardWidth, minCardWidth].every(Number.isFinite)
    || maxCardWidth <= 0 || minCardWidth <= 0 || minCardWidth > maxCardWidth) return null;

  const columns = count <= 5 ? count : Math.min(5, Math.ceil(count / 2));
  const rows = Math.ceil(count / columns);
  const boardFitWidth = Math.min(maxCardWidth,
    (bounds.width - SAFE_INSET * 2 - HORIZONTAL_GAP * (columns - 1)) / columns,
    (bounds.height - SAFE_INSET * 2 - VERTICAL_GAP * (rows - 1)) / (rows * CARD_HEIGHT_RATIO));
  const cardWidth = Math.floor(boardFitWidth);
  if (cardWidth < minCardWidth) return null;

  const cardHeight = cardWidth * CARD_HEIGHT_RATIO;
  const groupWidth = columns * cardWidth + (columns - 1) * HORIZONTAL_GAP;
  const groupHeight = rows * cardHeight + (rows - 1) * VERTICAL_GAP;
  const groupLeft = preferredCenter.centerX - groupWidth / 2;
  const groupTop = preferredCenter.centerY - groupHeight / 2;
  const placements = Array.from({ length: count }, (_, index) => {
    const row = Math.floor(index / columns);
    const rowStart = row * columns;
    const rowCardCount = Math.min(columns, count - rowStart);
    const column = index - rowStart;
    const rowWidth = rowCardCount * cardWidth + (rowCardCount - 1) * HORIZONTAL_GAP;
    const rowLeft = groupLeft + (groupWidth - rowWidth) / 2;
    return {
      centerX: rowLeft + column * (cardWidth + HORIZONTAL_GAP) + cardWidth / 2,
      centerY: groupTop + row * (cardHeight + VERTICAL_GAP) + cardHeight / 2,
    };
  });
  return { cardWidth, cardHeight, rows, columns, placements };
}
