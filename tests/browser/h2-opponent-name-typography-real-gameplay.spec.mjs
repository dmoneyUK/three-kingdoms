import { expect, test } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

const API = "http://127.0.0.1:3137";
const evidenceRoot = process.env.H2_F_EVIDENCE_DIR;

async function postRoomAction(request, action, values) {
  const response = await request.post(`${API}/api/rooms`, { data: { action, ...values } });
  if (!response.ok()) throw new Error(`${action} failed: ${await response.text()}`);
  return response.json();
}

async function createRealFourPlayerRoom(request) {
  const name = "H2 TYPOGRAPHY REVIEW";
  const created = await postRoomAction(request, "create", { name });
  const { code } = created.room;
  const { token } = created;
  await postRoomAction(request, "add_test_players", { code, token });
  let room = (await postRoomAction(request, "start", { code, token })).room;

  while (room.status === "heroes") {
    const option = room.myHeroOptions[0];
    expect(option, "the real room returns an authoritative Hero choice").toBeTruthy();
    room = (await postRoomAction(request, "choose_hero", { code, token, heroId: option.id })).room;
  }

  expect(room.status).toBe("playing");
  expect(room.currentAction).toBeTruthy();
  return { code, token, name };
}

const viewports = [
  { width: 390, height: 844 },
  { width: 390, height: 700 },
  { width: 440, height: 894 },
  { width: 480, height: 900 },
];

for (const viewport of viewports) {
  test(`H2-F real Worker/D1 opponent identity fonts at ${viewport.width}x${viewport.height}`, async ({ page, request }, testInfo) => {
    const session = await createRealFourPlayerRoom(request);
    await page.setViewportSize(viewport);
    await page.addInitScript(({ code, token, name }) => {
      localStorage.setItem("three-realms-session", JSON.stringify({ code, token, name }));
    }, session);
    await page.goto(`${API}/`);
    await expect(page.locator(".game-shell")).toBeVisible();

    const board = page.locator('.player-board[data-seat-topology="top-row"][data-player-count="4"]');
    await expect(board).toBeVisible();
    const seats = board.locator(":scope > .opponent-player-card[data-player-anchor]");
    await expect(seats).toHaveCount(3);
    const geometry = await board.evaluate((element) => {
      const bounds = (node) => {
        if (!node) return null;
        const { left, right, top, bottom, width, height } = node.getBoundingClientRect();
        return { left, right, top, bottom, width, height };
      };
      const overlap = (a, b) => Boolean(a && b
        && a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top);
      return {
        viewport: { width: window.innerWidth, height: window.innerHeight, documentWidth: document.documentElement.scrollWidth },
        seats: [...element.querySelectorAll(":scope > .opponent-player-card[data-player-anchor]")].map((seat) => {
          const hero = seat.querySelector(".opponent-hero-name");
          const player = seat.querySelector(".opponent-player-name");
          const hp = seat.querySelector(".opponent-hp-badge");
          const switchButton = seat.querySelector(".test-view-switch-button");
          const heroRect = bounds(hero);
          const playerRect = bounds(player);
          const hpRect = bounds(hp);
          const switchRect = bounds(switchButton);
          return {
            id: seat.dataset.playerAnchor,
            playerName: player?.textContent?.trim() ?? "",
            playerLabel: player?.getAttribute("aria-label") ?? "",
            playerTitle: player?.getAttribute("title") ?? "",
            playerFontSize: Number.parseFloat(getComputedStyle(player).fontSize),
            player: playerRect,
            heroName: hero?.textContent?.trim() ?? "",
            heroTitle: hero?.getAttribute("title") ?? "",
            heroFontSize: Number.parseFloat(getComputedStyle(hero).fontSize),
            hero: heroRect,
            hp: hpRect,
            switch: switchRect,
            heroOverlapsHp: overlap(heroRect, hpRect),
            heroOverlapsSwitch: overlap(heroRect, switchRect),
            hpOverlapsSwitch: overlap(hpRect, switchRect),
            playerOverlapsHero: overlap(playerRect, heroRect),
          };
        }),
      };
    });

    expect(geometry.viewport.documentWidth).toBeLessThanOrEqual(viewport.width);
    expect(geometry.seats.every(({ playerName, playerLabel, playerTitle, heroName, heroTitle }) => playerName && playerLabel === playerName && playerTitle === playerName && heroName && heroTitle === heroName)).toBe(true);
    expect(geometry.seats.every(({ playerFontSize, heroFontSize }) => playerFontSize >= 9 && playerFontSize <= 10 && heroFontSize >= 10 && heroFontSize <= 11), JSON.stringify(geometry.seats)).toBe(true);
    expect(geometry.seats.every(({ heroOverlapsHp, heroOverlapsSwitch, hpOverlapsSwitch, playerOverlapsHero }) => !heroOverlapsHp && !heroOverlapsSwitch && !hpOverlapsSwitch && !playerOverlapsHero), JSON.stringify(geometry.seats)).toBe(true);

    const label = `${viewport.width}x${viewport.height}-four-player`;
    const screenshot = await page.screenshot({ animations: "disabled" });
    await testInfo.attach(`H2-F-${label}`, { body: screenshot, contentType: "image/png" });
    await testInfo.attach(`H2-F-${label}-geometry`, { body: JSON.stringify(geometry, null, 2), contentType: "application/json" });
    if (evidenceRoot) {
      await mkdir(evidenceRoot, { recursive: true });
      await page.screenshot({ path: join(evidenceRoot, `real-${label}.png`), animations: "disabled" });
      await writeFile(join(evidenceRoot, `real-${label}.json`), `${JSON.stringify(geometry, null, 2)}\n`);
    }
  });
}
