const SKIP_ACTION_LABELS = new Set(["Skip", "Skipping…"]);

/** Applies the red Skip treatment only to an actual voluntary Skip control. */
export function gameplayDeclineButtonClassName(label: string): string {
  return SKIP_ACTION_LABELS.has(label)
    ? "end wtk-action-button wtk-skip-action"
    : "end";
}
