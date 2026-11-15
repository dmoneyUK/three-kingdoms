export type PublicSharedResponseWindow = {
  semantics: "PROVEN"; windowId: string; mode: "ENTOURAGE_DODGE" | "INFLUENCING_ATTACK" | "DYING_PEACH";
  requesterId: string; targetId: string; openedAt: number; deadline: number;
  stage: "COLLECTING" | "SETTLING";
};
/** Public projection whitelist: no participant list, intent, provider or count. */
export function normalizePublicSharedWindow(value: unknown): PublicSharedResponseWindow | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const v = value as Record<string, unknown>;
  if (v.semantics !== "PROVEN" || typeof v.windowId !== "string" || !v.windowId
    || !["ENTOURAGE_DODGE", "INFLUENCING_ATTACK", "DYING_PEACH"].includes(String(v.mode))
    || typeof v.requesterId !== "string" || !v.requesterId || typeof v.targetId !== "string" || !v.targetId
    || !Number.isSafeInteger(v.openedAt) || !Number.isSafeInteger(v.deadline)
    || Number(v.deadline) !== Number(v.openedAt) + 8000 || !["COLLECTING", "SETTLING"].includes(String(v.stage))) return null;
  return { semantics: "PROVEN", windowId: v.windowId, mode: v.mode as PublicSharedResponseWindow["mode"],
    requesterId: v.requesterId, targetId: v.targetId, openedAt: Number(v.openedAt), deadline: Number(v.deadline),
    stage: v.stage as PublicSharedResponseWindow["stage"] };
}
