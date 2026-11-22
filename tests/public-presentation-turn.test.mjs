import test from "node:test";
import assert from "node:assert/strict";
import {
  appendSequencedLogRecord,
  publicEventSequencesFromLog,
  publicSequenceWatermarkFromLog,
} from "../game/public-log-sequence.ts";
import {
  publicPresentationTimelineForTurn,
  shouldAcceptPublicPresentationTurn,
} from "../game/public-presentation-turn.ts";

test("turn scope keeps only committed public presentation newer than its boundary", () => {
  const events = [
    { id: "old-h4", publicSequence: 4 },
    { id: "old-mini", publicSequence: 5 },
    { id: "new-pac-event", publicSequence: 6 },
    { id: "private-choice", privateToPlayerId: "viewer-1" },
    { id: "history", presentation: false },
    { id: "unsequenced-public" },
  ];

  assert.deepEqual(publicPresentationTimelineForTurn(events, { epoch: 7, startPublicSequence: 5 }).map(({ id }) => id), [
    "new-pac-event", "private-choice", "history",
  ]);
});

test("legacy turn remains compatible, while an unknown active boundary fails closed for public events", () => {
  const events = [{ id: "legacy-public", publicSequence: 1 }, { id: "private", privateToPlayerId: "viewer-1" }];
  assert.deepEqual(publicPresentationTimelineForTurn(events, { epoch: 0, startPublicSequence: null }), events);
  assert.deepEqual(publicPresentationTimelineForTurn(events, { epoch: 1, startPublicSequence: null }).map(({ id }) => id), ["private"]);
  assert.deepEqual(publicPresentationTimelineForTurn(events, { epoch: -1, startPublicSequence: null }).map(({ id }) => id), ["private"]);
});

test("finished rooms retire public transient events but retain private and non-presentation history", () => {
  const events = [
    { id: "old-h4", publicSequence: 1 },
    { id: "private-choice", privateToPlayerId: "viewer-1" },
    { id: "history", presentation: false },
  ];
  assert.deepEqual(publicPresentationTimelineForTurn(events, { epoch: 3, startPublicSequence: 0, retireAll: true }).map(({ id }) => id), [
    "private-choice", "history",
  ]);
});

test("viewer accepts a new authoritative turn but rejects stale turn and finished-state responses", () => {
  const current = { roomCode: "ABCDE", viewerId: "viewer-1", scope: { epoch: 4, startPublicSequence: 23 } };
  assert.equal(shouldAcceptPublicPresentationTurn(current, { ...current, scope: { epoch: 3, startPublicSequence: 19 } }), false);
  assert.equal(shouldAcceptPublicPresentationTurn(current, { ...current, scope: { epoch: 4, startPublicSequence: 22 } }), false);
  assert.equal(shouldAcceptPublicPresentationTurn(current, { ...current, scope: { epoch: 5, startPublicSequence: 1 } }), true,
    "epoch, rather than seat number, distinguishes successive turns including same-seat extra turns");
  const finished = { ...current, scope: { ...current.scope, retireAll: true } };
  assert.equal(shouldAcceptPublicPresentationTurn(finished, current), false);
  assert.equal(shouldAcceptPublicPresentationTurn(current, { ...current, viewerId: "viewer-2" }), true,
    "TEST SWITCH has a separate viewer scope");
});

test("legacy public sequence boundary matches the next append's bootstrap order", () => {
  const legacyLog = [
    `@event:${JSON.stringify({ id: "old-public-a" })}`,
    `@event:${JSON.stringify({ id: "private-record", privateToPlayerId: "viewer-1" })}`,
    `@history:${JSON.stringify({ id: "history-only" })}`,
    `@event:${JSON.stringify({ id: "old-public-b" })}`,
  ];
  assert.equal(publicSequenceWatermarkFromLog(legacyLog), 2);

  const appended = appendSequencedLogRecord(legacyLog, "@event:", { id: "new-public" });
  const sequences = publicEventSequencesFromLog(appended);
  assert.equal(sequences?.get("old-public-a"), 1);
  assert.equal(sequences?.get("old-public-b"), 2);
  assert.equal(sequences?.get("new-public"), 3);
  assert.equal(publicSequenceWatermarkFromLog(appended), 3);
});
