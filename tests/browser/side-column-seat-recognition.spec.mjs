import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import * as ts from "typescript";

const VIEWPORTS = [320, 390, 480, 610, 620, 650];
const PLAYER_COUNTS = [6, 10];

async function loadFixture(page, { width, height = 900, count, state = "interaction", playerNamePrefix }) {
  await page.setViewportSize({ width, height });
  const testPlayers = playerNamePrefix ? `&playerNamePrefix=${encodeURIComponent(playerNamePrefix)}` : "";
  await page.goto(`/tests/browser/fixture.html?state=${state}&count=${count}&equipmentCase=matrix${testPlayers}`);
  await expect(page.locator(".game-shell")).toBeVisible();
  await expect.poll(() => page.locator('.player-board[data-seat-topology="side-column"] .opponent-hero-portrait .hero-art-image').evaluateAll(images => images.length > 0 && images.every(image => image.complete && image.naturalWidth > 0))).toBe(true);
}

async function readLayout(page) {
  return page.locator('.player-board[data-seat-topology="side-column"]').evaluate((board) => {
    const bounds = (element) => {
      const { x, y, right, bottom, width, height } = element.getBoundingClientRect();
      return { x, y, right, bottom, width, height };
    };
    const visible = (element) => {
      const style = getComputedStyle(element);
      const box = element.getBoundingClientRect();
      return style.display !== "none" && style.visibility !== "hidden" && box.width > 0 && box.height > 0;
    };
    const table = board.closest(".play-table");
    const tableRect = bounds(table);
    const localPlayerId = document.querySelector(".local-player-dock")?.getAttribute("data-player-anchor") ?? null;
    const seatRing = [...(window.__browserRoom?.players ?? [])].sort((left, right) => left.seat - right.seat);
    const viewerRingIndex = seatRing.findIndex((player) => player.id === localPlayerId);
    const safeZone = table.querySelector(":scope > .interaction-safe-zone");
    const stage = safeZone.querySelector(":scope > .interaction-stage");
    const systemCluster = safeZone.querySelector(":scope > .stage-system-cluster");
    const guidance = document.querySelector(".local-player-dock .console-guidance");
    const dock = document.querySelector(".local-player-dock");
    const seats = [...board.querySelectorAll(":scope > [data-player-anchor]")].map((seat) => {
      const target = seat.querySelector(".opponent-hero-target");
      const targetBounds = bounds(target);
      const hit = document.elementFromPoint(
        targetBounds.x + targetBounds.width / 2,
        targetBounds.y + targetBounds.height / 2,
      );
      const portrait = seat.querySelector(".opponent-hero-portrait");
      const image = portrait.querySelector(".hero-art-image");
      const imageStyle = image ? getComputedStyle(image) : null;
      const art = bounds(portrait);
      const focalPoint = { x: art.x + art.width * 0.45, y: art.y + art.height * 0.42 };
      const focalText = [...seat.querySelectorAll(".opponent-player-name, .opponent-hero-name, .player-hp, .player-hearts")]
        .filter(visible)
        .some((element) => {
          const box = bounds(element);
          return focalPoint.x >= box.x && focalPoint.x <= box.right && focalPoint.y >= box.y && focalPoint.y <= box.bottom;
        });
      const equipment = seat.querySelector(".opponent-equipment-summary");
      const equipmentBox = equipment && visible(equipment) ? bounds(equipment) : null;
      const focalEquipment = Boolean(equipmentBox
        && focalPoint.x >= equipmentBox.x && focalPoint.x <= equipmentBox.right
        && focalPoint.y >= equipmentBox.y && focalPoint.y <= equipmentBox.bottom);
      return {
        id: seat.dataset.playerAnchor,
        relativeIndex: viewerRingIndex >= 0
          ? (seatRing.findIndex((player) => player.id === seat.dataset.playerAnchor) - viewerRingIndex + seatRing.length) % seatRing.length
          : null,
        side: seat.dataset.sideColumn,
        topIndex: seat.dataset.topSeatIndex === undefined ? null : Number(seat.dataset.topSeatIndex),
        seat: bounds(seat),
        row: Number(seat.dataset.sideRow),
        image: image ? bounds(image) : null,
        imageObjectFit: imageStyle?.objectFit ?? null,
        imageLeft: imageStyle?.left ?? null,
        imageTransform: imageStyle?.transform ?? null,
        imageTranslate: imageStyle?.translate ?? null,
        target: targetBounds,
        switch: (() => {
          const button = seat.querySelector(".test-view-switch-button");
          if (!button) return null;
          const rect = bounds(button);
          const hit = document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2);
          return { ...rect, hitSafe: Boolean(hit && button.contains(hit)) };
        })(),
        art,
        imageLoaded: Boolean(image?.naturalWidth),
        hitSafe: Boolean(hit && target.contains(hit)),
        hitTarget: hit ? `${hit.tagName.toLowerCase()}.${String(hit.className?.baseVal ?? hit.className ?? "").trim().replace(/\s+/g, ".")}` : null,
        hitPlayerId: hit?.closest?.("[data-player-anchor]")?.getAttribute("data-player-anchor") ?? null,
        focalText,
        focalEquipment,
        equipment: [...seat.querySelectorAll(".opponent-equipment-indicator")].map(bounds),
      };
    });
    const topSeats = seats.filter((seat) => seat.side === "top").sort((left, right) => left.topIndex - right.topIndex);
    const leftTop = topSeats[0]?.seat ?? null;
    const rightTop = topSeats.at(-1)?.seat ?? null;
    const leftSide = seats.filter((seat) => seat.side === "left").sort((left, right) => left.seat.x - right.seat.x)[0]?.seat ?? null;
    const rightSide = seats.filter((seat) => seat.side === "right").sort((left, right) => right.seat.right - left.seat.right)[0]?.seat ?? null;
    const leftMost = Math.min(...seats.filter((seat) => seat.side === "left").map((seat) => seat.seat.x));
    const rightMost = Math.max(...seats.filter((seat) => seat.side === "right").map((seat) => seat.seat.right));
    return {
      viewportWidth: window.innerWidth,
      localPlayerId,
      pageWidth: document.documentElement.scrollWidth,
      board: bounds(board),
      topCapacity: Number(board.dataset.mobileTopCapacity ?? 0),
      sideCount: Number(board.dataset.mobileSideCount ?? -1),
      topSeats,
      topGaps: topSeats.slice(1).map((seat, index) => seat.seat.x - topSeats[index].seat.right),
      topMargins: leftTop && rightTop ? { left: leftTop.x - bounds(board).x, right: bounds(board).right - rightTop.right } : null,
      sideAlignment: leftTop && rightTop && leftSide && rightSide
        ? { left: leftSide.x - leftTop.x, right: rightSide.right - rightTop.right }
        : null,
      table: tableRect,
      outerGutters: { left: leftMost - tableRect.x, right: tableRect.right - rightMost },
      sideSafeEdge: getComputedStyle(table).getPropertyValue("--side-safe-edge").trim(),
      boardStyle: {
        gridTemplateColumns: getComputedStyle(board).gridTemplateColumns,
        gridTemplateRows: getComputedStyle(board).gridTemplateRows,
        rowGap: getComputedStyle(board).rowGap,
        alignContent: getComputedStyle(board).alignContent,
        alignItems: getComputedStyle(board).alignItems,
      },
      safeZone: bounds(safeZone),
      systemCluster: bounds(systemCluster),
      guidance: bounds(guidance),
      dock: bounds(dock),
      menu: bounds(document.querySelector(".local-player-dock .console-guidance-row .stage-system-menu-trigger")),
      stage: stage ? [stage, ...stage.querySelectorAll("*")].filter(visible).map(bounds) : [],
      publicCards: [...document.querySelectorAll(".public-card-journey-card")].map((card) => ({
        id: card.getAttribute("data-public-card-journey-card-id"),
        eventId: card.getAttribute("data-public-card-journey-event-id"),
        actorId: card.getAttribute("data-public-card-journey-actor-id"),
        role: card.getAttribute("data-public-card-journey-role"),
        phase: card.getAttribute("data-public-card-journey-phase"),
        rect: bounds(card),
      })),
      announcements: [...document.querySelectorAll("[data-public-card-announcement='true']")].map((element) => bounds(element)),
      timers: [...document.querySelectorAll(".visible-countdown")].map((element) => bounds(element)),
      harvestPools: [...document.querySelectorAll(".harvest-choice-panel")].map((element) => bounds(element)),
      seats,
    };
  });
}

function loadSeatProjector() {
  const source = readFileSync(new URL("../../app/page.tsx", import.meta.url), "utf8");
  const sourceFile = ts.createSourceFile("app/page.tsx", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const declaration = sourceFile.statements.find((statement) => ts.isFunctionDeclaration(statement) && statement.name?.text === "projectSideColumnSeat");
  expect(declaration, "the app exports the production seat projection function").toBeTruthy();
  const implementation = source.slice(declaration.getStart(sourceFile), declaration.end).replace(/^export\s+/, "");
  const compiled = ts.transpileModule(implementation, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None },
  }).outputText;
  const sandbox = {};
  runInNewContext(compiled, sandbox);
  return sandbox.projectSideColumnSeat;
}

test("H2-G3 F1-R3 projection preserves the accepted ring and caps eight players at five top Seats", () => {
  const project = loadSeatProjector();
  for (const players of [5, 6, 7, 8, 9, 10]) {
    const opponents = players - 1;
    for (const topCapacity of new Set([0, 3, 4, 5, opponents])) {
      const topCount = Math.min(opponents, topCapacity, players === 7 ? 4 : players === 8 ? 5 : opponents);
      const sideCount = opponents - topCount;
      const rowCount = Math.ceil(sideCount / 2);
      const seats = Array.from({ length: opponents }, (_, index) => ({
        relativeIndex: index + 1,
        ...project(players, index + 1, { topCapacity }),
      }));
      const physicalOrder = [
        ...seats.filter((seat) => seat.side === "left").sort((a, b) => b.row - a.row),
        ...seats.filter((seat) => seat.side === "top").sort((a, b) => a.topIndex - b.topIndex),
        ...seats.filter((seat) => seat.side === "right").sort((a, b) => a.row - b.row),
      ].map((seat) => seat.relativeIndex);
      const positions = seats.map((seat) => seat.side === "top" ? `top:${seat.topIndex}` : `${seat.side}:${seat.row}`);
      const topSeats = seats.filter((seat) => seat.side === "top").sort((a, b) => a.topIndex - b.topIndex);

      expect(topSeats, `${players} players / capacity ${topCapacity}`).toHaveLength(topCount);
      expect(new Set(positions).size, `${players} players / capacity ${topCapacity} has unique cells`).toBe(opponents);
      expect(physicalOrder, `${players} players / capacity ${topCapacity} follows the clockwise ring`).toEqual(Array.from({ length: opponents }, (_, index) => index + 1));
      expect(topSeats.map((seat) => seat.topIndex)).toEqual(Array.from({ length: topCount }, (_, index) => index));
      expect(seats.filter((seat) => seat.side !== "top").every((seat) => seat.rowCount === rowCount), `${players} players / capacity ${topCapacity} has the correct side row count`).toBe(true);
      expect(topSeats.every((seat) => seat.rowCount === 0), `${players} players / capacity ${topCapacity} has no synthetic side rows on top seats`).toBe(true);
      if (players === 7 && topCapacity >= 4) {
        expect(seats.map((seat) => seat.side === "top" ? `T${seat.topIndex + 1}` : `${seat.side === "left" ? "L" : "R"}${seat.row}`))
          .toEqual(["L1", "T1", "T2", "T3", "T4", "R1"]);
      }
    }
  }

  expect(project(7, 1, { topCapacity: 5 })).toMatchObject({ side: "left", row: 1, rowCount: 1 });
  expect(project(8, 1, { topCapacity: 7 })).toMatchObject({ side: "left", row: 1, rowCount: 1, topCount: 5 });
  expect(project(8, 7, { topCapacity: 7 })).toMatchObject({ side: "right", row: 1, rowCount: 1, topCount: 5 });
  expect(project(10, 1, { topCapacity: Number.NaN })).toMatchObject({ side: "left" });
  expect([1, 2, 3].map((relativeIndex) => project(4, relativeIndex))).toEqual([null, null, null]);
});

test("H2-G3 F1-R4/R5 at 390px keeps Seat geometry, art fill, and TEST SWITCH", async ({ browser }, testInfo) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
  const page = await context.newPage();
  const assertPhoneRing = async (count, { state = "rest", topCount, leftRelative, rightRelative } = {}) => {
    await loadFixture(page, { width: 390, height: 844, count, state, playerNamePrefix: "Test Player" });
    await expect.poll(async () => (await readLayout(page)).topCapacity).toBeGreaterThan(0);
    const layout = await readLayout(page);
    const expectedTopCount = Math.min(count - 1, layout.topCapacity, count === 7 ? 4 : count === 8 ? 5 : count - 1);
    const topSeats = layout.seats.filter((seat) => seat.side === "top").sort((a, b) => a.topIndex - b.topIndex);
    expect(layout.seats).toHaveLength(count - 1);
    expect(new Set(layout.seats.map((seat) => seat.id)).size).toBe(count - 1);
    expect(layout.sideCount).toBe(count - 1 - expectedTopCount);
    expect(topSeats).toHaveLength(topCount ?? expectedTopCount);
    expect(topSeats.map((seat) => seat.relativeIndex)).toEqual(Array.from({ length: expectedTopCount }, (_, index) => index + Math.floor((count - 1 - expectedTopCount) / 2) + 1));
    expect(layout.pageWidth).toBeLessThanOrEqual(390);
    for (let index = 1; index < topSeats.length; index += 1) expect(topSeats[index].seat.x).toBeGreaterThan(topSeats[index - 1].seat.x);
    for (const seat of layout.seats) {
      expect(seat.seat.x).toBeGreaterThanOrEqual(0);
      expect(seat.seat.right).toBeLessThanOrEqual(390);
      expect(seat.hitSafe, `${seat.id} Hero/Inspector target remains hittable: ${JSON.stringify({ side: seat.side, topIndex: seat.topIndex, seat: seat.seat, hitPlayerId: seat.hitPlayerId })}`).toBe(true);
      expect(seat.switch?.hitSafe, `${seat.id} TEST SWITCH remains hittable`).toBe(true);
    }
    if (leftRelative !== undefined) expect(layout.seats.find((seat) => seat.relativeIndex === leftRelative)).toMatchObject({ side: "left", row: 1 });
    if (rightRelative !== undefined) expect(layout.seats.find((seat) => seat.relativeIndex === rightRelative)).toMatchObject({ side: "right", row: 1 });
    return layout;
  };

  try {
    const five = await assertPhoneRing(5, { topCount: 4 });
    expect(five.sideCount).toBe(0);
    const firstOpponent = five.seats.find((seat) => seat.relativeIndex === 1);
    const hero = page.locator(`.opponent-player-card[data-player-anchor="${firstOpponent.id}"] .opponent-hero-target`);
    await hero.tap();
    await expect(page.locator(`.opponent-inspection-panel[data-inspect-player-id="${firstOpponent.id}"]`)).toBeVisible();
    await page.getByTestId("test-view-switch-p4").tap();
    await expect(page.locator(".local-player-dock")).toHaveAttribute("data-player-anchor", "p4");
    const switchedFive = await readLayout(page);
    expect(new Set(switchedFive.seats.map((seat) => seat.id)).size).toBe(4);
    const switchedRoom = await page.evaluate(() => window.__browserRoom.players);
    const seatRing = [...switchedRoom].sort((a, b) => a.seat - b.seat).map((player) => player.id);
    const viewerIndex = seatRing.indexOf("p4");
    for (const seat of switchedFive.seats) expect(seat.relativeIndex).toBe((seatRing.indexOf(seat.id) - viewerIndex + seatRing.length) % seatRing.length);

    const six = await assertPhoneRing(6, { topCount: 5 });
    expect(six.sideCount).toBe(0);
    const sixArtEvidence = six.topSeats.map((seat) => ({
      id: seat.id,
      seat: seat.seat,
      portrait: seat.art,
      image: seat.image,
      objectFit: seat.imageObjectFit,
      left: seat.imageLeft,
      transform: seat.imageTransform,
      translate: seat.imageTranslate,
    }));
    console.info(`[H2-G3 F1-R5 after 390x844 six-player TOP5] ${JSON.stringify(sixArtEvidence)}`);
    await testInfo.attach("h2-g3-f1-r5-after-390px-six-player-top5-domrects.json", {
      body: JSON.stringify(sixArtEvidence, null, 2),
      contentType: "application/json",
    });
    await captureF1Screenshot(page, testInfo, "h2-g3-f1-r5-after-390px-six-player-top5");
    assertTopPortraitFill(six, "390px six-player TOP5");
    const referenceWidth = six.topSeats[0].seat.width;
    expect(five.topSeats.every((seat) => Math.abs(seat.seat.width - referenceWidth) <= 1), "four-player top row keeps the same viewport reference width").toBe(true);
    expect(Math.max(...six.topSeats.map((seat) => seat.seat.width)) - Math.min(...six.topSeats.map((seat) => seat.seat.width))).toBeLessThanOrEqual(1);
    expect(Math.max(...six.topGaps) - Math.min(...six.topGaps)).toBeLessThanOrEqual(2);
    expect(Math.abs(six.topMargins.left - six.topMargins.right)).toBeLessThanOrEqual(4);

    const seven = await assertPhoneRing(7, { state: "bumper-harvest-choosing", topCount: 4, leftRelative: 1, rightRelative: 6 });
    assertTopPortraitFill(seven, "390px seven-player TOP4");
    reportF1Geometry("390x844 seven-player", seven);
    expect(seven.topSeats.every((seat) => Math.abs(seat.seat.width - referenceWidth) <= 1), "four top Seats retain the five-seat reference width").toBe(true);
    expect(Math.max(...seven.topGaps) - Math.min(...seven.topGaps)).toBeLessThanOrEqual(2);
    expect(Math.abs(seven.topMargins.left - seven.topMargins.right)).toBeLessThanOrEqual(4);
    expect(Math.abs(seven.sideAlignment.left)).toBeLessThanOrEqual(2);
    expect(Math.abs(seven.sideAlignment.right)).toBeLessThanOrEqual(2);
    assertSideSeatFrameParity(seven, "390px seven-player");
    assertSidePortraitFill(seven, "390px seven-player");
    await testInfo.attach("h2-g3-f1-r4-390px-seven-player-domrects.json", {
      body: JSON.stringify({ board: seven.board, topSeats: seven.topSeats.map((seat) => seat.seat), topGaps: seven.topGaps, topMargins: seven.topMargins, sideAlignment: seven.sideAlignment, sideSeats: seven.seats.filter((seat) => seat.side !== "top").map((seat) => ({ id: seat.id, side: seat.side, rect: seat.seat })) }, null, 2),
      contentType: "application/json",
    });
    await captureF1Screenshot(page, testInfo, "h2-g3-f1-r4-390px-seven-player");
    expect(seven.harvestPools).toHaveLength(1);
    for (const seat of seven.seats) {
      for (const obstacle of [...seven.harvestPools, ...seven.announcements, ...seven.timers, seven.dock, seven.menu]) {
        expect(overlaps(seat.seat, obstacle), `${seat.id} remains clear of public/local controls`).toBe(false);
      }
    }
    await page.getByTestId("test-view-switch-p3").tap();
    await expect(page.locator(".local-player-dock")).toHaveAttribute("data-player-anchor", "p3");
    const switchedSeven = await readLayout(page);
    expect(switchedSeven.seats).toHaveLength(6);
    expect(new Set(switchedSeven.seats.map((seat) => seat.id)).size).toBe(6);
    const switchedSevenRoom = await page.evaluate(() => window.__browserRoom.players);
    const switchedSevenRing = [...switchedSevenRoom].sort((a, b) => a.seat - b.seat).map((player) => player.id);
    const switchedSevenViewer = switchedSevenRing.indexOf("p3");
    for (const seat of switchedSeven.seats) expect(seat.relativeIndex).toBe((switchedSevenRing.indexOf(seat.id) - switchedSevenViewer + switchedSevenRing.length) % switchedSevenRing.length);

    const eight = await assertPhoneRing(8, { state: "rest", topCount: 5, leftRelative: 1, rightRelative: 7 });
    assertTopPortraitFill(eight, "390px eight-player TOP5");
    reportF1Geometry("390x844 eight-player", eight);
    expect(eight.sideCount).toBe(2);
    expect(eight.topSeats.every((seat) => Math.abs(seat.seat.width - referenceWidth) <= 1), "eight-player top row uses the same five-seat reference width").toBe(true);
    expect(Math.abs(eight.sideAlignment.left)).toBeLessThanOrEqual(2);
    expect(Math.abs(eight.sideAlignment.right)).toBeLessThanOrEqual(2);
    assertSideSeatFrameParity(eight, "390px eight-player");
    assertSidePortraitFill(eight, "390px eight-player");
    await testInfo.attach("h2-g3-f1-r4-390px-eight-player-domrects.json", {
      body: JSON.stringify({ board: eight.board, topSeats: eight.topSeats.map((seat) => seat.seat), topGaps: eight.topGaps, topMargins: eight.topMargins, sideAlignment: eight.sideAlignment, sideSeats: eight.seats.filter((seat) => seat.side !== "top").map((seat) => ({ id: seat.id, side: seat.side, rect: seat.seat })) }, null, 2),
      contentType: "application/json",
    });
    await captureF1Screenshot(page, testInfo, "h2-g3-f1-r4-390px-eight-player");
  } finally {
    await context.close();
  }
});

test("H2-G3 F1-R4 at 440px keeps eight-player TOP5+SIDE2 with matching Seat frames", async ({ browser }, testInfo) => {
  const context = await browser.newContext({ viewport: { width: 440, height: 766 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
  const page = await context.newPage();
  try {
    await loadFixture(page, { width: 440, height: 766, count: 8, state: "rest", playerNamePrefix: "Test Player" });
    const result = await readLayout(page);
    reportF1Geometry("440x766 eight-player", result);
    const topCount = Math.min(5, result.topCapacity);
    const sideCount = 7 - topCount;
    const leftCount = Math.floor(sideCount / 2);
    const topSeats = result.seats.filter((seat) => seat.side === "top").sort((left, right) => left.topIndex - right.topIndex);
    expect(result.seats).toHaveLength(7);
    expect(result.sideCount).toBe(sideCount);
    expect(topSeats).toHaveLength(topCount);
    expect(topSeats.map((seat) => seat.relativeIndex)).toEqual(Array.from({ length: topCount }, (_, index) => leftCount + index + 1));
    expect(result.pageWidth).toBeLessThanOrEqual(440);
    expect(result.boardStyle.alignContent).toBe("start");
    expect(result.boardStyle.alignItems).toBe("start");
    expect(Math.max(...topSeats.map((seat) => seat.seat.width)) - Math.min(...topSeats.map((seat) => seat.seat.width))).toBeLessThanOrEqual(1);
    expect(Math.max(...result.topGaps) - Math.min(...result.topGaps)).toBeLessThanOrEqual(2);
    expect(Math.abs(result.topMargins.left - result.topMargins.right)).toBeLessThanOrEqual(4);
    expect(Math.abs(result.sideAlignment.left)).toBeLessThanOrEqual(2);
    expect(Math.abs(result.sideAlignment.right)).toBeLessThanOrEqual(2);
    assertSideSeatFrameParity(result, "440px eight-player");
    assertSidePortraitFill(result, "440px eight-player");
    expect(topSeats.every((seat) => Math.abs(seat.seat.width - result.topSeats[0].seat.width) <= 1)).toBe(true);
    for (let index = 1; index < topSeats.length; index += 1) expect(topSeats[index].seat.x).toBeGreaterThan(topSeats[index - 1].seat.x);
    for (const seat of result.seats) {
      expect(seat.seat.height).toBe(108);
      expect(seat.hitSafe).toBe(true);
      expect(seat.switch?.hitSafe).toBe(true);
      expect(seat.seat.bottom).toBeLessThanOrEqual(result.dock.y - 6);
    }
    await testInfo.attach("h2-g3-f1-r4-440px-eight-player-domrects.json", {
      body: JSON.stringify({ board: result.board, topSeats: topSeats.map((seat) => seat.seat), topGaps: result.topGaps, topMargins: result.topMargins, sideAlignment: result.sideAlignment, sideSeats: result.seats.filter((seat) => seat.side !== "top").map((seat) => ({ id: seat.id, side: seat.side, rect: seat.seat })) }, null, 2),
      contentType: "application/json",
    });
    await captureF1Screenshot(page, testInfo, "h2-g3-f1-r4-440px-eight-player");
  } finally {
    await context.close();
  }
});

function overlaps(left, right) {
  return left.x < right.right && left.right > right.x && left.y < right.bottom && left.bottom > right.y;
}

function assertSideSeatFrameParity(layout, label) {
  const reference = layout.topSeats[0]?.seat;
  expect(reference, `${label} has a top Seat reference`).toBeTruthy();
  for (const seat of layout.seats.filter((entry) => entry.side === "left" || entry.side === "right")) {
    expect(Math.abs(seat.seat.width - reference.width), `${label} ${seat.side} outer frame width matches top`).toBeLessThanOrEqual(1);
    expect(Math.abs(seat.seat.height - reference.height), `${label} ${seat.side} outer frame height matches top`).toBeLessThanOrEqual(1);
  }
}

function assertSidePortraitFill(layout, label) {
  for (const seat of layout.seats.filter((entry) => entry.side === "left" || entry.side === "right")) {
    expect(seat.image, `${label} ${seat.side} Hero artwork is present`).toBeTruthy();
    expect(Math.abs(seat.image.x - seat.art.x), `${label} ${seat.side} artwork starts at the portrait edge`).toBeLessThanOrEqual(1);
    expect(Math.abs(seat.image.width - seat.art.width), `${label} ${seat.side} artwork fills the portrait width`).toBeLessThanOrEqual(1);
    expect(seat.imageObjectFit, `${label} ${seat.side} artwork keeps its proportions`).toBe("cover");
  }
}

function assertTopPortraitFill(layout, label) {
  const topSeats = layout.seats.filter((entry) => entry.side === "top").sort((left, right) => left.topIndex - right.topIndex);
  expect(topSeats.length, `${label} keeps its real top Seat count`).toBeGreaterThan(0);
  for (const seat of topSeats) {
    expect(seat.image, `${label} ${seat.id} has genuine Hero artwork`).toBeTruthy();
    expect(seat.imageLoaded, `${label} ${seat.id} Hero artwork is loaded`).toBe(true);
    expect(Math.abs(seat.image.x - seat.art.x), `${label} ${seat.id} artwork starts at portrait left`).toBeLessThanOrEqual(1);
    expect(seat.image.width, `${label} ${seat.id} artwork covers portrait content width`).toBeGreaterThanOrEqual(seat.art.width - 1);
    expect(seat.imageObjectFit, `${label} ${seat.id} artwork stays proportional`).toBe("cover");
    expect(seat.imageLeft, `${label} ${seat.id} artwork is positioned from the portrait left`).toBe("0px");
    expect(seat.imageTranslate, `${label} ${seat.id} artwork has no horizontal centering translation`).toBe("none");
    expect(seat.imageTransform, `${label} ${seat.id} artwork has no added transform`).toBe("none");
  }
}

function reportF1Geometry(label, layout) {
  console.info(`[H2-G3 F1-R4 ${label}] ${JSON.stringify({
    board: layout.board,
    topSeats: layout.topSeats.map((seat) => seat.seat),
    topGaps: layout.topGaps,
    topMargins: layout.topMargins,
    sideAlignment: layout.sideAlignment,
    sideSeats: layout.seats.filter((seat) => seat.side !== "top").map((seat) => ({ side: seat.side, rect: seat.seat })),
  })}`);
}

async function captureF1Screenshot(page, testInfo, label) {
  const path = testInfo.outputPath(`${label}.png`);
  await page.screenshot({ path, animations: "disabled" });
  await testInfo.attach(label, { path, contentType: "image/png" });
}

for (const width of VIEWPORTS) {
  for (const count of PLAYER_COUNTS) {
    test(`UX2.3 Side Column ${count}-player Hero thumbnails stay recognisable at ${width}px`, async ({ page }, testInfo) => {
      await loadFixture(page, { width, count });
      const result = await readLayout(page);
      const minimumWidth = width >= 480 ? 74 : 56;
      const minimumHeight = count === 10 && width >= 600 ? 100 : 108;
      expect(result.seats).toHaveLength(count - 1);
      expect(result.pageWidth, "seat sizing does not create horizontal page overflow").toBeLessThanOrEqual(width);
      expect(result.systemCluster.right, "system cluster uses the Stage's lower-right inset").toBeCloseTo(result.safeZone.right - 14, 0);
      const stageBoundaryOffset = width >= 600 ? 5 : 4;
      expect(result.systemCluster.bottom, "system cluster stays anchored at the Stage/Guidance boundary").toBeCloseTo(result.safeZone.bottom + stageBoundaryOffset, 0);
      expect(result.menu.width, "System Menu meets the minimum touch target").toBeGreaterThanOrEqual(44);
      expect(result.menu.height, "System Menu meets the minimum touch target").toBeGreaterThanOrEqual(44);
      expect(Math.abs(result.menu.right - (result.guidance.right - 8)), "System Menu aligns to the right edge of player guidance").toBeLessThanOrEqual(1);
      expect(result.menu.y).toBeGreaterThanOrEqual(result.guidance.y);
      expect(result.menu.bottom).toBeLessThanOrEqual(result.guidance.bottom);
      expect(result.guidance.y - result.systemCluster.bottom, "system cluster clears Guidance by 8–12px").toBeGreaterThanOrEqual(8);
      expect(result.guidance.y - result.systemCluster.bottom, "system cluster clears Guidance by 8–12px").toBeLessThanOrEqual(12);
      expect(overlaps(result.systemCluster, result.guidance), "system controls do not cover Local Guidance").toBe(false);
      for (const stageElement of result.stage) {
        expect(overlaps(result.systemCluster, stageElement), "system controls do not cover Interaction Stage content").toBe(false);
      }

      for (const seat of result.seats) {
        expect(seat.seat.width, `${seat.id} Hero seat width`).toBeGreaterThanOrEqual(minimumWidth);
        expect(seat.seat.height, `${seat.id} portrait seat height`).toBeGreaterThanOrEqual(minimumHeight);
        if (width >= 480) {
          expect(seat.seat.width / seat.seat.height, `${seat.id} keeps a portrait-oriented silhouette`).toBeLessThanOrEqual(0.75);
        }
        expect(seat.art.width, `${seat.id} dedicated Hero-art width`).toBeGreaterThanOrEqual(minimumWidth - 2);
        expect(seat.imageLoaded, `${seat.id} uses loaded repository Hero art`).toBe(true);
        expect(seat.hitSafe, `${seat.id} centre remains a normal target hit`).toBe(true);
        expect(seat.focalText, `${seat.id} identity text does not cover the Hero focal point`).toBe(false);
        expect(seat.focalEquipment, `${seat.id} equipment does not cover the Hero focal point`).toBe(false);
        expect(seat.seat.bottom, `${seat.id} remains above the Local Player Dock`).toBeLessThanOrEqual(result.dock.y - 6);

        const safeGap = seat.side === "top"
          ? result.safeZone.y - seat.seat.bottom
          : seat.side === "left"
            ? result.safeZone.x - seat.seat.right
            : seat.seat.x - result.safeZone.right;
        expect(safeGap, `${seat.id} remains outside the Interaction Safe Zone`).toBeGreaterThanOrEqual(7.9);

        for (const stageElement of result.stage) {
          if (!overlaps(seat.seat, stageElement)) continue;
          const clearance = seat.side === "top"
            ? stageElement.y - seat.seat.bottom
            : seat.side === "left"
              ? stageElement.x - seat.seat.right
              : seat.seat.x - stageElement.right;
          expect(clearance, `${stageElement.x} Stage content clears ${seat.id}`).toBeGreaterThanOrEqual(6);
        }

        for (const indicator of seat.equipment) {
          expect(indicator.x, `${seat.id} public equipment remains within the seat`).toBeGreaterThanOrEqual(seat.seat.x - 1);
          expect(indicator.right, `${seat.id} public equipment remains within the seat`).toBeLessThanOrEqual(seat.seat.right + 1);
        }
      }

      if (count === 10) {
        for (const seat of result.seats) {
          expect(overlaps(result.systemCluster, seat.seat), `${seat.id} is not covered by the System Menu`).toBe(false);
        }
      }

      if (count === 10 && (width === 480 || width === 650)) {
        await testInfo.attach(`side-column-${width}-10-player-hero-recognition`, {
          body: await page.screenshot({ animations: "disabled" }),
          contentType: "image/png",
        });
      }
    });
  }
}
