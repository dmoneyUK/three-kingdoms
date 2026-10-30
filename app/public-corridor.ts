type HorizontalRect = { left: number; right: number; width: number };

/** Equal gutters based on the measured side-seat and countdown footprints. */
export function measuredPublicCorridorWidth(bounds: HorizontalRect, sides: readonly HorizontalRect[], timer: HorizontalRect | null, cap = 340): number {
  const center = bounds.left + bounds.width / 2;
  let half = Math.max(0, bounds.width / 2 - 8);
  for (const rect of sides) {
    if (rect.right <= center) half = Math.min(half, center - rect.right - 6);
    else if (rect.left >= center) half = Math.min(half, rect.left - center - 6);
  }
  if (timer && timer.width > 0 && timer.left >= center) half = Math.min(half, timer.left - center - 6);
  return Math.max(1, Math.min(cap, Math.floor(half * 2)));
}

/** Stable width derived from the actual side seats and timer, independent of copy. */
export function publicCorridorWidth(table: HTMLElement, cap = 340): number {
  const bounds = table.getBoundingClientRect();
  const sides = [...table.querySelectorAll<HTMLElement>('[data-side-column="left"], [data-side-column="right"]')]
    .filter((side) => getComputedStyle(side).visibility !== "hidden")
    .map((side) => side.getBoundingClientRect()).filter((rect) => rect.width > 0 && rect.height > 0);
  const timer = table.querySelector<HTMLElement>(".visible-countdown, .stage-system-cluster")?.getBoundingClientRect() ?? null;
  return measuredPublicCorridorWidth(bounds, sides, timer, cap);
}
