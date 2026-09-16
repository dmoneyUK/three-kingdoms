/**
 * Project the public room timeline into the compact, informational message
 * history. The timeline is authoritative; this projection deliberately does
 * not retain private draw messages.
 */
export function latestPublicMessages(timeline, describe) {
  const byId = new Map();
  for (const event of timeline ?? []) {
    if (event?.drawPlayerId) continue;
    const message = typeof event?.message === "string" ? event.message : describe(event);
    if (!message || typeof event?.id !== "string") continue;
    byId.set(event.id, { id: event.id, message });
  }
  return [...byId.values()].slice(-5);
}
