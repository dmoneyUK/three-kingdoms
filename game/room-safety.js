function isRecord(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function normalizeCard(value) {
  if (!isRecord(value) || typeof value.id !== "string" || typeof value.kind !== "string") return null;
  return value;
}

export function normalizeTimeline(value) {
  if (!Array.isArray(value)) return [];
  return value.map((entry) => {
    if (!isRecord(entry) || typeof entry.type !== "string") return null;
    if (entry.type === "message") return typeof entry.message === "string" ? entry : null;
    if (entry.type === "card") return normalizeCard(entry.card) ? entry : null;
    if (entry.type === "cards") {
      const cards = Array.isArray(entry.cards) ? entry.cards.map(normalizeCard).filter(Boolean) : [];
      return cards.length ? { ...entry, cards } : null;
    }
    return null;
  }).filter(Boolean);
}

export function normalizeRoomData(value) {
  if (!isRecord(value)) return null;
  const players = Array.isArray(value.players)
    ? value.players.filter((player) => isRecord(player) && typeof player.id === "string" && typeof player.name === "string")
    : [];
  const myHand = Array.isArray(value.myHand) ? value.myHand.map(normalizeCard).filter(Boolean) : [];
  return { ...value, players, myHand, timeline: normalizeTimeline(value.timeline) };
}
