export type TargetPressureRecord = Readonly<{ turnEpoch: number; targetIds: readonly string[] }>;

export type TargetRanking = Readonly<{
  seed: string;
  recentPressure: ReadonlyMap<string, number>;
}>;

/** Read only server-stamped voluntary plays from the retained log. */
export function recentTargetPressure(logJson: string | null, turnEpoch: number): ReadonlyMap<string, number> {
  const pressure = new Map<string, number>();
  if (!logJson || !Number.isSafeInteger(turnEpoch) || turnEpoch < 0 || !logJson.includes('botTargetPressure')) return pressure;
  let entries: unknown;
  try { entries = JSON.parse(logJson); } catch { return pressure; }
  if (!Array.isArray(entries)) return pressure;
  const seen = new Set<string>();
  for (const entry of entries.slice(-200)) {
    if (typeof entry !== "string" || !entry.includes('"botTargetPressure":{')) continue;
    const prefix = entry.startsWith("@card:") ? 6 : entry.startsWith("@event:") || entry.startsWith("@cards:") ? 7 : 0;
    if (!prefix) continue;
    try {
      const event = JSON.parse(entry.slice(prefix));
      const marker = event?.botTargetPressure;
      if (typeof event?.id !== "string" || seen.has(event.id) || event.presentation === false || "privateToPlayerId" in event
        || !Number.isSafeInteger(marker?.turnEpoch) || marker.turnEpoch < Math.max(0, turnEpoch - 3) || marker.turnEpoch > turnEpoch
        || !Array.isArray(marker.targetIds)) continue;
      seen.add(event.id);
      for (const id of new Set(marker.targetIds)) {
        if (typeof id === "string" && id) pressure.set(id, (pressure.get(id) ?? 0) + 1);
      }
    } catch { /* Older or malformed entries cannot provide pressure evidence. */ }
  }
  return pressure;
}

/** Stable within a decision, independent of seat order and controller type. */
export function targetTieRank(seed: string, targetKey: string): number {
  let hash = 2166136261;
  const key = `${seed}|${targetKey}`;
  for (let index = 0; index < key.length; index++) hash = Math.imul(hash ^ key.charCodeAt(index), 16777619);
  // Mix the output so nearby target keys do not produce adjacent ranks.
  hash = Math.imul(hash ^ (hash >>> 16), 0x85ebca6b);
  hash = Math.imul(hash ^ (hash >>> 13), 0xc2b2ae35);
  return (hash ^ (hash >>> 16)) >>> 0;
}
