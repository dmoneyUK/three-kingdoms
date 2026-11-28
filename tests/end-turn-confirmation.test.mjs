import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { isOrdinaryTurnActionAuthorized } from "../game/ordinary-turn-action.ts";
import {
  EndTurnConfirmationController,
  endTurnConfirmationScopeFor,
  scheduleEndTurnFocusRestore,
} from "../app/interaction/end-turn-confirmation.ts";

function facts(overrides = {}) {
  return {
    code: "ABCDE",
    meId: "viewer-1",
    turnSeat: 1,
    phase: "play",
    actionRevision: "revision-1",
    currentAction: { kind: "turn", actorId: "viewer-1", legalActions: ["play_card", "end_turn"] },
    isMyTurn: true,
    isMyAction: true,
    ...overrides,
  };
}

function validSubmission(controller, scope, overrides = {}) {
  return controller.beginSubmission({
    scope,
    isCurrent: true,
    authorizationReason: null,
    busy: false,
    actionStillAuthorized: true,
    ...overrides,
  });
}

test("end-turn confirmation is scoped, blocks double submit and resets on CurrentAction changes", () => {
  const scope = endTurnConfirmationScopeFor(facts());
  const controller = new EndTurnConfirmationController(scope);
  assert.equal(controller.open(), true);
  const submission = validSubmission(controller, scope);
  assert.equal(submission.started, true);
  assert.equal(controller.getSnapshot().submitting, true);
  assert.deepEqual(validSubmission(controller, scope), { started: false, reason: "submission-already-in-flight" });
  assert.equal(controller.close(), false, "cancel cannot close while submission is in flight");

  const changedScope = endTurnConfirmationScopeFor(facts({
    actionRevision: "revision-2",
    currentAction: { kind: "response", actorId: "viewer-2", legalActions: ["respond"] },
    isMyAction: false,
  }));
  assert.notEqual(changedScope, scope);
  assert.equal(controller.setScope(changedScope), true);
  assert.deepEqual(controller.getSnapshot(), { scope: changedScope, identity: null, submitting: false });
  assert.equal(controller.finishSubmission(submission.submissionId, true), false, "a late result cannot alter the new decision scope");
});

test("409 keeps confirmation retryable, while rejoin retires the old confirmation", () => {
  const firstScope = endTurnConfirmationScopeFor(facts());
  const controller = new EndTurnConfirmationController(firstScope);
  controller.open();
  const first = validSubmission(controller, firstScope);
  assert.equal(controller.finishSubmission(first.submissionId, false), true, "a 409/error response leaves the dialog open");
  assert.equal(controller.getSnapshot().identity, firstScope);
  assert.equal(controller.getSnapshot().submitting, false);
  const retry = validSubmission(controller, firstScope);
  assert.equal(retry.started, true);

  const rejoinScope = endTurnConfirmationScopeFor(facts({ code: "NEW22", meId: "viewer-2", actionRevision: "rejoined" }));
  controller.setScope(rejoinScope);
  assert.equal(controller.getSnapshot().identity, null);
  assert.equal(controller.finishSubmission(retry.submissionId, false), false, "an old response cannot unlock a rejoined session");
  assert.equal(controller.getSnapshot().scope, rejoinScope);
});

test("cancel closes confirmation and restores focus only to a connected trigger", () => {
  const scope = endTurnConfirmationScopeFor(facts());
  const controller = new EndTurnConfirmationController(scope);
  controller.open();
  assert.equal(controller.close(), true);
  assert.equal(controller.getSnapshot().identity, null);

  const callbacks = [];
  const focusCalls = [];
  const buttonRef = { current: { isConnected: true, focus: (options) => focusCalls.push(options) } };
  scheduleEndTurnFocusRestore(buttonRef, (callback) => callbacks.push(callback));
  assert.equal(focusCalls.length, 0, "focus restore runs after the animation frame");
  callbacks.shift()();
  assert.deepEqual(focusCalls, [{ preventScroll: true }]);

  buttonRef.current.isConnected = false;
  scheduleEndTurnFocusRestore(buttonRef, (callback) => callbacks.push(callback));
  callbacks.shift()();
  assert.equal(focusCalls.length, 1, "detached buttons are not focused");
});

test("pre-Play trigger remains authorized only by CurrentAction and the confirmation keeps that check", () => {
  const prePlayTrigger = {
    status: "playing",
    phase: "draw",
    isMyTurn: false,
    isMyAction: true,
    viewerId: "viewer-1",
    currentAction: { kind: "trigger", actorId: "viewer-1", legalActions: ["trigger", "decline_trigger"] },
  };
  assert.equal(isOrdinaryTurnActionAuthorized(prePlayTrigger, "trigger"), true);
  assert.equal(isOrdinaryTurnActionAuthorized(prePlayTrigger, "end_turn"), false);

  const source = readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");
  assert.match(source, /actionStillAuthorized: ordinaryTurnActionAuthorized\("end_turn"\)/);
  assert.match(source, /if \(!reason\) endTurnConfirmation\.open\(\)/);
  assert.match(source, /endTurnConfirmation\.finishSubmission\(submission\.submissionId, submitted\)/);
});
