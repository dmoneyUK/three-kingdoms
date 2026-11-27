import test from "node:test";
import assert from "node:assert/strict";
import { judgementSucceeds } from "../game/decisions/judgement.ts";
import { projectPublicJudgementPresentations, publicInteractionNarrationBelongsToAction } from "../game/public-judgement-presentation.ts";

test("a public Effect Frame can own H4 for its exact committed causal root", () => {
  const narration = { eventId: "damage-event", rootEventId: "attack-root", interactionId: "interaction", rootFrameId: "root-frame" };
  const action = {
    rootEventId: "effect-event", interactionId: "interaction", rootFrameId: "root-frame",
    publicCardEffectFrame: { eventId: "effect-event", rootEventId: "attack-root" },
  };
  const input = {
    judgementNarrationBelongsToAction: false, narration, action,
    activeJudgementRevealRoute: false, currentInteractionEffectKind: "damage_applied",
  };
  assert.equal(publicInteractionNarrationBelongsToAction(input), true);
  assert.equal(publicInteractionNarrationBelongsToAction({
    ...input, action: { ...action, publicCardEffectFrame: { ...action.publicCardEffectFrame, rootEventId: "other-root" } },
  }), false, "an unrelated effect frame cannot take ownership of this H4");
});

const judge = { id: "judge-1", name: "Player 4", hero: "xiahou-dun" };
const sima = { id: "sima-1", name: "Player 2", hero: "simayi" };
const makeCard = (id, kind, rank, suit) => ({ id, kind, rank, suit });

function continuationFor(purpose) {
  return purpose === "ganglie" ? "damage_suffered" : purpose === "luoshen" ? "luoshen"
    : purpose === "cavalry" ? "attack_targeted" : purpose === "eight_trigrams" ? "response" : "delayed";
}

function judgementEvent({ id = "judgement-1", target = judge, purpose = "ganglie", continuationKind = continuationFor(purpose), card = makeCard("original-1", "Attack", "2", "♠"), sourceCard = undefined, originatingAction = undefined, stage = "OPEN", originalStatus = undefined, finalStatus = undefined, replacementEventId = undefined, replacementActorId = undefined, resolutionId = "resolution-1", publicSequence = 10 } = {}) {
  const status = originalStatus ?? (judgementSucceeds(purpose, card) ? "satisfied" : "unsatisfied");
  return {
    type: "card", id, publicSequence, resolutionId, player: target.name, target: target.name,
    card, action: "reveal", judgement: true, presentation: true,
    publicJudgementPresentation: {
      semantics: "PROVEN", visibility: "PUBLIC", judgementId: id, targetId: target.id,
      judgingPlayerId: target.id, purpose, continuationKind, stage, originalStatus: status,
      ...(sourceCard ? { sourceCard } : {}),
      ...(originatingAction ? { originatingAction } : {}),
      ...(finalStatus ? { finalStatus } : {}),
      ...(replacementEventId ? { replacementEventId, replacementActorId } : {}),
    },
  };
}

function replacementEvent(original, card, actor = sima, target = judge) {
  const eventId = "replacement-1";
  const material = { cardId: card.id, ownerId: actor.id, fromZone: "HAND", toZone: "JUDGEMENT" };
  const proof = {
    semantics: "PROVEN", eventId, effectId: "sima_yi_guicai", effectClass: "JUDGEMENT",
    activationOwnerId: actor.id, targetId: target.id, outcome: "REPLACED_JUDGEMENT",
    rootEventId: original.id, rootResolutionId: original.resolutionId, materials: [material],
  };
  const event = {
    type: "card", id: eventId, publicSequence: 11, resolutionId: original.resolutionId,
    player: actor.name, target: target.name, card, action: "reveal", judgement: true,
    presentation: true, publicCardEffects: [proof],
  };
  const projected = { ...proof, cards: [card] };
  return { event, projected };
}

test("all seven Standard Judgement purposes use their authoritative rule predicate", () => {
  const cases = [
    ["ganglie", "4", "♠", "satisfied"], ["ganglie", "4", "♥", "unsatisfied"],
    ["luoshen", "4", "♣", "satisfied"], ["luoshen", "4", "♦", "unsatisfied"],
    ["cavalry", "4", "♥", "satisfied"], ["cavalry", "4", "♠", "unsatisfied"],
    ["eight_trigrams", "4", "♦", "satisfied"], ["eight_trigrams", "4", "♣", "unsatisfied"],
    ["overindulgence", "4", "♥", "satisfied"], ["overindulgence", "4", "♠", "unsatisfied"],
    ["rations_depleted", "4", "♣", "satisfied"], ["rations_depleted", "4", "♦", "unsatisfied"],
    ["lightning", "9", "♠", "satisfied"], ["lightning", "10", "♠", "unsatisfied"],
  ];
  for (const [purpose, rank, suit, expected] of cases) {
    const card = makeCard(`card-${purpose}-${rank}-${suit}`, "Attack", rank, suit);
    const target = purpose === "luoshen" ? { id: "judge-1", name: "Player 4" } : judge;
    const fact = judgementEvent({ purpose, target, continuationKind: purpose === "ganglie" ? "damage_suffered"
      : purpose === "luoshen" ? "luoshen" : purpose === "cavalry" ? "attack_targeted"
        : purpose === "eight_trigrams" ? "response" : "delayed", card, stage: "FINAL", finalStatus: expected });
    const projected = projectPublicJudgementPresentations([fact], [], [judge, sima]);
    assert.equal(projected.length, 1, `${purpose} fact is projected`);
    assert.equal(projected[0].judgementStatus, expected, `${purpose} status follows the domain rule`);
    assert.match(projected[0].copy.message, expected === "satisfied" ? /Match\.$/ : /Not Match\.$/);
  }
});

test("replacement status is recomputed both ways for all seven purposes, including an unchanged result", () => {
  const rulePairs = [
    ["ganglie", makeCard("g-good", "Attack", "4", "♠"), makeCard("g-bad", "Dodge", "4", "♥")],
    ["luoshen", makeCard("l-good", "Attack", "4", "♣"), makeCard("l-bad", "Dodge", "4", "♦")],
    ["cavalry", makeCard("c-good", "Attack", "4", "♥"), makeCard("c-bad", "Dodge", "4", "♠")],
    ["eight_trigrams", makeCard("e-good", "Attack", "4", "♦"), makeCard("e-bad", "Dodge", "4", "♣")],
    ["overindulgence", makeCard("o-good", "Attack", "4", "♥"), makeCard("o-bad", "Dodge", "4", "♠")],
    ["rations_depleted", makeCard("r-good", "Attack", "4", "♣"), makeCard("r-bad", "Dodge", "4", "♦")],
    ["lightning", makeCard("x-good", "Attack", "4", "♠"), makeCard("x-bad", "Dodge", "10", "♠")],
  ];
  for (const [purpose, favorable, unfavorable] of rulePairs) {
    for (const [originalCard, finalCard] of [[favorable, unfavorable], [unfavorable, favorable], [favorable, makeCard(`${purpose}-same`, "Peach", favorable.rank, favorable.suit)]]) {
      const original = judgementEvent({ id: `${purpose}-${originalCard.id}`, purpose, card: originalCard, stage: "FINAL",
        finalStatus: judgementSucceeds(purpose, finalCard) ? "satisfied" : "unsatisfied",
        replacementEventId: "replacement-1", replacementActorId: sima.id });
      const replacement = replacementEvent(original, finalCard);
      const facts = projectPublicJudgementPresentations([original, replacement.event], [replacement.projected], [judge, sima]);
      assert.equal(facts.length, 2, `${purpose} original and replacement facts stay linked`);
      assert.equal(facts[0].status, "PROVISIONAL");
      assert.doesNotMatch(facts[0].copy.message, /\b(?:Not )?Match\.$/, `${purpose} provisional copy does not claim a final result`);
      assert.equal(facts[1].status, "FINAL");
      assert.equal(facts[1].judgementStatus, judgementSucceeds(purpose, finalCard) ? "satisfied" : "unsatisfied",
        `${purpose} uses the effective card, not the original result`);
      assert.match(facts[1].copy.message, judgementSucceeds(purpose, finalCard) ? /Match\.$/ : /Not Match\.$/);
    }
  }
});

test("a committed replacement keeps the exact original Judgement identity and uses only the final result", () => {
  const original = judgementEvent({
    purpose: "ganglie", card: makeCard("original-heart", "Attack", "2", "♥"),
  });
  const replacementCard = makeCard("replacement-spade", "Dodge", "7", "♠");
  const replacement = replacementEvent(original, replacementCard);
  const finalOriginal = judgementEvent({
    id: original.id, purpose: "ganglie", card: original.card, stage: "FINAL", finalStatus: "satisfied",
    replacementEventId: replacement.event.id, replacementActorId: sima.id,
  });
  const projected = projectPublicJudgementPresentations(
    [finalOriginal, replacement.event], [replacement.projected], [judge, sima],
  );
  assert.equal(projected.length, 2);
  assert.equal(projected[0].judgementId, original.id);
  assert.equal(projected[1].judgementId, original.id);
  assert.deepEqual(projected.map((entry) => entry.phase), ["ORIGINAL", "REPLACEMENT"]);
  assert.equal(projected[0].status, "PROVISIONAL");
  assert.equal(projected[0].judgementStatus, "unsatisfied");
  assert.equal(projected[1].status, "FINAL");
  assert.equal(projected[1].judgementStatus, "satisfied");
  assert.equal(projected[1].eventId, replacement.event.id);
  assert.equal(projected[1].copy.message,
    "Player 4 used Stauchness. Judgement: [2♥].\nPlayer 2 used Necromancy to replace the Judgement card with [7♠]. Match.");
  assert.deepEqual(projected[1].copy.segments.filter((segment) => segment.kind === "player").map((segment) => segment.playerId), [judge.id, sima.id]);
  assert.equal(projected[1].replacement.physicalCardId, replacementCard.id);
  assert.equal(projected[1].replacement.materialOwnerId, sima.id);
});

test("replacement projection uses the original event's committed resolution when its nested copy is absent", () => {
  const original = judgementEvent({ purpose: "ganglie", card: makeCard("original-heart", "Attack", "2", "♥"),
    stage: "FINAL", finalStatus: "satisfied", replacementEventId: "replacement-1", replacementActorId: sima.id });
  delete original.publicJudgementPresentation.resolutionId;
  const replacement = replacementEvent(original, makeCard("replacement-spade", "Dodge", "7", "♠"));
  const projected = projectPublicJudgementPresentations([original, replacement.event], [replacement.projected], [judge, sima]);
  assert.deepEqual(projected.map((fact) => fact.resolutionId), [original.resolutionId, original.resolutionId]);
  assert.equal(projected[1].replacement.physicalCardId, replacement.event.card.id);

  const mismatchedNestedResolution = {
    ...original,
    publicJudgementPresentation: { ...original.publicJudgementPresentation, resolutionId: "different-resolution" },
  };
  assert.deepEqual(projectPublicJudgementPresentations(
    [mismatchedNestedResolution, replacement.event], [replacement.projected], [judge, sima],
  ), [], "the top-level event cannot override a conflicting persisted nested resolution");
});

test("replacement projection fails closed for missing, mismatched or duplicate proof", () => {
  const original = judgementEvent({ purpose: "ganglie", card: makeCard("original", "Attack", "2", "♥"), stage: "FINAL",
    finalStatus: "satisfied", replacementEventId: "replacement-1", replacementActorId: sima.id });
  const replacementCard = makeCard("replacement", "Dodge", "7", "♠");
  const replacement = replacementEvent(original, replacementCard);
  assert.deepEqual(projectPublicJudgementPresentations([original, replacement.event], [], [judge, sima]), [], "the raw event alone is insufficient without the shared proof projection");
  const wrongRoot = { ...replacement.projected, rootEventId: "another-judgement" };
  assert.deepEqual(projectPublicJudgementPresentations([original, replacement.event], [wrongRoot], [judge, sima]), [], "a replacement cannot link to a different original reveal");
  assert.deepEqual(projectPublicJudgementPresentations([original, replacement.event, replacement.event], [replacement.projected], [judge, sima]), [], "duplicate event identity fails closed");
});

test("same-player replacement and repeated Judgements retain independent identities", () => {
  const ownJudge = sima;
  const original = judgementEvent({ id: "own-judgement", target: ownJudge, purpose: "luoshen",
    card: makeCard("own-original", "Attack", "2", "♠"), stage: "FINAL", finalStatus: "satisfied",
    replacementEventId: "replacement-1", replacementActorId: ownJudge.id, publicSequence: 20 });
  const replacement = replacementEvent(original, makeCard("own-replacement", "Dodge", "3", "♣"), ownJudge, ownJudge);
  replacement.event.publicSequence = 21;
  const ownFacts = projectPublicJudgementPresentations([original, replacement.event], [replacement.projected], [ownJudge]);
  assert.equal(ownFacts.length, 2, "a player may replace their own Judgement when the server proves it");
  assert.deepEqual(ownFacts[1].copy.segments.filter((segment) => segment.kind === "player").map((segment) => segment.playerId), [ownJudge.id, ownJudge.id]);

  const repeatedOne = judgementEvent({ id: "luoshen-one", purpose: "luoshen", card: makeCard("luoshen-one-card", "Attack", "2", "♠"), resolutionId: "same-root", publicSequence: 30 });
  const repeatedTwo = judgementEvent({ id: "luoshen-two", purpose: "luoshen", card: makeCard("luoshen-two-card", "Dodge", "3", "♣"), resolutionId: "same-root", publicSequence: 31 });
  const repeated = projectPublicJudgementPresentations([repeatedOne, repeatedTwo], [], [judge, sima]);
  assert.deepEqual(repeated.map((fact) => fact.judgementId), ["luoshen-one", "luoshen-two"]);
});

test("no replacement finalizes the original card; unverified replacement proof preserves only provisional original copy", () => {
  const original = judgementEvent({ purpose: "ganglie", card: makeCard("no-replacement", "Attack", "9", "♠"), stage: "FINAL", finalStatus: "satisfied" });
  const final = projectPublicJudgementPresentations([original], [], [judge, sima]);
  assert.equal(final.length, 1);
  assert.equal(final[0].phase, "ORIGINAL");
  assert.equal(final[0].status, "FINAL");
  assert.match(final[0].copy.message, /Match\.$/);

  const unverified = judgementEvent({ id: "unverified-judgement", purpose: "ganglie", card: makeCard("still-public", "Attack", "9", "♠"), stage: "UNVERIFIED" });
  const unresolved = projectPublicJudgementPresentations([unverified], [], [judge, sima]);
  assert.equal(unresolved.length, 1, "missing replacement proof does not erase the committed original reveal");
  assert.equal(unresolved[0].status, "PROVISIONAL");
  assert.doesNotMatch(unresolved[0].copy.message, /\b(?:Not )?Match\.$/);
});

test("delayed-card source remains distinct from the original Judgement reveal", () => {
  const sourceCard = makeCard("overindulgence-source", "Overindulgence", "6", "♥");
  const revealedCard = makeCard("overindulgence-reveal", "Attack", "2", "♥");
  const event = judgementEvent({ purpose: "overindulgence", continuationKind: "delayed", sourceCard,
    card: revealedCard, stage: "FINAL", finalStatus: "satisfied" });
  const [fact] = projectPublicJudgementPresentations([event], [], [judge, sima]);
  assert.equal(fact.sourceCard.id, sourceCard.id);
  assert.equal(fact.originalCard.id, revealedCard.id);
  assert.equal(fact.effectiveCard.id, revealedCard.id);
  assert.equal(fact.copy.message, "Player 4 is judging Overindulgence. Judgement: [2♥]. Match.");
});

test("canonical Judgement facts retain a separately proven originating action identity", () => {
  const root = {
    type: "card", id: "attack-root", publicSequence: 9, resolutionId: "attack-root-resolution",
    player: judge.name, target: judge.name, card: makeCard("attack-root-card", "Attack", "6", "♦"),
    action: "play", presentation: true,
  };
  const original = judgementEvent({
    id: "judgement-reveal", resolutionId: "judgement-resolution", publicSequence: 10,
    originatingAction: { eventId: root.id, resolutionId: root.resolutionId },
  });
  const [fact] = projectPublicJudgementPresentations([root, original], [], [judge, sima]);
  assert.equal(fact.judgementId, original.id, "the reveal remains the stable per-Judgement identity");
  assert.deepEqual(fact.originatingAction, { eventId: root.id, resolutionId: root.resolutionId },
    "the source action is retained independently from the Judgement reveal/resolution");

  const mismatchedRoot = {
    ...original,
    publicJudgementPresentation: {
      ...original.publicJudgementPresentation,
      originatingAction: { eventId: root.id, resolutionId: "wrong-root-resolution" },
    },
  };
  assert.deepEqual(projectPublicJudgementPresentations([root, mismatchedRoot], [], [judge, sima]), [],
    "a present source event with a mismatched resolution cannot be attached to a public Judgement fact");
  assert.deepEqual(projectPublicJudgementPresentations([root, root, original], [], [judge, sima]), [],
    "a duplicated source event identity fails closed");
  assert.deepEqual(projectPublicJudgementPresentations([original], [], [judge, sima]), [],
    "a source link without its committed public event fails closed");
  assert.deepEqual(projectPublicJudgementPresentations([
    { ...root, privateToPlayerId: judge.id }, original,
  ], [], [judge, sima]), [], "a private source event cannot own a public Judgement source link");
});

test("an open replacement decision exposes only the public original Judgement", () => {
  const original = judgementEvent({ purpose: "ganglie", card: makeCard("original-public", "Attack", "9", "♠") });
  const facts = projectPublicJudgementPresentations([original], [], [judge, sima]);
  assert.equal(facts.length, 1);
  assert.equal(facts[0].status, "PROVISIONAL");
  assert.equal(facts[0].replacement, undefined);
  assert.equal(JSON.stringify(facts).includes("private-selected-card"), false);
  assert.equal(facts[0].copy.message, "Player 4 used Stauchness. Judgement: [9♠].");
});
