import { expect, test } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

const API = "http://127.0.0.1:3137";
const evidenceRoot = process.env.H4_EVIDENCE_DIR;
const card = (kind, id, suit = "♠") => ({ id, kind, suit, rank: "7" });

async function seedAttackDodgeRoom(request) {
  const attack = card("Attack", "h4-root-attack");
  const dodge = card("Dodge", "h4-response-dodge", "♣");
  const seeded = await request.post(`${API}/__test/seed-playing-game`, {
    data: {
      phase: "play",
      turnSeat: 0,
      players: [
        { name: "H4 ATTACKER", role: "Lord", hero: "cao-cao", hp: 4, maxHp: 4, hand: [attack] },
        { name: "H4 DEFENDER", role: "Loyalist", hero: "zhao-yun", hp: 4, maxHp: 4, hand: [dodge] },
        { name: "H4 OBSERVER", role: "Rebel", hero: "sun-quan", hp: 4, maxHp: 4, hand: [] },
        { name: "H4 FOURTH", role: "Renegade", hero: "simayi", hp: 4, maxHp: 4, hand: [] },
      ],
    },
  });
  if (!seeded.ok()) throw new Error(`H4 room seed failed: ${await seeded.text()}`);
  return { ...(await seeded.json()), attack, dodge };
}

async function openSeat(page, room, seat, viewport = { width: 440, height: 894 }) {
  const player = room.players[seat];
  await page.setViewportSize(viewport);
  await page.addInitScript(({ code, token, name }) => {
    localStorage.setItem("three-realms-session", JSON.stringify({ code, token, name }));
  }, { code: room.code, token: player.token, name: player.name });
  await page.goto(`${API}/`);
  await expect(page.locator(".game-shell")).toBeVisible();
  return player;
}

async function playAttack(attackerPage, room, attacker, defender) {
  const dock = attackerPage.locator(`.local-player-dock[data-player-anchor="${attacker.id}"]`);
  await dock.locator(`[data-hand-card-id="${room.attack.id}"] .game-card`).click();
  await attackerPage.getByRole("button", { name: `Select ${defender.name}`, exact: true }).click();
  const confirm = dock.locator('[data-console-surface="local-operation"] button.primary');
  await expect(confirm).toBeEnabled();
  const submitted = attackerPage.waitForResponse((response) => response.url() === `${API}/api/rooms`
    && response.request().method() === "POST"
    && response.request().postDataJSON()?.action === "play_card");
  await confirm.click();
  const response = await submitted;
  expect(response.ok()).toBeTruthy();
  expect(response.request().postDataJSON()).toMatchObject({
    action: "play_card", code: room.code, token: attacker.token, cardId: room.attack.id, targetId: defender.id,
  });
}

async function respondWithDodge(defenderPage, room, defender) {
  const dock = defenderPage.locator(`.local-player-dock[data-player-anchor="${defender.id}"]`);
  const dodge = dock.locator(`[data-hand-card-id="${room.dodge.id}"] .game-card`);
  await expect(dodge).toBeEnabled({ timeout: 8_000 });
  await dodge.click();
  const confirm = dock.locator('[data-action-slot="primary"] button.primary');
  await expect(confirm).toBeEnabled();
  const submitted = defenderPage.waitForResponse((response) => response.url() === `${API}/api/rooms`
    && response.request().method() === "POST"
    && response.request().postDataJSON()?.action === "respond");
  await confirm.click();
  const response = await submitted;
  expect(response.ok()).toBeTruthy();
  expect(response.request().postDataJSON()).toMatchObject({
    action: "respond", code: room.code, token: defender.token, cardId: room.dodge.id,
  });
}

async function saveScreenshot(page, testInfo, filename) {
  const image = await page.screenshot({ animations: "disabled" });
  await testInfo.attach(filename, { body: image, contentType: "image/png" });
  if (evidenceRoot) {
    await mkdir(evidenceRoot, { recursive: true });
    await writeFile(join(evidenceRoot, filename), image);
  }
}

test("H4 reproduces announcement placement through a real observer Attack-to-Dodge lifecycle", async ({ browser, request }, testInfo) => {
  test.setTimeout(75_000);
  const room = await seedAttackDodgeRoom(request);
  const attackerPage = await browser.newPage({ viewport: { width: 440, height: 894 } });
  const defenderPage = await browser.newPage({ viewport: { width: 440, height: 894 } });
  const observerPage = await browser.newPage({ viewport: { width: 440, height: 894 } });
  const browserErrors = [];
  for (const page of [attackerPage, defenderPage, observerPage]) {
    page.on("pageerror", (error) => browserErrors.push(error.stack ?? error.message));
    page.on("console", (message) => {
      if (message.type() === "error") browserErrors.push(message.text());
    });
  }
  try {
    const attacker = await openSeat(attackerPage, room, 0);
    const defender = await openSeat(defenderPage, room, 1);
    const observer = await openSeat(observerPage, room, 2);
    await expect(observerPage.locator('.player-board[data-seat-topology="top-row"][data-player-count="4"]')).toBeVisible();
    await observerPage.evaluate(() => {
      window.__h4Frames = [];
      window.__h4Capture = () => {
        const display = document.querySelector('.public-card-display[data-public-card-motion="attack-dodge"]');
        const announcement = display?.querySelector('[data-public-card-announcement="true"]');
        if (!display || !announcement) return null;
        const anchorEventId = announcement.dataset.publicCardCopyAnchorEventId;
        const cardElement = [...display.querySelectorAll('[data-public-card-journey-event-id][data-public-card-copy-anchor-event-id]')]
          .find((element) => element.dataset.publicCardCopyAnchorEventId === anchorEventId);
        if (!cardElement) return null;
        const rect = (element) => {
          const { left, right, top, bottom, width, height } = element.getBoundingClientRect();
          return { left, right, top, bottom, width, height };
        };
        const text = announcement.querySelector("b");
        const range = document.createRange();
        if (text) range.selectNodeContents(text);
        const announcementRect = rect(announcement);
        const cardRect = rect(cardElement);
        const table = document.querySelector(".play-table");
        const tableRect = table ? rect(table) : null;
        const protectedRects = [...document.querySelectorAll(
          ".opponent-player-card, .player-square, .player-board-status, .visible-countdown, .stage-system-cluster, .public-activity-chip, .local-player-dock, .local-hand-rail, .console-guidance",
        )].filter((element) => element !== cardElement && element !== announcement
          && element.dataset.publicCardCopyAnchorEventId !== anchorEventId)
          .map((element) => ({
            label: element.className?.baseVal ?? element.className ?? element.tagName,
            rect: rect(element),
          }))
          .filter(({ rect: obstacle }) => obstacle.width > 0 && obstacle.height > 0
            && announcementRect.left < obstacle.right && announcementRect.right > obstacle.left
            && announcementRect.top < obstacle.bottom && announcementRect.bottom > obstacle.top);
        const activeCardOverlap = announcementRect.left < cardRect.right && announcementRect.right > cardRect.left
          && announcementRect.top < cardRect.bottom && announcementRect.bottom > cardRect.top;
        const row = {
          at: performance.now(),
          interactionRootEventId: display.dataset.publicCardRootEventId,
          interactionId: display.dataset.publicCardInteractionId ?? null,
          activeEventId: announcement.dataset.publicCardAnnouncementEventId,
          anchorEventId,
          cardId: cardElement.dataset.publicCardJourneyCardId,
          actorId: cardElement.dataset.publicCardJourneyActorId,
          phase: cardElement.dataset.publicCardJourneyPhase,
          announcement: announcementRect,
          card: cardRect,
          announcementZIndex: Number.parseInt(getComputedStyle(announcement).zIndex, 10),
          cardZIndex: Number.parseInt(getComputedStyle(cardElement).zIndex, 10),
          announcementVisibility: getComputedStyle(announcement).visibility,
          announcementPointerEvents: getComputedStyle(announcement).pointerEvents,
          activeCardOverlap,
          protectedRects,
          table: tableRect,
          centerOffset: tableRect
            ? (announcementRect.left + announcementRect.right - tableRect.left - tableRect.right) / 2
            : null,
          announcementToCardCenterOffset: (announcementRect.left + announcementRect.right - cardRect.left - cardRect.right) / 2,
          lines: range.getClientRects().length,
          fontSize: Number.parseFloat(text ? getComputedStyle(text).fontSize : "0"),
          fallback: announcement.dataset.publicCardAnnouncementFallback === "true",
          compact: announcement.dataset.publicCardAnnouncementCompact === "true",
          placement: announcement.dataset.publicCardAnnouncementPlacement ?? null,
          text: announcement.textContent?.trim() ?? "",
        };
        const previous = window.__h4Frames.at(-1);
        if (!previous || previous.activeEventId !== row.activeEventId || previous.phase !== row.phase
          || performance.now() - previous.at >= 24) window.__h4Frames.push(row);
        return row;
      };
      const sample = () => {
        window.__h4Capture();
        requestAnimationFrame(sample);
      };
      requestAnimationFrame(sample);
    });

    await playAttack(attackerPage, room, attacker, defender);
    const rootCard = observerPage.locator(`[data-public-card-journey-card-id="${room.attack.id}"]`);
    try {
      await expect(rootCard).toHaveAttribute("data-public-card-journey-phase", "reveal", { timeout: 10_000 });
    } catch (error) {
      await testInfo.attach("h4-browser-errors.txt", { body: browserErrors.join("\n\n"), contentType: "text/plain" });
      console.error(`[H4 browser errors] ${browserErrors.join("\n")}`);
      throw error;
    }
    await expect(observerPage.locator('[data-public-card-announcement="true"]')).toBeVisible();
    const rootEventId = await observerPage.locator('.public-card-display[data-public-card-motion="attack-dodge"]')
      .getAttribute("data-public-card-root-event-id");
    await expect(rootCard).toHaveAttribute("data-public-card-journey-phase", "parked", { timeout: 15_000 });
    const parkedRoot = await observerPage.evaluate(() => window.__h4Capture());
    await saveScreenshot(observerPage, testInfo, "h4-root-parked.png");

    await respondWithDodge(defenderPage, room, defender);
    const dodgeCard = observerPage.locator(`[data-public-card-journey-card-id="${room.dodge.id}"]`);
    await expect(dodgeCard).toHaveAttribute("data-public-card-journey-phase", "reveal", { timeout: 10_000 });
    await saveScreenshot(observerPage, testInfo, "h4-dodge-reveal.png");
    await expect(dodgeCard).toHaveAttribute("data-public-card-journey-phase", "parked", { timeout: 15_000 });
    await saveScreenshot(observerPage, testInfo, "h4-dodge-parked.png");

    const frames = await observerPage.evaluate(() => window.__h4Frames);
    const dodgeFrames = frames.filter((row) => row.cardId === room.dodge.id);
    const visibleDodgeFrames = dodgeFrames.filter((row) => row.announcementVisibility === "visible");
    const phases = Object.fromEntries(["reveal", "move", "parked"].map((phase) => [
      phase, dodgeFrames.find((row) => row.phase === phase && row.announcementVisibility === "visible")
        ?? dodgeFrames.find((row) => row.phase === phase) ?? null,
    ]));
    const result = {
      roomCode: room.code,
      observerId: observer.id,
      attackerId: attacker.id,
      defenderId: defender.id,
      rootEventId,
      parkedRoot,
      phases,
      sampledFrames: dodgeFrames.length,
      dodgeFrames: dodgeFrames.map(({ at, interactionId, activeEventId, anchorEventId, cardId, actorId, phase, announcement, card, centerOffset, announcementToCardCenterOffset, lines, fontSize, fallback, compact, placement, activeCardOverlap, protectedRects, text }) => ({
        at, interactionId, activeEventId, anchorEventId, cardId, actorId, phase, announcement, card, centerOffset,
        announcementToCardCenterOffset, lines, fontSize, fallback, compact, placement, activeCardOverlap, protectedRects, text,
      })),
    };
    await testInfo.attach("h4-attack-dodge-baseline-geometry.json", {
      body: JSON.stringify(result, null, 2), contentType: "application/json",
    });
    if (evidenceRoot) {
      await mkdir(evidenceRoot, { recursive: true });
      await writeFile(join(evidenceRoot, "h4-attack-dodge-baseline-geometry.json"), `${JSON.stringify(result, null, 2)}\n`);
    }
    console.log(`[H4 Attack/Dodge] ${JSON.stringify({ rootEventId, observerId: observer.id, phases, sampledFrames: dodgeFrames.length })}`);
    expect(phases.reveal?.cardId).toBe(room.dodge.id);
    expect(phases.parked?.cardId).toBe(room.dodge.id);
    expect(phases.move?.cardId).toBe(room.dodge.id);
    expect(dodgeFrames.some((row) => row.anchorEventId !== row.activeEventId)).toBe(false);
    expect(new Set(dodgeFrames.map((row) => row.interactionId)).size).toBe(1);
    expect(visibleDodgeFrames.length).toBeGreaterThan(0);
    expect(visibleDodgeFrames.every((row) => Math.abs(row.centerOffset ?? Infinity) <= 4)).toBe(true);
    expect(Math.max(...visibleDodgeFrames.map((row) => row.announcement.top))
      - Math.min(...visibleDodgeFrames.map((row) => row.announcement.top))).toBeLessThanOrEqual(16);
    expect(visibleDodgeFrames.every((row) => !row.fallback && row.lines >= 1 && row.fontSize >= 14
      && row.announcement.width >= 320 && row.announcement.width <= 340
      && row.announcementVisibility === "visible" && row.announcementPointerEvents === "none"
      && row.announcementZIndex > row.cardZIndex)).toBe(true);
    expect(visibleDodgeFrames.every((row) => row.protectedRects.length === 0)).toBe(true);
    expect(phases.reveal.announcementZIndex).toBeGreaterThan(phases.reveal.cardZIndex);
    expect(phases.parked.announcementZIndex).toBeGreaterThan(phases.parked.cardZIndex);
    expect(parkedRoot.announcementZIndex).toBeGreaterThan(parkedRoot.cardZIndex);
    expect(parkedRoot.announcement.left).toBeCloseTo(phases.reveal.announcement.left, 1);
    expect(parkedRoot.announcement.width).toBe(phases.reveal.announcement.width);
    await expect(observerPage.getByText("GAME SCREEN ERROR")).toHaveCount(0);
  } finally {
    await Promise.all([attackerPage.close(), defenderPage.close(), observerPage.close()]);
  }
});
