import { expect, test } from "@playwright/test";
import { writeFile } from "node:fs/promises";

const API = "http://127.0.0.1:3137";
const card = (kind, id, suit = "♠") => ({ id, kind, suit, rank: "7" });

async function seedSkillRoom(request, { hero, hand, hp = 4, maxHp = 4, targets = [] }) {
  const rolePool = [
    { name: "OTHER ONE", role: "Loyalist", hero: "sun-quan", hp: 4, maxHp: 4, hand: [] },
    { name: "OTHER TWO", role: "Rebel", hero: "cao-cao", hp: 4, maxHp: 4, hand: [] },
    { name: "OTHER THREE", role: "Renegade", hero: "zhao-yun", hp: 4, maxHp: 4, hand: [] },
  ];
  const remaining = rolePool.filter(({ role }) => !targets.some((target) => target.role === role));
  const players = [
    { name: "SKILL USER", role: "Lord", hero, hp, maxHp, hand },
    ...targets,
    ...remaining.slice(0, 3 - targets.length),
  ];
  const response = await request.post(`${API}/__test/seed-playing-game`, {
    data: { phase: "play", turnSeat: 0, players },
  });
  if (!response.ok()) throw new Error(`skill room seed failed: ${await response.text()}`);
  return response.json();
}

async function openSkillUser(page, seed, viewport = { width: 390, height: 844 }) {
  const user = seed.players[0];
  await page.setViewportSize(viewport);
  await page.addInitScript(({ code, token, name }) => {
    if (!localStorage.getItem("three-realms-session")) {
      localStorage.setItem("three-realms-session", JSON.stringify({ code, token, name }));
    }
  }, { code: seed.code, token: user.token, name: user.name });
  await page.goto(`${API}/`);
  await expect(page.locator(".game-shell")).toBeVisible();
  return user;
}

async function openSkillViewer(page, seed, player) {
  await page.setViewportSize({ width: 440, height: 894 });
  await page.addInitScript(({ code, token, name }) => {
    localStorage.setItem("three-realms-session", JSON.stringify({ code, token, name }));
  }, { code: seed.code, token: player.token, name: player.name });
  await page.goto(`${API}/`);
  await expect(page.locator(".game-shell")).toBeVisible();
  return player;
}

async function waitForRevealElapsed(page, eventId, elapsedMs) {
  await page.waitForFunction(({ eventId: expectedId, elapsedMs: requiredMs }) => {
    const cardElement = [...document.querySelectorAll("[data-public-card-journey-event-id]")]
      .find((element) => element.getAttribute("data-public-card-journey-event-id") === expectedId);
    const startedAt = cardElement?.getAttribute("data-public-card-journey-reveal-started-at");
    return Boolean(startedAt && Date.parse(startedAt) > 0 && Date.now() - Date.parse(startedAt) >= requiredMs);
  }, { eventId, elapsedMs }, { timeout: 12_000 });
}

async function installPublicJourneyTrace(page, viewerId) {
  const install = (id) => {
    const trace = { viewerId: id, records: [] };
    const lastMoveSampleAt = new Map();
    const snapshot = (element, reason) => {
      const eventId = element.getAttribute("data-public-card-journey-event-id");
      if (!eventId) return;
      const rect = element.getBoundingClientRect();
      const revealStartedAt = element.getAttribute("data-public-card-journey-reveal-started-at");
      trace.records.push({
        viewerId: id,
        eventId,
        actorId: element.getAttribute("data-public-card-journey-actor-id"),
        cardIds: element.getAttribute("data-public-card-journey-card-ids"),
        phase: element.getAttribute("data-public-card-journey-phase"),
        size: element.getAttribute("data-public-card-journey-size"),
        actual: { left: rect.left, top: rect.top, width: rect.width, height: rect.height },
        target: {
          left: Number(element.getAttribute("data-public-card-journey-target-left")),
          top: Number(element.getAttribute("data-public-card-journey-target-top")),
          width: Number(element.getAttribute("data-public-card-journey-target-width")),
          height: Number(element.getAttribute("data-public-card-journey-target-height")),
        },
        revealStartedAt,
        revealElapsedMs: revealStartedAt ? Date.now() - Date.parse(revealStartedAt) : null,
        layoutChangeReason: element.getAttribute("data-public-card-journey-layout-reason"),
        accessibleName: element.getAttribute("aria-label"),
        reason,
        sampledAt: performance.now(),
      });
    };
    const rememberAdded = (node) => {
      if (!(node instanceof Element)) return;
      if (node.matches("[data-public-card-journey-event-id]")) snapshot(node, "mounted");
      node.querySelectorAll("[data-public-card-journey-event-id]").forEach((element) => snapshot(element, "mounted"));
    };
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === "attributes") snapshot(mutation.target, mutation.attributeName ?? "attribute");
        else mutation.addedNodes.forEach(rememberAdded);
      }
    });
    observer.observe(document.documentElement, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ["data-public-card-journey-phase", "data-public-card-journey-layout-reason"],
    });
    const sampleMoves = () => {
      const now = performance.now();
      document.querySelectorAll("[data-public-card-journey-phase='move']").forEach((element) => {
        const eventId = element.getAttribute("data-public-card-journey-event-id");
        if (!eventId || now - (lastMoveSampleAt.get(eventId) ?? 0) < 70) return;
        lastMoveSampleAt.set(eventId, now);
        snapshot(element, "move-frame");
      });
      requestAnimationFrame(sampleMoves);
    };
    requestAnimationFrame(sampleMoves);
    window.__wtkPublicJourneyTrace = trace;
  };
  await page.evaluate(install, viewerId);
}

async function readJourneyCheckpoint(page, eventId, viewerId, checkpoint) {
  const journeyCard = page.locator(`[data-public-card-journey-event-id="${eventId}"]`);
  await expect(journeyCard).toHaveCount(1);
  return journeyCard.evaluate((element, details) => {
    const rect = element.getBoundingClientRect();
    const intersects = (left, right) => left.left < right.right - 1 && left.right > right.left + 1
      && left.top < right.bottom - 1 && left.bottom > right.top + 1;
    const protectedSelectors = [
      ["opponent-seat", ".opponent-player-card[data-player-anchor]"],
      ["player-status", ".player-board-status"],
      ["local-dock", ".local-player-dock"],
      ["guidance", ".console-guidance"],
      ["timer", ".visible-countdown"],
      ["system-menu", ".stage-system-cluster"],
      ["activity-chip", "[data-public-activity-chip='true']"],
      ["public-announcement", ".public-card-display-journey-copy"],
    ];
    const protectedOverlaps = [];
    for (const [name, selector] of protectedSelectors) {
      for (const obstacle of document.querySelectorAll(selector)) {
        if (obstacle === element || obstacle.contains(element) || element.contains(obstacle)) continue;
        const style = getComputedStyle(obstacle);
        const obstacleRect = obstacle.getBoundingClientRect();
        if (style.display === "none" || style.visibility === "hidden" || Number(style.opacity) === 0
          || obstacleRect.width <= 0 || obstacleRect.height <= 0) continue;
        if (intersects(rect, obstacleRect)) protectedOverlaps.push({ name, text: (obstacle.textContent ?? "").trim().slice(0, 90) });
      }
    }
    const announcementRects = [...document.querySelectorAll(
      ".public-card-display-journey-copy, .effect-notice, .turn-notice",
    )].map((announcement) => {
      const announcementRect = announcement.getBoundingClientRect();
      const style = getComputedStyle(announcement);
      const seatOverlaps = [...document.querySelectorAll(".opponent-player-card[data-player-anchor]")].flatMap((seat) => {
        const seatRect = seat.getBoundingClientRect();
        return intersects(announcementRect, seatRect) ? [{
          playerId: seat.getAttribute("data-player-anchor"),
          rect: { left: seatRect.left, top: seatRect.top, width: seatRect.width, height: seatRect.height },
        }] : [];
      });
      const copy = announcement.querySelector("b") ?? announcement;
      const range = document.createRange();
      range.selectNodeContents(copy);
      return {
        kind: announcement.className,
        eventId: announcement.getAttribute("data-public-card-announcement-event-id")
          ?? announcement.getAttribute("data-effect-notice-event-id"),
        anchorEventId: announcement.getAttribute("data-public-card-copy-anchor-event-id"),
        stylePosition: style.position,
        styleTop: announcement.style.top,
        styleLeft: announcement.style.left,
        fallback: announcement.getAttribute("data-public-card-announcement-fallback"),
        compact: announcement.getAttribute("data-public-card-announcement-compact"),
        selectedWidth: announcement.getAttribute("data-public-card-announcement-width"),
        text: (copy.textContent ?? "").trim(),
        rect: { left: announcementRect.left, top: announcementRect.top, width: announcementRect.width, height: announcementRect.height },
        lines: range.getClientRects().length,
        visible: style.display !== "none" && style.visibility !== "hidden" && Number(style.opacity) !== 0,
        seatOverlaps,
      };
    });
    const copyAnchorId = element.getAttribute("data-public-card-journey-event-id");
    const scopedDisplay = element.closest(".public-card-display");
    const announcementAnchorId = scopedDisplay?.querySelector("[data-public-card-announcement]")
      ?.getAttribute("data-public-card-copy-anchor-event-id");
    const announcementAnchor = announcementAnchorId
      ? [...document.querySelectorAll("[data-public-card-copy-anchor-event-id]")]
        .find((candidate) => candidate.getAttribute("data-public-card-copy-anchor-event-id") === announcementAnchorId)
      : null;
    const announcementAnchorRect = announcementAnchor?.getBoundingClientRect();
    const copyAnchor = [...document.querySelectorAll("[data-public-card-copy-anchor-event-id]")]
      .find((candidate) => candidate.getAttribute("data-public-card-copy-anchor-event-id") === copyAnchorId);
    const copyAnchorRect = copyAnchor?.getBoundingClientRect();
    const playTableRect = document.querySelector(".play-table")?.getBoundingClientRect();
    const journeyAnnouncements = [...(scopedDisplay?.querySelectorAll(".public-card-display-journey-copy") ?? [])].map((announcement) => {
      const announcementRect = announcement.getBoundingClientRect();
      const copy = announcement.querySelector("b") ?? announcement;
      const range = document.createRange();
      range.selectNodeContents(copy);
      const style = getComputedStyle(announcement);
      const seatOverlaps = [...document.querySelectorAll(".opponent-player-card[data-player-anchor]")].flatMap((seat) => {
        const seatRect = seat.getBoundingClientRect();
        return intersects(announcementRect, seatRect) ? [{ playerId: seat.getAttribute("data-player-anchor") }] : [];
      });
      return {
        eventId: announcement.getAttribute("data-public-card-announcement-event-id"),
        anchorEventId: announcement.getAttribute("data-public-card-copy-anchor-event-id"),
        text: (copy.textContent ?? "").trim(),
        rect: { left: announcementRect.left, top: announcementRect.top, width: announcementRect.width, height: announcementRect.height },
        lines: range.getClientRects().length,
        visible: style.display !== "none" && style.visibility !== "hidden" && Number(style.opacity) !== 0,
        seatOverlaps,
      };
    });
    const lustFrame = scopedDisplay?.querySelector("[data-public-card-frame-kind='DIAO_CHAN_LUST_COST']");
    const lustFrameBounds = lustFrame?.getBoundingClientRect();
    const startedAt = element.getAttribute("data-public-card-journey-reveal-started-at");
    return {
      viewerId: details.viewerId,
      checkpoint: details.checkpoint,
      eventId: element.getAttribute("data-public-card-journey-event-id"),
      displayMotion: scopedDisplay?.getAttribute("data-public-card-motion"),
      settlementEventId: scopedDisplay?.getAttribute("data-public-card-settlement-event-id"),
      actorId: element.getAttribute("data-public-card-journey-actor-id"),
      cardIds: element.getAttribute("data-public-card-journey-card-ids"),
      phase: element.getAttribute("data-public-card-journey-phase"),
      size: element.getAttribute("data-public-card-journey-size"),
      actual: { left: rect.left, top: rect.top, width: rect.width, height: rect.height },
      target: {
        left: Number(element.getAttribute("data-public-card-journey-target-left")),
        top: Number(element.getAttribute("data-public-card-journey-target-top")),
        width: Number(element.getAttribute("data-public-card-journey-target-width")),
        height: Number(element.getAttribute("data-public-card-journey-target-height")),
      },
      revealStartedAt: startedAt,
      revealElapsedMs: startedAt ? Date.now() - Date.parse(startedAt) : null,
      layoutChangeReason: element.getAttribute("data-public-card-journey-layout-reason"),
      accessibleName: element.getAttribute("aria-label"),
      inspectable: element.getAttribute("data-public-card-inspectable"),
      protectedOverlaps,
      announcementRects,
      journeyAnnouncements,
      lustFrameRect: lustFrameBounds ? { left: lustFrameBounds.left, top: lustFrameBounds.top, width: lustFrameBounds.width, height: lustFrameBounds.height } : null,
      copyAnchorRect: copyAnchorRect ? { left: copyAnchorRect.left, top: copyAnchorRect.top, width: copyAnchorRect.width, height: copyAnchorRect.height } : null,
      announcementAnchorRect: announcementAnchorRect ? { left: announcementAnchorRect.left, top: announcementAnchorRect.top, width: announcementAnchorRect.width, height: announcementAnchorRect.height } : null,
      playTableRect: playTableRect ? { left: playTableRect.left, top: playTableRect.top, width: playTableRect.width, height: playTableRect.height } : null,
      viewport: { width: window.innerWidth, height: window.innerHeight, scrollWidth: document.documentElement.scrollWidth },
    };
  }, { viewerId, checkpoint });
}

async function attachJourneyScreenshot(page, testInfo, prefix, checkpoint) {
  const name = `${prefix}-${checkpoint}.png`;
  const path = testInfo.outputPath(name);
  await page.screenshot({ path });
  await testInfo.attach(name, { path, contentType: "image/png" });
}

async function attachJourneyJson(testInfo, name, value) {
  const path = testInfo.outputPath(name);
  await writeFile(path, JSON.stringify(value, null, 2));
  await testInfo.attach(name, { path, contentType: "application/json" });
}

async function captureJourneyLifecycle(page, eventId, viewerId, checkpoints, { screenshotPrefix, testInfo, stableAnnouncementRect } = {}) {
  const journeyCard = page.locator(`[data-public-card-journey-event-id="${eventId}"]`);
  await expect(journeyCard).toHaveCount(1);
  await expect(journeyCard).toHaveAttribute("data-public-card-journey-phase", "reveal");

  await waitForRevealElapsed(page, eventId, 500);
  const at500 = await readJourneyCheckpoint(page, eventId, viewerId, "reveal-500ms");
  expect(at500.phase).toBe("reveal");
  expect(at500.actual).toMatchObject({ width: 90, height: 135 });
  expect(at500.journeyAnnouncements).toHaveLength(1);
  expect(at500.journeyAnnouncements[0].visible).toBe(true);
  expect(at500.journeyAnnouncements[0].lines).toBeLessThanOrEqual(2);
  expect(at500.journeyAnnouncements[0].seatOverlaps).toEqual([]);
  const at500Announcement = at500.journeyAnnouncements[0].rect;
  const centeredRevealAnchor = at500.lustFrameRect ?? at500.actual;
  expect(Math.abs((at500Announcement.left + at500Announcement.width / 2)
    - (centeredRevealAnchor.left + centeredRevealAnchor.width / 2))).toBeLessThanOrEqual(12);
  if (at500.lustFrameRect) {
    expect(at500Announcement.top - (at500.lustFrameRect.top + at500.lustFrameRect.height)).toBeGreaterThanOrEqual(5);
    expect(at500Announcement.top - (at500.lustFrameRect.top + at500.lustFrameRect.height)).toBeLessThanOrEqual(12);
  }
  if (stableAnnouncementRect) {
    for (const dimension of ["left", "top", "width", "height"]) {
      expect(Math.abs(at500Announcement[dimension] - stableAnnouncementRect[dimension])).toBeLessThanOrEqual(dimension === "top" ? 16 : 1);
    }
  }
  checkpoints.push(at500);
  if (screenshotPrefix && testInfo) await attachJourneyScreenshot(page, testInfo, screenshotPrefix, "reveal-500ms");

  await waitForRevealElapsed(page, eventId, 3500);
  const at3500 = await readJourneyCheckpoint(page, eventId, viewerId, "reveal-3500ms");
  expect(at3500.phase).toBe("reveal");
  expect(at3500.actual).toMatchObject({ width: 90, height: 135 });
  expect(at3500.revealElapsedMs).toBeGreaterThanOrEqual(3500);
  expect(at3500.journeyAnnouncements).toHaveLength(1);
  expect(at3500.journeyAnnouncements[0].visible).toBe(true);
  expect(at3500.journeyAnnouncements[0].lines).toBeLessThanOrEqual(2);
  expect(at3500.journeyAnnouncements[0].seatOverlaps).toEqual([]);
  for (const dimension of ["left", "top", "width", "height"]) {
    expect(Math.abs(at3500.journeyAnnouncements[0].rect[dimension] - at500Announcement[dimension])).toBeLessThanOrEqual(1);
  }
  checkpoints.push(at3500);
  if (screenshotPrefix && testInfo) await attachJourneyScreenshot(page, testInfo, screenshotPrefix, "reveal-3500ms");

  const movingHandle = await page.waitForFunction(({ expectedId, expectedViewerId }) => {
    const element = [...document.querySelectorAll("[data-public-card-journey-event-id]")]
      .find((candidate) => candidate.getAttribute("data-public-card-journey-event-id") === expectedId);
    const rect = element?.getBoundingClientRect();
    if (!element || element.getAttribute("data-public-card-journey-phase") !== "move"
      || !rect || rect.width >= 88 || rect.width <= 50) return false;
    const revealStartedAt = element.getAttribute("data-public-card-journey-reveal-started-at");
    return {
      viewerId: expectedViewerId,
      checkpoint: "direct-move-midpoint",
      eventId: element.getAttribute("data-public-card-journey-event-id"),
      actorId: element.getAttribute("data-public-card-journey-actor-id"),
      cardIds: element.getAttribute("data-public-card-journey-card-ids"),
      phase: element.getAttribute("data-public-card-journey-phase"),
      size: element.getAttribute("data-public-card-journey-size"),
      actual: { left: rect.left, top: rect.top, width: rect.width, height: rect.height },
      target: {
        left: Number(element.getAttribute("data-public-card-journey-target-left")),
        top: Number(element.getAttribute("data-public-card-journey-target-top")),
        width: Number(element.getAttribute("data-public-card-journey-target-width")),
        height: Number(element.getAttribute("data-public-card-journey-target-height")),
      },
      revealStartedAt,
      revealElapsedMs: revealStartedAt ? Date.now() - Date.parse(revealStartedAt) : null,
      layoutChangeReason: element.getAttribute("data-public-card-journey-layout-reason"),
      accessibleName: element.getAttribute("aria-label"),
      inspectable: element.getAttribute("data-public-card-inspectable"),
      viewport: { width: window.innerWidth, height: window.innerHeight, scrollWidth: document.documentElement.scrollWidth },
      sampledAt: performance.now(),
    };
  }, { expectedId: eventId, expectedViewerId: viewerId }, { polling: "raf", timeout: 1500 });
  const moving = await movingHandle.jsonValue();
  await movingHandle.dispose();
  const movingCheckpoint = await readJourneyCheckpoint(page, eventId, viewerId, "move-midpoint");
  expect(moving.phase).toBe("move");
  expect(moving.actual.width).toBeGreaterThan(50);
  expect(moving.actual.width).toBeLessThan(88);
  const startCenter = { x: at3500.actual.left + at3500.actual.width / 2, y: at3500.actual.top + at3500.actual.height / 2 };
  const targetCenter = { x: moving.target.left + moving.target.width / 2, y: moving.target.top + moving.target.height / 2 };
  const movingCenter = { x: moving.actual.left + moving.actual.width / 2, y: moving.actual.top + moving.actual.height / 2 };
  const startDistance = Math.hypot(targetCenter.x - startCenter.x, targetCenter.y - startCenter.y);
  const currentDistance = Math.hypot(targetCenter.x - movingCenter.x, targetCenter.y - movingCenter.y);
  expect(currentDistance).toBeLessThan(startDistance - 1);
  expect(currentDistance).toBeGreaterThan(1);
  expect(movingCheckpoint.journeyAnnouncements).toHaveLength(1);
  for (const dimension of ["left", "top", "width", "height"]) {
    expect(Math.abs(movingCheckpoint.journeyAnnouncements[0].rect[dimension] - at500Announcement[dimension]))
      .toBeLessThanOrEqual(dimension === "top" ? 16 : 1);
  }
  checkpoints.push(moving);
  if (screenshotPrefix && testInfo) await attachJourneyScreenshot(page, testInfo, screenshotPrefix, "move-midpoint");

  await expect(journeyCard).toHaveAttribute("data-public-card-journey-phase", "parked", { timeout: 1200 });
  const parked = await readJourneyCheckpoint(page, eventId, viewerId, "parked");
  expect(parked.phase).toBe("parked");
  expect(Math.abs(parked.actual.left - parked.target.left)).toBeLessThan(1);
  expect(Math.abs(parked.actual.top - parked.target.top)).toBeLessThan(1);
  expect(Math.abs(parked.actual.width - parked.target.width)).toBeLessThan(1);
  expect(Math.abs(parked.actual.height - parked.target.height)).toBeLessThan(1);
  expect(parked.inspectable).toBe("true");
  expect(parked.accessibleName).toMatch(/^View public .+ card details,/);
  expect(parked.protectedOverlaps).toEqual([]);
  expect(parked.viewport.scrollWidth).toBeLessThanOrEqual(parked.viewport.width);
  expect(parked.journeyAnnouncements).toHaveLength(1);
  expect(parked.journeyAnnouncements[0].visible).toBe(true);
  expect(parked.journeyAnnouncements[0].lines).toBeLessThanOrEqual(2);
  expect(parked.journeyAnnouncements[0].seatOverlaps).toEqual([]);
  for (const dimension of ["left", "top", "width", "height"]) {
    expect(Math.abs(parked.journeyAnnouncements[0].rect[dimension] - at500Announcement[dimension]),
      `announcement ${dimension} changed: ${JSON.stringify({ reveal: at500Announcement, parked: parked.journeyAnnouncements[0].rect })}`)
      .toBeLessThanOrEqual(dimension === "top" ? 16 : 1);
  }
  checkpoints.push(parked);
  if (screenshotPrefix && testInfo) await attachJourneyScreenshot(page, testInfo, screenshotPrefix, "parked");
  return parked;
}

async function assertJourneyUsesActorAnchor(page, viewer, actor, checkpoint) {
  if (viewer.id === actor.id) {
    const dock = await page.locator(`.local-player-dock[data-player-anchor="${actor.id}"]`).boundingBox();
    expect(checkpoint.target.left).toBeCloseTo(dock.x + 8, 0);
    expect(checkpoint.target.top).toBeCloseTo(dock.y - checkpoint.target.height - 6, 0);
    return;
  }
  const seat = await page.locator(`.opponent-player-card[data-player-anchor="${actor.id}"]`).boundingBox();
  expect(checkpoint.target.left + checkpoint.target.width / 2).toBeCloseTo(seat.x + seat.width / 2, 0);
  expect(checkpoint.target.top).toBeCloseTo(seat.y + seat.height + 6, 0);
}

async function submitDuelAttack(page, player, attackId, { alreadySelected = false } = {}) {
  const dock = page.locator(`.local-player-dock[data-player-anchor="${player.id}"]`);
  const cardButton = dock.locator(`[data-hand-card-id="${attackId}"] .game-card`);
  await expect(cardButton).toBeEnabled();
  if (!alreadySelected) await cardButton.click();
  const confirm = dock.locator('[data-action-slot="primary"] button.primary');
  await expect(confirm).toHaveText("Confirm");
  await expect(confirm).toBeEnabled();
  const submittedPromise = page.waitForResponse((response) => response.url() === `${API}/api/rooms`
    && response.request().method() === "POST"
    && response.request().postDataJSON()?.action === "respond"
    && response.request().postDataJSON()?.providerId === "card");
  await confirm.click();
  const submitted = await submittedPromise;
  expect(submitted.ok()).toBeTruthy();
  expect(submitted.request().postDataJSON()).toMatchObject({ action: "respond", token: player.token, providerId: "card", cardId: attackId });
  return submitted.json();
}

async function projectedRoom(request, seed, user) {
  const response = await request.get(`${API}/api/rooms?code=${seed.code}&token=${user.token}`);
  expect(response.ok()).toBeTruthy();
  return response.json();
}

async function completeSkillSelection({ page, request, seed, skillName, providerId, cardIds, targetIndexes, userIndex = 0 }) {
  const user = seed.players[userIndex];
  const projection = await projectedRoom(request, seed, user);
  expect(projection.currentAction).toMatchObject({ kind: "turn", actorId: user.id });
  expect(projection.currentAction.triggerOptions.map((option) => option.effectId)).toContain(providerId);

  const dock = page.locator(`.local-player-dock[data-player-anchor="${user.id}"]`);
  const skill = dock.locator(".local-hero-skills").getByRole("button", { name: skillName, exact: true });
  const duplicate = dock.locator('[data-action-extras="true"]').getByRole("button", { name: new RegExp(skillName, "i") });
  await expect(skill).toBeEnabled();
  await expect(duplicate).toHaveCount(0);
  await skill.click();
  await expect(skill).toHaveAttribute("aria-pressed", "true");

  for (const id of cardIds) {
    const cardButton = dock.locator(`[data-hand-card-id="${id}"] .game-card`);
    await expect(cardButton).toBeEnabled();
    await cardButton.click();
  }
  for (const index of targetIndexes) {
    const target = seed.players[index];
    await page.getByRole("button", { name: `Select ${target.name}`, exact: true }).click();
  }

  const confirm = dock.locator('[data-action-slot="primary"] button.primary');
  await expect(confirm).toHaveText("Confirm");
  await expect(confirm).toBeEnabled();
  const submittedPromise = page.waitForResponse((response) => response.url() === `${API}/api/rooms`
    && response.request().method() === "POST"
    && response.request().postDataJSON()?.action === "trigger"
    && response.request().postDataJSON()?.providerId === providerId);
  await confirm.click();
  const submitted = await submittedPromise;
  expect(submitted.ok()).toBeTruthy();
  expect(submitted.request().postDataJSON()).toMatchObject({ action: "trigger", providerId, cardIds });
  expect(submitted.request().postDataJSON()).not.toHaveProperty("cardId");
  if (targetIndexes.length === 1) expect(submitted.request().postDataJSON().targetId).toBe(seed.players[targetIndexes[0]].id);
  if (targetIndexes.length > 1) expect(submitted.request().postDataJSON().targetIds).toEqual(targetIndexes.map((index) => seed.players[index].id));
  await expect(duplicate).toHaveCount(0);
  return await submitted.json();
}

test("real Benevolence uses its server-selected Hand card and target", async ({ page, request }) => {
  const gift = card("Peach", "real-rende-gift", "♥");
  const seed = await seedSkillRoom(request, {
    hero: "liu-bei", hand: [gift],
    targets: [{ name: "RECIPIENT", role: "Loyalist", hero: "zhao-yun", hp: 4, maxHp: 4, hand: [] }],
  });
  await openSkillUser(page, seed);
  await completeSkillSelection({ page, request, seed, skillName: "Benevolence", providerId: "liu_bei_rende", cardIds: [gift.id], targetIndexes: [1] });
});

test("real Ambushment uses only an eligible black Hand card and a legal target", async ({ page, request }) => {
  const black = card("Dodge", "real-qixi-black", "♣");
  const targetCard = card("Peach", "real-qixi-target", "♥");
  const seed = await seedSkillRoom(request, {
    hero: "gan-ning", hand: [black],
    targets: [{ name: "TARGET", role: "Loyalist", hero: "zhao-yun", hp: 4, maxHp: 4, hand: [targetCard] }],
  });
  await openSkillUser(page, seed);
  await completeSkillSelection({ page, request, seed, skillName: "Ambushment", providerId: "gan_ning_qixi", cardIds: [black.id], targetIndexes: [1] });
});

test("real Captivating submits the Diamond card and authoritative Overindulgence target", async ({ page, request }) => {
  const diamond = card("Peach", "real-captivating-diamond", "♦");
  const seed = await seedSkillRoom(request, {
    hero: "daqiao", hand: [diamond],
    targets: [{ name: "TARGET", role: "Loyalist", hero: "zhao-yun", hp: 4, maxHp: 4, hand: [] }],
  });
  await openSkillUser(page, seed);
  await completeSkillSelection({ page, request, seed, skillName: "Captivating", providerId: "daqiao_captivating", cardIds: [diamond.id], targetIndexes: [1] });
});

test("real Betrothment requires two cards and an injured male target", async ({ page, request }) => {
  const first = card("Dodge", "real-betrothment-first", "♣");
  const second = card("Peach", "real-betrothment-second", "♥");
  const seed = await seedSkillRoom(request, {
    hero: "sun-shangxiang", hp: 3, maxHp: 4, hand: [first, second],
    targets: [{ name: "INJURED MAN", role: "Loyalist", hero: "zhao-yun", hp: 3, maxHp: 4, hand: [] }],
  });
  await openSkillUser(page, seed);
  await completeSkillSelection({ page, request, seed, skillName: "Betrothment", providerId: "sun_shangxiang_betrothment", cardIds: [first.id, second.id], targetIndexes: [1] });
});

test("real Prodigal Healer submits the eligible card and injured character", async ({ page, request }) => {
  const cost = card("Attack", "real-prodigal-cost");
  const seed = await seedSkillRoom(request, {
    hero: "hua-tuo", hand: [cost],
    targets: [{ name: "INJURED", role: "Loyalist", hero: "liu-bei", hp: 3, maxHp: 4, hand: [] }],
  });
  await openSkillUser(page, seed);
  await completeSkillSelection({ page, request, seed, skillName: "Prodigal Healer", providerId: "hua_tuo_prodigal_healer", cardIds: [cost.id], targetIndexes: [1] });
});

test("real Lust shows its linked public cost Frame for four seconds, parks once, and restores parked for another viewer", async ({ page, request }, testInfo) => {
  const cost = card("Dodge", "real-lust-cost");
  const hiddenCard = card("Peach", "real-lust-private-unspent", "♥");
  const seed = await seedSkillRoom(request, {
    hero: "diao-chan", hand: [cost, hiddenCard],
    targets: [
      { name: "FIRST MAN", role: "Loyalist", hero: "liu-bei", hp: 4, maxHp: 4, hand: [] },
      { name: "SECOND MAN", role: "Rebel", hero: "cao-cao", hp: 4, maxHp: 4, hand: [] },
    ],
  });
  await openSkillUser(page, seed, { width: 440, height: 894 });
  const started = await completeSkillSelection({ page, request, seed, skillName: "Lust", providerId: "diao_chan_lust", cardIds: [cost.id], targetIndexes: [1, 2] });
  const activation = started.room.presentationSnapshot.diaoChanSkillNotices.find((notice) => notice.notice === "ACTIVATION");
  expect(activation).toMatchObject({
    effectId: "diao_chan_lust", sourceId: seed.players[0].id,
    firstParticipantId: seed.players[1].id, secondParticipantId: seed.players[2].id, firstActorId: seed.players[1].id,
    costEventId: started.room.timeline.find((event) => event.type === "cards" && event.cards.some((item) => item.id === cost.id)).id,
  });
  const costEvent = started.room.timeline.find((event) => event.id === activation.costEventId);
  expect(costEvent.publicCardEffects[0]).toMatchObject({
    eventId: activation.costEventId, activationEventId: activation.eventId,
    effectId: "diao_chan_lust", effectClass: "COST", activationOwnerId: seed.players[0].id,
    targetIds: [seed.players[1].id, seed.players[2].id], outcome: "DUEL_DECLARED",
  });
  expect(costEvent.cards).toEqual([cost]);
  const display = page.locator('.public-card-display[data-public-card-motion="lust-cost"]');
  const presentedCost = display.locator(`[data-public-card-journey-card-id="${cost.id}"]`);
  const frame = display.locator(`[data-public-card-frame-event-id="${activation.eventId}"]`);
  const announcement = display.locator('[data-public-card-announcement="true"]');
  await expect(display).toBeVisible();
  await expect(presentedCost).toHaveAttribute("data-public-card-journey-phase", "reveal");
  await expect(presentedCost).toHaveAttribute("data-public-card-journey-actor-id", seed.players[0].id);
  await expect(frame).toContainText("LUST");
  await expect(announcement).toHaveAttribute("data-public-card-announcement-event-id", activation.eventId);
  await expect(announcement).toContainText("Diao Chan used Lust: FIRST MAN and SECOND MAN enter a Duel; FIRST MAN plays Attack first.");
  await expect(page.locator(`[data-effect-notice-event-id="${activation.eventId}"]`)).toHaveCount(0);
  await expect(display.locator("[data-public-card-frame-kind='DIAO_CHAN_LUST_COST']")).toHaveCount(1);
  await expect(display.locator("[data-public-card-journey-card-id]")).toHaveCount(1);

  await page.waitForFunction((eventId) => {
    const cardElement = [...document.querySelectorAll("[data-public-card-journey-event-id]")]
      .find((element) => element.getAttribute("data-public-card-journey-event-id") === eventId);
    const startedAt = cardElement?.getAttribute("data-public-card-journey-reveal-started-at");
    return Boolean(startedAt && Date.parse(startedAt) > 0 && Date.now() - Date.parse(startedAt) >= 500);
  }, activation.costEventId);
  const revealAt500 = await presentedCost.boundingBox();
  expect(revealAt500).toMatchObject({ width: 90, height: 135 });
  const noticeAt500 = await announcement.boundingBox();
  const frameAt500 = await frame.boundingBox();
  expect(Math.abs(noticeAt500.x + noticeAt500.width / 2 - (frameAt500.x + frameAt500.width / 2))).toBeLessThanOrEqual(12);
  expect(noticeAt500.y + noticeAt500.height + 6).toBeLessThanOrEqual(frameAt500.y + 1);
  await page.screenshot({ path: testInfo.outputPath("lust-cost-frame-440-after-500ms.png") });
  await page.waitForFunction((eventId) => {
    const cardElement = [...document.querySelectorAll("[data-public-card-journey-event-id]")]
      .find((element) => element.getAttribute("data-public-card-journey-event-id") === eventId);
    const startedAt = cardElement?.getAttribute("data-public-card-journey-reveal-started-at");
    return Boolean(startedAt && Date.parse(startedAt) > 0 && Date.now() - Date.parse(startedAt) >= 3500);
  }, activation.costEventId);
  await expect(presentedCost).toHaveAttribute("data-public-card-journey-phase", "reveal");
  const revealAt3500 = await presentedCost.boundingBox();
  expect(revealAt3500).toMatchObject({ width: 90, height: 135 });
  expect(Math.abs(revealAt3500.x - revealAt500.x)).toBeLessThan(1);
  expect(Math.abs(revealAt3500.y - revealAt500.y)).toBeLessThan(1);
  const noticeAt3500 = await announcement.boundingBox();
  expect(Math.abs(noticeAt3500.x - noticeAt500.x)).toBeLessThanOrEqual(1);
  expect(Math.abs(noticeAt3500.y - noticeAt500.y)).toBeLessThanOrEqual(1);
  await page.screenshot({ path: testInfo.outputPath("lust-cost-frame-440-after-3500ms.png") });
  await expect(presentedCost).toHaveAttribute("data-public-card-journey-phase", "move", { timeout: 1500 });
  await expect(presentedCost).toHaveAttribute("data-public-card-journey-phase", "parked", { timeout: 1500 });
  await expect(display.locator("[data-public-card-frame-kind='DIAO_CHAN_LUST_COST']")).toHaveCount(0);
  const parked = await presentedCost.boundingBox();
  const noticeParked = await announcement.boundingBox();
  const target = await presentedCost.evaluate((element) => ({
    left: Number(element.dataset.publicCardJourneyTargetLeft),
    top: Number(element.dataset.publicCardJourneyTargetTop),
  }));
  const dock = await page.locator(`.local-player-dock[data-player-anchor="${seed.players[0].id}"]`).boundingBox();
  expect(Math.abs(parked.x - target.left)).toBeLessThan(1);
  expect(Math.abs(parked.y - target.top)).toBeLessThan(1);
  expect(Math.abs(target.left - (dock.x + 8))).toBeLessThan(1);
  expect(Math.abs(target.top - (dock.y - 78))).toBeLessThan(1);
  expect(Math.abs(noticeParked.x - noticeAt500.x)).toBeLessThanOrEqual(1);
  expect(Math.abs(noticeParked.y - noticeAt500.y)).toBeLessThanOrEqual(1);
  await page.screenshot({ path: testInfo.outputPath("lust-cost-frame-440-parked.png") });

  const firstViewer = seed.players[1];
  const firstProjection = await projectedRoom(request, seed, firstViewer);
  const restoredActivation = firstProjection.presentationSnapshot.diaoChanSkillNotices.find((notice) => notice.eventId === activation.eventId);
  expect(restoredActivation).toMatchObject({
    eventId: activation.eventId, costEventId: activation.costEventId,
    sourceId: seed.players[0].id, firstParticipantId: firstViewer.id,
  });
  expect(firstProjection.presentationSnapshot.publicCardEffects.find((effect) => effect.eventId === activation.costEventId)).toMatchObject({
    eventId: activation.costEventId, activationEventId: activation.eventId,
    activationOwnerId: seed.players[0].id, materials: [{ cardId: cost.id, ownerId: seed.players[0].id, fromZone: "HAND", toZone: "DISCARD" }],
  });
  expect(firstProjection.currentAction).toMatchObject({ kind: "response", actorId: firstViewer.id, requirement: "attack" });
  expect(firstProjection.currentAction.legalActions).toContain("decline_response");
  expect(JSON.stringify(firstProjection.presentationSnapshot.publicCardEffects)).not.toContain(hiddenCard.id);
  await page.evaluate(({ code, token, name }) => {
    localStorage.setItem("three-realms-session", JSON.stringify({ code, token, name }));
  }, { code: seed.code, token: firstViewer.token, name: firstViewer.name });
  await page.reload();
  await expect(page.locator(`.public-card-display[data-public-card-viewer-id="${firstViewer.id}"]`)).toBeVisible();
  const restored = page.locator(`[data-public-card-journey-card-id="${cost.id}"]`);
  await expect(restored).toHaveAttribute("data-public-card-journey-phase", "parked");
  await expect(restored).toHaveAttribute("data-public-card-journey-actor-id", seed.players[0].id);
  await expect(page.locator(`[data-public-card-frame-event-id="${activation.eventId}"]`)).toHaveCount(0);
  await expect(page.locator(`[data-effect-notice-event-id="${activation.eventId}"]`)).toHaveCount(0);
  await expect(page.locator(`[data-public-card-announcement-event-id="${activation.eventId}"]`)).toBeVisible();
  await expect(page.locator(`[data-hand-card-id="${hiddenCard.id}"]`)).toHaveCount(0);
  expect(await restored.evaluate((element) => element.dataset.publicCardJourneySize)).toBe("thumbnail");
  const restoredTarget = await restored.evaluate((element) => ({
    left: Number(element.dataset.publicCardJourneyTargetLeft),
    top: Number(element.dataset.publicCardJourneyTargetTop),
  }));
  const sourceSeat = await page.locator(`[data-player-anchor="${seed.players[0].id}"]`).boundingBox();
  expect(Math.abs(restoredTarget.left + 24 - (sourceSeat.x + sourceSeat.width / 2))).toBeLessThan(1);
  expect(Math.abs(restoredTarget.top - (sourceSeat.y + sourceSeat.height + 6))).toBeLessThan(1);
  await page.screenshot({ path: testInfo.outputPath("lust-cost-frame-440-other-viewer-restored.png") });

  const targetDock = page.locator(`.local-player-dock[data-player-anchor="${firstViewer.id}"]`);
  const skip = targetDock.locator('[data-action-slot="decline"] button');
  await expect(skip).toHaveText("Skip");
  await expect(skip).toBeEnabled();
  const skipSubmission = page.waitForRequest((browserRequest) => browserRequest.url() === `${API}/api/rooms`
    && browserRequest.method() === "POST" && browserRequest.postDataJSON()?.action === "decline_response");
  await skip.click();
  const submitted = await skipSubmission;
  expect(submitted.postDataJSON()).toMatchObject({ action: "decline_response", code: seed.code, token: firstViewer.token });
  await expect(page.locator(".effect-notice")).toContainText("LUST · RESULT");
  await expect(page.locator(".effect-notice")).toContainText("FIRST MAN failed to play Attack; 1 Duel damage from SECOND MAN applies.");
});

test("L5: four authenticated viewers see the complete LUST Duel reveal, history, and settlement", async ({ page, browser, request }, testInfo) => {
  const cost = card("Dodge", "l5-lust-cost");
  const privateCard = card("Peach", "l5-lust-unspent-private", "♥");
  const firstAttack = card("Attack", "l5-lust-first-attack", "♣");
  const secondAttack = card("Attack", "l5-lust-second-attack", "♦");
  const seed = await seedSkillRoom(request, {
    hero: "diao-chan", hand: [cost, privateCard],
    targets: [
      { name: "FIRST DUEL PARTICIPANT WITH A LONG NAME", role: "Loyalist", hero: "liu-bei", hp: 4, maxHp: 4, hand: [firstAttack] },
      { name: "SECOND DUEL PARTICIPANT WITH A LONG NAME", role: "Rebel", hero: "cao-cao", hp: 4, maxHp: 4, hand: [secondAttack] },
    ],
  });
  const owner = seed.players[0];
  const first = seed.players[1];
  const second = seed.players[2];
  const third = seed.players[3];
  const firstContext = await browser.newContext({ viewport: { width: 440, height: 894 } });
  const secondContext = await browser.newContext({ viewport: { width: 440, height: 894 } });
  const thirdContext = await browser.newContext({
    viewport: { width: 440, height: 894 },
    recordVideo: { dir: testInfo.outputDir, size: { width: 440, height: 894 } },
  });
  const firstPage = await firstContext.newPage();
  const secondPage = await secondContext.newPage();
  const thirdPage = await thirdContext.newPage();
  const thirdVideo = thirdPage.video();
  const viewers = [
    { id: owner.id, page, player: owner },
    { id: first.id, page: firstPage, player: first },
    { id: second.id, page: secondPage, player: second },
    { id: third.id, page: thirdPage, player: third },
  ];
  const checkpoints = [];
  const runtimeErrors = [];
  const stableAnnouncementRectsByViewer = new Map();
  let lifecycleTraces = [];
  let lateContext = null;

  const assertPublicEvent = async (eventId, actorId, cardId, historyCount) => {
    const projections = await Promise.all(viewers.map(({ player }) => projectedRoom(request, seed, player)));
    const sharedExchange = projections[0].presentationSnapshot.lustDuelExchange;
    for (const [index, { id, page: viewerPage, player }] of viewers.entries()) {
      const projection = projections[index];
      expect(projection.presentationSnapshot.lustDuelExchange).toEqual(sharedExchange);
      expect(projection.timeline.filter((event) => event.id === eventId)).toHaveLength(1);
      const physicalCardEvents = projection.timeline.filter((event) => event.card?.id === cardId
        || event.cards?.some((physicalCard) => physicalCard.id === cardId));
      expect(physicalCardEvents).toHaveLength(1);
      expect(JSON.stringify(projection.presentationSnapshot.publicCardEffects)).not.toContain(privateCard.id);
      if (player.id !== owner.id) {
        expect(JSON.stringify(projection)).not.toContain(privateCard.id);
        await expect(viewerPage.locator(`[data-hand-card-id="${privateCard.id}"]`)).toHaveCount(0);
      }

      const display = viewerPage.locator('.public-card-display[data-public-card-motion="lust-duel"]');
      await expect(display).toHaveCount(1);
      await expect(display).toHaveAttribute("data-public-card-viewer-id", id);
      await expect(display.locator("[data-public-card-journey-event-id]")).toHaveCount(historyCount);
      await expect(display.locator(`[data-public-card-journey-event-id="${eventId}"]`)).toHaveCount(1);
      const publicCard = display.locator(`[data-public-card-journey-card-id="${cardId}"]`);
      await expect(publicCard).toHaveCount(1);
      await expect(publicCard).toHaveAttribute("data-public-card-journey-actor-id", actorId);
      await expect(viewerPage.locator('.public-card-display[data-public-card-motion="duel"]')).toHaveCount(0);
      await expect(viewerPage.locator(`[data-public-card-display="true"][data-public-card-id="${cardId}"]`)).toHaveCount(1);
    }
    return projections;
  };

  const captureForAllViewers = async (eventId, actor, cardId, label) => {
    const parkedCards = await Promise.all(viewers.map(({ id, page: viewerPage }) => captureJourneyLifecycle(
      viewerPage,
      eventId,
      id,
      checkpoints,
      {
        ...(id === third.id ? { screenshotPrefix: `l5-${label}-third-view`, testInfo } : {}),
        stableAnnouncementRect: stableAnnouncementRectsByViewer.get(id),
      },
    )));
    for (const [index, viewer] of viewers.entries()) {
      expect(parkedCards[index].actorId).toBe(actor.id);
      expect(parkedCards[index].cardIds).toBe(cardId);
      await assertJourneyUsesActorAnchor(viewer.page, viewer.player, actor, parkedCards[index]);
      stableAnnouncementRectsByViewer.set(viewer.id, parkedCards[index].journeyAnnouncements[0].rect);
    }
    return parkedCards;
  };

  try {
    await openSkillUser(page, seed, { width: 440, height: 894 });
    await openSkillViewer(firstPage, seed, first);
    await openSkillViewer(secondPage, seed, second);
    await openSkillViewer(thirdPage, seed, third);
    for (const { id, page: viewerPage } of viewers) {
      viewerPage.on("pageerror", (error) => runtimeErrors.push({ viewerId: id, message: error.message }));
      await installPublicJourneyTrace(viewerPage, id);
    }
    const started = await completeSkillSelection({ page, request, seed, skillName: "Lust", providerId: "diao_chan_lust", cardIds: [cost.id], targetIndexes: [1, 2] });
    const activation = started.room.presentationSnapshot.diaoChanSkillNotices.find((notice) => notice.notice === "ACTIVATION");
    const initialExchange = started.room.presentationSnapshot.lustDuelExchange;
    const costEvent = started.room.timeline.find((event) => event.id === activation.costEventId);
    expect(costEvent.cards).toEqual([cost]);
    expect(initialExchange).toMatchObject({
      semantics: "PROVEN", root: { activationEventId: activation.eventId, costEventId: costEvent.id, costCardId: cost.id, ownerId: owner.id },
      responseCount: 0, currentParticipantId: first.id, decisionActorId: first.id,
    });
    await expect.poll(async () => Promise.all(viewers.map(({ page: viewerPage }) =>
      viewerPage.locator("[data-public-activity-chip]").getAttribute("aria-label"))))
      .toEqual(Array(4).fill(`Waiting for ${first.name} · Duel`));
    const rootMotion = captureForAllViewers(costEvent.id, owner, cost.id, "cost");
    await assertPublicEvent(costEvent.id, owner.id, cost.id, 1);

    const ownerDisplay = page.locator('.public-card-display[data-public-card-motion="lust-duel"]');
    const firstDisplay = firstPage.locator('.public-card-display[data-public-card-motion="lust-duel"]');
    const rootOnOwner = ownerDisplay.locator(`[data-public-card-journey-event-id="${costEvent.id}"]`);
    const rootOnFirst = firstDisplay.locator(`[data-public-card-journey-event-id="${costEvent.id}"]`);
    await expect(ownerDisplay).toBeVisible();
    await expect(firstDisplay).toBeVisible();
    await expect(rootOnOwner).toHaveAttribute("data-public-card-journey-phase", "reveal");
    await expect(rootOnFirst).toHaveAttribute("data-public-card-journey-phase", "reveal");
    await expect(page.locator(`[data-effect-notice-event-id="${activation.eventId}"]`)).toHaveCount(0);
    await expect(ownerDisplay.locator("[data-public-card-frame-kind='DIAO_CHAN_LUST_COST']")).toHaveCount(1);
    await expect(ownerDisplay.locator("[data-public-card-journey-card-id]")).toHaveCount(1);
    const costFrameGeometry = await Promise.all(viewers.map(({ id, page: viewerPage }) =>
      readJourneyCheckpoint(viewerPage, costEvent.id, id, "centred-lust-cost-frame-reveal")));
    for (const geometry of costFrameGeometry) {
      const frame = geometry.lustFrameRect;
      const table = geometry.playTableRect;
      expect(frame).toBeTruthy();
      expect(table).toBeTruthy();
      expect(Math.abs(frame.left + frame.width / 2 - (table.left + table.width / 2))).toBeLessThanOrEqual(12);
      expect(frame.left).toBeGreaterThanOrEqual(table.left + 8);
      expect(frame.left + frame.width).toBeLessThanOrEqual(table.left + table.width - 8);
      expect(geometry.actual.left).toBeGreaterThanOrEqual(frame.left);
      expect(geometry.actual.left + geometry.actual.width).toBeLessThanOrEqual(frame.left + frame.width);
      expect(Math.abs(geometry.actual.left - (frame.left + 12))).toBeLessThanOrEqual(1);
      expect(Math.abs(geometry.actual.top - (frame.top + 30))).toBeLessThanOrEqual(1);
    }
    checkpoints.push(...costFrameGeometry);

    await expect(firstPage.locator(`[data-hand-card-id="${firstAttack.id}"] .game-card`)).toBeEnabled();
    const firstDock = firstPage.locator(`.local-player-dock[data-player-anchor="${first.id}"]`);
    const skip = firstDock.locator('[data-action-slot="decline"] button');
    await expect(skip).toHaveText("Skip");
    await expect(skip).toBeEnabled();
    await firstPage.locator(`[data-hand-card-id="${firstAttack.id}"] .game-card`).click();
    const firstConfirm = firstDock.locator('[data-action-slot="primary"] button.primary');
    await expect(firstConfirm).toHaveText("Confirm");
    await expect(firstConfirm).toBeEnabled();
    const rootParkedCards = await rootMotion;
    for (const parkedCard of rootParkedCards) {
      expect(parkedCard.journeyAnnouncements[0].text).toBe("LUST Duel: Liu Bei and Cao Cao; Liu Bei plays Attack first.");
    }
    await expect(rootOnOwner).toHaveAttribute("data-public-card-journey-phase", "parked");

    const firstAccepted = await submitDuelAttack(firstPage, first, firstAttack.id, { alreadySelected: true });
    const firstEvent = firstAccepted.room.timeline.find((event) => event.type === "card" && event.card?.id === firstAttack.id);
    const firstAttackMotion = captureForAllViewers(firstEvent.id, first, firstAttack.id, "attack-1");
    expect(firstEvent.lustDuelAttackResponse).toMatchObject({
      relation: "LUST_DUEL_EXCHANGE", activationEventId: activation.eventId,
      costEventId: costEvent.id, ordinal: 1, sourceId: first.id, targetId: second.id,
      decisionActorId: first.id, responseActorId: first.id, responseCardIds: [firstAttack.id],
    });
    expect(firstAccepted.room.presentationSnapshot.lustDuelExchange.responses).toHaveLength(1);
    await expect.poll(async () => Promise.all(viewers.map(({ page: viewerPage }) =>
      viewerPage.locator("[data-public-activity-chip]").getAttribute("aria-label"))))
      .toEqual(Array(4).fill(`Waiting for ${second.name} · Duel`));
    const firstResponseCard = firstDisplay.locator(`[data-public-card-journey-event-id="${firstEvent.id}"]`);
    await expect(firstResponseCard).toHaveAttribute("data-public-card-journey-ordinal", "2");
    await expect(rootOnFirst).toHaveAttribute("data-public-card-journey-phase", "parked");
    await assertPublicEvent(firstEvent.id, first.id, firstAttack.id, 2);
    await firstAttackMotion;

    const secondResponse = await submitDuelAttack(secondPage, second, secondAttack.id);
    const secondEvent = secondResponse.room.timeline.find((event) => event.type === "card" && event.card?.id === secondAttack.id);
    const secondAttackMotion = captureForAllViewers(secondEvent.id, second, secondAttack.id, "attack-2");
    expect(secondEvent.lustDuelAttackResponse).toMatchObject({
      relation: "LUST_DUEL_EXCHANGE", activationEventId: activation.eventId,
      costEventId: costEvent.id, ordinal: 2, sourceId: second.id, targetId: first.id,
      decisionActorId: second.id, responseActorId: second.id, responseCardIds: [secondAttack.id],
    });
    expect(secondResponse.room.presentationSnapshot.lustDuelExchange.responses.map((response) => response.ordinal)).toEqual([1, 2]);
    await expect.poll(async () => Promise.all(viewers.map(({ page: viewerPage }) =>
      viewerPage.locator("[data-public-activity-chip]").getAttribute("aria-label"))))
      .toEqual(Array(4).fill(`Waiting for ${first.name} · Duel`));
    const secondDisplay = secondPage.locator('.public-card-display[data-public-card-motion="lust-duel"]');
    const secondResponseCard = secondDisplay.locator(`[data-public-card-journey-event-id="${secondEvent.id}"]`);
    const firstResponseInSecondView = secondDisplay.locator(`[data-public-card-journey-event-id="${firstEvent.id}"]`);
    const rootInSecondView = secondDisplay.locator(`[data-public-card-journey-event-id="${costEvent.id}"]`);
    await expect(secondResponseCard).toHaveAttribute("data-public-card-journey-phase", "reveal");
    await expect(secondResponseCard).toHaveAttribute("data-public-card-journey-ordinal", "3");
    await expect(firstResponseInSecondView).toHaveAttribute("data-public-card-journey-phase", "parked");
    await expect(rootInSecondView).toHaveAttribute("data-public-card-journey-phase", "parked");
    await assertPublicEvent(secondEvent.id, second.id, secondAttack.id, 3);
    await secondAttackMotion;
    lateContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const latePage = await lateContext.newPage();
    await latePage.emulateMedia({ reducedMotion: "reduce" });
    await openSkillViewer(latePage, seed, third);
    await latePage.setViewportSize({ width: 390, height: 844 });
    const lateDisplay = latePage.locator('.public-card-display[data-public-card-motion="lust-duel"]');
    await expect(lateDisplay).toBeVisible();
    await expect(lateDisplay.locator("[data-public-card-journey-phase='reveal'], [data-public-card-journey-phase='move']")).toHaveCount(0);
    for (const [eventId, actor] of [[costEvent.id, owner], [firstEvent.id, first], [secondEvent.id, second]]) {
      const restored = lateDisplay.locator(`[data-public-card-journey-event-id="${eventId}"]`);
      await expect(restored).toHaveCount(1);
      await expect(restored).toHaveAttribute("data-public-card-journey-phase", "parked");
      const geometry = await readJourneyCheckpoint(latePage, eventId, third.id, "late-join-reduced-motion-390px");
      expect(geometry.protectedOverlaps).toEqual([]);
      expect(geometry.viewport.scrollWidth).toBeLessThanOrEqual(390);
      await assertJourneyUsesActorAnchor(latePage, third, actor, geometry);
      checkpoints.push(geometry);
    }
    await expect(latePage.locator(`[data-hand-card-id="${privateCard.id}"]`)).toHaveCount(0);
    await expect(latePage.locator('.public-card-display[data-public-card-motion="duel"]')).toHaveCount(0);
    await latePage.screenshot({ path: testInfo.outputPath("l5-lust-late-join-reduced-motion-390x844.png") });
    await lateContext.close();
    lateContext = null;
    lifecycleTraces = await Promise.all(viewers.map(async ({ id, page: viewerPage }) => ({
      viewerId: id,
      records: await viewerPage.evaluate(() => window.__wtkPublicJourneyTrace?.records ?? []),
    })));

    await firstPage.reload();
    await expect(firstPage.locator(`.public-card-display[data-public-card-viewer-id="${first.id}"]`)).toBeVisible();
    for (const eventId of [costEvent.id, firstEvent.id, secondEvent.id]) {
      await expect(firstPage.locator(`[data-public-card-journey-event-id="${eventId}"]`)).toHaveAttribute("data-public-card-journey-phase", "parked");
      await expect(firstPage.locator(`[data-public-card-journey-event-id="${eventId}"]`)).toHaveCount(1);
    }
    expect(await firstPage.locator("[data-public-card-journey-event-id]").evaluateAll((elements) => elements.map((element) => element.dataset.publicCardJourneyPhase)))
      .toEqual(["parked", "parked", "parked"]);
    await expect(firstPage.locator(`[data-hand-card-id="${privateCard.id}"]`)).toHaveCount(0);
    await expect(firstPage.locator('.public-card-display[data-public-card-motion="duel"]')).toHaveCount(0);
    expect(await firstPage.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    const finalGeometry = await firstPage.locator("[data-public-card-journey-event-id]").evaluateAll((elements) => elements.map((element) => {
      const rect = element.getBoundingClientRect();
      return {
        eventId: element.dataset.publicCardJourneyEventId,
        actorId: element.dataset.publicCardJourneyActorId,
        cardIds: element.dataset.publicCardJourneyCardIds,
        ordinal: Number(element.dataset.publicCardJourneyOrdinal),
        phase: element.dataset.publicCardJourneyPhase,
        rect: { left: rect.left, top: rect.top, width: rect.width, height: rect.height },
        target: {
          left: Number(element.dataset.publicCardJourneyTargetLeft),
          top: Number(element.dataset.publicCardJourneyTargetTop),
          width: Number(element.dataset.publicCardJourneyTargetWidth),
          height: Number(element.dataset.publicCardJourneyTargetHeight),
        },
      };
    }));
    checkpoints.push({ checkpoint: "all-events-restored-for-first-viewer", viewerId: first.id, cards: finalGeometry });
    await firstPage.screenshot({ path: testInfo.outputPath("l5-lust-history-restored-for-first-viewer.png") });

    await Promise.all(viewers.map(({ page: viewerPage }) => viewerPage.setViewportSize({ width: 390, height: 844 })));
    for (const viewer of viewers) {
      for (const eventId of [costEvent.id, firstEvent.id, secondEvent.id]) {
        const journeyCard = viewer.page.locator(`[data-public-card-journey-event-id="${eventId}"]`);
        await expect.poll(async () => journeyCard.evaluate((element) => {
          const rect = element.getBoundingClientRect();
          const target = {
            left: Number(element.dataset.publicCardJourneyTargetLeft),
            top: Number(element.dataset.publicCardJourneyTargetTop),
            width: Number(element.dataset.publicCardJourneyTargetWidth),
            height: Number(element.dataset.publicCardJourneyTargetHeight),
          };
          return element.dataset.publicCardJourneyPhase === "parked"
            && Math.abs(rect.left - target.left) < 1 && Math.abs(rect.top - target.top) < 1
            && document.documentElement.scrollWidth <= window.innerWidth
            && rect.left >= -1 && rect.right <= window.innerWidth + 1;
        }), { timeout: 3000 }).toBe(true);
        const resized = await readJourneyCheckpoint(viewer.page, eventId, viewer.id, "parked-after-390px-resize");
        expect(resized.protectedOverlaps).toEqual([]);
        checkpoints.push(resized);
        const actor = [owner, first, second].find((player) => player.id === resized.actorId);
        await assertJourneyUsesActorAnchor(viewer.page, viewer.player, actor, resized);
      }
    }
    await thirdPage.screenshot({ path: testInfo.outputPath("l5-lust-history-390x844-late-view.png") });
    await Promise.all(viewers.map(({ page: viewerPage }) => viewerPage.setViewportSize({ width: 440, height: 894 })));

    const firstDockAfterReload = firstPage.locator(`.local-player-dock[data-player-anchor="${first.id}"]`);
    const settlementSkip = firstDockAfterReload.locator('[data-action-slot="decline"] button');
    await expect(settlementSkip).toHaveText("Skip");
    await expect(settlementSkip).toBeEnabled();
    const settledResponsePromise = firstPage.waitForResponse((response) => response.url() === `${API}/api/rooms`
      && response.request().method() === "POST"
      && response.request().postDataJSON()?.action === "decline_response");
    await settlementSkip.click();
    const settledResponse = await settledResponsePromise;
    expect(settledResponse.status()).toBe(200);
    const settledRoom = (await settledResponse.json()).room;
    const settlementNotice = settledRoom.presentationSnapshot.diaoChanSkillNotices.find((notice) => notice.notice === "DUEL_RESULT");
    const settledExchange = settledRoom.presentationSnapshot.lustDuelExchange;
    expect(settledExchange).toMatchObject({
      semantics: "PROVEN", interactionId: initialExchange.interactionId,
      rootFrameId: initialExchange.rootFrameId, responseCount: 2,
      root: { activationEventId: activation.eventId, costEventId: costEvent.id, costCardId: cost.id },
      settlement: {
        eventId: settlementNotice.eventId, failedPlayerId: first.id, damageSourceId: second.id,
        damageAmount: 1, outcome: "DAMAGE_APPLIED", settledAt: settlementNotice.settledAt,
      },
    });
    expect(settledExchange.responses.map((response) => response.responseEventId)).toEqual([firstEvent.id, secondEvent.id]);
    expect(settledRoom.players.find((player) => player.id === first.id).hp).toBe(3);
    expect(settledRoom.players.find((player) => player.id === second.id).hp).toBe(4);
    const settledDisplay = firstPage.locator('.public-card-display[data-public-card-motion="lust-duel"]');
    await expect(settledDisplay).toHaveAttribute("data-public-card-settlement-event-id", settlementNotice.eventId);
    await expect(settledDisplay.locator("[data-public-card-announcement='true']")).toContainText(
      `${first.name} failed to play Attack; 1 Duel damage from ${second.name} applies.`);
    await expect(firstPage.locator(`[data-effect-notice-event-id="${settlementNotice.eventId}"]`)).toHaveCount(0);
    expect(Number(await settledDisplay.getAttribute("data-public-card-result-remaining-ms"))).toBeGreaterThan(0);
    expect(Number(await settledDisplay.getAttribute("data-public-card-result-remaining-ms"))).toBeLessThanOrEqual(2000);
    for (const eventId of [costEvent.id, firstEvent.id, secondEvent.id]) {
      await expect(settledDisplay.locator(`[data-public-card-journey-event-id="${eventId}"]`)).toHaveAttribute("data-public-card-journey-phase", "parked");
    }
    const settlementViews = await Promise.all(viewers.map(({ player }) => projectedRoom(request, seed, player)));
    const normalizedSettlementExchange = (exchange) => {
      const normalized = structuredClone(exchange);
      delete normalized.settlement.readRemainingMs;
      return normalized;
    };
    for (const [index, viewer] of viewers.entries()) {
      expect(normalizedSettlementExchange(settlementViews[index].presentationSnapshot.lustDuelExchange))
        .toEqual(normalizedSettlementExchange(settledExchange));
      const viewerSettlementDisplay = viewer.page.locator(`.public-card-display[data-public-card-motion="lust-duel"][data-public-card-settlement-event-id="${settlementNotice.eventId}"]`);
      await expect(viewerSettlementDisplay).toHaveCount(1);
      await expect(viewerSettlementDisplay.locator("[data-public-card-announcement='true']"))
        .toContainText(`${first.name} failed to play Attack; 1 Duel damage from ${second.name} applies.`);
      await expect(viewer.page.locator(`[data-effect-notice-event-id="${settlementNotice.eventId}"]`)).toHaveCount(0);
    }
    await thirdPage.screenshot({ path: testInfo.outputPath("l5-lust-settlement-history-440.png") });
    checkpoints.push({ checkpoint: "settlement-history-retained", viewerId: first.id,
      settlementEventId: settlementNotice.eventId,
      cards: await settledDisplay.locator("[data-public-card-journey-event-id]").evaluateAll((elements) => elements.map((element) => ({
        eventId: element.dataset.publicCardJourneyEventId,
        actorId: element.dataset.publicCardJourneyActorId,
        ordinal: Number(element.dataset.publicCardJourneyOrdinal),
        phase: element.dataset.publicCardJourneyPhase,
        rect: (() => { const rect = element.getBoundingClientRect(); return { left: rect.left, top: rect.top, width: rect.width, height: rect.height }; })(),
      }))) });
    await expect(settledDisplay).toHaveCount(0, { timeout: 2600 });
    for (const { id } of viewers) {
      expect(runtimeErrors.filter((error) => error.viewerId === id)).toEqual([]);
    }
    const viewerTraces = lifecycleTraces;
    const measuredMoves = [];
    for (const eventId of [costEvent.id, firstEvent.id, secondEvent.id]) {
      for (const trace of viewerTraces) {
        const records = trace.records.filter((record) => record.eventId === eventId);
        const phaseChanges = records.filter((record) => record.reason === "data-public-card-journey-phase");
        const reveal = records.find((record) => record.phase === "reveal");
        const moveStart = phaseChanges.find((record) => record.phase === "move");
        const parkedAt = phaseChanges.find((record) => record.phase === "parked");
        expect(reveal).toBeTruthy();
        expect(moveStart).toBeTruthy();
        expect(parkedAt).toBeTruthy();
        expect(moveStart.sampledAt).toBeGreaterThan(reveal.sampledAt);
        expect(parkedAt.sampledAt - moveStart.sampledAt).toBeGreaterThanOrEqual(300);
        expect(parkedAt.sampledAt - moveStart.sampledAt).toBeLessThanOrEqual(700);
        expect(records.filter((record) => record.reason === "move-frame").length).toBeGreaterThanOrEqual(2);
        measuredMoves.push({ eventId, viewerId: trace.viewerId, durationMs: Math.round(parkedAt.sampledAt - moveStart.sampledAt) });
      }
    }
    await attachJourneyJson(testInfo, "l5-lust-duel-four-view-geometry.json", { checkpoints, viewerTraces });
    console.log(`[L5 Duel] viewers=4 events=3 geometryCheckpoints=${checkpoints.length} measuredMoveMs=${JSON.stringify(measuredMoves)}`);
  } finally {
    await Promise.all([firstContext.close(), secondContext.close(), thirdContext.close(), lateContext?.close()]);
    if (thirdVideo) await testInfo.attach("l5-lust-duel-fourth-viewer.webm", { path: await thirdVideo.path(), contentType: "video/webm" });
  }
});

test("L5: a Diao Chan payer outside seat one parks the cost at her real Seat and Dock", async ({ page, browser, request }, testInfo) => {
  const cost = card("Dodge", "l5-seat-two-lust-cost");
  const privateCard = card("Peach", "l5-seat-two-lust-private", "♥");
  const seeded = await request.post(`${API}/__test/seed-playing-game`, {
    data: {
      phase: "play",
      turnSeat: 1,
      players: [
        { name: "TABLE VIEWER", role: "Loyalist", hero: "sun-quan", hp: 4, maxHp: 4, hand: [] },
        { name: "SECOND-SEAT DIAO CHAN", role: "Lord", hero: "diao-chan", hp: 3, maxHp: 3, hand: [cost, privateCard] },
        { name: "FIRST DUELIST", role: "Rebel", hero: "liu-bei", hp: 4, maxHp: 4, hand: [] },
        { name: "SECOND DUELIST", role: "Renegade", hero: "cao-cao", hp: 4, maxHp: 4, hand: [] },
      ],
    },
  });
  expect(seeded.ok()).toBeTruthy();
  const seed = await seeded.json();
  const viewer = seed.players[0];
  const owner = seed.players[1];
  const first = seed.players[2];
  const second = seed.players[3];
  const observerContext = await browser.newContext({ viewport: { width: 440, height: 894 } });
  const observerPage = await observerContext.newPage();
  const checkpoints = [];

  try {
    await openSkillViewer(page, seed, owner);
    await openSkillViewer(observerPage, seed, viewer);
    await installPublicJourneyTrace(page, owner.id);
    await installPublicJourneyTrace(observerPage, viewer.id);
    const started = await completeSkillSelection({
      page, request, seed, skillName: "Lust", providerId: "diao_chan_lust",
      cardIds: [cost.id], targetIndexes: [2, 3], userIndex: 1,
    });
    const activation = started.room.presentationSnapshot.diaoChanSkillNotices.find((notice) => notice.notice === "ACTIVATION");
    const costEvent = started.room.timeline.find((event) => event.id === activation.costEventId);
    const exchange = started.room.presentationSnapshot.lustDuelExchange;
    expect(costEvent.cards).toEqual([cost]);
    expect(exchange).toMatchObject({ semantics: "PROVEN", responseCount: 0, root: { ownerId: owner.id, costCardId: cost.id } });
    expect(started.room.currentAction.actorId).toBe(first.id);
    expect(exchange.root.firstParticipantId).toBe(first.id);
    expect(exchange.root.secondParticipantId).toBe(second.id);
    const ownerView = await projectedRoom(request, seed, owner);
    const observerView = await projectedRoom(request, seed, viewer);
    expect(observerView.presentationSnapshot.lustDuelExchange).toEqual(ownerView.presentationSnapshot.lustDuelExchange);
    expect(JSON.stringify(observerView)).not.toContain(privateCard.id);
    expect(ownerView.timeline.filter((event) => event.cards?.some((face) => face.id === cost.id))).toHaveLength(1);

    const ownerDisplay = page.locator('.public-card-display[data-public-card-motion="lust-duel"]');
    const observerDisplay = observerPage.locator('.public-card-display[data-public-card-motion="lust-duel"]');
    for (const [display, expectedViewer] of [[ownerDisplay, owner.id], [observerDisplay, viewer.id]]) {
      await expect(display).toHaveCount(1);
      await expect(display).toHaveAttribute("data-public-card-viewer-id", expectedViewer);
      await expect(display.locator(`[data-public-card-journey-event-id="${costEvent.id}"]`)).toHaveCount(1);
    }
    await expect(page.locator('.public-card-display[data-public-card-motion="duel"]')).toHaveCount(0);
    await expect(observerPage.locator('.public-card-display[data-public-card-motion="duel"]')).toHaveCount(0);
    const [ownerParked, observerParked] = await Promise.all([
      captureJourneyLifecycle(page, costEvent.id, owner.id, checkpoints),
      captureJourneyLifecycle(observerPage, costEvent.id, viewer.id, checkpoints, { screenshotPrefix: "l5-second-seat-payer", testInfo }),
    ]);
    await assertJourneyUsesActorAnchor(page, owner, owner, ownerParked);
    await assertJourneyUsesActorAnchor(observerPage, viewer, owner, observerParked);
    expect(ownerParked.cardIds).toBe(cost.id);
    expect(observerParked.cardIds).toBe(cost.id);
    await attachJourneyJson(testInfo, "l5-second-seat-payer-geometry.json", checkpoints);
  } finally {
    await observerContext.close();
  }
});

test("real Lust guidance keeps its ordered selection local and the active skill tap cancels without committing", async ({ page, request }) => {
  const cost = card("Dodge", "real-lust-toggle-cost");
  const seed = await seedSkillRoom(request, {
    hero: "diao-chan", hand: [cost],
    targets: [
      { name: "FIRST MAN", role: "Loyalist", hero: "liu-bei", hp: 4, maxHp: 4, hand: [] },
      { name: "SECOND MAN", role: "Rebel", hero: "cao-cao", hp: 4, maxHp: 4, hand: [] },
    ],
  });
  const user = await openSkillUser(page, seed);
  await page.setViewportSize({ width: 440, height: 894 });

  const dock = page.locator(`.local-player-dock[data-player-anchor="${user.id}"]`);
  const skill = dock.locator(".local-hero-skills").getByRole("button", { name: "Lust", exact: true });
  const guidance = dock.locator(".decision-status");
  const confirm = dock.locator('[data-action-slot="primary"] button.primary');
  const costButton = dock.locator(`[data-hand-card-id="${cost.id}"] .game-card`);
  const firstTarget = page.getByRole("button", { name: "Select FIRST MAN", exact: true });
  const secondTarget = page.getByRole("button", { name: "Select SECOND MAN", exact: true });
  const actionPosts = [];
  page.on("request", (browserRequest) => {
    if (browserRequest.url() === `${API}/api/rooms` && browserRequest.method() === "POST") actionPosts.push(browserRequest.postDataJSON());
  });

  const before = await projectedRoom(request, seed, user);
  expect(before.currentAction.triggerOptions.map((option) => option.effectId)).toContain("diao_chan_lust");
  await expect(page.locator("[data-public-activity-chip]")).toContainText("SKILL USER's turn");

  await skill.focus();
  await skill.press("Enter");
  await expect(skill).toHaveAttribute("aria-pressed", "true");
  await expect(guidance).toContainText("Select 1 card and 2 Duel participants.");
  await skill.press("Enter");
  await expect(skill).toHaveAttribute("aria-pressed", "false");
  expect(actionPosts).toEqual([]);

  await skill.click();
  await expect(guidance).toHaveAttribute("data-lust-local-selection", "true");
  await expect(guidance).toContainText("Select 1 card and 2 Duel participants.");
  await expect(guidance).not.toContainText("YOUR DECISION");
  await expect(guidance).not.toContainText("LOCAL CANCEL");
  await expect(guidance).toHaveAttribute("data-console-local-cancel", "false");
  await expect(dock.locator('[data-action-slot="cancel"] button')).toHaveCount(0);
  await expect(confirm).toBeDisabled();

  await costButton.click();
  await firstTarget.click();
  await expect(confirm).toBeDisabled();
  await secondTarget.click();
  const order = guidance.getByTestId("lust-order-guidance");
  await expect(order).toHaveText("Attack order: FIRST MAN plays first, then SECOND MAN plays second.");
  await expect(page.locator(".console-guidance > small[role='status']")).toHaveCount(0);
  await expect(confirm).toBeEnabled();

  await skill.click();
  await expect(skill).toHaveAttribute("aria-pressed", "false");
  await expect(guidance).not.toHaveAttribute("data-lust-local-selection", "true");
  await expect(costButton).not.toHaveClass(/selected/);
  await expect(page.locator(`article.opponent-player-card[data-player-anchor="${seed.players[1].id}"]`)).not.toHaveClass(/selected-target/);
  await expect(page.locator(`article.opponent-player-card[data-player-anchor="${seed.players[2].id}"]`)).not.toHaveClass(/selected-target/);
  expect(actionPosts).toEqual([]);

  const afterCancel = await projectedRoom(request, seed, user);
  expect(afterCancel.myHand.map((item) => item.id)).toContain(cost.id);
  expect(afterCancel.currentAction).toMatchObject({ kind: "turn", actorId: user.id });
  expect(afterCancel.presentationSnapshot.diaoChanSkillNotices ?? []).toEqual([]);

  const started = await completeSkillSelection({ page, request, seed, skillName: "Lust", providerId: "diao_chan_lust", cardIds: [cost.id], targetIndexes: [1, 2] });
  expect(started.room.presentationSnapshot.diaoChanSkillNotices.some((notice) => notice.notice === "ACTIVATION")).toBe(true);
  expect(actionPosts).toHaveLength(1);
  expect(actionPosts[0]).toMatchObject({ action: "trigger", providerId: "diao_chan_lust", cardIds: [cost.id], targetIds: [seed.players[1].id, seed.players[2].id] });
});
