/** Transport failures never imply a gameplay result or invalid session. */
export type RoomGetFailure = "temporary" | "unavailable-viewer" | "missing-room" | "invalid-session";
export function classifyRoomGetFailure(status: number | null, payload?: unknown): RoomGetFailure {
  const error = payload && typeof payload === "object" && !Array.isArray(payload)
    && "error" in payload && typeof payload.error === "string" ? payload.error : null;
  if (status === 404 && error === "Room not found.") return "missing-room";
  if (status === 403 && error === "That test viewer is not controlled by this session.") return "unavailable-viewer";
  if ((status === 401 || status === 403) && error === "Your player session is no longer valid.") return "invalid-session";
  return "temporary";
}
export class RoomGetError extends Error {
  constructor(public category: RoomGetFailure, public status: number | null = null) {
    super(category);
  }
}

/** One in-flight GET per identity; stale responses cannot change connection state. */
export class RoomPollRecovery {
  private activeKey = "";
  private pending = new Set<string>();
  stale = false;
  failures = 0;
  activate(key: string) { this.activeKey = key; }
  begin(key: string) {
    if (this.pending.has(key)) return false;
    this.pending.add(key);
    return true;
  }
  end(key: string) { this.pending.delete(key); }
  fail(key: string) {
    if (key !== this.activeKey) return false;
    this.stale = true;
    this.failures += 1;
    return true;
  }
  recover(key: string) {
    if (key !== this.activeKey) return false;
    this.stale = false;
    this.failures = 0;
    return true;
  }
  retryDelay(hidden: boolean) {
    const bounded = Math.min(8_000, 1_000 * 2 ** Math.min(3, Math.max(0, this.failures - 1)));
    return hidden ? Math.max(15_000, bounded) : bounded;
  }
  reset() { this.activeKey = ""; this.stale = false; this.failures = 0; }
}
