type HorizontalRect = { left: number; right: number; width: number };

/** Equal gutters based on measured side-seat and stable countdown footprints. */
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

/** Reserve the CSS maximum timer footprint even before a countdown mounts. */
export function publicCorridorWidth(table: HTMLElement, cap = 340): number {
  const bounds = table.getBoundingClientRect();
  const sides = [...table.querySelectorAll<HTMLElement>('[data-side-column="left"], [data-side-column="right"]')]
    .filter((side) => getComputedStyle(side).visibility !== "hidden")
    .map((side) => side.getBoundingClientRect()).filter((rect) => rect.width > 0 && rect.height > 0);
  const safeZone = table.querySelector<HTMLElement>(":scope > .interaction-safe-zone");
  const cluster = safeZone?.querySelector<HTMLElement>(":scope > .stage-system-cluster");
  const safeRight = safeZone?.getBoundingClientRect().right ?? bounds.right;
  const inset = cluster ? Number.parseFloat(getComputedStyle(cluster).right) : 14;
  // Matches the 68px max-width of the response/event countdown CSS.
  const timerMaxWidth = 68;
  const right = safeRight - (Number.isFinite(inset) ? inset : 14);
  const reserved = { left: right - timerMaxWidth, right, width: timerMaxWidth };
  return measuredPublicCorridorWidth(bounds, sides, reserved, cap);
}
