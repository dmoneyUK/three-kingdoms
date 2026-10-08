import { expect, test } from "@playwright/test";

const API = "http://127.0.0.1:3137";
const viewports = [
  { width: 320, height: 740 },
  { width: 390, height: 844 },
  { width: 480, height: 900 },
  { width: 1440, height: 900 },
];
const harvest = { id: "real-harvest-timer-root", kind: "BumperHarvest", suit: "♥", rank: "3" };
const deck = [
  { id: "real-harvest-timer-attack", kind: "Attack", suit: "♠", rank: "7" },
  { id: "real-harvest-timer-dodge", kind: "Dodge", suit: "♣", rank: "8" },
  { id: "real-harvest-timer-peach", kind: "Peach", suit: "♥", rank: "9" },
  { id: "real-harvest-timer-duel", kind: "Duel", suit: "♦", rank: "10" },
];

async function seedGame(request) {
  const response = await request.post(`${API}/__test/seed-playing-game`, {
    data: {
      phase: "play",
      turnSeat: 0,
      players: [
        { name: "HARVEST SOURCE", role: "Lord", hero: "cao-cao", hp: 4, maxHp: 4, hand: [harvest] },
        { name: "CHOOSER TWO", role: "Loyalist", hero: "sun-quan", hp: 4, maxHp: 4, hand: [] },
        { name: "CHOOSER THREE", role: "Rebel", hero: "guo-jia", hp: 4, maxHp: 4, hand: [] },
        { name: "CHOOSER FOUR", role: "Renegade", hero: "zhou-yu", hp: 4, maxHp: 4, hand: [] },
      ],
      deck,
    },
  });
  if (!response.ok()) throw new Error(`Bumper Harvest seed failed: ${await response.text()}`);
  return response.json();
}

async function openPlayer(page, seed, playerIndex, viewport) {
  const member = seed.players[playerIndex];
  await page.setViewportSize(viewport);
  await page.addInitScript(({ code, token, name }) => {
    localStorage.setItem("three-realms-session", JSON.stringify({ code, token, name }));
  }, { code: seed.code, token: member.token, name: member.name });
  await page.goto(`${API}/`);
  await expect(page.locator(".game-shell")).toBeVisible();
  return member;
}

async function roomView(request, seed, playerIndex) {
  const response = await request.get(`${API}/api/rooms?${new URLSearchParams({
    code: seed.code,
    token: seed.players[playerIndex].token,
  })}`);
  expect(response.ok()).toBeTruthy();
  return response.json();
}

function postedAction(page, action) {
  return page.waitForResponse((response) => {
    if (response.url() !== `${API}/api/rooms` || response.request().method() !== "POST") return false;
    try { return JSON.parse(response.request().postData() ?? "{}").action === action; }
    catch { return false; }
  });
}

async function playHarvest(page) {
  await page.locator(`[data-hand-card-id="${harvest.id}"] .game-card`).click();
  const play = page.locator('[data-console-surface="local-operation"] button.primary');
  await expect(play).toHaveText("Play");
  await expect(play).toBeEnabled();
  const submitted = postedAction(page, "play_card");
  await play.click();
  const response = await submitted;
  if (!response.ok()) throw new Error(`Bumper Harvest play failed: ${await response.text()}`);
}

async function measure(page) {
  return page.evaluate(() => {
    const bounds = (element) => {
      if (!element) return null;
      const { left, right, top, bottom, width, height } = element.getBoundingClientRect();
      return { left, right, top, bottom, width, height };
    };
    const cluster = document.querySelector(".stage-system-cluster");
    const timer = cluster?.querySelector(":scope > .visible-countdown-event");
    const menu = cluster?.querySelector(".stage-system-menu-trigger");
    const table = document.querySelector(".play-table");
    const dock = document.querySelector(".local-player-dock");
    const guidance = dock?.querySelector(".console-guidance");
    const choice = document.querySelector(".harvest-choice-stage > div");
    const harvestRow = choice?.querySelector(".harvest-card-row");
    const harvestChoices = [...(choice?.querySelectorAll(".harvest-card-choice") ?? [])];
    const piles = ["[data-draw-anchor='true']", "[data-discard-anchor='true']"]
      .map((selector) => bounds(document.querySelector(selector)));
    return {
      cluster: bounds(cluster), timer: bounds(timer), menu: bounds(menu), table: bounds(table),
      dock: bounds(dock), guidance: bounds(guidance), choice: bounds(choice),
      harvestRow: bounds(harvestRow), harvestRowClientWidth: harvestRow?.clientWidth ?? 0,
      harvestRowScrollWidth: harvestRow?.scrollWidth ?? 0,
      harvestRowClipLeft: harvestRow ? harvestRow.getBoundingClientRect().left + harvestRow.clientLeft : 0,
      harvestRowClipRight: harvestRow ? harvestRow.getBoundingClientRect().left + harvestRow.clientLeft + harvestRow.clientWidth : 0,
      harvestRowOverflowX: harvestRow ? getComputedStyle(harvestRow).overflowX : null,
      harvestChoiceCount: harvestChoices.length, harvestChoices: harvestChoices.map(bounds), piles,
      timerLabel: timer?.getAttribute("aria-label") ?? null,
      timerText: timer?.innerText.trim() ?? null,
      timerPointerEvents: timer ? getComputedStyle(timer).pointerEvents : null,
      pageWidth: document.documentElement.scrollWidth,
      viewportWidth: window.innerWidth,
    };
  });
}

function overlaps(a, b) {
  return Boolean(a && b && a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top);
}

test("real Bumper Harvest gives each active chooser a server-owned 60-second Stage timer", async ({ page, request }, testInfo) => {
  test.setTimeout(90_000);
  const seed = await seedGame(request);
  let suppressTimerProjection = false;
  await page.route(`${API}/api/rooms?**`, async (route) => {
    const response = await route.fetch();
    if (!suppressTimerProjection) return route.fulfill({ response });
    const body = await response.json();
    if (body.pendingHarvest) body.pendingHarvest.countdownUntil = 0;
    return route.fulfill({ response, json: body });
  });
  const source = await openPlayer(page, seed, 0, viewports[0]);
  await expect(page.locator(".stage-system-cluster > .visible-countdown-event")).toHaveCount(0);

  await playHarvest(page);
  await expect.poll(async () => {
    const room = await roomView(request, seed, 0);
    return room.pendingHarvest?.actorId === source.id && room.pendingHarvest.countdownUntil > Date.now();
  }, { timeout: 20_000 }).toBe(true);

  const firstChoice = await roomView(request, seed, 0);
  const firstDeadline = firstChoice.pendingHarvest.countdownUntil;
  expect(firstChoice.currentAction.actorId).toBe(source.id);
  expect(firstDeadline - Date.now()).toBeGreaterThan(50_000);
  expect(firstDeadline - Date.now()).toBeLessThanOrEqual(60_000);
  const timer = page.locator(".stage-system-cluster > .visible-countdown-event");
  await expect(timer).toBeVisible();
  await expect(timer).toHaveAttribute("role", "timer");
  await expect(timer).toHaveAttribute("aria-label", /^Choosing (?:60|5[0-9]) seconds$/);
  await expect(timer).toHaveText(/^(?:60|5[0-9])s$/);
  await expect(page.locator(".harvest-choice-stage")).toBeVisible();

  const narrowViewport = { width: 320, height: 740 };
  await page.setViewportSize(narrowViewport);
  await expect(page.locator(".harvest-choice-stage > div")).toBeVisible();
  const localChoiceGeometry = await measure(page);
  const localChoiceContext = JSON.stringify({ viewport: narrowViewport, geometry: localChoiceGeometry });
  expect(localChoiceGeometry.choice.left, localChoiceContext).toBeGreaterThanOrEqual(8);
  expect(localChoiceGeometry.choice.right, localChoiceContext).toBeLessThanOrEqual(narrowViewport.width - 8);
  expect(localChoiceGeometry.harvestChoiceCount, localChoiceContext).toBe(4);
  for (const card of localChoiceGeometry.harvestChoices) {
    expect(card.left, localChoiceContext).toBeGreaterThanOrEqual(localChoiceGeometry.harvestRowClipLeft - 1);
    expect(card.right, localChoiceContext).toBeLessThanOrEqual(localChoiceGeometry.harvestRowClipRight + 1);
    expect(card.right - card.left, localChoiceContext).toBeGreaterThanOrEqual(44);
  }
  await expect(page.locator(".harvest-confirm-row button.primary")).toBeVisible();
  const localScreenshot = testInfo.outputPath("bumper-harvest-local-choice-320.png");
  await page.screenshot({ path: localScreenshot, animations: "disabled" });
  await testInfo.attach("bumper-harvest-local-choice-320", { path: localScreenshot, contentType: "image/png" });
  await testInfo.attach("bumper-harvest-local-choice-320-geometry", {
    body: JSON.stringify({ viewport: narrowViewport, geometry: localChoiceGeometry }, null, 2),
    contentType: "application/json",
  });

  const firstCard = page.locator(".harvest-choice-stage .harvest-card-choice:not([disabled])").first();
  await expect(firstCard).toBeEnabled();
  await firstCard.click();
  const confirm = page.locator(".harvest-choice-stage .harvest-confirm-row button.primary");
  await expect(confirm).toBeEnabled();
  const chooseResponse = postedAction(page, "choose_harvest");
  await confirm.click();
  const chosen = await chooseResponse;
  if (!chosen.ok()) throw new Error(`Bumper Harvest choice failed: ${await chosen.text()}`);

  await expect.poll(async () => {
    const room = await roomView(request, seed, 0);
    return room.pendingHarvest?.actorId === seed.players[1].id
      && room.pendingHarvest.countdownUntil > firstDeadline;
  }, { timeout: 20_000 }).toBe(true);
  const nextChoice = await roomView(request, seed, 0);
  const nextDeadline = nextChoice.pendingHarvest.countdownUntil;
  expect(nextChoice.currentAction.actorId).toBe(seed.players[1].id);
  expect(nextDeadline).toBeGreaterThan(firstDeadline);
  expect(nextDeadline - firstDeadline).toBeLessThan(10_000);
  expect(nextDeadline - Date.now()).toBeGreaterThan(50_000);

  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    // Hold the server-backed active choice constant and hide only its timer
    // projection to measure the timer's own layout delta.
    suppressTimerProjection = true;
    await page.reload();
    await expect(page.locator(".game-shell")).toBeVisible();
    await expect(page.locator(".harvest-choice-stage > div")).toBeVisible();
    await expect(page.locator(".stage-system-cluster > .visible-countdown-event")).toHaveCount(0);
    const prior = await measure(page);

    suppressTimerProjection = false;
    await page.reload();
    await expect(page.locator(".game-shell")).toBeVisible();
    await expect(page.locator(".stage-system-cluster > .visible-countdown-event")).toBeVisible();
    await expect(timer).toBeVisible();
    const geometry = await measure(page);
    const context = JSON.stringify({ viewport, geometry, prior, firstDeadline, nextDeadline });
    expect(geometry.pageWidth, context).toBeLessThanOrEqual(viewport.width);
    expect(geometry.choice.left, context).toBeGreaterThanOrEqual(8);
    expect(geometry.choice.right, context).toBeLessThanOrEqual(viewport.width - 8);
    expect(geometry.harvestRow.left, context).toBeGreaterThanOrEqual(geometry.choice.left);
    expect(geometry.harvestRow.right, context).toBeLessThanOrEqual(geometry.choice.right);
    expect(geometry.harvestRowOverflowX, context).toMatch(/auto|scroll/);
    expect(geometry.harvestChoiceCount, context).toBe(4);
    expect(geometry.harvestRowScrollWidth, context).toBeGreaterThanOrEqual(geometry.harvestRowClientWidth);
    for (const card of geometry.harvestChoices) {
      expect(card.left, context).toBeGreaterThanOrEqual(geometry.harvestRowClipLeft - 1);
      expect(card.right, context).toBeLessThanOrEqual(geometry.harvestRowClipRight + 1);
      expect(card.left, context).toBeGreaterThanOrEqual(8);
      expect(card.right, context).toBeLessThanOrEqual(viewport.width - 8);
    }
    expect(geometry.timer.width, context).toBeGreaterThanOrEqual(52);
    expect(geometry.timer.width, context).toBeLessThanOrEqual(68);
    expect(geometry.timer.height, context).toBeGreaterThanOrEqual(36);
    expect(geometry.timer.height, context).toBeLessThanOrEqual(44);
    expect(Math.abs(geometry.timer.right + 8 - geometry.menu.left), context).toBeLessThanOrEqual(1);
    expect(Math.abs(geometry.menu.left - prior.menu.left), context).toBeLessThanOrEqual(2);
    expect(Math.abs(geometry.menu.top - prior.menu.top), context).toBeLessThanOrEqual(2);
    expect(Math.abs(geometry.guidance.top - prior.guidance.top), context).toBeLessThanOrEqual(2);
    expect(Math.abs(geometry.choice.left - prior.choice.left), context).toBeLessThanOrEqual(2);
    expect(Math.abs(geometry.choice.top - prior.choice.top), context).toBeLessThanOrEqual(2);
    expect(geometry.piles, context).toEqual(prior.piles);
    expect(geometry.guidance.top - geometry.cluster.bottom, context).toBeGreaterThanOrEqual(8);
    expect(geometry.guidance.top - geometry.cluster.bottom, context).toBeLessThanOrEqual(12);
    expect(geometry.timerPointerEvents, context).toBe("none");
    expect(geometry.table.bottom, context).toBeLessThanOrEqual(geometry.dock.top + 1);
    expect(overlaps(geometry.timer, viewport.width === 320 ? geometry.harvestRow : geometry.choice), context).toBe(false);
    expect(geometry.timerLabel, context).toMatch(/^Choosing \d+ seconds$/);
    expect(geometry.timerText, context).toMatch(/^\d+s$/);
    const lastChoice = await page.locator(".harvest-card-row").evaluate((row) => {
      row.scrollLeft = row.scrollWidth;
      const rowRect = row.getBoundingClientRect();
      const clipLeft = rowRect.left + row.clientLeft;
      const clipRight = clipLeft + row.clientWidth;
      const lastRect = row.querySelector(".harvest-card-choice:last-child").getBoundingClientRect();
      const result = { left: lastRect.left, right: lastRect.right, clipLeft, clipRight };
      row.scrollLeft = 0;
      return result;
    });
    expect(lastChoice.left, context).toBeGreaterThanOrEqual(lastChoice.clipLeft - 1);
    expect(lastChoice.right, context).toBeLessThanOrEqual(lastChoice.clipRight + 1);
    if (viewport.width === 320 || viewport.width === 390 || viewport.width === 1440) {
      const screenshotPath = testInfo.outputPath(`bumper-harvest-real-timer-${viewport.width}.png`);
      await page.screenshot({ path: screenshotPath, animations: "disabled" });
      await testInfo.attach(`bumper-harvest-real-timer-${viewport.width}`, { path: screenshotPath, contentType: "image/png" });
      await testInfo.attach(`bumper-harvest-real-timer-${viewport.width}-geometry`, {
        body: JSON.stringify({ viewport, geometry, firstDeadline, nextDeadline }, null, 2),
        contentType: "application/json",
      });
    }
  }
});
