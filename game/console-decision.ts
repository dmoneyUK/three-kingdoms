/**
 * Pure display model for the local operation console.
 *
 * This module intentionally knows nothing about Room, Pending, public
 * presentation, callbacks, or card legality. GameRoom supplies facts that
 * were already authorized by CurrentAction and its existing local selectors.
 */

export type ConsoleDecisionKind =
  | "turn"
  | "response"
  | "rescue"
  | "trigger"
  | "active-skill"
  | "target"
  | "borrowed-sword"
  | "target-card"
  | "discard"
  | "judgement"
  | "duel"
  | "special"
  | "waiting"
  | "rest";

export type ConsolePrimaryCandidate = {
  id: string;
  label: string;
  enabled: boolean;
  priority: number;
};

export type ConsoleSelectionFact = {
  active: boolean;
  hasInput: boolean;
  count: number;
  min: number;
  max: number;
  summary: string;
};

export type ConsoleDecisionFacts = {
  kind: ConsoleDecisionKind;
  instruction: string;
  viewerIsDecisionActor: boolean;
  authoritativeDecision: boolean;
  busy: boolean;
  selection?: ConsoleSelectionFact;
  primaryCandidates?: readonly ConsolePrimaryCandidate[];
  localCancel?: { visible: boolean; enabled: boolean };
  authoritativeDecline?: { label: string; enabled: boolean };
  secondaryControls?: readonly string[];
};

export type ConsoleDecisionDisplay = {
  kind: ConsoleDecisionKind;
  instruction: string;
  selectionSummary: string;
  selectionCount: number | null;
  primary: { id: string; label: string; enabled: boolean } | null;
  localCancel: { visible: boolean; enabled: boolean };
  authoritativeDecline: { label: string; enabled: boolean } | null;
  secondaryControls: readonly string[];
  busy: boolean;
  controlsVisible: boolean;
  coherent: boolean;
};

function choosePrimary(candidates: readonly ConsolePrimaryCandidate[]) {
  const unique = candidates.filter((candidate, index, all) => all.findIndex((item) => item.id === candidate.id) === index);
  if (!unique.length) return { primary: null, coherent: true } as const;
  const highestPriority = Math.max(...unique.map((candidate) => candidate.priority));
  const highest = unique.filter((candidate) => candidate.priority === highestPriority);
  if (highest.length !== 1) return { primary: null, coherent: false } as const;
  const [candidate] = highest;
  return { primary: candidate, coherent: true } as const;
}

/**
 * Compose exactly one primary guidance/submit surface from proven facts.
 *
 * Priority is explicit so legacy booleans cannot win merely because their
 * JSX happens to render first. A tie between unrelated primaries fails closed.
 */
export function buildConsoleDecisionDisplay(facts: ConsoleDecisionFacts): ConsoleDecisionDisplay {
  const selection = facts.selection;
  const controlsVisible = facts.authoritativeDecision && facts.viewerIsDecisionActor;
  const selectionSummary = selection?.active ? selection.summary : "";
  const selectionCount = selection?.active ? selection.count : null;
  const chosen = choosePrimary(facts.primaryCandidates ?? []);
  const coherent = chosen.coherent && Boolean(facts.instruction.trim());
  const primary = controlsVisible && coherent && chosen.primary
    ? { id: chosen.primary.id, label: chosen.primary.label, enabled: chosen.primary.enabled && !facts.busy }
    : null;
  const localCancel = {
    visible: Boolean(controlsVisible && coherent && facts.localCancel?.visible),
    enabled: Boolean(controlsVisible && coherent && facts.localCancel?.visible && facts.localCancel.enabled && !facts.busy),
  };
  const authoritativeDecline = controlsVisible && coherent && facts.authoritativeDecline
    ? { label: facts.authoritativeDecline.label, enabled: facts.authoritativeDecline.enabled && !facts.busy }
    : null;
  return {
    kind: facts.kind,
    instruction: facts.instruction.trim(),
    selectionSummary,
    selectionCount,
    primary,
    localCancel,
    authoritativeDecline,
    secondaryControls: controlsVisible && coherent ? [...(facts.secondaryControls ?? [])] : [],
    busy: facts.busy,
    controlsVisible,
    coherent,
  };
}
