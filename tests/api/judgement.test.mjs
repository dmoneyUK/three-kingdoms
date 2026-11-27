/* eslint-disable @typescript-eslint/no-unused-vars */
import test from "node:test";
import { normalizePublicDiscardSettlements, publicDiscardSettlementCopyForFacts } from "../../app/public-discard-settlement.ts";
import { cardDefinition } from "../../game/cards.ts";
import { derivePublicActivityStatus, derivePublicInteractionNarration } from "../../game/public-activity.ts";
import {
  assert, card, createHumanGame, createHumanSetupGame, createTestGame, createTestLobby, discardIds, distributeLegacy, drainEmptyPrivateDecisions, markReady, normalizeRoomData, openBorrowedSwordScenario, openFankuiAttack, openGanglieAttack, openGanglieGroup, openGuoDamage, openHujiaScenario, passNegationWindows, prepareGuoJudgement, query, quote, request, requestAndSettle, roomCardCount, setDeck, setEquipment, setHand, setJudgement, setTurn, sql, state, takeDamageIfPending, waitForState,
} from "./test-support.mjs";

function stauchnessNarration(room) {
  const snapshot = room.presentationSnapshot;
  const factsById = new Map([...(snapshot?.retainedPublicEventFacts ?? []), ...(snapshot?.publicEventFacts ?? [])]
    .filter((fact) => fact.label === "Stauchness" || fact.committedOutcome?.source.label === "Stauchness")
    .map((fact) => [fact.eventId, fact]));
  const facts = [...factsById.values()].sort((left, right) => left.order - right.order);
  const fact = facts.at(-1);
  assert.ok(fact?.rootEventId && fact.identity?.interactionId && fact.identity?.rootFrameId, "Stauchness H4 fact is linked to its proven public root");
  return {
    fact,
    narration: derivePublicInteractionNarration({
      snapshot,
      players: room.players,
      rootEventId: fact.rootEventId,
      interactionId: fact.identity.interactionId,
      rootFrameId: fact.identity.rootFrameId,
      eventId: fact.eventId,
    }),
  };
}

test("Xiahou Dun Stauchness declines or resolves a non-Heart Judgement through the generic source choice", { timeout: 30_000 }, async () => {
  const declined = await openGanglieAttack({ judge: { ...card("Dodge", "ganglie-decline-judge"), suit: "♠", rank: "7" } });
  assert.ok(declined.actionPresentation?.readyAfterEventId, "the damage trigger waits for its essential presentation barrier");
  const skipped = await requestAndSettle("decline_trigger", { code: declined.code, token: declined.targetMember.token });
  assert.equal(skipped.status, 200, JSON.stringify(skipped.data));
  assert.equal(skipped.data.room.phase, "play-struck");
  assert.equal(skipped.data.room.players.find((player) => player.id === declined.target.id).hp, 2);
  assert.equal(discardIds(declined.code).includes("dodge-ganglie-decline-judge"), false, "declining does not invent a Judgement card");

  const resolved = await openGanglieAttack({
    judge: { ...card("Dodge", "ganglie-spade-judge"), suit: "♠", rank: "7" },
    sourceCards: [card("Attack", "ganglie-discard-attack"), card("Dodge", "ganglie-cost-a"), card("Peach", "ganglie-cost-b")],
  });
  const accepted = await requestAndSettle("trigger", { code: resolved.code, token: resolved.targetMember.token, providerId: "xiahou_dun_ganglie" });
  assert.equal(accepted.status, 200, JSON.stringify(accepted.data));
  const damageResumeEnvelope = accepted.data.room.causalEnvelope;
  assert.ok(damageResumeEnvelope, "Stauchness Judgement resumes into the live Damage interaction");
  assert.equal(damageResumeEnvelope.frames[0].stage, "DAMAGE");
  assert.equal(damageResumeEnvelope.frames[0].origin.originSourceId, resolved.source.id);
  const sourceView = (await state(resolved.code, resolved.sourceMember.token)).data;
  assert.equal(sourceView.currentAction.kind, "trigger");
  assert.equal(sourceView.currentAction.triggerEvent, "damage_suffered");
  assert.equal(sourceView.currentAction.actorId, resolved.source.id);
  assert.ok(sourceView.currentAction.presentation?.readyAfterEventId, "the mandatory source choice retains its presentation barrier");
  const targetView = (await state(resolved.code, resolved.targetMember.token)).data;
  const pendingStauchness = stauchnessNarration(accepted.data.room);
  assert.equal(pendingStauchness.narration?.headline,
    `${resolved.target.name} used Stauchness. Judgement: [7♠] — not a Heart.`);
  const pendingPac = derivePublicActivityStatus({
    status: accepted.data.room.status,
    phase: accepted.data.room.phase,
    turnSeat: accepted.data.room.turnSeat,
    players: accepted.data.room.players,
    presentationSnapshot: accepted.data.room.presentationSnapshot,
  });
  assert.equal(pendingPac.kind, "response", JSON.stringify({
    status: accepted.data.room.status,
    phase: accepted.data.room.phase,
    publicNextDecision: accepted.data.room.presentationSnapshot?.publicNextDecision,
    interaction: accepted.data.room.presentationSnapshot?.interaction,
    stable: accepted.data.room.presentationSnapshot?.stable,
  }));
  assert.equal(pendingPac.text, `Waiting for ${resolved.source.name} to choose a Stauchness consequence.`);
  assert.equal(accepted.data.room.presentationSnapshot?.publicNextDecision?.stageLabel, "Stauchness consequence choice");
  assert.deepEqual(accepted.data.room.presentationSnapshot?.publicNextDecision?.actorIds, [resolved.source.id]);
  assert.deepEqual(accepted.data.room.presentationSnapshot?.publicNextDecision?.actionLabels, []);
  const observerView = (await state(resolved.code, resolved.members[3].token)).data;
  const allViewerViews = [accepted.data.room, sourceView, targetView, observerView];
  assert.ok(allViewerViews.every((view) => JSON.stringify(view.presentationSnapshot?.publicNextDecision)
    === JSON.stringify(accepted.data.room.presentationSnapshot?.publicNextDecision)),
  "the server-authored public decision is identical for chooser, affected player, and observers");
  const allViewerPac = allViewerViews.map((view) => derivePublicActivityStatus({
    status: view.status, phase: view.phase, turnSeat: view.turnSeat, players: view.players,
    presentationSnapshot: view.presentationSnapshot,
  }));
  assert.ok(allViewerPac.every((status) => status.text === pendingPac.text), "all viewers receive the same chooser PAC");
  assert.doesNotMatch(JSON.stringify(accepted.data.room.presentationSnapshot?.publicNextDecision), /hand:\d|ganglie-cost/,
    "the public decision carries no private hand positions or card identities");
  const attackRoot = accepted.data.room.timeline.find((event) => event.type === "card" && event.card?.id === "attack-ganglie-discard-attack");
  assert.equal(pendingStauchness.fact.rootEventId, attackRoot?.id);
  const pendingResultEvent = accepted.data.room.timeline.find((event) => event.id === pendingStauchness.fact.eventId);
  assert.equal(pendingResultEvent?.resolutionId, pendingStauchness.fact.resolutionId,
    "the projected decision result retains its committed event resolution identity");
  assert.deepEqual(pendingStauchness.narration?.headlineSegments?.filter((segment) => segment.kind === "player").map((segment) => segment.playerId),
    [resolved.target.id], "H4 names the skill owner; the current chooser remains in the public PAC");
  const sourcePendingView = (await state(resolved.code, resolved.sourceMember.token)).data;
  assert.deepEqual(sourcePendingView.presentationSnapshot.publicEventFacts, targetView.presentationSnapshot.publicEventFacts,
    "the pending Stauchness result is the same public fact for all viewers");
  const choice = sourceView.currentAction.triggerOptions.find((option) => option.effectId === "xiahou_dun_ganglie");
  assert.equal(choice.description, "The Judgement is not a Heart. Choose one: discard exactly 2 cards from your hand, or take 1 damage from Xiahou Dun. Equipment and Judgement Zone cards cannot be discarded for this choice.");
  assert.deepEqual(choice.selection.choices.map((entry) => entry.id), ["discard_two", "take_damage"]);
  assert.equal(choice.selection.choices[0].label, "Discard exactly 2 cards from your hand");
  assert.equal(choice.selection.cardCountByChoice.discard_two, 2);
  assert.deepEqual(choice.selection.eligibleHandKeys, ["hand:0", "hand:1"]);
  assert.deepEqual(targetView.currentAction.triggerOptions, [], "the mandatory source choice is not projected to Xiahou Dun");
  const discarded = await requestAndSettle("trigger", { code: resolved.code, token: resolved.sourceMember.token, providerId: "xiahou_dun_ganglie", choice: "discard_two", cardKeys: ["hand:0", "hand:1"] });
  assert.equal(discarded.status, 200, JSON.stringify(discarded.data));
  assert.equal(discarded.data.room.phase, "play-struck");
  const discardedStauchness = stauchnessNarration(discarded.data.room);
  assert.equal(discardedStauchness.narration?.headline,
    `${resolved.target.name} used Stauchness, causing ${resolved.source.name} to discard 2 Hand cards.`);
  assert.equal(discardedStauchness.fact.rootEventId, attackRoot?.id);
  assert.deepEqual(discardedStauchness.narration?.headlineSegments?.filter((segment) => segment.kind === "player").map((segment) => segment.playerId),
    [resolved.target.id, resolved.source.id]);
  assert.doesNotMatch(JSON.stringify(discardedStauchness.fact.committedOutcome), /ganglie-cost|private-card-id/,
    "public outcome proof contains counts and zones, never private card identities");
  const stauchnessCost = discarded.data.room.timeline.find((event) => event.type === "cards" && event.cards.some((item) => item.id === "dodge-ganglie-cost-a"));
  assert.equal(stauchnessCost?.id, discardedStauchness.fact.eventId);
  assert.equal(stauchnessCost?.resolutionId, discardedStauchness.fact.resolutionId,
    "the public outcome is projected from the committed cost event's resolution identity");
  assert.equal(stauchnessCost.publicCardEffects?.[0]?.effectId, "xiahou_dun_ganglie");
  assert.equal(stauchnessCost.publicCardEffects?.[0]?.activationOwnerId, resolved.target.id, "Xiahou Dun owns the skill activation");
  assert.deepEqual(stauchnessCost.publicCardEffects?.[0]?.materials.map(({ cardId, ownerId, fromZone, toZone }) => ({ cardId, ownerId, fromZone, toZone })), [
    { cardId: "dodge-ganglie-cost-a", ownerId: resolved.source.id, fromZone: "HAND", toZone: "DISCARD" },
    { cardId: "peach-ganglie-cost-b", ownerId: resolved.source.id, fromZone: "HAND", toZone: "DISCARD" },
  ], "the damage source owns the two paid cards even though Xiahou Dun activated Stauchness");
  assert.equal(stauchnessCost.publicCardEffects?.[0]?.rootEventId, attackRoot?.id);
  const publicDiscardSettlements = normalizePublicDiscardSettlements({
    timeline: discarded.data.room.timeline,
    publicCardEffects: discarded.data.room.presentationV2.publicCardEffects,
    dismantleSettlements: discarded.data.room.presentationV2.dismantleSettlements,
    publicEventFacts: [
      ...(discarded.data.room.presentationSnapshot.publicEventFacts ?? []),
      ...(discarded.data.room.presentationSnapshot.retainedPublicEventFacts ?? []),
    ],
  });
  const stauchnessDiscard = publicDiscardSettlements.filter((settlement) => settlement.eventId === stauchnessCost.id);
  assert.equal(stauchnessDiscard.length, 1, "the committed two-card Stauchness cost has one canonical public settlement");
  assert.equal(stauchnessDiscard[0].presentation, "eligible");
  assert.deepEqual(stauchnessDiscard[0].materials.map(({ physicalCardId, ownerId, fromZone, toZone }) => ({ physicalCardId, ownerId, fromZone, toZone })), [
    { physicalCardId: "dodge-ganglie-cost-a", ownerId: resolved.source.id, fromZone: "HAND", toZone: "DISCARD" },
    { physicalCardId: "peach-ganglie-cost-b", ownerId: resolved.source.id, fromZone: "HAND", toZone: "DISCARD" },
  ]);
  const stauchnessDiscardCopy = publicDiscardSettlementCopyForFacts({
    settlement: stauchnessDiscard[0], players: discarded.data.room.players,
    publicEventFacts: [
      ...(discarded.data.room.presentationSnapshot.publicEventFacts ?? []),
      ...(discarded.data.room.presentationSnapshot.retainedPublicEventFacts ?? []),
    ],
  });
  const stauchnessCardList = stauchnessCost.cards.map(({ kind, rank, suit }) => `[${rank}${suit} ${cardDefinition(kind).name}]`).join(" · ");
  assert.equal(stauchnessDiscardCopy?.headline,
    `${resolved.target.name} used Stauchness, causing ${resolved.source.name} to discard 2 cards: ${stauchnessCardList}.`,
    "the actual committed identities, true activator and material owner feed one detailed public H4 copy");
  const observerDiscardedView = (await state(resolved.code, resolved.members[3].token)).data;
  const observerStauchnessDiscard = normalizePublicDiscardSettlements({
    timeline: observerDiscardedView.timeline,
    publicCardEffects: observerDiscardedView.presentationV2.publicCardEffects,
    dismantleSettlements: observerDiscardedView.presentationV2.dismantleSettlements,
    publicEventFacts: [
      ...(observerDiscardedView.presentationSnapshot.publicEventFacts ?? []),
      ...(observerDiscardedView.presentationSnapshot.retainedPublicEventFacts ?? []),
    ],
  }).find((settlement) => settlement.eventId === stauchnessCost.id);
  assert.deepEqual(observerStauchnessDiscard, stauchnessDiscard[0], "the exact public settlement is identical in an observer projection");
  assert.equal(publicDiscardSettlementCopyForFacts({
    settlement: observerStauchnessDiscard, players: observerDiscardedView.players,
    publicEventFacts: [
      ...(observerDiscardedView.presentationSnapshot.publicEventFacts ?? []),
      ...(observerDiscardedView.presentationSnapshot.retainedPublicEventFacts ?? []),
    ],
  })?.headline, stauchnessDiscardCopy?.headline, "observers receive the same detailed public H4 copy");
  assert.equal(discarded.data.room.players.find((player) => player.id === resolved.target.id).hp, 2);
  assert.equal(JSON.parse(query(`SELECT hand_json FROM players WHERE id=${quote(resolved.source.id)}`)).length, 0);
  for (const id of ["dodge-ganglie-spade-judge", "dodge-ganglie-cost-a", "peach-ganglie-cost-b"]) assert.ok(discardIds(resolved.code).includes(id), `${id} is conserved in discard`);
  assert.equal(discarded.data.room.log.filter((entry) => /takes 1 damage\./.test(entry)).length, 1);
});

test("real Judgement replacement rejects stale and duplicate submissions without a second causal frame", { timeout: 30_000 }, async () => {
  const game = await openGanglieAttack({ judge: { ...card("Dodge", "judgement-race-original"), suit: "♠", rank: "9" } });
  const sima = game.room.players.find((player) => player.name === "Bob");
  const simaMember = game.members.find((member) => member.name === "Bob");
  assert.ok(sima && simaMember);
  sql(`UPDATE players SET hero='simayi' WHERE id=${quote(sima.id)}`);
  const replacement = { ...card("Dodge", "judgement-race-replacement"), suit: "♠", rank: "7" };
  setHand(sima.id, [replacement], 3, 3);
  const opened = await requestAndSettle("trigger", { code: game.code, token: game.targetMember.token, providerId: "xiahou_dun_ganglie" });
  assert.equal(opened.status, 200, JSON.stringify(opened.data));
  const revealed = await state(game.code, simaMember.token);
  assert.equal(revealed.data.currentAction.triggerEvent, "judgement_revealed");
  const originalJudgement = revealed.data.timeline.find((event) => event.type === "card" && event.action === "reveal" && event.judgement === true);
  assert.equal(originalJudgement?.card.id, "dodge-judgement-race-original");
  const openJudgementPresentation = revealed.data.presentationSnapshot?.publicJudgementPresentations ?? [];
  assert.equal(openJudgementPresentation.length, 1, "the public original reveal has one typed provisional presentation");
  assert.equal(openJudgementPresentation[0].judgementId, originalJudgement?.id);
  assert.equal(openJudgementPresentation[0].originatingAction?.eventId, originalJudgement?.publicFact?.rootEventId,
    "the public Judgement fact preserves the exact committed Attack root separately from the reveal event");
  assert.ok(openJudgementPresentation[0].originatingAction?.resolutionId,
    "the originating action keeps its own committed resolution identity");
  assert.equal(openJudgementPresentation[0].status, "PROVISIONAL");
  assert.equal(openJudgementPresentation[0].replacement, undefined);
  assert.doesNotMatch(openJudgementPresentation[0].copy.message, /\b(?:Not )?Match\.$/,
    "a replaceable original result is not narrated as final");
  assert.doesNotMatch(JSON.stringify(revealed.data.presentationSnapshot), new RegExp(replacement.id),
    "the public snapshot does not expose the unconfirmed Hand card identity");
  const originalFact = [...(revealed.data.presentationSnapshot?.publicEventFacts ?? []), ...(revealed.data.presentationSnapshot?.retainedPublicEventFacts ?? [])]
    .find((fact) => fact.eventId === originalJudgement?.id);
  assert.ok(originalFact, "the genuine original reveal owns a public H4 fact");
  const originalNarration = derivePublicInteractionNarration({
    snapshot: revealed.data.presentationSnapshot,
    players: revealed.data.players,
    rootEventId: originalFact.rootEventId,
    interactionId: originalFact.identity.interactionId,
    rootFrameId: originalFact.identity.rootFrameId,
    eventId: originalFact.eventId,
  });
  assert.equal(originalNarration?.headline, `${game.target.name} used Stauchness. Judgement: [9♠].`);
  assert.deepEqual(originalNarration?.headlineSegments?.filter((segment) => segment.kind === "player").map((segment) => segment.playerId), [game.target.id]);
  const otherViewer = (await state(game.code, game.targetMember.token)).data;
  assert.deepEqual(otherViewer.presentationSnapshot.publicEventFacts, revealed.data.presentationSnapshot.publicEventFacts,
    "the committed original Judgement fact is public and identical for every viewer");
  assert.deepEqual(otherViewer.presentationSnapshot.publicJudgementPresentations, openJudgementPresentation,
    "the provisional Judgement proof is identical for all viewers");
  const root = revealed.data.causalEnvelope;
  const pendingBefore = query(`SELECT pending_json FROM rooms WHERE code=${quote(game.code)}`);
  const staleContext = { actionRevision: revealed.data.actionRevision - 1, meId: sima.id, phase: "response", pendingKind: "trigger", actorId: sima.id };
  const stale = await request("trigger", { code: game.code, token: simaMember.token, providerId: "sima_yi_guicai", cardId: replacement.id, context: staleContext });
  assert.equal(stale.status, 409, JSON.stringify(stale.data));
  assert.equal(stale.data.stale, true);
  assert.equal(query(`SELECT pending_json FROM rooms WHERE code=${quote(game.code)}`), pendingBefore);
  assert.equal(query(`SELECT json_array_length(hand_json) FROM players WHERE id=${quote(sima.id)}`), "1");

  const context = { actionRevision: revealed.data.actionRevision, meId: sima.id, phase: "response", pendingKind: "trigger", actorId: sima.id };
  const results = await Promise.all([
    request("trigger", { code: game.code, token: simaMember.token, providerId: "sima_yi_guicai", cardId: replacement.id, context }),
    request("trigger", { code: game.code, token: simaMember.token, providerId: "sima_yi_guicai", cardId: replacement.id, context }),
  ]);
  assert.equal(results.filter((result) => result.status === 200).length, 1, JSON.stringify(results));
  assert.equal(results.filter((result) => result.status === 409 && result.data.stale).length, 1, JSON.stringify(results));
  const after = await state(game.code, simaMember.token);
  const replacedJudgementPresentation = after.data.presentationSnapshot?.publicJudgementPresentations ?? [];
  assert.equal(replacedJudgementPresentation.length, 2, "the replacement appends one final stage to the exact original Judgement identity");
  assert.deepEqual(replacedJudgementPresentation.map((entry) => entry.phase), ["ORIGINAL", "REPLACEMENT"]);
  assert.ok(replacedJudgementPresentation.every((entry) => entry.originatingAction?.eventId === openJudgementPresentation[0].originatingAction?.eventId
    && entry.originatingAction?.resolutionId === openJudgementPresentation[0].originatingAction?.resolutionId),
  "both public stages stay linked to the same real source action");
  assert.equal(replacedJudgementPresentation[0].judgementId, originalJudgement?.id);
  assert.equal(replacedJudgementPresentation[0].status, "PROVISIONAL");
  assert.equal(replacedJudgementPresentation[1].judgementId, originalJudgement?.id);
  assert.equal(replacedJudgementPresentation[1].eventId, replacedJudgementPresentation[1].replacement.eventId);
  assert.equal(replacedJudgementPresentation[1].status, "FINAL");
  assert.equal(replacedJudgementPresentation[1].replacement.physicalCardId, replacement.id);
  assert.equal(replacedJudgementPresentation[1].copy.message,
    `${game.target.name} used Stauchness. Judgement: [9♠].\n${sima.name} used Necromancy to replace the Judgement card with [7♠]. Match.`);
  assert.equal(after.data.causalEnvelope.interactionId, root.interactionId);
  assert.equal(after.data.causalEnvelope.activeFrameId, root.activeFrameId);
  assert.equal(after.data.causalEnvelope.frames.length, root.frames.length);
  assert.equal(query(`SELECT json_array_length(hand_json) FROM players WHERE id=${quote(sima.id)}`), "0");
  assert.equal(discardIds(game.code).filter((id) => id === replacement.id).length, 1);
});

test("declining Necromancy finalizes only the original public Judgement and preserves the unused Hand card", { timeout: 30_000 }, async () => {
  const game = await openGanglieAttack({ judge: { ...card("Dodge", "judgement-decline-original"), suit: "♥", rank: "2" } });
  const sima = game.room.players.find((player) => player.name === "Bob");
  const simaMember = game.members.find((member) => member.name === "Bob");
  assert.ok(sima && simaMember);
  sql(`UPDATE players SET hero='simayi' WHERE id=${quote(sima.id)}`);
  const heldCard = { ...card("Peach", "judgement-decline-unused"), suit: "♣", rank: "Q" };
  setHand(sima.id, [heldCard], 3, 3);
  const opened = await requestAndSettle("trigger", { code: game.code, token: game.targetMember.token, providerId: "xiahou_dun_ganglie" });
  assert.equal(opened.status, 200, JSON.stringify(opened.data));
  const pending = (await state(game.code, simaMember.token)).data;
  const before = pending.presentationSnapshot?.publicJudgementPresentations ?? [];
  assert.equal(before.length, 1);
  assert.equal(before[0].status, "PROVISIONAL");
  assert.equal(before[0].replacement, undefined);
  assert.doesNotMatch(JSON.stringify(pending.presentationSnapshot), new RegExp(heldCard.id));

  const declined = await requestAndSettle("decline_trigger", { code: game.code, token: simaMember.token });
  assert.equal(declined.status, 200, JSON.stringify(declined.data));
  const final = declined.data.room.presentationSnapshot?.publicJudgementPresentations ?? [];
  assert.equal(final.length, 1, "skip finalizes the existing reveal instead of inventing a replacement");
  assert.equal(final[0].phase, "ORIGINAL");
  assert.equal(final[0].status, "FINAL");
  assert.equal(final[0].effectiveCard.id, "dodge-judgement-decline-original");
  assert.equal(final[0].judgementStatus, "unsatisfied");
  assert.equal(JSON.parse(query(`SELECT hand_json FROM players WHERE id=${quote(sima.id)}`)).some((entry) => entry.id === heldCard.id), true);
});

test("Stauchness uses the final Guicai card, limits discard choices, and resumes when its source disappears", { timeout: 30_000 }, async () => {
  const game = await openGanglieAttack({
    judge: { ...card("Dodge", "ganglie-heart-judge"), suit: "♥", rank: "2" },
    sourceCards: [card("Attack", "ganglie-heart-attack"), card("Peach", "ganglie-heart-extra")],
  });
  const accepted = await requestAndSettle("trigger", { code: game.code, token: game.targetMember.token, providerId: "xiahou_dun_ganglie" });
  assert.equal(accepted.status, 200, JSON.stringify(accepted.data));
  assert.equal(accepted.data.room.phase, "play-struck");
  assert.ok(accepted.data.room.log.some((entry) => entry.includes(`${game.target.name} used Stauchness. Judgement: 2♥ — no effect`)));
  assert.equal(stauchnessNarration(accepted.data.room).narration?.headline,
    `${game.target.name} used Stauchness. Judgement: [2♥] — no effect.`);
  assert.ok(discardIds(game.code).includes("dodge-ganglie-heart-judge"));

  const guicai = await openGanglieAttack({ judge: { ...card("Dodge", "ganglie-guicai-original"), suit: "♠", rank: "9" } });
  const sima = guicai.room.players.find((player) => player.name === "Bob");
  const simaMember = guicai.members.find((member) => member.name === "Bob");
  assert.ok(sima && simaMember);
  sql(`UPDATE players SET hero='simayi' WHERE id=${quote(sima.id)}`);
  const replacement = { ...card("Dodge", "ganglie-guicai-replacement"), suit: "♥", rank: "Q" };
  setHand(sima.id, [replacement], 3, 3);
  const acceptedForGuicai = await requestAndSettle("trigger", { code: guicai.code, token: guicai.targetMember.token, providerId: "xiahou_dun_ganglie" });
  assert.equal(acceptedForGuicai.status, 200, JSON.stringify(acceptedForGuicai.data));
  const guicaiView = (await state(guicai.code, simaMember.token)).data;
  assert.equal(guicaiView.currentAction.triggerEvent, "judgement_revealed");
  assert.deepEqual(guicaiView.currentAction.triggerOptions.map((option) => option.effectId), ["sima_yi_guicai"]);
  const replaced = await requestAndSettle("trigger", { code: guicai.code, token: simaMember.token, providerId: "sima_yi_guicai", cardId: replacement.id });
  assert.equal(replaced.status, 200, JSON.stringify(replaced.data));
  assert.equal(replaced.data.room.phase, "play-struck");
  assert.ok(discardIds(guicai.code).includes("dodge-ganglie-guicai-original"));
  assert.ok(discardIds(guicai.code).includes("dodge-ganglie-guicai-replacement"));

  const guicaiToNonHeart = await openGanglieAttack({ judge: { ...card("Dodge", "ganglie-guicai-heart-original"), suit: "♥", rank: "2" } });
  const sima2 = guicaiToNonHeart.room.players.find((player) => player.name === "Bob");
  const simaMember2 = guicaiToNonHeart.members.find((member) => member.name === "Bob");
  assert.ok(sima2 && simaMember2);
  sql(`UPDATE players SET hero='simayi' WHERE id=${quote(sima2.id)}`);
  const replacementBlack = { ...card("Dodge", "ganglie-guicai-black-replacement"), suit: "♠", rank: "7" };
  setHand(sima2.id, [replacementBlack], 3, 3);
  const acceptedForReverseGuicai = await requestAndSettle("trigger", { code: guicaiToNonHeart.code, token: guicaiToNonHeart.targetMember.token, providerId: "xiahou_dun_ganglie" });
  assert.equal(acceptedForReverseGuicai.status, 200, JSON.stringify(acceptedForReverseGuicai.data));
  const reverseWindow = await state(guicaiToNonHeart.code, simaMember2.token);
  assert.equal(reverseWindow.data.currentAction.triggerEvent, "judgement_revealed");
  const reverseReplaced = await requestAndSettle("trigger", { code: guicaiToNonHeart.code, token: simaMember2.token, providerId: "sima_yi_guicai", cardId: replacementBlack.id });
  assert.equal(reverseReplaced.status, 200, JSON.stringify(reverseReplaced.data));
  assert.equal(reverseReplaced.data.room.currentAction.actorId, guicaiToNonHeart.source.id);
  const replacedStauchness = stauchnessNarration(reverseReplaced.data.room);
  assert.equal(replacedStauchness.narration?.headline,
    `${guicaiToNonHeart.target.name} used Stauchness. Judgement: [7♠] — not a Heart.`,
    "after Necromancy commits, H4 names the actual effective card and only then states its result");
  const reverseChoice = await requestAndSettle("trigger", { code: guicaiToNonHeart.code, token: guicaiToNonHeart.sourceMember.token, providerId: "xiahou_dun_ganglie", choice: "take_damage" });
  assert.equal(reverseChoice.status, 200, JSON.stringify(reverseChoice.data));
  assert.equal(reverseChoice.data.room.players.find((player) => player.id === guicaiToNonHeart.source.id).hp, 3);
  assert.ok(discardIds(guicaiToNonHeart.code).includes("dodge-ganglie-guicai-heart-original"));
  assert.ok(discardIds(guicaiToNonHeart.code).includes("dodge-ganglie-guicai-black-replacement"));

  const sourceGone = await openGanglieAttack({ judge: { ...card("Dodge", "ganglie-source-gone"), suit: "♠", rank: "4" } });
  sql(`UPDATE players SET alive=0, hp=0, hand_json='[]' WHERE id=${quote(sourceGone.source.id)}`);
  sql(`UPDATE rooms SET turn_seat=${sourceGone.target.seat} WHERE code=${quote(sourceGone.code)}`);
  const resumed = await requestAndSettle("decline_trigger", { code: sourceGone.code, token: sourceGone.targetMember.token });
  assert.equal(resumed.status, 200, JSON.stringify(resumed.data));
  assert.equal(resumed.data.room.phase, "play-struck");
  assert.equal(resumed.data.room.pending, null);
});

test("host test flow projects Stauchness privately through the generic currentAction", { timeout: 30_000 }, async () => {
  const quick = await createTestGame();
  const { token, room } = quick.data;
  const [source, target, ...others] = room.players;
  sql(`UPDATE players SET hero='cao-cao' WHERE id=${quote(source.id)}`);
  sql(`UPDATE players SET hero='xiahou-dun' WHERE id=${quote(target.id)}`);
  setHand(source.id, [card("Attack", "quick-ganglie-attack"), card("Dodge", "quick-ganglie-cost-a"), card("Peach", "quick-ganglie-cost-b")], 4, 4);
  setHand(target.id, [], 3, 3);
  for (const player of others) setHand(player.id, [], 3, 3);
  setTurn(room.code, source.seat);
  setDeck(room.code, [{ ...card("Dodge", "quick-ganglie-judge"), suit: "♠", rank: "7" }]);
  const started = await requestAndSettle("play_card", { code: room.code, token, cardId: "attack-quick-ganglie-attack", targetId: target.id });
  assert.equal(started.status, 200, JSON.stringify(started.data));
  assert.equal(started.data.room.currentAction.actorId, target.id);
  const accepted = await requestAndSettle("trigger", { code: room.code, token, providerId: "xiahou_dun_ganglie" });
  assert.equal(accepted.status, 200, JSON.stringify(accepted.data));
  const committedFacts = [...accepted.data.room.presentationSnapshot.publicEventFacts, ...(accepted.data.room.presentationSnapshot.retainedPublicEventFacts ?? [])];
  assert.ok(committedFacts.some((fact) => fact.category === "SKILL_USED" && fact.label?.includes("Stauchness")), "committed Judgement start has a generic public skill fact");
  assert.equal(accepted.data.room.currentAction.actorId, source.id);
  assert.equal(accepted.data.room.currentAction.triggerEvent, "damage_suffered");
  assert.ok(accepted.data.room.currentAction.presentation?.readyAfterEventId);
  assert.deepEqual(accepted.data.room.currentAction.triggerOptions[0].selection.eligibleHandKeys, ["hand:0", "hand:1"]);
  assert.deepEqual(accepted.data.room.players.map((player) => player.handCards), [[], [], [], []], "host test flow never projects other hands");
  assert.deepEqual(accepted.data.room.myHand.map((held) => held.id), ["dodge-quick-ganglie-cost-a", "peach-quick-ganglie-cost-b"]);
});

test("Sima Yi Retaliation uses the generic target-card picker with privacy and exact card conservation", { timeout: 30_000 }, async () => {
  const sourceHandCards = [card("Peach", "fankui-source-hidden-a"), card("Dodge", "fankui-source-hidden-b")];
  const game = await openFankuiAttack({ sourceCards: [card("Attack", "fankui-attack"), ...sourceHandCards] });
  const pending = (await state(game.code, game.targetMember.token)).data;
  const option = pending.currentAction.triggerOptions.find((entry) => entry.effectId === "sima_yi_fankui");
  assert.deepEqual(option.selection, { type: "target_cards", targetId: game.source.id, min: 1, max: 1, eligibleKeys: ["hand:0", "hand:1"] });
  const exposesPrivateScalar = (value, expected) => {
    if (value === expected) return true;
    if (Array.isArray(value)) return value.some((entry) => exposesPrivateScalar(entry, expected));
    if (value && typeof value === "object") return Object.values(value).some((entry) => exposesPrivateScalar(entry, expected));
    return false;
  };
  for (const hidden of sourceHandCards) {
    for (const privateValue of [hidden.id, hidden.kind, hidden.suit, hidden.rank]) {
      assert.equal(exposesPrivateScalar(pending.currentAction, privateValue), false, `CurrentAction does not expose hidden value ${privateValue}`);
    }
  }
  assert.deepEqual(pending.myHand, [], "Sima Yi starts with an empty hand");
  assert.equal(pending.players.find((player) => player.id === game.source.id).handCards.length, 0, "Sima Yi does not receive source hand identities");
  const unrelated = (await state(game.code, game.members[2].token)).data;
  assert.equal(unrelated.players.find((player) => player.id === game.source.id).handCards.length, 0, "unrelated viewers do not receive source hand identities");

  const obtained = await requestAndSettle("trigger", { code: game.code, token: game.targetMember.token, providerId: "sima_yi_fankui", cardKeys: ["hand:1"] });
  assert.equal(obtained.status, 200, JSON.stringify(obtained.data));
  assert.equal(obtained.data.room.phase, "play-struck");
  const publicOutcome = obtained.data.room.presentationSnapshot.retainedPublicEvent;
  assert.equal(publicOutcome?.category, "SKILL_USED");
  assert.equal(publicOutcome?.label, "Retaliation");
  assert.equal(publicOutcome?.effect?.label, undefined, "a hidden Hand card has no public face label");
  assert.equal(JSON.stringify(publicOutcome).includes("fankui-source-hidden-b"), false);
  assert.ok(obtained.data.room.presentationSnapshot.retainedPublicEventFacts?.some((fact) => fact.category === "DAMAGE_APPLIED"), "the committed damage remains linked to the skill outcome");
  const privateArrival = obtained.data.room.timeline.find((event) => event.type === "card" && event.privateHandTransfer?.cardId === "dodge-fankui-source-hidden-b");
  assert.equal(privateArrival?.privateHandTransfer?.semantics, "PRIVATE_PROVEN");
  assert.equal(privateArrival?.privateHandTransfer?.sourceZone, "hand");
  assert.equal(privateArrival?.privateHandTransfer?.sourcePlayerId, game.source.id);
  assert.equal(privateArrival?.privateHandTransfer?.recipientId, game.target.id);
  assert.equal(privateArrival?.privateHandTransfer?.destinationZone, "hand");
  assert.equal(privateArrival?.privateHandTransfer?.transferId, privateArrival?.id);
  assert.ok(privateArrival?.privateHandTransfer?.revealUntil > privateArrival?.privateHandTransfer?.committedAt);
  const observerOutcome = (await state(game.code, game.members[2].token)).data.presentationSnapshot.retainedPublicEvent;
  assert.deepEqual(observerOutcome, publicOutcome, "the committed public outcome is identical for another viewer");
  const observerAfterTransfer = (await state(game.code, game.members[2].token)).data;
  assert.equal(observerAfterTransfer.timeline.some((event) => event.privateHandTransfer), false, "the private transfer receipt is absent from observer timelines");
  assert.equal(JSON.stringify(observerAfterTransfer).includes("dodge-fankui-source-hidden-b"), false, "observer payload does not expose the transferred hidden card identity");
  const obtainedId = obtained.data.room.myHand[0]?.id;
  assert.equal(obtainedId, "dodge-fankui-source-hidden-b", "hand:1 obtains the exact card occupying that position");
  const remainingSourceIds = JSON.parse(query(`SELECT hand_json FROM players WHERE id=${quote(game.source.id)}`)).map((held) => held.id);
  assert.deepEqual(remainingSourceIds, ["peach-fankui-source-hidden-a"], "only the selected source Hand position is removed");
  assert.equal(query(`SELECT COUNT(*) FROM players,json_each(players.hand_json) WHERE players.id=${quote(game.target.id)} AND json_extract(value,'$.id')='${obtainedId}'`), "1");
  assert.equal(obtained.data.room.log.filter((entry) => /obtains a card from Host with Retaliation/.test(entry)).length, 1);
});

test("Retaliation rejects forged or stale out-of-range Hand positions", { timeout: 30_000 }, async () => {
  const forged = await openFankuiAttack({ sourceCards: [card("Attack", "fankui-forged-attack"), card("Peach", "fankui-forged-hidden")] });
  const forgedResult = await requestAndSettle("trigger", { code: forged.code, token: forged.targetMember.token, providerId: "sima_yi_fankui", cardKeys: ["hand:1"] });
  assert.equal(forgedResult.status, 409);
  assert.equal(forgedResult.data.stale, true);
  assert.equal(forgedResult.data.room.pending.kind, "trigger");

  const stale = await openFankuiAttack({ sourceCards: [card("Attack", "fankui-stale-attack"), card("Peach", "fankui-stale-hidden-a"), card("Dodge", "fankui-stale-hidden-b")] });
  setHand(stale.source.id, [card("Peach", "fankui-stale-hidden-a")], 4, 4);
  const staleResult = await requestAndSettle("trigger", { code: stale.code, token: stale.targetMember.token, providerId: "sima_yi_fankui", cardKeys: ["hand:1"] });
  assert.equal(staleResult.status, 409);
  assert.equal(staleResult.data.stale, true);
  assert.equal(staleResult.data.room.pending.kind, "trigger");

  const vanished = await openFankuiAttack({ sourceCards: [card("Attack", "fankui-vanished-attack"), card("Peach", "fankui-vanished-hidden")] });
  setHand(vanished.source.id, [], 4, 4);
  const vanishedResult = await requestAndSettle("trigger", { code: vanished.code, token: vanished.targetMember.token, providerId: "sima_yi_fankui", cardKeys: ["hand:0"] });
  assert.equal(vanishedResult.status, 409);
  assert.equal(vanishedResult.data.stale, true);
  assert.equal(vanishedResult.data.room.pending.kind, "trigger");
});

test("Retaliation retains the legacy grouped Hand key for older callers", { timeout: 30_000 }, async () => {
  const sourceHandCards = [card("Peach", "fankui-legacy-hidden-a"), card("Dodge", "fankui-legacy-hidden-b")];
  const game = await openFankuiAttack({ sourceCards: [card("Attack", "fankui-legacy-attack"), ...sourceHandCards] });
  const pending = (await state(game.code, game.targetMember.token)).data;
  assert.deepEqual(pending.currentAction.triggerOptions[0].selection.eligibleKeys, ["hand:0", "hand:1"], "new actions expose individual positions");
  const obtained = await requestAndSettle("trigger", { code: game.code, token: game.targetMember.token, providerId: "sima_yi_fankui", cardKeys: ["hand"] });
  assert.equal(obtained.status, 200, JSON.stringify(obtained.data));
  assert.ok(sourceHandCards.some((held) => held.id === obtained.data.room.myHand[0]?.id), "the legacy grouped key still resolves to one live source Hand card");
  const remainingSourceIds = JSON.parse(query(`SELECT hand_json FROM players WHERE id=${quote(game.source.id)}`)).map((held) => held.id);
  assert.equal(remainingSourceIds.length, 1);
  assert.equal(query(`SELECT COUNT(*) FROM players,json_each(players.hand_json) WHERE players.id=${quote(game.target.id)} AND json_extract(value,'$.id')='${obtained.data.room.myHand[0].id}'`), "1");
});

test("Retaliation can obtain an eligible public Equipment or Judgement card and ignores empty sources", { timeout: 30_000 }, async () => {
  const shield = card("NioShield", "fankui-public-equipment");
  const equipmentGame = await openFankuiAttack({ sourceCards: [card("Attack", "fankui-equipment-attack")], sourceEquipment: { armor: shield } });
  const equipmentState = (await state(equipmentGame.code, equipmentGame.targetMember.token)).data;
  assert.deepEqual(equipmentState.currentAction.triggerOptions[0].selection.eligibleKeys, [shield.id]);
  const tookEquipment = await requestAndSettle("trigger", { code: equipmentGame.code, token: equipmentGame.targetMember.token, providerId: "sima_yi_fankui", cardKeys: [shield.id] });
  assert.equal(tookEquipment.status, 200, JSON.stringify(tookEquipment.data));
  assert.equal(tookEquipment.data.room.presentationSnapshot.retainedPublicEvent?.effect?.label, "Nio Shield", "face-up Equipment may be named in the public outcome");
  assert.deepEqual(tookEquipment.data.room.myHand.map((held) => held.id), [shield.id]);
  const equipmentSettlement = tookEquipment.data.room.presentationSnapshot.cardAcquisitionSettlements.filter((entry) => entry.acquisitionKind === "RETALIATION");
  assert.equal(equipmentSettlement.length, 1);
  assert.deepEqual(equipmentSettlement[0], {
    semantics: "PROVEN", acquisitionKind: "RETALIATION", providerId: "sima_yi_fankui",
    eventId: tookEquipment.data.room.timeline.find((event) => event.publicCardAcquisitionSettlement)?.id,
    rootEventId: equipmentSettlement[0].rootEventId, rootResolutionId: equipmentSettlement[0].rootResolutionId,
    interactionId: equipmentSettlement[0].interactionId, rootFrameId: equipmentSettlement[0].rootFrameId,
    sourceId: equipmentGame.target.id, targetId: equipmentGame.source.id, outcome: "RETALIATION_RESOLVED",
    sourceZone: "equipment", affectedCardOwnerId: equipmentGame.source.id,
    destinationZone: "hand", destinationOwnerId: equipmentGame.target.id, affectedCardFace: shield,
  });
  assert.equal(tookEquipment.data.room.timeline.find((event) => event.type === "card" && event.privateHandTransfer)?.privateHandTransfer?.sourceZone, "equipment");
  const equipmentObserver = (await state(equipmentGame.code, equipmentGame.members[2].token)).data;
  assert.deepEqual(equipmentObserver.presentationSnapshot.cardAcquisitionSettlements, tookEquipment.data.room.presentationSnapshot.cardAcquisitionSettlements);
  assert.equal(equipmentObserver.timeline.some((event) => event.privateHandTransfer), false);
  assert.deepEqual(tookEquipment.data.room.players.find((player) => player.id === equipmentGame.source.id).equipmentCards, []);

  const delayed = card("Lightning", "fankui-public-judgement");
  const judgementGame = await openFankuiAttack({ sourceCards: [card("Attack", "fankui-judgement-attack")], sourceJudgement: [delayed] });
  const judgementState = (await state(judgementGame.code, judgementGame.targetMember.token)).data;
  assert.deepEqual(judgementState.currentAction.triggerOptions[0].selection.eligibleKeys, [delayed.id]);
  const tookJudgement = await requestAndSettle("trigger", { code: judgementGame.code, token: judgementGame.targetMember.token, providerId: "sima_yi_fankui", cardKeys: [delayed.id] });
  assert.equal(tookJudgement.status, 200, JSON.stringify(tookJudgement.data));
  assert.deepEqual(tookJudgement.data.room.myHand.map((held) => held.id), [delayed.id]);
  const judgementSettlement = tookJudgement.data.room.presentationSnapshot.cardAcquisitionSettlements.filter((entry) => entry.acquisitionKind === "RETALIATION");
  assert.equal(judgementSettlement.length, 1);
  assert.deepEqual(judgementSettlement[0], {
    semantics: "PROVEN", acquisitionKind: "RETALIATION", providerId: "sima_yi_fankui",
    eventId: tookJudgement.data.room.timeline.find((event) => event.publicCardAcquisitionSettlement)?.id,
    rootEventId: judgementSettlement[0].rootEventId, rootResolutionId: judgementSettlement[0].rootResolutionId,
    interactionId: judgementSettlement[0].interactionId, rootFrameId: judgementSettlement[0].rootFrameId,
    sourceId: judgementGame.target.id, targetId: judgementGame.source.id, outcome: "RETALIATION_RESOLVED",
    sourceZone: "judgement", affectedCardOwnerId: null,
    destinationZone: "hand", destinationOwnerId: judgementGame.target.id, affectedCardFace: delayed,
  });
  assert.equal(tookJudgement.data.room.timeline.find((event) => event.type === "card" && event.privateHandTransfer)?.privateHandTransfer?.sourceZone, "judgement");
  const judgementObserver = (await state(judgementGame.code, judgementGame.members[2].token)).data;
  assert.deepEqual(judgementObserver.presentationSnapshot.cardAcquisitionSettlements, tookJudgement.data.room.presentationSnapshot.cardAcquisitionSettlements);
  assert.deepEqual(tookJudgement.data.room.players.find((player) => player.id === judgementGame.source.id).judgementCards, []);

  const emptyGame = await openFankuiAttack({ sourceCards: [card("Attack", "fankui-empty-source")], expectReaction: false });
  const emptyState = (await state(emptyGame.code, emptyGame.targetMember.token)).data;
  assert.equal(emptyState.phase, "play-struck", JSON.stringify(emptyState));
  assert.equal(emptyState.currentAction.kind, "turn");
  assert.equal(emptyState.currentAction.triggerEvent, undefined);
});

test("Retaliation Hand acquisition keeps the public card hidden and gives only both participants a private face", { timeout: 30_000 }, async () => {
  const stolen = card("Dodge", "fankui-private-acquisition-card", "♣", "J");
  const game = await openFankuiAttack({ sourceCards: [card("Attack", "fankui-private-acquisition-root"), stolen] });
  const obtained = await requestAndSettle("trigger", { code: game.code, token: game.targetMember.token, providerId: "sima_yi_fankui", cardKeys: ["hand:0"] });
  assert.equal(obtained.status, 200, JSON.stringify(obtained.data));
  const event = obtained.data.room.timeline.find((entry) => entry.publicCardAcquisitionSettlement?.acquisitionKind === "RETALIATION");
  assert.ok(event, "the actual Retaliation settlement event is public");
  assert.equal(event.publicCardAcquisitionSettlement.sourceZone, "hand");
  assert.equal(Object.hasOwn(event.publicCardAcquisitionSettlement, "affectedCardFace"), false);
  assert.equal(JSON.stringify(event).includes(stolen.id), false);
  assert.ok(obtained.data.room.myHand.some((held) => held.id === stolen.id), "the actual card reaches Sima Yi's Hand");
  assert.equal(obtained.data.room.privateStealParticipantResult?.role, "TAKER");
  assert.equal(obtained.data.room.privateStealParticipantResult?.card?.id, stolen.id);

  const formerOwner = (await state(game.code, game.sourceMember.token)).data;
  assert.equal(formerOwner.privateStealParticipantResult?.role, "FORMER_OWNER");
  assert.equal(formerOwner.privateStealParticipantResult?.card?.id, stolen.id);
  const observer = (await state(game.code, game.members[2].token)).data;
  assert.equal(observer.privateStealParticipantResult, null);
  assert.deepEqual(observer.presentationSnapshot.cardAcquisitionSettlements, obtained.data.room.presentationSnapshot.cardAcquisitionSettlements);
  assert.equal(JSON.stringify(observer).includes(stolen.id), false, "unrelated viewers never receive the hidden card ID");
});

test("Retaliation rejects stale source cards, handles a vanished source, and has one concurrent winner", { timeout: 30_000 }, async () => {
  const stale = await openFankuiAttack();
  setHand(stale.source.id, [], 4, 4);
  const staleResult = await requestAndSettle("trigger", { code: stale.code, token: stale.targetMember.token, providerId: "sima_yi_fankui", cardKeys: ["hand:0"] });
  assert.equal(staleResult.status, 409);
  assert.equal(staleResult.data.stale, true);
  assert.equal(staleResult.data.room.pending.kind, "trigger");

  const vanished = await openFankuiAttack();
  sql(`UPDATE players SET alive=0, hp=0, hand_json='[]', equipment_json='{}', judgement_json='[]' WHERE id=${quote(vanished.source.id)}`);
  sql(`UPDATE rooms SET turn_seat=${vanished.target.seat} WHERE code=${quote(vanished.code)}`);
  const skipped = await requestAndSettle("decline_trigger", { code: vanished.code, token: vanished.targetMember.token });
  assert.equal(skipped.status, 200, JSON.stringify(skipped.data));
  assert.equal(skipped.data.room.phase, "play-struck");
  assert.equal(skipped.data.room.pending, null);

  const race = await openFankuiAttack({ sourceCards: [card("Attack", "fankui-race-attack"), card("Peach", "fankui-race-hidden")] });
  const [first, second] = await Promise.all([
    requestAndSettle("trigger", { code: race.code, token: race.targetMember.token, providerId: "sima_yi_fankui", cardKeys: ["hand:0"] }),
    requestAndSettle("trigger", { code: race.code, token: race.targetMember.token, providerId: "sima_yi_fankui", cardKeys: ["hand:0"] }),
  ]);
  assert.equal([first.status, second.status].filter((status) => status === 200).length, 1);
  const loser = [first, second].find((result) => result.status === 409);
  assert.ok(loser?.data.stale === true);
  assert.equal(query(`SELECT COUNT(*) FROM players,json_each(players.hand_json) WHERE players.id=${quote(race.target.id)} AND json_extract(value,'$.id')='peach-fankui-race-hidden'`), "1");
  assert.equal(discardIds(race.code).filter((id) => id === "peach-fankui-race-hidden").length, 0);
  assert.equal((await state(race.code, race.targetMember.token)).data.phase, "play-struck");
});

test("host test flow follows Sima Yi only while he owns the Retaliation decision", { timeout: 30_000 }, async () => {
  const started = await createTestGame();
  const { token, room } = started.data;
  const [source, sima] = room.players;
  sql(`UPDATE players SET hero='cao-cao' WHERE id=${quote(source.id)}`);
  sql(`UPDATE players SET hero='simayi' WHERE id=${quote(sima.id)}`);
  setHand(source.id, [card("Attack", "quick-fankui-attack"), card("Peach", "quick-fankui-hidden")], 4, 4);
  setHand(sima.id, [], 3, 3);
  for (const player of room.players) { setEquipment(player.id, {}); setJudgement(player.id, []); }
  for (const player of room.players.slice(2)) setHand(player.id, [], 3, 3);
  setTurn(room.code, source.seat);
  const attacked = await requestAndSettle("play_card", { code: room.code, token, cardId: "attack-quick-fankui-attack", targetId: sima.id });
  assert.equal(attacked.status, 200, JSON.stringify(attacked.data));
  assert.equal(attacked.data.room.meId, sima.id);
  assert.equal(attacked.data.room.currentAction.actorId, sima.id);
  assert.deepEqual(attacked.data.room.currentAction.triggerOptions[0].selection.eligibleKeys, ["hand:0"]);
  const obtained = await requestAndSettle("trigger", { code: room.code, token, providerId: "sima_yi_fankui", cardKeys: ["hand:0"] });
  assert.equal(obtained.status, 200, JSON.stringify(obtained.data));
  assert.equal(query(`SELECT COUNT(*) FROM players,json_each(players.hand_json) WHERE players.id=${quote(sima.id)} AND json_extract(value,'$.id')='peach-quick-fankui-hidden'`), "1");
  assert.equal(obtained.data.room.meId, source.id);
});

test("Stauchness take-damage choice enters the normal Dying flow and stale concurrent acceptance has one winner", { timeout: 30_000 }, async () => {
  const dying = await openGanglieAttack({ judge: { ...card("Dodge", "ganglie-dying-judge"), suit: "♣", rank: "5" }, sourceHp: 1, sourceCards: [card("Attack", "ganglie-dying-attack"), card("Peach", "ganglie-dying-extra")] });
  const accepted = await requestAndSettle("trigger", { code: dying.code, token: dying.targetMember.token, providerId: "xiahou_dun_ganglie" });
  assert.equal(accepted.status, 200, JSON.stringify(accepted.data));
  const sourceView = (await state(dying.code, dying.sourceMember.token)).data;
  const option = sourceView.currentAction.triggerOptions.find((entry) => entry.effectId === "xiahou_dun_ganglie");
  assert.deepEqual(option.selection.choices.map((entry) => entry.id), ["take_damage"], "one hand card cannot satisfy discard 2");
  assert.deepEqual(option.selection.eligibleHandKeys, ["hand:0"]);
  const damaged = await requestAndSettle("trigger", { code: dying.code, token: dying.sourceMember.token, providerId: "xiahou_dun_ganglie", choice: "take_damage" });
  assert.equal(damaged.status, 200, JSON.stringify(damaged.data));
  assert.equal(damaged.data.room.phase, "dying");
  assert.equal(damaged.data.room.pendingDying.targetId, dying.source.id);
  assert.equal(damaged.data.room.players.find((player) => player.id === dying.source.id).hp, 0);
  assert.ok(damaged.data.room.log.some((entry) => /takes 1 damage from Alice for Stauchness and enters Dying/.test(entry)));
  const damageStauchness = stauchnessNarration(damaged.data.room);
  assert.equal(damageStauchness.narration?.headline,
    `${dying.target.name} used Stauchness, causing ${dying.source.name} to lose 1 HP.`);
  const damageRoot = damaged.data.room.timeline.find((event) => event.type === "card" && event.card?.id === "attack-ganglie-dying-attack");
  assert.equal(damageStauchness.fact.rootEventId, damageRoot?.id);
  const damageEvent = damaged.data.room.timeline.find((event) => event.id === damageStauchness.fact.eventId);
  assert.equal(damageEvent?.resolutionId, damageStauchness.fact.resolutionId,
    "the damage fact retains its committed event resolution identity and original Attack root");

  for (let attempt = 0; attempt < 4; attempt++) {
    const race = await openGanglieAttack({ judge: { ...card("Dodge", `ganglie-race-${attempt}`), suit: "♥", rank: "2" } });
    const [first, second] = await Promise.all([
      requestAndSettle("trigger", { code: race.code, token: race.targetMember.token, providerId: "xiahou_dun_ganglie" }),
      requestAndSettle("trigger", { code: race.code, token: race.targetMember.token, providerId: "xiahou_dun_ganglie" }),
    ]);
    const results = [first, second];
    assert.equal(results.filter((result) => result.status === 200).length, 1);
    const loser = results.find((result) => result.status === 409);
    assert.ok(loser && loser.data.stale === true && loser.data.room);
    const settled = await waitForState(race.code, race.sourceMember.token, (view) => view.phase === "play-struck" && view.pending === null);
    assert.equal(settled.players.every((player) => player.handCards.length === 0), true);
    assert.equal(discardIds(race.code).filter((id) => id === `dodge-ganglie-race-${attempt}`).length, 1);
    assert.equal(settled.players.find((player) => player.id === race.target.id).hp, 2);
  }
});

test("turn engine completes repeated rounds, rejects duplicate actions, and skips defeated players", { timeout: 30_000 }, async () => {
  const game = await createHumanGame();
  const membersBySeat = game.room.players.map((player) => ({ player, member: game.members.find((member) => member.name === player.name) })).sort((a, b) => a.player.seat - b.player.seat);
  assert.ok(membersBySeat.every(({ member }) => member));
  for (const { player } of membersBySeat) setHand(player.id, [], 10, 10);
  sql(`UPDATE rooms SET deck_json=${quote(JSON.stringify(Array.from({ length: 40 }, (_, index) => card("Dodge", `round-${index}`))))}, discard_json='[]' WHERE code=${quote(game.code)}`);
  setTurn(game.code, membersBySeat[0].player.seat, "draw");

  for (let round = 0; round < 3; round++) {
    for (let index = 0; index < membersBySeat.length; index++) {
      const current = membersBySeat[index]; const next = membersBySeat[(index + 1) % membersBySeat.length];
      const before = await state(game.code, current.member.token);
      assert.equal(before.data.turnSeat, current.player.seat, `round ${round + 1} starts ${current.player.name}'s turn`); assert.equal(before.data.phase, "draw");
      const drawn = await requestAndSettle("draw", { code: game.code, token: current.member.token });
      assert.equal(drawn.status, 200); assert.equal(drawn.data.room.phase, "play"); assert.equal(drawn.data.drawnCards.length, 2);
      if (round === 0 && index === 0) {
        const receipts = drawn.data.room.timeline.filter((event) => event.type === "card" && event.privateHandTransfer && !event.initialDeal);
        assert.equal(receipts.length, 2, "a normal multi-card draw has one committed private receipt per physical card");
        assert.ok(receipts.every((event) => event.privateHandTransfer.sourceZone === "deck"
          && event.privateHandTransfer.recipientId === current.player.id
          && event.privateHandTransfer.cardId === event.card.id));
        const observer = (await state(game.code, next.member.token)).data;
        assert.equal(observer.timeline.some((event) => event.privateHandTransfer), false, "observers cannot see private draw receipts");
        assert.ok(receipts.every((event) => !JSON.stringify(observer).includes(event.card.id)));
      }
      assert.equal((await requestAndSettle("draw", { code: game.code, token: current.member.token })).status, 409, "a player cannot draw twice");
      assert.equal((await requestAndSettle("end_turn", { code: game.code, token: next.member.token })).status, 409, "the next player cannot act early");
      const ended = await requestAndSettle("end_turn", { code: game.code, token: current.member.token });
      assert.equal(ended.status, 200); assert.equal(ended.data.room.turnSeat, next.player.seat); assert.equal(ended.data.room.phase, "draw");
    }
  }

  const [playerOne, defeated, playerThree] = membersBySeat;
  sql(`UPDATE players SET alive=0, hp=0 WHERE id=${quote(defeated.player.id)}`);
  for (const { player } of membersBySeat) if (player.id !== defeated.player.id) setHand(player.id, [], 10, 10);
  setTurn(game.code, playerOne.player.seat, "play");
  const skipped = await requestAndSettle("end_turn", { code: game.code, token: playerOne.member.token });
  assert.equal(skipped.status, 200); assert.equal(skipped.data.room.turnSeat, playerThree.player.seat); assert.equal(skipped.data.room.phase, "draw");
  assert.equal((await requestAndSettle("draw", { code: game.code, token: defeated.member.token })).status, 409, "a defeated player cannot act");

  setTurn(game.code, defeated.player.seat, "draw");
  const invalidState = await requestAndSettle("draw", { code: game.code, token: defeated.member.token });
  assert.equal(invalidState.status, 409); assert.match(invalidState.data.error, /Game state check failed: The active turn does not belong to a living player/);
});

test("saved sequential Entourage publishes the current helper and original-target Dodge proof", async () => {
  const dodge = card("Dodge", "entourage-public-proof");
  const game = await openHujiaScenario({ delegateHero: "simayi", delegateCards: [dodge] });
  const invoked = await requestAndSettle("respond", { code: game.code, token: game.caoMember.token, providerId: "cao_cao_hujia", preserveResponse: true });
  const sharedStored = JSON.parse(query(`SELECT pending_json FROM rooms WHERE code=${quote(game.code)}`));
  const { sharedResponseForPlayer } = await import("../../game/shared-response-strategies.ts");
  const saved = sharedResponseForPlayer(sharedStored, { ...game.delegate, hero: "simayi", alive: true });
  saved.delegation.remainingActorIds = sharedStored.priorityPlayerIds.filter((id) => id !== game.delegate.id);
  sql(`UPDATE rooms SET pending_json=${quote(JSON.stringify(saved))} WHERE code=${quote(game.code)}`);
  invoked.data.room = (await state(game.code, game.caoMember.token)).data;
  assert.equal(invoked.status, 200, JSON.stringify(invoked.data));
  const snapshot = invoked.data.room.presentationSnapshot;
  assert.equal(snapshot.entourageDecision?.helperActorId, game.delegate.id, JSON.stringify(snapshot));
  assert.equal(snapshot.entourageDecision?.requesterId, game.cao.id);
  assert.equal(snapshot.interaction.decisionActorId, game.delegate.id);
  assert.equal(snapshot.publicNextDecision?.stageLabel, "Entourage");
  assert.ok(snapshot.publicEventFacts.some((fact) => fact.category === "SKILL_USED" && fact.label === "Entourage"));
  const observer = await state(game.code, game.sourceMember.token);
  assert.deepEqual(observer.data.presentationSnapshot.entourageDecision, snapshot.entourageDecision);
  assert.equal(JSON.stringify(snapshot.entourageDecision).includes(dodge.id), false);
  const answered = await requestAndSettle("respond", { code: game.code, token: game.delegateMember.token, providerId: "card", cardId: dodge.id });
  assert.equal(answered.status, 200, JSON.stringify(answered.data));
  const proofs = answered.data.room.presentationSnapshot.attackDodgeResponses ?? [];
  assert.equal(proofs.length, 1, JSON.stringify(answered.data.room.presentationSnapshot));
  assert.equal(proofs[0].responseActorId, game.delegate.id);
  assert.equal(proofs[0].targetId, game.cao.id);
  assert.equal(proofs[0].entourage.responseCardId, dodge.id);
  assert.equal(answered.data.room.players.find((player) => player.id === game.cao.id).hp, 4);
  const helper = await state(game.code, game.delegateMember.token);
  assert.equal(helper.data.myHand.some((held) => held.id === dodge.id), false);
  assert.equal(discardIds(game.code).filter((held) => held === dodge.id).length, 1);
  const repeated = await request("respond", { code: game.code, token: game.delegateMember.token, providerId: "card", cardId: dodge.id });
  assert.notEqual(repeated.status, 200);
});

test("saved sequential Entourage helper decline advances then returns to Cao Cao", async () => {
  const game = await openHujiaScenario({ delegateHero: "simayi", delegateCards: [card("Dodge", "entourage-decline-one")], thirdHero: "zhen-ji", thirdCards: [card("Dodge", "entourage-decline-two")] });
  const invoked = await requestAndSettle("respond", { code: game.code, token: game.caoMember.token, providerId: "cao_cao_hujia", preserveResponse: true });
  const sharedStored = JSON.parse(query(`SELECT pending_json FROM rooms WHERE code=${quote(game.code)}`));
  const { sharedResponseForPlayer } = await import("../../game/shared-response-strategies.ts");
  const saved = sharedResponseForPlayer(sharedStored, { ...game.delegate, hero: "simayi", alive: true });
  saved.delegation.remainingActorIds = sharedStored.priorityPlayerIds.filter((id) => id !== game.delegate.id);
  sql(`UPDATE rooms SET pending_json=${quote(JSON.stringify(saved))} WHERE code=${quote(game.code)}`);
  invoked.data.room = (await state(game.code, game.caoMember.token)).data;
  assert.equal(invoked.status, 200);
  const declined = await requestAndSettle("decline_response", { code: game.code, token: game.delegateMember.token, preserveResponse: true });
  assert.equal(declined.status, 200, JSON.stringify(declined.data));
  assert.equal(declined.data.room.presentationSnapshot.entourageDecision?.helperActorId, game.third.id);
  assert.equal(JSON.stringify(declined.data.room.presentationSnapshot.entourageDecision).includes("remainingActorIds"), false);
  const returned = await requestAndSettle("decline_response", { code: game.code, token: game.thirdMember.token, preserveResponse: true });
  assert.equal(returned.status, 200, JSON.stringify(returned.data));
  assert.equal(returned.data.room.presentationSnapshot.entourageDecision, null);
  assert.equal(returned.data.room.currentAction.actorId, game.cao.id);
  assert.equal(returned.data.room.players.find((player) => player.id === game.cao.id).hp, 4);
});
