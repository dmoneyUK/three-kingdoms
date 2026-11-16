import test from "node:test";
import assert from "node:assert/strict";
import { classifyRoomGetFailure, RoomPollRecovery } from "../game/room-poll-recovery.ts";
import { runSharedResponseExpiryAttempt } from "../game/shared-response-expiry.ts";

test("GET failures retire only explicitly proven missing rooms or invalid sessions", () => {
  for (const status of [null, 200, 408, 429, 500, 502, 503, 404, 400, 403]) {
    assert.equal(classifyRoomGetFailure(status, "invalid JSON"), "temporary");
    if (status !== 404) assert.equal(classifyRoomGetFailure(status, { error: "Room not found." }), "temporary");
  }
  assert.equal(classifyRoomGetFailure(404, { error: "Room not found." }), "missing-room");
  assert.equal(classifyRoomGetFailure(403, { error: "Your player session is no longer valid." }), "invalid-session");
  assert.equal(classifyRoomGetFailure(403, { error: "A valid room member session is required for UX diagnostics." }), "invalid-session");
  assert.equal(classifyRoomGetFailure(403, { error: "That test viewer is not controlled by this session." }), "unavailable-viewer");
  assert.equal(classifyRoomGetFailure(503, { error: "Your player session is no longer valid." }), "temporary");
});

test("mocked room transport keeps session/viewer through 503, blocks new POST, then resumes exactly once", async () => {
  const gate = new RoomPollRecovery();
  const session = { code: "SAFE1", token: "private" };
  let room = { meId: "viewer-2", currentAction: { kind: "play" } };
  const originalRoom = room;
  const originalSession = { ...session };
  let postCount = 0;
  let applyCount = 0;
  gate.activate("epoch1:viewer2");
  const submit = () => { if (!gate.stale) postCount++; };
  const receive = async (key, response) => {
    assert.equal(gate.begin(key), true);
    try {
      if (!response.ok) { gate.fail(key); return; }
      if (gate.recover(key)) { room = await response.json(); applyCount++; }
    } finally { gate.end(key); }
  };
  await receive("epoch1:viewer2", new Response("unavailable", { status: 503 }));
  assert.deepEqual(session, originalSession);
  assert.equal(room, originalRoom);
  submit();
  assert.equal(postCount, 0);
  assert.equal(gate.retryDelay(false), 1_000);
  assert.equal(gate.retryDelay(true), 15_000);
  await receive("epoch1:viewer2", Response.json(originalRoom));
  assert.equal(applyCount, 1);
  submit();
  assert.equal(postCount, 1);
  assert.equal(room.meId, "viewer-2");
  gate.activate("epoch1:viewer3");
  gate.fail("epoch1:viewer3");
  await receive("epoch1:viewer2", Response.json({ meId: "viewer-2" }));
  assert.equal(applyCount, 1, "old viewer cannot apply or unblock submission");
  assert.equal(gate.stale, true);
  gate.reset();
  assert.equal(gate.recover("epoch1:viewer3"), false, "Leave invalidates outstanding response");
});

test("in-flight identity deduplication and bounded retry survive repeated failures", () => {
  const gate = new RoomPollRecovery();
  gate.activate("current");
  assert.equal(gate.begin("current"), true);
  assert.equal(gate.begin("current"), false);
  gate.end("current");
  for (const delay of [1000, 2000, 4000, 8000, 8000]) {
    gate.fail("current");
    assert.equal(gate.retryDelay(false), delay);
  }
  gate.recover("current");
  assert.equal(gate.stale, false);
  assert.equal(gate.failures, 0);
});

test("shared expiry retries a coalesced GET and advances only the same expired public window", async () => {
  const window = { semantics: "PROVEN", windowId: "liu-window", mode: "INFLUENCING_ATTACK", requesterId: "liu", targetId: "target", openedAt: 0, deadline: 8_000, stage: "COLLECTING" };
  let now = window.deadline + 193;
  let ordinaryGetInFlight = true;
  let reads = 0;
  let advanceActions = [];
  let retries = 0;
  let liveWindow = window;
  const attempt = () => runSharedResponseExpiryAttempt({
    expected: { windowId: window.windowId, deadline: window.deadline },
    readCurrentWindow: async () => {
      reads++;
      // Reproduce the deadline GET collision: the ordinary same-key poll is
      // still in flight from deadline−35ms through deadline+193ms.
      if (ordinaryGetInFlight || reads === 3) return false;
      return liveWindow;
    },
    advanceTimers: async () => { advanceActions.push("advance_timers"); },
    isCurrent: () => true,
    now: () => now,
    scheduleDeadline: () => assert.fail("An already expired window cannot be rescheduled before its deadline"),
    retry: () => { retries++; },
  });

  assert.equal(await attempt(), "retry", "the false preflight read schedules a same-window retry");
  assert.equal(advanceActions.length, 0, "the first coalesced read is not treated as window closure or settlement");
  ordinaryGetInFlight = false;
  assert.equal(await attempt(), "retry", "the recovered same window posts expiry and retries a false verification read");
  assert.deepEqual(advanceActions, ["advance_timers"]);
  assert.equal(retries, 2);

  liveWindow = { ...window, windowId: "next-window", deadline: 20_000 };
  assert.equal(await attempt(), "closed", "an authoritative different window stops retries");
  assert.deepEqual(advanceActions, ["advance_timers"], "the old window is never advanced after its identity changes");
  assert.equal(retries, 2);
});
