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
