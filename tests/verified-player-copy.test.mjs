import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { buildConsoleVerifiedCopies } from "../app/page.tsx";
import { VerifiedPlayerCopy } from "../app/verified-player-copy.tsx";
import { matchingVerifiedPlayerCopySegments, verifiedPlayerCopy } from "../game/verified-player-copy.ts";

test("verified player-copy keeps exact identities, punctuation, repeated names, and Unicode", () => {
  const copy = verifiedPlayerCopy([
    "Waiting for ",
    { id: "p1", name: "Ali" },
    " to help ",
    { id: "p2", name: "Ali Ali" },
    "'s target, 小明.",
  ]);

  assert.equal(copy.message, "Waiting for Ali to help Ali Ali's target, 小明.");
  assert.deepEqual(copy.segments.filter((part) => part.kind === "player").map(({ playerId, text }) => ({ playerId, text })), [
    { playerId: "p1", text: "Ali" },
    { playerId: "p2", text: "Ali Ali" },
  ]);
  assert.equal(matchingVerifiedPlayerCopySegments(copy.message, copy.segments), copy.segments);
});

test("verified player-copy rejects missing identity or any copy mismatch", () => {
  const copy = verifiedPlayerCopy(["Waiting for ", { id: "p1", name: "Lü Bu" }, "."]);
  assert.equal(matchingVerifiedPlayerCopySegments("Waiting for Lü Bu?", copy.segments), undefined);
  assert.equal(matchingVerifiedPlayerCopySegments(copy.message, [{ kind: "player", playerId: "", text: "Lü Bu" }]), undefined);
  assert.equal(matchingVerifiedPlayerCopySegments(copy.message, undefined), undefined);
});

test("shared React renderer preserves accessible copy and fails closed to plain text", () => {
  const copy = verifiedPlayerCopy(["Waiting for ", { id: "p1", name: "<Player One>" }, "."]);
  const markup = renderToStaticMarkup(React.createElement("div", { role: "status", "aria-label": copy.message },
    React.createElement(VerifiedPlayerCopy, { message: copy.message, segments: copy.segments })));
  assert.match(markup, /aria-label="Waiting for &lt;Player One&gt;\."/);
  assert.match(markup, /class="message-player-name" data-player-id="p1">&lt;Player One&gt;<\/span>/);
  assert.equal((markup.match(/&lt;Player One&gt;/g) ?? []).length, 2, "the aria label and visible text remain equivalent");

  const fallback = renderToStaticMarkup(React.createElement(VerifiedPlayerCopy, {
    message: "Waiting for Player One.",
    segments: [{ kind: "player", playerId: "p1", text: "A different player" }],
  }));
  assert.equal(fallback, "Waiting for Player One.");
  assert.doesNotMatch(fallback, /message-player-name|data-player-id/);
});

test("Console-style wait, Borrowed Sword and ordered Lust copy share the same name renderer", () => {
  const cases = [
    verifiedPlayerCopy(["WAITING FOR ", { id: "p1", name: "PLAYER ONE" }]),
    verifiedPlayerCopy(["Choose who ", { id: "p2", name: "Weapon Holder" }, " must Attack."]),
    verifiedPlayerCopy(["Attack order: ", { id: "p2", name: "First Target" }, " first → ", { id: "p3", name: "Second Target" }, " second."]),
    verifiedPlayerCopy(["You passed. Waiting for the other players."]),
  ];
  const rendered = cases.map((copy) => renderToStaticMarkup(React.createElement("strong", { "aria-label": copy.message },
    React.createElement(VerifiedPlayerCopy, { message: copy.message, segments: copy.segments }))));
  assert.equal((rendered[0].match(/class="message-player-name"/g) ?? []).length, 1);
  assert.equal((rendered[1].match(/class="message-player-name"/g) ?? []).length, 1);
  assert.equal((rendered[2].match(/class="message-player-name"/g) ?? []).length, 2);
  assert.equal((rendered[3].match(/class="message-player-name"/g) ?? []).length, 0, "player-free private acknowledgements remain literal text");
  assert.match(rendered[3], /aria-label="You passed\. Waiting for the other players\."/);
});

test("Console name fragments are built only from current authoritative player IDs", () => {
  const players = [
    { id: "p1", name: "Local Player" },
    { id: "p2", name: "Weapon Holder" },
    { id: "p3", name: "Target Player" },
  ];
  const base = {
    room: { meId: "p1", players, phase: "response", isMyAction: true, actionPlayerId: null, currentAction: null, pendingBorrowedSword: null, pendingTargetCard: null },
    decisionPresentation: { isWaiting: false, primaryStatus: "Choose a response" },
    clientPresentation: { decisionActorId: null },
    consoleInstruction: "No action needed.",
    consoleDisplayInstruction: "No action needed.",
    controlsVisible: true,
    localWaitAlreadyPublic: false,
    negationWindowSubmitted: false,
    localSemanticResponseGuidance: false,
    lustTargetOrder: null,
  };

  const waiting = buildConsoleVerifiedCopies({
    ...base,
    room: { ...base.room, currentAction: { actorId: "p3" } },
    decisionPresentation: { ...base.decisionPresentation, isWaiting: true, primaryStatus: "WAITING FOR TARGET PLAYER" },
    clientPresentation: { decisionActorId: "p3" },
    controlsVisible: false,
  });
  assert.deepEqual(waiting.statusSegments?.filter((part) => part.kind === "player").map((part) => part.playerId), ["p3"]);

  const participantGuidance = buildConsoleVerifiedCopies({
    ...base,
    decisionPresentation: {
      ...base.decisionPresentation,
      isWaiting: true,
      supportingInstruction: "Attack Response · Weapon Holder",
      interaction: { stage: "ATTACK_RESPONSE", currentParticipantId: "p2" },
    },
    clientPresentation: { decisionActorId: "p3" },
    consoleInstruction: "Attack Response · Weapon Holder",
    consoleDisplayInstruction: "Attack Response · Weapon Holder",
    controlsVisible: false,
  });
  assert.deepEqual(participantGuidance.instructionSegments?.filter((part) => part.kind === "player").map((part) => part.playerId), ["p2"]);

  const borrowed = buildConsoleVerifiedCopies({
    ...base,
    room: { ...base.room, pendingBorrowedSword: { stage: "choose_target", holderId: "p2" } },
    consoleInstruction: "Choose who Weapon Holder must Attack.",
    consoleDisplayInstruction: "Choose who Weapon Holder must Attack.",
  });
  assert.deepEqual(borrowed.instructionSegments?.filter((part) => part.kind === "player").map((part) => part.playerId), ["p2"]);

  const targetCard = buildConsoleVerifiedCopies({
    ...base,
    room: { ...base.room, currentAction: { kind: "target_card", actorId: "p1", legalActions: ["choose_target_card"] },
      pendingTargetCard: { actorId: "p1", sourceId: "p1", targetId: "p3", cardKind: "Steal" } },
    consoleInstruction: "Choose one card to take from Target Player",
    consoleDisplayInstruction: "Choose one card to take from Target Player",
  });
  assert.deepEqual(targetCard.instructionSegments?.filter((part) => part.kind === "player").map((part) => part.playerId), ["p3"]);

  const blockedTargetCopy = verifiedPlayerCopy(["Cannot target ", { id: "p3", name: "Target Player" }, " with Burning Bridges right now."]);
  const blockedTarget = buildConsoleVerifiedCopies({
    ...base,
    activeLocalPlayTargetMessage: blockedTargetCopy.message,
    activeLocalPlayTargetSegments: blockedTargetCopy.segments,
    consoleInstruction: blockedTargetCopy.message,
    consoleDisplayInstruction: blockedTargetCopy.message,
  });
  assert.deepEqual(blockedTarget.instructionSegments?.filter((part) => part.kind === "player").map((part) => part.playerId), ["p3"]);

  const lust = buildConsoleVerifiedCopies({
    ...base,
    lustTargetOrder: { firstId: "p2", firstName: "Weapon Holder", secondId: "p3", secondName: "Target Player" },
  });
  assert.deepEqual(lust.lustCopy?.segments.filter((part) => part.kind === "player").map((part) => part.playerId), ["p2", "p3"]);

  const privateAck = buildConsoleVerifiedCopies({ ...base, consoleInstruction: "You passed. Waiting for the other players.", consoleDisplayInstruction: "You passed. Waiting for the other players." });
  assert.equal(privateAck.instructionSegments, undefined, "private acknowledgements without names remain literal text");
});
