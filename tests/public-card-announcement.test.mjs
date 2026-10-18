import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { publicCardAnnouncement } from "../app/public-card-display.tsx";

const action = (overrides = {}) => ({
  key: "test-action",
  rootEventId: "root-event",
  sourceId: "source",
  targetId: "target",
  cardLabel: "ATTACK",
  ariaLabel: "Source played Attack targeting Target",
  ...overrides,
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

test("Bumper Harvest Negation copy names only the proven effect recipient and keeps counters aimed at the prior Negation", () => {
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
  ), "JD played Bumper Harvest. Negation may cancel its effect on Test Player 3.");

  const unprovenHarvest = { ...harvestAction, harvestEffectRecipient: undefined };
  assert.equal(publicCardAnnouncement(
    unprovenHarvest, unprovenHarvest.ariaLabel, "JD", "JD", null,
  ), "JD played Bumper Harvest.");

  const firstNegation = {
    ...harvestAction,
    responses: [{ eventId: "negation-event", actorId: "responder-4" }],
  };
  assert.equal(publicCardAnnouncement(
    firstNegation,
    "Test Player 4 played Negation to counter Bumper Harvest's effect on Test Player 3",
    "Test Player 4", "JD", null,
  ), "Test Player 4 played Negation against Bumper Harvest's effect on Test Player 3.");

  const counterNotice = "Test Player 2 played Negation to counter Negation 1";
  assert.equal(publicCardAnnouncement(
    { ...firstNegation, responses: [{ eventId: "negation-event" }, { eventId: "counter-event" }] },
    counterNotice, "Test Player 2", "JD", null,
  ), "Test Player 2 played Negation against Negation 1.");
});

test("public announcement typography is readable and never truncates its verified sentence", () => {
  const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");
  const announcement = css.match(/\.public-card-display-journey-copy\{([^}]+)\}/)?.[1] ?? "";
  const text = css.match(/\.public-card-display-journey-copy>b\{([^}]+)\}/)?.[1] ?? "";
  assert.match(announcement, /520px/);
  assert.match(text, /font:600 15px\/1\.2 Arial,sans-serif/);
  assert.match(text, /letter-spacing:\.01em/);
  assert.doesNotMatch(text, /line-clamp|overflow:hidden/);
  assert.doesNotMatch(css, /public-card-display-journey-copy\.is-condensed/);
});
