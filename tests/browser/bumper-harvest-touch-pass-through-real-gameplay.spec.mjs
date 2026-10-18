import { expect, test } from "@playwright/test";

const API = "http://127.0.0.1:3137";
const SAFE_HEROES = new Set([
  "cao-cao", "xiahou-dun", "liu-bei", "guan-yu", "zhang-fei", "zhao-yun",
  "sun-quan", "gan-ning", "huang-gai", "lu-xun", "huaxiong", "gongsun-zan",
  "pan-feng", "ma-chao", "lü-bu", "simayi", "guo-jia",
]);

async function postAction(request, name, code, token, action, values = {}) {
  const response = await request.post(`${API}/api/rooms`, { data: { action, name, code, token, ...values } });
  const body = await response.json();
  expect(response.status(), `${action}: ${body.error ?? "unexpected response"}`).toBeLessThan(300);
  return body.room;
}

async function readRoom(request, code, token, viewerId) {
  const query = new URLSearchParams({ code, token, ...(viewerId ? { testViewerId: viewerId } : {}) });
  const response = await request.get(`${API}/api/rooms?${query}`);
  expect(response.ok()).toBeTruthy();
  return response.json();
}

const harvestSeedRoles = {
  4: ["Lord", "Loyalist", "Rebel", "Renegade"],
  6: ["Lord", "Loyalist", "Rebel", "Rebel", "Rebel", "Renegade"],
  8: ["Lord", "Loyalist", "Loyalist", "Rebel", "Rebel", "Rebel", "Rebel", "Renegade"],
};
const harvestSeedHeroes = ["cao-cao", "liu-bei", "sun-quan", "simayi", "zhao-yun", "guan-yu", "xiahou-dun", "huang-gai"];

async function seedHarvestPool(request, seatCount, aliveCount = seatCount, additionalHandsBySeat = {}) {
  const deck = Array.from({ length: seatCount }, (_, index) => ({
    id: `harvest-density-${seatCount}-${index + 1}`,
    kind: index % 2 ? "Dodge" : "Attack",
    suit: ["♠", "♥", "♦", "♣"][index % 4],
    rank: String(index + 2),
  }));
  const players = harvestSeedRoles[seatCount].map((role, index) => ({
    name: `DENSITY ${seatCount} PLAYER ${index + 1}`,
    role,
    hero: harvestSeedHeroes[index],
    hp: index < aliveCount ? 4 : 0,
    maxHp: 4,
    alive: index < aliveCount,
    hand: [
      ...(index === 0 ? [{ id: `harvest-density-root-${seatCount}`, kind: "BumperHarvest", suit: "♣", rank: "7" }] : []),
      ...(additionalHandsBySeat[index] ?? []),
    ],
  }));
  const response = await request.post(`${API}/__test/seed-playing-game`, {
    data: { phase: "play", turnSeat: 0, players, deck },
  });
  if (!response.ok()) throw new Error(`Harvest density room seed failed: ${await response.text()}`);
  return response.json();
}

async function commitHarvestNegation(request, seed, winnerIndex, cardId) {
  const winner = seed.players[winnerIndex];
  const opened = await readRoom(request, seed.code, winner.token);
  const windowId = opened.currentAction?.negationWindowId;
  expect(windowId, `${winner.name} has a live Negation checkpoint`).toBeTruthy();
  expect(opened.currentAction.actorId).toBe(winner.id);
  expect(opened.publicHarvestPool?.semantics).toBe("PROVEN");
  const held = await request.post(`${API}/__test/negation-window-clock`, {
    data: { code: seed.code, windowId, mode: "hold" },
  });
  expect(held.ok(), await held.text()).toBeTruthy();

  const intent = await request.post(`${API}/api/rooms`, {
    data: {
      action: "respond",
      code: seed.code,
      token: winner.token,
      providerId: "negation_card",
      cardId,
      context: { windowId },
    },
  });
  expect(intent.ok(), await intent.text()).toBeTruthy();

  for (const player of seed.players) {
    const privateIntent = await readRoom(request, seed.code, player.token);
    expect(privateIntent.timeline.some((event) => event?.type === "card" && event.card?.id === cardId)).toBe(false);
    expect(JSON.stringify(privateIntent.presentationSnapshot ?? {})).not.toContain(cardId);
  }

  for (const player of seed.players) {
    if (player.id === winner.id) continue;
    const pass = await request.post(`${API}/api/rooms`, {
      data: { action: "decline_response", code: seed.code, token: player.token, context: { windowId } },
    });
    expect(pass.ok(), `${player.name} passes the shared Negation window: ${await pass.text()}`).toBeTruthy();
  }

  const settled = await readRoom(request, seed.code, seed.players[0].token);
  const event = settled.timeline.find((candidate) => candidate?.type === "card" && candidate.card?.id === cardId);
  expect(event, "the played physical response is public only after the shared window settles").toBeTruthy();
  expect(event.player).toBe(winner.name);
  expect(settled.publicHarvestPool?.semantics).toBe("PROVEN");
  return { windowId, event, room: settled };
}

async function advanceHarvestNegationToActor(request, seed, expectedActor) {
  for (let attempt = 0; attempt < seed.players.length + 1; attempt += 1) {
    const current = await readRoom(request, seed.code, expectedActor.token);
    if (current.phase !== "response") throw new Error(`Expected a Harvest Negation window before ${expectedActor.name}'s response, got ${current.phase}/${current.pending?.kind}`);
    if (current.currentAction?.actorId === expectedActor.id) return current;
    const actor = seed.players.find((player) => player.id === current.currentAction?.actorId);
    expect(actor, "the authoritative response actor belongs to this Harvest room").toBeTruthy();
    expect(current.currentAction?.legalActions).toContain("decline_response");
    const windowId = current.currentAction?.negationWindowId;
    expect(windowId).toBeTruthy();
    const held = await request.post(`${API}/__test/negation-window-clock`, {
      data: { code: seed.code, windowId, mode: "hold" },
    });
    expect(held.ok(), await held.text()).toBeTruthy();
    const passed = await request.post(`${API}/api/rooms`, {
      data: { action: "decline_response", code: seed.code, token: actor.token, context: { windowId } },
    });
    expect(passed.ok(), `${actor.name} passes before ${expectedActor.name}: ${await passed.text()}`).toBeTruthy();
  }
  const current = await readRoom(request, seed.code, expectedActor.token);
  throw new Error(`Harvest Negation did not reach ${expectedActor.name}: ${JSON.stringify(current.currentAction)}`);
}

async function measureHarvestParking(page, cardId, eventId) {
  return page.evaluate(({ expectedCardId, expectedEventId }) => {
    const rect = (element) => {
      if (!element) return null;
      const { left, top, right, bottom, width, height } = element.getBoundingClientRect();
      return { left, top, right, bottom, width, height };
    };
    const card = [...document.querySelectorAll("[data-public-card-journey-card-id]")]
      .find((element) => element.dataset.publicCardJourneyCardId === expectedCardId
        && element.dataset.publicCardJourneyEventId === expectedEventId);
    if (!card) return null;
    const actorId = card.dataset.publicCardJourneyActorId;
    const actor = [...document.querySelectorAll("[data-player-anchor]")]
      .find((element) => element.dataset.playerAnchor === actorId);
    const hero = actor?.querySelector(actor?.classList.contains("local-player-dock")
      ? ".local-hero-card" : ".opponent-hero-card");
    const face = card.querySelector(".played-card");
    const target = {
      left: Number(card.dataset.publicCardJourneyTargetLeft),
      top: Number(card.dataset.publicCardJourneyTargetTop),
      width: Number(card.dataset.publicCardJourneyTargetWidth),
      height: Number(card.dataset.publicCardJourneyTargetHeight),
    };
    const overlaps = (first, second) => Boolean(first && second
      && first.left < second.right && first.right > second.left
      && first.top < second.bottom && first.bottom > second.top);
    const selectors = [
      ".console-guidance", ".decision-status", ".public-card-display-journey-copy",
      ".public-activity-chip", "[data-public-activity-chip]", ".visible-countdown", ".stage-system-cluster",
      ".local-hand-rail [data-hand-card-id]", ".local-hand-rail button", ".turn-controls button",
      ...(card.dataset.publicCardJourneyRole === "root" ? [] : [".harvest-choice-heading"]),
      ...(card.dataset.publicCardJourneyRole === "root" ? [] : [
        ".harvest-card-choice", ".harvest-card-select", ".harvest-card-info", ".harvest-confirm-row button",
      ]),
    ];
    const blockers = selectors.flatMap((selector) => [...document.querySelectorAll(selector)]
      .filter((element) => {
        const bounds = element.getBoundingClientRect();
        const style = getComputedStyle(element);
        return style.display !== "none" && style.visibility !== "hidden" && bounds.width > 0 && bounds.height > 0;
      })
      .map((element) => ({ selector, rect: rect(element), hitTarget: element.matches("button, [role='button']") })));
    const collisions = blockers.filter(({ rect: blocker }) => overlaps(target, blocker));
    const heroRect = rect(hero);
    const actorRect = rect(actor);
    const sideColumn = actor?.dataset.sideColumn ?? null;
    const tableRect = rect(document.querySelector(".play-table"));
    const otherAnchors = [...document.querySelectorAll("[data-player-anchor]")]
      .filter((element) => element !== actor)
      .map((element) => ({ selector: "[data-player-anchor]", rect: rect(element) }));
    const cardWidth = target.width;
    const candidateProbes = tableRect && actorRect ? [
      { name: "actor-centred-below", left: actorRect.left + (actorRect.width - cardWidth) / 2, top: actorRect.bottom + 6 },
      { name: "table-right-below", left: tableRect.right - cardWidth - 8, top: actorRect.bottom + 6 },
      { name: "pool-right-edge", left: (rect(document.querySelector(".harvest-choice-stage"))?.right ?? 0) + 2, top: actorRect.bottom + 6 },
    ].map((candidate) => ({
      ...candidate,
      width: cardWidth,
      height: target.height,
      right: candidate.left + cardWidth,
      bottom: candidate.top + target.height,
      blockers: [
        ...blockers,
        ...otherAnchors,
        ...[...document.querySelectorAll("[data-public-card-journey-phase='parked']")]
          .filter((element) => element !== card)
          .map((element) => ({ selector: "other parked card", rect: rect(element) })),
      ].filter(({ rect: blocker }) => overlaps({ ...candidate, width: cardWidth, height: target.height,
        right: candidate.left + cardWidth, bottom: candidate.top + target.height }, blocker)),
    })) : [];
    const edgeDistance = (bounds) => {
      if (!bounds) return null;
      const dx = Math.max(0, bounds.left - (target.left + target.width), target.left - bounds.right);
      const dy = Math.max(0, bounds.top - (target.top + target.height), target.top - bounds.bottom);
      return Math.hypot(dx, dy);
    };
    const actualRect = rect(card);
    return {
      viewport: { width: innerWidth, height: innerHeight },
      cardId: card.dataset.publicCardJourneyCardId,
      eventId: card.dataset.publicCardJourneyEventId,
      actorId,
      role: card.dataset.publicCardJourneyRole,
      actorIsLocal: Boolean(actor?.classList.contains("local-player-dock")),
      sideColumn,
      phase: card.dataset.publicCardJourneyPhase,
      layoutPending: card.closest(".public-card-display")?.dataset.publicCardLayoutPending,
      target,
      actual: actualRect,
      face: rect(face),
      actorRect,
      heroRect,
      tableRect,
      displayMotion: card.closest(".public-card-display")?.dataset.publicCardMotion ?? null,
      displayHarvestActive: card.closest(".public-card-display")?.dataset.publicCardHarvestActive ?? null,
      authorEdgeDistance: edgeDistance(actor?.classList.contains("local-player-dock") ? heroRect : actorRect),
      collisions,
      candidateProbes,
      h4: rect(document.querySelector(".public-card-display-journey-copy")),
      pool: rect(document.querySelector(".harvest-choice-panel")),
    };
  }, { expectedCardId: cardId, expectedEventId: eventId });
}

function expectHarvestCardParkedByAuthor(metrics, label) {
  expect(metrics, `${label} card remains mounted`).toBeTruthy();
  expect(metrics.actorId, JSON.stringify({ label, metrics })).toBeTruthy();
  expect(metrics.phase, JSON.stringify({ label, metrics })).toBe("parked");
  expect(metrics.layoutPending, JSON.stringify({ label, metrics })).toBe("false");
  expect(metrics.target.width, JSON.stringify({ label, metrics })).toBe(metrics.role === "root" ? 40 : 48);
  expect(metrics.target.height, JSON.stringify({ label, metrics })).toBe(metrics.role === "root" ? 60 : 72);
  expect(metrics.actual.left, JSON.stringify({ label, metrics })).toBeCloseTo(metrics.target.left, 1);
  expect(metrics.actual.top, JSON.stringify({ label, metrics })).toBeCloseTo(metrics.target.top, 1);
  expect(metrics.authorEdgeDistance, JSON.stringify({ label, metrics })).toBeLessThanOrEqual(metrics.actorIsLocal || metrics.role === "root" ? 12 : 92);
  if (metrics.sideColumn === "left") {
    expect(metrics.target.left - metrics.actorRect.right, JSON.stringify({ label, metrics })).toBeCloseTo(6, 1);
  } else if (metrics.sideColumn === "right") {
    expect(metrics.actorRect.left - (metrics.target.left + metrics.target.width), JSON.stringify({ label, metrics })).toBeCloseTo(6, 1);
  }
  expect(metrics.collisions, JSON.stringify({ label, metrics })).toEqual([]);
}

async function openHarvestChoice(request, seed, observeRootJourney) {
  const source = seed.players[0];
  let latestRoom = null;
  const declines = [];
  const played = await request.post(`${API}/api/rooms`, {
    data: { action: "play_card", code: seed.code, token: source.token, cardId: `harvest-density-root-${seed.players.length}` },
  });
  expect(played.ok(), await played.text()).toBeTruthy();
  if (observeRootJourney) await observeRootJourney();
  for (let attempt = 0; attempt < 20; attempt += 1) {
    let room = await readRoom(request, seed.code, source.token);
    latestRoom = room;
    if (room.pendingHarvest) return room;
    if (room.phase !== "response") throw new Error(`Expected Harvest choice or Negation, got ${room.phase}/${room.pending?.kind}`);
    const actor = seed.players.find((player) => player.id === room.currentAction?.actorId);
    expect(actor, "the authoritative Negation actor belongs to this room").toBeTruthy();
    const actorRoom = await readRoom(request, seed.code, actor.token);
    const windowId = actorRoom.currentAction?.negationWindowId;
    expect(windowId).toBeTruthy();
    if (!actorRoom.currentAction?.legalActions?.includes("decline_response")) {
      const expired = await request.post(`${API}/__test/negation-window-clock`, {
        data: { code: seed.code, windowId, mode: "expire" },
      });
      expect(expired.ok(), await expired.text()).toBeTruthy();
      const advanced = await request.post(`${API}/api/rooms`, {
        data: { action: "advance_timers", code: seed.code, token: source.token },
      });
      expect(advanced.ok(), await advanced.text()).toBeTruthy();
      continue;
    }
    const declined = await request.post(`${API}/api/rooms`, {
      data: {
        action: "decline_response",
        code: seed.code,
        token: actor.token,
        context: {
          actionRevision: actorRoom.actionRevision,
          meId: actor.id,
          phase: "response",
          pendingKind: "response",
          windowId,
        },
      },
    });
    const body = await declined.json();
    expect(declined.ok(), JSON.stringify(body)).toBeTruthy();
    declines.push({ actor: actor.name, response: body.room?.phase ?? null, pendingKind: body.room?.pending?.kind ?? null });
  }
  throw new Error(`Bumper Harvest did not reach a choice after Negation: ${JSON.stringify({ phase: latestRoom?.phase, pending: latestRoom?.pending, currentAction: latestRoom?.currentAction, alive: seed.players.map(({ id, name }) => ({ id, name })), declines })}`);
}

test("Bumper Harvest keeps the root reveal and move while the proven Negation pool is visible", async ({ browser, request }, testInfo) => {
  test.setTimeout(60_000);
  const seed = await seedHarvestPool(request, 4, 4);
  const source = seed.players[0];
  const rootCardId = `harvest-density-root-${seed.players.length}`;
  const context = await browser.newContext({ viewport: { width: 390, height: 700 }, isMobile: true, hasTouch: true, deviceScaleFactor: 3, reducedMotion: "no-preference" });
  try {
    const page = await context.newPage();
    await page.addInitScript(({ code, token, name }) => {
      localStorage.setItem("three-realms-session", JSON.stringify({ code, token, name }));
    }, { code: seed.code, token: source.token, name: source.name });
    await page.goto(`${API}/`);
    await expect(page.locator(".game-shell")).toBeVisible();

    const journeySelector = `[data-public-card-journey-card-id="${rootCardId}"]`;
    const journey = page.locator(journeySelector);
    const journeyMeasurements = [];
    const measureJourney = async (phase) => journey.evaluate((element, expectedPhase) => {
      const rect = (node) => {
        if (!node) return null;
        const { left, top, right, bottom, width, height } = node.getBoundingClientRect();
        return { left, top, right, bottom, width, height };
      };
      const face = element.querySelector(".played-card");
      const corner = face?.querySelector("i");
      const title = face?.querySelector(".card-name-mark");
      const type = face?.querySelector("strong");
      const display = element.closest(".public-card-display");
      const pool = document.querySelector(".harvest-choice-stage");
      const faceRect = face?.getBoundingClientRect();
      const overlapsPoolCard = [...(pool?.querySelectorAll(".harvest-card-choice") ?? [])].some((choice) => {
        const choiceRect = choice.getBoundingClientRect();
        return Boolean(faceRect && faceRect.left < choiceRect.right && faceRect.right > choiceRect.left
          && faceRect.top < choiceRect.bottom && faceRect.bottom > choiceRect.top);
      });
      const styleSize = (node) => node ? getComputedStyle(node).fontSize : null;
      return {
        cardId: element.getAttribute("data-public-card-journey-card-id"),
        eventId: element.getAttribute("data-public-card-journey-event-id"),
        phase: element.getAttribute("data-public-card-journey-phase"),
        revealStartedAtIso: element.getAttribute("data-public-card-journey-reveal-started-at"),
        size: element.getAttribute("data-public-card-journey-size"),
        face: rect(face),
        corner: rect(corner),
        cornerFontSize: styleSize(corner),
        suitFontSize: styleSize(corner?.querySelector("small")),
        titleFontSize: styleSize(title),
        typeFontSize: styleSize(type),
        journeyDisplayPosition: display ? getComputedStyle(display).position : null,
        journeyDisplayZIndex: display ? getComputedStyle(display).zIndex : null,
        cardZIndex: getComputedStyle(element).zIndex,
        poolZIndex: pool ? getComputedStyle(pool).zIndex : null,
        overlapsPoolCard,
        expectedPhase,
      };
    }, phase);

    const root = await openHarvestChoice(request, seed, async () => {
      await expect(page.locator('.harvest-choice-stage[data-harvest-readonly="true"]')).toBeVisible({ timeout: 10_000 });
      await expect(journey).toHaveAttribute("data-public-card-journey-phase", "reveal", { timeout: 5_000 });
      await expect(journey).toHaveAttribute("data-public-card-journey-reveal-started-at", /.+/, { timeout: 5_000 });
      await expect(journey).toHaveAttribute("data-public-card-journey-size", "reveal");
      const revealed = await measureJourney("negation-reveal");
      journeyMeasurements.push(revealed);
      expect(revealed.phase).toBe("reveal");
      expect(revealed.size).toBe("reveal");
      expect(revealed.face).toMatchObject({ width: 90, height: 135 });
      expect(revealed.journeyDisplayPosition).toBe("absolute");
      expect(revealed.journeyDisplayZIndex).toBe("auto");
      expect(Number.parseInt(revealed.cardZIndex, 10)).toBeGreaterThan(Number.parseInt(revealed.poolZIndex, 10));
      expect(revealed.overlapsPoolCard).toBe(true);
      expect(revealed.cardId).toBe(rootCardId);
      expect(revealed.eventId).toBeTruthy();

      const waiting = await readRoom(request, seed.code, source.token);
      const windowId = waiting.currentAction?.negationWindowId;
      expect(windowId).toBeTruthy();
      const hold = await request.post(`${API}/__test/negation-window-clock`, {
        data: { code: seed.code, windowId, mode: "hold" },
      });
      expect(hold.ok()).toBeTruthy();

      const revealShot = testInfo.outputPath("bumper-harvest-root-reveal-with-public-pool-390x700.png");
      await page.screenshot({ path: revealShot });
      await testInfo.attach("bumper-harvest-root-reveal-with-public-pool-390x700", { path: revealShot, contentType: "image/png" });

      // Observe the transition from its beginning. Checking the phase first and
      // measuring afterward can miss the 380 ms move and sample the final mini.
      await page.waitForFunction((selector) => {
        const element = document.querySelector(selector);
        const face = element?.querySelector(".played-card");
        return element?.getAttribute("data-public-card-journey-phase") === "move"
          && Boolean(face && face.getBoundingClientRect().width > 40.5 && face.getBoundingClientRect().width < 89.5);
      }, journeySelector, { timeout: 6_000 });
      const moving = await measureJourney("negation-move");
      journeyMeasurements.push(moving);
      expect(moving.cardId).toBe(rootCardId);
      expect(moving.eventId).toBe(revealed.eventId);
      expect(moving.face?.width).toBeGreaterThan(40);
      expect(moving.face?.width).toBeLessThan(90);
      const movingShot = testInfo.outputPath("bumper-harvest-root-moving-with-public-pool-390x700.png");
      await page.screenshot({ path: movingShot });
      await testInfo.attach("bumper-harvest-root-moving-with-public-pool-390x700", { path: movingShot, contentType: "image/png" });
      const revealElapsedMs = await page.evaluate((startedAt) =>
        performance.timeOrigin + performance.now() - Date.parse(startedAt), revealed.revealStartedAtIso);
      expect(revealElapsedMs).toBeGreaterThanOrEqual(3_500);
      expect(revealElapsedMs).toBeLessThan(5_500);

      await expect(journey).toHaveAttribute("data-public-card-journey-phase", "parked", { timeout: 2_000 });
      await expect(journey).toHaveAttribute("data-public-card-journey-size", "thumbnail");
      await expect.poll(async () => {
        const current = await measureJourney("thumbnail-transition");
        return Math.abs(current.corner.width / current.face.width - revealed.corner.width / revealed.face.width);
      }, { timeout: 2_000 }).toBeLessThanOrEqual(.06);
      const parked = await measureJourney("negation-parked");
      journeyMeasurements.push(parked);
      expect(parked.cardId).toBe(rootCardId);
      expect(parked.eventId).toBe(revealed.eventId);
      expect(parked.face).toMatchObject({ width: 40, height: 60 });
      expect(Number.parseInt(parked.cardZIndex, 10)).toBeLessThan(Number.parseInt(parked.poolZIndex, 10));
      expect(Math.abs(parked.corner.width / parked.face.width - revealed.corner.width / revealed.face.width)).toBeLessThanOrEqual(.06);
      expect(Math.abs(parked.corner.height / parked.face.height - revealed.corner.height / revealed.face.height)).toBeLessThanOrEqual(.06);
      expect(Math.abs(Number.parseFloat(parked.cornerFontSize) / parked.face.width
        - Number.parseFloat(revealed.cornerFontSize) / revealed.face.width)).toBeLessThanOrEqual(.06);
      expect(Math.abs(Number.parseFloat(parked.suitFontSize) / parked.face.width
        - Number.parseFloat(revealed.suitFontSize) / revealed.face.width)).toBeLessThanOrEqual(.06);
      expect(Math.abs(Number.parseFloat(parked.titleFontSize) / parked.face.width
        - Number.parseFloat(revealed.titleFontSize) / revealed.face.width)).toBeLessThanOrEqual(.06);
      expect(Math.abs(Number.parseFloat(parked.typeFontSize) / parked.face.width
        - Number.parseFloat(revealed.typeFontSize) / revealed.face.width)).toBeLessThanOrEqual(.06);
    });
    expect(root.pendingHarvest?.actorId).toBe(source.id);
    await expect(page.locator(".harvest-choice-panel--actor")).toBeVisible();

    const parkedRoot = page.locator('[data-public-card-harvest-active="true"] .public-card-display-static-card');
    await expect(parkedRoot).toBeVisible();
    const parkedMetrics = await parkedRoot.evaluate((element) => {
      const rect = (node) => {
        if (!node) return null;
        const { left, top, right, bottom, width, height } = node.getBoundingClientRect();
        return { left, top, right, bottom, width, height };
      };
      const face = element.querySelector(".played-card");
      const corner = face?.querySelector("i");
      const title = face?.querySelector(".card-name-mark");
      const type = face?.querySelector("strong");
      const size = (node) => node ? getComputedStyle(node).fontSize : null;
      return {
        cardId: element.getAttribute("data-public-card-static-card-id"),
        eventId: element.getAttribute("data-public-card-static-event-id"),
        face: rect(face),
        corner: rect(corner),
        cornerFontSize: size(corner),
        suitFontSize: size(corner?.querySelector("small")),
        titleFontSize: size(title),
        typeFontSize: size(type),
      };
    });
    expect(parkedMetrics.cardId).toBe(rootCardId);
    expect(parkedMetrics.eventId).toBe(journeyMeasurements[0].eventId);
    expect(parkedMetrics.face).toMatchObject({ width: 40, height: 60 });
    expect(parkedMetrics.corner.width / parkedMetrics.face.width).toBeLessThanOrEqual(.18);
    expect(parkedMetrics.corner.height / parkedMetrics.face.height).toBeLessThanOrEqual(.19);
    expect(Number.parseFloat(parkedMetrics.cornerFontSize)).toBeLessThanOrEqual(4.5);
    expect(Number.parseFloat(parkedMetrics.suitFontSize)).toBeLessThanOrEqual(3.75);
    expect(Number.parseFloat(parkedMetrics.titleFontSize)).toBeLessThanOrEqual(5);
    await testInfo.attach("bumper-harvest-root-lifecycle-390x700", {
      body: JSON.stringify({ rootCardId, journeyMeasurements, parkedMetrics }, null, 2),
      contentType: "application/json",
    });
    const screenshot = testInfo.outputPath("bumper-harvest-root-parked-390x700.png");
    await page.screenshot({ path: screenshot, animations: "disabled" });
    await testInfo.attach("bumper-harvest-root-parked-390x700", { path: screenshot, contentType: "image/png" });
  } finally {
    await context.close();
  }
});

test("committed Bumper Harvest Negation and counter reveals paint above the read-only pool on phone", async ({ browser, request }, testInfo) => {
  test.setTimeout(90_000);
  const firstNegationId = "harvest-layer-first-negation";
  const counterNegationId = "harvest-layer-counter-negation";
  const seed = await seedHarvestPool(request, 4, 4, {
    1: [{ id: firstNegationId, kind: "Negation", suit: "♦", rank: "A" }],
    2: [{ id: counterNegationId, kind: "Negation", suit: "♣", rank: "K" }],
  });
  const [source, firstResponder, counterResponder] = seed.players;
  const rootCardId = `harvest-density-root-${seed.players.length}`;
  const viewerContexts = [];
  const phoneViewports = [
    { width: 390, height: 700 },
    { width: 390, height: 844 },
    { width: 440, height: 766 },
    { width: 440, height: 894 },
  ];
  try {
    const viewerPages = await Promise.all(seed.players.map(async (viewer, index) => {
      const viewerContext = await browser.newContext({
        viewport: phoneViewports[index],
        isMobile: true,
        hasTouch: true,
        deviceScaleFactor: 3,
      });
      viewerContexts.push(viewerContext);
      const viewerPage = await viewerContext.newPage();
      await viewerPage.addInitScript(({ code, token, name }) => {
        localStorage.setItem("three-realms-session", JSON.stringify({ code, token, name }));
      }, { code: seed.code, token: viewer.token, name: viewer.name });
      await viewerPage.goto(`${API}/`);
      await expect(viewerPage.locator(".game-shell")).toBeVisible();
      return { viewer, page: viewerPage };
    }));
    const page = viewerPages[0].page;

    const declared = await request.post(`${API}/api/rooms`, {
      data: { action: "play_card", code: seed.code, token: source.token, cardId: rootCardId },
    });
    expect(declared.ok(), await declared.text()).toBeTruthy();
    const rootWindow = await readRoom(request, seed.code, source.token);
    const rootPool = rootWindow.publicHarvestPool;
    const rootProgress = rootWindow.presentationSnapshot?.bumperHarvestProgress;
    const rootEvent = rootWindow.timeline.find((event) => event?.type === "card" && event.card?.id === rootCardId);
    expect(rootPool?.semantics).toBe("PROVEN");
    expect(rootProgress?.rootEventId).toBe(rootEvent?.id);
    expect(rootProgress?.semantics).toBe("PROVEN");
    const initialWindowId = rootWindow.currentAction?.negationWindowId;
    expect(initialWindowId, "the initial Bumper Harvest Negation window is active").toBeTruthy();
    const holdInitialWindow = await request.post(`${API}/__test/negation-window-clock`, {
      data: { code: seed.code, windowId: initialWindowId, mode: "hold" },
    });
    expect(holdInitialWindow.ok(), await holdInitialWindow.text()).toBeTruthy();
    await testInfo.attach("bumper-harvest-initial-negation-public-proof", {
      body: JSON.stringify({
        phase: rootWindow.phase,
        pendingKind: rootWindow.pending?.kind ?? null,
        currentActionKind: rootWindow.currentAction?.kind ?? null,
        decisionActorId: rootWindow.currentAction?.actorId ?? null,
        interactionScene: rootWindow.presentationV2?.interactionScene ?? null,
        bumperHarvestProgress: rootProgress,
        reactionChain: rootWindow.presentationSnapshot?.reactionChain ?? null,
        pendingHarvest: rootWindow.pendingHarvest ? {
          actorId: rootWindow.pendingHarvest.actorId,
          revealedIds: rootWindow.pendingHarvest.revealed?.map(({ id }) => id) ?? [],
          availableIds: rootWindow.pendingHarvest.availableIds,
          choices: rootWindow.pendingHarvest.choices,
        } : null,
        publicHarvestPool: rootPool ? {
          semantics: rootPool.semantics,
          rootEventId: rootPool.rootEventId,
          revealEventId: rootPool.revealEventId,
          revealedIds: rootPool.revealed.map(({ id }) => id),
          availableIds: rootPool.availableIds,
          choices: rootPool.choices,
        } : null,
      }, null, 2),
      contentType: "application/json",
    });
    const rootEffectRecipient = seed.players.find(({ id }) => id === rootProgress.currentParticipantId);
    expect(rootEffectRecipient, "public progress identifies the current Harvest effect participant").toBeTruthy();
    const initialAnnouncement = `Negation: Block ${rootEffectRecipient.name}'s Harvest pick?`;
    await Promise.all(viewerPages.map(async ({ viewer, page: viewerPage }) => {
      const h4 = viewerPage.locator(".public-card-display-journey-copy b");
      await expect(h4).toHaveAttribute("aria-label", initialAnnouncement, { timeout: 10_000 });
      await expect(viewerPage.locator(".harvest-choice-heading span"))
        .toHaveText(`Negation for ${rootEffectRecipient.name} · Read-only`);
      await expect(viewerPage.locator(".harvest-card-select, .harvest-confirm-row")).toHaveCount(0);
      await expect(h4).toBeVisible();
      expect(await h4.innerText()).toContain("Negation");
      expect(await h4.innerText()).toContain(rootEffectRecipient.name);
      expect(await h4.innerText()).not.toContain("Negation can be played");
      const lineCount = Number(await h4.locator("xpath=..").getAttribute("data-public-card-announcement-lines"));
      expect(lineCount, `Harvest Negation guidance fits two phone lines for ${viewer.id}`).toBeGreaterThan(0);
      expect(lineCount, `Harvest Negation guidance fits two phone lines for ${viewer.id}`).toBeLessThanOrEqual(2);
    }));

    const root = page.locator(`[data-public-card-journey-card-id="${rootCardId}"]`);
    const rootSelector = `[data-public-card-journey-event-id="${rootEvent.id}"]`;
    await expect(page.locator('.harvest-choice-stage[data-harvest-readonly="true"]')).toBeVisible({ timeout: 10_000 });
    await expect(root).toHaveAttribute("data-public-card-journey-role", "root");
    await expect(root).toHaveAttribute("data-public-card-journey-phase", "reveal");
    await expect(root).toHaveAttribute("data-public-card-journey-size", "reveal");
    const rootRevealStartedAt = await root.getAttribute("data-public-card-journey-reveal-started-at");
    expect(rootRevealStartedAt).toBeTruthy();
    await page.waitForFunction(({ selector, startedAt }) => {
      const card = document.querySelector(selector);
      return card?.getAttribute("data-public-card-journey-reveal-started-at") === startedAt
        && Date.now() - Date.parse(startedAt) >= 500;
    }, { selector: rootSelector, startedAt: rootRevealStartedAt });
    await Promise.all(viewerPages.map(async ({ page: viewerPage }) => {
      const viewerRoot = viewerPage.locator(`[data-public-card-journey-card-id="${rootCardId}"][data-public-card-journey-event-id="${rootEvent.id}"]`);
      await expect(viewerRoot).toHaveAttribute("data-public-card-journey-phase", "parked", { timeout: 12_000 });
    }));
    const rootParkingByViewer = await Promise.all(viewerPages.map(async ({ viewer, page: viewerPage }) => ({
      viewerId: viewer.id,
      parking: await measureHarvestParking(viewerPage, rootCardId, rootEvent.id),
    })));
    for (const { viewerId, parking } of rootParkingByViewer) {
      expectHarvestCardParkedByAuthor(parking, `Harvest root viewer ${viewerId}`);
      expect(parking.actorId, JSON.stringify({ viewerId, parking })).toBe(source.id);
      expect(parking.actorIsLocal, JSON.stringify({ viewerId, parking })).toBe(viewerId === source.id);
    }
    await testInfo.attach("bumper-harvest-root-author-parking-four-viewers-phone-viewports", {
      body: JSON.stringify(rootParkingByViewer, null, 2),
      contentType: "application/json",
    });

    await advanceHarvestNegationToActor(request, seed, firstResponder);
    const firstCommit = await commitHarvestNegation(request, seed, 1, firstNegationId);
    expect(firstCommit.event.card.id).toBe(firstNegationId);
    expect(firstCommit.room.publicHarvestPool?.revealed.map(({ id }) => id)).toEqual(rootPool.revealed.map(({ id }) => id));
    expect(firstCommit.room.pendingHarvest).toBeNull();
    const firstCommitProgress = firstCommit.room.presentationSnapshot?.bumperHarvestProgress;
    expect(firstCommitProgress?.semantics).toBe("PROVEN");
    const firstCommitChooser = seed.players.find(({ id }) => id === firstCommitProgress.currentParticipantId);
    expect(firstCommitChooser, "the next Harvest effect participant is named by shared public proof").toBeTruthy();
    const firstCommitAnnouncement = `${firstResponder.name} played Negation → ${firstCommitChooser.name}.`;
    await Promise.all(viewerPages.map(async ({ page: viewerPage }) => {
      const h4 = viewerPage.locator(".public-card-display-journey-copy b");
      await expect(h4)
        .toHaveAttribute("aria-label", firstCommitAnnouncement, { timeout: 10_000 });
      await expect(viewerPage.locator(".harvest-choice-heading span"))
        .toHaveText(`Negation for ${firstCommitChooser.name} · Read-only`);
      const lines = Number(await h4.locator("xpath=..")
        .getAttribute("data-public-card-announcement-lines"));
      expect(lines).toBeGreaterThan(0);
      expect(lines).toBeLessThanOrEqual(2);
    }));
    await testInfo.attach("bumper-harvest-committed-negation-server-proof", {
      body: JSON.stringify({
        stage: firstCommit.room.presentationV2?.interactionScene?.stage,
        continuity: firstCommit.room.presentationV2?.continuity,
        activeFrameId: firstCommit.room.presentationV2?.activeFrameId,
        rootFrameId: firstCommit.room.presentationV2?.rootFrameId,
        progress: firstCommit.room.presentationSnapshot?.bumperHarvestProgress,
        reactionChain: firstCommit.room.presentationSnapshot?.reactionChain,
        publicCardEvents: firstCommit.room.timeline.filter((item) => item?.type === "card" && item?.action === "play")
          .map((item) => ({ id: item.id, player: item.player, cardId: item.card?.id, kind: item.card?.kind })),
      }, null, 2),
      contentType: "application/json",
    });

    const assertCommittedRevealAbovePool = async (cardId, event, label, screenshotName) => {
      const responseCard = page.locator(`[data-public-card-journey-card-id="${cardId}"][data-public-card-journey-event-id="${event.id}"]`);
      await expect(responseCard).toHaveAttribute("data-public-card-journey-event-id", event.id, { timeout: 10_000 });
      await expect(responseCard).toHaveAttribute("data-public-card-journey-role", "response");
      await expect(responseCard).toHaveAttribute("data-public-card-journey-phase", "reveal", { timeout: 10_000 });
      await expect(responseCard).toHaveAttribute("data-public-card-journey-size", "reveal");
      const journeyDisplay = responseCard.locator("xpath=ancestor::section[@data-public-card-display='true'][1]");
      await expect(journeyDisplay).toHaveAttribute("data-public-card-root-event-id", rootEvent.id);
      await expect(journeyDisplay).toHaveAttribute("data-public-card-motion", "negation");
      const evidence = await page.evaluate(({ cardId: expectedCardId, eventId: expectedEventId, rootId }) => {
        const rect = (element) => {
          if (!element) return null;
          const { left, top, right, bottom, width, height } = element.getBoundingClientRect();
          return { left, top, right, bottom, width, height };
        };
        const intersects = (a, b) => Boolean(a && b && a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top);
        const response = [...document.querySelectorAll("[data-public-card-journey-card-id]")]
          .find((element) => element.getAttribute("data-public-card-journey-card-id") === expectedCardId
            && element.getAttribute("data-public-card-journey-event-id") === expectedEventId);
        const root = [...document.querySelectorAll("[data-public-card-journey-card-id]")]
          .find((element) => element.getAttribute("data-public-card-journey-card-id") === rootId
            && element.getAttribute("data-public-card-journey-role") === "root");
        const pool = document.querySelector(".harvest-choice-stage[data-harvest-readonly='true']");
        const panel = pool?.querySelector(".harvest-choice-panel");
        const responseFace = response?.querySelector(".played-card");
        const responseRect = rect(responseFace);
        const poolCards = [...(pool?.querySelectorAll(".harvest-card-choice") ?? [])];
        const cardOverlap = poolCards.find((candidate) => intersects(responseRect, rect(candidate))) ?? null;
        const overlapRect = cardOverlap ? (() => {
          const bounds = rect(cardOverlap);
          const left = Math.max(responseRect.left, bounds.left);
          const right = Math.min(responseRect.right, bounds.right);
          const top = Math.max(responseRect.top, bounds.top);
          const bottom = Math.min(responseRect.bottom, bounds.bottom);
          return { x: (left + right) / 2, y: (top + bottom) / 2 };
        })() : null;
        let hitStack = [];
        if (overlapRect && cardOverlap && response) {
          // Both visuals deliberately pass hit testing through. Temporarily make
          // only these two measured cards hit-testable so elementsFromPoint can
          // report their paint order; restore immediately without dispatching input.
          const responsePointerEvents = response.style.pointerEvents;
          const poolPointerEvents = cardOverlap.style.pointerEvents;
          response.style.pointerEvents = "auto";
          cardOverlap.style.pointerEvents = "auto";
          hitStack = document.elementsFromPoint(overlapRect.x, overlapRect.y)
            .map((element) => {
              const card = element.closest("[data-public-card-journey-card-id], [data-harvest-card-id]");
              return card ? {
                className: typeof element.className === "string" ? element.className : element.tagName,
                cardId: card.getAttribute("data-public-card-journey-card-id") ?? card.getAttribute("data-harvest-card-id"),
                role: card.getAttribute("data-public-card-journey-role"),
              } : null;
            }).filter(Boolean);
          response.style.pointerEvents = responsePointerEvents;
          cardOverlap.style.pointerEvents = poolPointerEvents;
        }
        return {
          cardId: response?.getAttribute("data-public-card-journey-card-id"),
          eventId: response?.getAttribute("data-public-card-journey-event-id"),
          role: response?.getAttribute("data-public-card-journey-role"),
          phase: response?.getAttribute("data-public-card-journey-phase"),
          size: response?.getAttribute("data-public-card-journey-size"),
          responseFace: responseRect,
          responseZ: response ? Number.parseInt(getComputedStyle(response).zIndex, 10) : null,
          responseDisplayPosition: response ? getComputedStyle(response.closest(".public-card-display")).position : null,
          responseDisplayZ: response ? getComputedStyle(response.closest(".public-card-display")).zIndex : null,
          root: root ? {
            cardId: root.getAttribute("data-public-card-journey-card-id"),
            eventId: root.getAttribute("data-public-card-journey-event-id"),
            phase: root.getAttribute("data-public-card-journey-phase"),
            revealStartedAt: root.getAttribute("data-public-card-journey-reveal-started-at"),
            zIndex: getComputedStyle(root).zIndex,
          } : null,
          poolRect: rect(pool),
          panelRect: rect(panel),
          poolZ: pool ? Number.parseInt(getComputedStyle(pool).zIndex, 10) : null,
          overlappingPoolCard: Boolean(cardOverlap),
          hitStack,
          viewport: { width: innerWidth, height: innerHeight },
        };
      }, { cardId, eventId: event.id, rootId: rootCardId });
      expect(evidence.cardId, JSON.stringify({ label, evidence })).toBe(cardId);
      expect(evidence.eventId, JSON.stringify({ label, evidence })).toBe(event.id);
      expect(evidence.role).toBe("response");
      expect(evidence.phase).toBe("reveal");
      expect(evidence.size).toBe("reveal");
      expect(evidence.responseFace, JSON.stringify({ label, evidence })).toMatchObject({ width: 90, height: 135 });
      expect(evidence.responseZ, JSON.stringify({ label, evidence })).toBeGreaterThan(evidence.poolZ);
      expect(evidence.responseDisplayPosition, JSON.stringify({ label, evidence })).toBe("absolute");
      expect(evidence.responseDisplayZ, JSON.stringify({ label, evidence })).toBe("auto");
      expect(evidence.root?.cardId).toBe(rootCardId);
      expect(evidence.root?.eventId).toBe(rootEvent.id);
      expect(Number.parseInt(evidence.root?.zIndex ?? "0", 10), JSON.stringify({ label, evidence })).toBeLessThan(evidence.poolZ);
      expect(evidence.overlappingPoolCard, JSON.stringify({ label, evidence })).toBe(true);
      const responseIndex = evidence.hitStack.findIndex((entry) => entry.cardId === cardId);
      const poolIndex = evidence.hitStack.findIndex((entry) => rootPool.revealed.some(({ id }) => id === entry.cardId));
      expect(responseIndex, JSON.stringify({ label, evidence })).toBeGreaterThanOrEqual(0);
      expect(poolIndex, JSON.stringify({ label, evidence })).toBeGreaterThanOrEqual(0);
      expect(responseIndex, JSON.stringify({ label, evidence })).toBeLessThan(poolIndex);
      await testInfo.attach(`${label}-mobile-layer-geometry`, { body: JSON.stringify(evidence, null, 2), contentType: "application/json" });
      const screenshot = testInfo.outputPath(`${screenshotName}.png`);
      await page.screenshot({ path: screenshot, animations: "disabled" });
      await testInfo.attach(screenshotName, { path: screenshot, contentType: "image/png" });
    };

    await assertCommittedRevealAbovePool(firstNegationId, firstCommit.event, "committed-negation", "bumper-harvest-negation-reveal-over-pool-390x700");
    await Promise.all(viewerPages.map(async ({ page: viewerPage }) => {
      const responseCard = viewerPage.locator(`[data-public-card-journey-card-id="${firstNegationId}"][data-public-card-journey-event-id="${firstCommit.event.id}"]`);
      await expect(responseCard).toHaveAttribute("data-public-card-journey-phase", "parked", { timeout: 12_000 });
    }));
    const firstResponseParkingByViewer = await Promise.all(viewerPages.map(async ({ viewer, page: viewerPage }) => ({
      viewerId: viewer.id,
      parking: await measureHarvestParking(viewerPage, firstNegationId, firstCommit.event.id),
    })));
    for (const { viewerId, parking } of firstResponseParkingByViewer) {
      expectHarvestCardParkedByAuthor(parking, `Negation response viewer ${viewerId}`);
      expect(parking.actorId, JSON.stringify({ viewerId, parking })).toBe(firstResponder.id);
      expect(parking.actorIsLocal, JSON.stringify({ viewerId, parking })).toBe(viewerId === firstResponder.id);
    }
    await testInfo.attach("bumper-harvest-first-negation-author-parking-four-viewers-phone-viewports", {
      body: JSON.stringify(firstResponseParkingByViewer, null, 2),
      contentType: "application/json",
    });
    const counterWindow = await advanceHarvestNegationToActor(request, seed, counterResponder);
    expect(counterWindow.publicHarvestPool?.revealed.map(({ id }) => id)).toEqual(rootPool.revealed.map(({ id }) => id));
    const counterCommit = await commitHarvestNegation(request, seed, 2, counterNegationId);
    expect(counterCommit.event.card.id).toBe(counterNegationId);
    expect(counterCommit.room.publicHarvestPool?.revealed.map(({ id }) => id)).toEqual(rootPool.revealed.map(({ id }) => id));
    expect(counterCommit.room.pendingHarvest).toBeNull();
    const counterProgress = counterCommit.room.presentationSnapshot?.bumperHarvestProgress;
    const counterEffectRecipient = seed.players.find(({ id }) => id === counterProgress?.currentParticipantId);
    expect(counterEffectRecipient, "public progress keeps the current effect participant named").toBeTruthy();
    const counterAnnouncement = `${counterResponder.name} countered ${firstResponder.name}'s Negation.`;
    await Promise.all(viewerPages.map(async ({ page: viewerPage }) => {
      const h4 = viewerPage.locator(".public-card-display-journey-copy b");
      await expect(h4)
        .toHaveAttribute("aria-label", counterAnnouncement, { timeout: 10_000 });
      await expect(viewerPage.locator(".harvest-choice-heading span"))
        .toHaveText(`Negation for ${counterEffectRecipient.name} · Read-only`);
      const lines = Number(await h4.locator("xpath=..")
        .getAttribute("data-public-card-announcement-lines"));
      expect(lines).toBeGreaterThan(0);
      expect(lines).toBeLessThanOrEqual(2);
      expect(await h4.getAttribute("aria-label")).not.toContain(`Bumper Harvest's effect on ${counterEffectRecipient.name}`);
    }));
    await viewerPages[3].page.reload();
    await expect(viewerPages[3].page.locator(".public-card-display-journey-copy b"))
      .toHaveAttribute("aria-label", counterAnnouncement, { timeout: 10_000 });
    await expect(viewerPages[3].page.locator(".harvest-choice-heading span"))
      .toHaveText(`Negation for ${counterEffectRecipient.name} · Read-only`);
    await assertCommittedRevealAbovePool(counterNegationId, counterCommit.event, "committed-counter-negation", "bumper-harvest-counter-reveal-over-pool-390x700");
    await Promise.all(viewerPages.map(async ({ page: viewerPage }) => {
      const responseCard = viewerPage.locator(`[data-public-card-journey-card-id="${counterNegationId}"][data-public-card-journey-event-id="${counterCommit.event.id}"]`);
      await expect(responseCard).toHaveAttribute("data-public-card-journey-phase", "parked", { timeout: 12_000 });
    }));
    const counterParkingByViewer = await Promise.all(viewerPages.map(async ({ viewer, page: viewerPage }) => ({
      viewerId: viewer.id,
      parking: await measureHarvestParking(viewerPage, counterNegationId, counterCommit.event.id),
    })));
    for (const { viewerId, parking } of counterParkingByViewer) {
      expectHarvestCardParkedByAuthor(parking, `Counter Negation viewer ${viewerId}`);
      expect(parking.actorId, JSON.stringify({ viewerId, parking })).toBe(counterResponder.id);
      expect(parking.actorIsLocal, JSON.stringify({ viewerId, parking })).toBe(viewerId === counterResponder.id);
    }
    await testInfo.attach("bumper-harvest-counter-author-parking-four-viewers-phone-viewports", {
      body: JSON.stringify(counterParkingByViewer, null, 2),
      contentType: "application/json",
    });

    const finalCounterWindowId = counterCommit.room.currentAction?.negationWindowId;
    expect(finalCounterWindowId, "the counter opens its own response window").toBeTruthy();
    const holdFinalCounterWindow = await request.post(`${API}/__test/negation-window-clock`, {
      data: { code: seed.code, windowId: finalCounterWindowId, mode: "hold" },
    });
    expect(holdFinalCounterWindow.ok(), await holdFinalCounterWindow.text()).toBeTruthy();
    for (const responder of seed.players) {
      const current = await readRoom(request, seed.code, responder.token);
      if (current.phase !== "response" || current.currentAction?.negationWindowId !== finalCounterWindowId) break;
      const pass = await request.post(`${API}/api/rooms`, {
        data: { action: "decline_response", code: seed.code, token: responder.token, context: { windowId: finalCounterWindowId } },
      });
      expect(pass.ok(), `${responder.name} passes the counter response window: ${await pass.text()}`).toBeTruthy();
    }

    const firstChoiceRoom = await readRoom(request, seed.code, rootEffectRecipient.token);
    expect(firstChoiceRoom.pendingHarvest?.actorId).toBe(rootEffectRecipient.id);
    const firstChooserPage = viewerPages.find(({ viewer }) => viewer.id === firstChoiceRoom.pendingHarvest.actorId)?.page;
    expect(firstChooserPage, "the affected chooser has an authenticated mobile view").toBeTruthy();
    await expect(firstChooserPage.locator(".harvest-choice-panel--actor"), JSON.stringify({
      meId: firstChoiceRoom.meId,
      pendingHarvest: firstChoiceRoom.pendingHarvest,
      currentAction: firstChoiceRoom.currentAction,
      isMyAction: firstChoiceRoom.isMyAction,
    })).toBeVisible({ timeout: 20_000 });
    const firstHarvestChoice = firstChooserPage.locator(".harvest-card-select:not([disabled])").first();
    await tapHarvestCard(firstChooserPage, firstHarvestChoice);
    const firstHarvestConfirm = firstChooserPage.getByRole("button", { name: "Confirm choice" });
    await expect(firstHarvestConfirm).toBeEnabled();
    const firstHarvestChoiceResponse = firstChooserPage.waitForResponse((response) => {
      if (response.request().method() !== "POST" || response.url() !== `${API}/api/rooms`) return false;
      try { return JSON.parse(response.request().postData() ?? "{}").action === "choose_harvest"; }
      catch { return false; }
    });
    await tap(firstChooserPage, firstHarvestConfirm);
    expect((await firstHarvestChoiceResponse).ok()).toBeTruthy();

    const nextEffectWindow = await readRoom(request, seed.code, source.token);
    expect(nextEffectWindow.phase).toBe("response");
    expect(nextEffectWindow.pendingHarvest).toBeNull();
    const nextEffectProgress = nextEffectWindow.presentationSnapshot?.bumperHarvestProgress;
    expect(nextEffectProgress?.semantics).toBe("PROVEN");
    expect(nextEffectProgress.participants.find(({ playerId }) => playerId === rootEffectRecipient.id)?.status).toBe("RESOLVED");
    const nextEffectRecipient = seed.players.find(({ id }) => id === nextEffectProgress.currentParticipantId);
    expect(nextEffectRecipient, "shared public progress advances to the next effect participant").toBeTruthy();
    expect(nextEffectRecipient.id).not.toBe(rootEffectRecipient.id);
    const nextParticipantAnnouncement = `Negation: Block ${nextEffectRecipient.name}'s Harvest pick?`;
    await Promise.all(viewerPages.map(async ({ page: viewerPage }) => {
      await expect(viewerPage.locator(".public-card-display-journey-copy b"))
        .toHaveAttribute("aria-label", nextParticipantAnnouncement, { timeout: 10_000 });
      await expect(viewerPage.locator(".harvest-choice-heading span"))
        .toHaveText(`Negation for ${nextEffectRecipient.name} · Read-only`);
    }));
    await viewerPages[3].page.reload();
    await expect(viewerPages[3].page.locator(".public-card-display-journey-copy b"))
      .toHaveAttribute("aria-label", nextParticipantAnnouncement, { timeout: 10_000 });
    await expect(viewerPages[3].page.locator(".harvest-choice-heading span"))
      .toHaveText(`Negation for ${nextEffectRecipient.name} · Read-only`);
    await Promise.all(viewerPages.map(({ page: viewerPage }) => viewerPage.setViewportSize({ width: 440, height: 766 })));
    await Promise.all(viewerPages.map(async ({ page: viewerPage }) => {
      await expect(viewerPage.locator(".public-card-display-journey-copy b"))
        .toHaveAttribute("aria-label", nextParticipantAnnouncement, { timeout: 10_000 });
      await expect(viewerPage.locator(".harvest-choice-heading span"))
        .toHaveText(`Negation for ${nextEffectRecipient.name} · Read-only`);
    }));
    const phoneCopyGeometry = await viewerPages[0].page.evaluate(() => {
      const bounds = (selector) => {
        const element = document.querySelector(selector);
        if (!element) return null;
        const { left, top, right, bottom, width, height } = element.getBoundingClientRect();
        return { left, top, right, bottom, width, height };
      };
      const h4 = bounds(".public-card-display-journey-copy");
      const pool = bounds(".harvest-choice-stage");
      const activity = bounds("[data-public-activity-chip]");
      const dock = bounds(".local-player-dock");
      const overlaps = (first, second) => Boolean(first && second
        && first.left < second.right && first.right > second.left
        && first.top < second.bottom && first.bottom > second.top);
      return {
        viewport: { width: innerWidth, height: innerHeight },
        h4,
        pool,
        activity,
        dock,
        overlaps: {
          pool: overlaps(h4, pool),
          activity: overlaps(h4, activity),
          dock: overlaps(h4, dock),
        },
      };
    });
    expect(phoneCopyGeometry.viewport).toEqual({ width: 440, height: 766 });
    expect(phoneCopyGeometry.h4?.width).toBeGreaterThan(0);
    expect(phoneCopyGeometry.h4?.height).toBeGreaterThan(0);
    expect(phoneCopyGeometry.overlaps).toEqual({ pool: false, activity: false, dock: false });
    await testInfo.attach("bumper-harvest-effect-recipient-copy-440x766", {
      body: JSON.stringify(phoneCopyGeometry, null, 2), contentType: "application/json",
    });
    const phoneCopyScreenshot = testInfo.outputPath("bumper-harvest-effect-recipient-copy-440x766.png");
    await viewerPages[0].page.screenshot({ path: phoneCopyScreenshot, animations: "disabled" });
    await testInfo.attach("bumper-harvest-effect-recipient-copy-440x766-screenshot", {
      path: phoneCopyScreenshot, contentType: "image/png",
    });
  } finally {
    await Promise.all(viewerContexts.map((viewerContext) => viewerContext.close()));
  }
});

async function tap(page, locator) {
  const bounds = await locator.boundingBox();
  expect(bounds, "the intended mobile control has a visible hit box").toBeTruthy();
  await page.touchscreen.tap(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
}

async function tapHarvestCard(page, locator) {
  const bounds = await locator.boundingBox();
  expect(bounds, "the intended mobile Harvest card has a visible hit box").toBeTruthy();
  await page.touchscreen.tap(bounds.x + bounds.width / 2, bounds.y + bounds.height * .3);
}

async function harvestGeometry(page) {
  return page.evaluate(() => {
    const rect = (element) => {
      if (!element) return null;
      const { left, top, right, bottom, width, height } = element.getBoundingClientRect();
      return { left, top, right, bottom, width, height };
    };
    const intersects = (first, second) => Boolean(first && second
      && first.left < second.right - 0.5 && first.right > second.left + 0.5
      && first.top < second.bottom - 0.5 && first.bottom > second.top + 0.5);
    const stage = document.querySelector(".harvest-choice-stage");
    const panel = stage?.querySelector(".harvest-choice-panel");
    const row = panel?.querySelector(".harvest-card-row");
    const root = document.querySelector("[data-harvest-root-parked='true']");
    const announcement = document.querySelector("[data-public-card-announcement='true']");
    const footer = panel?.querySelector(".harvest-confirm-row");
    const timer = document.querySelector(".stage-system-cluster .visible-countdown-event");
    const activity = document.querySelector("[data-public-activity-chip]");
    const seats = [...document.querySelectorAll(".player-board > .opponent-player-card")];
    const switches = [...document.querySelectorAll("[data-testid^='test-view-switch-']")];
    const hit = (element) => {
      const bounds = element.getBoundingClientRect();
      const target = document.elementFromPoint(bounds.left + bounds.width / 2, bounds.top + bounds.height / 2);
      const style = getComputedStyle(element);
      return {
        id: element.getAttribute("data-testid") ?? element.getAttribute("aria-label") ?? element.className,
        target: target?.getAttribute("data-testid") ?? target?.className ?? target?.tagName,
        hitMatches: Boolean(target && (target === element || element.contains(target))),
        pointerEvents: style.pointerEvents,
        zIndex: style.zIndex,
        inertAncestor: Boolean(element.closest("[inert]")),
        bounds: rect(element),
      };
    };
    const visibleControls = (selector) => [...document.querySelectorAll(selector)].filter((element) => {
      const bounds = element.getBoundingClientRect();
      return bounds.width > 0 && bounds.height > 0 && getComputedStyle(element).visibility !== "hidden";
    });
    const stageRect = rect(stage);
    const panelRect = rect(panel);
    const rootRect = rect(root);
    const rootFace = root?.querySelector(".played-card");
    const rootCorner = rootFace?.querySelector("i");
    const rootTitle = rootFace?.querySelector(".card-name-mark");
    const rootType = rootFace?.querySelector("strong");
    const announcementRect = announcement && getComputedStyle(announcement).visibility !== "hidden" ? rect(announcement) : null;
    const footerRect = rect(footer);
    const rowRect = rect(row);
    const rootDisplay = root?.closest(".public-card-display");
    const rootStyle = root ? getComputedStyle(root) : null;
    const rootDisplayStyle = rootDisplay ? getComputedStyle(rootDisplay) : null;
    const dock = document.querySelector(".local-player-dock");
    const rowClip = row ? { left: row.getBoundingClientRect().left + row.clientLeft, right: row.getBoundingClientRect().left + row.clientLeft + row.clientWidth } : null;
    return {
      viewport: { width: window.innerWidth, height: window.innerHeight },
      document: {
        scrollX: window.scrollX,
        scrollY: window.scrollY,
        documentWidth: document.documentElement.scrollWidth,
        bodyOverflow: getComputedStyle(document.body).overflow,
        documentOverflow: getComputedStyle(document.documentElement).overflow,
        activeElement: document.activeElement ? {
          tag: document.activeElement.tagName,
          testId: document.activeElement.getAttribute("data-testid"),
          className: document.activeElement.className,
        } : null,
      },
      table: rect(document.querySelector(".play-table")),
      stage: stageRect,
      dock: rect(dock),
      panel: panelRect,
      panelPointerEvents: panel ? getComputedStyle(panel).pointerEvents : null,
      stagePointerEvents: stage ? getComputedStyle(stage).pointerEvents : null,
      stageBackground: stage ? getComputedStyle(stage).backgroundColor : null,
      panelZIndex: panel ? getComputedStyle(panel).zIndex : null,
      stageZIndex: stage ? getComputedStyle(stage).zIndex : null,
      root: rootRect,
      rootFace: rect(rootFace),
      rootCardId: root?.getAttribute("data-public-card-journey-card-id") ?? root?.getAttribute("data-public-card-static-card-id"),
      rootEventId: root?.getAttribute("data-public-card-journey-event-id") ?? root?.getAttribute("data-public-card-static-event-id"),
      rootPhase: root?.getAttribute("data-public-card-journey-phase"),
      rootSize: root?.getAttribute("data-public-card-journey-size"),
      rootData: root ? { left: root.getAttribute("data-public-card-journey-target-left"), top: root.getAttribute("data-public-card-journey-target-top") } : null,
      rootPaint: root && rootStyle ? {
        visibility: rootStyle.visibility,
        opacity: rootStyle.opacity,
        display: rootStyle.display,
        zIndex: rootStyle.zIndex,
        parentVisibility: rootDisplayStyle?.visibility ?? null,
        parentOpacity: rootDisplayStyle?.opacity ?? null,
        parentZIndex: rootDisplayStyle?.zIndex ?? null,
        layoutPending: rootDisplay?.getAttribute("data-public-card-layout-pending") ?? null,
        hitTarget: document.elementFromPoint(rootRect.left + rootRect.width / 2, rootRect.top + rootRect.height / 2)?.className ?? null,
        face: rootFace ? {
          visibility: getComputedStyle(rootFace).visibility,
          opacity: getComputedStyle(rootFace).opacity,
          display: getComputedStyle(rootFace).display,
          background: getComputedStyle(rootFace).backgroundImage,
          rect: rect(rootFace),
        } : null,
      } : null,
      layerOrder: {
        root: root ? Number.parseInt(getComputedStyle(root).zIndex, 10)
          || Number.parseInt(getComputedStyle(rootDisplay).zIndex, 10) : null,
        pool: stage ? Number.parseInt(getComputedStyle(stage).zIndex, 10) : null,
      },
      rootCorner: rect(rootCorner),
      rootCornerFontSize: rootCorner ? getComputedStyle(rootCorner).fontSize : null,
      rootSuitFontSize: rootCorner?.querySelector("small") ? getComputedStyle(rootCorner.querySelector("small")).fontSize : null,
      rootTitleFontSize: rootTitle ? getComputedStyle(rootTitle).fontSize : null,
      rootTypeFontSize: rootType ? getComputedStyle(rootType).fontSize : null,
      announcement: announcementRect,
      announcementPaint: announcement ? {
        visibility: getComputedStyle(announcement).visibility,
        opacity: getComputedStyle(announcement).opacity,
        zIndex: getComputedStyle(announcement).zIndex,
        fallback: announcement.dataset.publicCardAnnouncementFallback ?? null,
        positioned: announcement.dataset.publicCardAnnouncementPositioned ?? null,
        placement: announcement.dataset.publicCardAnnouncementPlacement ?? null,
        text: announcement.innerText,
        ariaLabel: announcement.querySelector("b")?.getAttribute("aria-label") ?? null,
        rect: rect(announcement),
      } : null,
      row: rowRect,
      rowClip,
      cards: [...(row?.querySelectorAll(".harvest-card-choice") ?? [])].map(rect),
      cardDetailsTargets: [...(row?.querySelectorAll(".harvest-card-choice") ?? [])].map((choice) => {
        const card = rect(choice);
        const infoButton = choice.querySelector(".harvest-card-info");
        const info = rect(infoButton);
        const title = rect(choice.querySelector(".card-name-mark"));
        const visibleGlyph = info ? { left: info.left + (info.width - 20) / 2, top: info.top + (info.height - 20) / 2,
          right: info.left + (info.width + 20) / 2, bottom: info.top + (info.height + 20) / 2 } : null;
        return { card, info, infoHitMatches: hit(infoButton).hitMatches,
          infoCentered: Boolean(card && info && Math.abs((card.left + card.right) / 2 - (info.left + info.right) / 2) <= 1),
          titleClearOfInfoGlyph: !intersects(title, visibleGlyph),
          cardCenterOutsideInfo: Boolean(card && info && !(
            (card.left + card.right) / 2 >= info.left && (card.left + card.right) / 2 <= info.right
            && (card.top + card.bottom) / 2 >= info.top && (card.top + card.bottom) / 2 <= info.bottom
          )),
          infoBottomInset: card && info ? card.bottom - info.bottom : null,
          infoWidth: info?.width ?? 0, infoHeight: info?.height ?? 0,
          infoGlyphSize: infoButton ? getComputedStyle(infoButton, "::before").width : null };
      }),
      footer: footerRect,
      timer: rect(timer),
      activity: rect(activity),
      activityPaint: activity ? { visibility: getComputedStyle(activity).visibility, layout: activity.dataset.publicActivityLayout ?? null } : null,
      seats: seats.map(rect),
      controlHits: {
        switches: switches.map(hit),
        heroInspector: visibleControls(".opponent-hero-target").slice(0, 4).map(hit),
        handInspection: visibleControls('[data-testid="hand-card-inspection-action"]').slice(0, 4).map(hit),
        publicEquipmentDetails: visibleControls(".opponent-inspection-card").slice(0, 4).map(hit),
        harvestChoices: visibleControls(".harvest-card-select:not([disabled])").slice(0, 4).map(hit),
        harvestInfo: visibleControls(".harvest-card-info").slice(0, 4).map(hit),
        harvestConfirm: visibleControls(".harvest-confirm-row .primary").map(hit),
      },
      overlaps: {
        rootPanel: intersects(rootRect, panelRect),
        rootRow: intersects(rootRect, rowRect),
        rootAnnouncement: intersects(rootRect, announcementRect),
        rootTimer: intersects(rootRect, rect(timer)),
        rootActivity: intersects(rootRect, rect(activity)),
        rootDock: intersects(rootRect, rect(dock)),
        rootSeat: seats.some((seat) => intersects(rootRect, rect(seat))),
        panelAnnouncement: intersects(panelRect, announcementRect),
        announcementActivity: intersects(announcementRect, rect(activity)),
        activityTimer: intersects(rect(activity), rect(timer)),
        panelTimer: intersects(panelRect, rect(timer)),
        panelActivity: intersects(panelRect, rect(activity)),
        panelSeat: seats.some((seat) => intersects(panelRect, rect(seat))),
      },
      switches: switches.map(hit),
    };
  });
}

test("Bumper Harvest root and Negation park beside their own side-seat authors on phones", async ({ browser, request }, testInfo) => {
  test.setTimeout(120_000);
  for (const scenario of [
    { seats: 6, viewport: { width: 390, height: 844 } },
    { seats: 8, viewport: { width: 440, height: 894 } },
  ]) {
    const negationId = `harvest-side-negation-${scenario.seats}`;
    const seed = await seedHarvestPool(request, scenario.seats, scenario.seats, {
      4: [{ id: negationId, kind: "Negation", suit: "♦", rank: "A" }],
    });
    const source = seed.players[0];
    const responder = seed.players[4];
    const rootCardId = `harvest-density-root-${scenario.seats}`;
    const initialViewer = seed.players[2];
    const context = await browser.newContext({
      viewport: scenario.viewport,
      isMobile: true,
      hasTouch: true,
      deviceScaleFactor: 3,
    });
    try {
      const page = await context.newPage();
      await page.addInitScript(({ code, token, name }) => {
        localStorage.setItem("three-realms-session", JSON.stringify({ code, token, name }));
      }, { code: seed.code, token: initialViewer.token, name: initialViewer.name });
      await page.goto(`${API}/`);
      await expect(page.locator(".game-shell")).toBeVisible();

      const played = await request.post(`${API}/api/rooms`, {
        data: { action: "play_card", code: seed.code, token: source.token, cardId: rootCardId },
      });
      expect(played.ok(), await played.text()).toBeTruthy();
      const opening = await readRoom(request, seed.code, source.token);
      const progress = opening.presentationSnapshot?.bumperHarvestProgress;
      expect(progress?.semantics).toBe("PROVEN");
      expect(progress.rootEventId).toBeTruthy();
      expect(opening.publicHarvestPool?.semantics).toBe("PROVEN");
      const currentChooserId = progress.currentParticipantId;
      expect(currentChooserId, "public progress names the pending effect participant").toBeTruthy();
      expect(currentChooserId).not.toBe(responder.id);
      const viewer = initialViewer;
      expect(viewer.id).not.toBe(source.id);
      expect(viewer.id).not.toBe(currentChooserId);
      expect(viewer.id).not.toBe(responder.id);

      const windowId = opening.currentAction?.negationWindowId;
      expect(windowId).toBeTruthy();
      const held = await request.post(`${API}/__test/negation-window-clock`, {
        data: { code: seed.code, windowId, mode: "hold" },
      });
      expect(held.ok(), await held.text()).toBeTruthy();
      await expect(page.locator('.harvest-choice-stage[data-harvest-readonly="true"]')).toBeVisible();
      const root = page.locator(`[data-public-card-journey-card-id="${rootCardId}"][data-public-card-journey-event-id="${progress.rootEventId}"]`);
      await expect(root).toHaveAttribute("data-public-card-journey-phase", "reveal", { timeout: 10_000 });
      await expect(root).toHaveAttribute("data-public-card-journey-phase", "parked", { timeout: 15_000 });
      const rootParking = await measureHarvestParking(page, rootCardId, progress.rootEventId);
      expectHarvestCardParkedByAuthor(rootParking, `${scenario.seats}-seat Harvest root`);
      expect(rootParking.actorId).toBe(source.id);
      expect(rootParking.sideColumn, "root parks beside a true side-column seat").toMatch(/^(left|right)$/);
      const rootScreenshot = testInfo.outputPath(`harvest-side-root-${scenario.seats}-seats-${scenario.viewport.width}x${scenario.viewport.height}.png`);
      await page.screenshot({ path: rootScreenshot, animations: "disabled" });
      await testInfo.attach(`harvest-side-root-${scenario.seats}-seats`, { path: rootScreenshot, contentType: "image/png" });

      await advanceHarvestNegationToActor(request, seed, responder);
      const committed = await commitHarvestNegation(request, seed, 4, negationId);
      const responseCard = page.locator(`[data-public-card-journey-card-id="${negationId}"][data-public-card-journey-event-id="${committed.event.id}"]`);
      await expect(responseCard).toHaveAttribute("data-public-card-journey-role", "response", { timeout: 10_000 });
      await expect(responseCard).toHaveAttribute("data-public-card-journey-phase", "parked", { timeout: 15_000 });
      const responseParking = await measureHarvestParking(page, negationId, committed.event.id);
      expectHarvestCardParkedByAuthor(responseParking, `${scenario.seats}-seat committed Negation`);
      expect(responseParking.actorId).toBe(responder.id);
      expect(responseParking.sideColumn, "Negation parks beside its own side-column author").toMatch(/^(left|right)$/);
      expect(responseParking.actorId).not.toBe(source.id);
      await testInfo.attach(`harvest-side-parking-${scenario.seats}-seats`, {
        body: JSON.stringify({ scenario, viewerId: viewer.id, currentChooserId, sourceId: source.id, responderId: responder.id, rootParking, responseParking }, null, 2),
        contentType: "application/json",
      });
      const responseScreenshot = testInfo.outputPath(`harvest-side-negation-${scenario.seats}-seats-${scenario.viewport.width}x${scenario.viewport.height}.png`);
      await page.screenshot({ path: responseScreenshot, animations: "disabled" });
      await testInfo.attach(`harvest-side-negation-${scenario.seats}-seats`, { path: responseScreenshot, contentType: "image/png" });
    } finally {
      await context.close();
    }
  }
});

test("Bumper Harvest spectators can switch views while another player chooses", async ({ browser, request }, testInfo) => {
  test.setTimeout(90_000);
  const name = `HARVEST SWITCH ${Date.now().toString(36).toUpperCase()}`;
  const created = await request.post(`${API}/api/rooms`, { data: { action: "create", name } });
  const createdBody = await created.json();
  expect(created.status(), JSON.stringify({ error: createdBody.error })).toBe(201);
  const { code, token } = { code: createdBody.room.code, token: createdBody.token };

  let room = await postAction(request, name, code, token, "add_test_players");
  room = await postAction(request, name, code, token, "enable_test_room");
  room = await postAction(request, name, code, token, "configure_test_hands", {
    presetId: "custom",
    expectedRevision: 0,
    handsBySeat: { 0: ["Attack"], 1: ["BumperHarvest"], 2: ["Attack"], 3: ["Attack"] },
  });
  room = await postAction(request, name, code, token, "start");
  for (let selections = 0; room.status === "heroes" && selections < 8; selections++) {
    const hero = room.myHeroOptions.find((candidate) => candidate.hp >= 4 && SAFE_HEROES.has(candidate.id))
      ?? room.myHeroOptions.find((candidate) => SAFE_HEROES.has(candidate.id));
    expect(hero, "the current TEST seat has a safe Standard hero choice").toBeTruthy();
    room = await postAction(request, name, code, token, "choose_hero", { heroId: hero.id });
  }
  expect(room.status).toBe("playing");

  const source = room.players.find((player) => player.seat === 1);
  const host = room.players.find((player) => player.isHost);
  const controlledAction = async (action, values = {}) => {
    const actorId = room.currentAction?.actorId ?? room.actionPlayerId;
    const context = {
      actionRevision: room.actionRevision,
      meId: room.meId,
      phase: room.phase,
      pendingKind: room.pending?.kind ?? null,
      actorId,
    };
    room = await postAction(request, name, code, token, action, { ...values, context });
  };

  for (let attempts = 0; attempts < 20; attempts++) {
    const actorId = room.currentAction?.actorId ?? room.actionPlayerId;
    if (actorId === source.id && room.phase?.startsWith("draw")) {
      await controlledAction("draw");
    } else if (actorId === source.id && room.phase?.startsWith("play")) {
      const card = room.myHand.find((item) => item.kind === "BumperHarvest");
      expect(card, "Test Player 2 holds Bumper Harvest").toBeTruthy();
      await controlledAction("play_card", { cardId: card.id });
      break;
    } else if (room.phase?.startsWith("draw")) {
      await controlledAction("draw");
    } else if (room.phase?.startsWith("play")) {
      await controlledAction("end_turn");
    } else if (room.phase === "discard") {
      const active = room.players.find((player) => player.id === room.meId);
      const required = Math.max(0, room.myHand.length - (active?.hp ?? 0));
      await controlledAction("discard_cards", { cardIds: room.myHand.slice(0, required).map((card) => card.id) });
    } else {
      throw new Error(`Unexpected ${room.phase} while preparing Test Player 2's turn.`);
    }
  }

  const passCurrentNegationWindow = async () => {
    let current = await readRoom(request, code, token);
    const windowId = current.currentAction?.negationWindowId;
    if (!windowId) return current;
    for (const player of current.players.filter((candidate) => candidate.alive)) {
      current = await readRoom(request, code, token);
      if (current.phase !== "response" || current.currentAction?.negationWindowId !== windowId) break;
      current = await postAction(request, name, code, token, "decline_response", {
        context: {
          actionRevision: current.actionRevision,
          meId: player.id,
          phase: "response",
          pendingKind: "response",
          windowId,
        },
      });
    }
    return readRoom(request, code, token);
  };
  const negationRoom = await readRoom(request, code, token);
  expect(negationRoom.phase).toBe("response");
  const negationWindowId = negationRoom.currentAction?.negationWindowId;
  expect(negationWindowId).toBeTruthy();
  const heldWindow = await request.post(`${API}/__test/negation-window-clock`, {
    data: { code, windowId: negationWindowId, mode: "hold" },
  });
  expect(heldWindow.ok()).toBeTruthy();
  const publicPool = negationRoom.publicHarvestPool;
  expect(publicPool?.semantics).toBe("PROVEN");
  expect(negationRoom.pendingHarvest).toBeNull();
  expect(negationRoom.currentAction?.legalActions).not.toContain("choose_harvest");
  const currentProgress = negationRoom.presentationV2?.bumperHarvestProgress;
  expect(currentProgress?.semantics).toBe("PROVEN");
  const currentChooserId = currentProgress?.currentParticipantId;
  const currentChooser = room.players.find((player) => player.id === currentChooserId);
  expect(currentChooser?.name).toBeTruthy();
  const controlledViews = await Promise.all(room.players.map((player) => readRoom(request, code, token, player.id)));
  expect(controlledViews.map((view) => view.publicHarvestPool)).toEqual(Array(room.players.length).fill(publicPool));
  expect(controlledViews.map((view) => view.presentationSnapshot?.bumperHarvestProgress?.currentParticipantId))
    .toEqual(Array(room.players.length).fill(currentChooserId));

  const negationContext = await browser.newContext({ viewport: { width: 390, height: 700 }, isMobile: true, hasTouch: true, deviceScaleFactor: 3 });
  let mismatchedProofContext = null;
  try {
    const negationPage = await negationContext.newPage();
    const chooseHarvestPosts = [];
    negationPage.on("request", (requestEvent) => {
      if (requestEvent.method() !== "POST" || requestEvent.url() !== `${API}/api/rooms`) return;
      try {
        if (JSON.parse(requestEvent.postData() ?? "{}").action === "choose_harvest") chooseHarvestPosts.push(requestEvent.postData());
      } catch { /* Ignore non-JSON requests. */ }
    });
    await negationPage.addInitScript(({ roomCode, sessionToken, playerName }) => {
      localStorage.setItem("three-realms-session", JSON.stringify({ code: roomCode, token: sessionToken, name: playerName }));
    }, { roomCode: code, sessionToken: token, playerName: name });
    await negationPage.goto(`${API}/`);
    await expect(negationPage.locator(".game-shell")).toBeVisible();
    await expect(negationPage.locator('.harvest-choice-stage[data-harvest-readonly="true"]')).toBeVisible();
    const parkedRoot = negationPage.locator('[data-harvest-root-parked="true"]');
    await expect(parkedRoot).toHaveAttribute("data-public-card-journey-role", "root");
    await expect(parkedRoot).toHaveAttribute("data-public-card-journey-phase", "parked");
    await expect(parkedRoot).toHaveAttribute("data-public-card-journey-size", "thumbnail");
    await expect(parkedRoot).toHaveAttribute("data-public-card-journey-card-id", currentProgress.rootCardId);
    await expect(parkedRoot).toHaveAttribute("data-public-card-journey-event-id", publicPool.rootEventId);
    await expect(negationPage.locator("[data-harvest-root-parked='true']")).toHaveCount(1);
    await expect(negationPage.locator(".harvest-choice-heading span"))
      .toHaveText(`Negation for ${currentChooser.name} · Read-only`);
    await expect(negationPage.locator(".harvest-card-choice")).toHaveCount(publicPool.revealed.length);
    await expect(negationPage.locator(".harvest-card-select")).toHaveCount(0);
    await expect(negationPage.locator(".harvest-confirm-row")).toHaveCount(0);
    await expect(negationPage.locator(".harvest-availability-label")).toHaveCount(publicPool.revealed.length);
    expect(await negationPage.locator(".harvest-card-choice").evaluateAll((cards) => cards.map((card) => card.dataset.harvestCardId)))
      .toEqual(publicPool.revealed.map(({ id }) => id));
    await expect(negationPage.locator(".harvest-choice-panel")).toHaveCSS("pointer-events", "none");
    await expect(negationPage.locator(".harvest-choice-stage")).toHaveCSS("pointer-events", "none");

    await tapHarvestCard(negationPage, negationPage.locator(".harvest-card-choice").first());
    expect(chooseHarvestPosts).toEqual([]);
    await tap(negationPage, negationPage.locator(".harvest-card-info").first());
    await expect(negationPage.locator('.card-details-panel[data-card-details-context="public-zone"]')).toBeVisible();
    await tap(negationPage, negationPage.getByRole("button", { name: "Close card details" }));
    const assertRootPoolLayer = async (viewport, evidenceSuffix = "") => {
      await negationPage.evaluate(async ({ width, height }) => {
        const deadline = performance.now() + 5000;
        let stableFrames = 0;
        let lastState = null;
        while (performance.now() < deadline) {
          await new Promise((resolve) => requestAnimationFrame(() => resolve()));
          const root = document.querySelector("[data-harvest-root-parked='true']");
          const display = root?.closest(".public-card-display");
          const chip = document.querySelector("[data-public-activity-chip]");
          const announcement = document.querySelector("[data-public-card-announcement='true']");
          const rootRect = root?.getBoundingClientRect();
          const chipRect = chip?.getBoundingClientRect();
          lastState = {
            renderer: display?.dataset.publicCardRendererKind,
            motion: display?.dataset.publicCardMotion,
            sourceId: display?.dataset.publicCardSourceId,
            cardId: display?.dataset.publicCardId,
            pending: display?.dataset.publicCardLayoutPending,
            root: rootRect ? { left: rootRect.left, top: rootRect.top, width: rootRect.width, height: rootRect.height,
              targetLeft: root?.dataset.publicCardJourneyTargetLeft, targetTop: root?.dataset.publicCardJourneyTargetTop,
              actorId: root?.dataset.publicCardJourneyActorId, role: root?.dataset.publicCardJourneyRole,
              phase: root?.dataset.publicCardJourneyPhase, visibility: getComputedStyle(root).visibility } : null,
            chip: chipRect ? { left: chipRect.left, top: chipRect.top, width: chipRect.width, height: chipRect.height,
              visibility: getComputedStyle(chip).visibility, layout: chip?.dataset.publicActivityLayout } : null,
            announcementVisibility: announcement ? getComputedStyle(announcement).visibility : null,
            localDock: (() => {
              const dock = document.querySelector(".local-player-dock");
              const identity = dock?.querySelector(".local-dock-identity");
              const hero = dock?.querySelector(".local-hero-card");
              const dockStyle = dock ? getComputedStyle(dock) : null;
              return { dock: dock?.getBoundingClientRect().toJSON(), dockPadding: dockStyle?.padding, dockPaddingBottom: dockStyle?.paddingBottom, dockBorderBottom: dockStyle?.borderBottomWidth, identity: identity?.getBoundingClientRect().toJSON(), hero: hero?.getBoundingClientRect().toJSON(), hand: document.querySelector(".local-hand-rail")?.getBoundingClientRect().toJSON(), guidance: document.querySelector(".console-guidance")?.getBoundingClientRect().toJSON(), decision: document.querySelector(".decision-status")?.getBoundingClientRect().toJSON() };
            })(),

          };
          const stable = window.innerWidth === width && window.innerHeight === height
            && Boolean(root && display && chip && announcement && rootRect && chipRect)
            && display?.dataset.publicCardLayoutPending === "false"
            && rootRect?.width === 40 && rootRect.height === 60
            && getComputedStyle(root).visibility === "visible"
            && rootRect.left === Number(root?.dataset.publicCardJourneyTargetLeft)
            && rootRect.top === Number(root?.dataset.publicCardJourneyTargetTop)
            && /^(harvest-root-rail|bottom-center|lower-band-(center|left|right))$/.test(chip?.dataset.publicActivityLayout ?? "")
            && getComputedStyle(chip).visibility === "visible"
            && getComputedStyle(announcement).visibility === "visible";
          stableFrames = stable ? stableFrames + 1 : 0;
          if (stableFrames >= 2) return;
        }
        throw new Error(`Harvest layer did not settle at ${width}x${height}: ${JSON.stringify(lastState)}`);
      }, viewport);
      const geometry = await harvestGeometry(negationPage);
      await testInfo.attach(`bumper-harvest-layer-${viewport.width}x${viewport.height}`, {
        body: JSON.stringify(geometry, null, 2), contentType: "application/json",
      });
      expect(geometry.viewport).toEqual(viewport);
      expect(geometry.rootFace).toMatchObject({ width: 40, height: 60 });
      expect(geometry.rootCardId).toBe(currentProgress.rootCardId);
      expect(geometry.rootEventId).toBe(publicPool.rootEventId);
      expect(geometry.rootPhase).toBe("parked");
      expect(geometry.rootSize).toBe("thumbnail");
      expect(geometry.stageBackground).toBe("rgba(0, 0, 0, 0)");
      expect(geometry.announcement).toBeTruthy();
      expect(geometry.announcementPaint.visibility).toBe("visible");
      expect(geometry.announcementPaint.ariaLabel).toBe(`Negation: Block ${currentChooser.name}'s Harvest pick?`);
      const announcementLines = Number(await negationPage.locator(".public-card-display-journey-copy").getAttribute("data-public-card-announcement-lines"));
      expect(announcementLines).toBeGreaterThan(0);
      expect(announcementLines).toBeLessThanOrEqual(2);
      expect(geometry.activityPaint.visibility).toBe("visible");
      expect(geometry.activityPaint.layout).toMatch(/^(harvest-root-rail|bottom-center|lower-band-(center|left|right))$/);
      const rootParking = await measureHarvestParking(negationPage, currentProgress.rootCardId, publicPool.rootEventId);
      expectHarvestCardParkedByAuthor(rootParking, `Harvest root at ${viewport.width}x${viewport.height}`);
      expect(rootParking.actorId).toBe(source.id);
      expect(geometry.layerOrder.root).not.toBeNull();
      expect(geometry.layerOrder.pool).toBeGreaterThan(geometry.layerOrder.root);
      // Plan A permits the already-seen root thumbnail to sit behind the pool.
      // Its layer must remain below the real pool, whose Info targets stay tappable.
      expect(geometry.controlHits.harvestInfo).toHaveLength(publicPool.revealed.length);
      expect(geometry.controlHits.harvestInfo.every((hit) => hit.hitMatches), JSON.stringify(geometry.controlHits.harvestInfo)).toBe(true);
      expect(geometry.overlaps.rootAnnouncement).toBe(false);
      expect(geometry.overlaps.rootTimer).toBe(false);
      expect(geometry.overlaps.rootActivity).toBe(false);
      expect(geometry.overlaps.rootSeat).toBe(false);
      expect(geometry.overlaps.panelAnnouncement).toBe(false);
      expect(geometry.overlaps.announcementActivity).toBe(false);
      expect(geometry.overlaps.activityTimer).toBe(false);
      expect(geometry.overlaps.panelTimer).toBe(false);
      expect(geometry.overlaps.panelSeat).toBe(false);
      const evidenceName = `bumper-harvest-negation-readonly-${viewport.width}x${viewport.height}${evidenceSuffix ? `-${evidenceSuffix}` : ""}`;
      const screenshot = testInfo.outputPath(`${evidenceName}.png`);
      await negationPage.screenshot({ path: screenshot, animations: "disabled" });
      await testInfo.attach(evidenceName, { path: screenshot, contentType: "image/png" });
      return geometry;
    };
    await assertRootPoolLayer({ width: 390, height: 700 });

    const switchTarget = room.players.find((player) => player.id !== host.id);
    await tap(negationPage, negationPage.getByTestId(`test-view-switch-${switchTarget.id}`));
    await expect(negationPage.locator(`.local-player-dock[data-player-anchor="${switchTarget.id}"]`)).toBeVisible();
    await expect(negationPage.locator(".harvest-choice-stage[data-harvest-readonly='true'] .harvest-card-choice")).toHaveCount(publicPool.revealed.length);
    await expect(negationPage.locator(".harvest-choice-heading span"))
      .toHaveText(`Negation for ${currentChooser.name} · Read-only`);
    const inspectedHero = negationPage.locator(`.opponent-player-card[data-player-anchor="${host.id}"] .opponent-hero-target`);
    await tap(negationPage, inspectedHero);
    await expect(negationPage.locator(`.opponent-inspection-panel[data-inspect-player-id="${host.id}"]`)).toBeVisible();
    await tap(negationPage, inspectedHero);
    await assertRootPoolLayer({ width: 390, height: 700 }, "after-switch-and-inspector");
    await negationPage.setViewportSize({ width: 440, height: 766 });
    await expect(negationPage.locator('.harvest-choice-stage[data-harvest-readonly="true"]')).toBeVisible();
    await expect(negationPage.locator(".harvest-card-choice")).toHaveCount(publicPool.revealed.length);
    await assertRootPoolLayer({ width: 440, height: 766 });
    await expect(negationPage.locator(".harvest-card-select, .harvest-confirm-row")).toHaveCount(0);
    expect(await negationPage.locator(".harvest-card-choice").evaluateAll((cards) => cards.map((card) => card.dataset.harvestCardId)))
      .toEqual(publicPool.revealed.map(({ id }) => id));
    expect(chooseHarvestPosts).toEqual([]);
    await testInfo.attach("bumper-harvest-negation-readonly-pool", {
      body: JSON.stringify({ viewport: negationPage.viewportSize(), viewerIds: controlledViews.map((view) => view.meId), publicPool }, null, 2),
      contentType: "application/json",
    });
    mismatchedProofContext = await browser.newContext({ viewport: { width: 390, height: 700 }, isMobile: true, hasTouch: true, deviceScaleFactor: 3 });
    const mismatchedProofPage = await mismatchedProofContext.newPage();
    await mismatchedProofPage.addInitScript(({ roomCode, sessionToken, playerName, hostId }) => {
      localStorage.setItem("three-realms-session", JSON.stringify({ code: roomCode, token: sessionToken, name: playerName }));
      window.__mismatchedChooserProofResponses = 0;
      window.__mismatchedProofSummary = null;
      let mismatchedRoomPayload = null;
      const originalFetch = window.fetch.bind(window);
      window.fetch = async (input, init) => {
        const requestUrl = new URL(typeof input === "string" ? input : input.url, location.href);
        const method = init?.method ?? (input instanceof Request ? input.method : "GET");
        if (requestUrl.pathname !== "/api/rooms" || requestUrl.searchParams.get("code") !== roomCode
          || requestUrl.searchParams.get("testViewerId") !== hostId || method !== "GET") {
          return originalFetch(input, init);
        }
        if (mismatchedRoomPayload) {
          // Hold one locally-mutated public snapshot stable across React polls.
          return new Response(mismatchedRoomPayload, { status: 200, headers: { "content-type": "application/json" } });
        }
        const response = await originalFetch(input, init);
        if (!response.ok) return response;
        const payload = await response.clone().json();
        const roomView = payload.room ?? payload;
        const progress = roomView.presentationSnapshot?.bumperHarvestProgress;
        const mismatchedParticipantId = roomView.players?.find((player) => player.id !== progress?.currentParticipantId)?.id;
        if (!progress || !mismatchedParticipantId) return response;
        const snapshot = roomView.presentationSnapshot;
        roomView.presentationSnapshot = {
          ...snapshot,
          interaction: {
            ...snapshot.interaction,
            currentParticipantId: mismatchedParticipantId,
            participantRoles: {
              ...snapshot.interaction.participantRoles,
              currentParticipantId: mismatchedParticipantId,
            },
          },
          bumperHarvestProgress: { ...progress, currentParticipantId: mismatchedParticipantId },
        };
        window.__mismatchedProofSummary = {
          interaction: {
            semantics: snapshot.interaction?.semantics,
            stage: snapshot.interaction?.stage,
            interactionId: snapshot.interaction?.interactionId,
            rootFrameId: snapshot.interaction?.rootFrameId,
            activeFrameId: snapshot.interaction?.activeFrameId,
            checkpointId: snapshot.interaction?.checkpointId,
            presentationRevision: snapshot.interaction?.presentationRevision,
            sourceId: snapshot.interaction?.sourceId,
            currentParticipantId: mismatchedParticipantId,
          },
          progress: {
            semantics: progress.semantics,
            interactionId: progress.interactionId,
            rootFrameId: progress.rootFrameId,
            activeFrameId: progress.activeFrameId,
            checkpointId: progress.checkpointId,
            presentationRevision: progress.presentationRevision,
            sourceId: progress.sourceId,
            currentParticipantId: mismatchedParticipantId,
            currentEffectState: progress.currentEffectState,
            participants: progress.participants.map(({ playerId, order, status }) => ({ playerId, order, status })),
          },
          forgedParticipantName: roomView.players.find((player) => player.id === mismatchedParticipantId)?.name ?? null,
          reactionChain: snapshot.reactionChain ? {
            semantics: snapshot.reactionChain.semantics,
            interactionId: snapshot.reactionChain.interactionId,
            frameId: snapshot.reactionChain.frameId,
            rootCard: snapshot.reactionChain.rootCard,
            nodeCount: snapshot.reactionChain.nodes?.length ?? null,
            publicLinkCount: snapshot.reactionChain.publicNodeEventLinks?.length ?? null,
          } : null,
        };
        if (payload.room) payload.room = roomView;
        mismatchedRoomPayload = JSON.stringify(payload);
        window.__mismatchedChooserProofResponses = 1;
        return new Response(mismatchedRoomPayload, { status: response.status, headers: { "content-type": "application/json" } });
      };
    }, { roomCode: code, sessionToken: token, playerName: name, hostId: host.id });
    try {
      await mismatchedProofPage.goto(`${API}/`);
      await expect(mismatchedProofPage.locator(".game-shell")).toBeVisible();
      await expect(mismatchedProofPage.locator('.harvest-choice-stage[data-harvest-readonly="true"]')).toBeVisible();
      await expect.poll(() => mismatchedProofPage.evaluate(() => window.__mismatchedChooserProofResponses)).toBe(1);
      await expect(mismatchedProofPage.locator(".harvest-choice-heading span"))
        .toHaveText("Read-only · Negation resolving", { timeout: 1_500 });
      const mismatchRender = await mismatchedProofPage.evaluate(() => ({
        proof: window.__mismatchedProofSummary,
        h4Count: document.querySelectorAll(".public-card-display-journey-copy b").length,
        publicDisplays: [...document.querySelectorAll("[data-public-card-display]")].map((node) => ({
          renderer: node.getAttribute("data-public-card-renderer-kind"),
          rootEventId: node.getAttribute("data-public-card-root-event-id"),
          motion: node.getAttribute("data-public-card-motion"),
          ready: node.getAttribute("data-public-card-ready"),
        })),
      }));
      await testInfo.attach("bumper-harvest-mismatched-proof-render", {
        body: JSON.stringify(mismatchRender, null, 2),
        contentType: "application/json",
      });
      const mismatchedH4 = mismatchedProofPage.locator(".public-card-display-journey-copy b");
      const genericHarvestAnnouncement = "Negation available.";
      await expect(mismatchedH4).toHaveAttribute("aria-label", genericHarvestAnnouncement, { timeout: 1_500 });
      const mismatchedH4Label = await mismatchedH4.getAttribute("aria-label");
      const forgedParticipantName = mismatchRender.proof?.forgedParticipantName;
      expect(forgedParticipantName).toBeTruthy();
      expect(mismatchedH4Label).not.toContain(forgedParticipantName);
      expect(mismatchedH4Label).not.toContain("effect on");
    } finally {
      // Close the isolated context so its locally cached proof cannot affect the
      // four-viewer gameplay context or leave any intercepted room polling live.
      await mismatchedProofPage.close().catch(() => {});
      await mismatchedProofContext.close().catch(() => {});
      mismatchedProofContext = null;
    }
  } finally {
    await mismatchedProofContext?.close().catch(() => {});
    await negationContext.close();
  }

  room = await passCurrentNegationWindow();
  expect(room.pendingHarvest, "Negation responses advance to a live Harvest choice").toBeTruthy();
  expect(room.pendingHarvest.actorId).toBe(source.id);
  expect(room.pendingHarvest.choices).toHaveLength(0);

  const context = await browser.newContext({ viewport: { width: 390, height: 700 }, isMobile: true, hasTouch: true, deviceScaleFactor: 3 });
  try {
    const page = await context.newPage();
    await page.addInitScript(({ roomCode, sessionToken, playerName }) => {
      localStorage.setItem("three-realms-session", JSON.stringify({ code: roomCode, token: sessionToken, name: playerName }));
    }, { roomCode: code, sessionToken: token, playerName: name });
    await page.goto(`${API}/`);
    await expect(page.locator(".game-shell")).toBeVisible();
    await expect(page.locator(".harvest-choice-stage")).toBeVisible();
    await expect(page.locator(".harvest-choice-panel")).toBeVisible();
    await expect(page.locator(`.local-player-dock[data-player-anchor="${host.id}"]`)).toBeVisible();

    const auditHarvestView = async (viewerLabel, actor) => {
      for (const viewport of [
        { width: 390, height: 700 },
        { width: 390, height: 844 },
        { width: 440, height: 766 },
        { width: 480, height: 900 },
      ]) {
        await page.setViewportSize(viewport);
        await expect.poll(async () => {
          const geometry = await harvestGeometry(page);
          return Boolean(geometry.panel && geometry.root && geometry.announcement && geometry.table
            && geometry.stagePointerEvents === "none"
            && Object.values(geometry.overlaps).every((overlap) => !overlap)
            && geometry.panel.top >= Math.max(...geometry.seats.map((seat) => seat.bottom)) - 1
            && geometry.panel.bottom <= geometry.table.bottom + 1
            && (!actor || geometry.footer && geometry.footer.bottom <= viewport.height + 1));
        }, { timeout: 10_000 }).toBe(true);
        const geometry = await harvestGeometry(page);
        expect(geometry.viewport).toEqual(viewport);
        expect(geometry.overlaps, JSON.stringify({ viewerLabel, geometry })).toEqual({
          rootPanel: false,
          rootRow: false,
          rootAnnouncement: false,
          rootTimer: false,
          rootActivity: false,
          rootDock: false,
          rootSeat: false,
          panelAnnouncement: false,
          announcementActivity: false,
          activityTimer: false,
          panelTimer: false,
          panelActivity: false,
          panelSeat: false,
        });
        expect(geometry.switches.map((item) => item.target), JSON.stringify({ viewerLabel, geometry }))
          .toEqual(geometry.switches.map((item) => item.id));
        expect(geometry.controlHits.switches.length, JSON.stringify({ viewerLabel, geometry })).toBeGreaterThan(0);
        expect(geometry.controlHits.switches.every((item) => item.hitMatches), JSON.stringify({ viewerLabel, geometry })).toBe(true);
        expect(geometry.controlHits.heroInspector.length, JSON.stringify({ viewerLabel, geometry })).toBeGreaterThan(0);
        expect(geometry.controlHits.heroInspector.every((item) => item.hitMatches), JSON.stringify({ viewerLabel, geometry })).toBe(true);
        expect(geometry.controlHits.handInspection.length, JSON.stringify({ viewerLabel, geometry })).toBeGreaterThan(0);
        expect(geometry.controlHits.handInspection.every((item) => item.hitMatches), JSON.stringify({ viewerLabel, geometry })).toBe(true);
        if (actor) {
          expect(geometry.footer, JSON.stringify({ viewerLabel, geometry })).toBeTruthy();
          expect(geometry.panelPointerEvents).toBe("auto");
          expect(geometry.footer.bottom).toBeLessThanOrEqual(viewport.height + 1);
          expect(geometry.controlHits.harvestChoices.length, JSON.stringify({ viewerLabel, geometry })).toBeGreaterThan(0);
          expect(geometry.controlHits.harvestChoices.every((item) => item.hitMatches), JSON.stringify({ viewerLabel, geometry })).toBe(true);
          expect(geometry.controlHits.harvestInfo.length, JSON.stringify({ viewerLabel, geometry })).toBeGreaterThan(0);
          expect(geometry.controlHits.harvestInfo.every((item) => item.hitMatches), JSON.stringify({ viewerLabel, geometry })).toBe(true);
        } else {
          expect(geometry.footer).toBeNull();
          expect(geometry.panelPointerEvents).toBe("none");
        }
        expect(geometry.cards).toHaveLength(4);
        expect(geometry.panel.width, JSON.stringify({ viewerLabel, geometry })).toBeLessThan(viewport.width - 32);
        expect(geometry.cardDetailsTargets.every((detail) => detail.infoHitMatches && detail.infoCentered
          && detail.infoBottomInset >= 0 && detail.infoBottomInset <= 2
          && detail.infoWidth >= 44 && detail.infoHeight >= 44 && detail.titleClearOfInfoGlyph), JSON.stringify({ viewerLabel, geometry })).toBe(true);
        const expectedCardWidth = actor
          ? Math.min(76, Math.max(70, viewport.width * .17))
          : Math.min(68, Math.max(64, viewport.width * .147));
        expect(geometry.cards.every((card) => Math.abs(card.width - expectedCardWidth) <= .5), JSON.stringify({ viewerLabel, geometry })).toBe(true);
        if (actor) expect(geometry.cardDetailsTargets.every((detail) => detail.cardCenterOutsideInfo), JSON.stringify({ viewerLabel, geometry })).toBe(true);
        expect(geometry.rootFace, JSON.stringify({ viewerLabel, geometry })).toMatchObject({ width: 40, height: 60 });
        expect(geometry.rootCorner.width / geometry.rootFace.width, JSON.stringify({ viewerLabel, geometry })).toBeLessThanOrEqual(.18);
        expect(geometry.rootCorner.height / geometry.rootFace.height, JSON.stringify({ viewerLabel, geometry })).toBeLessThanOrEqual(.19);
        expect(Number.parseFloat(geometry.rootCornerFontSize), JSON.stringify({ viewerLabel, geometry })).toBeLessThanOrEqual(4.5);
        expect(Number.parseFloat(geometry.rootSuitFontSize), JSON.stringify({ viewerLabel, geometry })).toBeLessThanOrEqual(3.75);
        expect(Number.parseFloat(geometry.rootTitleFontSize), JSON.stringify({ viewerLabel, geometry })).toBeLessThanOrEqual(5);
        expect(Number.parseFloat(geometry.rootTypeFontSize), JSON.stringify({ viewerLabel, geometry })).toBeLessThanOrEqual(3.5);
        const screenshot = testInfo.outputPath(`bumper-harvest-${viewerLabel}-${viewport.width}x${viewport.height}.png`);
        await page.screenshot({ path: screenshot, animations: "disabled" });
        await testInfo.attach(`bumper-harvest-${viewerLabel}-${viewport.width}x${viewport.height}`, { path: screenshot, contentType: "image/png" });
        await testInfo.attach(`bumper-harvest-${viewerLabel}-${viewport.width}x${viewport.height}-geometry`, {
          body: JSON.stringify(geometry, null, 2),
          contentType: "application/json",
        });
      }
    };

    const initialHarvest = await readRoom(request, code, token, host.id);
    expect(initialHarvest.isMyAction).toBe(false);
    expect(initialHarvest.pendingHarvest).not.toHaveProperty("previewCardId");
    const initialActorId = initialHarvest.pendingHarvest.actorId;
    const initialChoices = initialHarvest.pendingHarvest.choices.map((choice) => choice.cardId);
    const initialDeadline = initialHarvest.pendingHarvest.countdownUntil;
    await auditHarvestView("spectator", false);
    await page.setViewportSize({ width: 390, height: 700 });
    await expect(page.locator(".harvest-card-select")).toHaveCount(0);
    await expect(page.locator(".harvest-availability-label")).toHaveCount(initialHarvest.pendingHarvest.revealed.length);
    await tapHarvestCard(page, page.locator(".harvest-card-choice").first());
    await tap(page, page.locator(".harvest-card-info").first());
    await expect(page.locator('.card-details-panel[data-card-details-context="public-zone"]')).toBeVisible();
    await expect(page.getByRole("button", { name: "Confirm choice" })).toHaveCount(0);
    await expect(page.locator(".harvest-card-select")).toHaveCount(0);
    await expect(page.locator(".harvest-card-choice[data-harvest-card-state='selected']")).toHaveCount(0);
    await tap(page, page.getByRole("button", { name: "Close card details" }));
    const hitMapHandle = await page.waitForFunction(() => {
      const stage = document.querySelector(".harvest-choice-stage");
      const panel = document.querySelector(".harvest-choice-panel");
      if (!stage || !panel) return null;
      const switches = [...document.querySelectorAll("[data-testid^='test-view-switch-']")];
      if (!switches.length) return null;
      const hit = (element) => {
        const rect = element.getBoundingClientRect();
        const target = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
        return { id: element.getAttribute("data-test-viewer-id"), target: target?.getAttribute("data-testid") ?? target?.className ?? target?.tagName };
      };
      return {
        stagePointerEvents: getComputedStyle(stage).pointerEvents,
        panelPointerEvents: getComputedStyle(panel).pointerEvents,
        switches: switches.map(hit),
      };
    }, null, { timeout: 15_000 });
    const spectatorHitMap = await hitMapHandle.jsonValue();
    await hitMapHandle.dispose();
    expect(spectatorHitMap.stagePointerEvents).toBe("none");
    expect(spectatorHitMap.panelPointerEvents).toBe("none");
    expect(spectatorHitMap.switches.map((item) => item.target)).toEqual(spectatorHitMap.switches.map((item) => `test-view-switch-${item.id}`));
    const beforePath = testInfo.outputPath("bumper-harvest-spectator-before-switch.png");
    await page.screenshot({ path: beforePath, animations: "disabled" });
    await testInfo.attach("bumper-harvest-spectator-hit-map", {
      body: JSON.stringify({ viewport: page.viewportSize(), actorId: initialActorId, viewerId: host.id, ...spectatorHitMap }, null, 2),
      contentType: "application/json",
    });
    await testInfo.attach("bumper-harvest-spectator-before-switch", { path: beforePath, contentType: "image/png" });

    const spectator = room.players.find((player) => player.isTestPlayer && player.id !== source.id);
    await tap(page, page.getByTestId(`test-view-switch-${spectator.id}`));
    const spectatorDock = page.locator(`.local-player-dock[data-player-anchor="${spectator.id}"]`);
    await expect(spectatorDock).toBeVisible();
    await expect(spectatorDock).toBeFocused();
    let afterSwitch = await readRoom(request, code, token, spectator.id);
    expect(afterSwitch.pendingHarvest.actorId).toBe(initialActorId);
    expect(afterSwitch.pendingHarvest.choices.map((choice) => choice.cardId)).toEqual(initialChoices);
    expect(afterSwitch.pendingHarvest).not.toHaveProperty("previewCardId");
    expect(afterSwitch.pendingHarvest.countdownUntil).toBe(initialDeadline);

    const inspectedHero = page.locator(`.opponent-player-card[data-player-anchor="${source.id}"] .opponent-hero-target`);
    await tap(page, inspectedHero);
    await expect(page.locator(`.opponent-inspection-panel[data-inspect-player-id="${source.id}"]`)).toBeVisible();
    await tap(page, inspectedHero);
    const handInspection = page.getByTestId("hand-card-inspection-action").first();
    await tap(page, handInspection);
    const cardDetailsAction = page.getByTestId("hand-card-details-action");
    await expect(cardDetailsAction).toBeVisible();
    await tap(page, cardDetailsAction);
    await expect(page.locator('.card-details-panel[data-card-details-context="private-hand"]')).toBeVisible();
    await tap(page, page.getByRole("button", { name: "Close card details" }));

    await tap(page, page.getByTestId(`test-view-switch-${source.id}`));
    const sourceDock = page.locator(`.local-player-dock[data-player-anchor="${source.id}"]`);
    await expect(sourceDock).toBeVisible();
    await expect(sourceDock).toBeFocused();
    await expect(page.locator(".harvest-choice-panel--actor")).toHaveCSS("pointer-events", "auto");
    await auditHarvestView("actor", true);
    await page.setViewportSize({ width: 390, height: 700 });
    const firstCard = page.locator(".harvest-card-select:not([disabled])").first();
    await expect(firstCard).toBeVisible();
    await tapHarvestCard(page, firstCard);
    await expect(firstCard).toHaveAttribute("aria-pressed", "true");
    const firstCardInfo = page.locator(".harvest-card-choice").first().locator(".harvest-card-info");
    await tap(page, firstCardInfo);
    await expect(page.locator('.card-details-panel[data-card-details-context="public-zone"]')).toBeVisible();
    await expect(firstCard).toHaveAttribute("aria-pressed", "true");
    await tap(page, page.getByRole("button", { name: "Close card details" }));
    await tapHarvestCard(page, firstCard);
    await expect(firstCard).toHaveAttribute("aria-pressed", "false");
    const firstConfirm = page.getByRole("button", { name: "Confirm choice" });
    await expect(firstConfirm).toBeDisabled();
    await tapHarvestCard(page, firstCard);
    await expect(firstCard).toHaveAttribute("aria-pressed", "true");
    await expect(firstConfirm).toBeEnabled();
    await expect(page.getByRole("button", { name: "Confirm choice" })).toHaveCount(1);
    const beforeDraftSwitch = await readRoom(request, code, token, source.id);
    expect(beforeDraftSwitch.pendingHarvest.actorId).toBe(initialActorId);
    expect(beforeDraftSwitch.pendingHarvest.choices.map((choice) => choice.cardId)).toEqual(initialChoices);
    expect(beforeDraftSwitch.pendingHarvest).not.toHaveProperty("previewCardId");
    const activeSwitchTarget = room.players.find((player) => player.isTestPlayer && player.id !== source.id);
    await tap(page, page.getByTestId(`test-view-switch-${activeSwitchTarget.id}`));
    const activeSpectatorDock = page.locator(`.local-player-dock[data-player-anchor="${activeSwitchTarget.id}"]`);
    await expect(activeSpectatorDock).toBeVisible();
    await expect(activeSpectatorDock).toBeFocused();
    await expect(page.locator(".harvest-choice-panel--actor")).toHaveCount(0);
    await expect(page.locator(".harvest-card-select[aria-pressed='true']")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Confirm choice" })).toHaveCount(0);
    const afterDraftSwitch = await readRoom(request, code, token, activeSwitchTarget.id);
    expect(afterDraftSwitch.pendingHarvest.actorId).toBe(initialActorId);
    expect(afterDraftSwitch.pendingHarvest.choices.map((choice) => choice.cardId)).toEqual(initialChoices);
    expect(afterDraftSwitch.pendingHarvest).not.toHaveProperty("previewCardId");
    await tap(page, page.getByTestId(`test-view-switch-${source.id}`));
    await expect(sourceDock).toBeVisible();
    await expect(sourceDock).toBeFocused();
    await expect(page.locator(".harvest-card-select[aria-pressed='true']")).toHaveCount(0);
    const inspectedActorHero = page.locator(`.opponent-player-card[data-player-anchor="${activeSwitchTarget.id}"] .opponent-hero-target`);
    await tap(page, inspectedActorHero);
    await expect(page.locator(`.opponent-inspection-panel[data-inspect-player-id="${activeSwitchTarget.id}"]`)).toBeVisible();
    await tap(page, inspectedActorHero);
    const finalHarvestCard = page.locator(".harvest-card-select:not([disabled])").first();
    await tapHarvestCard(page, finalHarvestCard);
    await expect(finalHarvestCard).toHaveAttribute("aria-pressed", "true");
    await tapHarvestCard(page, finalHarvestCard);
    await expect(finalHarvestCard).toHaveAttribute("aria-pressed", "false");
    await expect(firstConfirm).toBeDisabled();
    await tapHarvestCard(page, finalHarvestCard);
    await expect(finalHarvestCard).toHaveAttribute("aria-pressed", "true");
    await expect(firstConfirm).toBeEnabled();
    const firstChoiceResponse = page.waitForResponse((response) => {
      if (response.request().method() !== "POST" || response.url() !== `${API}/api/rooms`) return false;
      try { return JSON.parse(response.request().postData() ?? "{}").action === "choose_harvest"; }
      catch { return false; }
    });
    await tap(page, firstConfirm);
    expect((await firstChoiceResponse).ok()).toBeTruthy();
    const secondActorId = room.players.find((player) => player.seat === 2).id;
    const firstEffectWindow = await readRoom(request, code, token);
    expect(firstEffectWindow.phase).toBe("response");
    expect(firstEffectWindow.pendingHarvest).toBeNull();
    expect(firstEffectWindow.publicHarvestPool?.revealed.map(({ id }) => id)).toEqual(initialHarvest.pendingHarvest.revealed.map(({ id }) => id));
    const firstEffectProgress = firstEffectWindow.presentationSnapshot?.bumperHarvestProgress;
    expect(firstEffectProgress?.semantics).toBe("PROVEN");
    const firstEffectRecipient = room.players.find(({ id }) => id === firstEffectProgress.currentParticipantId);
    expect(firstEffectRecipient, "the first effect recipient is selected by shared public progress").toBeTruthy();
    const firstEffectWindowId = firstEffectWindow.currentAction?.negationWindowId;
    expect(firstEffectWindowId).toBeTruthy();
    const holdFirstEffectWindow = await request.post(`${API}/__test/negation-window-clock`, {
      data: { code, windowId: firstEffectWindowId, mode: "hold" },
    });
    expect(holdFirstEffectWindow.ok(), await holdFirstEffectWindow.text()).toBeTruthy();
    await expect(page.locator('.harvest-choice-stage[data-harvest-readonly="true"]')).toBeVisible();
    await expect(page.locator(".harvest-choice-heading span"))
      .toHaveText(`Negation for ${firstEffectRecipient.name} · Read-only`);
    await expect(page.locator(".public-card-display-journey-copy b"))
      .toHaveAttribute("aria-label", `Negation: Block ${firstEffectRecipient.name}'s Harvest pick?`);
    await page.reload();
    await expect(page.locator(".game-shell")).toBeVisible();
    await expect(page.locator(".harvest-choice-heading span"))
      .toHaveText(`Negation for ${firstEffectRecipient.name} · Read-only`);
    await expect(page.locator(".public-card-display-journey-copy b"))
      .toHaveAttribute("aria-label", `Negation: Block ${firstEffectRecipient.name}'s Harvest pick?`);
    room = await passCurrentNegationWindow();
    await expect.poll(async () => {
      const current = await readRoom(request, code, token);
      return { actorId: current.pendingHarvest?.actorId, choices: current.pendingHarvest?.choices.length };
    }).toEqual({ actorId: secondActorId, choices: 1 });
    await expect(page.locator(".harvest-choice-stage")).toBeVisible();
    await expect(page.locator(`.harvest-choice-panel:not(.harvest-choice-panel--actor)`)).toHaveCSS("pointer-events", "none");
    await expect(page.locator(".harvest-card-choice[data-harvest-card-state='taken']")).toHaveCount(1);
    await expect(page.getByText(`Taken by ${source.name}`)).toBeVisible();

    const secondSpectator = room.players.find((player) => player.isTestPlayer && player.id !== source.id && player.id !== secondActorId);
    await tap(page, page.getByTestId(`test-view-switch-${secondSpectator.id}`));
    const secondSpectatorDock = page.locator(`.local-player-dock[data-player-anchor="${secondSpectator.id}"]`);
    await expect(secondSpectatorDock).toBeVisible();
    await expect(secondSpectatorDock).toBeFocused();
    afterSwitch = await readRoom(request, code, token, secondSpectator.id);
    expect(afterSwitch.pendingHarvest.actorId).toBe(secondActorId);
    expect(afterSwitch.pendingHarvest.choices).toHaveLength(1);
    await tap(page, page.getByTestId(`test-view-switch-${secondActorId}`));
    const secondActorDock = page.locator(`.local-player-dock[data-player-anchor="${secondActorId}"]`);
    await expect(secondActorDock).toBeVisible();
    await expect(secondActorDock).toBeFocused();
    await tapHarvestCard(page, page.locator(".harvest-card-select:not([disabled])").first());
    const secondConfirm = page.getByRole("button", { name: "Confirm choice" });
    await expect(secondConfirm).toBeEnabled();
    const secondChoiceResponse = page.waitForResponse((response) => {
      if (response.request().method() !== "POST" || response.url() !== `${API}/api/rooms`) return false;
      try { return JSON.parse(response.request().postData() ?? "{}").action === "choose_harvest"; }
      catch { return false; }
    });
    await tap(page, secondConfirm);
    expect((await secondChoiceResponse).ok()).toBeTruthy();
    const afterSecondChoice = await readRoom(request, code, token, secondActorId);
    // Each accepted Harvest choice immediately opens that participant's Negation
    // window, so pendingHarvest is intentionally parked until those responses end.
    expect(afterSecondChoice.log.some((entry) => entry.includes(`${room.players.find((player) => player.id === secondActorId).name} chooses`))).toBe(true);
    expect(afterSecondChoice.phase).toBe("response");
    expect(afterSecondChoice.pendingHarvest).toBeNull();
    expect(afterSecondChoice.publicHarvestPool?.revealed.map(({ id }) => id)).toEqual(initialHarvest.pendingHarvest.revealed.map(({ id }) => id));
    const secondEffectProgress = afterSecondChoice.presentationSnapshot?.bumperHarvestProgress;
    expect(secondEffectProgress?.semantics).toBe("PROVEN");
    expect(secondEffectProgress.participants.find(({ playerId }) => playerId === secondActorId)?.status).toBe("RESOLVED");
    expect(secondEffectProgress.currentParticipantId).not.toBe(firstEffectRecipient.id);
    const secondEffectWindowId = afterSecondChoice.currentAction?.negationWindowId;
    expect(secondEffectWindowId).toBeTruthy();
    const holdSecondEffectWindow = await request.post(`${API}/__test/negation-window-clock`, {
      data: { code, windowId: secondEffectWindowId, mode: "hold" },
    });
    expect(holdSecondEffectWindow.ok(), await holdSecondEffectWindow.text()).toBeTruthy();
    await expect(page.locator('.harvest-choice-stage[data-harvest-readonly="true"]')).toBeVisible();
    const secondEffectRecipient = room.players.find(({ id }) => id === secondEffectProgress.currentParticipantId);
    expect(secondEffectRecipient?.name).toBeTruthy();
    await expect(page.locator(".harvest-choice-heading span"))
      .toHaveText(`Negation for ${secondEffectRecipient.name} · Read-only`);
    await expect(page.locator(".public-card-display-journey-copy b"))
      .toHaveAttribute("aria-label", `Negation: Block ${secondEffectRecipient.name}'s Harvest pick?`);
  } finally {
    await context.close();
  }
});

test("Harvest content-fit scales from 1 to 8 genuine cards and swipes at 6–8 seats", async ({ browser, request }, testInfo) => {
  test.setTimeout(120_000);
  for (const scenario of [
    { seats: 4, alive: 1, choices: 1, viewport: { width: 390, height: 700 } },
    { seats: 4, alive: 2, choices: 2, viewport: { width: 390, height: 844 } },
    { seats: 4, alive: 4, choices: 4, viewport: { width: 390, height: 700 } },
    { seats: 4, alive: 4, choices: 4, viewport: { width: 390, height: 844 } },
    { seats: 4, alive: 4, choices: 4, viewport: { width: 440, height: 766 } },
    { seats: 4, alive: 4, choices: 4, viewport: { width: 480, height: 900 } },
    { seats: 6, alive: 6, choices: 6, viewport: { width: 390, height: 700 } },
    { seats: 8, alive: 8, choices: 8, viewport: { width: 440, height: 766 } },
  ]) {
    const seed = await seedHarvestPool(request, scenario.seats, scenario.alive);
    const room = await openHarvestChoice(request, seed);
    expect(room.pendingHarvest.revealed).toHaveLength(scenario.choices);
    expect(room.pendingHarvest.actorId).toBe(seed.players[0].id);

    const context = await browser.newContext({ viewport: scenario.viewport, isMobile: true, hasTouch: true, deviceScaleFactor: 3 });
    try {
      const page = await context.newPage();
      await page.addInitScript(({ code, token, name }) => {
        localStorage.setItem("three-realms-session", JSON.stringify({ code, token, name }));
      }, { code: seed.code, token: seed.players[0].token, name: seed.players[0].name });
      await page.goto(`${API}/`);
      await expect(page.locator(".game-shell")).toBeVisible();
      await expect(page.locator(".harvest-choice-panel--actor")).toBeVisible();
      await expect(page.locator(".harvest-card-choice")).toHaveCount(scenario.choices);
      await expect(page.locator(`.player-board[data-player-count="${scenario.seats}"]`)).toBeVisible();
      if (scenario.seats >= 6) {
        await expect(page.locator(`.player-board[data-player-count="${scenario.seats}"][data-seat-topology="side-column"]`)).toBeVisible();
      }

      const geometry = await harvestGeometry(page);
      const contextLabel = JSON.stringify({ scenario, geometry });
      expect(geometry.panel.width, contextLabel).toBeLessThanOrEqual(scenario.viewport.width - 16);
      expect(geometry.overlaps, contextLabel).toMatchObject({
        panelAnnouncement: false,
        panelSeat: false,
        panelTimer: false,
      });
      expect(geometry.cards.every((card) => card.width >= 58), contextLabel).toBe(true);
      if (scenario.choices === 4) {
        const expectedCardWidth = Math.min(76, Math.max(70, scenario.viewport.width * .17));
        expect(geometry.cards.every((card) => Math.abs(card.width - expectedCardWidth) <= .5), contextLabel).toBe(true);
        expect(geometry.panel.width, contextLabel).toBeLessThanOrEqual(geometry.row.width + 20);
      }
      expect(geometry.footer.bottom, contextLabel).toBeLessThanOrEqual(scenario.viewport.height + 1);
      const initialVisibleDetails = geometry.cardDetailsTargets.filter((detail) => detail.card.left >= geometry.rowClip.left - 1
        && detail.card.right <= geometry.rowClip.right + 1);
      expect(initialVisibleDetails.length, contextLabel).toBeGreaterThan(0);
      expect(initialVisibleDetails.every((detail) => detail.infoWidth >= 44
        && detail.infoHeight >= 44 && detail.infoCentered && detail.titleClearOfInfoGlyph), contextLabel).toBe(true);
      expect(scenario.choices <= 4 ? geometry.panel.width < scenario.viewport.width - 16 : geometry.panel.width <= scenario.viewport.width - 16, contextLabel).toBe(true);
      expect(geometry.document.documentWidth).toBeLessThanOrEqual(scenario.viewport.width);

      const row = page.locator(".harvest-card-row");
      const rowSize = await row.evaluate((element) => ({ clientWidth: element.clientWidth, scrollWidth: element.scrollWidth }));
      if (scenario.choices <= 2) {
        expect(rowSize.scrollWidth).toBeLessThanOrEqual(rowSize.clientWidth + 1);
      }
      if (scenario.choices >= 6) {
        expect(rowSize.scrollWidth, contextLabel).toBeGreaterThan(rowSize.clientWidth);
        const cardFace = page.locator(".harvest-card-choice > .played-card").first();
        const faceBounds = await cardFace.boundingBox();
        const rowBounds = await row.boundingBox();
        expect(faceBounds && rowBounds).toBeTruthy();
        const touch = await context.newCDPSession(page);
        await row.evaluate((element) => { element.scrollLeft = 0; });
        for (let gesture = 0; gesture < 3; gesture += 1) {
          const position = await row.evaluate((element) => {
            const bounds = element.getBoundingClientRect();
            const clipLeft = bounds.left + element.clientLeft;
            const clipRight = clipLeft + element.clientWidth;
            const visibleCards = [...element.querySelectorAll(".harvest-card-choice")].map((card) => card.getBoundingClientRect())
              .filter((card) => card.right > clipLeft + 1 && card.left < clipRight - 1);
            const lastVisible = visibleCards.at(-1);
            const swipeY = lastVisible.top + lastVisible.height * .42;
            const segmentLeft = Math.max(lastVisible.left, clipLeft);
            const segmentRight = Math.min(lastVisible.right, clipRight);
            const swipeX = (segmentLeft + segmentRight) / 2;
            return {
              left: bounds.left,
              right: bounds.right,
              scrollLeft: element.scrollLeft,
              maxScroll: element.scrollWidth - element.clientWidth,
              clientWidth: element.clientWidth,
              scrollWidth: element.scrollWidth,
              swipeStart: { x: Math.round(swipeX), y: Math.round(swipeY) },
              swipeTarget: document.elementFromPoint(swipeX, swipeY)?.className ?? null,
            };
          });
          if (position.scrollLeft >= position.maxScroll - 1) break;
          const start = position.swipeStart;
          expect(String(position.swipeTarget), contextLabel).toContain("harvest-card-select");
          await touch.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ ...start, id: 77 }] });
          for (let step = 1; step <= 12; step += 1) {
            await touch.send("Input.dispatchTouchEvent", {
              type: "touchMove",
              touchPoints: [{ x: start.x - step * 18, y: start.y, id: 77 }],
            });
          }
          await touch.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
          await expect.poll(() => row.evaluate((element) => element.scrollLeft)).toBeGreaterThan(position.scrollLeft);
        }
        await expect.poll(() => row.evaluate((element) => element.scrollLeft >= element.scrollWidth - element.clientWidth - 1)).toBe(true);
        await expect(page.locator(".harvest-card-select[aria-pressed='true']")).toHaveCount(0);
        await expect.poll(() => page.locator(".harvest-card-select:not([disabled])").last().evaluate((element) => {
          const rect = element.getBoundingClientRect();
          const rowRect = element.closest(".harvest-card-row").getBoundingClientRect();
          return rect.left >= rowRect.left - 1 && rect.right <= rowRect.right + 1;
        })).toBe(true);
        const lastCard = page.locator(".harvest-card-choice").last();
        const lastInfo = lastCard.locator(".harvest-card-info");
        const lastInfoHit = await lastInfo.evaluate((element) => {
          const rect = element.getBoundingClientRect();
          const hit = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
          return Boolean(hit && (hit === element || element.contains(hit)));
        });
        expect(lastInfoHit, contextLabel).toBe(true);
        await tap(page, lastInfo);
        await expect(page.locator('.card-details-panel[data-card-details-context="public-zone"]')).toBeVisible();
        await expect(lastCard.locator(".harvest-card-select")).toHaveAttribute("aria-pressed", "false");
        await tap(page, page.getByRole("button", { name: "Close card details" }));
        await touch.detach();
        expect(await page.evaluate(() => window.scrollY)).toBe(0);
      }

      const viewportLabel = `${scenario.viewport.width}x${scenario.viewport.height}`;
      const screenshot = testInfo.outputPath(`harvest-density-${scenario.choices}-cards-${scenario.seats}-seats-${viewportLabel}.png`);
      await page.screenshot({ path: screenshot, animations: "disabled" });
      await testInfo.attach(`harvest-density-${scenario.choices}-cards-${scenario.seats}-seats-${viewportLabel}`, { path: screenshot, contentType: "image/png" });
      await testInfo.attach(`harvest-density-${scenario.choices}-geometry-${scenario.seats}-seats`, {
        body: JSON.stringify({ scenario, geometry, rowSize }, null, 2),
        contentType: "application/json",
      });
    } finally {
      await context.close();
    }
  }
});
