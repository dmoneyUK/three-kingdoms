import test from "node:test";
import assert from "node:assert/strict";
import { baseUrl, request, requestAndSettle, state, sql, query, quote, discardIds } from "./harness.mjs";
const card = (kind, id, suit = "♠") => ({ kind, id, suit, rank: "7" });
async function seed(players, turnSeat = 3) {
  const response = await fetch(`${baseUrl}/__test/seed-playing-game`, { method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ players, turnSeat, phase: "play", deck: Array.from({ length: 15 }, (_, i) => card("Dodge", `deck-${crypto.randomUUID()}-${i}`)) }) });
  assert.ok(response.ok, await response.clone().text());
  return response.json();
}
const player = (name, hero, role, hand, hp = 4) => ({ name, hero, role, hand, hp, maxHp: 4 });
const stored = (game) => JSON.parse(query(`SELECT pending_json FROM rooms WHERE code=${quote(game.code)}`) || "null");
async function submit(game, viewer, choice = null) {
  const windowId = stored(game).windowId;
  return request(choice ? "respond" : "decline_response", { code: game.code, token: viewer.token,
    windowId, ...(choice ? { providerId: choice.providerId ?? "card", cardIds: choice.cardIds } : {}) });
}
async function openAttack(game, source, target) {
  const result = await requestAndSettle("play_card", { code: game.code, token: source.token, cardId: "attack", targetId: target.id, preserveResponse: true });
  assert.equal(result.status, 200, JSON.stringify(result.data));
}

test("shared Entourage waits for all helpers and chooses forward tie, with zero cost for the losing intent", async () => {
  const a = card("Dodge", "near-dodge"), b = card("Dodge", "other-dodge");
  const game = await seed([player("CAO", "cao-cao", "Lord", []), player("NEAR", "simayi", "Loyalist", [a]),
    player("OTHER", "zhen-ji", "Rebel", [b]), player("SOURCE", "sun-quan", "Renegade", [card("Attack", "attack")])]);
  const [cao, near, other, source] = game.players;
  await openAttack(game, source, cao);
  const invoked = await requestAndSettle("respond", { code: game.code, token: cao.token, providerId: "cao_cao_hujia", preserveResponse: true });
  assert.equal(invoked.status, 200, JSON.stringify(invoked.data));
  const window = stored(game);
  assert.equal(window.kind, "shared_response_window");
  assert.equal(window.deadline - window.openedAt, 8000);
  const before = await state(game.code, source.token);
  assert.equal(before.data.presentationSnapshot.sharedResponseWindow.mode, "ENTOURAGE_DODGE");
  assert.equal(before.data.presentationSnapshot.interaction.decisionActorId, null);
  assert.equal(before.data.currentAction.options?.length ?? 0, 0);
  const offered = await submit(game, other, { cardIds: [b.id] });
  assert.equal(offered.status, 200, JSON.stringify(offered.data));
  assert.equal(stored(game).windowId, window.windowId, "one fast intent cannot settle");
  assert.ok((await state(game.code, other.token)).data.myHand.some((held) => held.id === b.id));
  assert.equal((await state(game.code, other.token)).data.currentAction.sharedWindow.locked, true);
  assert.deepEqual((await state(game.code, source.token)).data.presentationSnapshot.sharedResponseWindow,
    before.data.presentationSnapshot.sharedResponseWindow, "private intent never alters public window");
  const result = await submit(game, near, { cardIds: [a.id] });
  assert.equal(result.status, 200, JSON.stringify(result.data));
  assert.equal((await state(game.code, near.token)).data.myHand.some((held) => held.id === a.id), false);
  assert.equal((await state(game.code, other.token)).data.myHand.some((held) => held.id === b.id), true);
  assert.equal(discardIds(game.code).filter((id) => id === a.id).length, 1);
  const proofs = result.data.room.presentationSnapshot.attackDodgeResponses;
  assert.equal(proofs.length, 1, JSON.stringify(result.data.room.presentationSnapshot));
  assert.equal(proofs[0].responseActorId, near.id);
  assert.equal(proofs[0].targetId, cao.id);
  assert.equal(result.data.room.players.find((p) => p.id === cao.id).hp, 4);
});

test("shared Influencing Play consumes one forward Shu Attack and preserves Liu Bei as attacker", async () => {
  const game = await seed([player("LIU", "liu-bei", "Lord", []), player("FIRST", "guan-yu", "Loyalist", [card("Attack", "first")]),
    player("SECOND", "zhao-yun", "Rebel", [card("Attack", "second")]), player("TARGET", "simayi", "Renegade", [card("Dodge", "target-dodge")])], 0);
  const [liu, first, second, target] = game.players;
  const invoked = await requestAndSettle("trigger", { code: game.code, token: liu.token, providerId: "liu_bei_jijiang", targetId: target.id, preserveResponse: true });
  assert.equal(invoked.status, 200, JSON.stringify(invoked.data));
  assert.equal(stored(game).continuation.mode, "INFLUENCING_ATTACK");
  assert.equal((await submit(game, second, { cardIds: ["second"] })).status, 200);
  const resolved = await submit(game, first, { cardIds: ["first"] });
  assert.equal(resolved.status, 200, JSON.stringify(resolved.data));
  assert.equal((await state(game.code, first.token)).data.myHand.length, 0);
  assert.ok((await state(game.code, second.token)).data.myHand.some((c) => c.id === "second"));
  assert.equal(stored(game).continuation.sourceId, liu.id);
  assert.equal(stored(game).continuation.targetId, target.id);
  const snapshot = resolved.data.room.presentationSnapshot;
  assert.equal(snapshot.rootAction?.sourceId, liu.id, JSON.stringify(snapshot.rootAction));
  assert.equal(snapshot.rootAction?.physicalActorId, first.id);
});

test("Dying accepts one Peach per round and never carries losing intents to a fresh window", async () => {
  const game = await seed([player("DYING", "liu-bei", "Lord", [], 1), player("FIRST", "guan-yu", "Loyalist", [card("Peach", "p1"), card("Peach", "p2"), card("Peach", "p3")]),
    player("SECOND", "zhao-yun", "Rebel", [card("Peach", "loser")]), player("SOURCE", "sun-quan", "Renegade", [card("Attack", "attack")])]);
  const [target, first, second, source] = game.players;
  sql(`UPDATE players SET hp=-1 WHERE id=${quote(target.id)}`);
  await openAttack(game, source, target);
  const damaged = await requestAndSettle("decline_response", { code: game.code, token: target.token, preserveResponse: true });
  assert.equal(damaged.status, 200, JSON.stringify(damaged.data));
  const seen = new Set();
  for (let index = 0; index < 3; index++) {
    const window = stored(game);
    assert.equal(window.continuation.mode, "DYING_PEACH");
    assert.equal(window.round, index + 1);
    assert.equal(window.deadline - window.openedAt, 8000);
    assert.equal(seen.has(window.windowId), false); seen.add(window.windowId);
    for (const viewer of [target, first, second, source]) {
      const view = (await state(game.code, viewer.token)).data;
      assert.equal(view.currentAction.sharedWindow.locked, false, "fresh window has no inherited choice");
    }
    assert.equal((await submit(game, first, { cardIds: [`p${index + 1}`] })).status, 200);
    if (index === 0) assert.equal((await submit(game, second, { cardIds: ["loser"] })).status, 200);
    else assert.equal((await submit(game, second)).status, 200);
    assert.equal((await submit(game, target)).status, 200);
    const closed = await submit(game, source);
    assert.equal(closed.status, 200, JSON.stringify(closed.data));
    const after = (await state(game.code, source.token)).data;
    assert.equal(after.players.find((p) => p.id === target.id).hp, -1 + index);
    assert.ok((await state(game.code, second.token)).data.myHand.some((c) => c.id === "loser"));
  }
  assert.notEqual(stored(game)?.kind, "shared_response_window");
  assert.equal(discardIds(game.code).includes("loser"), false);
});

test("window auth, one lock, immutable timer, refresh privacy and invalid intents", async () => {
  const game = await seed([player("CAO", "cao-cao", "Lord", []), player("ONE", "simayi", "Loyalist", [card("Dodge", "one")]),
    player("TWO", "zhen-ji", "Rebel", [card("Dodge", "two")]), player("SOURCE", "sun-quan", "Renegade", [card("Attack", "attack")])]);
  const [cao, one, two, source] = game.players;
  await openAttack(game, source, cao);
  await requestAndSettle("respond", { code: game.code, token: cao.token, providerId: "cao_cao_hujia", preserveResponse: true });
  const window = stored(game);
  for (const bad of [{ token: source.token, windowId: window.windowId, cardIds: ["one"], providerId: "card" },
    { token: one.token, windowId: "old", cardIds: ["one"], providerId: "card" },
    { token: one.token, windowId: window.windowId, cardIds: ["two"], providerId: "card" },
    { token: one.token, windowId: window.windowId, cardIds: ["one"], providerId: "forged" },
    { token: one.token, windowId: window.windowId, cardIds: ["one"], providerId: "card", rootEventId: "forged" }]) {
    assert.ok([403, 409].includes((await request("respond", { code: game.code, ...bad })).status));
  }
  const offered = await submit(game, one, { cardIds: ["one"] });
  assert.equal(offered.status, 200);
  assert.equal((await submit(game, one, { cardIds: ["one"] })).status, 200, "identical retry is idempotent");
  assert.equal((await submit(game, one)).status, 409, "a different retry cannot replace a locked choice");
  const fingerprint = () => query(`SELECT json_object('pending',pending_json,'log',log_json,'commit',shared_response_commit_id) FROM rooms WHERE code=${quote(game.code)}`);
  const saved = fingerprint();
  const publicViews = [];
  for (const viewer of game.players) {
    const view = (await state(game.code, viewer.token)).data;
    publicViews.push(view.presentationSnapshot.sharedResponseWindow);
    assert.equal(view.responseCountdownVisibleAt, window.openedAt);
    assert.equal(view.currentAction.deadline, window.deadline);
    if (viewer.id !== one.id) assert.equal(view.currentAction.sharedWindow.locked, false);
    assert.doesNotMatch(JSON.stringify(view.presentationSnapshot.sharedResponseWindow), /cardIds|providerId|eligible|submission/);
  }
  assert.equal(fingerprint(), saved, "GET/refresh never mutates the window");
  assert.ok(publicViews.every((view) => JSON.stringify(view) === JSON.stringify(publicViews[0])));
  assert.equal((await submit(game, two)).status, 200);
  assert.equal(discardIds(game.code).filter((id) => id === "one").length, 1);
  await Promise.all([request("advance_timers", { code: game.code, token: source.token }), request("advance_timers", { code: game.code, token: source.token })]);
  assert.equal(discardIds(game.code).filter((id) => id === "one").length, 1);
});

test("a stale nearer intent is ignored, and a genuine farther physical Dodge wins", async () => {
  const game = await seed([player("CAO", "cao-cao", "Lord", []), player("NEAR", "simayi", "Loyalist", [card("Dodge", "near")]),
    player("FAR", "zhen-ji", "Rebel", [card("Dodge", "far")]), player("SOURCE", "sun-quan", "Renegade", [card("Attack", "attack")])]);
  const [cao, near, far, source] = game.players;
  await openAttack(game, source, cao);
  await requestAndSettle("respond", { code: game.code, token: cao.token, providerId: "cao_cao_hujia", preserveResponse: true });
  assert.equal((await submit(game, near, { cardIds: ["near"] })).status, 200);
  sql(`UPDATE players SET hand_json='[]' WHERE id=${quote(near.id)}`);
  assert.equal((await submit(game, far, { cardIds: ["far"] })).status, 200);
  assert.equal(discardIds(game.code).includes("near"), false);
  assert.equal(discardIds(game.code).filter((id) => id === "far").length, 1);
});

test("all Pass returns Cao Cao without damage and disables repeated Entourage in that decision", async () => {
  const game = await seed([player("CAO", "cao-cao", "Lord", [card("Dodge", "own")]), player("ONE", "simayi", "Loyalist", []),
    player("TWO", "zhen-ji", "Rebel", []), player("SOURCE", "sun-quan", "Renegade", [card("Attack", "attack")])]);
  const [cao, one, two, source] = game.players;
  await openAttack(game, source, cao);
  await requestAndSettle("respond", { code: game.code, token: cao.token, providerId: "cao_cao_hujia", preserveResponse: true });
  assert.equal((await submit(game, one)).status, 200);
  assert.equal((await submit(game, two)).status, 200);
  const own = (await state(game.code, cao.token)).data;
  assert.equal(own.currentAction.actorId, cao.id);
  assert.equal(own.players.find((p) => p.id === cao.id).hp, 4);
  assert.equal(own.currentAction.options.some((option) => option.providerId === "cao_cao_hujia"), false);
  assert.ok(own.currentAction.options.some((option) => option.selection?.eligibleCardIds.includes("own")));
});

test("a selected Peach completes Prudence and hand-loss triggers before any fresh dying round", async () => {
  const game = await seed([player("TARGET", "lady-gan", "Lord", [], 1), player("DONOR", "lu-xun", "Loyalist", [card("Peach", "p")]),
    player("OTHER", "zhao-yun", "Rebel", [card("Peach", "loser")]), player("SOURCE", "sun-quan", "Renegade", [card("Attack", "attack")])]);
  const [target, donor, other, source] = game.players;
  sql(`UPDATE players SET hp=-1 WHERE id=${quote(target.id)}`);
  await openAttack(game, source, target);
  await requestAndSettle("decline_response", { code: game.code, token: target.token, preserveResponse: true });
  const firstWindow = stored(game).windowId;
  for (const viewer of [source, target, other]) assert.equal((await submit(game, viewer)).status, 200);
  const healed = await submit(game, donor, { cardIds: ["p"] });
  assert.equal(healed.status, 200, JSON.stringify(healed.data));
  assert.equal(stored(game).kind, "trigger");
  assert.equal(stored(game).event, "hp_recovered");
  const receipt = healed.data.room.presentationSnapshot.sharedResponseContributions;
  assert.equal(receipt.at(-1).actorId, donor.id);
  assert.equal(receipt.at(-1).effectiveKind, "Peach");
  assert.equal(stored(game).continuation.resume.pending.sharedRescue.round, 1);
  const skipped = await requestAndSettle("decline_trigger", { code: game.code, token: target.token, preserveResponse: true });
  assert.equal(skipped.status, 200, JSON.stringify(skipped.data));
  assert.equal(stored(game).kind, "trigger"); assert.equal(stored(game).event, "hand_lost");
  const wind = await requestAndSettle("decline_trigger", { code: game.code, token: donor.token, preserveResponse: true });
  assert.equal(wind.status, 200, JSON.stringify(wind.data));
  assert.equal(stored(game).kind, "shared_response_window");
  assert.equal(stored(game).round, 2); assert.notEqual(stored(game).windowId, firstWindow);
  assert.ok((await state(game.code, other.token)).data.myHand.some((c) => c.id === "loser"));
});

test("Sun Quan Wu Peach bonus uses one card, while a losing Hua Tuo intent stays private", async () => {
  const game = await seed([player("SUN", "sun-quan", "Lord", [], 1), player("WU", "zhou-yu", "Loyalist", [card("Peach", "wu")]),
    player("DOCTOR", "hua-tuo", "Rebel", [card("Dodge", "first-aid", "♥")]), player("SOURCE", "liu-bei", "Renegade", [card("Attack", "attack")])]);
  const [target, wu, doctor, source] = game.players;
  await openAttack(game, source, target);
  await requestAndSettle("decline_response", { code: game.code, token: target.token, preserveResponse: true });
  assert.equal((await submit(game, doctor, { providerId: "hua_tuo_first_aid", cardIds: ["first-aid"] })).status, 200);
  for (const viewer of [source, target]) assert.equal((await submit(game, viewer)).status, 200);
  const saved = await submit(game, wu, { cardIds: ["wu"] });
  assert.equal(saved.status, 200, JSON.stringify(saved.data));
  assert.equal(saved.data.room.players.find((p) => p.id === target.id).hp, 2);
  assert.ok((await state(game.code, doctor.token)).data.myHand.some((c) => c.id === "first-aid"));
  assert.equal(saved.data.room.timeline.some((event) => event.sharedResponseContribution?.actorId === doctor.id), false);
});

test("a Peach round with no valid winner defeats exactly once, without an infinite new round", async () => {
  const game = await seed([player("TARGET", "liu-bei", "Lord", [], 1), player("ONE", "guan-yu", "Loyalist", []),
    player("TWO", "zhao-yun", "Rebel", []), player("SOURCE", "sun-quan", "Renegade", [card("Attack", "attack")])]);
  const [target, one, two, source] = game.players;
  await openAttack(game, source, target);
  await requestAndSettle("decline_response", { code: game.code, token: target.token, preserveResponse: true });
  for (const viewer of [target, one, two]) assert.equal((await submit(game, viewer)).status, 200);
  const defeated = await submit(game, source);
  assert.equal(defeated.status, 200, JSON.stringify(defeated.data));
  assert.equal(defeated.data.room.players.find((p) => p.id === target.id).alive, false);
  assert.notEqual(stored(game)?.kind, "shared_response_window");
  const log = query(`SELECT log_json FROM rooms WHERE code=${quote(game.code)}`);
  await request("advance_timers", { code: game.code, token: source.token });
  assert.equal(query(`SELECT log_json FROM rooms WHERE code=${quote(game.code)}`), log);
});

test("expired interrupted shared lease recovers once and rejects late intents", async () => {
  const game = await seed([player("CAO", "cao-cao", "Lord", []), player("ONE", "simayi", "Loyalist", [card("Dodge", "one")]),
    player("TWO", "zhen-ji", "Rebel", [card("Dodge", "two")]), player("SOURCE", "sun-quan", "Renegade", [card("Attack", "attack")])]);
  const [cao, one, two, source] = game.players;
  await openAttack(game, source, cao);
  await requestAndSettle("respond", { code: game.code, token: cao.token, providerId: "cao_cao_hujia", preserveResponse: true });
  assert.equal((await submit(game, one, {cardIds:["one"]})).status,200);
  const window=stored(game);
  const { sharedResponseForPlayer }=await import('../../game/shared-response-strategies.ts');
  const original=sharedResponseForPlayer(window,{...one,hero:'simayi',alive:true});
  // Model an interrupted Worker after the durable one-winner claim but before any domain cost.
  window.openedAt=Date.now()-9000; window.deadline=window.openedAt+8000;
  sql(`UPDATE shared_response_window_submissions SET created_at=${window.openedAt+1000} WHERE window_id=${quote(window.windowId)}`);
  window.settlement={state:'CLAIMED',claimId:'interrupted',leaseUntil:Date.now()-1,
    winner:{playerId:one.id,providerId:'card',cardIds:['one'],pending:original}};
  sql(`UPDATE rooms SET phase='resolving',pending_json=${quote(JSON.stringify(window))} WHERE code=${quote(game.code)}`);
  const late=await submit(game,two,{cardIds:['two']});
  assert.equal(late.status,409);
  await Promise.all([request('advance_timers',{code:game.code,token:source.token}),request('advance_timers',{code:game.code,token:source.token})]);
  assert.equal(discardIds(game.code).filter(id=>id==='one').length,1);
  assert.equal((await state(game.code,two.token)).data.myHand.some(c=>c.id==='two'),true);
  assert.notEqual(stored(game)?.kind,'shared_response_window');
});

test("one Entourage winner satisfies only one of Lu Bu's two required Dodges",async()=>{
  const game=await seed([player('CAO','cao-cao','Lord',[card('Dodge','own')]),player('HELPER','simayi','Loyalist',[card('Dodge','converted')]),
    player('OTHER','zhen-ji','Rebel',[]),player('SOURCE','lü-bu','Renegade',[card('Attack','attack')])]);
  const [cao,helper,other,source]=game.players;
  await openAttack(game,source,cao);
  await requestAndSettle('respond',{code:game.code,token:cao.token,providerId:'cao_cao_hujia',preserveResponse:true});
  await submit(game,other);
  const partial=await submit(game,helper,{cardIds:['converted']});
  assert.equal(partial.status,200,JSON.stringify(partial.data));
  assert.equal(stored(game).kind,'response');
  assert.equal(stored(game).actorId,cao.id);
  assert.equal(stored(game).requirement.count,1);
  assert.equal(partial.data.room.players.find(p=>p.id===cao.id).hp,4);
  assert.equal(partial.data.room.presentationSnapshot.attackDodgeResponses?.length??0,0,'no premature full-block proof');
  assert.equal(partial.data.room.presentationSnapshot.sharedResponseContributions.at(-1).effectiveKind,'Dodge');
  const finished=await requestAndSettle('respond',{code:game.code,token:cao.token,providerId:'card',cardId:'own',preserveResponse:true});
  assert.equal(finished.status,200,JSON.stringify(finished.data));
  assert.equal(finished.data.room.players.find(p=>p.id===cao.id).hp,4);
});

test("winning Hua Tuo First Aid invokes the original one-Peach resolver",async()=>{
  const game=await seed([player('TARGET','liu-bei','Lord',[],1),player('DOCTOR','hua-tuo','Loyalist',[card('Dodge','red','♥')]),
    player('OTHER','zhao-yun','Rebel',[]),player('SOURCE','sun-quan','Renegade',[card('Attack','attack')])]);
  const [target,doctor,other,source]=game.players;
  await openAttack(game,source,target);
  await requestAndSettle('decline_response',{code:game.code,token:target.token,preserveResponse:true});
  for(const viewer of [target,other,source]) await submit(game,viewer);
  const saved=await submit(game,doctor,{providerId:'hua_tuo_first_aid',cardIds:['red']});
  assert.equal(saved.status,200,JSON.stringify(saved.data));
  assert.equal(saved.data.room.players.find(p=>p.id===target.id).hp,1);
  assert.equal(discardIds(game.code).filter(id=>id==='red').length,1);
  assert.equal(saved.data.room.presentationSnapshot.sharedResponseContributions.at(-1).actorId,doctor.id);
});
