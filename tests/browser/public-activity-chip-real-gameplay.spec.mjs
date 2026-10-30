import { expect, test } from "@playwright/test";

const API = "http://127.0.0.1:3137";
const card = (kind, id, suit = "♠", rank = "7") => ({ id, kind, suit, rank });
const HEROES = ["cao-cao", "liu-bei", "sun-quan", "simayi", "xiahou-dun", "zhang-liao", "guo-jia", "huang-gai"];
const ROLES = {
  4: ["Lord", "Loyalist", "Rebel", "Renegade"],
  6: ["Lord", "Loyalist", "Rebel", "Rebel", "Rebel", "Renegade"],
  8: ["Lord", "Loyalist", "Loyalist", "Rebel", "Rebel", "Rebel", "Rebel", "Renegade"],
};

async function seed(request, count = 4, includeDuel = false) {
  const players = Array.from({ length: count }, (_, index) => ({
    name: `Test Player ${index + 1}`,
    role: ROLES[count][index],
    hero: HEROES[index],
    hp: 4,
    maxHp: 4,
    hand: includeDuel && index === 0
      ? [card("Duel", "activity-duel-root", "♠", "A")]
      : includeDuel && index === 1
        ? [card("Attack", "activity-duel-answer", "♣", "8")]
        : [],
  }));
  const response = await request.post(`${API}/__test/seed-playing-game`, { data: { phase: "play", turnSeat: 0, players } });
  if (!response.ok()) throw new Error(`Public activity room seed failed: ${await response.text()}`);
  return response.json();
}

async function seedDuelAttackChain(request) {
  const players = [
    {
      name: "Test Player 1",
      role: "Lord",
      hero: "cao-cao",
      hp: 4,
      maxHp: 4,
      hand: [
        card("Duel", "u13bg-duel-root", "♠", "A"),
        card("Attack", "u13bg-source-attack-2", "♥", "5"),
        card("Attack", "u13bg-source-attack-4", "♦", "6"),
      ],
    },
    {
      name: "Test Player 2",
      role: "Loyalist",
      hero: "liu-bei",
      hp: 4,
      maxHp: 4,
      hand: [
        card("Attack", "u13bg-target-attack-1", "♣", "8"),
        card("Attack", "u13bg-target-attack-3", "♠", "9"),
        card("Attack", "u13bg-target-attack-5", "♥", "10"),
      ],
    },
    { name: "Test Player 3", role: "Rebel", hero: "sun-quan", hp: 4, maxHp: 4, hand: [] },
    { name: "Test Player 4", role: "Renegade", hero: "simayi", hp: 4, maxHp: 4, hand: [] },
  ];
  const response = await request.post(`${API}/__test/seed-playing-game`, { data: { phase: "play", turnSeat: 0, players } });
  if (!response.ok()) throw new Error(`U13-B-G Duel room seed failed: ${await response.text()}`);
  return response.json();
}

async function openPlayer(page, room, index, viewport = { width: 440, height: 894 }, diagnostics = false) {
  const member = room.players[index];
  await page.setViewportSize(viewport);
  await page.addInitScript(({ code, token, name }) => {
    localStorage.setItem("three-realms-session", JSON.stringify({ code, token, name }));
  }, { code: room.code, token: member.token, name: member.name });
  await page.goto(`${API}/${diagnostics ? "?publicActivityChipDiagnostics=1" : ""}`);
  await expect(page.locator(".game-shell")).toBeVisible();
  await expect(page.locator("[data-public-activity-chip]")).toBeVisible();
  return member;
}

async function state(request, room, index) {
  const response = await request.get(`${API}/api/rooms?code=${room.code}&token=${room.players[index].token}`);
  expect(response.ok()).toBeTruthy();
  return response.json();
}

async function action(request, room, index, name, extra = {}) {
  const { windowId, ...actionExtra } = extra;
  const current = windowId ? await state(request, room, index) : null;
  const context = current ? {
    actionRevision: current.actionRevision,
    meId: current.meId,
    phase: current.phase,
    pendingKind: current.pending?.kind === "negation_window" ? "response" : current.pending?.kind ?? null,
    actorId: current.actionPlayerId,
    windowId,
  } : undefined;
  const response = await request.post(`${API}/api/rooms`, {
    data: { action: name, code: room.code, token: room.players[index].token, ...actionExtra, ...(context ? { context } : {}) },
  });
  if (!response.ok()) throw new Error(`${name} failed: ${await response.text()}`);
  return response.json();
}

async function readChip(page) {
  return page.locator("[data-public-activity-chip]").getAttribute("aria-label");
}

async function geometry(page) {
  return page.evaluate(() => {
    const bounds = (selector) => {
      const element = document.querySelector(selector);
      if (!element) return null;
      const rect = element.getBoundingClientRect();
      return { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom, width: rect.width, height: rect.height };
    };
    const chip = document.querySelector("[data-public-activity-chip]");
    const chipRect = chip?.getBoundingClientRect();
    const rect = (element) => {
      const value = element.getBoundingClientRect();
      return { left: value.left, top: value.top, right: value.right, bottom: value.bottom, width: value.width, height: value.height };
    };
    const intersects = (a, b) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
    const protectedSelector = [
      ".opponent-player-card[data-player-anchor]", ".player-square", ".player-board-status", ".visible-countdown",
      ".stage-system-cluster", ".hero-focus", ".opponent-inspection-floating-shell", ".card-details-panel", ".hero-details-panel",
      ".interaction-stage-dying", ".dying-handoff-compact",
      ".public-card-display-journey-copy", ".public-card-journey-card", ".public-card-duel-parked-card",
      ".public-card-display-static-card > .played-card", ".effect-notice", ".turn-notice", ".played-card-stage .played-card",
      ".game-event-stage > div", ".harvest-choice-panel", ".victory-banner", ".table-resolution-layer .played-card",
    ].join(",");
    const overlaps = [...document.querySelectorAll(protectedSelector)]
      .filter((element) => element !== chip && getComputedStyle(element).display !== "none" && getComputedStyle(element).visibility !== "hidden")
      .filter((element) => {
        const parked = element.closest('[data-public-card-journey-phase="parked"], .table-played-card.settled');
        const parkedBounds = parked?.getBoundingClientRect();
        return !parkedBounds || parkedBounds.width > 70 || parkedBounds.height > 110;
      })
      .map((element) => ({ name: element.className?.toString?.() ?? element.tagName, bounds: rect(element) }))
      .filter(({ bounds }) => bounds.width > 0 && bounds.height > 0 && intersects(chipRect, bounds));
    const table = bounds(".play-table");
    const guidance = bounds(".console-guidance");
    const hand = bounds(".local-hand");
    for (const [name, value] of [["console-guidance", guidance], ["local-hand", hand]]) {
      if (value && intersects(chipRect, value)) overlaps.push({ name, bounds: value });
    }
    const scrollWidth = document.documentElement.scrollWidth;
    return {
      chip: chipRect ? rect(chip) : null,
      table,
      chipPositioning: chip ? {
        position: getComputedStyle(chip).position,
        left: getComputedStyle(chip).left,
        top: getComputedStyle(chip).top,
        offsetParent: chip.offsetParent?.className?.toString?.() ?? chip.offsetParent?.tagName ?? null,
        offsetParentRect: chip.offsetParent ? rect(chip.offsetParent) : null,
      } : null,
      guidance,
      hand,
      overlaps,
      scrollWidth,
      viewportWidth: window.innerWidth,
      chipHeight: chipRect?.height ?? 0,
      placement: chip?.getAttribute("data-public-activity-layout"),
      visibility: chip ? getComputedStyle(chip).visibility : "missing",
      chipZIndex: chip ? getComputedStyle(chip).zIndex : null,
      journeyZIndex: document.querySelector(".public-card-display-journey") ? getComputedStyle(document.querySelector(".public-card-display-journey")).zIndex : null,
    };
  });
}

function assertGeometry(result) {
  expect(result.visibility).toBe("visible");
  expect(result.placement).not.toBe("hidden");
  expect(result.chip.left).toBeGreaterThanOrEqual(result.table.left);
  expect(result.chip.right).toBeLessThanOrEqual(result.table.right);
  expect(result.chip.top).toBeGreaterThanOrEqual(result.table.top);
  expect(result.chip.bottom).toBeLessThanOrEqual(result.table.bottom);
  expect(result.chipHeight).toBeGreaterThanOrEqual(44);
  expect(result.overlaps).toEqual([]);
  expect(result.scrollWidth).toBeLessThanOrEqual(result.viewportWidth);
}

test("four authenticated viewers share the same public turn, Negation, and Duel activity", async ({ browser, request }, testInfo) => {
  const room = await seed(request, 4, true);
  const contexts = [];
  const pages = [];
  try {
    for (let index = 0; index < 4; index += 1) {
      const context = await browser.newContext({ viewport: { width: 440, height: 894 } });
      contexts.push(context);
      const page = await context.newPage();
      pages.push(page);
      await openPlayer(page, room, index);
    }

    const initialViews = await Promise.all(room.players.map((_, index) => state(request, room, index)));
    expect(initialViews.map((view) => view.turnSeat)).toEqual([0, 0, 0, 0]);
    const initialWidths = await Promise.all(pages.map(async (page) => (await page.locator(".public-activity-chip").boundingBox()).width));
    const initialLabels = await Promise.all(pages.map(readChip));
    expect(initialLabels).toEqual(Array(4).fill("Test Player 1's turn"));

    const root = await action(request, room, 0, "play_card", { cardId: "activity-duel-root", targetId: room.players[1].id });
    const windowId = root.room.currentAction.negationWindowId;
    expect(windowId).toBeTruthy();
    const hold = await request.post(`${API}/__test/negation-window-clock`, { data: { code: room.code, windowId, mode: "hold" } });
    expect(hold.ok()).toBeTruthy();
    const sharedNegationCopy = "Waiting for counter responses Negation can cancel the duel effect on Test Player 2.";
    for (const [index, page] of pages.entries()) expect((await page.locator(".public-activity-chip").boundingBox()).width).toBeCloseTo(initialWidths[index], 0);
    await expect.poll(async () => Promise.all(pages.map(readChip))).toEqual(Array(4).fill(sharedNegationCopy));

    const h4Before = pages[0].locator(".public-card-display-journey-copy").first();
    await expect(h4Before).toBeVisible();
    const h4WidthBeforePass = (await h4Before.boundingBox()).width;
    const pacWidthBeforePass = (await pages[0].locator(".public-activity-chip").boundingBox()).width;
    const beforePass = await Promise.all(room.players.map((_, index) => state(request, room, index)));
    expect(new Set(beforePass.map((view) => view.presentationSnapshot.interaction.interactionId)).size).toBe(1);
    await action(request, room, 0, "decline_response", { windowId });
    const afterOnePass = await Promise.all(room.players.map((_, index) => state(request, room, index)));
    expect((await pages[0].locator(".public-activity-chip").boundingBox()).width).toBeCloseTo(pacWidthBeforePass, 0);
    await expect(h4Before).toBeVisible();
    expect((await h4Before.boundingBox()).width).toBeCloseTo(h4WidthBeforePass, 0);
    expect(afterOnePass.map((view) => view.pendingNegation.submitted)).toEqual([true, false, false, false]);
    await expect.poll(async () => Promise.all(pages.map(readChip))).toEqual(Array(4).fill(sharedNegationCopy));
    await expect(pages[0].locator(".decision-status strong").first()).toHaveText("You passed. Waiting for the other players.");
    for (const page of pages.slice(1)) await expect(page.locator(".decision-status strong").first()).not.toContainText("You passed.");
    const rootEvent = root.room.timeline.find((item) => item.type === "card" && item.card?.id === "activity-duel-root");
    expect(rootEvent?.id).toBeTruthy();
    const rootJourney = pages[1].locator(`[data-public-card-journey-event-id="${rootEvent.id}"]`);
    await expect(rootJourney).toHaveCount(1);
    await expect(rootJourney).toHaveAttribute("data-public-card-journey-phase", "parked", { timeout: 8_000 });
    const borders = await pages[1].locator(".play-table *").evaluateAll((elements) => elements.flatMap((el) => {
      const r = el.getBoundingClientRect(), s = getComputedStyle(el);
      if (r.width < 300 || !r.height || s.visibility === "hidden" || s.display === "none") return [];
      if (s.borderTopWidth === "0px" && s.borderBottomWidth === "0px") return [];
      return [{ tag: el.tagName, className: el.className?.toString(), width: r.width, top: r.top, bottom: r.bottom, borderTop: s.borderTop, borderBottom: s.borderBottom }];
    }));
    console.log("Duel visible horizontal borders", JSON.stringify(borders));
    expect(JSON.stringify(afterOnePass[2])).not.toContain("activity-duel-answer");

    for (let index = 1; index < 4; index += 1) await action(request, room, index, "decline_response", { windowId });
    await expect.poll(async () => Promise.all(pages.map(readChip)), { timeout: 12_000 })
      .toEqual(Array(4).fill("Waiting for Test Player 2 to play Attack or take damage Duel Exchange"));
    const duelViews = await Promise.all(room.players.map((_, index) => state(request, room, index)));
    expect(duelViews.every((view) => view.presentationSnapshot.duelExchange?.semantics === "PROVEN")).toBe(true);
    expect(duelViews.map((view) => view.presentationSnapshot.duelExchange.decisionActorId)).toEqual(Array(4).fill(room.players[1].id));
    await expect(pages[0].locator("[data-public-activity-heading]")).toHaveText("Waiting for Test Player 2 to play Attack or take damage");
    await expect(pages[0].locator("[data-public-activity-stage]")).toHaveText("Duel Exchange");

    const negationScreenshot = await pages[3].screenshot({ fullPage: true });
    await testInfo.attach("public-activity-shared-negation-440x894", { body: negationScreenshot, contentType: "image/png" });

    const beforeAttackGeometry = await geometry(pages[1]);
    assertGeometry(beforeAttackGeometry);
    const attackResponse = await action(request, room, 1, "respond", { providerId: "card", cardId: "activity-duel-answer" });
    const attackEvent = attackResponse.room.timeline.find((event) => event.type === "card" && event.card?.id === "activity-duel-answer");
    expect(attackEvent?.id).toBeTruthy();
    await expect.poll(async () => Promise.all(pages.map(readChip)), { timeout: 8_000 })
      .toEqual(Array(4).fill("Waiting for Test Player 1 to play Attack or take damage Duel Exchange"));
    const revealGeometry = await geometry(pages[1]);
    assertGeometry(revealGeometry);
    expect(Math.abs(revealGeometry.chip.left - beforeAttackGeometry.chip.left)).toBeLessThanOrEqual(2);
    expect(Math.abs(revealGeometry.chip.top - beforeAttackGeometry.chip.top)).toBeLessThanOrEqual(2);
    await testInfo.attach("public-activity-duel-attack-reveal-440x894", {
      body: await pages[1].screenshot({ fullPage: true }),
      contentType: "image/png",
    });
    await expect(pages[1].locator(`[data-public-card-journey-event-id="${attackEvent.id}"]`))
      .toHaveAttribute("data-public-card-journey-phase", "parked", { timeout: 8_000 });
    assertGeometry(await geometry(pages[1]));
  } finally {
    await Promise.all(contexts.map((context) => context.close()));
  }
});

test("U13-B-G keeps the activity plaque near center through parked Duel Attack history at 440x766", async ({ browser, page, request }, testInfo) => {
  test.setTimeout(90_000);
  const room = await seedDuelAttackChain(request);
  const localViewer = room.players[1];
  const placementTraces = [];
  page.on("console", async (message) => {
    if (!message.text().includes("[U13-B-G activity-chip placement]")) return;
    try {
      placementTraces.push(await message.args()[1].jsonValue());
    } catch {
      // A navigation can dispose a diagnostic object between console dispatch and capture.
    }
  });

  const observerContext = await browser.newContext({ viewport: { width: 440, height: 766 }, reducedMotion: "reduce" });
  const observerPage = await observerContext.newPage();
  try {
    await openPlayer(page, room, 1, { width: 440, height: 766 }, true);
    await openPlayer(observerPage, room, 3, { width: 440, height: 766 });

    const beforeBenignMutation = await geometry(page);
    assertGeometry(beforeBenignMutation);
    await page.locator(".play-table").evaluate((table) => table.classList.add("u13bg-neutral-layout-probe"));
    await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    const afterBenignMutation = await geometry(page);
    assertGeometry(afterBenignMutation);
    expect(Math.abs(afterBenignMutation.chip.left - beforeBenignMutation.chip.left)).toBeLessThanOrEqual(0.5);
    expect(Math.abs(afterBenignMutation.chip.top - beforeBenignMutation.chip.top)).toBeLessThanOrEqual(0.5);
    await page.locator(".play-table").evaluate((table) => table.classList.remove("u13bg-neutral-layout-probe"));

    const declared = await action(request, room, 0, "play_card", {
      cardId: "u13bg-duel-root",
      targetId: localViewer.id,
    });
    const windowId = declared.room.currentAction.negationWindowId;
    expect(windowId).toBeTruthy();
    const held = await request.post(`${API}/__test/negation-window-clock`, {
      data: { code: room.code, windowId, mode: "hold" },
    });
    expect(held.ok()).toBeTruthy();
    for (let index = 0; index < room.players.length; index += 1) {
      await action(request, room, index, "decline_response", { windowId });
    }

    const sequence = [
      { playerIndex: 1, cardId: "u13bg-target-attack-1", park: true },
      { playerIndex: 0, cardId: "u13bg-source-attack-2", park: true },
      { playerIndex: 1, cardId: "u13bg-target-attack-3", park: true },
      { playerIndex: 0, cardId: "u13bg-source-attack-4", park: false },
    ];
    let finalAttackEventId = "";
    for (const [index, responseCard] of sequence.entries()) {
      const result = await action(request, room, responseCard.playerIndex, "respond", {
        providerId: "card",
        cardId: responseCard.cardId,
      });
      const event = result.room.timeline.find((timelineEvent) => timelineEvent.type === "card"
        && timelineEvent.card?.id === responseCard.cardId);
      expect(event?.id, `missing public card event ${responseCard.cardId}`).toBeTruthy();
      const journeyCard = page.locator(`[data-public-card-journey-event-id="${event.id}"]`);
      await expect(journeyCard).toHaveAttribute("data-public-card-journey-phase", responseCard.park ? "parked" : "reveal", {
        timeout: responseCard.park ? 12_000 : 10_000,
      });
      if (index === sequence.length - 1) finalAttackEventId = event.id;
    }

    const finalAttack = page.locator(`[data-public-card-journey-event-id="${finalAttackEventId}"]`);
    await expect(finalAttack).toHaveAttribute("data-public-card-journey-phase", "reveal");
    const localParkedTargets = await page.locator(
      `[data-public-card-journey-actor-id="${localViewer.id}"][data-public-card-journey-phase="parked"]`,
    ).evaluateAll((elements) => elements.map((element) => {
      const rect = element.getBoundingClientRect();
      return {
        cardId: element.getAttribute("data-public-card-journey-card-id"),
        left: rect.left,
        top: rect.top,
        right: rect.right,
        bottom: rect.bottom,
      };
    }));
    const parkedHistory = localParkedTargets
      .filter(({ cardId }) => cardId === "u13bg-target-attack-1" || cardId === "u13bg-target-attack-3")
      .sort((left, right) => left.left - right.left);
    expect(parkedHistory).toHaveLength(2);
    expect(parkedHistory[0].left).toBeCloseTo(14, 0);
    expect(parkedHistory[1].right).toBeCloseTo(116, 0);

    const localGeometry = await geometry(page);
    assertGeometry(localGeometry);
    const observerGeometry = await geometry(observerPage);
    assertGeometry(observerGeometry);
    await expect.poll(async () => readChip(observerPage)).toBe(await readChip(page));

    const matchingTrace = [...placementTraces].reverse().find((trace) => trace.outcome === "placed"
      && trace.obstacles.some(({ sources }) => sources.some((source) => source.startsWith("actual:") && source.includes("public-card-journey-card.is-revealing"))));
    expect(matchingTrace, `expected an opt-in candidate trace for the real Duel journey; captured ${JSON.stringify(placementTraces)}`).toBeTruthy();
    expect(matchingTrace).toMatchObject({ decision: "reflow", visibility: "visible" });
    expect(matchingTrace.geometryEpoch).toBeGreaterThan(0);
    expect(matchingTrace.placementReason).toBe("centered-slot-safe");
    expect(matchingTrace.centeredCandidateRect).toBeTruthy();
    expect(matchingTrace.chosenRect).toBeTruthy();
    expect(matchingTrace.actualObstacleIds).toEqual(expect.any(Array));
    expect(matchingTrace.projectedObstacleIds.some((id) => id.includes("public-card-journey-card"))).toBe(false);
    expect(matchingTrace.rejectedCandidates).toEqual(expect.any(Array));
    expect(matchingTrace).not.toHaveProperty("statusText");
    expect(matchingTrace).not.toHaveProperty("privateHand");
    expect(matchingTrace.chosenCollisionIds).toEqual([]);
    expect(Math.abs(matchingTrace.chosen.horizontalOffset)).toBeLessThanOrEqual(4);
    expect(Number(localGeometry.chipZIndex)).toBeGreaterThan(Number(localGeometry.journeyZIndex));
    expect(matchingTrace.candidates.some(({ accepted }) => accepted)).toBe(true);
    expect(matchingTrace.obstacles.every(({ left, top, right, bottom, width, height }) =>
      [left, top, right, bottom, width, height].every(Number.isFinite))).toBe(true);
    console.log("U13-B-G 440x766 placement", JSON.stringify({
      chip: matchingTrace.chip,
      safeBounds: matchingTrace.safeBounds,
      parkedHistory,
      chosenHorizontalOffset: matchingTrace.chosen.horizontalOffset,
      testedCandidates: matchingTrace.candidates.length,
      rejectedCandidates: matchingTrace.candidates.filter(({ accepted }) => !accepted).length,
    }));

    await testInfo.attach("u13-b-g-real-journey-diagnostics", {
      body: JSON.stringify({
        localParkedTargets,
        localGeometry,
        observerGeometry,
        chosenTrace: matchingTrace,
      }, null, 2),
      contentType: "application/json",
    });
    await testInfo.attach("u13-b-g-440x766-local-viewer", {
      body: await page.screenshot({ fullPage: true }),
      contentType: "image/png",
    });

    await page.locator(".public-card-journey-card").first().click();
    await expect(page.locator(".card-details-panel")).toBeVisible();
    const inspectedGeometry = await geometry(page);
    if (inspectedGeometry.visibility === "visible") assertGeometry(inspectedGeometry);
    else {
      expect(inspectedGeometry.placement).toBe("hidden");
      expect(placementTraces.some((trace) => trace.outcome === "hidden:no-safe-candidate"
        && trace.obstacles.some(({ sources }) => sources.some((source) => source.includes("card-details-panel"))))).toBe(true);
    }
    await page.getByRole("button", { name: "Close card details" }).click();
    await expect(page.locator(".card-details-panel")).toHaveCount(0);

    await expect(finalAttack).toHaveAttribute("data-public-card-journey-phase", "parked", { timeout: 12_000 });
    const parkedRects = async () => page.locator('[data-public-card-journey-phase="parked"]').evaluateAll((elements) => elements.map((element) => {
      const bounds = element.getBoundingClientRect();
      return { eventId: element.dataset.publicCardJourneyEventId, left: bounds.left, top: bounds.top };
    }).sort((left, right) => left.eventId.localeCompare(right.eventId)));
    const beforeInspector = await parkedRects();
    await page.locator(`[data-player-anchor="${room.players[0].id}"] .opponent-hero-target`).click();
    await expect(page.locator(".opponent-inspection-floating-shell")).toBeVisible();
    await expect(page.locator('[data-public-card-inspection-history="true"]')).toBeVisible();
    const duringInspector = await parkedRects();
    expect(duringInspector.map(({ eventId }) => eventId)).toEqual(beforeInspector.map(({ eventId }) => eventId));
    for (let index = 0; index < beforeInspector.length; index += 1) {
      expect(Math.abs(duringInspector[index].left - beforeInspector[index].left)).toBeLessThanOrEqual(1);
      expect(Math.abs(duringInspector[index].top - beforeInspector[index].top)).toBeLessThanOrEqual(1);
    }
    const inspectorGeometry = await geometry(page);
    if (inspectorGeometry.visibility === "visible") expect(inspectorGeometry.overlaps).toEqual([]);
    await page.keyboard.press("Escape");
    await expect(page.locator(".opponent-inspection-floating-shell")).toHaveCount(0);

    const damaged = await action(request, room, 1, "decline_response");
    const damageFact = damaged.room.presentationSnapshot.retainedPublicEvent;
    expect(damageFact?.category).toBe("DAMAGE_APPLIED");
    const damageH4 = page.locator(`.public-interaction-event-announcement[data-public-interaction-event-id="${damageFact.eventId}"] .public-card-display-journey-copy`);
    await expect(damageH4).toBeVisible();
    await expect(damageH4).toContainText("damage");
    for (const { eventId } of beforeInspector) {
      await expect(page.locator(`.table-resolution-layer [data-settlement-event-id="${eventId}"]`)).toHaveCount(0);
    }
    const beforePoll = await damageH4.boundingBox();
    await page.waitForTimeout(1200);
    const afterPoll = await damageH4.boundingBox();
    expect(beforePoll).toBeTruthy();
    expect(afterPoll).toBeTruthy();
    expect(Math.abs(afterPoll.x - beforePoll.x)).toBeLessThanOrEqual(1);
    expect(Math.abs(afterPoll.y - beforePoll.y)).toBeLessThanOrEqual(1);
  } finally {
    await observerContext.close();
  }
});

test("public activity chip fits real 4, 6, and 8 seat games across supported phone widths", async ({ browser, request }, testInfo) => {
  const viewports = [
    { width: 390, height: 844 },
    { width: 390, height: 700 },
    { width: 440, height: 894 },
    { width: 480, height: 900 },
  ];
  for (const count of [4, 6, 8]) {
    const room = await seed(request, count);
    const context = await browser.newContext({ viewport: viewports[0] });
    try {
      const page = await context.newPage();
      await openPlayer(page, room, 0, viewports[0]);
      await expect(page.locator(`.play-table[data-seat-topology="${count >= 5 ? "side-column" : "top-row"}"]`)).toBeVisible();
      for (const viewport of viewports) {
        await page.setViewportSize(viewport);
        await expect(page.locator("[data-public-activity-chip]")).toBeVisible();
        let result;
        await expect.poll(async () => {
          result = await geometry(page);
          return result.chip.bottom <= result.table.bottom
            && result.chip.top >= result.table.top + result.table.height * 0.55;
        }, { timeout: 2_000 }).toBe(true);
        await testInfo.attach(`public-activity-${count}-seats-${viewport.width}x${viewport.height}`, {
          body: await page.screenshot({ fullPage: true }),
          contentType: "image/png",
        });
        console.log(JSON.stringify({ playerCount: count, ...viewport, ...result }));
        assertGeometry(result);
      }
    } finally {
      await context.close();
    }
  }
});

test("public activity chip preserves safe placement in the synthetic ten-seat layout", async ({ page }, testInfo) => {
  const viewports = [
    { width: 390, height: 844 },
    { width: 390, height: 700 },
    { width: 440, height: 894 },
    { width: 480, height: 900 },
  ];
  await page.setViewportSize(viewports[0]);
  await page.goto("/tests/browser/fixture.html?state=normal&count=10");
  await expect(page.locator('.play-table[data-seat-topology="side-column"] .player-board[data-player-count="10"]')).toBeVisible();
  await expect(page.locator("[data-public-activity-chip]")).toBeVisible();

  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    let result;
    await expect.poll(async () => {
      result = await geometry(page);
      return result.chip.bottom <= result.table.bottom
        && result.chip.top >= result.table.top + result.table.height * 0.55;
    }, { timeout: 2_000 }).toBe(true);
    assertGeometry(result);
    await testInfo.attach(`public-activity-synthetic-10-seats-${viewport.width}x${viewport.height}`, {
      body: await page.screenshot({ fullPage: true }),
      contentType: "image/png",
    });
  }
});
