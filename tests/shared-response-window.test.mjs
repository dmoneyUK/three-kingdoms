import test from "node:test";
import assert from "node:assert/strict";
import { allWindowParticipantsSubmitted, canClaimResponseWindow, orderedWindowIntents, parsePrivateWindowSubmission } from "../game/shared-response-window.ts";
import { sharedResponsePriority } from "../game/shared-response-strategies.ts";
const entouragePriority = (players, id) => sharedResponsePriority(players, id, "ENTOURAGE_DODGE");
const row = (id, kind, at = 1) => ({ player_id: id, submission_json: JSON.stringify(kind === "pass" ? { kind } : { kind, providerId: "card", cardIds: [`${id}-dodge`] }), created_at: at });
const player = (id, seat, hero, alive = true) => ({ id, seat, hero, alive });
test("both shared response policies wait for all explicit submissions or the fixed deadline", () => {
  const rows = [row("near", "intent")];
  assert.equal(allWindowParticipantsSubmitted(["near", "far"], 8_000, rows), false);
  assert.equal(allWindowParticipantsSubmitted(["near", "far"], 8_000, [...rows, row("far", "pass")]), true);
  assert.equal(allWindowParticipantsSubmitted(["near", "far"], 8_000, [...rows, row("far", "pass", 8_000)]), false);
  const window = { windowId: "w", openedAt: 0, deadline: 8_000 };
  assert.equal(canClaimResponseWindow(window, "response", 7_999, false), false);
  assert.equal(canClaimResponseWindow(window, "response", 7_999, true), true);
  assert.equal(canClaimResponseWindow(window, "response", 8_000, false), true);
  assert.equal(canClaimResponseWindow({ ...window, settlement: { state: "CLAIMED", claimId: "c", leaseUntil: 9_000 } }, "resolving", 8_100, true), false);
  assert.equal(canClaimResponseWindow({ ...window, settlement: { state: "CLAIMED", claimId: "c", leaseUntil: 9_000 } }, "resolving", 9_000, true), true);
});
test("Entourage uses minimum raw living-seat distance and forward tie order rather than response time", () => {
  const players = [player("cao", 0, "cao-cao"), player("a", 1, "simayi"), player("other", 2, "liu-bei"), player("b", 3, "zhen-ji")];
  assert.deepEqual(entouragePriority(players, "cao"), ["a", "b"]);
  assert.deepEqual(orderedWindowIntents(entouragePriority(players, "cao"), 8_000, [row("b", "intent", 1), row("a", "intent", 7_000)]).map((item) => item.playerId), ["a", "b"]);
  const changed = [player("cao", 0, "cao-cao"), player("other", 1, "liu-bei"), player("b", 2, "simayi"), player("c", 3, "zhen-ji")];
  assert.deepEqual(entouragePriority(changed, "cao"), ["c", "b"]);
  assert.deepEqual(orderedWindowIntents(["c", "b"], 8_000, [row("c", "pass"), row("b", "intent")]).map((item) => item.playerId), ["b"]);
  changed[1].alive = false;
  assert.deepEqual(entouragePriority(changed, "cao"), ["b", "c"]);
});
test("submission mechanics reject malformed private intents and never add Pass or expired cards to candidates", () => {
  assert.equal(parsePrivateWindowSubmission('{"kind":"intent","providerId":"card","cardIds":["x","x"]}'), null);
  assert.equal(parsePrivateWindowSubmission('{"kind":"intent","providerId":"","cardIds":["x"]}'), null);
  assert.deepEqual(orderedWindowIntents(["a", "b", "c"], 8_000, [row("a", "pass"), row("b", "intent", 8_000), row("c", "intent", 7_999)]).map((item) => item.playerId), ["c"]);
});

test("4/5/6-player strategies freeze a correct living ring for every requester", async () => {
  const { sharedResponsePriority, createSharedResponseWindow } = await import("../game/shared-response-strategies.ts");
  const { selectFirstValidIntent } = await import("../game/shared-response-window.ts");
  for (const count of [4, 5, 6]) for (let seat = 0; seat < count; seat++) {
    const ring = Array.from({ length: count }, (_, index) => player(`p${index}`, index, index === seat ? "cao-cao" : "simayi"));
    const order = sharedResponsePriority(ring, `p${seat}`, "ENTOURAGE_DODGE");
    assert.equal(new Set(order).size, count - 1);
    assert.equal(order[0], `p${(seat + 1) % count}`);
    assert.equal(order[1], `p${(seat + count - 1) % count}`);
    ring[(seat + 2) % count].alive = false;
    const aliveOrder = sharedResponsePriority(ring, `p${seat}`, "ENTOURAGE_DODGE");
    assert.equal(aliveOrder.includes(`p${(seat + 2) % count}`), false);
  }
  const ring = [player("liu", 0, "liu-bei"), player("first", 1, "guan-yu"), player("second", 2, "zhao-yun"), player("other", 3, "cao-cao")];
  assert.deepEqual(sharedResponsePriority(ring, "liu", "INFLUENCING_ATTACK"), ["first", "second"]);
  const base = { kind: "dying", targetId: "liu", sourceId: "other", actorId: "", remainingIds: [], deadline: 0, resumePlayerId: "other", reason: "Peach" };
  const one = createSharedResponseWindow(ring, "liu", "liu", { mode: "DYING_PEACH", dying: base }, 100, 3);
  const two = createSharedResponseWindow(ring, "liu", "liu", { mode: "DYING_PEACH", dying: { ...base, sharedRescue: { round: 1 } } }, 200, 3);
  assert.equal(one.deadline, 8100); assert.equal(two.deadline, 8200);
  assert.notEqual(one.windowId, two.windowId); assert.equal(two.round, 2);
  assert.equal(two.settlement, undefined);
  const winner = await selectFirstValidIntent(["first", "second"], 8000, [row("second", "intent", 1), row("first", "intent", 2)], async (id) => id === "first" ? null : id);
  assert.equal(winner, "second", "invalid high-priority intent does not block a valid later contributor");
});

test("public shared projections strip hidden submissions and only accept exact committed cards", async () => {
  const { normalizePublicSharedWindow } = await import("../game/shared-response-presentation.ts");
  const { sharedResponseContributions } = await import("../game/shared-response-contribution.ts");
  const projection = normalizePublicSharedWindow({ semantics: "PROVEN", mode: "DYING_PEACH", windowId: "w", requesterId: "target", targetId: "target", openedAt: 10, deadline: 8010, stage: "COLLECTING", eligiblePlayerIds: ["private"], submissions: [{ cardIds: ["secret"] }] });
  assert.doesNotMatch(JSON.stringify(projection), /private|secret|eligible|submissions/);
  const proof = { semantics: "PROVEN", mode: "DYING_PEACH", eventId: "used", windowId: "w", actorId: "donor", requesterId: "target", targetId: "target", cardIds: ["real"], effectiveKind: "Peach", message: "Donor gave Peach." };
  const event = { type: "card", id: "used", actorId: "donor", action: "play", card: { id: "real", kind: "Peach" }, sharedResponseContribution: proof };
  assert.equal(sharedResponseContributions([event]).length, 1);
  assert.equal(sharedResponseContributions([{ ...event, card: { id: "different" } }]).length, 0);
  assert.equal(sharedResponseContributions([{ ...event, privateToPlayerId: "donor" }]).length, 0);
});

test('shared PAC copy is public and mode-owned, never driven by a private locked choice',async()=>{
  const {derivePublicActivityStatus}=await import('../game/public-activity.ts');
  const players=[{id:'requester',name:'Lord',alive:true},{id:'helper',name:'Helper',alive:true}];
  for(const [mode,text] of [
    ['ENTOURAGE_DODGE','Waiting for Wei Dodge responses for Lord.'],
    ['INFLUENCING_ATTACK','Waiting for Shu Attack responses for Lord.'],
    ['DYING_PEACH','Waiting for Peach responses to save Lord.']]) {
    const presentationSnapshot={sharedResponseWindow:{semantics:'PROVEN',windowId:'w',mode,requesterId:'requester',targetId:'requester',openedAt:1,deadline:8001,stage:'COLLECTING'}};
    const input={status:'playing',phase:mode==='DYING_PEACH'?'dying':'response',players,presentationSnapshot};
    assert.equal(derivePublicActivityStatus(input).text,text);
    assert.equal(derivePublicActivityStatus({...input,currentAction:{sharedWindow:{locked:true,choice:'intent'}}}).text,text);
  }
  const receipt={mode:'DYING_PEACH',eventId:'peach',targetId:'requester'};
  assert.equal(derivePublicActivityStatus({status:'playing',phase:'response',players,presentationSnapshot:{sharedResponseRecovery:{eventId:'peach',targetId:'requester'},sharedResponseContributions:[receipt]}}).text,'Resolving Peach for Lord.');
});
