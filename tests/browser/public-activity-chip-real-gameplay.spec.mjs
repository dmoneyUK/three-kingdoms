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

async function openPlayer(page, room, index, viewport = { width: 440, height: 894 }) {
  const member = room.players[index];
  await page.setViewportSize(viewport);
  await page.addInitScript(({ code, token, name }) => {
    localStorage.setItem("three-realms-session", JSON.stringify({ code, token, name }));
  }, { code: room.code, token: member.token, name: member.name });
  await page.goto(`${API}/`);
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
      ".stage-system-cluster", ".hero-focus", ".interaction-stage-dying", ".dying-handoff-compact",
      ".public-card-display-journey-copy", ".public-card-journey-card", ".public-card-duel-parked-card",
      ".public-card-display-static-card > .played-card", ".effect-notice", ".turn-notice", ".played-card-stage .played-card",
      ".game-event-stage > div", ".harvest-choice-stage > div", ".victory-banner", ".table-resolution-layer .played-card",
    ].join(",");
    const overlaps = [...document.querySelectorAll(protectedSelector)]
      .filter((element) => element !== chip && getComputedStyle(element).display !== "none" && getComputedStyle(element).visibility !== "hidden")
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
    };
  });
}

function assertGeometry(result) {
  expect(result.visibility).toBe("visible");
  expect(result.placement).not.toBe("hidden");
  expect(result.chip.left).toBeGreaterThanOrEqual(result.table.left);
  expect(result.chip.right).toBeLessThanOrEqual(result.table.right);
  expect(result.chip.top).toBeGreaterThanOrEqual(result.table.top + result.table.height * 0.55);
  expect(result.chip.bottom).toBeLessThanOrEqual(result.table.bottom);
  expect(result.chipHeight).toBeGreaterThanOrEqual(44);
  expect(result.chipHeight).toBeLessThanOrEqual(64);
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
    const initialLabels = await Promise.all(pages.map(readChip));
    expect(initialLabels).toEqual(Array(4).fill("Test Player 1's turn"));

    const root = await action(request, room, 0, "play_card", { cardId: "activity-duel-root", targetId: room.players[1].id });
    const windowId = root.room.currentAction.negationWindowId;
    expect(windowId).toBeTruthy();
    const hold = await request.post(`${API}/__test/negation-window-clock`, { data: { code: room.code, windowId, mode: "hold" } });
    expect(hold.ok()).toBeTruthy();
    await expect.poll(async () => Promise.all(pages.map(readChip))).toEqual(Array(4).fill("Waiting for Negation responses"));

    const beforePass = await Promise.all(room.players.map((_, index) => state(request, room, index)));
    expect(new Set(beforePass.map((view) => view.presentationSnapshot.interaction.interactionId)).size).toBe(1);
    await action(request, room, 0, "decline_response", { windowId });
    const afterOnePass = await Promise.all(room.players.map((_, index) => state(request, room, index)));
    expect(afterOnePass.map((view) => view.pendingNegation.submitted)).toEqual([true, false, false, false]);
    expect(await Promise.all(pages.map(readChip))).toEqual(Array(4).fill("Waiting for Negation responses"));
    expect(JSON.stringify(afterOnePass[2])).not.toContain("activity-duel-answer");

    for (let index = 1; index < 4; index += 1) await action(request, room, index, "decline_response", { windowId });
    await expect.poll(async () => Promise.all(pages.map(readChip)), { timeout: 12_000 })
      .toEqual(Array(4).fill("Waiting for Test Player 2 · Duel"));
    const duelViews = await Promise.all(room.players.map((_, index) => state(request, room, index)));
    expect(duelViews.every((view) => view.presentationSnapshot.duelExchange?.semantics === "PROVEN")).toBe(true);
    expect(duelViews.map((view) => view.presentationSnapshot.duelExchange.decisionActorId)).toEqual(Array(4).fill(room.players[1].id));
    await expect(pages[0].locator("[data-public-activity-heading]")).toHaveText("Waiting for Test Player 2");
    await expect(pages[0].locator("[data-public-activity-stage]")).toHaveText("Duel Exchange");

    const negationScreenshot = await pages[3].screenshot({ fullPage: true });
    await testInfo.attach("public-activity-shared-negation-440x894", { body: negationScreenshot, contentType: "image/png" });

    const beforeAttackGeometry = await geometry(pages[1]);
    assertGeometry(beforeAttackGeometry);
    const attackResponse = await action(request, room, 1, "respond", { providerId: "card", cardId: "activity-duel-answer" });
    const attackEvent = attackResponse.room.timeline.find((event) => event.type === "card" && event.card?.id === "activity-duel-answer");
    expect(attackEvent?.id).toBeTruthy();
    await expect.poll(async () => Promise.all(pages.map(readChip)), { timeout: 8_000 })
      .toEqual(Array(4).fill("Waiting for Test Player 1 · Duel"));
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
