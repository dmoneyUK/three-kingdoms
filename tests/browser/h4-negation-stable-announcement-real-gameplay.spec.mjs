import { expect, test } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

const API = "http://127.0.0.1:3137";
const evidenceRoot = process.env.H4_EVIDENCE_DIR;
const card = (kind, id, suit = "♠") => ({ id, kind, suit, rank: "7" });

async function seedRoom(request) {
  const prefix = `h4-negation-${Date.now()}`;
  const cards = {
    root: `${prefix}-steal-root`,
    negationA1: `${prefix}-negation-a1`,
    negationA2: `${prefix}-negation-a2`,
    negationB1: `${prefix}-negation-b1`,
    negationB2: `${prefix}-negation-b2`,
  };
  const players = [
    { name: "H4 SIMA YI", role: "Lord", hero: "simayi", hp: 4, maxHp: 4, hand: [card("Negation", cards.negationA1, "♦"), card("Negation", cards.negationA2, "♥")] },
    { name: "H4 XU CHU", role: "Loyalist", hero: "xu-chu", hp: 4, maxHp: 4, hand: [card("Negation", cards.negationB1, "♣"), card("Negation", cards.negationB2, "♠")] },
    { name: "H4 CAO CAO", role: "Rebel", hero: "cao-cao", hp: 4, maxHp: 4, hand: [card("Steal", cards.root)] },
    { name: "H4 XIAHOU DUN", role: "Renegade", hero: "xiahou-dun", hp: 4, maxHp: 4, hand: [card("Attack", `${prefix}-target-hand`)] },
  ];
  const deck = Array.from({ length: 40 }, (_, index) => card(index % 2 ? "Dodge" : "Attack", `${prefix}-deck-${index}`));
  const seeded = await request.post(`${API}/__test/seed-playing-game`, {
    data: { phase: "play", turnSeat: 2, deck, players },
  });
  if (!seeded.ok()) throw new Error(`H4 Negation room seed failed: ${await seeded.text()}`);
  const room = await seeded.json();
  room.players.sort((left, right) => left.seat - right.seat);
  return { ...room, cards };
}

async function openPlayer(page, room, index, viewport) {
  const player = room.players[index];
  await page.setViewportSize(viewport);
  await page.goto(`${API}/api/health`);
  await page.evaluate(({ code, token, name }) => {
    localStorage.setItem("three-realms-session", JSON.stringify({ code, token, name }));
  }, { code: room.code, token: player.token, name: player.name });
  await page.goto(`${API}/`);
  await expect(page.locator(`.local-player-dock[data-player-anchor="${player.id}"]`)).toBeVisible();
  return player;
}

async function view(request, room, index) {
  const response = await request.get(`${API}/api/rooms?code=${room.code}&token=${room.players[index].token}`);
  expect(response.ok()).toBeTruthy();
  return response.json();
}

async function adjustWindowClock(request, room, windowId) {
  const response = await request.post(`${API}/__test/negation-window-clock`, { data: { code: room.code, windowId, mode: "hold" } });
  expect(response.ok()).toBeTruthy();
  expect(await response.json()).toEqual({ adjusted: true });
}

function cardEvent(roomView, cardId) {
  return roomView.timeline.find((event) => event?.type === "card" && event.action === "play" && event.card?.id === cardId) ?? null;
}

async function playSteal(request, room) {
  const response = await request.post(`${API}/api/rooms`, {
    data: { action: "play_card", code: room.code, token: room.players[2].token, cardId: room.cards.root, targetId: room.players[3].id },
  });
  if (!response.ok()) throw new Error(`Steal root play was rejected: ${await response.text()}`);
  const opened = await response.json();
  expect(opened.room.currentAction?.negationWindowId).toBeTruthy();
  const state = await view(request, room, 3);
  const root = cardEvent(state, room.cards.root);
  expect(root?.player).toBe(room.players[2].name);
  expect(state.presentationSnapshot?.reactionChain?.semantics).toBe("PROVEN");
  return root;
}

async function submitNegation(request, room, winnerIndex, cardId) {
  const opened = await view(request, room, winnerIndex);
  const windowId = opened.currentAction?.negationWindowId;
  expect(windowId).toBeTruthy();
  await adjustWindowClock(request, room, windowId);
  const winner = room.players[winnerIndex];
  const submitted = await request.post(`${API}/api/rooms`, {
    data: { action: "respond", code: room.code, token: winner.token, providerId: "negation_card", cardId, context: { windowId } },
  });
  expect(submitted.ok()).toBeTruthy();

  for (let index = 0; index < room.players.length; index += 1) {
    const state = await view(request, room, index);
    expect(state.timeline.some((event) => event?.card?.id === cardId)).toBe(false);
    expect(JSON.stringify(state.presentationSnapshot ?? {})).not.toContain(cardId);
  }

  for (let index = 0; index < room.players.length; index += 1) {
    if (index === winnerIndex) continue;
    const passed = await request.post(`${API}/api/rooms`, {
      data: { action: "decline_response", code: room.code, token: room.players[index].token, context: { windowId } },
    });
    if (!passed.ok()) {
      const status = await view(request, room, index).catch(() => null);
      throw new Error(`${room.players[index].name} could not pass Negation window ${windowId} (HTTP ${passed.status()}): ${await passed.text()}; current action=${JSON.stringify(status?.currentAction ?? null)}`);
    }
  }
  const settled = await view(request, room, 3);
  const event = cardEvent(settled, cardId);
  expect(event?.player).toBe(winner.name);
  return event;
}

async function installSampler(page, rootEventId) {
  await page.evaluate((rootId) => {
    window.__h4NegationFrames = [];
    const rect = (element) => {
      const { left, top, right, bottom, width, height } = element.getBoundingClientRect();
      return { left, top, right, bottom, width, height };
    };
    const intersects = (left, right, top, bottom, other) => left < other.right && right > other.left && top < other.bottom && bottom > other.top;
    const capture = () => {
      const display = document.querySelector(`.public-card-display[data-public-card-root-event-id="${rootId}"]`);
      const announcement = display?.querySelector('[data-public-card-announcement="true"]');
      if (!announcement || announcement.dataset.publicCardAnnouncementPositioned !== "true"
        || getComputedStyle(announcement).visibility !== "visible") return;
      const activeEventId = announcement?.dataset.publicCardAnnouncementEventId;
      const activeCard = activeEventId && display?.querySelector(`[data-public-card-journey-event-id="${activeEventId}"]`);
      if (!display || !announcement || !activeCard) return;
      const announcementRect = rect(announcement);
      const cardRect = rect(activeCard);
      const table = document.querySelector(".play-table");
      const tableRect = table ? rect(table) : null;
      const text = announcement.querySelector("b");
      const range = document.createRange();
      if (text) range.selectNodeContents(text);
      const protectedRects = [...document.querySelectorAll(
        ".opponent-player-card, .player-square, .player-board-status, .visible-countdown, .stage-system-cluster, .public-activity-chip, .local-player-dock, .local-hand-rail, .console-guidance, [data-public-card-copy-anchor-event-id]",
      )].filter((element) => element !== announcement && element !== activeCard
        && element.dataset.publicCardCopyAnchorEventId !== activeEventId)
        .map((element) => ({
          label: typeof element.className === "string" ? element.className : element.tagName,
          eventId: element.dataset.publicCardCopyAnchorEventId ?? null,
          rect: rect(element),
        }))
        .filter(({ rect: obstacle }) => obstacle.width > 0 && obstacle.height > 0
          && intersects(announcementRect.left, announcementRect.right, announcementRect.top, announcementRect.bottom, obstacle));
      const layoutRects = [...document.querySelectorAll(
        ".opponent-player-card[data-player-anchor], .player-square, .player-board-status, .visible-countdown, .stage-system-cluster, .public-activity-chip, .local-player-dock, .local-hand-rail, .console-guidance, [data-public-card-copy-anchor-event-id]",
      )].map((element) => ({
        label: typeof element.className === "string" ? element.className : element.tagName,
        playerId: element.dataset.playerAnchor ?? null,
        eventId: element.dataset.publicCardCopyAnchorEventId ?? null,
        rect: rect(element),
      })).filter(({ rect: obstacle }) => obstacle.width > 0 && obstacle.height > 0);
      const cardProtectedRects = layoutRects.filter(({ eventId, rect: obstacle }) => eventId !== activeEventId
        && intersects(cardRect.left, cardRect.right, cardRect.top, cardRect.bottom, obstacle));
      const row = {
        at: performance.now(),
        viewerId: display.dataset.publicCardViewerId ?? null,
        interactionId: display.dataset.publicCardInteractionId ?? null,
        rootEventId: display.dataset.publicCardRootEventId ?? null,
        eventId: activeEventId ?? null,
        cardId: activeCard.dataset.publicCardJourneyCardId ?? null,
        actorId: activeCard.dataset.publicCardJourneyActorId ?? null,
        phase: activeCard.dataset.publicCardJourneyPhase ?? null,
        announcement: announcementRect,
        card: cardRect,
        centerOffset: tableRect ? (announcementRect.left + announcementRect.right - tableRect.left - tableRect.right) / 2 : null,
        activeCardOverlap: intersects(announcementRect.left, announcementRect.right, announcementRect.top, announcementRect.bottom, cardRect),
        protectedRects,
        layoutRects,
        cardProtectedRects,
        table: tableRect,
        fallback: announcement.dataset.publicCardAnnouncementFallback === "true",
        placement: announcement.dataset.publicCardAnnouncementPlacement ?? null,
        lines: range.getClientRects().length,
        fontSize: Number.parseFloat(text ? getComputedStyle(text).fontSize : "0"),
        text: announcement.textContent?.trim() ?? "",
      };
      const last = window.__h4NegationFrames.at(-1);
      if (!last || last.eventId !== row.eventId || last.phase !== row.phase || performance.now() - last.at >= 24) {
        window.__h4NegationFrames.push(row);
      }
    };
    const sample = () => {
      capture();
      requestAnimationFrame(sample);
    };
    requestAnimationFrame(sample);
  }, rootEventId);
}

async function saveEvidence(page, testInfo, viewerName, label) {
  const image = await page.screenshot({ fullPage: true });
  await testInfo.attach(`${label}-${viewerName}.png`, { body: image, contentType: "image/png" });
  if (evidenceRoot) {
    await mkdir(evidenceRoot, { recursive: true });
    await writeFile(join(evidenceRoot, `${label}-${viewerName}.png`), image);
  }
}

test("H4 keeps the announcement in one safe center band through a four-Negation Worker/D1 chain", async ({ browser, request }, testInfo) => {
  test.setTimeout(240_000);
  const room = await seedRoom(request);
  const viewports = [
    { width: 390, height: 844 },
    { width: 440, height: 894 },
    { width: 480, height: 900 },
    { width: 390, height: 700 },
  ];
  const pages = await Promise.all(viewports.map((viewport) => browser.newPage({ viewport })));
  const errors = pages.map(() => []);
  try {
    const viewers = [];
    for (const [index, page] of pages.entries()) {
      page.on("pageerror", (error) => errors[index].push(`${error.name}: ${error.message}`));
      page.on("console", (message) => {
        if (message.type() === "error") errors[index].push(message.text());
      });
      const player = await openPlayer(page, room, index, viewports[index]);
      viewers.push({ index, page, player, viewport: viewports[index] });
    }

    const rootEvent = await playSteal(request, room);
    for (const viewer of viewers) await installSampler(viewer.page, rootEvent.id);
    const rootDisplaySelector = `.public-card-display[data-public-card-root-event-id="${rootEvent.id}"]`;
    await Promise.all(viewers.map(({ page }) => expect(page.locator(rootDisplaySelector)).toHaveCount(1)));
    await Promise.all(viewers.map(({ page }) => expect(page.locator(`${rootDisplaySelector} [data-public-card-journey-event-id="${rootEvent.id}"]`))
      .toHaveAttribute("data-public-card-journey-phase", "parked", { timeout: 12_000 })));

    const committed = [{ event: rootEvent, cardId: room.cards.root, actorId: room.players[2].id }];
    const negations = [
      { winnerIndex: 0, cardId: room.cards.negationA1 },
      { winnerIndex: 1, cardId: room.cards.negationB1 },
      { winnerIndex: 0, cardId: room.cards.negationA2 },
      { winnerIndex: 1, cardId: room.cards.negationB2 },
    ];
    for (const [ordinal, item] of negations.entries()) {
      const event = await submitNegation(request, room, item.winnerIndex, item.cardId);
      committed.push({ event, cardId: item.cardId, actorId: room.players[item.winnerIndex].id });
      const activeEventSelector = `${rootDisplaySelector} [data-public-card-journey-event-id="${event.id}"]`;
      await Promise.all(viewers.map(async ({ page }) => {
        await expect(page.locator(activeEventSelector)).toBeVisible();
        await expect(page.locator(activeEventSelector)).toHaveAttribute("data-public-card-journey-actor-id", room.players[item.winnerIndex].id);
        await expect(page.locator(`${rootDisplaySelector} [data-public-card-announcement-event-id="${event.id}"]`)).toBeVisible();
        await expect(page.locator(activeEventSelector)).toHaveAttribute("data-public-card-journey-phase", "reveal", { timeout: 10_000 });
      }));
      if (ordinal === 0 || ordinal === negations.length - 1) {
        await Promise.all(viewers.map(({ page }, index) => saveEvidence(page, testInfo, `viewer-${index + 1}`, `h4-negation-${ordinal + 1}-reveal`)));
      }
      await Promise.all(viewers.map(({ page }) => expect(page.locator(activeEventSelector))
        .toHaveAttribute("data-public-card-journey-phase", "parked", { timeout: 15_000 })));
      if (ordinal === 0 || ordinal === negations.length - 1) {
        await Promise.all(viewers.map(({ page }, index) => saveEvidence(page, testInfo, `viewer-${index + 1}`, `h4-negation-${ordinal + 1}-parked`)));
      }
    }

    const geometry = await Promise.all(viewers.map(async ({ page, player, viewport }, index) => ({
      viewerId: player.id,
      viewport,
      frames: await page.evaluate(() => window.__h4NegationFrames),
      errors: errors[index],
    })));
    if (evidenceRoot) {
      await mkdir(evidenceRoot, { recursive: true });
      await writeFile(join(evidenceRoot, "h4-four-negation-announcement-geometry.json"), `${JSON.stringify({ rootEventId: rootEvent.id, viewers: geometry }, null, 2)}\n`);
    }
    console.log(`[H4 Negation geometry diagnostics] ${JSON.stringify(geometry.map(({ viewport, frames }) => ({
      viewport,
      samples: frames.length,
      events: [...new Set(frames.map(({ eventId }) => eventId))],
      topRange: frames.length ? [Math.min(...frames.map(({ announcement }) => announcement.top)), Math.max(...frames.map(({ announcement }) => announcement.top))] : [],
      invalidFrames: frames.filter(({ fallback, lines, fontSize, placement, protectedRects }) => fallback || lines < 1 || lines > 2 || fontSize < 14 || !placement || protectedRects.length)
        .filter((frame, index, invalid) => invalid.findIndex(({ eventId, phase }) => eventId === frame.eventId && phase === frame.phase) === index)
        .map(({ eventId, phase, announcement, lines, fontSize, fallback, placement, protectedRects }) => ({ eventId, phase, announcement, lines, fontSize, fallback, placement, protectedRects })),
      cardCollisionFrames: frames.filter(({ cardProtectedRects }) => cardProtectedRects.length)
        .filter((frame, index, collisions) => collisions.findIndex(({ eventId, phase }) => eventId === frame.eventId && phase === frame.phase) === index)
        .map(({ eventId, phase, card, cardProtectedRects }) => ({ eventId, phase, card, cardProtectedRects })),
    })))}`);
    for (const viewer of geometry) {
      const frames = viewer.frames;
      expect(frames.length).toBeGreaterThan(5);
      expect(new Set(frames.map(({ interactionId }) => interactionId)).size).toBe(1);
      expect(frames.every(({ rootEventId: seenRoot }) => seenRoot === rootEvent.id)).toBe(true);
      expect(new Set(frames.map(({ eventId }) => eventId))).toEqual(new Set(committed.map(({ event }) => event.id)));
      expect(frames.every(({ centerOffset }) => Math.abs(centerOffset ?? Infinity) <= 12)).toBe(true);
      expect(Math.max(...frames.map(({ announcement }) => announcement.top))
        - Math.min(...frames.map(({ announcement }) => announcement.top))).toBeLessThanOrEqual(16);
      expect(frames.every(({ fallback, lines, fontSize, placement }) => !fallback && lines >= 1 && lines <= 2 && fontSize >= 14
        && (placement === "center-band-above" || placement === "center-band-below"))).toBe(true);
      expect(frames.every(({ protectedRects }) => protectedRects.length === 0)).toBe(true);
      expect(frames.filter(({ phase }) => phase !== "move").every(({ activeCardOverlap }) => !activeCardOverlap)).toBe(true);
      expect(viewer.errors).toEqual([]);
    }
    for (const viewer of viewers) {
      await expect(viewer.page.getByText("GAME SCREEN ERROR")).toHaveCount(0);
    }

    const evidence = {
      roomCode: room.code,
      rootEventId: rootEvent.id,
      interactionIds: [...new Set(geometry.flatMap(({ frames }) => frames.map(({ interactionId }) => interactionId)))],
      committed: committed.map(({ event, cardId, actorId }) => ({ eventId: event.id, actorId, cardId })),
      viewers: geometry,
    };
    await testInfo.attach("h4-four-negation-announcement-geometry.json", {
      body: JSON.stringify(evidence, null, 2), contentType: "application/json",
    });
    if (evidenceRoot) {
      await mkdir(evidenceRoot, { recursive: true });
      await writeFile(join(evidenceRoot, "h4-four-negation-announcement-geometry.json"), `${JSON.stringify(evidence, null, 2)}\n`);
    }
    console.log(`[H4 four-Negation chain] ${JSON.stringify({
      rootEventId: rootEvent.id,
      interactionIds: evidence.interactionIds,
      committed: evidence.committed,
      viewers: geometry.map(({ viewport, frames }) => ({
        viewport,
        samples: frames.length,
        events: [...new Set(frames.map(({ eventId }) => eventId))].length,
        topRange: [Math.min(...frames.map(({ announcement }) => announcement.top)), Math.max(...frames.map(({ announcement }) => announcement.top))],
        movingCardOverlaps: frames.filter(({ phase, activeCardOverlap }) => phase === "move" && activeCardOverlap).length,
      })),
    })}`);
  } finally {
    await Promise.all(pages.map((page) => page.close()));
  }
});
