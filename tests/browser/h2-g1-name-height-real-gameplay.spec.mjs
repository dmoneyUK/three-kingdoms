import { expect, test } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

const API = "http://127.0.0.1:3137";
const evidenceRoot = process.env.H2_G1_NAME_EVIDENCE_DIR;

async function postRoomAction(request, action, values) {
  const response = await request.post(`${API}/api/rooms`, { data: { action, ...values } });
  if (!response.ok()) throw new Error(`${action} failed: ${await response.text()}`);
  return response.json();
}

async function createRealFourPlayerRoom(request) {
  const name = "H2 G1 NAME-F BASELINE";
  const created = await postRoomAction(request, "create", { name });
  const { code } = created.room;
  const { token } = created;
  await postRoomAction(request, "add_test_players", { code, token });
  let room = (await postRoomAction(request, "start", { code, token })).room;

  while (room.status === "heroes") {
    const option = room.myHeroOptions[0];
    expect(option, "the local Worker returns an authoritative Hero choice").toBeTruthy();
    room = (await postRoomAction(request, "choose_hero", { code, token, heroId: option.id })).room;
  }

  expect(room.status).toBe("playing");
  return { code, token, name };
}

async function readNameGeometry(board) {
  return board.evaluate((element) => {
    const bounds = (node) => {
      if (!node) return null;
      const { left, right, top, bottom, width, height } = node.getBoundingClientRect();
      return { left, right, top, bottom, width, height };
    };
    const overlap = (a, b) => Boolean(a && b
      && a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top);
    const safeZone = element.closest(".play-table")?.querySelector(":scope > .interaction-safe-zone");
    return [...element.querySelectorAll(":scope > .opponent-player-card[data-player-anchor]")].map((seat) => {
      const name = seat.querySelector(".opponent-player-name");
      const style = getComputedStyle(name);
      const hero = seat.querySelector(".opponent-hero-card");
      const portrait = seat.querySelector(".opponent-hero-portrait");
      const status = seat.querySelector(".opponent-status-equipment-strip");
      const hp = seat.querySelector(".opponent-hp-chip, .opponent-hp-badge");
      const switchButton = seat.querySelector(".test-view-switch-button");
      const verticalPadding = Number.parseFloat(style.paddingTop) + Number.parseFloat(style.paddingBottom);
      const borderTop = Number.parseFloat(style.borderTopWidth);
      return {
        id: seat.dataset.playerAnchor,
        text: name.textContent.trim(),
        ariaLabel: name.getAttribute("aria-label"),
        title: name.title,
        name: bounds(name),
        hero: bounds(hero),
        portrait: bounds(portrait),
        status: bounds(status),
        safeZone: bounds(safeZone),
        hp: bounds(hp),
        switchButton: bounds(switchButton),
        fontSize: Number.parseFloat(style.fontSize),
        lineHeight: Number.parseFloat(style.lineHeight),
        top: style.top,
        bottom: style.bottom,
        usedHeight: style.height,
        verticalPadding,
        borderTop,
        whiteSpace: style.whiteSpace,
        textOverflow: style.textOverflow,
        overflow: style.overflow,
        oneLineHeightLimit: Number.parseFloat(style.lineHeight) + verticalPadding + borderTop + 1.5,
        nameOverlapsStatus: overlap(bounds(name), bounds(status)),
        nameOverlapsHp: overlap(bounds(name), bounds(hp)),
        nameOverlapsSwitch: overlap(bounds(name), bounds(switchButton)),
        nameOverlapsSafeZone: overlap(bounds(name), bounds(safeZone)),
      };
    });
  });
}

async function expectOneRowNames(board, expectedSeats) {
  const geometry = await readNameGeometry(board);
  expect(geometry).toHaveLength(expectedSeats);
  for (const seat of geometry) {
    expect(seat.text, seat.id).toBeTruthy();
    expect(seat.ariaLabel, seat.id).toBe(seat.text);
    expect(seat.title, seat.id).toBe(seat.text);
    expect(seat.whiteSpace, seat.id).toBe("nowrap");
    expect(seat.textOverflow, seat.id).toBe("ellipsis");
    expect(seat.overflow, seat.id).toBe("hidden");
    expect(seat.name.height, `${seat.id} is one text line high: ${JSON.stringify(seat)}`).toBeLessThanOrEqual(seat.oneLineHeightLimit);
    expect(seat.name.height, `${seat.id} retains a visible text line`).toBeGreaterThanOrEqual(seat.lineHeight);
    expect(seat.name.bottom, `${seat.id} name sits on the portrait's lower edge`).toBeCloseTo(seat.portrait.bottom, 0);
    expect(seat.nameOverlapsStatus, `${seat.id} name clears HP and Equipment`).toBe(false);
    expect(seat.nameOverlapsHp, `${seat.id} name clears the HP label`).toBe(false);
    expect(seat.nameOverlapsSwitch, `${seat.id} name clears SWITCH`).toBe(false);
    expect(seat.nameOverlapsSafeZone, `${seat.id} name stays out of the shared stage/H4 safe zone`).toBe(false);
  }
  return geometry;
}

for (const viewport of [{ width: 390, height: 700 }, { width: 440, height: 894 }]) {
  test(`H2-G1 one-row player-name scrim in a real four-player room at ${viewport.width}x${viewport.height}`, async ({ page, request }, testInfo) => {
    const session = await createRealFourPlayerRoom(request);
    await page.setViewportSize(viewport);
    await page.addInitScript(({ code, token, name }) => {
      localStorage.setItem("three-realms-session", JSON.stringify({ code, token, name }));
    }, session);
    await page.goto(`${API}/`);
    await expect(page.locator(".game-shell")).toBeVisible();

    const board = page.locator('.player-board[data-seat-topology="top-row"][data-player-count="4"]');
    await expect(board).toBeVisible();
    const geometry = await expectOneRowNames(board, 3);

    const longNameGeometry = await page.locator('.opponent-player-card[data-player-anchor] .opponent-player-name').first().evaluate((name) => {
      const variants = ["An exceptionally long Latin player name", "超長中文玩家名称甲乙丙丁戊己庚辛壬癸"];
      const original = { text: name.textContent, aria: name.getAttribute("aria-label"), title: name.title };
      const result = variants.map((value) => {
        name.textContent = value;
        name.setAttribute("aria-label", value);
        name.title = value;
        const rect = name.getBoundingClientRect();
        const style = getComputedStyle(name);
        return {
          value,
          width: rect.width,
          height: rect.height,
          clientWidth: name.clientWidth,
          scrollWidth: name.scrollWidth,
          ariaLabel: name.getAttribute("aria-label"),
          title: name.title,
          whiteSpace: style.whiteSpace,
          textOverflow: style.textOverflow,
        };
      });
      name.textContent = original.text;
      name.setAttribute("aria-label", original.aria);
      name.title = original.title;
      return result;
    });
    for (const variant of longNameGeometry) {
      expect(variant.height, variant.value).toBeLessThanOrEqual(geometry[0].oneLineHeightLimit);
      expect(variant.scrollWidth, variant.value).toBeGreaterThan(variant.clientWidth);
      expect(variant.ariaLabel, variant.value).toBe(variant.value);
      expect(variant.title, variant.value).toBe(variant.value);
      expect(variant.whiteSpace, variant.value).toBe("nowrap");
      expect(variant.textOverflow, variant.value).toBe("ellipsis");
    }

    const screenshot = await page.screenshot({ animations: "disabled" });
    const label = `${viewport.width}x${viewport.height}-four-player`;
    await testInfo.attach(`H2-G1-one-row-${label}`, {
      body: screenshot,
      contentType: "image/png",
    });
    await testInfo.attach(`H2-G1-one-row-${viewport.width}x${viewport.height}-geometry`, {
      body: JSON.stringify({ geometry, longNameGeometry }, null, 2),
      contentType: "application/json",
    });
    if (evidenceRoot) {
      await mkdir(evidenceRoot, { recursive: true });
      await writeFile(join(evidenceRoot, `${label}.png`), screenshot);
      await writeFile(join(evidenceRoot, `${label}.json`), `${JSON.stringify({ geometry, longNameGeometry }, null, 2)}\n`);
    }
  });
}

for (const count of [6, 8, 10]) {
  test(`H2-G1 one-row player-name scrim on ${count}-player side seats`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 440, height: 894 });
    await page.goto(`/tests/browser/fixture.html?state=interaction&count=${count}&equipmentCase=matrix&playerNamePrefix=${encodeURIComponent("Long Latin 测试玩家")}`);
    await expect(page.locator(".game-shell")).toBeVisible();
    const board = page.locator(`.player-board[data-seat-topology="side-column"][data-player-count="${count}"]`);
    await expect(board).toBeVisible();
    await expect.poll(() => board.locator(":scope > .opponent-player-card[data-player-anchor] .opponent-hero-portrait .hero-art-image").evaluateAll((images, expected) => images.length === expected && images.every((image) => image.complete && image.naturalWidth > 0), count - 1)).toBe(true);
    const geometry = await expectOneRowNames(board, count - 1);
    const viewportWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(viewportWidth).toBeLessThanOrEqual(440);
    const screenshot = await page.screenshot({ animations: "disabled" });
    await testInfo.attach(`H2-G1-one-row-${count}-side-seats`, {
      body: screenshot,
      contentType: "image/png",
    });
    await testInfo.attach(`H2-G1-one-row-${count}-side-seats-geometry`, {
      body: JSON.stringify(geometry, null, 2),
      contentType: "application/json",
    });
    if (evidenceRoot) {
      await mkdir(evidenceRoot, { recursive: true });
      await writeFile(join(evidenceRoot, `${count}-side-seats-440x894.png`), screenshot);
      await writeFile(join(evidenceRoot, `${count}-side-seats-440x894.json`), `${JSON.stringify(geometry, null, 2)}\n`);
    }
  });
}
