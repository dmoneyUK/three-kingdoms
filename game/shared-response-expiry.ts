import type { PublicSharedResponseWindow } from "./shared-response-presentation";

export type SharedResponseExpiryRead = PublicSharedResponseWindow | null | false;

/**
 * Performs one idempotent expiry-watcher attempt. A false read means the
 * room-poll single-flight/transport path did not provide an authoritative
 * snapshot; it never proves that the same public window has closed.
 */
export async function runSharedResponseExpiryAttempt(options: {
  expected: Pick<PublicSharedResponseWindow, "windowId" | "deadline">;
  readCurrentWindow: () => Promise<SharedResponseExpiryRead>;
  advanceTimers: () => Promise<unknown>;
  isCurrent: () => boolean;
  now: () => number;
  scheduleDeadline: (delayMs: number) => void;
  retry: () => void;
}): Promise<"cancelled" | "closed" | "scheduled" | "retry"> {
  const { expected, readCurrentWindow, advanceTimers, isCurrent, now, scheduleDeadline, retry } = options;
  const matchesExpected = (window: SharedResponseExpiryRead) => window !== false
    && window?.semantics === "PROVEN"
    && window.windowId === expected.windowId
    && window.deadline === expected.deadline;

  if (!isCurrent()) return "cancelled";
  const current = await readCurrentWindow();
  if (!isCurrent()) return "cancelled";
  if (current === false) {
    retry();
    return "retry";
  }
  if (!matchesExpected(current)) return "closed";

  const remaining = expected.deadline - now();
  if (remaining > 0) {
    scheduleDeadline(remaining);
    return "scheduled";
  }

  await advanceTimers();
  if (!isCurrent()) return "cancelled";
  const after = await readCurrentWindow();
  if (!isCurrent()) return "cancelled";
  if (after === false) {
    retry();
    return "retry";
  }
  if (!matchesExpected(after)) return "closed";

  // The server may still be settling/renewing its authoritative view. Retry
  // only while this exact public window remains current.
  retry();
  return "retry";
}
