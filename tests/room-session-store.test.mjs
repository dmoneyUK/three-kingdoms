import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { RoomSessionStore, createRoomSessionSelector } from "../app/room-session/room-session-store.ts";

function view(roomCode, viewerId, epoch, active = true) {
  return Object.freeze({ roomCode, viewerId, epoch, active });
}

function room(code, meId, currentAction = { kind: "turn", actorId: meId, legalActions: ["end_turn"] }) {
  return { code, meId, status: "playing", myHand: [{ id: `private-${meId}` }], currentAction };
}

test("RoomSessionStore publishes one immutable snapshot and keeps unchanged selectors stable", () => {
  const store = new RoomSessionStore();
  store.setSession(view("ABCDE", "viewer-1", 1));
  let notifications = 0;
  store.subscribe(() => { notifications++; });
  const firstRoom = room("ABCDE", "viewer-1");
  assert.equal(store.publish(firstRoom), true);
  assert.equal(notifications, 1);
  assert.strictEqual(store.getSnapshot(), firstRoom);
  assert.equal(store.publish(firstRoom), true);
  assert.equal(notifications, 1, "publishing the same reference does not notify twice");

  const selectDecision = createRoomSessionSelector(
    (snapshot) => snapshot ? { currentAction: snapshot.currentAction } : null,
    (previous, next) => previous === next || Boolean(previous && next
      && JSON.stringify(previous.currentAction) === JSON.stringify(next.currentAction)),
  );
  const firstDecision = selectDecision(store.getSnapshot());
  const equivalentRoom = room("ABCDE", "viewer-1");
  assert.equal(store.publish(equivalentRoom), true);
  const unchangedDecision = selectDecision(store.getSnapshot());
  assert.strictEqual(unchangedDecision, firstDecision);
  assert.notStrictEqual(store.getSnapshot(), firstRoom, "the store publishes the new authoritative Room object");

  const changedRoom = room("ABCDE", "viewer-1", { kind: "response", actorId: "viewer-1", legalActions: ["respond"] });
  store.publish(changedRoom);
  const changedDecision = selectDecision(store.getSnapshot());
  assert.notStrictEqual(changedDecision, unchangedDecision, "a changed CurrentAction produces a new selected decision");
  assert.equal(changedDecision.currentAction.kind, "response");
});

test("session retirement wipes private projection once and rejects stale viewer publication", () => {
  const store = new RoomSessionStore();
  const firstView = view("ABCDE", "viewer-1", 1);
  store.setSession(firstView);
  store.publish(room("ABCDE", "viewer-1"));
  let notifications = 0;
  store.subscribe(() => { notifications++; });

  assert.equal(store.setSession(view("ABCDE", "viewer-2", 2)), true);
  assert.equal(notifications, 1, "viewer retirement produces one clear publication");
  assert.equal(store.getSnapshot(), null);
  assert.equal(store.publish(room("ABCDE", "viewer-1")), false, "a late prior-viewer response cannot repopulate private data");
  const secondRoom = room("ABCDE", "viewer-2");
  assert.equal(store.publish(secondRoom), true);
  assert.equal(store.getSnapshot().myHand[0].id, "private-viewer-2");

  assert.equal(store.setSession(view("", null, 3, false)), true);
  assert.equal(notifications, 3, "leave clears the selected viewer once");
  assert.equal(store.getSnapshot(), null);
  assert.equal(store.setSession(view("", null, 3, false)), false);
  assert.equal(notifications, 3, "repeating the same retirement is a no-op");
});

test("Home owns Room through one Gateway publication callback and renders the store snapshot", () => {
  const source = readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");
  const home = source.slice(source.indexOf("export default function Home()"), source.indexOf("\nfunction Brand()"));
  assert.match(home, /new RoomSessionStore<Room>\(\)/);
  assert.match(home, /useSyncExternalStore\(roomSessionStore\.subscribe, roomSessionStore\.getSnapshot, roomSessionStore\.getServerSnapshot\)/);
  assert.match(home, /onSessionChange: \(view\) => \{[\s\S]*?roomSessionStore\.setSession\(view\)/);
  assert.match(home, /onRoom: \(nextRoom, source\) => \{[\s\S]*?roomSessionStore\.publish\(nextRoom\)/);
  assert.equal((home.match(/roomSessionStore\.publish\(/g) ?? []).length, 1);
  assert.doesNotMatch(home, /useState<Room \| null>/);
  assert.doesNotMatch(home, /setRoom\(/);
  assert.match(source, /useRoomSessionSelector\(roomSessionStore, selectRoomSessionDecision, sameRoomSessionDecision\)/);
  assert.match(source, /currentAction: currentDecision\?\.currentAction \?\? null/);
});
