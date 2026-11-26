import { publicH4WidthLimit } from "../game/public-h4-copy";
import type { PublicStageH4Geometry, PublicStageRect } from "../game/public-stage-layout";

type CardRect = { left: number; top: number; width: number; height: number };
const PARKED_CARD = { width: 48, height: 72 };
export function parkedCardSize() {
  if (typeof window === "undefined" || !window.matchMedia("(max-width: 700px)").matches) return PARKED_CARD;
  // Use the same actual miniature footprint as the local Equipment slots.
  // The first upper-seat reservation and the visible parked card must agree.
  const slot = document.querySelector<HTMLElement>(".local-player-dock .local-equipment-slot");
  const rect = slot?.getBoundingClientRect();
  if (rect && rect.width > 0 && rect.height > 0) return { width: rect.width, height: rect.height };
  const shortPhone = window.matchMedia("(max-width: 400px) and (max-height: 740px)").matches;
  const width = shortPhone ? 24 : Math.min(34, Math.max(28, window.innerWidth * 0.076));
  return { width, height: width * 1.5 };
}

type UpperHistorySlot = { actorId: string; rect: CardRect; element: HTMLElement | null };

/** Reserves the first public-history miniature slot below each upper seat. */
export function fixedUpperHistoryAnnouncementAnchor(table: HTMLElement): { top: number; slots: UpperHistorySlot[] } | null {
  const visibleSeats = [...table.querySelectorAll<HTMLElement>(".player-board > [data-player-anchor]")]
    .flatMap((element) => {
      const rect = element.getBoundingClientRect();
      const style = window.getComputedStyle(element);
      return style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0
        ? [{ id: element.dataset.playerAnchor ?? "", rect }]
        : [];
    })
    .filter((seat) => Boolean(seat.id));
  if (visibleSeats.length === 0) return null;
  const firstTop = Math.min(...visibleSeats.map(({ rect }) => rect.top));
  const upperSeats = visibleSeats.filter(({ rect }) => rect.top <= firstTop + 24);
  const cardsByActor = new Map<string, Array<{ element: HTMLElement; ordinal: number; order: number }>>();
  [...table.querySelectorAll<HTMLElement>("[data-public-card-journey-event-id][data-public-card-journey-phase]")]
    .forEach((element, order) => {
      const actorId = element.dataset.publicCardJourneyActorId ?? "";
      const phase = element.dataset.publicCardJourneyPhase;
      if (!actorId || !upperSeats.some((seat) => seat.id === actorId)
        || !(phase === "queued" || phase === "reveal" || phase === "move" || phase === "parked")) return;
      const rawOrdinal = Number(element.dataset.publicCardJourneyOrdinal);
      const cards = cardsByActor.get(actorId) ?? [];
      cards.push({ element, ordinal: Number.isFinite(rawOrdinal) ? rawOrdinal : Number.MAX_SAFE_INTEGER, order });
      cardsByActor.set(actorId, cards);
    });

  const readDataNumber = (element: HTMLElement, key: string): number | null => {
    const value = element.getAttribute(key);
    if (!value?.trim()) return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  };
  const slots = upperSeats.map(({ id, rect: seatRect }): UpperHistorySlot => {
    const firstCard = (cardsByActor.get(id) ?? []).sort((left, right) => left.ordinal - right.ordinal || left.order - right.order)[0]?.element;
    if (firstCard) {
      const phase = firstCard.dataset.publicCardJourneyPhase;
      const cardRect = firstCard.getBoundingClientRect();
      const style = window.getComputedStyle(firstCard);
      if (phase === "parked" && style.display !== "none" && style.visibility !== "hidden" && cardRect.width > 0 && cardRect.height > 0) {
        return { actorId: id, rect: { left: cardRect.left, top: cardRect.top, width: cardRect.width, height: cardRect.height }, element: firstCard };
      }
      const target = {
        left: readDataNumber(firstCard, "data-public-card-journey-target-left"),
        top: readDataNumber(firstCard, "data-public-card-journey-target-top"),
        width: readDataNumber(firstCard, "data-public-card-journey-target-width"),
        height: readDataNumber(firstCard, "data-public-card-journey-target-height"),
      };
      if (Object.values(target).every((value) => value !== null) && target.width! > 0 && target.height! > 0) {
        return { actorId: id, rect: target as CardRect, element: null };
      }
      const reserved = {
        left: readDataNumber(firstCard, "data-public-card-journey-author-reservation-left"),
        top: readDataNumber(firstCard, "data-public-card-journey-author-reservation-top"),
        width: readDataNumber(firstCard, "data-public-card-journey-author-reservation-width"),
        height: readDataNumber(firstCard, "data-public-card-journey-author-reservation-height"),
      };
      if (Object.values(reserved).every((value) => value !== null) && reserved.width! > 0 && reserved.height! > 0) {
        return { actorId: id, rect: reserved as CardRect, element: null };
      }
    }
    return {
      actorId: id,
      rect: {
        left: seatRect.left + seatRect.width / 2 - parkedCardSize().width / 2,
        top: seatRect.bottom + (window.matchMedia("(max-width: 700px)").matches ? 0 : 6),
        width: parkedCardSize().width,
        height: parkedCardSize().height,
      },
      element: null,
    };
  });
  return slots.length > 0
    ? { top: Math.max(...slots.map(({ rect }) => rect.top + rect.height)) + (window.matchMedia("(max-width: 700px)").matches ? 0 : 8), slots }
    : null;
}


const supportMetrics = new Map<string, { lineHeight: number; marginTop: number }>();
export type FixedBand = { left: number; top: number; right: number; bottom: number; width: number; height: number };
type FixedBandMeasurements = { h4Height: number; pacHeight: number; h4Width: number; pacWidth: number };
const fixedBandMeasurements = new WeakMap<HTMLElement, { key: string; value: FixedBandMeasurements }>();

function measureProbe(table: HTMLElement, element: HTMLElement): DOMRect {
  element.dataset.publicLayoutProbe = "true";
  element.setAttribute("aria-hidden", "true");
  element.inert = true;
  element.style.cssText += ";position:absolute!important;left:-10000px!important;top:0!important;visibility:hidden!important;opacity:0!important;pointer-events:none!important;transform:none!important;translate:none!important;max-height:none!important;height:auto!important;margin:0!important";
  table.append(element);
  const rect = element.getBoundingClientRect();
  element.remove();
  return rect;
}

/** Measures real copy at a canonical width without changing the React-owned live node. */
export function measurePublicElementAtWidth(
  table: HTMLElement,
  source: HTMLElement,
  width: number,
): { width: number; height: number } | null {
  if (!Number.isFinite(width) || width <= 0) return null;
  const probe = source.cloneNode(true) as HTMLElement;
  probe.setAttribute("aria-hidden", "true");
  probe.inert = true;
  probe.dataset.publicLayoutProbe = "true";
  probe.removeAttribute("id");
  probe.querySelectorAll<HTMLElement>("[id]").forEach((element) => element.removeAttribute("id"));
  probe.style.setProperty("width", `${width}px`, "important");
  probe.style.setProperty("height", "auto", "important");
  probe.style.setProperty("max-height", "none", "important");

  // Copy the immediate parent so motion/kind selectors keep their real text
  // styles; keep the wrapper inert and out of flow while measuring the child.
  const sourceParent = source.parentElement;
  if (sourceParent && sourceParent !== table) {
    const wrapper = sourceParent.cloneNode(false) as HTMLElement;
    wrapper.removeAttribute("id");
    wrapper.setAttribute("aria-hidden", "true");
    wrapper.inert = true;
    wrapper.dataset.publicLayoutProbe = "true";
    wrapper.style.cssText += ";position:absolute!important;left:-10000px!important;top:0!important;right:auto!important;bottom:auto!important;width:0!important;height:0!important;margin:0!important;padding:0!important;overflow:visible!important;transform:none!important;translate:none!important;visibility:hidden!important;opacity:0!important;pointer-events:none!important";
    probe.style.setProperty("position", "relative", "important");
    probe.style.setProperty("left", "0", "important");
    probe.style.setProperty("top", "0", "important");
    probe.style.setProperty("right", "auto", "important");
    probe.style.setProperty("bottom", "auto", "important");
    probe.style.setProperty("margin", "0", "important");
    probe.style.setProperty("transform", "none", "important");
    probe.style.setProperty("translate", "none", "important");
    wrapper.append(probe);
    table.append(wrapper);
    const rect = probe.getBoundingClientRect();
    wrapper.remove();
    return rect.width > 0 && rect.height > 0 ? { width: rect.width, height: rect.height } : null;
  }

  const rect = measureProbe(table, probe);
  return rect.width > 0 && rect.height > 0 ? { width: rect.width, height: rect.height } : null;
}

function fixedBandMetrics(table: HTMLElement): FixedBandMeasurements {
  const tableRect = table.getBoundingClientRect();
  const shell = table.closest<HTMLElement>(".game-shell");
  const playerBoard = table.querySelector<HTMLElement>(".player-board")
    ?? document.querySelector<HTMLElement>(".player-board");
  const h4Width = publicH4WidthLimit(window.innerWidth, tableRect.width - 16, tableRect.width - 16);
  const pacWidth = Math.max(1, Math.min(340, tableRect.width - 16));
  const key = [window.innerWidth, window.innerHeight, tableRect.left, tableRect.top, tableRect.width, tableRect.height,
    playerBoard?.dataset.playerCount ?? "", shell?.className ?? "", h4Width, pacWidth].join(":");
  const cached = fixedBandMeasurements.get(table);
  if (cached?.key === key) return cached.value;

  const h4 = document.createElement("div");
  h4.className = "public-card-display-journey-copy is-negation-narration";
  h4.style.width = `${h4Width}px`;
  const headline = document.createElement("b");
  headline.textContent = "A player used a committed public card effect against another player.";
  const support = document.createElement("span");
  support.className = "public-card-announcement-support public-negation-narration-support";
  support.textContent = "The server committed this public result.";
  h4.append(headline, support);
  const h4Rect = measureProbe(table, h4);

  const pac = document.createElement("div");
  pac.className = "public-activity-chip";
  pac.style.width = `${pacWidth}px`;
  const status = document.createElement("strong");
  status.textContent = "Waiting for Test Player 4 to use an available skill or complete the current response before the next decision.";
  const stage = document.createElement("small");
  stage.textContent = "Choose the action currently available for this public stage.";
  pac.append(status, stage);
  const pacRect = measureProbe(table, pac);
  const value = {
    h4Height: Math.max(1, h4Rect.height, publicH4ReservedHeight(h4)),
    pacHeight: Math.max(1, pacRect.height),
    h4Width,
    pacWidth,
  };
  fixedBandMeasurements.set(table, { key, value });
  return value;
}

/** Stable H4 layout reserve measured from supported styles, independent of current copy or visibility. */
export function fixedPublicH4Band(table: HTMLElement): FixedBand | null {
  const upper = fixedUpperHistoryAnnouncementAnchor(table);
  if (!upper) return null;
  const metrics = fixedBandMetrics(table);
  const tableRect = table.getBoundingClientRect();
  const left = tableRect.left + (tableRect.width - metrics.h4Width) / 2;
  return { left, top: upper.top, right: left + metrics.h4Width, bottom: upper.top + metrics.h4Height,
    width: metrics.h4Width, height: metrics.h4Height };
}

/** Real H4 paint bounds are tracked separately from the fixed layout reserve. */
export function measuredPublicH4PaintRect(announcement: HTMLElement | null | undefined): PublicStageRect | null {
  if (!announcement) return null;
  const rect = announcement.getBoundingClientRect();
  const style = window.getComputedStyle(announcement);
  if (style.display === "none" || style.visibility === "hidden" || Number(style.opacity) <= 0
    || rect.width <= 0 || rect.height <= 0) return null;
  return { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom };
}

/** Typed shared geometry: fixed placement reserve plus the independently measured H4 paint box. */
export function publicStageH4Geometry(reserve: FixedBand, paint: PublicStageRect): PublicStageH4Geometry {
  return {
    reserve: { left: reserve.left, top: reserve.top, right: reserve.right, bottom: reserve.bottom },
    paint,
    overlapPolicy: "PASSIVE_REVEAL_FOREGROUND",
  };
}

/** Stable PAC reserve ending at the real Console guidance top, whether PAC is mounted or not. */
export function fixedPublicActivityBand(
  table: HTMLElement,
  consoleGuidance: HTMLElement,
  activity?: HTMLElement | null,
  measuredHeight = 0,
): FixedBand | null {
  const metrics = fixedBandMetrics(table);
  const consoleRect = consoleGuidance.getBoundingClientRect();
  if (consoleRect.width <= 0 || consoleRect.height <= 0) return null;
  const rect = activity?.getBoundingClientRect();
  const style = activity ? window.getComputedStyle(activity) : null;
  const activeHeight = rect && rect.width > 0 && rect.height > 0
    && style?.display !== "none" && style?.visibility !== "hidden" && Number(style?.opacity) > 0 ? rect.height : 0;
  const height = Math.max(metrics.pacHeight, activeHeight, Number.isFinite(measuredHeight) ? measuredHeight : 0);
  const tableRect = table.getBoundingClientRect();
  const left = tableRect.left + (tableRect.width - metrics.pacWidth) / 2;
  return { left, top: consoleRect.top - height, right: left + metrics.pacWidth, bottom: consoleRect.top,
    width: metrics.pacWidth, height };
}

/** Reserve the measured worst supported H4: two headline lines and one support line. */
export function publicH4ReservedHeight(element: HTMLElement): number {
  const style = window.getComputedStyle(element);
  const text = element.querySelector<HTMLElement>("b") ?? element;
  const textStyle = window.getComputedStyle(text);
  const fontSize = Number.parseFloat(textStyle.fontSize) || 16;
  const lineHeight = Number.parseFloat(textStyle.lineHeight) || fontSize * 1.2;
  const vertical = [style.paddingTop, style.paddingBottom, style.borderTopWidth, style.borderBottomWidth]
    .reduce((sum, value) => sum + (Number.parseFloat(value) || 0), 0);
  const key = `${element.className}|${window.innerWidth}|${window.innerHeight}`;
  let metrics = supportMetrics.get(key);
  if (!metrics) {
    let support = element.querySelector<HTMLElement>(".public-negation-narration-support");
    const probe = support ? null : document.createElement("span");
    if (probe) {
      probe.className = "public-negation-narration-support";
      probe.setAttribute("aria-hidden", "true");
      probe.style.cssText = "position:absolute;visibility:hidden;pointer-events:none";
      element.append(probe);
      support = probe;
    }
    const supportStyle = window.getComputedStyle(support!);
    const supportFont = Number.parseFloat(supportStyle.fontSize) || fontSize;
    metrics = { lineHeight: Number.parseFloat(supportStyle.lineHeight) || supportFont * 1.2,
      marginTop: Number.parseFloat(supportStyle.marginTop) || 0 };
    probe?.remove();
    supportMetrics.set(key, metrics);
  }
  const gap = Number.parseFloat(style.rowGap) || 0;
  return Math.max(element.getBoundingClientRect().height, lineHeight * 2 + metrics.lineHeight + metrics.marginTop + gap + vertical);
}
