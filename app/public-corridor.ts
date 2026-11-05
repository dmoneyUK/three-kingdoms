type HorizontalRect = { left: number; right: number; width: number };
type VerticalBand = { top: number; bottom: number };
type MeasuredRect = HorizontalRect & VerticalBand;
type PublicCorridorOptions = { reserveTimer?: boolean };

function intersectsBand(rect: VerticalBand, band: VerticalBand | undefined): boolean {
  return !band || rect.bottom > band.top && rect.top < band.bottom;
}

/** Equal gutters from seats and the reserved timer footprint that cross this caption band. */
export function measuredPublicCorridorWidth(
  bounds: HorizontalRect,
  sides: readonly MeasuredRect[],
  timer: MeasuredRect | null,
  cap = 340,
  band?: VerticalBand,
): number {
  const center = bounds.left + bounds.width / 2;
  let half = Math.max(0, bounds.width / 2 - 8);
  for (const rect of sides) {
    if (!intersectsBand(rect, band)) continue;
    if (rect.right <= center) half = Math.min(half, center - rect.right - 6);
    else if (rect.left >= center) half = Math.min(half, rect.left - center - 6);
  }
  if (timer && timer.width > 0 && intersectsBand(timer, band)) {
    if (timer.left >= center) half = Math.min(half, timer.left - center - 6);
    else if (timer.right <= center) half = Math.min(half, center - timer.right - 6);
    else half = 0;
  }
  return Math.max(1, Math.min(cap, Math.floor(half * 2)));
}

/** Reserve the CSS maximum timer footprint even before a countdown mounts. */
export function publicCorridorWidth(
  table: HTMLElement,
  band: VerticalBand,
  cap = 340,
  options: PublicCorridorOptions = {},
): number {
  const bounds = table.getBoundingClientRect();
  const sides = [...table.querySelectorAll<HTMLElement>('[data-side-column="left"], [data-side-column="right"]')]
    .filter((side) => getComputedStyle(side).visibility !== "hidden")
    .map((side) => {
      const rect = side.getBoundingClientRect();
      return { left: rect.left, right: rect.right, width: rect.width, top: rect.top, bottom: rect.bottom };
    }).filter((rect) => rect.width > 0 && rect.bottom > rect.top);
  const safeZone = table.querySelector<HTMLElement>(":scope > .interaction-safe-zone");
  if (options.reserveTimer === false) return measuredPublicCorridorWidth(bounds, sides, null, cap, band);
  const cluster = safeZone?.querySelector<HTMLElement>(":scope > .stage-system-cluster");
  const safeRight = safeZone?.getBoundingClientRect().right ?? bounds.right;
  const inset = cluster ? Number.parseFloat(getComputedStyle(cluster).right) : 14;
  // Matches the 68px max-width of the response/event countdown CSS.
  const timerMaxWidth = 68;
  const right = safeRight - (Number.isFinite(inset) ? inset : 14);
  const clusterRect = cluster?.getBoundingClientRect();
  const reserved = clusterRect && clusterRect.height > 0
    ? { left: right - timerMaxWidth, right, width: timerMaxWidth, top: clusterRect.top, bottom: clusterRect.bottom }
    : null;
  return measuredPublicCorridorWidth(bounds, sides, reserved, cap, band);
}
