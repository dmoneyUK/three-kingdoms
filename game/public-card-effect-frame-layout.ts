export type PublicCardEffectFrameLayout = {
  frameWidth: number;
  frameHeight: number;
  headerHeight: number;
  cardWidth: number;
  cardHeight: number;
  columns: number;
  rows: number;
  gap: number;
  cardOffsetLeft: number;
  cardOffsetTop: number;
  gridWidth: number;
  gridHeight: number;
};

const BASE_CARD_WIDTH = 90;
const CARD_ASPECT_RATIO = 1.5;
const FRAME_MAX_WIDTH = 520;
const FRAME_GAP = 8;
const FRAME_PADDING = 8;
const FRAME_CARD_TOP = 43;
const FRAME_BOTTOM_PADDING = 12;
const FRAME_TITLE_TOP = 9;
const FRAME_TITLE_BOTTOM_GAP = 6;
const FRAME_COUNT_HEIGHT = 6;
const FRAME_COUNT_GAP = 2;

export type PublicCardEffectFrameTitleLayout = {
  title: string;
  titleParts?: { skillName: string; effectLabel?: string };
};

function wrappedTitleRows(text: string, contentWidth: number, maxCharacterWidth: number): number {
  const charactersPerLine = Math.max(1, Math.floor(contentWidth / maxCharacterWidth));
  return Math.max(1, Math.ceil(text.trim().length / charactersPerLine));
}

/**
 * Reserves title and material-count space without changing any physical card size.
 * The line estimate uses the narrowest actual frame width and the title's display
 * font bounds; it is presentation geometry only and never changes game semantics.
 */
export function publicCardEffectFrameHeaderHeight(
  materialCount: number,
  frameWidth: number,
  title?: PublicCardEffectFrameTitleLayout,
): number {
  if (!title) return FRAME_CARD_TOP;
  const contentWidth = Math.max(1, frameWidth - FRAME_PADDING * 2 - 2);
  const titleHeight = title.titleParts
    ? wrappedTitleRows(`${title.titleParts.skillName}${title.titleParts.effectLabel ? " ·" : ""}`, contentWidth, 10) * 16
      + (title.titleParts.effectLabel ? wrappedTitleRows(title.titleParts.effectLabel, contentWidth, 7.5) * 12 : 0)
    : wrappedTitleRows(title.title, contentWidth, 10) * 16;
  const countHeight = materialCount > 1 ? FRAME_COUNT_GAP + FRAME_COUNT_HEIGHT : 0;
  return Math.max(FRAME_CARD_TOP,
    Math.ceil(FRAME_TITLE_TOP + titleHeight + countHeight + FRAME_TITLE_BOTTOM_GAP));
}

/**
 * Calculates a contained mobile-first public card group. A one-card frame keeps
 * the previously accepted 168×190 Lust geometry at ordinary phone widths.
 */
export function publicCardEffectFrameLayout(
  materialCount: number,
  viewportWidth: number,
  viewportHeight: number,
  title?: PublicCardEffectFrameTitleLayout,
): PublicCardEffectFrameLayout {
  const count = Number.isFinite(materialCount) ? Math.max(1, Math.floor(materialCount)) : 1;
  const safeViewportWidth = Number.isFinite(viewportWidth) ? Math.max(1, viewportWidth) : BASE_CARD_WIDTH + 16;
  const safeViewportHeight = Number.isFinite(viewportHeight) ? Math.max(1, viewportHeight) : 700;
  const maxFrameWidth = Math.max(1, Math.min(FRAME_MAX_WIDTH, safeViewportWidth - 16));
  const availableGridWidth = Math.max(1, maxFrameWidth - FRAME_PADDING * 2);

  if (count === 1) {
    const frameWidth = Math.min(168, maxFrameWidth);
    const headerHeight = publicCardEffectFrameHeaderHeight(count, frameWidth, title);
    const cardWidth = Math.min(BASE_CARD_WIDTH, Math.max(1, frameWidth - FRAME_PADDING * 2));
    const cardHeight = cardWidth * CARD_ASPECT_RATIO;
    const gridWidth = cardWidth;
    const gridHeight = cardHeight;
    return {
      frameWidth,
      frameHeight: headerHeight + gridHeight + FRAME_BOTTOM_PADDING,
      headerHeight,
      cardWidth,
      cardHeight,
      columns: 1,
      rows: 1,
      gap: FRAME_GAP,
      cardOffsetLeft: (frameWidth - gridWidth) / 2,
      cardOffsetTop: headerHeight,
      gridWidth,
      gridHeight,
    };
  }

  const maxFrameHeight = Math.max(160, Math.min(480, safeViewportHeight - 220));
  const availableGridHeight = Math.max(1, maxFrameHeight - FRAME_CARD_TOP - FRAME_BOTTOM_PADDING);
  let best: PublicCardEffectFrameLayout | null = null;
  for (let columns = 1; columns <= count; columns += 1) {
    const rows = Math.ceil(count / columns);
    const widthBound = (availableGridWidth - FRAME_GAP * (columns - 1)) / columns;
    const heightBound = (availableGridHeight - FRAME_GAP * (rows - 1)) / rows / CARD_ASPECT_RATIO;
    const cardWidth = Math.min(BASE_CARD_WIDTH, widthBound, heightBound);
    if (!Number.isFinite(cardWidth) || cardWidth <= 0) continue;
    const cardHeight = cardWidth * CARD_ASPECT_RATIO;
    const gridWidth = columns * cardWidth + FRAME_GAP * (columns - 1);
    const gridHeight = rows * cardHeight + FRAME_GAP * (rows - 1);
    const frameWidth = gridWidth + FRAME_PADDING * 2;
    const headerHeight = publicCardEffectFrameHeaderHeight(count, frameWidth, title);
    const frameHeight = headerHeight + gridHeight + FRAME_BOTTOM_PADDING;
    const candidate: PublicCardEffectFrameLayout = {
      frameWidth,
      frameHeight,
      headerHeight,
      cardWidth,
      cardHeight,
      columns,
      rows,
      gap: FRAME_GAP,
      cardOffsetLeft: (frameWidth - gridWidth) / 2,
      cardOffsetTop: headerHeight,
      gridWidth,
      gridHeight,
    };
    if (!best || candidate.cardWidth > best.cardWidth
      || candidate.cardWidth === best.cardWidth && candidate.columns > best.columns) best = candidate;
  }

  const fallbackHeaderHeight = publicCardEffectFrameHeaderHeight(count, maxFrameWidth, title);
  return best ?? {
    frameWidth: maxFrameWidth,
    frameHeight: fallbackHeaderHeight + 1 + FRAME_BOTTOM_PADDING,
    headerHeight: fallbackHeaderHeight,
    cardWidth: 1,
    cardHeight: CARD_ASPECT_RATIO,
    columns: 1,
    rows: count,
    gap: FRAME_GAP,
    cardOffsetLeft: (maxFrameWidth - 1) / 2,
    cardOffsetTop: fallbackHeaderHeight,
    gridWidth: 1,
    gridHeight: count * CARD_ASPECT_RATIO + FRAME_GAP * (count - 1),
  };
}
