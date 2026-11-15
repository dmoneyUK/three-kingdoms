/** Render diagnostics contain structural categories only, never the exception's
 * raw message, URLs, source paths or viewer-private action/provider data. */
const safeFingerprint = (value: string) => {
  let hash = 2166136261;
  for (const character of value) hash = Math.imul(hash ^ character.charCodeAt(0), 16777619);
  return (hash >>> 0).toString(16).padStart(8, "0");
};
const token = (value: unknown) => typeof value === "string" && /^[A-Za-z_][A-Za-z_-]{0,39}$/.test(value) ? value : null;
export function gameRenderFailureDiagnostic(error: unknown, componentStack: string, room: {
  status?: unknown; phase?: unknown; actionRevision?: unknown; meId?: string;
  players?: readonly { id: string; seat: number }[];
  currentAction?: { kind?: unknown; requirement?: unknown } | null;
}, buildSha: string) {
  const name = error instanceof Error && ["Error", "TypeError", "RangeError", "ReferenceError", "SyntaxError", "DOMException"].includes(error.name) ? error.name : "Error";
  const components = componentStack.split("\n").flatMap((line) => {
    const match = line.trim().match(/^(?:at\s+)?([A-Za-z][A-Za-z0-9_]{0,79})(?:\s|@|\(|$)/);
    return match ? [match[1]] : [];
  }).slice(0, 12);
  const propertyMatch = error instanceof Error ? error.message.match(/reading ['"]([A-Za-z]+)['"]/) : null;
  const property = propertyMatch && ["map", "filter", "find", "length", "id", "kind", "some", "includes", "current", "target"].includes(propertyMatch[1]) ? propertyMatch[1] : null;
  return { category: "react-render", errorName: name, property, fingerprint: safeFingerprint([name, property, ...components].join(":")),
    components, phase: token(room.phase), status: token(room.status),
    currentActionKind: token(room.currentAction?.kind), requirement: token(room.currentAction?.requirement),
    revisionFingerprint: typeof room.actionRevision === "string" ? safeFingerprint(room.actionRevision) : null,
    viewerSeat: Array.isArray(room.players) ? room.players.find((player) => player && player.id === room.meId)?.seat ?? null : null, buildSha };
}
/** A timer-arm race only refreshes authority; a gameplay mutation is never retried. */
export async function resyncStaleResponseTimer(action: string, status: number, stale: boolean,
  refresh: () => Promise<unknown>): Promise<boolean> {
  if (action !== "start_response_timer" || status !== 409 || !stale) return false;
  await refresh();
  return true;
}
