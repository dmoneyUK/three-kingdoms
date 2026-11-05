import { expect, test } from "@playwright/test";

const API = "http://127.0.0.1:3137";
const card = (kind, id, suit = "♠") => ({ id, kind, suit, rank: "7" });

async function seedRoom(request, { rainingArrowsOnly = false } = {}) {
  const prefix = `pac-order-${Date.now()}`;
  const ids = {
    drawRoot: `${prefix}-draw-root`,
    groupRoot: `${prefix}-group-root`,
    rainingRoot: `${prefix}-raining-root`,
    negation: `${prefix}-negation`,
    drawOne: `${prefix}-draw-one`,
    drawTwo: `${prefix}-draw-two`,
  };
  const players = [
    { name: "PAC SOURCE", role: "Lord", hero: "liu-bei", hp: 4, maxHp: 4,
      hand: rainingArrowsOnly ? [card("RainingArrows", ids.rainingRoot)] : [card("DrawTwo", ids.drawRoot), card("BarbarianInvasion", ids.groupRoot)] },
    { name: "PAC NEGATION", role: "Loyalist", hero: "cao-cao", hp: 4, maxHp: 4, hand: [card("Negation", ids.negation, "♥")] },
    { name: "PAC TARGET 2", role: "Rebel", hero: "sun-quan", hp: 4, maxHp: 4, hand: [] },
    { name: "PAC TARGET 3", role: "Renegade", hero: "zhen-ji", hp: 4, maxHp: 4, hand: [] },
  ];
  const deck = [card("Attack", ids.drawOne, "♣"), card("Dodge", ids.drawTwo, "♦"), ...Array.from({ length: 40 }, (_, index) => card(index % 2 ? "Dodge" : "Attack", `${prefix}-deck-${index}`))];
  const response = await request.post(`${API}/__test/seed-playing-game`, {
    data: { phase: "play", turnSeat: 0, deck, players },
  });
  if (!response.ok()) throw new Error(`PAC order room seed failed: ${await response.text()}`);
  const room = await response.json();
  room.players.sort((left, right) => left.seat - right.seat);
  return { ...room, ids };
}

async function openPlayer(page, room, index = 0) {
  const player = room.players[index];
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${API}/api/health`);
  await page.evaluate(({ code, token, name }) => {
    localStorage.setItem("three-realms-session", JSON.stringify({ code, token, name }));
  }, { code: room.code, token: player.token, name: player.name });
  await page.goto(`${API}/`);
  await expect(page.locator(`.local-player-dock[data-player-anchor="${player.id}"]`)).toBeVisible();
  return player;
}

async function view(request, room, index = 0) {
  const response = await request.get(`${API}/api/rooms?code=${room.code}&token=${room.players[index].token}`);
  expect(response.ok()).toBeTruthy();
  return response.json();
}

function cardEvent(roomView, cardId) {
  return roomView.timeline.find((event) => event?.type === "card" && event.action === "play" && event.card?.id === cardId) ?? null;
}

async function playRoot(request, room, cardId) {
  const response = await request.post(`${API}/api/rooms`, {
    data: { action: "play_card", code: room.code, token: room.players[0].token, cardId },
  });
  if (!response.ok()) throw new Error(`Public root play was rejected: ${await response.text()}`);
  const opened = await response.json();
  const windowId = opened.room?.currentAction?.negationWindowId;
  expect(windowId).toBeTruthy();
  const state = await view(request, room);
  const root = cardEvent(state, cardId);
  expect(root?.player).toBe(room.players[0].name);
  return { root, windowId, state };
}

async function commitNegation(request, room, rootWindowId) {
  const intent = await request.post(`${API}/api/rooms`, {
    data: { action: "respond", code: room.code, token: room.players[1].token, providerId: "negation_card", cardId: room.ids.negation, context: { windowId: rootWindowId } },
  });
  if (!intent.ok()) throw new Error(`Committed Negation response was rejected: ${await intent.text()}`);
  for (const [index, player] of room.players.entries()) {
    if (index === 1) continue;
    const beforeCommit = await view(request, room, index);
    expect(JSON.stringify(beforeCommit.timeline)).not.toContain(room.ids.negation);
    expect(JSON.stringify(beforeCommit.presentationSnapshot ?? {})).not.toContain(room.ids.negation);
    const pass = await request.post(`${API}/api/rooms`, {
      data: { action: "decline_response", code: room.code, token: player.token, context: { windowId: rootWindowId } },
    });
    if (!pass.ok()) throw new Error(`${player.name} could not pass the Negation window: ${await pass.text()}`);
  }
  const committed = await view(request, room);
  const event = committed.timeline.find((entry) => entry?.type === "card" && entry.card?.id === room.ids.negation) ?? null;
  expect(event?.player).toBe(room.players[1].name);
  const counterWindowId = committed.currentAction?.negationWindowId;
  if (counterWindowId) {
    for (const player of room.players) {
      const response = await request.post(`${API}/api/rooms`, {
        data: { action: "decline_response", code: room.code, token: player.token, context: { windowId: counterWindowId } },
      });
      if (!response.ok()) throw new Error(`${player.name} could not pass the Negation counter window: ${await response.text()}`);
    }
  }
  return { event, state: await view(request, room) };
}

async function sampleReveal(page, event) {
  const journey = page.locator(`[data-public-card-journey-event-id="${event.id}"]`);
  await expect(journey).toHaveCount(1, { timeout: 12_000 });
  let latest = null;
  try {
    await expect.poll(async () => {
      latest = await page.evaluate((eventId) => {
      const card = [...document.querySelectorAll("[data-public-card-journey-event-id]")]
        .find((element) => element.dataset.publicCardJourneyEventId === eventId);
      if (!card) return null;
      const rect = (element) => {
        if (!element) return null;
        const bounds = element.getBoundingClientRect();
        const style = getComputedStyle(element);
        return { left: bounds.left, top: bounds.top, right: bounds.right, bottom: bounds.bottom, width: bounds.width, height: bounds.height,
          visible: style.visibility === "visible" && style.display !== "none" && bounds.width > 0 && bounds.height > 0 };
      };
      const display = card.closest(".public-card-display");
      const chip = document.querySelector("[data-public-activity-chip='true']");
      const announcement = display?.querySelector("[data-public-card-announcement='true']");
      const table = card.closest(".play-table");
      const countdown = document.querySelector(".stage-system-cluster .visible-countdown-event, .visible-countdown");
      const dock = document.querySelector(".local-player-dock");
      const consoleGuidance = document.querySelector(".local-player-dock .console-guidance");
      return {
        eventId: card.dataset.publicCardJourneyEventId,
        cardId: card.dataset.publicCardJourneyCardId,
        actorId: card.dataset.publicCardJourneyActorId,
        phase: card.dataset.publicCardJourneyPhase,
        size: card.dataset.publicCardJourneySize,
        activeSamePhysicalCardFaces: [...document.querySelectorAll('[data-public-card-journey-phase="reveal"][data-public-card-journey-card-id]')]
          .filter((face) => face.dataset.publicCardJourneyCardId === card.dataset.publicCardJourneyCardId).length,
        motion: display?.dataset.publicCardMotion ?? display?.dataset.publicCardRendererKind ?? null,
        displayInteractionId: display?.dataset.publicCardInteractionId ?? null,
        displayViewerId: display?.dataset.publicCardViewerId ?? null,
        displayLayoutViewerId: display?.dataset.publicCardLayoutViewerId ?? null,
        displayLayoutPending: display?.dataset.publicCardLayoutPending ?? null,
        matchingPrimaryCount: display?.querySelectorAll('[data-public-card-primary-card="true"][data-public-card-journey-phase="reveal"]').length ?? 0,
        announcementAnchorEventId: announcement?.dataset.publicCardAnnouncementAnchorEventId ?? null,
        sharedLayoutFailure: table?.dataset.publicStageLayoutFailure ?? null,
        rootEventId: display?.dataset.publicCardRootEventId ?? null,
        face: rect(card),
        pac: { ...rect(chip), layout: chip?.dataset.publicActivityLayout ?? null, compact: chip?.dataset.publicActivityCompact === "true", label: chip?.getAttribute("aria-label") ?? null },
        pacLayoutIdentity: chip?.dataset.publicStageLayoutIdentity ?? null,
        h4: { ...rect(announcement), eventId: announcement?.dataset.publicCardAnnouncementEventId ?? null, text: announcement?.textContent?.trim() ?? null },
        h4LayoutIdentity: announcement?.dataset.publicStageLayoutIdentity ?? null,
        cardLayoutIdentity: card.dataset.publicStageLayoutIdentity ?? null,
        countdown: rect(countdown),
        countdownLayoutIdentity: countdown?.dataset.publicStageLayoutIdentity ?? null,
        countdownSharedRect: countdown?.dataset.publicStageLayoutProtectedRect ?? null,
        dock: rect(dock),
        consoleGuidance: rect(consoleGuidance),
        seats: [...document.querySelectorAll(".opponent-player-card[data-player-anchor]")].map((seat) => ({ id: seat.dataset.playerAnchor, ...rect(seat) })),
        table: rect(table),
        sharedLayoutStatus: table?.dataset.publicStageLayoutStatus ?? null,
        sharedLayoutIdentity: table?.dataset.publicStageLayoutIdentity ?? null,
        sharedLayoutScope: table?.dataset.publicStageLayoutScope ?? null,
      };
      }, event.id);
      const ready = latest?.phase === "reveal" && latest.face?.visible && latest.pac?.visible && latest.h4?.visible && latest.countdown?.visible
        && latest.sharedLayoutStatus === "shared-reveal" && latest.sharedLayoutIdentity
        && latest.cardLayoutIdentity === latest.sharedLayoutIdentity
        && latest.h4LayoutIdentity === latest.sharedLayoutIdentity
        && latest.pacLayoutIdentity === latest.sharedLayoutIdentity
        && latest.countdownLayoutIdentity === latest.sharedLayoutIdentity;
      return { ready: Boolean(ready), observation: latest };
    }, { timeout: 12_000, intervals: [40, 80, 120] }).toMatchObject({ ready: true });
  } catch (error) {
    console.error(`[PUBLIC-PAC-REVEAL-ORDER-01] reveal geometry diagnostic ${JSON.stringify(latest)}`);
    throw error;
  }
  return latest;
}

async function sampleSharedPhase(page, event, expectedPhase) {
  let latest = null;
  try {
    await expect.poll(async () => {
    latest = await page.evaluate(({ eventId, expected }) => {
      const card = [...document.querySelectorAll("[data-public-card-journey-event-id]")]
        .find((element) => element.dataset.publicCardJourneyEventId === eventId);
      const table = card?.closest(".play-table");
      const display = card?.closest(".public-card-display");
      const h4 = display?.querySelector("[data-public-card-announcement='true']");
      const pac = document.querySelector("[data-public-activity-chip='true']");
      const countdown = document.querySelector(".visible-countdown");
      const rect = (element) => {
        if (!element) return null;
        const bounds = element.getBoundingClientRect();
        return { left: bounds.left, top: bounds.top, right: bounds.right, bottom: bounds.bottom,
          width: bounds.width, height: bounds.height };
      };
      if (!card) return { phase: null, expected, status: table?.dataset.publicStageLayoutStatus ?? null,
        failure: table?.dataset.publicStageLayoutFailure ?? null };
      return {
        phase: card.dataset.publicCardJourneyPhase,
        expected,
        phaseMatches: card.dataset.publicCardJourneyPhase === expected,
        eventId: card.dataset.publicCardJourneyEventId,
        cardId: card.dataset.publicCardJourneyCardId,
        target: {
          left: Number(card.dataset.publicCardJourneyTargetLeft),
          top: Number(card.dataset.publicCardJourneyTargetTop),
          width: Number(card.dataset.publicCardJourneyTargetWidth),
          height: Number(card.dataset.publicCardJourneyTargetHeight),
        },
        card: rect(card),
        h4: rect(h4),
        pac: rect(pac),
        countdown: rect(countdown),
        h4Identity: h4?.dataset.publicStageLayoutIdentity ?? null,
        cardIdentity: card.dataset.publicStageLayoutIdentity ?? null,
        pacIdentity: pac?.dataset.publicStageLayoutIdentity ?? null,
        countdownIdentity: countdown?.dataset.publicStageLayoutIdentity ?? null,
        h4Placement: h4?.dataset.publicCardAnnouncementPlacement ?? null,
        status: table?.dataset.publicStageLayoutStatus ?? null,
        failure: table?.dataset.publicStageLayoutFailure ?? null,
        identity: table?.dataset.publicStageLayoutIdentity ?? null,
        table: rect(table),
      };
    }, { eventId: event.id, expected: expectedPhase });
      return {
        ...latest,
        ready: Boolean(latest && latest.phaseMatches && latest.status === `shared-${expectedPhase}`
        && latest.identity && latest.h4Identity === latest.identity && latest.cardIdentity === latest.identity
        && latest.pacIdentity === latest.identity && latest.countdownIdentity === latest.identity),
      };
    }, { timeout: 9_000, intervals: [20, 40, 60] }).toMatchObject({ ready: true });
  } catch (error) {
    console.error(`[PUBLIC-PAC-REVEAL-ORDER-01] phase diagnostic ${JSON.stringify(latest)}`);
    throw error;
  }
  return latest;
}

async function watchPublicCardPhases(page, cardId) {
  await page.evaluate((watchedCardId) => {
    const phases = {};
    let frame = 0;
    const capture = () => {
      frame = 0;
      const card = [...document.querySelectorAll("[data-public-card-journey-card-id]")]
        .find((element) => element.dataset.publicCardJourneyCardId === watchedCardId
          && ["move", "parked"].includes(element.dataset.publicCardJourneyPhase ?? ""));
      if (!card) return;
      const table = card.closest(".play-table");
      const display = card.closest(".public-card-display");
      const h4 = display?.querySelector("[data-public-card-announcement='true']");
      const pac = document.querySelector("[data-public-activity-chip='true']");
      const countdown = document.querySelector(".visible-countdown");
      const rect = (element) => {
        if (!element) return null;
        const bounds = element.getBoundingClientRect();
        return { left: bounds.left, top: bounds.top, right: bounds.right, bottom: bounds.bottom,
          width: bounds.width, height: bounds.height };
      };
      const phase = card.dataset.publicCardJourneyPhase;
      const identity = table?.dataset.publicStageLayoutIdentity ?? null;
      const record = {
        phase,
        eventId: card.dataset.publicCardJourneyEventId,
        cardId: card.dataset.publicCardJourneyCardId,
        target: {
          left: Number(card.dataset.publicCardJourneyTargetLeft),
          top: Number(card.dataset.publicCardJourneyTargetTop),
          width: Number(card.dataset.publicCardJourneyTargetWidth),
          height: Number(card.dataset.publicCardJourneyTargetHeight),
        },
        card: rect(card),
        h4: rect(h4),
        pac: rect(pac),
        countdown: rect(countdown),
        h4Identity: h4?.dataset.publicStageLayoutIdentity ?? null,
        cardIdentity: card.dataset.publicStageLayoutIdentity ?? null,
        pacIdentity: pac?.dataset.publicStageLayoutIdentity ?? null,
        countdownIdentity: countdown?.dataset.publicStageLayoutIdentity ?? null,
        h4Placement: h4?.dataset.publicCardAnnouncementPlacement ?? null,
        status: table?.dataset.publicStageLayoutStatus ?? null,
        identity,
        table: rect(table),
      };
      record.ready = Boolean(record.status === `shared-${phase}` && identity
        && record.h4Identity === identity && record.cardIdentity === identity
        && record.pacIdentity === identity && record.countdownIdentity === identity);
      phases[phase] = record;
      window.__publicCardPhaseEvidence = phases;
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(capture);
    };
    const observer = new MutationObserver(schedule);
    observer.observe(document.documentElement, { subtree: true, childList: true, attributes: true });
    window.__publicCardPhaseEvidence = phases;
    window.__publicCardPhaseObserver = observer;
    schedule();
  }, cardId);
}

async function sampleObservedPublicCardPhase(page, phase) {
  let latest = null;
  try {
    await expect.poll(async () => {
      latest = await page.evaluate((currentPhase) => window.__publicCardPhaseEvidence?.[currentPhase] ?? null, phase);
      return Boolean(latest?.ready);
    }, { timeout: 9_000, intervals: [20, 40, 60] }).toBe(true);
  } catch (error) {
    const phaseEvidence = await page.evaluate(() => window.__publicCardPhaseEvidence ?? null);
    console.error(`[PUBLIC-PAC-REVEAL-ORDER-01] observed phase evidence ${JSON.stringify(phaseEvidence)}`);
    throw error;
  }
  return latest;
}

test("PUBLIC-PAC keeps genuine Something Out of Nothing and Barbarian Invasion reveals above the lower PAC", async ({ browser, request }, testInfo) => {
  test.setTimeout(150_000);
  const room = await seedRoom(request);
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  try {
    await openPlayer(page, room, 1);
    const observations = [];

    const drawRoot = await playRoot(request, room, room.ids.drawRoot);
    observations.push(await sampleReveal(page, drawRoot.root));
    const negation = await commitNegation(request, room, drawRoot.windowId);
    expect(negation.state.timeline.filter((entry) => entry?.type === "card" && entry.card?.id === room.ids.negation)).toHaveLength(1);
    expect(negation.event.player).toBe(room.players[1].name);
    const committedNegation = { eventId: negation.event.id, cardId: room.ids.negation, actorId: room.players[1].id };

    await expect.poll(async () => (await view(request, room)).currentAction?.actorId).toBe(room.players[0].id);
    await watchPublicCardPhases(page, room.ids.groupRoot);
    const groupRoot = await playRoot(request, room, room.ids.groupRoot);
    observations.push(await sampleReveal(page, groupRoot.root));
    const move = await sampleObservedPublicCardPhase(page, "move");
    const parked = await sampleSharedPhase(page, groupRoot.root, "parked");

    const evidence = { observations, phases: [move, parked], committedNegation };
    console.log(`[PUBLIC-PAC-REVEAL-ORDER-01] ${JSON.stringify(evidence)}`);
    await testInfo.attach("public-pac-reveal-order-dom-geometry.json", {
      body: JSON.stringify(evidence, null, 2), contentType: "application/json",
    });
    expect(observations.map(({ eventId, cardId, phase }) => ({ eventId, cardId, phase }))).toEqual([
      { eventId: drawRoot.root.id, cardId: room.ids.drawRoot, phase: "reveal" },
      { eventId: groupRoot.root.id, cardId: room.ids.groupRoot, phase: "reveal" },
    ]);
    for (const geometry of observations) {
      expect(geometry.sharedLayoutStatus).toBe("shared-reveal");
      expect(geometry.sharedLayoutIdentity).toBeTruthy();
      expect(geometry.cardLayoutIdentity).toBe(geometry.sharedLayoutIdentity);
      expect(geometry.h4LayoutIdentity).toBe(geometry.sharedLayoutIdentity);
      expect(geometry.pacLayoutIdentity).toBe(geometry.sharedLayoutIdentity);
      expect(geometry.countdownLayoutIdentity).toBe(geometry.sharedLayoutIdentity);
      expect(JSON.parse(geometry.countdownSharedRect)).toEqual([
        Math.round(geometry.countdown.left * 2) / 2,
        Math.round(geometry.countdown.top * 2) / 2,
        Math.round(geometry.countdown.right * 2) / 2,
        Math.round(geometry.countdown.bottom * 2) / 2,
      ]);
      expect(geometry.motion).toBeTruthy();
      expect(geometry.rootEventId).toBe(geometry.eventId);
      expect(geometry.actorId).toBe(room.players[0].id);
      expect(geometry.size).toBe("reveal");
      expect(geometry.activeSamePhysicalCardFaces).toBe(1);
      expect(geometry.face.bottom + 8).toBeLessThanOrEqual(geometry.pac.top);
      expect(Math.abs(geometry.pac.bottom - geometry.consoleGuidance.top)).toBeLessThanOrEqual(2);
      expect(geometry.pac.layout).not.toContain("upper-band");
      expect(geometry.pac.top).toBeGreaterThanOrEqual(geometry.table.top + geometry.table.height * 0.58);
      expect(geometry.pac.bottom).toBeLessThanOrEqual(geometry.dock.top);
      expect(geometry.countdown.visible).toBe(true);
      expect(geometry.h4.visible).toBe(true);
      const overlaps = (left, right) => left.left < right.right && left.right > right.left && left.top < right.bottom && left.bottom > right.top;
      expect(overlaps(geometry.face, geometry.pac)).toBe(false);
      expect(overlaps(geometry.h4, geometry.face)).toBe(false);
      expect(overlaps(geometry.h4, geometry.pac)).toBe(false);
      expect(overlaps(geometry.countdown, geometry.pac)).toBe(false);
    }
    expect(move.phase).toBe("move");
    expect(move.cardId).toBe(groupRoot.root.card.id);
    expect(move.h4Placement).toBe("shared-move");
    expect(parked.phase).toBe("parked");
    expect(parked.eventId).toBe(groupRoot.root.id);
    expect(parked.cardId).toBe(groupRoot.root.card.id);
    expect(parked.h4Placement).toBe("shared-parked");
    expect(Math.abs((parked.h4.top + parked.h4.bottom) / 2 - (parked.table.top + parked.table.bottom) / 2)).toBeLessThanOrEqual(32);
    const overlaps = (left, right) => left.left < right.right && left.right > right.left && left.top < right.bottom && left.bottom > right.top;
    expect(overlaps(parked.h4, parked.card)).toBe(false);
    expect(overlaps(parked.h4, parked.pac)).toBe(false);
    expect(overlaps(parked.h4, parked.countdown)).toBe(false);
    expect(Math.abs(parked.card.left - parked.target.left)).toBeLessThanOrEqual(2);
    expect(Math.abs(parked.card.top - parked.target.top)).toBeLessThanOrEqual(2);
  } finally {
    await page.close();
  }
});

test("PUBLIC-PAC keeps a genuine Raining Arrows reveal above the lower PAC through a committed Negation", async ({ browser, request }, testInfo) => {
  test.setTimeout(150_000);
  const room = await seedRoom(request, { rainingArrowsOnly: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  try {
    await openPlayer(page, room, 1);
    const root = await playRoot(request, room, room.ids.rainingRoot);
    const reveal = await sampleReveal(page, root.root);
    const negation = await commitNegation(request, room, root.windowId);
    expect(negation.state.timeline.filter((entry) => entry?.type === "card" && entry.card?.id === room.ids.negation)).toHaveLength(1);
    expect(negation.event.player).toBe(room.players[1].name);

    let postResponse = null;
    await expect.poll(async () => {
      postResponse = await page.evaluate((eventId) => {
        const rect = (element) => {
          if (!element) return null;
          const bounds = element.getBoundingClientRect();
          const style = getComputedStyle(element);
          return { left: bounds.left, top: bounds.top, right: bounds.right, bottom: bounds.bottom,
            width: bounds.width, height: bounds.height,
            visible: style.visibility !== "hidden" && style.display !== "none" && bounds.width > 0 && bounds.height > 0 };
        };
        const face = [...document.querySelectorAll("[data-public-card-journey-event-id]")]
          .find((element) => element.dataset.publicCardJourneyEventId === eventId);
        const chip = document.querySelector("[data-public-activity-chip='true']");
        return {
          face: face ? { eventId: face.dataset.publicCardJourneyEventId, cardId: face.dataset.publicCardJourneyCardId,
            actorId: face.dataset.publicCardJourneyActorId, phase: face.dataset.publicCardJourneyPhase,
            size: face.dataset.publicCardJourneySize, ...rect(face) } : null,
          pac: { ...rect(chip), layout: chip?.dataset.publicActivityLayout ?? null,
            compact: chip?.dataset.publicActivityCompact === "true", label: chip?.getAttribute("aria-label") ?? null },
          h4: rect(document.querySelector("[data-public-card-announcement='true']")),
          countdown: rect(document.querySelector(".stage-system-cluster .visible-countdown-event, .visible-countdown")),
          dock: rect(document.querySelector(".local-player-dock")),
          consoleGuidance: rect(document.querySelector(".local-player-dock .console-guidance")),
        };
      }, root.root.id);
      return postResponse.face?.phase === "reveal" && postResponse.face?.visible && postResponse.pac?.visible
        && postResponse.pac.label?.includes("Negation can cancel the Raining Arrows effect");
    }, { timeout: 12_000, intervals: [40, 80, 120] }).toBe(true);

    const evidence = {
      viewport: { width: 390, height: 844 },
      viewerId: room.players[1].id,
      root: { eventId: root.root.id, cardId: room.ids.rainingRoot, actorId: room.players[0].id,
        actorName: root.root.player, resolutionId: root.root.resolutionId },
      committedNegation: { eventId: negation.event.id, cardId: room.ids.negation, actorId: room.players[1].id },
      reveal,
      postResponse,
    };
    console.log(`[PUBLIC-PAC-REVEAL-ORDER-01] ${JSON.stringify(evidence)}`);
    await testInfo.attach("public-pac-raining-arrows-geometry.json", {
      body: JSON.stringify(evidence, null, 2), contentType: "application/json",
    });

    expect(reveal.eventId).toBe(root.root.id);
    expect(reveal.cardId).toBe(room.ids.rainingRoot);
    expect(reveal.actorId).toBe(room.players[0].id);
    expect(reveal.size).toBe("reveal");
    expect(reveal.activeSamePhysicalCardFaces).toBe(1);
    expect(reveal.face.width).toBe(90);
    expect(reveal.face.height).toBe(135);
    expect(reveal.face.bottom + 8).toBeLessThanOrEqual(reveal.pac.top);
    expect(Math.abs(reveal.pac.bottom - reveal.consoleGuidance.top)).toBeLessThanOrEqual(2);
    expect(reveal.pac.bottom).toBeLessThanOrEqual(reveal.dock.top);
    expect(postResponse.face.cardId).toBe(room.ids.rainingRoot);
    expect(postResponse.face.bottom + 8).toBeLessThanOrEqual(postResponse.pac.top);
    expect(Math.abs(postResponse.pac.bottom - postResponse.consoleGuidance.top)).toBeLessThanOrEqual(2);
    expect(postResponse.pac.bottom).toBeLessThanOrEqual(postResponse.dock.top);
    expect(postResponse.h4.visible).toBe(true);
    expect(postResponse.countdown.visible).toBe(true);
    const overlaps = (left, right) => left.left < right.right && left.right > right.left && left.top < right.bottom && left.bottom > right.top;
    expect(overlaps(postResponse.face, postResponse.pac)).toBe(false);
    expect(overlaps(postResponse.h4, postResponse.face)).toBe(false);
    expect(overlaps(postResponse.h4, postResponse.pac)).toBe(false);
    expect(overlaps(postResponse.countdown, postResponse.pac)).toBe(false);
  } finally {
    await page.close();
  }
});
