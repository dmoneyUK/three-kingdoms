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

async function seedGroupRoom(request, cardKind, responseKind) {
  const prefix = `h4-group-${cardKind.toLowerCase()}-${Date.now()}`;
  const cards = {
    root: `${prefix}-root`,
    negationSource: `${prefix}-negation-source`,
    negationTarget: `${prefix}-negation-target`,
    privateLosingNegation: `${prefix}-private-losing-negation`,
    responseSecond: `${prefix}-response-second`,
    responseThird: `${prefix}-response-third`,
    judgement: `${prefix}-ganglie-judgement`,
  };
  const players = [
    { name: "H4 GROUP SOURCE", role: "Lord", hero: "liu-bei", hp: 4, maxHp: 4, hand: [card(cardKind, cards.root), card("Negation", cards.negationSource, "♥")] },
    { name: "H4 XIAHOU DUN", role: "Loyalist", hero: "xiahou-dun", hp: 4, maxHp: 4, hand: [card("Negation", cards.negationTarget, "♦")] },
    { name: "H4 GROUP TARGET 2", role: "Rebel", hero: "sun-quan", hp: 4, maxHp: 4, hand: [card("Negation", cards.privateLosingNegation, "♣"), card(responseKind, cards.responseSecond)] },
    { name: "H4 GROUP TARGET 3", role: "Renegade", hero: "zhen-ji", hp: 4, maxHp: 4, hand: [card(responseKind, cards.responseThird)] },
  ];
  const deck = [card("Attack", cards.judgement, "♠"), ...Array.from({ length: 40 }, (_, index) => card(index % 2 ? "Dodge" : "Attack", `${prefix}-deck-${index}`))];
  const seeded = await request.post(`${API}/__test/seed-playing-game`, {
    data: { phase: "play", turnSeat: 0, deck, players },
  });
  if (!seeded.ok()) throw new Error(`H4 ${cardKind} room seed failed: ${await seeded.text()}`);
  const room = await seeded.json();
  room.players.sort((left, right) => left.seat - right.seat);
  return { ...room, cards, cardKind, responseKind };
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

async function playGroupRoot(request, room) {
  const response = await request.post(`${API}/api/rooms`, {
    data: { action: "play_card", code: room.code, token: room.players[0].token, cardId: room.cards.root },
  });
  if (!response.ok()) throw new Error(`${room.cardKind} root play was rejected: ${await response.text()}`);
  const opened = await response.json();
  const openingWindowId = opened.room?.currentAction?.negationWindowId;
  expect(openingWindowId).toBeTruthy();
  await adjustWindowClock(request, room, openingWindowId);
  const state = await view(request, room, 0);
  expect(state.currentAction?.negationWindowId).toBeTruthy();
  const root = cardEvent(state, room.cards.root);
  expect(root?.player).toBe(room.players[0].name);
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

async function passNegationWindow(request, room, windowId) {
  for (const player of room.players) {
    const passed = await request.post(`${API}/api/rooms`, {
      data: { action: "decline_response", code: room.code, token: player.token, context: { windowId } },
    });
    if (!passed.ok()) throw new Error(`${player.name} could not pass Negation window ${windowId}: ${await passed.text()}`);
  }
}

async function passOpenNegationWindows(request, room) {
  for (let guard = 0; guard < 8; guard += 1) {
    const opened = await view(request, room, 0);
    const windowId = opened.currentAction?.negationWindowId;
    if (!windowId) return opened;
    await adjustWindowClock(request, room, windowId);
    await passNegationWindow(request, room, windowId);
  }
  throw new Error("H4 group Negation windows did not settle");
}

async function visibleAnnouncements(page) {
  return page.evaluate(() => [...document.querySelectorAll('[data-public-card-announcement="true"]')]
    .map((element) => {
      const style = getComputedStyle(element);
      const bounds = element.getBoundingClientRect();
      const display = element.closest(".public-card-display");
      const table = document.querySelector(".play-table")?.getBoundingClientRect();
      const text = element.querySelector("b");
      const range = document.createRange();
      if (text) range.selectNodeContents(text);
      return {
        eventId: element.dataset.publicCardAnnouncementEventId ?? null,
        anchorEventId: element.dataset.publicCardCopyAnchorEventId ?? null,
        interactionId: display?.dataset.publicCardInteractionId ?? null,
        rootEventId: display?.dataset.publicCardRootEventId ?? null,
        cardId: display?.dataset.publicCardId ?? null,
        actorId: display?.dataset.publicCardActorId ?? null,
        text: element.textContent?.trim() ?? "",
        left: bounds.left,
        top: bounds.top,
        centerY: (bounds.top + bounds.bottom) / 2,
        right: bounds.right,
        bottom: bounds.bottom,
        centerOffset: table ? (bounds.left + bounds.right - table.left - table.right) / 2 : null,
        width: bounds.width,
        height: bounds.height,
        lines: range.getClientRects().length,
        fontSize: Number.parseFloat(text ? getComputedStyle(text).fontSize : "0"),
        fallback: element.dataset.publicCardAnnouncementFallback === "true",
        placement: element.dataset.publicCardAnnouncementPlacement ?? null,
        positioned: element.dataset.publicCardAnnouncementPositioned === "true",
        narrationPhase: element.dataset.publicNegationPhase ?? null,
        latestCommittedEventId: element.dataset.publicNegationLatestEventId ?? null,
        checkpointId: element.dataset.publicNegationCheckpointId ?? null,
        rootEffectState: element.dataset.publicNegationEffectState ?? null,
        phaseNotice: element.dataset.publicCardPhaseNotice ?? null,
        accessibleLabel: element.querySelector("b")?.getAttribute("aria-label") ?? null,
        visible: style.visibility === "visible" && style.display !== "none" && bounds.width > 0 && bounds.height > 0,
      };
    })
    .filter((announcement) => announcement.visible && announcement.positioned));
}

async function announcementDiagnostics(page) {
  return page.evaluate(() => {
    const rect = (element) => {
      const bounds = element.getBoundingClientRect();
      return { left: bounds.left, top: bounds.top, right: bounds.right, bottom: bounds.bottom, width: bounds.width, height: bounds.height };
    };
    const table = document.querySelector(".play-table");
    const obstacles = [...document.querySelectorAll(".opponent-player-card, .player-square, .player-board-status, .visible-countdown, .stage-system-cluster, .public-activity-chip, .local-player-dock, .local-hand-rail, .console-guidance, .private-draw-content, [data-public-card-copy-anchor-event-id]")]
      .map((element) => ({ label: typeof element.className === "string" ? element.className : element.tagName, rect: rect(element) }))
      .filter(({ rect: bounds }) => bounds.width > 0 && bounds.height > 0);
    return [...document.querySelectorAll('[data-public-card-announcement="true"]')].map((element) => {
    const bounds = element.getBoundingClientRect();
    const display = element.closest(".public-card-display");
    return {
      eventId: element.dataset.publicCardAnnouncementEventId ?? null,
      text: element.textContent?.trim() ?? "",
      visible: getComputedStyle(element).visibility === "visible",
      positioned: element.dataset.publicCardAnnouncementPositioned === "true",
      fallback: element.dataset.publicCardAnnouncementFallback === "true",
      left: bounds.left,
      top: bounds.top,
      width: bounds.width,
      height: bounds.height,
      displayLayoutPending: display?.dataset.publicCardLayoutPending ?? null,
      table: table ? rect(table) : null,
      viewport: { width: document.documentElement.clientWidth, height: document.documentElement.clientHeight },
      obstacles,
      rootCards: [...(display?.querySelectorAll("[data-public-card-journey-event-id]") ?? [])].map((card) => ({
        eventId: card.dataset.publicCardJourneyEventId,
        phase: card.dataset.publicCardJourneyPhase,
        rect: (() => {
          const rect = card.getBoundingClientRect();
          return { left: rect.left, top: rect.top, width: rect.width, height: rect.height };
        })(),
        target: {
          left: card.dataset.publicCardJourneyTargetLeft,
          top: card.dataset.publicCardJourneyTargetTop,
          width: card.dataset.publicCardJourneyTargetWidth,
          height: card.dataset.publicCardJourneyTargetHeight,
        },
      })),
    };
    });
  });
}

async function h4QuickDiagnostics(page) {
  return page.evaluate(() => {
    const rect = (element) => {
      const bounds = element.getBoundingClientRect();
      return { left: bounds.left, top: bounds.top, right: bounds.right, bottom: bounds.bottom, width: bounds.width, height: bounds.height };
    };
    const display = document.querySelector(".public-card-display");
    const obstacleSelectors = [
      ".opponent-player-card", ".player-square", ".player-board-status", ".visible-countdown",
      ".stage-system-cluster", ".public-activity-chip", ".harvest-choice-panel", ".local-player-dock",
      ".local-hand-rail", ".console-guidance", ".decision-status", ".private-draw-content",
    ];
    return {
      viewport: { width: innerWidth, height: innerHeight },
      table: (() => { const element = document.querySelector(".play-table"); return element ? rect(element) : null; })(),
      obstacles: obstacleSelectors.flatMap((selector) => [...document.querySelectorAll(selector)].map((element) => ({
        selector,
        className: typeof element.className === "string" ? element.className : "",
        rect: rect(element),
      }))),
      display: display ? {
        root: display.dataset.publicCardRootEventId,
        event: display.dataset.publicCardEventId,
        kind: display.dataset.publicCardRendererKind,
        motion: display.dataset.publicCardMotion,
        pending: display.dataset.publicCardLayoutPending,
        cards: [...display.querySelectorAll("[data-public-card-journey-event-id]")].map((card) => ({
          event: card.dataset.publicCardJourneyEventId,
          phase: card.dataset.publicCardJourneyPhase,
          rect: rect(card),
        })),
        announcements: [...display.querySelectorAll('[data-public-card-announcement="true"]')].map((copy) => ({
          event: copy.dataset.publicCardAnnouncementEventId,
          visible: getComputedStyle(copy).visibility === "visible",
          positioned: copy.dataset.publicCardAnnouncementPositioned,
          fallback: copy.dataset.publicCardAnnouncementFallback,
          rect: rect(copy),
          style: { left: copy.style.left, top: copy.style.top, width: copy.style.width, visibility: copy.style.visibility },
          layout: Object.fromEntries(["publicCardAnnouncementCompact", "publicCardAnnouncementTightCopy", "publicCardAnnouncementWidth", "publicCardAnnouncementLines", "publicCardAnnouncementPlacement"].map((key) => [key, copy.dataset[key]])),
          text: copy.textContent?.trim(),
        })),
      } : null,
      activity: [...document.querySelectorAll(".public-activity-chip")].map((element) => rect(element)),
    };
  });
}

async function waitForSharedAnnouncement(viewers, expectedEventId = null) {
  let latest = [];
  try {
    await expect.poll(async () => {
      latest = await Promise.all(viewers.map(({ page }) => visibleAnnouncements(page)));
      return latest.every((items) => items.length === 1
        && (!expectedEventId || items[0].eventId === expectedEventId)
        && JSON.stringify(items.map(({ eventId, anchorEventId, interactionId, rootEventId, cardId, actorId, text }) => ({ eventId, anchorEventId, interactionId, rootEventId, cardId, actorId, text })))
          === JSON.stringify(latest[0]?.map(({ eventId, anchorEventId, interactionId, rootEventId, cardId, actorId, text }) => ({ eventId, anchorEventId, interactionId, rootEventId, cardId, actorId, text }))));
    }, { timeout: 20_000 }).toBe(true);
  } catch (error) {
    const diagnostics = await Promise.all(viewers.map(({ page }) => announcementDiagnostics(page)));
    console.log(`[H4 shared announcement mismatch] ${JSON.stringify({ expectedEventId, viewers: latest, diagnostics })}`);
    throw error;
  }
  return latest;
}

async function sharedPublicActivity(viewers) {
  return Promise.all(viewers.map(({ page }) => page.locator("[data-public-activity-chip]").evaluate((chip) => {
    const rect = chip.getBoundingClientRect();
    const tableRect = chip.closest(".play-table")?.getBoundingClientRect();
    return {
      viewerId: document.querySelector(".local-player-dock")?.getAttribute("data-player-anchor") ?? null,
      kind: chip.dataset.publicActivityKind,
      text: chip.getAttribute("aria-label"),
      visible: getComputedStyle(chip).visibility === "visible",
      layout: chip.dataset.publicActivityLayout ?? null,
      rect: { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom, width: rect.width, height: rect.height },
      table: tableRect ? { left: tableRect.left, top: tableRect.top, right: tableRect.right, bottom: tableRect.bottom } : null,
    };
  })));
}

async function expectSharedPublicActivity(viewers, expected) {
  let latest = [];
  try {
    await expect.poll(async () => {
      latest = await sharedPublicActivity(viewers);
      return latest.map(({ kind, text, visible }) => ({ kind, text, visible }));
    }, { timeout: 12_000 }).toEqual(Array(viewers.length).fill({ ...expected, visible: true }));
  } catch (error) {
    console.log(`[H4 public activity placement mismatch] ${JSON.stringify({ expected, viewers: latest })}`);
    throw error;
  }
}

async function expectSharedPublicActivityIdentity(viewers, expected) {
  await expect.poll(async () => {
    const current = await sharedPublicActivity(viewers);
    return current.map(({ kind, text }) => ({ kind, text }));
  }, { timeout: 12_000 }).toEqual(Array(viewers.length).fill(expected));
}

async function expectGroupTargetNegationStage(viewers, { rootEventId, checkpointId, targetName, previousTargetName, cardName }) {
  let shared = [];
  const expectedStage = {
    rootEventId,
    eventId: rootEventId,
    checkpointId,
    latestCommittedEventId: null,
    narrationPhase: "WINDOW_OPEN",
    rootEffectState: "ACTIVE",
  };
  try {
    await expect.poll(async () => {
      shared = await Promise.all(viewers.map(({ page }) => visibleAnnouncements(page)));
      return shared.map((items) => items.length === 1 ? {
        rootEventId: items[0].rootEventId,
        eventId: items[0].eventId,
        checkpointId: items[0].checkpointId,
        latestCommittedEventId: items[0].latestCommittedEventId,
        narrationPhase: items[0].narrationPhase,
        rootEffectState: items[0].rootEffectState,
      } : null);
    }, { timeout: 20_000 }).toEqual(Array(viewers.length).fill(expectedStage));
  } catch (error) {
    const layout = await Promise.all(viewers.map(({ page }) => announcementDiagnostics(page)));
    console.info(`[H4 current group target mismatch] ${JSON.stringify({ expected: expectedStage, viewers: shared.map((items) => items.map(({ eventId, checkpointId, latestCommittedEventId, narrationPhase, rootEffectState, text }) => ({ eventId, checkpointId, latestCommittedEventId, narrationPhase, rootEffectState, text }))), layout })}`);
    throw error;
  }
  expect(shared.every((items) => items.length === 1)).toBe(true);
  const narrationMatches = shared.every((items) => {
    const { text, accessibleLabel = "" } = items[0];
    return text.includes(cardName)
      && /Negation open/i.test(text)
      && (text.includes(targetName) || accessibleLabel.includes(targetName))
      && /active/i.test(accessibleLabel)
      && !text.includes(previousTargetName)
      && !accessibleLabel.includes(previousTargetName);
  });
  if (!narrationMatches) {
    console.info(`[H4 target narration content mismatch] ${JSON.stringify({ targetName, previousTargetName, cardName, shared: shared.map((items) => items[0]) })}`);
  }
  expect(narrationMatches).toBe(true);
  expect(new Set(shared.map((items) => `${items[0].checkpointId}:${items[0].rootEffectState}:${items[0].text}`)).size).toBe(1);
  return shared;
}

async function expectSharedCounterNarration(viewers, { eventId, checkpointId, rootLabel, targetName }) {
  let observed = [];
  try {
    await expect.poll(async () => {
      observed = await Promise.all(viewers.map(async ({ page }) => {
        const items = await visibleAnnouncements(page);
        if (items.length !== 1) return null;
        const item = items[0];
        return {
          eventId: item.eventId,
          checkpointId: item.checkpointId,
          latestCommittedEventId: item.latestCommittedEventId,
          narrationPhase: item.narrationPhase,
          rootEffectState: item.rootEffectState,
          accessibleLabel: item.accessibleLabel,
          text: item.text,
        };
      }));
      const targetOrdinal = targetName.match(/\bTARGET\s+(\d+)\b/i)?.[1];
      return observed.map((item) => item && ({
        eventId: item.eventId,
        checkpointId: item.checkpointId,
        latestCommittedEventId: item.latestCommittedEventId,
        narrationPhase: item.narrationPhase,
        rootEffectState: item.rootEffectState,
        targetAccessible: item.accessibleLabel.includes(targetName),
        responseOpenAccessible: item.accessibleLabel.includes("response still open"),
        text: item.text.includes("Negation") && item.text.includes(rootLabel)
          && item.text.includes("BLOCKED")
          && (item.text.includes(targetName) || Boolean(targetOrdinal && (item.text.includes(`Target ${targetOrdinal}`) || item.text.includes(`T${targetOrdinal}`))))
          ? "counter-caption-present" : item.text,
      }));
    }, { timeout: 20_000 }).toEqual(Array(viewers.length).fill({
      eventId,
      checkpointId,
      latestCommittedEventId: eventId,
      narrationPhase: "WINDOW_OPEN",
      rootEffectState: "BLOCKED",
      targetAccessible: true,
      responseOpenAccessible: true,
      text: "counter-caption-present",
    }));
    expect(new Set(observed.map((item) => item?.accessibleLabel)).size).toBe(1);
    expect(observed.every((item) => item?.accessibleLabel.includes(targetName))).toBe(true);
  } catch (error) {
    const debug = await Promise.all(viewers.map(async ({ page, errors = [] }) => ({ ...(await page.evaluate(() => ({
      viewport: { width: innerWidth, height: innerHeight },
      rendered: [...document.querySelectorAll(".public-card-display")].map((element) => ({
        root: element.dataset.publicCardRootEventId ?? null,
        kind: element.dataset.publicCardRendererKind ?? null,
        className: element.className,
        announcementCount: element.querySelectorAll('[data-public-card-announcement="true"]').length,
      })),
    }))), errors })));
    const layout = await Promise.all(viewers.map(({ page }) => announcementDiagnostics(page)));
    const visible = await Promise.all(viewers.map(({ page }) => visibleAnnouncements(page)));
    console.info(`[H4 counter narration mismatch] ${JSON.stringify({ expected: { eventId, checkpointId, rootLabel, targetName }, observed, visible, debug, layout })}`);
    throw error;
  }
}

async function expectCurrentGroupStageNarration(viewers, { state, rootEventId, cardName, players }) {
  const snapshot = state.presentationSnapshot;
  const chain = snapshot?.reactionChain;
  const scope = chain?.groupTargetEffectScope;
  const depth = chain?.nodes.length ?? 0;
  const nodeEventLinks = chain?.publicNodeEventLinks ?? [];
  const latestEventId = depth > 0 ? nodeEventLinks.at(-1)?.eventId ?? null : null;
  let shared;
  if (scope) {
    if (depth > 0) {
      expect(nodeEventLinks).toHaveLength(depth);
      expect(latestEventId).toBeTruthy();
    }
    const expectedEventId = latestEventId ?? rootEventId;
    const expectedStage = Array.from({ length: viewers.length }, () => ({
      rootEventId,
      eventId: expectedEventId,
      checkpointId: scope.checkpointId,
      latestCommittedEventId: latestEventId,
      rootEffectState: scope.effectState,
      narrationPhase: "WINDOW_OPEN",
    }));
    try {
      await expect.poll(async () => Promise.all(viewers.map(async ({ page }) => {
        const [copy] = await visibleAnnouncements(page);
        return copy ? {
          rootEventId: copy.rootEventId,
          eventId: copy.eventId,
          checkpointId: copy.checkpointId,
          latestCommittedEventId: copy.latestCommittedEventId,
          rootEffectState: copy.rootEffectState,
          narrationPhase: copy.narrationPhase,
        } : null;
      })), { timeout: 20_000 }).toEqual(expectedStage);
    } catch (error) {
      const actual = await Promise.all(viewers.map(({ page }) => visibleAnnouncements(page)));
      const layout = await Promise.all(viewers.map(({ page }) => announcementDiagnostics(page)));
      console.info(`[H4 current group stage mismatch] ${JSON.stringify({ expectedStage, snapshot: {
        stage: snapshot?.interaction?.stage,
        currentParticipantId: snapshot?.groupParticipantProgress?.currentParticipantId,
        scope,
        depth,
        nodeEventLinks,
        nodes: chain?.nodes,
      }, actual: actual.map((items) => items.map(({ eventId, checkpointId, latestCommittedEventId, rootEffectState, narrationPhase, text, accessibleLabel }) => ({
        eventId, checkpointId, latestCommittedEventId, rootEffectState, narrationPhase, text, accessibleLabel,
      }))), layout })}`);
      throw error;
    }
    shared = await Promise.all(viewers.map(({ page }) => visibleAnnouncements(page)));
  } else {
    shared = await waitForSharedAnnouncement(viewers);
  }
  const copies = shared.map((items) => items[0]);
  // Compact visible copy is viewport-specific; the authoritative public stage
  // and complete accessible narration must remain identical across viewers.
  expect(new Set(copies.map((copy) => copy.accessibleLabel)).size).toBe(1);
  expect(copies.every((copy) => copy.rootEventId === rootEventId && copy.text.includes(cardName))).toBe(true);

  if (!scope) {
    if (snapshot?.interaction?.stage !== "NEGATION") {
      expect(copies.every((copy) => !/Negation (?:open|available|response open)/i.test(copy.text))).toBe(true);
    }
    return shared;
  }

  expect(scope.semantics).toBe("PROVEN");
  expect(snapshot?.interaction).toMatchObject({ semantics: "PROVEN", stage: "NEGATION", checkpointId: scope.checkpointId });
  expect(snapshot?.groupParticipantProgress?.currentParticipantId).toBe(scope.targetId);
  expect(copies.every((copy) => copy.checkpointId === scope.checkpointId
    && copy.rootEffectState === scope.effectState
    && copy.narrationPhase === "WINDOW_OPEN"
    && copy.latestCommittedEventId === latestEventId)).toBe(true);
  const targetIds = snapshot?.groupParticipantProgress?.rootCardProof?.targetIds ?? [];
  const targetIndex = targetIds.indexOf(scope.targetId);
  const target = players.find((player) => player.id === scope.targetId);
  expect(targetIndex).toBeGreaterThanOrEqual(0);
  expect(target?.name).toBeTruthy();

  if (depth === 0) {
    expect(copies.every((copy) => copy.eventId === rootEventId
      && copy.text === `${cardName} · Target ${targetIndex + 1} · Negation open`
      && copy.accessibleLabel.includes(target.name))).toBe(true);
    return shared;
  }

  const latestNode = chain.nodes.at(-1);
  const actorName = players.find((player) => player.id === latestNode?.actorId)?.name;
  const targetTokenPattern = new RegExp(`\\b(?:T|Target\\s+)${targetIndex + 1}\\b`, "i");
  expect(latestEventId).toBeTruthy();
  expect(actorName).toBeTruthy();
  const narrationChecks = copies.map((copy) => ({
    eventId: copy.eventId === latestEventId,
    text: copy.text.includes("Negation") && copy.text.includes(cardName)
      && copy.text.toLowerCase().includes(scope.effectState.toLowerCase())
      && (copy.text.includes(target.name) || targetTokenPattern.test(copy.text)),
    actor: copy.accessibleLabel.includes(actorName),
    counter: /counters/i.test(copy.accessibleLabel),
    target: copy.accessibleLabel.includes(target.name),
    effect: copy.accessibleLabel.includes(scope.effectState),
    open: copy.accessibleLabel.includes("response still open"),
    accessibleLabel: copy.accessibleLabel,
    visibleText: copy.text,
  }));
  expect(narrationChecks.every(({ eventId, text, actor, counter, target: hasTarget, effect, open }) => eventId
    && text && actor && counter && hasTarget && effect && open), JSON.stringify({ depth, scope, actorName, target: target.name, narrationChecks })).toBe(true);
  return shared;
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
    const visibleAnnouncements = [...document.querySelectorAll('[data-public-card-announcement="true"]')]
      .filter((element) => element.dataset.publicCardAnnouncementPositioned === "true"
        && getComputedStyle(element).visibility === "visible"
        && element.getBoundingClientRect().width > 0
        && element.getBoundingClientRect().height > 0);
      const activeEventId = announcement?.dataset.publicCardAnnouncementEventId;
      const activeCard = (activeEventId && display?.querySelector(`[data-public-card-journey-event-id="${activeEventId}"]`))
        ?? display?.querySelector(`[data-public-card-journey-event-id="${rootId}"]`);
      if (!display || !announcement || !activeCard) return;
      const announcementRect = rect(announcement);
      const cardRect = rect(activeCard);
      const table = document.querySelector(".play-table");
      const tableRect = table ? rect(table) : null;
      const text = announcement.querySelector("b");
      const range = document.createRange();
      if (text) range.selectNodeContents(text);
      const frame = getComputedStyle(announcement);
      const physicalEventId = activeCard.dataset.publicCardJourneyEventId;
      const protectedRects = [...document.querySelectorAll(
        ".opponent-player-card, .player-square, .player-board-status, .visible-countdown, .stage-system-cluster, .public-activity-chip, .local-player-dock, .local-hand-rail, .console-guidance, .private-draw-content, [data-public-card-copy-anchor-event-id]",
      )].filter((element) => element !== announcement && element !== activeCard
        && element.dataset.publicCardCopyAnchorEventId !== physicalEventId)
        .map((element) => ({
          label: typeof element.className === "string" ? element.className : element.tagName,
          eventId: element.dataset.publicCardCopyAnchorEventId ?? null,
          rect: rect(element),
        }))
        .filter(({ rect: obstacle }) => obstacle.width > 0 && obstacle.height > 0
          && intersects(announcementRect.left, announcementRect.right, announcementRect.top, announcementRect.bottom, obstacle));
      const layoutRects = [...document.querySelectorAll(
        ".opponent-player-card[data-player-anchor], .player-square, .player-board-status, .visible-countdown, .stage-system-cluster, .public-activity-chip, .local-player-dock, .local-hand-rail, .console-guidance, .private-draw-content, [data-public-card-copy-anchor-event-id]",
      )].map((element) => ({
        label: typeof element.className === "string" ? element.className : element.tagName,
        playerId: element.dataset.playerAnchor ?? null,
        eventId: element.dataset.publicCardCopyAnchorEventId ?? null,
        rect: rect(element),
      })).filter(({ rect: obstacle }) => obstacle.width > 0 && obstacle.height > 0);
      const cardProtectedRects = layoutRects.filter(({ eventId, rect: obstacle }) => eventId !== physicalEventId
        && intersects(cardRect.left, cardRect.right, cardRect.top, cardRect.bottom, obstacle));
      const row = {
        at: performance.now(),
        viewerId: display.dataset.publicCardViewerId ?? null,
        interactionId: display.dataset.publicCardInteractionId ?? null,
        rootEventId: display.dataset.publicCardRootEventId ?? null,
        eventId: activeEventId ?? null,
        copyKey: announcement.dataset.publicCardAnnouncementCopyKey ?? null,
        width: announcementRect.width,
        compact: announcement.dataset.publicCardAnnouncementCompact === "true",
        stability: announcement.dataset.publicCardAnnouncementStability ?? null,
        cardId: activeCard.dataset.publicCardJourneyCardId ?? null,
        actorId: activeCard.dataset.publicCardJourneyActorId ?? null,
        phase: activeCard.dataset.publicCardJourneyPhase ?? null,
        announcement: announcementRect,
        centerY: (announcementRect.top + announcementRect.bottom) / 2,
        card: cardRect,
        centerOffset: tableRect ? (announcementRect.left + announcementRect.right - tableRect.left - tableRect.right) / 2 : null,
        activeCardOverlap: intersects(announcementRect.left, announcementRect.right, announcementRect.top, announcementRect.bottom, cardRect),
        protectedRects,
        layoutRects,
        cardProtectedRects,
        table: tableRect,
        fallback: announcement.dataset.publicCardAnnouncementFallback === "true",
        placement: announcement.dataset.publicCardAnnouncementPlacement ?? null,
        visibleAnnouncementCount: visibleAnnouncements.length,
        visibleAnnouncementEventIds: visibleAnnouncements.map((element) => element.dataset.publicCardAnnouncementEventId ?? null),
        visibleAnnouncementTexts: visibleAnnouncements.map((element) => element.textContent?.trim() ?? ""),
        lines: range.getClientRects().length,
        fontSize: Number.parseFloat(text ? getComputedStyle(text).fontSize : "0"),
        frame: {
          paddingTop: Number.parseFloat(frame.paddingTop),
          paddingRight: Number.parseFloat(frame.paddingRight),
          paddingBottom: Number.parseFloat(frame.paddingBottom),
          paddingLeft: Number.parseFloat(frame.paddingLeft),
          borderColor: frame.borderTopColor,
          borderWidth: Number.parseFloat(frame.borderTopWidth),
          backgroundColor: frame.backgroundColor,
          boxShadow: frame.boxShadow,
        },
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

test("U13-F styles shared Group announcements through Negation across four mobile viewers", async ({ browser, request }, testInfo) => {
  test.setTimeout(180_000);
  const room = await seedGroupRoom(request, "RainingArrows", "Dodge");
  const viewports = [
    { width: 390, height: 844 },
    { width: 440, height: 894 },
    { width: 480, height: 900 },
    { width: 390, height: 700 },
  ];
  const pages = await Promise.all(viewports.map((viewport) => browser.newPage({ viewport })));
  try {
    const viewers = [];
    for (const [index, page] of pages.entries()) {
      const player = await openPlayer(page, room, index, viewports[index]);
      viewers.push({ index, page, player, viewport: viewports[index] });
    }
    const rootEvent = await playGroupRoot(request, room);
    for (const viewer of viewers) await installSampler(viewer.page, rootEvent.id);
    const displaySelector = `.public-card-display[data-public-card-root-event-id="${rootEvent.id}"]`;
    const journeySelector = `${displaySelector} [data-public-card-journey-event-id="${rootEvent.id}"]`;
    await Promise.all(viewers.map(({ page }) => expect(page.locator(displaySelector)).toHaveCount(1)));
    await expectSharedPublicActivity(viewers, { kind: "negation", text: "Waiting for Negation responses" });
    const announcements = await waitForSharedAnnouncement(viewers, rootEvent.id);
    expect(new Set(announcements.map((items) => items[0].text)).size).toBe(1);
    expect(announcements.every((items) => items[0].text.includes("Raining Arrows"))).toBe(true);
    expect(announcements.every((items) => items[0].cardId === room.cards.root && items[0].actorId === room.players[0].id)).toBe(true);
    await Promise.all(viewers.map(({ page }, index) => saveEvidence(page, testInfo, `viewer-${index + 1}`, "u13-f-group-root")));
    await Promise.all(viewers.map(({ page }) => expect(page.locator(journeySelector))
      .toHaveAttribute("data-public-card-journey-phase", "parked", { timeout: 15_000 })));

    const negationEvents = [];
    for (const [winnerIndex, cardId] of [[0, room.cards.negationSource], [1, room.cards.negationTarget]]) {
      const event = await submitNegation(request, room, winnerIndex, cardId);
      negationEvents.push(event);
      // Committing a Negation opens the next shared counter window. Freeze that
      // new server-owned window before asynchronous browser polling can expire
      // it, so all four viewers are measured against the same live checkpoint.
      const currentStage = await view(request, room, winnerIndex);
      const nextWindowId = currentStage.currentAction?.negationWindowId;
      expect(nextWindowId).toBeTruthy();
      await adjustWindowClock(request, room, nextWindowId);
      const negationJourneySelector = `${displaySelector} [data-public-card-journey-event-id="${event.id}"]`;
      await Promise.all(viewers.map(({ page }) => expect(page.locator(negationJourneySelector))
        .toHaveAttribute("data-public-card-journey-phase", "reveal", { timeout: 12_000 })));
      // H4 must follow the new server-proven participant checkpoint while the
      // authentic Negation CardFace travels through shared physical history.
      await expectCurrentGroupStageNarration(viewers, {
        state: currentStage,
        rootEventId: rootEvent.id,
        cardName: "Raining Arrows",
        players: room.players,
      });
      await Promise.all(viewers.map(({ page }) => expect(page.locator(negationJourneySelector))
        .toHaveAttribute("data-public-card-journey-phase", "parked", { timeout: 15_000 })));
    }
    await passOpenNegationWindows(request, room);
    await expectSharedPublicActivity(viewers, { kind: "response", text: `Waiting for ${room.players[1].name} · Raining Arrows` });
    const resumedRootAnnouncements = await waitForSharedAnnouncement(viewers, rootEvent.id);
    expect(resumedRootAnnouncements.every((items) => items[0].rootEventId === rootEvent.id
      && items[0].text.includes("Raining Arrows")
      && !/Negation (?:open|available|response open)/i.test(items[0].text)
      && !/Negation (?:open|available|response open)/i.test(items[0].accessibleLabel))).toBe(true);
    expect(new Set(resumedRootAnnouncements.map((items) => items[0].accessibleLabel)).size).toBe(1);

    const geometry = await Promise.all(viewers.map(async ({ page, player, viewport }) => ({
      playerId: player.id,
      viewport,
      frames: await page.evaluate(() => window.__h4NegationFrames),
    })));
    for (const viewer of geometry) {
      const frames = viewer.frames;
      expect(frames.length).toBeGreaterThan(1);
      const allowedCaptionEventIds = new Set([rootEvent.id, ...negationEvents.map(({ id }) => id)]);
      const invalidFrames = frames.filter(({ eventId, phase, centerOffset, fallback, lines, fontSize, protectedRects, activeCardOverlap, frame }) =>
        !allowedCaptionEventIds.has(eventId)
        || Math.abs(centerOffset ?? Infinity) > 12
        || fallback
        || lines < 1 || lines > 2 || fontSize < 14
        || protectedRects.length > 0
        || phase !== "move" && activeCardOverlap
        || frame.paddingTop + frame.borderWidth < 6 || frame.paddingTop + frame.borderWidth > 10
        || frame.paddingBottom + frame.borderWidth < 6 || frame.paddingBottom + frame.borderWidth > 10
        || frame.paddingLeft + frame.borderWidth < 6 || frame.paddingLeft + frame.borderWidth > 10
        || frame.borderWidth !== 1
        || !/217, 193, 127/.test(frame.borderColor)
        || !/17, 20, 15/.test(frame.backgroundColor)
        || !frame.boxShadow.includes("inset"));
      expect(invalidFrames, `${JSON.stringify({ viewport: viewer.viewport, invalidFrames: invalidFrames.slice(0, 3) })}`)
        .toEqual([]);
      const centerSummary = [...new Map(frames.map((frame) => [`${frame.eventId}|${frame.phase}|${frame.centerY}|${frame.text}`,
        { eventId: frame.eventId, phase: frame.phase, centerY: frame.centerY, announcement: frame.announcement, card: frame.card, lines: frame.lines, text: frame.text }])).values()];
      expect(Math.max(...frames.map(({ centerY }) => centerY))
        - Math.min(...frames.map(({ centerY }) => centerY)),
      JSON.stringify({ viewport: viewer.viewport, centerSummary })
      ).toBeLessThanOrEqual(16);
    }
    await testInfo.attach("u13-f-group-root-geometry.json", {
      body: JSON.stringify(geometry.map(({ playerId, viewport, frames }) => ({
        playerId,
        viewport,
        frames: frames.map(({ eventId, phase, announcement, centerY, centerOffset, lines, text, frame }) => ({
          eventId, phase, announcement, centerY, centerOffset, lines, text, frame,
        })),
      })), null, 2),
      contentType: "application/json",
    });
  } finally {
    await Promise.all(pages.map((page) => page.close()));
  }
});

test("H4 keeps the announcement in one safe center band through a four-Negation Worker/D1 chain", async ({ browser, request }, testInfo) => {
  test.setTimeout(240_000);
  const room = await seedRoom(request);
  const viewports = [
    { width: 390, height: 844 },
    { width: 440, height: 766 },
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
        await expect(page.locator(activeEventSelector)).toHaveAttribute("data-public-card-journey-phase", "reveal", { timeout: 10_000 });
      }));
      try {
        await Promise.all(viewers.map(async ({ page }) => {
          await expect(page.locator(`${rootDisplaySelector} [data-public-card-announcement-event-id="${event.id}"]`)).toBeVisible();
        }));
      } catch (error) {
        const diagnostics = await Promise.all(viewers.map(({ page }) => h4QuickDiagnostics(page)));
        console.info(`[H4 single-target Negation announcement missing] ${JSON.stringify({ eventId: event.id, rootEventId: rootEvent.id, diagnostics })}`);
        throw error;
      }
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
      widths: [...new Set(frames.map(({ width }) => Math.round(width)))],
      widthTransitions: frames.slice(1).filter((frame, index) => Math.round(frame.width) !== Math.round(frames[index].width)).length,
      compactModes: [...new Set(frames.map(({ compact }) => compact))],
      copyKeys: [...new Set(frames.map(({ copyKey }) => copyKey))],
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
      expect(Math.max(...frames.map(({ centerY }) => centerY))
        - Math.min(...frames.map(({ centerY }) => centerY)), JSON.stringify({ viewport: viewer.viewport }))
        .toBeLessThanOrEqual(16);
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

for (const { cardKind, responseKind, viewports } of [
  {
    cardKind: "BarbarianInvasion",
    responseKind: "Attack",
    viewports: [
      { width: 390, height: 844 },
      { width: 440, height: 766 },
      { width: 440, height: 894 },
      { width: 390, height: 700 },
    ],
  },
  {
    cardKind: "RainingArrows",
    responseKind: "Dodge",
    viewports: [
      { width: 390, height: 844 },
      { width: 440, height: 894 },
      { width: 480, height: 900 },
      { width: 390, height: 700 },
    ],
  },
]) {
  test(`H4 stays shared and stage-current through four-client ${cardKind} Group resolution`, async ({ browser, request }, testInfo) => {
    test.setTimeout(360_000);
    const room = await seedGroupRoom(request, cardKind, responseKind);
    const pages = await Promise.all(viewports.map((viewport) => browser.newPage({ viewport })));
    const errors = pages.map(() => []);
    const failedResponses = pages.map(() => []);
    const responseReads = pages.map(() => []);
    try {
      const viewers = [];
      for (const [index, page] of pages.entries()) {
        page.on("pageerror", (error) => errors[index].push(`${error.name}: ${error.message}`));
        page.on("console", (message) => {
          if (message.type() === "error") errors[index].push(message.text());
        });
        page.on("response", (response) => {
          if (response.status() >= 400) {
            responseReads[index].push((async () => {
              const url = new URL(response.url());
              const requestData = response.request().postDataJSON() ?? {};
              const body = await response.json().catch(() => ({}));
              failedResponses[index].push({
                status: response.status(), method: response.request().method(), path: url.pathname,
                action: requestData.action ?? null, providerId: requestData.providerId ?? null,
                error: body.error ?? null, stale: body.stale ?? null,
              });
            })());
          }
        });
        const player = await openPlayer(page, room, index, viewports[index]);
        viewers.push({ index, page, player, viewport: viewports[index], errors: errors[index] });
      }

      const rootEvent = await playGroupRoot(request, room);
      for (const viewer of viewers) await installSampler(viewer.page, rootEvent.id);
      const rootDisplaySelector = `.public-card-display[data-public-card-root-event-id="${rootEvent.id}"]`;
      const rootJourneySelector = `${rootDisplaySelector} [data-public-card-journey-event-id="${rootEvent.id}"]`;
      await Promise.all(viewers.map(({ page }) => expect(page.locator(rootDisplaySelector)).toHaveCount(1)));
      await Promise.all(viewers.map(({ page }) => expect(page.locator(rootJourneySelector))
        .toHaveAttribute("data-public-card-journey-phase", "reveal", { timeout: 12_000 })));
      await Promise.all(viewers.map(({ page }) => expect(page.locator(rootJourneySelector))
        .toHaveAttribute("data-public-card-journey-actor-id", room.players[0].id)));
      const rootAnnouncements = await waitForSharedAnnouncement(viewers, rootEvent.id);
      expect(rootAnnouncements.every((items) => items[0].text.includes(cardKind === "BarbarianInvasion" ? "Barbarian Invasion" : "Raining Arrows"))).toBe(true);
      expect(rootAnnouncements.every((items) => items[0].cardId === room.cards.root && items[0].actorId === room.players[0].id)).toBe(true);
      await Promise.all(viewers.map(({ page }, index) => saveEvidence(page, testInfo, `viewer-${index + 1}`, `${cardKind.toLowerCase()}-root-reveal`)));
      await Promise.all(viewers.map(({ page }) => expect(page.locator(rootJourneySelector))
        .toHaveAttribute("data-public-card-journey-phase", "parked", { timeout: 15_000 })));
      // At the short 440×766 viewport the bottom plaque correctly yields to
      // the full-size reveal card; once the authentic root is parked, the
      // plaque must be visible again on all four clients.
      await expectSharedPublicActivity(viewers, { kind: "negation", text: "Waiting for Negation responses" });

      const committed = [{ event: rootEvent, cardId: room.cards.root, actorId: room.players[0].id }];
      const h4CaptionEventIds = new Set([rootEvent.id]);
      const actionLabel = cardKind === "BarbarianInvasion" ? "Barbarian Invasion" : "Raining Arrows";
      const groupResponse = await passOpenNegationWindows(request, room);
      expect(groupResponse.currentAction?.kind).toBe("response");
      expect(groupResponse.currentAction?.actorId).toBe(room.players[1].id);
      expect((await view(request, room, 1)).currentAction?.requirement).toBe(responseKind.toLowerCase());
      const groupWaitText = `Waiting for ${room.players[1].name} · ${actionLabel}`;
      await expectSharedPublicActivity(viewers, { kind: "response", text: groupWaitText });
      const sharedRootProof = await Promise.all(room.players.map((_, index) => view(request, room, index)));
      const rootProofs = sharedRootProof.map((state) => state.presentationSnapshot?.groupParticipantProgress?.rootCardProof);
      const groupParticipants = sharedRootProof.map((state) => state.presentationSnapshot?.groupParticipantProgress?.currentParticipantId);
      for (const proof of rootProofs) {
        expect(proof).toMatchObject({
          semantics: "PROVEN",
          rootEventId: rootEvent.id,
          rootCardId: room.cards.root,
          sourceId: room.players[0].id,
          cardKind,
          targetIds: room.players.slice(1).map(({ id }) => id),
        });
      }
      expect(groupParticipants).toEqual(room.players.map(() => room.players[1].id));
      expect(new Set(sharedRootProof.map((state) => state.presentationSnapshot?.identity?.interactionId)).size).toBe(1);
      expect(sharedRootProof.every((state) => !JSON.stringify(state.timeline).includes(room.cards.privateLosingNegation))).toBe(true);
      expect(sharedRootProof.every((state) => !JSON.stringify(state.presentationSnapshot ?? {}).includes(room.cards.privateLosingNegation))).toBe(true);
      const rootStageCopy = `${room.players[0].name} played ${cardKind === "BarbarianInvasion" ? "Barbarian Invasion" : "Raining Arrows"}.`;
      const afterNegation = await waitForSharedAnnouncement(viewers, rootEvent.id);
      expect(afterNegation.every((items) => items[0].text === rootStageCopy && items[0].anchorEventId === null)).toBe(true);
      expect(afterNegation.every((items) => !/Negation/i.test(items[0].text))).toBe(true);
      const targetDamage = await request.post(`${API}/api/rooms`, {
        data: { action: "decline_response", code: room.code, token: room.players[1].token },
      });
      if (!targetDamage.ok()) throw new Error(`First Group target could not take damage: ${await targetDamage.text()}`);
      const ganglie = await view(request, room, 1);
      expect(ganglie.currentAction).toMatchObject({ kind: "trigger", actorId: room.players[1].id, triggerEvent: "damage_suffered" });
      expect(ganglie.currentAction.triggerOptions.some((option) => option.effectId === "xiahou_dun_ganglie")).toBe(true);
      expect(ganglie.presentationSnapshot?.groupParticipantProgress?.currentParticipantId).toBe(room.players[1].id);
      await expectSharedPublicActivity(viewers, { kind: "response", text: groupWaitText });
      const duringDamageTrigger = await waitForSharedAnnouncement(viewers, rootEvent.id);
      expect(duringDamageTrigger.every((items) => items[0].text === rootStageCopy && items[0].anchorEventId === null)).toBe(true);

      const judged = await request.post(`${API}/api/rooms`, {
        data: { action: "trigger", code: room.code, token: room.players[1].token, providerId: "xiahou_dun_ganglie" },
      });
      if (!judged.ok()) throw new Error(`Xiahou Dun Stauchness trigger was rejected: ${await judged.text()}`);
      const sourceChoice = await view(request, room, 0);
      expect(sourceChoice.currentAction).toMatchObject({ kind: "trigger", actorId: room.players[0].id, triggerEvent: "damage_suffered" });
      expect(sourceChoice.currentAction.triggerOptions.some((option) => option.effectId === "xiahou_dun_ganglie")).toBe(true);
      expect(sourceChoice.presentationSnapshot?.groupParticipantProgress?.currentParticipantId).toBe(room.players[1].id);
      await expectSharedPublicActivityIdentity(viewers, { kind: "resolving", text: "Resolving…" });
      const duringSourceTrigger = await waitForSharedAnnouncement(viewers, rootEvent.id);
      expect(duringSourceTrigger.every((items) => items[0].text === rootStageCopy && items[0].anchorEventId === null)).toBe(true);

      const consequence = await request.post(`${API}/api/rooms`, {
        data: { action: "trigger", code: room.code, token: room.players[0].token, providerId: "xiahou_dun_ganglie", choice: "take_damage" },
      });
      if (!consequence.ok()) throw new Error(`Xiahou Dun consequence was rejected: ${await consequence.text()}`);
      const targetTwoWindow = await view(request, room, 0);
      const targetTwoScope = targetTwoWindow.presentationSnapshot?.reactionChain?.groupTargetEffectScope;
      expect(targetTwoWindow.presentationSnapshot?.interaction).toMatchObject({ semantics: "PROVEN", stage: "NEGATION" });
      expect(targetTwoWindow.presentationSnapshot?.groupParticipantProgress?.currentParticipantId).toBe(room.players[2].id);
      expect(targetTwoWindow.presentationSnapshot?.reactionChain?.nodes).toHaveLength(0);
      expect(targetTwoScope).toMatchObject({ semantics: "PROVEN", targetId: room.players[2].id, effectState: "ACTIVE" });
      expect(targetTwoScope?.checkpointId).toBe(targetTwoWindow.presentationSnapshot?.interaction?.checkpointId);
      // Freeze only this test room's real 8-second window so all mobile clients
      // can render and be measured at the same proven stage.
      expect(targetTwoWindow.currentAction?.negationWindowId).toBeTruthy();
      await adjustWindowClock(request, room, targetTwoWindow.currentAction.negationWindowId);
      const cardName = cardKind === "BarbarianInvasion" ? "Barbarian Invasion" : "Raining Arrows";
      await expectGroupTargetNegationStage(viewers, {
        rootEventId: rootEvent.id,
        checkpointId: targetTwoScope.checkpointId,
        targetName: room.players[2].name,
        previousTargetName: room.players[1].name,
        cardName,
      });
      await Promise.all(viewers.map(({ page }, index) => saveEvidence(page, testInfo, `viewer-${index + 1}`, `${cardKind.toLowerCase()}-target-2-negation`)));

      const negationEvent = await submitNegation(request, room, 0, room.cards.negationSource);
      committed.push({ event: negationEvent, cardId: room.cards.negationSource, actorId: room.players[0].id });
      h4CaptionEventIds.add(negationEvent.id);
      const targetTwoCounterWindow = await view(request, room, 0);
      const targetTwoCounterScope = targetTwoCounterWindow.presentationSnapshot?.reactionChain?.groupTargetEffectScope;
      expect(targetTwoCounterWindow.presentationSnapshot?.interaction).toMatchObject({ semantics: "PROVEN", stage: "NEGATION" });
      expect(targetTwoCounterWindow.presentationSnapshot?.groupParticipantProgress?.currentParticipantId).toBe(room.players[2].id);
      expect(targetTwoCounterWindow.presentationSnapshot?.reactionChain?.nodes).toHaveLength(1);
      expect(targetTwoCounterScope).toMatchObject({ semantics: "PROVEN", targetId: room.players[2].id, effectState: "BLOCKED" });
      expect(targetTwoCounterScope?.checkpointId).toBe(targetTwoCounterWindow.presentationSnapshot?.interaction?.checkpointId);
      expect(targetTwoCounterWindow.currentAction?.negationWindowId).toBeTruthy();
      await adjustWindowClock(request, room, targetTwoCounterWindow.currentAction.negationWindowId);
      await expectSharedCounterNarration(viewers, {
        eventId: negationEvent.id,
        checkpointId: targetTwoCounterScope.checkpointId,
        rootLabel: cardName,
        targetName: room.players[2].name,
      });
      const negationJourneySelector = `${rootDisplaySelector} [data-public-card-journey-event-id="${negationEvent.id}"]`;
      await Promise.all(viewers.map(({ page }) => expect(page.locator(negationJourneySelector))
        .toHaveAttribute("data-public-card-journey-actor-id", room.players[0].id)));
      await Promise.all(viewers.map(({ page }) => expect(page.locator(negationJourneySelector))
        .toHaveAttribute("data-public-card-journey-phase", "parked", { timeout: 15_000 })));
      const targetTwoCounterWindowId = targetTwoCounterWindow.currentAction?.negationWindowId;
      expect(targetTwoCounterWindowId).toBeTruthy();
      await passNegationWindow(request, room, targetTwoCounterWindowId);
      const targetIds = targetTwoCounterWindow.presentationSnapshot?.groupParticipantProgress?.rootCardProof?.targetIds ?? [];
      const previousTargetOrder = targetIds.indexOf(targetTwoCounterScope.targetId);
      const expectedNextTargetId = targetIds[previousTargetOrder + 1];
      expect(expectedNextTargetId).toBeTruthy();
      let nextTargetWindow = null;
      await expect.poll(async () => {
        nextTargetWindow = await view(request, room, 0);
        const scope = nextTargetWindow.presentationSnapshot?.reactionChain?.groupTargetEffectScope;
        return scope?.semantics === "PROVEN" && scope.targetId === expectedNextTargetId
          && scope.effectState === "ACTIVE" && nextTargetWindow.presentationSnapshot?.reactionChain?.nodes?.length === 0;
      }, { timeout: 20_000 }).toBe(true);
      expect(nextTargetWindow.presentationSnapshot?.interaction).toMatchObject({ semantics: "PROVEN", stage: "NEGATION" });
      expect(nextTargetWindow.presentationSnapshot?.groupParticipantProgress?.currentParticipantId).toBe(expectedNextTargetId);
      expect(nextTargetWindow.currentAction?.negationWindowId).toBeTruthy();
      await adjustWindowClock(request, room, nextTargetWindow.currentAction.negationWindowId);
      const nextTargetName = room.players.find((player) => player.id === expectedNextTargetId)?.name;
      const previousTargetName = room.players.find((player) => player.id === targetTwoCounterScope.targetId)?.name;
      expect(nextTargetName).toBeTruthy();
      expect(previousTargetName).toBeTruthy();
      await expectGroupTargetNegationStage(viewers, {
        rootEventId: rootEvent.id,
        checkpointId: nextTargetWindow.presentationSnapshot.reactionChain.groupTargetEffectScope.checkpointId,
        targetName: nextTargetName,
        previousTargetName,
        cardName,
      });
      await passOpenNegationWindows(request, room);
      let current = await view(request, room, 3);
      expect(current.currentAction).toMatchObject({ kind: "response", actorId: room.players[3].id, requirement: responseKind.toLowerCase() });
      expect(current.presentationSnapshot?.groupParticipantProgress?.currentParticipantId).toBe(room.players[3].id);
      await expectSharedPublicActivity(viewers, { kind: "response", text: `Waiting for ${room.players[3].name} · ${actionLabel}` });
      expect(current.players.find((player) => player.id === room.players[1].id)?.hp).toBe(3);
      expect(current.players.find((player) => player.id === room.players[0].id)?.hp).toBe(3);
      const afterDamage = await waitForSharedAnnouncement(viewers, rootEvent.id);
      expect(afterDamage.every((items) => items[0].text === rootStageCopy && items[0].anchorEventId === null)).toBe(true);

      let finalSettlementEvent = null;
      for (const [index, cardId] of [[3, room.cards.responseThird]]) {
        current = await view(request, room, index);
        expect(current.currentAction).toMatchObject({ kind: "response", actorId: room.players[index].id, requirement: responseKind.toLowerCase() });
        const response = await request.post(`${API}/api/rooms`, {
          data: { action: "respond", code: room.code, token: room.players[index].token, providerId: "card", cardId },
        });
        if (!response.ok()) throw new Error(`${room.players[index].name} could not resolve the Group response: ${await response.text()}`);
        const resolved = await view(request, room, index);
        const responseEvent = resolved.timeline.find((event) => event?.card?.id === cardId);
        expect(responseEvent).toBeTruthy();
        expect(responseEvent.player).toBe(room.players[index].name);
        committed.push({ event: responseEvent, cardId, actorId: room.players[index].id });
        const sharedResponseViews = await Promise.all(room.players.map((_, viewerIndex) => view(request, room, viewerIndex)));
        const sharedResponseEvents = sharedResponseViews.map((state) => state.timeline.find((event) => event?.card?.id === cardId));
        expect(sharedResponseEvents.every((event) => event?.id === responseEvent.id && event.player === room.players[index].name)).toBe(true);
        if (index === 3) {
          expect(resolved.phase).toBe("play");
          finalSettlementEvent = resolved.timeline.find((event) => event.finalResult === true
            && event.publicGroupSettlement?.rootEventId === rootEvent.id);
          expect(finalSettlementEvent?.publicGroupSettlement).toMatchObject({
            semantics: "PROVEN",
            rootEventId: rootEvent.id,
            sourceId: room.players[0].id,
            cardKind,
          });
          expect(finalSettlementEvent.publicGroupSettlement.participants.map(({ playerId }) => playerId))
            .toEqual(room.players.slice(1).map(({ id }) => id));
          expect(finalSettlementEvent.publicGroupSettlement.participants.every(({ status }) => status === "RESOLVED")).toBe(true);
          expect(finalSettlementEvent.id).toBeTruthy();
          h4CaptionEventIds.add(finalSettlementEvent.id);
          await expectSharedPublicActivity(viewers, { kind: "turn", text: `${room.players[0].name}'s turn` });
        }
        const expectedCaptionEventId = index === 3 ? finalSettlementEvent?.id ?? null : rootEvent.id;
        const shared = await waitForSharedAnnouncement(viewers, expectedCaptionEventId);
        expect(shared.every((items) => items[0].text.length > 0)).toBe(true);
        expect(shared.every((items) => items.every(({ text }) => !/Negation/i.test(text)))).toBe(true);
        if (index === 3) {
          expect(shared.every((items) => items[0].text === `${room.players[0].name} played ${cardKind === "BarbarianInvasion" ? "Barbarian Invasion" : "Raining Arrows"}; 3 targets resolved.`)).toBe(true);
          expect(shared.every((items) => items[0].anchorEventId === null)).toBe(true);
        } else {
          expect(shared.every((items) => items[0].text === rootStageCopy && items[0].anchorEventId === null)).toBe(true);
        }
      }

      const geometry = await Promise.all(viewers.map(async ({ page, player, viewport }, index) => ({
        responseReads: await Promise.all(responseReads[index]),
        viewerId: player.id,
        viewport,
        frames: await page.evaluate(() => window.__h4NegationFrames),
        errors: errors[index],
        failedResponses: failedResponses[index],
      })));
      for (const viewer of geometry) {
        const frames = viewer.frames;
        const centerDrift = Math.max(...frames.map(({ centerY }) => centerY)) - Math.min(...frames.map(({ centerY }) => centerY));
        if (centerDrift > 16) {
          const byStage = new Map();
          for (const frame of frames) {
            const key = `${frame.eventId}:${frame.phase}`;
            const group = byStage.get(key) ?? [];
            group.push(frame);
            byStage.set(key, group);
          }
          console.info(`[H4 vertical drift] ${JSON.stringify({ viewport: viewer.viewport, centerDrift, stages: [...byStage].map(([key, group]) => ({
            key,
            range: [Math.min(...group.map(({ centerY }) => centerY)), Math.max(...group.map(({ centerY }) => centerY))],
            samples: group.length,
            placements: [...new Set(group.map(({ placement }) => placement))],
            texts: [...new Set(group.map(({ text }) => text))],
            first: group[0].announcement,
            last: group.at(-1).announcement,
          })) })}`);
        }
        expect(frames.length).toBeGreaterThan(5);
        expect(new Set(frames.map(({ interactionId }) => interactionId)).size).toBe(1);
        expect(frames.every(({ rootEventId: seenRoot }) => seenRoot === rootEvent.id)).toBe(true);
        expect(new Set(frames.map(({ eventId }) => eventId)), JSON.stringify({
          viewport: viewer.viewport,
          expected: [...h4CaptionEventIds],
          observed: [...new Set(frames.map(({ eventId }) => eventId))],
          samples: [...new Map(frames.map((frame) => [`${frame.eventId}|${frame.text}`, { eventId: frame.eventId, phase: frame.phase, text: frame.text }])).values()],
        })).toEqual(h4CaptionEventIds);
        expect(frames.every(({ visibleAnnouncementCount }) => visibleAnnouncementCount === 1)).toBe(true);
        expect(frames.every(({ centerOffset }) => Math.abs(centerOffset ?? Infinity) <= 12)).toBe(true);
        expect(Math.max(...frames.map(({ centerY }) => centerY))
          - Math.min(...frames.map(({ centerY }) => centerY))).toBeLessThanOrEqual(16);
        const unreadableFrames = frames.filter(({ fallback, lines, fontSize, placement }) => fallback || lines < 1 || lines > 2 || fontSize < 14
          || (placement !== "center-band-above" && placement !== "center-band-below"));
        expect(unreadableFrames, JSON.stringify({ viewport: viewer.viewport, unreadableFrames: unreadableFrames.slice(0, 12) })).toEqual([]);
        expect(frames.every(({ protectedRects }) => protectedRects.length === 0)).toBe(true);
        expect(frames.filter(({ phase }) => phase !== "move").every(({ activeCardOverlap }) => !activeCardOverlap)).toBe(true);
        expect(viewer.errors.filter((error) => !error.includes("409 (Conflict)"))).toEqual([]);
        expect(viewer.failedResponses.every(({ status, method, path, action, error, stale }) => status === 409
          && method === "POST" && path === "/api/rooms" && action === "start_response_timer"
          && stale === true && error === "That action is stale. The table has advanced to the next actor.")).toBe(true);
        expect(viewer.errors.filter((error) => error.includes("409 (Conflict)")).length)
          .toBeLessThanOrEqual(viewer.failedResponses.length);
      }

      const settlementViews = await Promise.all(room.players.map((_, index) => view(request, room, index)));
      for (const state of settlementViews) {
        expect(state.timeline.some((event) => event.id === rootEvent.id && event.card?.id === room.cards.root && event.player === room.players[0].name)).toBe(true);
        expect(state.timeline.some((event) => event.type === "card" && event.card?.id === room.cards.negationSource)).toBe(true);
        expect(JSON.stringify(state.timeline)).not.toContain(room.cards.negationTarget);
        expect(JSON.stringify(state.presentationSnapshot ?? {})).not.toContain(room.cards.negationTarget);
        expect(JSON.stringify(state.timeline)).not.toContain(room.cards.responseSecond);
        expect(JSON.stringify(state.presentationSnapshot ?? {})).not.toContain(room.cards.responseSecond);
        expect(state.timeline.some((event) => event.type === "card" && event.card?.id === room.cards.responseThird)).toBe(true);
        expect(JSON.stringify(state.timeline)).not.toContain(room.cards.privateLosingNegation);
        expect(JSON.stringify(state.presentationSnapshot ?? {})).not.toContain(room.cards.privateLosingNegation);
      }
      expect(new Set(settlementViews.map((state) => state.timeline.find((event) => event.id === rootEvent.id)?.id)).size).toBe(1);
      for (const viewer of viewers) await expect(viewer.page.getByText("GAME SCREEN ERROR")).toHaveCount(0);
      const evidence = {
        cardKind,
        rootEventId: rootEvent.id,
        rootCardId: room.cards.root,
        authorId: room.players[0].id,
        sharedInteractionIds: [...new Set(sharedRootProof.map((state) => state.presentationSnapshot?.identity?.interactionId))],
        committed: committed.map(({ event, cardId, actorId }) => ({ eventId: event.id, cardId, actorId })),
        settlementEventId: finalSettlementEvent?.id ?? null,
        viewers: geometry.map(({ viewerId, viewport, frames }) => ({
          viewerId,
          viewport,
          samples: frames.length,
          events: [...new Set(frames.map(({ eventId }) => eventId))],
          topRange: [Math.min(...frames.map(({ announcement }) => announcement.top)), Math.max(...frames.map(({ announcement }) => announcement.top))],
          bandCenterYRange: [Math.min(...frames.map(({ centerY }) => centerY)), Math.max(...frames.map(({ centerY }) => centerY))],
          centers: [Math.min(...frames.map(({ centerOffset }) => centerOffset)), Math.max(...frames.map(({ centerOffset }) => centerOffset))],
        })),
      };
      await testInfo.attach(`${cardKind.toLowerCase()}-h4-four-client-geometry.json`, {
        body: JSON.stringify(evidence, null, 2), contentType: "application/json",
      });
      console.log(`[H4 ${cardKind} four-client group geometry] ${JSON.stringify(evidence)}`);
    } finally {
      await Promise.all(pages.map((page) => page.close()));
    }
  });
}
