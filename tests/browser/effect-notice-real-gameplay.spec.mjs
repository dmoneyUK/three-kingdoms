import { expect, test } from "@playwright/test";
import { writeFileSync } from "node:fs";

const API = "http://127.0.0.1:3137";
const SESSION_OVERRIDE_KEY = "effect-notice-session-override";
const viewports = [
  { name: "390x844", width: 390, height: 844 },
  { name: "440x956", width: 440, height: 956 },
  { name: "480x900", width: 480, height: 900 },
  { name: "wide-1440x900", width: 1440, height: 900 },
];
const card = (kind, id, suit = "♠", rank = "7") => ({ id, kind, suit, rank });

async function seedRoom(request, { targetEquipment, yueHand, yueEquipment, roomLabel }) {
  const response = await request.post(`${API}/__test/seed-playing-game`, {
    data: {
      phase: "play",
      turnSeat: 0,
      players: [
        { name: "SIMA YI", role: "Lord", hero: "simayi", hp: 4, maxHp: 4, hand: [], ...(targetEquipment ? { equipment: targetEquipment } : {}) },
        { name: "YUE JIN", role: "Loyalist", hero: "yue-jin", hp: 4, maxHp: 4, hand: yueHand, ...(yueEquipment ? { equipment: yueEquipment } : {}) },
        { name: "ALLY", role: "Rebel", hero: "sun-quan", hp: 4, maxHp: 4, hand: [] },
        { name: "FOURTH", role: "Renegade", hero: "liu-bei", hp: 4, maxHp: 4, hand: [] },
      ],
    },
  });
  if (!response.ok()) throw new Error(`seed failed: ${await response.text()}`);
  const game = await response.json();
  return { ...game, roomLabel };
}

async function roomView(request, game, index) {
  const response = await request.get(`${API}/api/rooms?code=${game.code}&token=${game.players[index].token}`);
  expect(response.ok()).toBeTruthy();
  return response.json();
}

async function openPlayer(page, game, index, viewport, reducedMotion = false) {
  const member = game.players[index];
  await page.setViewportSize({ width: viewport.width, height: viewport.height });
  if (reducedMotion) await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript(({ fallback, overrideKey }) => {
    const override = sessionStorage.getItem(overrideKey);
    const session = override ? JSON.parse(override) : fallback;
    localStorage.setItem("three-realms-session", JSON.stringify(session));
  }, {
    fallback: { code: game.code, token: member.token, name: member.name },
    overrideKey: SESSION_OVERRIDE_KEY,
  });
  await page.goto(`${API}/`);
  await expect(page.locator(".game-shell")).toBeVisible();
  await expect(page.locator(`.local-player-dock[data-player-anchor="${member.id}"]`)).toBeVisible();
  return member;
}

async function beginDauntless(request, game) {
  const ended = await request.post(`${API}/api/rooms`, {
    data: { action: "end_turn", code: game.code, token: game.players[0].token },
  });
  expect(ended.ok()).toBeTruthy();
  const response = await roomView(request, game, 1);
  expect(response.currentAction).toMatchObject({ kind: "trigger", actorId: game.players[1].id, triggerEvent: "turn_end" });
}

async function activateDauntless(page, request, game) {
  const yue = game.players[1];
  const dock = page.locator(`.local-player-dock[data-player-anchor="${yue.id}"]`);
  const skill = dock.locator(".local-hero-skills").getByRole("button", { name: "Dauntless", exact: true });
  await expect(skill).toBeEnabled({ timeout: 15_000 });
  await skill.click();
  await expect(skill).toHaveAttribute("aria-pressed", "true");
  const basic = dock.locator(`[data-hand-card-id="${game.basic.id}"] .game-card`);
  await expect(basic).toBeEnabled();
  await basic.click();
  const confirm = dock.locator('[data-action-slot="primary"] button.primary');
  await expect(confirm).toHaveText("Confirm");
  const responsePromise = page.waitForResponse((response) => response.url() === `${API}/api/rooms`
    && response.request().method() === "POST"
    && response.request().postDataJSON()?.providerId === "yue_jin_dauntless");
  await confirm.click();
  const response = await responsePromise;
  expect(response.ok()).toBeTruthy();
  expect(response.request().postDataJSON()).toMatchObject({
    action: "trigger", code: game.code, token: yue.token,
    providerId: "yue_jin_dauntless", cardIds: [game.basic.id],
  });
  return response.json();
}

async function captureNoticeLayout(page, notice, testInfo, viewport) {
  await page.setViewportSize({ width: viewport.width, height: viewport.height });
  await expect(notice).toBeVisible();
  const measured = await page.evaluate(() => {
    const rect = (element) => {
      const box = element.getBoundingClientRect();
      return { x: box.x, y: box.y, width: box.width, height: box.height, right: box.right, bottom: box.bottom };
    };
    const intersects = (a, b) => a.x < b.x + b.width && a.x + a.width > b.x
      && a.y < b.y + b.height && a.y + a.height > b.y;
    const notice = document.querySelector(".effect-notice");
    const safe = document.querySelector(".interaction-safe-zone");
    const selectors = [
      ".opponent-player-card",
      ".interaction-stage [role=img]",
      ".interaction-stage header",
      ".interaction-stage-event-summary",
      ".interaction-stage-current-effect-flow",
      ".play-center",
      ".played-card-stage",
      ".game-event-stage",
      ".stage-system-cluster",
      ".stage-system-menu",
      ".console-guidance",
      ".local-player-dock .turn-controls",
      ".local-player-dock [data-hand-card-id]",
      ".local-player-dock [data-equipment-id]",
    ];
    const obstacles = selectors.flatMap((selector) => [...document.querySelectorAll(selector)]
      .filter((element) => {
        const box = element.getBoundingClientRect();
        const style = getComputedStyle(element);
        return box.width > 0 && box.height > 0 && style.visibility !== "hidden" && style.display !== "none";
      })
      .map((element) => ({ selector, label: (element.getAttribute("aria-label") || element.textContent || "").trim().slice(0, 90), rect: rect(element) })));
    const noticeRect = rect(notice);
    const safeRect = rect(safe);
    const center = document.elementFromPoint(noticeRect.x + noticeRect.width / 2, noticeRect.y + noticeRect.height / 2);
    return {
      viewport: { width: innerWidth, height: innerHeight, scrollWidth: document.documentElement.scrollWidth, scrollHeight: document.documentElement.scrollHeight },
      notice: {
        rect: noticeRect,
        safeZone: safeRect,
        heading: notice.querySelector("span")?.textContent,
        message: notice.querySelector("b")?.textContent,
        textScrollWidth: notice.scrollWidth,
        textClientWidth: notice.clientWidth,
        pointerEvents: getComputedStyle(notice).pointerEvents,
        animationName: getComputedStyle(notice).animationName,
        hitTestResult: center ? `${center.tagName.toLowerCase()}${center.id ? `#${center.id}` : ""}${typeof center.className === "string" && center.className ? `.${center.className.trim().replace(/\s+/g, ".")}` : ""}` : null,
        hitTestCapturedByNotice: Boolean(center && notice.contains(center)),
      },
      obstacles,
      collisions: obstacles.filter((obstacle) => intersects(noticeRect, obstacle.rect)),
    };
  });
  console.log(`EFFECT_NOTICE_LAYOUT ${viewport.name} ${JSON.stringify({ notice: measured.notice.rect, safeZone: measured.notice.safeZone, collisions: measured.collisions })}`);
  const screenshot = testInfo.outputPath(`effect-notice-${viewport.name}.png`);
  await page.screenshot({ path: screenshot, animations: "disabled" });
  await testInfo.attach(`effect-notice-${viewport.name}`, { path: screenshot, contentType: "image/png" });
  const geometryPath = testInfo.outputPath(`effect-notice-${viewport.name}-geometry.json`);
  writeFileSync(geometryPath, JSON.stringify(measured, null, 2));
  await testInfo.attach(`effect-notice-${viewport.name}-geometry`, { path: geometryPath, contentType: "application/json" });
  expect(measured.viewport.scrollWidth).toBeLessThanOrEqual(viewport.width);
  expect(measured.notice.rect.width).toBeLessThanOrEqual(320);
  expect(measured.notice.rect.x).toBeGreaterThanOrEqual(measured.notice.safeZone.x);
  expect(measured.notice.rect.right).toBeLessThanOrEqual(measured.notice.safeZone.right);
  expect(measured.notice.rect.y).toBeGreaterThanOrEqual(measured.notice.safeZone.y);
  expect(measured.notice.rect.bottom).toBeLessThanOrEqual(measured.notice.safeZone.bottom);
  expect(measured.notice.pointerEvents).toBe("none");
  expect(measured.notice.hitTestCapturedByNotice).toBe(false);
  expect(measured.collisions, JSON.stringify(measured.collisions, null, 2)).toEqual([]);
  return measured;
}

async function latestEffectNotice(request, game, index) {
  const projection = await roomView(request, game, index);
  const events = projection.timeline.filter((event) => event.type === "message" && event.effectNotice === true);
  const event = events.at(-1);
  expect(event?.id).toBeTruthy();
  expect(projection.timeline.filter((candidate) => candidate.id === event.id)).toHaveLength(1);
  return { projection, event };
}

async function waitForEffectNotice(page, event) {
  const notice = page.locator(".effect-notice");
  await expect(notice).toBeVisible({ timeout: 10_000 });
  await expect(notice).toHaveAttribute("data-effect-notice-event-id", event.id);
  await expect(notice.locator("b")).toHaveText(event.message);
  return notice;
}

async function nextRoomPoll(page) {
  const response = await page.waitForResponse((candidate) => candidate.url().startsWith(`${API}/api/rooms?`)
    && candidate.request().method() === "GET", { timeout: 1_700 });
  expect(response.ok()).toBeTruthy();
  return response;
}

test("real Dauntless equipment settlement keeps one compact, non-blocking event notice at four viewport sizes", async ({ page, browser, request }, testInfo) => {
  test.setTimeout(120_000);
  const basic = card("Peach", "effect-notice-equipment-dauntless-cost", "♥");
  const weapon = card("ZhugeCrossbow", "effect-notice-equipment-target");
  const game = await seedRoom(request, {
    targetEquipment: { weapon },
    yueHand: [basic],
    roomLabel: "effect-notice-no-damage",
  });
  game.basic = basic;
  await beginDauntless(request, game);

  const sima = await openPlayer(page, game, 0, viewports[0]);
  const yuePage = await browser.newPage();
  try {
    await openPlayer(yuePage, game, 1, { width: 390, height: 844 });
    const eventPromise = (async () => {
      const activated = await activateDauntless(yuePage, request, game);
      return activated;
    })();
    const activated = await eventPromise;
    const { projection, event } = await latestEffectNotice(request, game, 0);
    expect(projection.currentAction).toMatchObject({ kind: "trigger", actorId: sima.id, triggerEvent: "turn_end" });
    const equipmentChoice = projection.currentAction.triggerOptions.find((option) => option.effectId === "yue_jin_dauntless");
    expect(equipmentChoice?.selection).toMatchObject({ type: "target_cards", targetId: sima.id, eligibleKeys: [weapon.id] });
    expect(projection.players.find((player) => player.id === sima.id).hp).toBe(4);
    expect(projection.currentAction.triggerOptions.some((option) => option.effectId === "sima_yi_fankui")).toBe(false);
    expect(activated.room.timeline.some((candidate) => candidate.id === event.id)).toBe(true);

    const notice = await waitForEffectNotice(page, event);
    const firstRenderedAt = await page.evaluate(() => performance.now());
    const geometry = [];
    for (const viewport of viewports) geometry.push(await captureNoticeLayout(page, notice, testInfo, viewport));
    expect(geometry.map((item) => item.viewport.width)).toEqual(viewports.map((viewport) => viewport.width));

    // Make a genuine, target-owned selection while the notice is still active.
    await page.setViewportSize({ width: 390, height: 844 });
    const dock = page.locator(`.local-player-dock[data-player-anchor="${sima.id}"]`);
    const equipmentButton = dock.locator(`[data-equipment-id="${weapon.id}"] .local-zone-card-button`);
    await expect(equipmentButton).toBeEnabled();
    await equipmentButton.click();
    await expect(equipmentButton).toHaveAttribute("aria-pressed", "true");
    const confirm = dock.locator('[data-action-slot="primary"] button.primary');
    await expect(confirm).toHaveText("Confirm");

    for (let poll = 0; poll < 2; poll += 1) {
      await nextRoomPoll(page);
      const repeatedProjection = await roomView(request, game, 0);
      expect(repeatedProjection.timeline.some((candidate) => candidate.id === event.id && candidate.effectNotice === true)).toBe(true);
      await expect(notice).toHaveAttribute("data-effect-notice-event-id", event.id);
    }

    const settlementPromise = page.waitForResponse((response) => response.url() === `${API}/api/rooms`
      && response.request().method() === "POST"
      && response.request().postDataJSON()?.providerId === "yue_jin_dauntless");
    await confirm.click();
    const settlement = await settlementPromise;
    expect(settlement.ok()).toBeTruthy();
    expect(settlement.request().postDataJSON()).toMatchObject({
      action: "trigger", providerId: "yue_jin_dauntless", cardKeys: [weapon.id],
    });
    const settledProjection = await roomView(request, game, 0);
    expect(settledProjection.players.find((player) => player.id === sima.id).hp).toBe(4);
    expect(settledProjection.players.find((player) => player.id === sima.id).equipmentCards).toHaveLength(0);
    expect(settledProjection.currentAction?.triggerOptions?.some((option) => option.effectId === "sima_yi_fankui") ?? false).toBe(false);

    await expect(notice).toHaveClass(/is-exiting/, { timeout: 700 });
    await expect.poll(() => notice.evaluate((element) => Number(getComputedStyle(element).opacity)), { timeout: 300 }).toBeLessThan(0.8);
    await expect(notice).toBeHidden({ timeout: 500 });
    const visibleDuration = await page.evaluate((start) => performance.now() - start, firstRenderedAt);
    expect(visibleDuration).toBeGreaterThanOrEqual(2_050);
    expect(visibleDuration).toBeLessThan(3_100);

    // Reloading into a clean room must not replay the old room's latest notice.
    const cleanRoom = await seedRoom(request, {
      yueHand: [],
      roomLabel: "effect-notice-room-switch",
    });
    await page.evaluate(({ key, nextSession }) => {
      sessionStorage.setItem(key, JSON.stringify(nextSession));
    }, {
      key: SESSION_OVERRIDE_KEY,
      nextSession: { code: cleanRoom.code, token: cleanRoom.players[0].token, name: cleanRoom.players[0].name },
    });
    await page.reload();
    await expect(page.locator(".game-shell .room b")).toHaveText(cleanRoom.code);
    await expect(page.locator(".effect-notice")).toHaveCount(0);
  } finally {
    await yuePage.close();
  }
});

test("real Dauntless damage offers Sima Yi Retaliation and a second event replaces the notice in reduced motion", async ({ page, browser, request }, testInfo) => {
  const basic = card("Peach", "effect-notice-retaliation-dauntless-cost", "♥");
  const hiddenYueCard = card("Dodge", "effect-notice-retaliation-hidden-yue-card", "♣");
  const weapon = card("ZhugeCrossbow", "effect-notice-retaliation-yue-weapon");
  const game = await seedRoom(request, {
    yueHand: [basic, hiddenYueCard],
    yueEquipment: { weapon },
    roomLabel: "effect-notice-retaliation",
  });
  game.basic = basic;
  await beginDauntless(request, game);
  const sima = await openPlayer(page, game, 0, { width: 440, height: 956 }, true);
  const yuePage = await browser.newPage();
  try {
    await openPlayer(yuePage, game, 1, { width: 390, height: 844 });
    const activated = await activateDauntless(yuePage, request, game);
    const { projection, event: dauntlessNotice } = await latestEffectNotice(request, game, 0);
    expect(projection.players.find((player) => player.id === sima.id).hp).toBe(3);
    expect(projection.currentAction).toMatchObject({ kind: "trigger", actorId: sima.id });
    const retaliation = projection.currentAction.triggerOptions.find((option) => option.effectId === "sima_yi_fankui");
    expect(retaliation?.selection).toMatchObject({ type: "target_cards", targetId: game.players[1].id });
    expect(retaliation.selection.eligibleKeys).toContain(weapon.id);
    expect(JSON.stringify(projection.currentAction)).not.toContain(hiddenYueCard.id);
    expect(activated.room.timeline.some((candidate) => candidate.id === dauntlessNotice.id)).toBe(true);

    const dock = page.locator(`.local-player-dock[data-player-anchor="${sima.id}"]`);
    const skill = dock.locator(".local-hero-skills").getByRole("button", { name: "Retaliation", exact: true });
    await expect(skill).toBeEnabled();
    const notice = await waitForEffectNotice(page, dauntlessNotice);
    const dauntlessGeometry = await captureNoticeLayout(page, notice, testInfo, { name: "retaliation-440x956", width: 440, height: 956 });
    expect(dauntlessGeometry.notice.animationName).toBe("none");
    await skill.click();
    const dialog = page.getByRole("dialog", { name: "Retaliation target card selection" });
    await expect(dialog).toBeVisible();
    const publicWeapon = dialog.getByRole("button", { name: "Equipment: Zhuge Crossbow", exact: true });
    await publicWeapon.click();
    await expect(publicWeapon).toHaveAttribute("aria-pressed", "true");
    const useRetaliationPromise = page.waitForResponse((response) => response.url() === `${API}/api/rooms`
      && response.request().method() === "POST"
      && response.request().postDataJSON()?.providerId === "sima_yi_fankui");
    await dialog.getByRole("button", { name: "Use Retaliation", exact: true }).click();
    const useRetaliation = await useRetaliationPromise;
    expect(useRetaliation.ok()).toBeTruthy();
    expect(useRetaliation.request().postDataJSON()).toMatchObject({
      action: "trigger", code: game.code, token: sima.token, providerId: "sima_yi_fankui", cardKeys: [weapon.id],
    });
    const retaliationResult = await useRetaliation.json();
    expect(retaliationResult.room.myHand.map((held) => held.id)).toContain(weapon.id);
    const retaliationNotice = await latestEffectNotice(request, game, 0);
    expect(retaliationNotice.event.id).not.toBe(dauntlessNotice.id);
    expect(retaliationNotice.event.effectNotice).toBe(true);
    expect(retaliationResult.room.timeline.filter((candidate) => candidate.id === retaliationNotice.event.id)).toHaveLength(1);
    const replacement = page.locator(".effect-notice");
    await expect(replacement).toHaveCount(1);
    await expect(replacement).toBeVisible({ timeout: 10_000 });
    await expect(replacement).toHaveAttribute("data-effect-notice-event-id", retaliationNotice.event.id);
    await expect(replacement.locator("b")).toHaveText(retaliationNotice.event.message);
    expect(await replacement.evaluate((element) => getComputedStyle(element).animationName)).toBe("none");

    // Switching the viewing session to another room clears the in-flight notice and never replays it.
    const cleanRoom = await seedRoom(request, {
      yueHand: [], roomLabel: "effect-notice-retaliation-room-switch",
    });
    await page.evaluate(({ key, nextSession }) => sessionStorage.setItem(key, JSON.stringify(nextSession)), {
      key: SESSION_OVERRIDE_KEY,
      nextSession: { code: cleanRoom.code, token: cleanRoom.players[0].token, name: cleanRoom.players[0].name },
    });
    await page.reload();
    await expect(page.locator(".game-shell .room b")).toHaveText(cleanRoom.code);
    await expect(page.locator(".effect-notice")).toHaveCount(0);
  } finally {
    await yuePage.close();
  }
});
