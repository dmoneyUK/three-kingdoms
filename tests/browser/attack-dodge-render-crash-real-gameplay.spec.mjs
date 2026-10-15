import { expect, test } from "@playwright/test";

const API = "http://127.0.0.1:3137";
const card = (kind, id, suit = "♠") => ({ id, kind, suit, rank: "7" });

async function seed(request, dodge) {
  const attack = card("Attack", `p0-${dodge ? "dodge" : "skip"}-attack`);
  const responseCard = dodge ? card("Dodge", "p0-dodge-response", "♣") : null;
  const result = await request.post(`${API}/__test/seed-playing-game`, {
    data: {
      phase: "play",
      turnSeat: 0,
      players: [
        { name: "ATTACKER", role: "Lord", hero: "cao-cao", hp: 4, maxHp: 4, hand: [attack, card("Negation", "private-attackers-hidden-negation", "♦")] },
        { name: "DEFENDER", role: "Loyalist", hero: "liu-bei", hp: 4, maxHp: 4, hand: responseCard ? [responseCard] : [] },
        { name: "THIRD PLAYER", role: "Rebel", hero: "sun-quan", hp: 4, maxHp: 4, hand: [] },
        { name: "FOURTH PLAYER", role: "Renegade", hero: "simayi", hp: 4, maxHp: 4, hand: [] },
      ],
    },
  });
  if (!result.ok()) throw new Error(`Attack/Dodge room seed failed: ${await result.text()}`);
  return { ...(await result.json()), attack, responseCard };
}

async function openPlayer(page, room, index) {
  const player = room.players[index];
  await page.setViewportSize({ width: 440, height: 894 });
  await page.addInitScript(({ code, token, name }) => {
    localStorage.setItem("three-realms-session", JSON.stringify({ code, token, name }));
  }, { code: room.code, token: player.token, name: player.name });
  await page.goto(`${API}/`);
  await expect(page.locator(".game-shell")).toBeVisible();
  return player;
}

async function watchPublicCardPhases(page, cardId) {
  await page.addInitScript((watchedCardId) => {
    const seen = new Set();
    window.__publicCardPhaseLog = [];
    const capture = () => {
      for (const element of document.querySelectorAll("[data-public-card-journey-card-id][data-public-card-journey-phase]")) {
        if (element.getAttribute("data-public-card-journey-card-id") !== watchedCardId) continue;
        const phase = element.getAttribute("data-public-card-journey-phase");
        const key = `${watchedCardId}:${phase}`;
        if (seen.has(key)) continue;
        seen.add(key);
        const rect = element.getBoundingClientRect();
        window.__publicCardPhaseLog.push({ cardId: watchedCardId, phase, at: performance.now(), width: rect.width, height: rect.height });
      }
    };
    const observer = new MutationObserver(capture);
    const start = () => {
      if (!document.documentElement) return;
      observer.observe(document.documentElement, { attributes: true, childList: true, subtree: true, attributeFilter: ["data-public-card-journey-phase"] });
      capture();
    };
    start();
    document.addEventListener("DOMContentLoaded", start, { once: true });
  }, cardId);
}

function watchErrors(page) {
  const boundaryErrors = [];
  const runtimeErrors = [];
  page.on("console", (message) => {
    if (message.type() === "error" && message.text().includes("[GameRoom render failure]")) {
      boundaryErrors.push(message.text());
    }
  });
  page.on("pageerror", (error) => runtimeErrors.push(`${error.name}: ${error.message}`));
  return { boundaryErrors, runtimeErrors };
}

async function playAttack({ page, room, attacker, defender, attack }) {
  const dock = page.locator(`.local-player-dock[data-player-anchor="${attacker.id}"]`);
  const attackCard = dock.locator(`[data-hand-card-id="${attack.id}"] .game-card`);
  await expect(attackCard).toBeEnabled();
  await attackCard.click();
  await page.getByRole("button", { name: `Select ${defender.name}`, exact: true }).click();
  const confirm = dock.locator('[data-console-surface="local-operation"] button.primary');
  await expect(confirm).toBeEnabled();
  const submitted = page.waitForResponse((response) => response.url() === `${API}/api/rooms`
    && response.request().method() === "POST"
    && response.request().postDataJSON()?.action === "play_card");
  await confirm.click();
  const response = await submitted;
  expect(response.ok()).toBeTruthy();
  expect(response.request().postDataJSON()).toMatchObject({
    action: "play_card", code: room.code, token: attacker.token, cardId: attack.id, targetId: defender.id,
  });
}

async function assertJourneyMounted(page, rootCardId) {
  const display = page.locator('.public-card-display[data-public-card-motion="attack-dodge"]');
  await expect(display).toBeVisible({ timeout: 20_000 });
  await expect(display).toHaveAttribute("data-public-card-id", rootCardId);
  await expect(display.locator(".public-card-journey-card")).toHaveCount(1);
  await expect(display.locator('[data-public-card-announcement="true"]')).toHaveCount(1);
  await expect(display.locator("svg")).toHaveCount(0);
  await expect(page.getByText("GAME SCREEN ERROR")).toHaveCount(0);
  return display;
}

async function assertAnnouncementAboveCurrentCard(display, eventId) {
  const announcement = display.locator('[data-public-card-announcement="true"]');
  await expect(announcement).toBeVisible();
  await expect(announcement).toHaveAttribute("data-public-card-copy-anchor-event-id", eventId);
  await expect(announcement.locator("small,span,strong")).toHaveCount(0);
  const measure = () => display.evaluate((root, selectedEventId) => {
    const message = root.querySelector('[data-public-card-announcement="true"]');
    const card = [...root.querySelectorAll("[data-public-card-copy-anchor-event-id]")]
      .find((element) => element !== message && element.getAttribute("data-public-card-copy-anchor-event-id") === selectedEventId);
    if (!message || !card) return null;
    const box = (element) => {
      const rect = element.getBoundingClientRect();
      return { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom, width: rect.width, height: rect.height };
    };
    const messageBox = box(message);
    const cardBox = box(card);
    const obstacles = [...document.querySelectorAll(".opponent-player-card,.visible-countdown,.stage-system-cluster,.local-player-dock,.decision-status,.public-card-journey-card")]
      .filter((element) => element !== card && element !== message)
      .filter((element) => getComputedStyle(element).display !== "none" && getComputedStyle(element).visibility !== "hidden")
      .map((element) => box(element));
    return {
      message: messageBox,
      card: cardBox,
      viewport: { width: document.documentElement.clientWidth, height: document.documentElement.clientHeight },
      overlaps: obstacles.filter((obstacle) => messageBox.left < obstacle.right && messageBox.right > obstacle.left
        && messageBox.top < obstacle.bottom && messageBox.bottom > obstacle.top),
      liveStatusCount: root.querySelectorAll('[role="status"][aria-live="polite"]').length,
      positioned: message.getAttribute("data-public-card-announcement-positioned"),
    };
  }, eventId);
  let latestGeometry = null;
  try {
    await expect.poll(async () => {
      latestGeometry = await measure();
      return Boolean(latestGeometry && latestGeometry.message.bottom <= latestGeometry.card.top - 5);
    }, { timeout: 3_000 }).toBe(true);
  } catch (error) {
    throw new Error(`${error.message}\nLatest public-card announcement geometry: ${JSON.stringify(latestGeometry)}`);
  }
  const geometry = await measure();
  expect(geometry).not.toBeNull();
  expect(geometry.positioned).toBe("true");
  expect(geometry.message.left).toBeGreaterThanOrEqual(8);
  expect(geometry.message.right).toBeLessThanOrEqual(geometry.viewport.width - 8);
  expect(geometry.message.bottom).toBeLessThanOrEqual(geometry.card.top - 5);
  expect(geometry.overlaps).toEqual([]);
  expect(geometry.liveStatusCount).toBe(1);
  return geometry;
}

test("Attack and Dodge mount the card journey and settle without a GameRoom crash at 440x894", async ({ browser, page, request }, testInfo) => {
  test.setTimeout(90_000);
  const room = await seed(request, true);
  await page.emulateMedia({ reducedMotion: "reduce" });
  const reducedMotion = await page.evaluate(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  const attackerPage = await browser.newPage({ viewport: { width: 440, height: 894 } });
  const attackerErrors = watchErrors(attackerPage);
  const defenderErrors = watchErrors(page);
  const attacker = await openPlayer(attackerPage, room, 0);
  await watchPublicCardPhases(page, room.attack.id);
  const defender = await openPlayer(page, room, 1);

  await playAttack({ page: attackerPage, room, attacker, defender, attack: room.attack });
  await assertJourneyMounted(attackerPage, room.attack.id);
  const defenderDisplay = await assertJourneyMounted(page, room.attack.id);
  const attackEventId = await defenderDisplay.getAttribute("data-public-card-event-id");
  expect(attackEventId).toBeTruthy();
  const standardGeometry = await assertAnnouncementAboveCurrentCard(defenderDisplay, attackEventId);
  await testInfo.attach("attack-announcement-440x894.json", {
    body: JSON.stringify(standardGeometry, null, 2),
    contentType: "application/json",
  });
  await testInfo.attach("attack-announcement-440x894.png", {
    body: await page.screenshot({ animations: "disabled" }),
    contentType: "image/png",
  });
  expect(await defenderDisplay.getAttribute("data-public-card-root-event-id")).toBeTruthy();
  const attackCardJourney = defenderDisplay.locator(`[data-public-card-journey-card-id="${room.attack.id}"]`);
  await expect(attackCardJourney).toHaveAttribute("data-public-card-journey-phase", "reveal");
  await expect(attackCardJourney).toBeDisabled();
  await expect(attackCardJourney).toHaveAttribute("data-public-card-inspectable", "false");
  await page.setViewportSize({ width: 390, height: 700 });
  const shortViewportGeometry = await assertAnnouncementAboveCurrentCard(defenderDisplay, attackEventId);
  await testInfo.attach("attack-announcement-390x700.json", {
    body: JSON.stringify(shortViewportGeometry, null, 2),
    contentType: "application/json",
  });
  await testInfo.attach("attack-announcement-390x700.png", {
    body: await page.screenshot({ animations: "disabled" }),
    contentType: "image/png",
  });
  await page.setViewportSize({ width: 440, height: 894 });
  await page.waitForFunction((cardId) => window.__publicCardPhaseLog?.some((entry) => entry.cardId === cardId && (entry.phase === "move" || entry.phase === "parked")), room.attack.id, { timeout: 8_000 });
  const phaseTiming = await page.evaluate((cardId) => {
    const entries = window.__publicCardPhaseLog.filter((entry) => entry.cardId === cardId);
    return {
      reveal: entries.find((entry) => entry.phase === "reveal"),
      move: entries.find((entry) => entry.phase === "move"),
      parked: entries.find((entry) => entry.phase === "parked"),
    };
  }, room.attack.id);
  expect(phaseTiming.reveal).toMatchObject({ width: 90, height: 135 });
  const revealElapsed = (reducedMotion ? phaseTiming.parked : phaseTiming.move).at - phaseTiming.reveal.at;
  expect(revealElapsed).toBeGreaterThanOrEqual(3_800);
  expect(revealElapsed).toBeLessThan(4_800);
  if (reducedMotion) expect(phaseTiming.move).toBeUndefined();
  else expect(phaseTiming.move).toBeTruthy();

  const defenderDock = page.locator(`.local-player-dock[data-player-anchor="${defender.id}"]`);
  const dodge = defenderDock.locator(`[data-hand-card-id="${room.responseCard.id}"] .game-card`);
  await expect(dodge).toBeEnabled({ timeout: 20_000 });
  const takeDamage = defenderDock.locator('[data-action-slot="decline"] button');
  await expect(takeDamage).toHaveText("TAKE DAMAGE");
  await expect(takeDamage).toBeVisible();
  await expect(takeDamage).toBeEnabled();
  await expect(attackCardJourney).toHaveAttribute("data-public-card-journey-phase", "parked", { timeout: 8_000 });
  await expect(attackCardJourney).toBeEnabled();
  await expect(attackCardJourney).toHaveAttribute("data-public-card-inspectable", "true");
  await attackCardJourney.click();
  const details = page.getByRole("dialog");
  await expect(details).toHaveAttribute("data-card-details-context", "public-zone");
  await expect(details).toHaveAttribute("data-card-details-card-id", room.attack.id);
  await expect(details.locator(".card-details-illustration .card-name-mark")).toContainText("Attack");
  await expect(details.getByRole("heading", { name: /Attack/ })).toHaveCount(1);
  await expect(details.locator(".card-details-copy > h2:not(.card-details-sr-only)")).toHaveCount(0);
  await expect(details.getByRole("textbox", { name: "Canonical rules for Attack" })).toHaveValue(/.+/);
  await expect(details.locator(".card-details-illustration .played-card")).toBeVisible();
  await expect(page.locator(".card-info-backdrop")).toHaveCount(0);
  await expect(dodge).toBeVisible();
  await expect(dodge).toBeEnabled();
  await expect(takeDamage).toHaveText("TAKE DAMAGE");
  await expect(takeDamage).toBeVisible();
  await expect(takeDamage).toBeEnabled();
  expect(await page.locator("body").innerHTML()).not.toContain("private-attackers-hidden-negation");
  const detailsGeometry = await details.evaluate((element) => {
    const panel = element.getBoundingClientRect();
    const stageElement = element.parentElement;
    const stage = stageElement.getBoundingClientRect();
    const table = element.closest(".play-table").getBoundingClientRect();
    return {
      panel: { left: panel.left, right: panel.right, top: panel.top, bottom: panel.bottom },
      stage: { left: stage.left, right: stage.right, top: stage.top, bottom: stage.bottom },
      table: { left: table.left, right: table.right },
      stagePointerEvents: getComputedStyle(stageElement).pointerEvents,
      panelPointerEvents: getComputedStyle(element).pointerEvents,
    };
  });
  expect(detailsGeometry.panel.left).toBeGreaterThanOrEqual(detailsGeometry.stage.left - 1);
  expect(detailsGeometry.panel.right).toBeLessThanOrEqual(detailsGeometry.stage.right + 1);
  expect(detailsGeometry.panel.top).toBeGreaterThanOrEqual(detailsGeometry.stage.top - 1);
  expect(detailsGeometry.panel.bottom).toBeLessThanOrEqual(detailsGeometry.stage.bottom + 1);
  expect(detailsGeometry.panel.left).toBeGreaterThanOrEqual(detailsGeometry.table.left - 1);
  expect(detailsGeometry.panel.right).toBeLessThanOrEqual(detailsGeometry.table.right + 1);
  expect(detailsGeometry.stagePointerEvents).toBe("none");
  expect(detailsGeometry.panelPointerEvents).toBe("auto");
  await dodge.click();
  await expect(dodge).toHaveClass(/selected/);
  const confirm = defenderDock.locator('[data-action-slot="primary"] button.primary');
  await expect(confirm).toHaveText("Confirm");
  await expect(confirm).toBeEnabled();
  await expect(details).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(details).toHaveCount(0);
  await expect(attackCardJourney).toBeFocused();
  const dodgeSubmission = page.waitForResponse((response) => response.url() === `${API}/api/rooms`
    && response.request().method() === "POST"
    && response.request().postDataJSON()?.action === "respond");
  await confirm.click();
  const dodgeResponse = await dodgeSubmission;
  expect(dodgeResponse.ok()).toBeTruthy();
  expect(dodgeResponse.request().postDataJSON()).toMatchObject({
    action: "respond", code: room.code, token: defender.token, cardId: room.responseCard.id,
  });
  await expect(defenderDisplay).toHaveAttribute("data-public-card-settlement-outcome", "ATTACK_BLOCKED_BY_DODGE", { timeout: 20_000 });
  const settledAnnouncement = defenderDisplay.locator('[data-public-card-announcement="true"]');
  await expect(settledAnnouncement).toContainText(/DEFENDER dodged ATTACKER's Attack/);
  await expect(settledAnnouncement).toHaveAttribute("data-public-card-result", "ATTACK_BLOCKED_BY_DODGE");
  const dodgeCardJourney = defenderDisplay.locator(`[data-public-card-journey-card-id="${room.responseCard.id}"]`);
  await expect(dodgeCardJourney).toHaveAttribute("data-public-card-journey-phase", "parked", { timeout: 12_000 });
  await expect(dodgeCardJourney).toBeEnabled();
  await dodgeCardJourney.click();
  await expect(details).toHaveAttribute("data-card-details-card-id", room.responseCard.id);
  await expect(details.locator(".card-details-illustration .card-name-mark")).toContainText("Dodge");
  await expect(details.getByRole("heading", { name: /Dodge/ })).toHaveCount(1);
  await expect(details.locator(".card-details-copy > h2:not(.card-details-sr-only)")).toHaveCount(0);
  await expect(details.getByRole("textbox", { name: "Canonical rules for Dodge" })).toHaveValue(/.+/);
  await attackCardJourney.click();
  await expect(details).toHaveAttribute("data-card-details-card-id", room.attack.id);
  await expect(details.locator(".card-details-illustration .card-name-mark")).toContainText("Attack");
  await expect(details.getByRole("heading", { name: /Attack/ })).toHaveCount(1);
  await expect(details.locator(".card-details-copy > h2:not(.card-details-sr-only)")).toHaveCount(0);
  await details.getByRole("button", { name: "Close card details" }).click();
  await expect(details).toHaveCount(0);
  await expect(attackCardJourney).toBeFocused();

  const settled = await dodgeResponse.json();
  expect(settled.room.players.find((player) => player.id === defender.id)?.hp).toBe(4);
  expect(settled.room.timeline.filter((event) => event.type === "card" && event.card?.id === room.attack.id)).toHaveLength(1);
  expect(settled.room.timeline.filter((event) => event.type === "card" && event.card?.id === room.responseCard.id)).toHaveLength(1);
  await expect(attackerPage.getByText("GAME SCREEN ERROR")).toHaveCount(0);
  await expect(page.getByText("GAME SCREEN ERROR")).toHaveCount(0);
  expect(attackerErrors.boundaryErrors).toEqual([]);
  expect(attackerErrors.runtimeErrors).toEqual([]);
  expect(defenderErrors.boundaryErrors).toEqual([]);
  expect(defenderErrors.runtimeErrors).toEqual([]);
  await attackerPage.close();
});

test("skipping Attack response shows only server-proven damage at 440x894", async ({ browser, page, request }) => {
  test.setTimeout(60_000);
  const room = await seed(request, false);
  const attackerPage = await browser.newPage({ viewport: { width: 440, height: 894 } });
  const attackerErrors = watchErrors(attackerPage);
  const defenderErrors = watchErrors(page);
  const attacker = room.players[0];
  const defender = room.players[1];
  await openPlayer(attackerPage, room, 0);
  await openPlayer(page, room, 1);
  await playAttack({ page: attackerPage, room, attacker, defender, attack: room.attack });
  await assertJourneyMounted(attackerPage, room.attack.id);
  const display = await assertJourneyMounted(page, room.attack.id);
  const defenderDock = page.locator(`.local-player-dock[data-player-anchor="${defender.id}"]`);
  await expect.poll(async () => defenderDock.getAttribute("data-player-anchor")).toBe(defender.id);

  const takeDamage = defenderDock.locator('[data-action-slot="decline"] button');
  await expect(takeDamage).toHaveText("TAKE DAMAGE", { timeout: 20_000 });
  await expect(takeDamage).toBeEnabled();
  const submitted = page.waitForResponse((response) => response.url() === `${API}/api/rooms`
    && response.request().method() === "POST"
    && response.request().postDataJSON()?.action === "decline_response");
  await takeDamage.click();
  const response = await submitted;
  expect(response.ok()).toBeTruthy();
  expect(response.request().postDataJSON()).toMatchObject({ action: "decline_response", code: room.code, token: defender.token });
  await expect.poll(async () => {
    const view = await request.get(`${API}/api/rooms?code=${room.code}&token=${defender.token}`);
    const projected = await view.json();
    return projected.players.find((player) => player.id === defender.id)?.hp;
  }, { timeout: 20_000 }).toBe(3);
  await expect(display).toHaveAttribute("data-public-card-settlement-outcome", "ATTACK_DAMAGE_APPLIED", { timeout: 20_000 });
  const damageAnnouncement = display.locator('[data-public-card-announcement="true"]');
  await expect(damageAnnouncement).toContainText(`${defender.name} took damage from ${attacker.name}'s Attack.`);
  await expect(damageAnnouncement).toHaveAttribute("data-public-card-result", "ATTACK_DAMAGE_APPLIED");
  await expect(damageAnnouncement.locator("small,span,strong")).toHaveCount(0);
  await expect(attackerPage.getByText("GAME SCREEN ERROR")).toHaveCount(0);
  await expect(page.getByText("GAME SCREEN ERROR")).toHaveCount(0);
  expect(attackerErrors.boundaryErrors).toEqual([]);
  expect(attackerErrors.runtimeErrors).toEqual([]);
  expect(defenderErrors.boundaryErrors).toEqual([]);
  expect(defenderErrors.runtimeErrors).toEqual([]);
  await attackerPage.close();
});

test("authorized Quick Test viewers switch manually at 440x894", async ({ page, request }) => {
  test.setTimeout(90_000);
  const hostName = "ATTACK DODGE VIEWER TEST";
  const create = await request.post(`${API}/api/rooms`, { data: { action: "create", name: hostName } });
  expect(create.status()).toBe(201);
  const created = await create.json();
  const { code, token } = { code: created.room.code, token: created.token };
  const post = async (action, values = {}) => {
    const response = await request.post(`${API}/api/rooms`, { data: { action, code, token, ...values } });
    if (!response.ok()) throw new Error(`${action} failed: ${await response.text()}`);
    return (await response.json()).room;
  };
  let room = await post("add_test_players");
  room = await post("enable_test_room");
  room = await post("configure_test_hands", { presetId: "duel_chain", expectedRevision: 0 });
  room = await post("start");
  while (room.status === "heroes") {
    const candidate = room.myHeroOptions[0];
    expect(candidate).toBeTruthy();
    room = await post("choose_hero", { heroId: candidate.id });
  }
  expect(room.isTestController).toBe(true);
  const host = room.players.find((player) => player.isHost);
  const testPlayer = room.players.find((player) => player.isTestPlayer && player.id !== host.id);
  expect(testPlayer).toBeTruthy();

  await page.setViewportSize({ width: 440, height: 894 });
  await page.addInitScript(({ roomCode, sessionToken, name }) => {
    localStorage.setItem("three-realms-session", JSON.stringify({ code: roomCode, token: sessionToken, name }));
  }, { roomCode: code, sessionToken: token, name: hostName });
  const errors = watchErrors(page);
  await page.goto(`${API}/`);
  await expect(page.locator(".game-shell")).toBeVisible();

  const toTestPlayer = page.getByTestId(`test-view-switch-${testPlayer.id}`);
  await expect(toTestPlayer).toHaveText("SWITCH");
  const switchedToTestPlayer = page.waitForResponse((response) => response.request().method() === "GET"
    && response.url().startsWith(`${API}/api/rooms?`)
    && new URL(response.url()).searchParams.get("testViewerId") === testPlayer.id);
  await toTestPlayer.click();
  const testProjection = await switchedToTestPlayer;
  expect(testProjection.ok()).toBeTruthy();
  const testProjectionBody = await testProjection.json();
  expect((testProjectionBody.room ?? testProjectionBody).meId).toBe(testPlayer.id);
  await expect(page.locator(`.local-player-dock[data-player-anchor="${testPlayer.id}"]`)).toBeVisible();

  const toHost = page.getByTestId(`test-view-switch-${host.id}`);
  await expect(toHost).toHaveText("SWITCH");
  const switchedToHost = page.waitForResponse((response) => response.request().method() === "GET"
    && response.url().startsWith(`${API}/api/rooms?`)
    && new URL(response.url()).searchParams.get("testViewerId") === host.id);
  await toHost.click();
  const hostProjection = await switchedToHost;
  expect(hostProjection.ok()).toBeTruthy();
  const hostProjectionBody = await hostProjection.json();
  expect((hostProjectionBody.room ?? hostProjectionBody).meId).toBe(host.id);
  await expect(page.locator(`.local-player-dock[data-player-anchor="${host.id}"]`)).toBeVisible();
  await expect(page.getByText("GAME SCREEN ERROR")).toHaveCount(0);
  expect(errors.boundaryErrors).toEqual([]);
  expect(errors.runtimeErrors).toEqual([]);
});
