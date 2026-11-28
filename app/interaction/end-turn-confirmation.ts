import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";

type EndTurnCurrentAction = {
  kind?: string | null;
  actorId?: string | null;
  legalActions?: readonly string[] | null;
} | null;

export type EndTurnConfirmationFacts = {
  code: string;
  meId: string;
  turnSeat: number | null;
  phase: string | null;
  actionRevision?: string;
  currentAction: EndTurnCurrentAction;
  isMyTurn: boolean;
  isMyAction: boolean;
};

export type EndTurnConfirmationSnapshot = Readonly<{
  scope: string;
  identity: string | null;
  submitting: boolean;
}>;

export type EndTurnConfirmationBeginResult =
  | Readonly<{ started: true; submissionId: number }>
  | Readonly<{ started: false; reason: string }>;

export type EndTurnConfirmationBeginInput = Readonly<{
  scope: string;
  isCurrent: boolean;
  authorizationReason: string | null;
  busy: boolean;
  actionStillAuthorized: boolean;
}>;

type FocusableButtonRef = { current: { isConnected: boolean; focus: (options: { preventScroll: boolean }) => void } | null };

export function endTurnConfirmationScopeFor(facts: EndTurnConfirmationFacts): string {
  return [
    facts.code,
    facts.meId,
    facts.turnSeat ?? "",
    facts.phase ?? "",
    facts.actionRevision ?? "",
    facts.currentAction?.kind ?? "",
    facts.currentAction?.actorId ?? "",
    facts.currentAction?.legalActions?.join(",") ?? "",
    facts.isMyTurn ? "my-turn" : "not-my-turn",
    facts.isMyAction ? "my-action" : "not-my-action",
  ].join("\u001f");
}

/** Synchronous controller for open, cancel, scope retirement and one submit. */
export class EndTurnConfirmationController {
  private state: EndTurnConfirmationSnapshot;
  private readonly listeners = new Set<() => void>();
  private nextSubmissionId = 0;
  private activeSubmissionId: number | null = null;

  constructor(scope: string) {
    this.state = Object.freeze({ scope, identity: null, submitting: false });
  }

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getSnapshot = (): EndTurnConfirmationSnapshot => this.state;

  get isSubmissionInFlight(): boolean {
    return this.activeSubmissionId !== null;
  }

  setScope(scope: string): boolean {
    if (scope === this.state.scope) return false;
    this.activeSubmissionId = null;
    this.update({ scope, identity: null, submitting: false });
    return true;
  }

  open(): boolean {
    if (this.isSubmissionInFlight || this.state.identity === this.state.scope) return false;
    this.update({ ...this.state, identity: this.state.scope });
    return true;
  }

  close(): boolean {
    if (this.isSubmissionInFlight) return false;
    if (this.state.identity === null && !this.state.submitting) return true;
    this.update({ ...this.state, identity: null, submitting: false });
    return true;
  }

  beginSubmission(input: EndTurnConfirmationBeginInput): EndTurnConfirmationBeginResult {
    const reason = this.isSubmissionInFlight ? "submission-already-in-flight"
      : !input.isCurrent || this.state.identity !== input.scope ? input.authorizationReason ?? "confirmation-scope-stale"
        : input.busy ? "gameplay-request-busy"
          : !input.actionStillAuthorized ? "end-turn-no-longer-authorized"
            : null;
    if (reason) return { started: false, reason };

    const submissionId = ++this.nextSubmissionId;
    this.activeSubmissionId = submissionId;
    this.update({ ...this.state, submitting: true });
    return { started: true, submissionId };
  }

  finishSubmission(submissionId: number, submitted: boolean): boolean {
    if (this.activeSubmissionId !== submissionId) return false;
    if (submitted) {
      this.update({ ...this.state, identity: null });
      return true;
    }
    this.activeSubmissionId = null;
    this.update({ ...this.state, submitting: false });
    return true;
  }

  private update(state: EndTurnConfirmationSnapshot): void {
    this.state = Object.freeze(state);
    for (const listener of this.listeners) listener();
  }
}

export function scheduleEndTurnFocusRestore(
  buttonRef: FocusableButtonRef,
  requestFrame: (callback: () => void) => unknown,
): void {
  requestFrame(() => {
    if (buttonRef.current?.isConnected) buttonRef.current.focus({ preventScroll: true });
  });
}

export function useEndTurnConfirmation(scope: string) {
  const [controller] = useState(() => new EndTurnConfirmationController(scope));
  const snapshot = useSyncExternalStore(controller.subscribe, controller.getSnapshot, controller.getSnapshot);
  const triggerButtonRef = useRef<HTMLButtonElement | null>(null);
  const cancelButtonRef = useRef<HTMLButtonElement | null>(null);
  const traceSignatureRef = useRef("");

  useEffect(() => { controller.setScope(scope); }, [controller, scope]);

  const open = useCallback(() => controller.open(), [controller]);
  const close = useCallback((restoreFocus = false) => {
    if (!controller.close()) return false;
    if (restoreFocus) scheduleEndTurnFocusRestore(triggerButtonRef, (callback) => window.requestAnimationFrame(callback));
    return true;
  }, [controller]);

  return {
    ...snapshot,
    isSubmissionInFlight: controller.isSubmissionInFlight,
    beginSubmission: (input: EndTurnConfirmationBeginInput) => controller.beginSubmission(input),
    finishSubmission: (submissionId: number, submitted: boolean) => controller.finishSubmission(submissionId, submitted),
    open,
    close,
    triggerButtonRef,
    cancelButtonRef,
    traceSignatureRef,
  };
}
