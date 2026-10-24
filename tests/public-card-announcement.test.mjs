import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { publicCardAnnouncement, publicCardJourneyOwnershipIdentity } from "../app/public-card-display.tsx";
import {
  compactLustDuelAttackMessage,
  compactLustDuelOrderMessage,
  compactLustDuelResultMessage,
} from "../app/lust-public-copy.ts";

const action = (overrides = {}) => ({
  key: "test-action",
  rootEventId: "root-event",
  sourceId: "source",
  targetId: "target",
  cardLabel: "ATTACK",
  ariaLabel: "Source played Attack targeting Target",
  ...overrides,
});

test("T3 single-target root ownership survives Negation, target choice, and settlement wrappers", () => {
  const root = action({
    key: "negation-read:root",
    cardKind: "Steal",
    cardFace: { id: "physical-steal-card", kind: "Steal", suit: "♠", rank: "7" },
    motion: { type: "single-target", scopeKey: "room:root-event", freshEventIds: ["root-event"] },
  });
  const settlement = {
    ...root,
    key: "steal-settlement:root-event:settlement-event",
    motion: { type: "single-target", scopeKey: "room:root-event", freshEventIds: [] },
    settlement: { eventId: "settlement-event", outcome: "STEAL_RESOLVED", exiting: false },
  };

  const owner = publicCardJourneyOwnershipIdentity(root, "ROOM", "viewer");
  assert.equal(publicCardJourneyOwnershipIdentity(settlement, "ROOM", "viewer"), owner);
  assert.notEqual(publicCardJourneyOwnershipIdentity(settlement, "ROOM", "other-viewer"), owner);
  assert.notEqual(publicCardJourneyOwnershipIdentity({ ...settlement, rootEventId: "next-root" }, "ROOM", "viewer"), owner);
  assert.notEqual(publicCardJourneyOwnershipIdentity({ ...settlement, cardFace: { ...root.cardFace, id: "other-physical-card" } }, "ROOM", "viewer"), owner);
  assert.notEqual(publicCardJourneyOwnershipIdentity({ ...settlement, sourceId: "other-author" }, "ROOM", "viewer"), owner);
});

test("LUST compact copy preserves full player identities and follows the proven actor id", () => {
  const first = { id: "participant-3", name: "Test Player 3" };
  const second = { id: "participant-4", name: "Test Player 4" };
  assert.equal(compactLustDuelOrderMessage(first, second, first), "Test Player 3 first\nTest Player 4 second");
  assert.equal(compactLustDuelOrderMessage(first, second, second), "Test Player 3 second\nTest Player 4 first");
  assert.equal(compactLustDuelOrderMessage(
    { id: "one", name: "玩家姓名特别特别特别长测试乙甲乙丙丁" },
    { id: "two", name: "測試玩家4號辛壬癸甲乙丙丁戊" },
    { id: "one", name: "玩家姓名特别特别特别长测试乙甲乙丙丁" },
  ), "玩家姓名特别特别特别长测试乙甲乙丙丁 first\n測試玩家4號辛壬癸甲乙丙丁戊 second");
  assert.equal(compactLustDuelOrderMessage(first, second, { id: "unproven", name: "Unknown" }), null);
  assert.equal(compactLustDuelAttackMessage("玩家姓名特别特别特别长测试乙", "Test Player 4"), "玩家姓名特别特别特别长测试乙 attacks Test Player 4");
  assert.equal(compactLustDuelResultMessage("玩家姓名特别特别特别长测试乙", "Test Player 4", 1), "Duel: 玩家姓名特别特别特别长测试乙 failed Attack; 1 damage from Test Player 4.");
});

test("public battle announcements keep proof-backed event meaning in concise copy", () => {
  assert.equal(publicCardAnnouncement(
    action(), "Source played Attack targeting Target", "Source", "Source", "Target",
  ), "Source played Attack on Target.");

  assert.equal(publicCardAnnouncement(
    action({ cardLabel: "DUEL" }), "Source played Duel targeting Target", "Source", "Source", "Target",
  ), "Source played Duel on Target.");

  assert.equal(publicCardAnnouncement(
    action({ settlement: { eventId: "dodge-event", outcome: "ATTACK_BLOCKED_BY_DODGE", exiting: false } }),
    "Target played Dodge against Source's Attack", "Target", "Source", "Target",
  ), "Target played Dodge against Source's Attack.");

  assert.equal(publicCardAnnouncement(
    action({ cardLabel: "NEGATION" }), "Counter played Negation to counter Duel", "Counter", "Source", "Target",
  ), "Counter played Negation against Duel.");

  assert.equal(publicCardAnnouncement(
    action({ cardLabel: "BURNING BRIDGE", settlement: { eventId: "settlement", outcome: "DISMANTLE_RESOLVED", exiting: false } }),
    "Source played Burning Bridge targeting Target", "Source", "Source", "Target",
  ), "Source resolved Burning Bridge on Target.");

  assert.equal(publicCardAnnouncement(
    action({ cardLabel: "STEAL", settlement: {
      eventId: "steal-hand", outcome: "STEAL_RESOLVED", exiting: false,
      targetCardMovement: { sourceZone: "hand", affectedCardOwnerId: "target", destinationZone: "hand", destinationOwnerId: "source" },
    } }),
    "Source played Steal targeting Target", "Source", "Source", "Target",
  ), "Source took one card from Target.");

  assert.equal(publicCardAnnouncement(
    action({ cardLabel: "STEAL", settlement: {
      eventId: "steal-equipment", outcome: "STEAL_RESOLVED", exiting: false,
      targetCardMovement: {
        sourceZone: "equipment", affectedCardOwnerId: "target", destinationZone: "hand", destinationOwnerId: "source",
        affectedCardFace: { id: "public-equipment", kind: "ZhugeCrossbow", suit: "♦", rank: "A" },
      },
    } }),
    "Source played Steal targeting Target", "Source", "Source", "Target",
  ), "Source took Zhuge Crossbow (A♦) from Target.");

  assert.equal(publicCardAnnouncement(
    action({ cardLabel: "STEAL", settlement: {
      eventId: "steal-judgement", outcome: "STEAL_RESOLVED", exiting: false,
      targetCardMovement: {
        sourceZone: "judgement", affectedCardOwnerId: null, destinationZone: "hand", destinationOwnerId: "source",
        affectedCardFace: { id: "public-judgement", kind: "Lightning", suit: "♣", rank: "K" },
      },
    } }),
    "Source played Steal targeting Target", "Source", "Source", "Target",
  ), "Source took Lightning (K♣) from Target.");

  assert.equal(publicCardAnnouncement(
    action({ cardLabel: "STEAL", settlement: {
      eventId: "steal-mismatched-judgement", outcome: "STEAL_RESOLVED", exiting: false,
      targetCardMovement: {
        sourceZone: "judgement", affectedCardOwnerId: "target", destinationZone: "hand", destinationOwnerId: "source",
        affectedCardFace: { id: "unproven-judgement", kind: "Lightning", suit: "♣", rank: "K" },
      },
    } }),
    "Source played Steal targeting Target", "Source", "Source", "Target",
  ), "Source resolved Steal on Target.");

  assert.equal(publicCardAnnouncement(
    action({ cardLabel: "STEAL", settlement: {
      eventId: "steal-mismatched-hand", outcome: "STEAL_RESOLVED", exiting: false,
      targetCardMovement: {
        sourceZone: "hand", affectedCardOwnerId: "target", destinationZone: "hand", destinationOwnerId: "source",
        affectedCardFace: { id: "must-stay-private", kind: "Peach", suit: "♥", rank: "7" },
      },
    } }),
    "Source played Steal targeting Target", "Source", "Source", "Target",
  ), "Source resolved Steal on Target.");

  assert.equal(publicCardAnnouncement(
    action({ cardLabel: "STEAL", settlement: { eventId: "cancelled-steal", outcome: "ROOT_CANCELLED", exiting: false } }),
    "Source played Steal targeting Target", "Counter", "Source", "Target",
  ), "Counter's Negation cancelled Source's Steal on Target.");

  assert.equal(publicCardAnnouncement(
    action({ cardLabel: "BURNING BRIDGE", settlement: {
      eventId: "dismantle-hand", outcome: "DISMANTLE_RESOLVED", exiting: false,
      targetCardMovement: {
        sourceZone: "hand", affectedCardOwnerId: "target", destinationZone: "discard", destinationOwnerId: null,
        affectedCardFace: { id: "discarded-card", kind: "Peach", suit: "♥", rank: "3" },
      },
    } }),
    "Source played Burning Bridge targeting Target", "Source", "Source", "Target",
  ), "Source discarded Peach (3♥) from Target's Hand to the discard pile.");

  assert.equal(publicCardAnnouncement(
    action({ cardLabel: "RAINING ARROWS", ariaLabel: "Source played Raining Arrows. 4 targets resolved.", settlement: { eventId: "settlement", outcome: "GROUP_RESOLVED", exiting: false } }),
    "Source played Raining Arrows. 4 targets resolved.", "Source", "Source", null,
  ), "Source played Raining Arrows; 4 targets resolved.");

  assert.equal(publicCardAnnouncement(
    action({ cardLabel: "SOWING DISTRUST", settlement: { eventId: "settlement", outcome: "SUITS_MATCHED", exiting: false } }),
    "Source used Sowing Distrust targeting Target. Resolved: suits matched", "Source", "Source", "Target",
  ), "Source used Sowing Distrust on Target; suits matched.");

  assert.equal(publicCardAnnouncement(
    action(), "Target used Deflection, discarding Dodge and redirecting Attack to Third.", "Target", "Source", "Third",
  ), "Deflection: Target redirected Attack to Third; discarded Dodge.");
});

test("Bumper Harvest Negation announcements name the current effect or Negation target", () => {
  const harvestAction = action({
    targetId: null,
    cardFace: { id: "harvest-root", kind: "BumperHarvest" },
    cardLabel: "BUMPER HARVEST",
    ariaLabel: "JD played Bumper Harvest.",
    phaseNotice: "NEGATION MAY BE PLAYED",
    motion: { type: "negation", scopeKey: "room:harvest", freshEventIds: ["root-event"] },
    harvestEffectRecipient: { participantId: "chooser-3", participantName: "Test Player 3" },
  });
  assert.equal(publicCardAnnouncement(
    harvestAction, harvestAction.ariaLabel, "JD", "JD", null,
  ), "Negation: Cancel Harvest for Test Player 3?");
  assert.equal(publicCardAnnouncement(
    { ...harvestAction, harvestEffectRecipient: { participantId: "source", participantName: "JD" } },
    harvestAction.ariaLabel, "JD", "JD", null,
  ), "Negation: Cancel Harvest for JD?");

  const unprovenHarvest = { ...harvestAction, harvestEffectRecipient: undefined };
  assert.equal(publicCardAnnouncement(
    unprovenHarvest, unprovenHarvest.ariaLabel, "JD", "JD", null,
  ), "Negation available.");

  const firstNegation = {
    ...harvestAction,
    responses: [{ eventId: "negation-event", ordinal: 1, actorId: "responder-4", actorName: "Test Player 4" }],
  };
  assert.equal(publicCardAnnouncement(
    firstNegation,
    "Test Player 4 played Negation to counter Bumper Harvest's effect on Test Player 3",
    "Test Player 4", "JD", null,
  ), "Counter Test Player 4's Negation?");
  assert.equal(publicCardAnnouncement(
    { ...firstNegation, harvestEffectRecipient: undefined },
    "Test Player 4 played Negation to counter Bumper Harvest's effect on Test Player 3",
    "Test Player 4", "JD", null,
  ), "Counter Test Player 4's Negation?");

  const counterNotice = "Test Player 2 played Negation to counter Negation 1";
  assert.equal(publicCardAnnouncement(
    { ...firstNegation, responses: [firstNegation.responses[0], { eventId: "counter-event", ordinal: 2, actorId: "responder-2", actorName: "Test Player 2" }] },
    counterNotice, "Test Player 2", "JD", null,
  ), "Counter Test Player 2's Negation?");
});

test("public announcement typography is readable and never truncates its verified sentence", () => {
  const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");
  const announcement = css.match(/\.public-card-display-journey-copy\{([^}]+)\}/)?.[1] ?? "";
  const text = css.match(/^\.public-card-display-journey-copy>b\{([^}]+)\}/m)?.[1] ?? "";
  assert.match(announcement, /520px/);
  assert.match(text, /font:600 15px\/1\.2 Arial,sans-serif/);
  assert.match(text, /letter-spacing:\.01em/);
  assert.doesNotMatch(text, /line-clamp|overflow:hidden/);
  assert.match(css, /\.public-card-display-journey\[data-public-card-motion="lust-cost"\]>.public-card-display-journey-copy>b,\.public-card-display-journey\[data-public-card-motion="lust-duel"\]>.public-card-display-journey-copy>b\{white-space:pre-line\}/);
  assert.match(css, /\.public-card-display-journey\[data-public-card-motion="lust-cost"\][^}]*overflow:visible[^}]*-webkit-line-clamp:unset/);
  assert.doesNotMatch(css, /public-card-display-journey-copy\.is-condensed/);
});
