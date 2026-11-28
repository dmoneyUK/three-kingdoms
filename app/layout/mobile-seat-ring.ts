export type MobileSeatRingMetrics = {
  topCapacity: number;
  boardWidth: number;
  boardTopInset: number;
  seatWidth: number;
  seatHeight: number;
  gap: number;
  leftInset: number;
  topStep: number;
};

export const EMPTY_MOBILE_SEAT_RING_METRICS: MobileSeatRingMetrics = {
  topCapacity: 0,
  boardWidth: 0,
  boardTopInset: 0,
  seatWidth: 0,
  seatHeight: 0,
  gap: 0,
  leftInset: 0,
  topStep: 0,
};

export type MobileSeatRingMetricsInput = {
  totalPlayers: number;
  viewportWidth: number;
  boardWidth: number;
  boardTop: number;
  tableTop: number;
  seatHeight: number;
  rowGap: string;
  borderLeftWidth: string;
  borderRightWidth: string;
  paddingLeft: string;
  paddingRight: string;
};

export type MobileSeatRingTopology = {
  topCapacity: number;
  renderedTopCount: number;
  sideSeatCount: number;
  sideRowCount: number;
};

export function isMobileSeatRingEnabled(isPhoneViewport: boolean, totalPlayers: number): boolean {
  return isPhoneViewport && Number.isInteger(totalPlayers) && totalPlayers >= 5 && totalPlayers <= 10;
}

export function mobileSeatRingTopology(
  totalPlayers: number,
  topCapacity: number,
  enabled: boolean,
): MobileSeatRingTopology {
  if (!enabled || !Number.isInteger(totalPlayers) || totalPlayers < 1) {
    return { topCapacity: 0, renderedTopCount: 0, sideSeatCount: 0, sideRowCount: 0 };
  }
  const opponentCount = totalPlayers - 1;
  const safeCapacity = Number.isFinite(topCapacity) ? Math.max(0, Math.floor(topCapacity)) : 0;
  const legacyTopLimit = totalPlayers === 7 ? 4 : totalPlayers === 8 ? 5 : opponentCount;
  const renderedTopCount = Math.min(opponentCount, safeCapacity, legacyTopLimit);
  const sideSeatCount = Math.max(0, opponentCount - renderedTopCount);
  return {
    topCapacity: safeCapacity,
    renderedTopCount,
    sideSeatCount,
    sideRowCount: Math.ceil(sideSeatCount / 2),
  };
}

const parsedOrZero = (value: string) => {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const quarterPixel = (value: number) => Math.round(value * 4) / 4;

export function calculateMobileSeatRingMetrics(input: MobileSeatRingMetricsInput): MobileSeatRingMetrics | null {
  const {
    totalPlayers, viewportWidth, boardWidth, boardTop, tableTop, seatHeight,
    rowGap, borderLeftWidth, borderRightWidth, paddingLeft, paddingRight,
  } = input;
  if (!Number.isInteger(totalPlayers) || totalPlayers < 5 || totalPlayers > 10
    || !Number.isFinite(viewportWidth) || viewportWidth <= 0
    || !Number.isFinite(boardWidth) || boardWidth <= 0
    || !Number.isFinite(boardTop) || !Number.isFinite(tableTop)
    || !Number.isFinite(seatHeight) || seatHeight <= 0) return null;

  const gap = Math.min(12, Math.max(4, parsedOrZero(rowGap) || 4));
  const borderLeft = parsedOrZero(borderLeftWidth);
  const borderRight = parsedOrZero(borderRightWidth);
  const leftPadding = parsedOrZero(paddingLeft);
  const rightPadding = parsedOrZero(paddingRight);
  const horizontalBoxSpace = borderLeft + borderRight + leftPadding + rightPadding;
  const usableTopWidth = Math.max(0, boardWidth - horizontalBoxSpace);
  const minSafeSeatWidth = Math.max(56, Math.min(74, viewportWidth * 0.155));
  if (usableTopWidth <= 0) return null;

  const opponentCount = totalPlayers - 1;
  const topCapacity = Math.max(0, Math.min(opponentCount,
    Math.floor((usableTopWidth + gap) / (minSafeSeatWidth + gap))));
  const topCount = Math.min(opponentCount,
    topCapacity,
    totalPlayers === 7 ? 4 : totalPlayers === 8 ? 5 : opponentCount);
  const maxTopSeatWidth = Math.min(112, Math.max(88, viewportWidth * 0.25));
  const referenceTopCount = totalPlayers >= 5 && totalPlayers <= 8 ? 5 : Math.max(1, topCount);
  const seatWidth = Math.min(maxTopSeatWidth, Math.max(minSafeSeatWidth,
    (usableTopWidth - gap * (referenceTopCount - 1)) / referenceTopCount));
  const leftInset = leftPadding + (topCount === 1 ? (usableTopWidth - seatWidth) / 2 : 0);
  const topStep = topCount > 1 ? (usableTopWidth - seatWidth) / (topCount - 1) : 0;

  return {
    topCapacity,
    boardWidth: quarterPixel(boardWidth),
    boardTopInset: quarterPixel(Math.max(0, boardTop - tableTop)),
    seatWidth: quarterPixel(seatWidth),
    seatHeight: quarterPixel(seatHeight),
    gap: quarterPixel(gap),
    leftInset: quarterPixel(leftInset),
    topStep: quarterPixel(topStep),
  };
}

export function sameMobileSeatRingMetrics(left: MobileSeatRingMetrics, right: MobileSeatRingMetrics): boolean {
  return Object.keys(EMPTY_MOBILE_SEAT_RING_METRICS).every((key) =>
    left[key as keyof MobileSeatRingMetrics] === right[key as keyof MobileSeatRingMetrics]);
}

export type MobileSeatRingResizeObserver = {
  observe(target: object): void;
  disconnect(): void;
};

export type MobileSeatRingMeasurementRuntime = {
  createResizeObserver(callback: () => void): MobileSeatRingResizeObserver | null;
  requestAnimationFrame(callback: () => void): number;
  cancelAnimationFrame(frame: number): void;
  addResizeListener(listener: () => void): void;
  removeResizeListener(listener: () => void): void;
  viewportWidth(): number;
  getComputedStyle(element: HTMLElement): Pick<CSSStyleDeclaration,
    "rowGap" | "borderLeftWidth" | "borderRightWidth" | "paddingLeft" | "paddingRight">;
};

const browserMeasurementRuntime: MobileSeatRingMeasurementRuntime = {
  createResizeObserver: (callback) => typeof ResizeObserver === "undefined"
    ? null
    : new ResizeObserver(() => callback()),
  requestAnimationFrame: (callback) => window.requestAnimationFrame(callback),
  cancelAnimationFrame: (frame) => window.cancelAnimationFrame(frame),
  addResizeListener: (listener) => window.addEventListener("resize", listener),
  removeResizeListener: (listener) => window.removeEventListener("resize", listener),
  viewportWidth: () => window.innerWidth,
  getComputedStyle: (element) => window.getComputedStyle(element),
};

export function subscribeMobileSeatRingMeasurements(input: {
  board: HTMLElement;
  totalPlayers: number;
  onMetrics: (metrics: MobileSeatRingMetrics) => void;
}, runtime: MobileSeatRingMeasurementRuntime = browserMeasurementRuntime): () => void {
  const { board, totalPlayers, onMetrics } = input;
  const firstSeat = board.querySelector<HTMLElement>(".opponent-player-card");
  let frame: number | null = null;
  let active = true;

  const measure = () => {
    if (!active) return;
    const seat = board.querySelector<HTMLElement>(".opponent-player-card") ?? firstSeat;
    const table = board.closest<HTMLElement>(".play-table");
    if (!seat || !table) return;
    const boardRect = board.getBoundingClientRect();
    const seatRect = seat.getBoundingClientRect();
    const style = runtime.getComputedStyle(board);
    const metrics = calculateMobileSeatRingMetrics({
      totalPlayers,
      viewportWidth: runtime.viewportWidth(),
      boardWidth: boardRect.width,
      boardTop: boardRect.top,
      tableTop: table.getBoundingClientRect().top,
      seatHeight: seatRect.height,
      rowGap: style.rowGap,
      borderLeftWidth: style.borderLeftWidth,
      borderRightWidth: style.borderRightWidth,
      paddingLeft: style.paddingLeft,
      paddingRight: style.paddingRight,
    });
    if (metrics) onMetrics(metrics);
  };

  const schedule = () => {
    if (!active || frame !== null) return;
    frame = runtime.requestAnimationFrame(() => {
      frame = null;
      measure();
    });
  };

  measure();
  const observer = runtime.createResizeObserver(schedule);
  observer?.observe(board);
  if (firstSeat) observer?.observe(firstSeat);
  runtime.addResizeListener(schedule);

  return () => {
    if (!active) return;
    active = false;
    if (frame !== null) runtime.cancelAnimationFrame(frame);
    frame = null;
    observer?.disconnect();
    runtime.removeResizeListener(schedule);
  };
}
