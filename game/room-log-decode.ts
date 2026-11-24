import { decodePublicLog, type DecodedLogEntry, type DecodedPublicLog } from "./public-log-sequence";

function messageEvent(entry: string, index: number, decoded?: DecodedLogEntry) {
  if (!entry.startsWith("@event:")) return { type: "message" as const, id: `legacy-${index}-${entry}`, message: entry };
  try {
    if (decoded?.prefix === "@event:" && decoded.parsed === undefined) return null;
    const parsed = decoded?.prefix === "@event:" ? decoded.parsed : JSON.parse(entry.slice(7));
    return { type: "message" as const, ...parsed as { id: string; message: string } };
  } catch { return null; }
}

function timelineRecordFields(value: Record<string, unknown>, publicSequences: ReadonlyMap<string, number> | null) {
  const fields = { ...value };
  delete fields.botTargetPressure;
  delete fields.publicSequenceWatermark;
  delete fields.publicSequence;
  const sequence = typeof value.id === "string" ? publicSequences?.get(value.id) : undefined;
  return { ...fields, ...(sequence !== undefined ? { publicSequence: sequence } : {}) };
}

/**
 * Builds the existing viewer-specific timeline from one decoded room log.
 * The decoded entries carry both validation metadata and parsed values, so a
 * roomState request does not parse each structured record again for its
 * public-sequence check, timeline, or legacy log projection.
 */
export function roomLogTimeline(
  entries: readonly string[],
  viewerPlayerId?: string,
  decodedLog = decodePublicLog(entries),
) {
  const events: Array<Record<string, unknown>> = [];
  const publicSequences = decodedLog.publicSequences;
  for (let index = 0; index < entries.length; index++) {
    const entry = entries[index];
    const decoded = decodedLog.entries[index];
    if (entry.startsWith("@history:")) {
      try {
        const value = (decoded?.prefix === "@history:" ? decoded.parsed : JSON.parse(entry.slice(9))) as Record<string, unknown>;
        events.push({ type: "message", presentation: false, ...timelineRecordFields(value, publicSequences), appendOrder: index });
      } catch { /* Ignore malformed historical events. */ }
      continue;
    }
    if (entry.startsWith("@cards:")) {
      try {
        const value = (decoded?.prefix === "@cards:" ? decoded.parsed : JSON.parse(entry.slice(7))) as Record<string, unknown>;
        events.push({ type: "cards", ...timelineRecordFields(value, publicSequences), appendOrder: index });
      } catch { /* Ignore malformed grouped-card events. */ }
      continue;
    }
    if (!entry.startsWith("@card:")) {
      const event = messageEvent(entry, index, decoded);
      if (event) {
        const fields = timelineRecordFields(event, publicSequences);
        events.push({ ...fields, appendOrder: index });
      }
      continue;
    }
    try {
      const card = (decoded?.prefix === "@card:" ? decoded.parsed : JSON.parse(entry.slice(6))) as Record<string, unknown>;
      if (typeof card.privateToPlayerId === "string" && card.privateToPlayerId !== viewerPlayerId) continue;
      events.push({ type: "card", ...timelineRecordFields(card, publicSequences), appendOrder: index });
    } catch { /* Ignore malformed historical events. */ }
  }
  return events.filter((event) => {
    if (!event || typeof event.type !== "string") return false;
    if (event.type === "message") return typeof event.message === "string";
    if (event.type === "card") return Boolean(event.card && typeof event.card === "object" && typeof (event.card as { id?: unknown }).id === "string" && typeof (event.card as { kind?: unknown }).kind === "string");
    if (event.type === "cards") return Array.isArray(event.cards) && event.cards.length > 0 && event.cards.every((card) => Boolean(card && typeof card === "object" && typeof (card as { id?: unknown }).id === "string" && typeof (card as { kind?: unknown }).kind === "string"));
    return false;
  });
}

/** The legacy text projection shares the same decoded entries as the timeline. */
export function legacyLogMessages(decodedLog: DecodedPublicLog) {
  return decodedLog.entries.flatMap((decoded) => {
    const { entry, index } = decoded;
    if (entry.startsWith("@card:") || entry.startsWith("@cards:")) return [];
    if (entry.startsWith("@history:")) {
      try {
        const value = (decoded.prefix === "@history:" ? decoded.parsed : JSON.parse(entry.slice(9))) as { message: string };
        return [value.message];
      } catch { return []; }
    }
    const event = messageEvent(entry, index, decoded);
    return event ? [event.message] : [];
  });
}
