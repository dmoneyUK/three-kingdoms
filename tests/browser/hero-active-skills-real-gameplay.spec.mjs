import { expect, test } from "@playwright/test";
import { access, writeFile } from "node:fs/promises";

const API = "http://127.0.0.1:3137";
const card = (kind, id, suit = "♠") => ({ id, kind, suit, rank: "7" });
const compactLustResultPlayerName = (name) => {
  return name.trim();
};
const compactLustOrderMessage = (first, second, firstActor) => {
  if (!first?.id || !second?.id || first.id === second.id
    || firstActor?.id !== first.id && firstActor?.id !== second.id) return null;
  const firstAttacksFirst = firstActor.id === first.id;
  return `${first.name.trim()} ${firstAttacksFirst ? "first" : "second"}\n${second.name.trim()} ${firstAttacksFirst ? "second" : "first"}`;
};
const compactLustAttackMessage = (actor, target) => `${actor.name.trim()} attacks ${target.name.trim()}`;

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

async function openSkillViewer(page, seed, player, viewport = { width: 440, height: 894 }) {
  await page.setViewportSize(viewport);
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

function startLustSettlementPaintTrace() {
  const trace = { firstVisibleAt: null, firstVisibleUtc: null, lastVisibleAt: null, hiddenAt: null, hiddenSinceAt: null,
    maxHiddenGapMs: 0, text: null, rect: null, visibilityTransitions: [], lastVisibleState: null };
  const sample = () => {
    const display = [...document.querySelectorAll(".public-card-display[data-public-card-motion='lust-duel'][data-public-card-settlement-event-id]")].at(-1);
    const announcement = display?.querySelector("[data-public-card-announcement='true']");
    const style = announcement ? getComputedStyle(announcement) : null;
    const rect = announcement?.getBoundingClientRect();
    const visible = Boolean(display && announcement && style && rect && document.visibilityState === "visible"
      && announcement.dataset.publicCardAnnouncementPositioned === "true"
      && style.display !== "none" && style.visibility === "visible" && Number(style.opacity) > 0
      && rect.width > 0 && rect.height > 0 && rect.right > 0 && rect.left < innerWidth
      && rect.bottom > 0 && rect.top < innerHeight);
    if (visible !== trace.lastVisibleState && trace.visibilityTransitions.length < 40) {
      const displayStyle = display ? getComputedStyle(display) : null;
      trace.visibilityTransitions.push({
        at: performance.now(), utc: new Date().toISOString(), visible,
        displayClass: display?.className ?? null,
        displayPending: display?.getAttribute("data-public-card-layout-pending") ?? null,
        announcementClass: announcement?.className ?? null,
        positioned: announcement?.dataset.publicCardAnnouncementPositioned ?? null,
        fallback: announcement?.dataset.publicCardAnnouncementFallback ?? null,
        copyEventId: announcement?.dataset.publicCardAnnouncementEventId ?? null,
        settlementEventId: display?.dataset.publicCardSettlementEventId ?? null,
        copyResult: announcement?.dataset.publicCardResult ?? null,
        copyStyle: style ? { display: style.display, visibility: style.visibility, opacity: style.opacity } : null,
        displayStyle: displayStyle ? { display: displayStyle.display, visibility: displayStyle.visibility, opacity: displayStyle.opacity } : null,
        rect: rect ? { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom, width: rect.width, height: rect.height } : null,
        documentVisibility: document.visibilityState,
      });
      trace.lastVisibleState = visible;
    }
    if (visible) {
      if (trace.hiddenSinceAt !== null) {
        trace.maxHiddenGapMs = Math.max(trace.maxHiddenGapMs, performance.now() - trace.hiddenSinceAt);
        trace.hiddenSinceAt = null;
      }
      trace.firstVisibleAt ??= performance.now();
      trace.firstVisibleUtc ??= new Date().toISOString();
      trace.lastVisibleAt = performance.now();
      trace.text = announcement.textContent?.trim() ?? null;
      trace.rect = { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom, width: rect.width, height: rect.height };
    } else if (trace.firstVisibleAt !== null) {
      trace.hiddenAt ??= performance.now();
      trace.hiddenSinceAt ??= performance.now();
    }
  };
  const interval = window.setInterval(sample, 16);
  const observer = new MutationObserver(sample);
  window.__lustSettlementPaintTrace = { trace, stop: () => { window.clearInterval(interval); observer.disconnect(); } };
  const observeDocument = () => {
    if (!document.documentElement) {
      document.addEventListener("DOMContentLoaded", observeDocument, { once: true });
      return;
    }
    observer.observe(document.documentElement, { attributes: true, childList: true, subtree: true });
    sample();
  };
  observeDocument();
  sample();
}

async function installLustSettlementPaintTrace(page) {
  await page.evaluate(startLustSettlementPaintTrace);
}

async function installLustSettlementPaintTraceBeforeNavigation(page) {
  await page.addInitScript(startLustSettlementPaintTrace);
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
    const countVisualLines = (range) => [...range.getClientRects()]
      .filter((line) => line.width > 0 && line.height > 0)
      .reduce((tops, line) => {
        if (!tops.some((top) => Math.abs(top - line.top) <= 1)) tops.push(line.top);
        return tops;
      }, []).length;
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
    const protectedRects = protectedSelectors.flatMap(([name, selector]) => [...document.querySelectorAll(selector)].flatMap((obstacle) => {
      const obstacleRect = obstacle.getBoundingClientRect();
      const style = getComputedStyle(obstacle);
      return style.display === "none" || style.visibility === "hidden" || Number(style.opacity) === 0
        || obstacleRect.width <= 0 || obstacleRect.height <= 0 ? [] : [{
          name,
          text: (obstacle.textContent ?? "").trim().slice(0, 60),
          rect: { left: obstacleRect.left, top: obstacleRect.top, width: obstacleRect.width, height: obstacleRect.height },
        }];
    }));
    for (const [name, selector] of protectedSelectors) {
      for (const obstacle of document.querySelectorAll(selector)) {
        if (obstacle === element || obstacle.contains(element) || element.contains(obstacle)) continue;
        const style = getComputedStyle(obstacle);
        const obstacleRect = obstacle.getBoundingClientRect();
        if (style.display === "none" || style.visibility === "hidden" || Number(style.opacity) === 0
          || obstacleRect.width <= 0 || obstacleRect.height <= 0) continue;
        if (intersects(rect, obstacleRect)) protectedOverlaps.push({
          name,
          text: (obstacle.textContent ?? "").trim().slice(0, 90),
          cardRect: { left: rect.left, top: rect.top, width: rect.width, height: rect.height },
          obstacleRect: { left: obstacleRect.left, top: obstacleRect.top, width: obstacleRect.width, height: obstacleRect.height },
        });
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
        placement: announcement.getAttribute("data-public-card-announcement-placement"),
        width: announcement.getAttribute("data-public-card-announcement-width"),
        rect: { left: announcementRect.left, top: announcementRect.top, width: announcementRect.width, height: announcementRect.height },
        lines: countVisualLines(range),
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
      const originalWidth = announcement.style.width;
      const diagnosticWidthLines = [374, 360, 340, 320, 300, 280, 260, 240, 224].map((width) => {
        announcement.style.width = `${width}px`;
        range.selectNodeContents(copy);
        const measuredRect = announcement.getBoundingClientRect();
        return { width, lines: countVisualLines(range), height: measuredRect.height };
      });
      announcement.style.width = originalWidth;
      const seatOverlaps = [...document.querySelectorAll(".opponent-player-card[data-player-anchor]")].flatMap((seat) => {
        const seatRect = seat.getBoundingClientRect();
        return intersects(announcementRect, seatRect) ? [{ playerId: seat.getAttribute("data-player-anchor") }] : [];
      });
      const protectedOverlaps = [...document.querySelectorAll([
        ".opponent-player-card[data-player-anchor]", ".player-board-status", ".visible-countdown",
        ".stage-system-cluster", ".public-activity-chip", ".local-player-dock", ".local-hand-rail", ".console-guidance",
      ].join(","))].flatMap((obstacle) => {
        if (obstacle === announcement || announcement.contains(obstacle) || obstacle.contains(announcement)) return [];
        const obstacleStyle = getComputedStyle(obstacle);
        const obstacleRect = obstacle.getBoundingClientRect();
        if (obstacleStyle.display === "none" || obstacleStyle.visibility === "hidden" || Number(obstacleStyle.opacity) === 0
          || obstacleRect.width <= 0 || obstacleRect.height <= 0 || !intersects(announcementRect, obstacleRect)) return [];
        return [{ selector: obstacle.className?.baseVal ?? obstacle.className ?? obstacle.tagName }];
      });
      return {
        eventId: announcement.getAttribute("data-public-card-announcement-event-id"),
        anchorEventId: announcement.getAttribute("data-public-card-copy-anchor-event-id"),
        text: (copy.textContent ?? "").trim(),
        accessibleText: copy.getAttribute("aria-label") ?? "",
        supportingText: announcement.querySelector(".public-card-announcement-support")?.textContent?.trim() ?? "",
        placement: announcement.getAttribute("data-public-card-announcement-placement"),
        width: announcement.getAttribute("data-public-card-announcement-width"),
        compact: announcement.getAttribute("data-public-card-announcement-compact"),
        fallback: announcement.getAttribute("data-public-card-announcement-fallback"),
        diagnosticWidthLines,
        rect: { left: announcementRect.left, top: announcementRect.top, width: announcementRect.width, height: announcementRect.height },
        lines: countVisualLines(range),
        lineClamp: getComputedStyle(copy).webkitLineClamp,
        textOverflow: getComputedStyle(copy).overflow,
        visible: style.display !== "none" && style.visibility !== "hidden" && Number(style.opacity) !== 0,
        seatOverlaps,
        protectedOverlaps,
      };
    });
    const lustFrame = scopedDisplay?.querySelector("[data-public-card-frame-kind='DIAO_CHAN_LUST_COST']");
    const lustFrameBounds = lustFrame?.getBoundingClientRect();
    const lustFrameOverlaps = [];
    if (lustFrameBounds) {
      const frameProtectedSelectors = [
        ["opponent-seat", ".opponent-player-card[data-player-anchor]"],
        ["player-status", ".player-board-status"],
        ["player-target", ".player-square-target, .play-seat"],
        ["local-dock", ".local-player-dock"],
        ["guidance", ".console-guidance"],
        ["timer", ".visible-countdown"],
        ["system-menu", ".stage-system-cluster"],
        ["activity-chip", "[data-public-activity-chip='true']"],
        ["announcement", ".public-card-display-journey-copy, .effect-notice, .turn-notice"],
      ];
      for (const [name, selector] of frameProtectedSelectors) {
        for (const obstacle of document.querySelectorAll(selector)) {
          const style = getComputedStyle(obstacle);
          const obstacleRect = obstacle.getBoundingClientRect();
          if (style.display === "none" || style.visibility === "hidden" || Number(style.opacity) === 0
            || obstacleRect.width <= 0 || obstacleRect.height <= 0) continue;
          if (intersects(lustFrameBounds, obstacleRect)) lustFrameOverlaps.push({
            name,
            text: (obstacle.textContent ?? "").trim().slice(0, 90),
            rect: { left: obstacleRect.left, top: obstacleRect.top, width: obstacleRect.width, height: obstacleRect.height },
          });
        }
      }
    }
    const lustFrameTitle = lustFrame?.querySelector(".public-card-lust-cost-frame-title");
    const lustFrameTitleBounds = lustFrameTitle?.getBoundingClientRect();
    const lustFrameStyle = lustFrame ? getComputedStyle(lustFrame) : null;
    const lustFrameTitleStyle = lustFrameTitle ? getComputedStyle(lustFrameTitle) : null;
    const lustFrameDecorationStyle = lustFrame ? getComputedStyle(lustFrame, "::after") : null;
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
      publicFrameRole: element.getAttribute("role"),
      inspectable: element.getAttribute("data-public-card-inspectable"),
      protectedOverlaps,
      protectedRects,
      announcementRects,
      journeyAnnouncements,
      lustFrameRect: lustFrameBounds ? { left: lustFrameBounds.left, top: lustFrameBounds.top, width: lustFrameBounds.width, height: lustFrameBounds.height } : null,
      lustFrameOverlaps,
      lustFrameTitleRect: lustFrameTitleBounds ? { left: lustFrameTitleBounds.left, top: lustFrameTitleBounds.top, width: lustFrameTitleBounds.width, height: lustFrameTitleBounds.height } : null,
      lustFrameOpacity: lustFrameStyle?.opacity ?? null,
      lustFrameTransformOrigin: lustFrameStyle?.transformOrigin ?? null,
      lustFrameBorder: lustFrameStyle ? { width: lustFrameStyle.borderTopWidth, style: lustFrameStyle.borderTopStyle } : null,
      lustFrameDecorationBorder: lustFrameDecorationStyle ? { width: lustFrameDecorationStyle.borderTopWidth, style: lustFrameDecorationStyle.borderTopStyle } : null,
      lustFrameTitleFontSize: lustFrameTitleStyle?.fontSize ?? null,
      publicFrameClass: lustFrame?.getAttribute("data-public-card-frame-class") ?? null,
      publicFrameEffectId: lustFrame?.getAttribute("data-public-card-frame-effect-id") ?? null,
      publicFrameActivationOwnerId: lustFrame?.getAttribute("data-public-card-frame-activation-owner-id") ?? null,
      publicFrameMaterialOwnerIds: lustFrame?.getAttribute("data-public-card-frame-material-owner-ids") ?? null,
      publicFrameMaterialCardIds: lustFrame?.getAttribute("data-public-card-frame-material-card-ids") ?? null,
      publicFrameMaterialCount: lustFrame?.getAttribute("data-public-card-frame-material-count") ?? null,
      publicFrameGridColumns: lustFrame?.querySelector("[data-public-card-frame-grid-columns]")?.getAttribute("data-public-card-frame-grid-columns") ?? null,
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

async function captureJourneyLifecycle(page, eventId, viewerId, checkpoints, { screenshotPrefix, testInfo, maxAnnouncementLines = 2 } = {}) {
  const journeyCard = page.locator(`[data-public-card-journey-event-id="${eventId}"]`);
  await expect(journeyCard).toHaveCount(1);
  await expect(journeyCard).toHaveAttribute("data-public-card-journey-phase", "reveal");

  const assertLustFrameMeasurement = (checkpoint) => {
    if (!checkpoint.lustFrameRect) return;
    const frame = checkpoint.lustFrameRect;
    const title = checkpoint.lustFrameTitleRect;
    expect(frame.width).toBeGreaterThan(0);
    expect(frame.height).toBeGreaterThan(0);
    expect(title).toBeTruthy();
    expect(title.left).toBeGreaterThanOrEqual(frame.left - 1);
    expect(title.left + title.width).toBeLessThanOrEqual(frame.left + frame.width + 1);
    expect(title.top).toBeGreaterThanOrEqual(frame.top - 1);
    expect(title.top + title.height).toBeLessThanOrEqual(frame.top + frame.height + 1);
    expect(checkpoint.lustFrameTransformOrigin).toBe("39px 43px");
    if (checkpoint.phase === "move") {
      expect(checkpoint.lustFrameOpacity).toBe("0");
      return;
    }
    expect(checkpoint.lustFrameOpacity).toBe("1");
    expect(checkpoint.lustFrameOverlaps,
      `LUST Frame overlaps protected UI at ${checkpoint.checkpoint}: ${JSON.stringify({ frame, overlaps: checkpoint.lustFrameOverlaps })}`)
      .toEqual([]);
  };

  await waitForRevealElapsed(page, eventId, 500);
  const at500 = await readJourneyCheckpoint(page, eventId, viewerId, "reveal-500ms");
  assertLustFrameMeasurement(at500);
  expect(at500.phase).toBe("reveal");
  expect(at500.actual).toMatchObject({ width: 90, height: 135 });
  expect(at500.journeyAnnouncements).toHaveLength(1);
  expect(at500.journeyAnnouncements[0].visible,
    `viewer ${viewerId} H4 was hidden at ${at500.viewport.width}x${at500.viewport.height} during reveal-500ms: ${JSON.stringify({ announcement: at500.journeyAnnouncements[0], table: at500.playTableRect, frame: at500.lustFrameRect, parkTarget: at500.target, protectedRects: at500.protectedRects })}`)
    .toBe(true);
  expect(at500.journeyAnnouncements[0].lines).toBeLessThanOrEqual(maxAnnouncementLines);
  expect(at500.journeyAnnouncements[0].seatOverlaps).toEqual([]);
  expect(at500.journeyAnnouncements[0].protectedOverlaps).toEqual([]);
  const at500Announcement = at500.journeyAnnouncements[0].rect;
  const assertAnnouncementPlacement = (announcement, checkpoint) => {
    const previousCenterX = at500Announcement.left + at500Announcement.width / 2;
    const currentCenterX = announcement.left + announcement.width / 2;
    expect(Math.abs(currentCenterX - previousCenterX),
      `viewer ${viewerId} announcement center changed at ${checkpoint}: ${JSON.stringify({ reveal: at500Announcement, current: announcement })}`)
      .toBeLessThanOrEqual(1);
    const previousCenterY = at500Announcement.top + at500Announcement.height / 2;
    const currentCenterY = announcement.top + announcement.height / 2;
    expect(Math.abs(currentCenterY - previousCenterY),
      `viewer ${viewerId} announcement center moved vertically at ${checkpoint}: ${JSON.stringify({ reveal: at500Announcement, current: announcement })}`)
      .toBeLessThanOrEqual(16);
  };
  const centeredRevealAnchor = at500.lustFrameRect ?? at500.actual;
  expect(Math.abs((at500Announcement.left + at500Announcement.width / 2)
    - (centeredRevealAnchor.left + centeredRevealAnchor.width / 2))).toBeLessThanOrEqual(12);
  if (at500.lustFrameRect) {
    const frameBottom = at500.lustFrameRect.top + at500.lustFrameRect.height;
    const announcementRight = at500Announcement.left + at500Announcement.width;
    const blockersBetweenFrameAndAnnouncement = at500.protectedRects.filter((obstacle) => {
      if (obstacle.name === "public-announcement") return false;
      const right = obstacle.rect.left + obstacle.rect.width;
      const bottom = obstacle.rect.top + obstacle.rect.height;
      return obstacle.rect.left < announcementRight - 1 && right > at500Announcement.left + 1
        && obstacle.rect.top >= frameBottom - 1 && bottom <= at500Announcement.top + 1;
    });
    const nearestProtectedBottom = Math.max(frameBottom, ...blockersBetweenFrameAndAnnouncement.map((obstacle) =>
      obstacle.rect.top + obstacle.rect.height));
    const announcementGap = at500Announcement.top - nearestProtectedBottom;
    expect(announcementGap, JSON.stringify({
      frame: at500.lustFrameRect, announcement: at500Announcement,
      blockersBetweenFrameAndAnnouncement,
    })).toBeGreaterThanOrEqual(5);
    expect(announcementGap, JSON.stringify({
      frame: at500.lustFrameRect, announcement: at500Announcement,
      blockersBetweenFrameAndAnnouncement,
    })).toBeLessThanOrEqual(12);
  }
  checkpoints.push(at500);
  if (screenshotPrefix && testInfo) await attachJourneyScreenshot(page, testInfo, screenshotPrefix, "reveal-500ms");

  await waitForRevealElapsed(page, eventId, 3500);
  const at3500 = await readJourneyCheckpoint(page, eventId, viewerId, "reveal-3500ms");
  assertLustFrameMeasurement(at3500);
  expect(at3500.phase).toBe("reveal");
  expect(at3500.actual).toMatchObject({ width: 90, height: 135 });
  expect(at3500.revealElapsedMs).toBeGreaterThanOrEqual(3500);
  expect(at3500.journeyAnnouncements).toHaveLength(1);
  expect(at3500.journeyAnnouncements[0].visible).toBe(true);
  expect(at3500.journeyAnnouncements[0].lines).toBeLessThanOrEqual(maxAnnouncementLines);
  expect(at3500.journeyAnnouncements[0].seatOverlaps).toEqual([]);
  assertAnnouncementPlacement(at3500.journeyAnnouncements[0].rect, "reveal-3500ms");
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
  assertLustFrameMeasurement(movingCheckpoint);
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
  assertAnnouncementPlacement(movingCheckpoint.journeyAnnouncements[0].rect, "move-midpoint");
  checkpoints.push({ ...movingCheckpoint, sampledAt: moving.sampledAt });
  if (screenshotPrefix && testInfo) await attachJourneyScreenshot(page, testInfo, screenshotPrefix, "move-midpoint");

  await expect(journeyCard).toHaveAttribute("data-public-card-journey-phase", "parked", { timeout: 1200 });
  const parked = await readJourneyCheckpoint(page, eventId, viewerId, "parked");
  assertLustFrameMeasurement(parked);
  expect(parked.phase).toBe("parked");
  expect(Math.abs(parked.actual.left - parked.target.left)).toBeLessThan(1);
  expect(Math.abs(parked.actual.top - parked.target.top)).toBeLessThan(1);
  expect(Math.abs(parked.actual.width - parked.target.width)).toBeLessThan(1);
  expect(Math.abs(parked.actual.height - parked.target.height)).toBeLessThan(1);
  expect(parked.inspectable).toBe("true");
  expect(parked.accessibleName).toMatch(/^View public .+(?: card details,| frame\.)/);
  expect(parked.protectedOverlaps, `parked card overlaps protected UI: ${JSON.stringify({ overlaps: parked.protectedOverlaps, announcement: parked.journeyAnnouncements, target: parked.target, viewport: parked.viewport, protectedRects: parked.protectedRects })}`).toEqual([]);
  expect(parked.viewport.scrollWidth).toBeLessThanOrEqual(parked.viewport.width);
  expect(parked.journeyAnnouncements).toHaveLength(1);
  expect(parked.journeyAnnouncements[0].visible).toBe(true);
  expect(parked.journeyAnnouncements[0].lines).toBeLessThanOrEqual(maxAnnouncementLines);
  expect(parked.journeyAnnouncements[0].seatOverlaps).toEqual([]);
  expect(parked.journeyAnnouncements[0].protectedOverlaps).toEqual([]);
  assertAnnouncementPlacement(parked.journeyAnnouncements[0].rect, "parked");
  checkpoints.push(parked);
  if (screenshotPrefix && testInfo) await attachJourneyScreenshot(page, testInfo, screenshotPrefix, "parked");
  return parked;
}

async function assertJourneyUsesActorAnchor(page, viewer, actor, checkpoint) {
  if (viewer.id === actor.id) {
    const dock = await page.locator(`.local-player-dock[data-player-anchor="${actor.id}"]`).boundingBox();
    const geometry = await page.evaluate((actorId) => {
      const anchor = document.querySelector(`.local-player-dock[data-player-anchor="${actorId}"]`);
      const cards = [...document.querySelectorAll("[data-public-card-journey-event-id]")];
      const rect = (element) => {
        const value = element?.getBoundingClientRect();
        return value ? { left: value.left, top: value.top, right: value.right, bottom: value.bottom,
          width: value.width, height: value.height } : null;
      };
      const display = cards[0]?.closest(".public-card-display");
      return {
        viewerId: document.querySelector(".local-player-dock")?.dataset.playerAnchor ?? null,
        viewport: { innerWidth: window.innerWidth, innerHeight: window.innerHeight,
          visualWidth: window.visualViewport?.width ?? null, visualHeight: window.visualViewport?.height ?? null },
        document: { scrollWidth: document.documentElement.scrollWidth, scrollHeight: document.documentElement.scrollHeight },
        dock: rect(anchor),
        layoutPending: display?.getAttribute("data-public-card-layout-pending") ?? null,
        classes: display?.className ?? null,
        cards: cards.map((element) => ({ eventId: element.dataset.publicCardJourneyEventId,
          actorId: element.dataset.publicCardJourneyActorId, phase: element.dataset.publicCardJourneyPhase,
          actual: rect(element), target: { left: Number(element.dataset.publicCardJourneyTargetLeft),
            top: Number(element.dataset.publicCardJourneyTargetTop),
            width: Number(element.dataset.publicCardJourneyTargetWidth),
            height: Number(element.dataset.publicCardJourneyTargetHeight) } })),
      };
    }, actor.id);
    const details = JSON.stringify({ viewerId: viewer.id, actorId: actor.id, viewport: checkpoint.viewport,
      target: checkpoint.target, liveDock: { x: dock.x, y: dock.y, width: dock.width, height: dock.height }, geometry });
    expect(checkpoint.target.left, details).toBeCloseTo(dock.x + 8, 0);
    expect(checkpoint.target.top, details).toBeCloseTo(dock.y - checkpoint.target.height - 6, 0);
    return;
  }
  const seat = await page.locator(`.opponent-player-card[data-player-anchor="${actor.id}"]`).boundingBox();
  const liveAnchors = await page.evaluate((actorId) => {
    const anchor = document.querySelector(`.opponent-player-card[data-player-anchor="${actorId}"]`);
    const rect = (element) => {
      const value = element?.getBoundingClientRect();
      return value ? { x: value.x, y: value.y, width: value.width, height: value.height,
        centerX: value.x + value.width / 2, bottom: value.bottom } : null;
    };
    const board = document.querySelector(".player-board");
    const table = document.querySelector(".play-table");
    return {
      seat: rect(anchor),
      hero: rect(anchor?.querySelector(".opponent-hero-card")),
      portrait: rect(anchor?.querySelector(".opponent-hero-portrait")),
      board: rect(board),
      table: rect(table),
      topology: table?.dataset.seatTopology ?? null,
      playerCount: board?.dataset.playerCount ?? null,
      sideColumn: anchor?.dataset.sideColumn ?? null,
      innerWidth: window.innerWidth,
      innerHeight: window.innerHeight,
    };
  }, actor.id);
  const geometry = { viewerId: viewer.id, actorId: actor.id, viewport: checkpoint.viewport, target: checkpoint.target,
    seat: { x: seat.x, y: seat.y, width: seat.width, height: seat.height }, liveAnchors };
  expect(checkpoint.target.left + checkpoint.target.width / 2, JSON.stringify(geometry))
    .toBeCloseTo(seat.x + seat.width / 2, 0);
  expect(checkpoint.target.top, JSON.stringify(geometry)).toBeCloseTo(seat.y + seat.height + 6, 0);
}

async function waitForJourneyActorAnchor(page, viewer, actor, eventId) {
  await page.waitForFunction(({ viewerId, actorId, journeyEventId }) => {
    const card = [...document.querySelectorAll("[data-public-card-journey-event-id]")]
      .find((element) => element.dataset.publicCardJourneyEventId === journeyEventId);
    const display = card?.closest(".public-card-display");
    const anchor = viewerId === actorId
      ? document.querySelector(`.local-player-dock[data-player-anchor="${actorId}"]`)
      : document.querySelector(`.opponent-player-card[data-player-anchor="${actorId}"]`);
    if (!card || !display || !anchor || display.dataset.publicCardLayoutPending !== "false"
      || card.dataset.publicCardJourneyPhase !== "parked") return false;
    const cardRect = card.getBoundingClientRect();
    const anchorRect = anchor.getBoundingClientRect();
    const target = {
      left: Number(card.dataset.publicCardJourneyTargetLeft),
      top: Number(card.dataset.publicCardJourneyTargetTop),
      width: Number(card.dataset.publicCardJourneyTargetWidth),
      height: Number(card.dataset.publicCardJourneyTargetHeight),
    };
    const expected = viewerId === actorId
      ? { left: anchorRect.left + 8, top: anchorRect.top - target.height - 6 }
      : { left: anchorRect.left + (anchorRect.width - target.width) / 2, top: anchorRect.bottom + 6 };
    return Math.abs(target.left - expected.left) < 1 && Math.abs(target.top - expected.top) < 1
      && Math.abs(cardRect.left - target.left) < 1 && Math.abs(cardRect.top - target.top) < 1;
  }, { viewerId: viewer.id, actorId: actor.id, journeyEventId: eventId }, { timeout: 5000 });
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

async function completeSkillSelection({ page, request, seed, skillName, providerId, cardIds, targetIndexes, userIndex = 0, onChoosingTargets }) {
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
  await onChoosingTargets?.();
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

test("W4: Ambushment frames the genuine black card as Burning Bridges for actor and observer", async ({ page, browser, request }) => {
  test.setTimeout(60_000);
  const black = card("Dodge", "w4-ambushment-black-dodge", "♣");
  const privateGanNingCard = card("Peach", "w4-ambushment-private-gan-ning", "♥");
  const targetNegation = card("Negation", "w4-ambushment-target-negation", "♠");
  const privateTargetCard = card("Attack", "w4-ambushment-private-target", "♠");
  const observerNegation = card("Negation", "w4-ambushment-observer-negation", "♠");
  const seed = await seedSkillRoom(request, {
    hero: "gan-ning", hand: [black, privateGanNingCard],
    targets: [
      { name: "TARGET", role: "Loyalist", hero: "zhao-yun", hp: 4, maxHp: 4, hand: [targetNegation, privateTargetCard] },
      { name: "OBSERVER", role: "Rebel", hero: "sun-quan", hp: 4, maxHp: 4, hand: [observerNegation] },
    ],
  });
  const observerContext = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 3 });
  try {
    const actor = await openSkillUser(page, seed);
    const observerPage = await observerContext.newPage();
    const observer = await openSkillViewer(observerPage, seed, seed.players[2], { width: 390, height: 844 });
    const watchFrame = (viewerPage) => viewerPage.evaluate(() => {
      window.__w4AmbushmentFrameSeen = null;
      const capture = () => {
        if (window.__w4AmbushmentFrameSeen) return;
        const root = [...document.querySelectorAll('[data-public-card-journey-event-id][data-public-card-journey-role="root"]')]
          .find((element) => element.querySelector('[data-public-card-frame-effect-id="gan_ning_qixi"]'));
        const frame = root?.querySelector('[data-public-card-frame-effect-id="gan_ning_qixi"]');
        const display = root?.closest(".public-card-display");
        const announcement = display?.querySelector('[data-public-card-announcement="true"]');
        const style = announcement ? getComputedStyle(announcement) : null;
        const frameRect = frame?.getBoundingClientRect();
        const noticeRect = announcement?.getBoundingClientRect();
        if (!root || !frame || !display || !announcement || !frameRect || !noticeRect
          || !["reveal", "move"].includes(root.dataset.publicCardJourneyPhase)
          || display.dataset.publicCardLayoutPending !== "false"
          || announcement.dataset.publicCardAnnouncementPositioned !== "true"
          || style?.visibility !== "visible" || style.display === "none" || Number(style.opacity) <= 0) return;
        window.__w4AmbushmentFrameSeen = {
          viewerId: display.dataset.publicCardViewerId,
          rootEventId: root.dataset.publicCardJourneyEventId,
          actorId: root.dataset.publicCardJourneyActorId,
          phase: root.dataset.publicCardJourneyPhase,
          effectId: frame.dataset.publicCardFrameEffectId,
          frameEventId: frame.dataset.publicCardFrameEventId,
          materialCardIds: frame.dataset.publicCardFrameMaterialCardIds,
          title: frame.querySelector(".public-card-effect-frame-title")?.textContent?.trim(),
          notice: announcement.textContent?.trim(),
          overlap: noticeRect.left < frameRect.right && noticeRect.right > frameRect.left
            && noticeRect.top < frameRect.bottom && noticeRect.bottom > frameRect.top,
          viewport: { width: innerWidth, height: innerHeight, scrollWidth: document.documentElement.scrollWidth },
        };
      };
      const observer = new MutationObserver(capture);
      observer.observe(document.documentElement, { attributes: true, childList: true, subtree: true });
      window.__w4AmbushmentFrameObserver = observer;
      capture();
    });
    await Promise.all([watchFrame(page), watchFrame(observerPage)]);
    await completeSkillSelection({ page, request, seed, skillName: "Ambushment", providerId: "gan_ning_qixi", cardIds: [black.id], targetIndexes: [1] });

    const actorProjection = await projectedRoom(request, seed, actor);
    const rootEvent = actorProjection.timeline.find((event) => event?.type === "card" && event.action === "play" && event.card?.id === black.id);
    expect(rootEvent).toBeTruthy();
    expect(JSON.stringify(actorProjection)).not.toContain(observerNegation.id);
    expect(JSON.stringify(actorProjection)).not.toContain(targetNegation.id);
    expect(rootEvent.publicCardEffects).toContainEqual(expect.objectContaining({
      eventId: rootEvent.id, effectId: "gan_ning_qixi", effectClass: "CONVERSION",
      activationOwnerId: actor.id, targetId: seed.players[1].id, resultingCardKind: "Dismantle", outcome: "AS_DISMANTLE",
      materials: [{ cardId: black.id, ownerId: actor.id, fromZone: "HAND", toZone: "DISCARD" }],
    }));
    const targetProjection = await projectedRoom(request, seed, seed.players[1]);
    expect(targetProjection.currentAction).toMatchObject({ kind: "response", requirement: "negate", actorId: seed.players[1].id });
    expect(targetProjection.currentAction.legalActions).toContain("respond");
    const windowId = targetProjection.currentAction.negationWindowId;
    expect(windowId).toBeTruthy();

    const viewers = [
      { viewerPage: page, viewerId: actor.id },
      { viewerPage: observerPage, viewerId: observer.id },
    ];
    const frameDetails = await Promise.all(viewers.map(async ({ viewerPage, viewerId }) => {
      const evidence = await viewerPage.waitForFunction(() => window.__w4AmbushmentFrameSeen, null, { timeout: 8_000 });
      const details = await evidence.jsonValue();
      expect(details).toMatchObject({
        viewerId, rootEventId: rootEvent.id, actorId: actor.id, phase: expect.stringMatching(/^(reveal|move)$/),
        effectId: "gan_ning_qixi", frameEventId: rootEvent.id, materialCardIds: black.id,
        title: "AMBUSHMENT · AS BURNING BRIDGES", viewport: { width: 390, height: 844, scrollWidth: 390 },
      });
      expect(details.notice).toMatch(/Ambushment.*AS BURNING BRIDGES/i);
      expect(details.overlap, JSON.stringify(details)).toBe(false);
      return details;
    }));
    expect(new Set(frameDetails.map((details) => details.title)).size).toBe(1);

    const parkedGeometry = await Promise.all(viewers.map(async ({ viewerPage, viewerId }) => {
      const evidence = await viewerPage.waitForFunction(({ eventId, actorId }) => {
        const root = [...document.querySelectorAll('[data-public-card-journey-event-id][data-public-card-journey-role="root"]')]
          .find((element) => element.dataset.publicCardJourneyEventId === eventId);
        const anchor = [...document.querySelectorAll("[data-player-anchor]")]
          .find((element) => element.dataset.playerAnchor === actorId && element.getBoundingClientRect().width > 0);
        if (!root || !anchor || root.dataset.publicCardJourneyPhase !== "parked"
          || root.dataset.publicCardJourneyLayoutPending !== "false"
          || root.dataset.publicCardJourneyActorId !== actorId
          || root.dataset.publicCardJourneyCardId !== "w4-ambushment-black-dodge") return false;
        const target = {
          left: Number(root.dataset.publicCardJourneyTargetLeft),
          top: Number(root.dataset.publicCardJourneyTargetTop),
          width: Number(root.dataset.publicCardJourneyTargetWidth),
          height: Number(root.dataset.publicCardJourneyTargetHeight),
        };
        const bounds = anchor.getBoundingClientRect();
        const dx = Math.max(bounds.left - target.left - target.width, target.left - bounds.right, 0);
        const dy = Math.max(bounds.top - target.top - target.height, target.top - bounds.bottom, 0);
        return {
          viewerId: root.closest(".public-card-display")?.dataset.publicCardViewerId,
          phase: root.dataset.publicCardJourneyPhase,
          actorId: root.dataset.publicCardJourneyActorId,
          cardId: root.dataset.publicCardJourneyCardId,
          cardText: root.querySelector(".played-card")?.textContent?.trim(),
          anchorId: anchor.dataset.playerAnchor,
          anchorDistance: Math.hypot(dx, dy),
          target,
        };
      }, { eventId: rootEvent.id, actorId: actor.id }, { timeout: 12_000 });
      const details = await evidence.jsonValue();
      expect(details).toMatchObject({ viewerId, phase: "parked", actorId: actor.id, cardId: black.id, anchorId: actor.id });
      expect(details.cardText).toMatch(/Dodge/);
      expect(details.anchorDistance, JSON.stringify(details)).toBeLessThanOrEqual(8);
      return details;
    }));
    expect(new Set(parkedGeometry.map((details) => details.cardId)).size).toBe(1);

    const observerProjection = await projectedRoom(request, seed, observer);
    expect(JSON.stringify(observerProjection)).not.toContain(privateTargetCard.id);
    expect(JSON.stringify(observerProjection)).not.toContain(targetNegation.id);
    expect(JSON.stringify(observerProjection)).toContain(observerNegation.id);
    await expect(observerPage.locator(`[data-hand-card-id="${privateTargetCard.id}"]`)).toHaveCount(0);

    for (const player of seed.players) {
      const passed = await request.post(`${API}/api/rooms`, {
        data: { action: "decline_response", code: seed.code, token: player.token, context: { windowId } },
      });
      expect(passed.ok(), `${player.name} can pass the shared Negation window`).toBeTruthy();
    }
    const targetChoice = await projectedRoom(request, seed, actor);
    expect(targetChoice.currentAction?.legalActions).toContain("choose_target_card");
    expect(JSON.stringify(targetChoice)).not.toContain(privateTargetCard.id);
    const picker = page.locator('.card-pool-panel[data-choice-mode="actor-target-select"]');
    await expect(picker).toBeVisible();
    await picker.getByRole("button", { name: "Choose hidden Hand position 2", exact: true }).click();
    const chosen = page.waitForResponse((response) => response.url() === `${API}/api/rooms`
      && response.request().method() === "POST"
      && response.request().postDataJSON()?.action === "choose_target_card");
    await picker.locator(".card-pool-panel__confirm").click();
    const submittedChoice = await chosen;
    expect(submittedChoice.ok()).toBeTruthy();
    expect(submittedChoice.request().postDataJSON()).toMatchObject({
      action: "choose_target_card", targetCardZone: "hand", targetCardIndex: 1,
    });
    const settled = await projectedRoom(request, seed, observer);
    expect(settled.timeline.some((event) => event.type === "card" && event.action === "discard" && event.card?.id === privateTargetCard.id)).toBe(true);
  } finally {
    await page.evaluate(() => window.__w4AmbushmentFrameObserver?.disconnect()).catch(() => {});
    await observerContext.pages().at(0)?.evaluate(() => window.__w4AmbushmentFrameObserver?.disconnect()).catch(() => {});
    await observerContext.close();
  }
});

test("W4: Captivating frames its real Diamond AS Overindulgence for every Negation viewer", async ({ page, browser, request }) => {
  test.setTimeout(60_000);
  const diamond = card("Peach", "real-captivating-diamond", "♦");
  const privateDaqiaoCard = card("Dodge", "real-captivating-private-daqiao", "♠");
  const privateTargetCard = card("Attack", "real-captivating-private-target", "♥");
  const observerNegation = card("Negation", "real-captivating-observer-negation", "♣");
  const privateObserverCard = card("Peach", "real-captivating-private-observer", "♥");
  const seed = await seedSkillRoom(request, {
    hero: "daqiao", hand: [diamond, privateDaqiaoCard],
    targets: [
      { name: "TARGET", role: "Loyalist", hero: "zhao-yun", hp: 4, maxHp: 4, hand: [privateTargetCard] },
      { name: "OBSERVER", role: "Rebel", hero: "sun-quan", hp: 4, maxHp: 4, hand: [observerNegation, privateObserverCard] },
    ],
  });
  const targetContext = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 3 });
  const observerContext = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 3 });
  try {
    const actor = await openSkillUser(page, seed, { width: 390, height: 844 });
    const targetPage = await targetContext.newPage();
    const target = await openSkillViewer(targetPage, seed, seed.players[1], { width: 390, height: 844 });
    const observerPage = await observerContext.newPage();
    const observer = await openSkillViewer(observerPage, seed, seed.players[2], { width: 390, height: 844 });

    await completeSkillSelection({ page, request, seed, skillName: "Captivating", providerId: "daqiao_captivating", cardIds: [diamond.id], targetIndexes: [1] });

    const viewers = [
      { page, player: actor },
      { page: targetPage, player: target },
      { page: observerPage, player: observer },
    ];
    const renderedFrames = await Promise.all(viewers.map(async ({ page: viewerPage, player }) => {
      const root = viewerPage.locator('[data-public-card-journey-role="root"]').filter({
        has: viewerPage.locator('[data-public-card-frame-effect-id="daqiao_captivating"]'),
      });
      const frame = root.locator('[data-public-card-frame-effect-id="daqiao_captivating"]');
      const display = viewerPage.locator(".public-card-display").filter({ has: frame });
      await expect(root).toHaveCount(1);
      await expect(frame).toHaveAttribute("data-public-card-frame-material-card-ids", diamond.id);
      await expect(frame.locator(".public-card-effect-frame-title")).toHaveText("CAPTIVATING · AS OVERINDULGENCE");
      const notice = display.locator('[data-public-card-announcement="true"]');
      await expect(notice).toContainText(/Captivating.*AS OVERINDULGENCE.*TARGET/);
      const eventId = await root.getAttribute("data-public-card-journey-event-id");
      const cardId = await root.getAttribute("data-public-card-journey-card-id");
      expect(cardId).toBe(diamond.id);
      return { viewerId: player.id, eventId, cardId };
    }));
    expect(new Set(renderedFrames.map(({ eventId }) => eventId)).size).toBe(1);

    const [actorProjection, targetProjection, observerProjection] = await Promise.all([
      projectedRoom(request, seed, actor), projectedRoom(request, seed, target), projectedRoom(request, seed, observer),
    ]);
    for (const projection of [actorProjection, targetProjection, observerProjection]) {
      const proofs = projection.presentationSnapshot.publicCardEffects.filter((proof) => proof.effectId === "daqiao_captivating");
      expect(proofs).toHaveLength(1);
      expect(proofs[0]).toMatchObject({
        eventId: renderedFrames[0].eventId,
        activationOwnerId: actor.id,
        targetId: target.id,
        resultingCardKind: "Overindulgence",
        outcome: "AS_OVERINDULGENCE",
        materials: [{ cardId: diamond.id, ownerId: actor.id, fromZone: "HAND", toZone: "PUBLIC_PLAY" }],
      });
      expect(projection.presentationSnapshot.reactionChain).toMatchObject({
        rootCard: { cardKind: "Overindulgence", sourceId: actor.id, targetId: target.id },
        publicEventLinks: { root: { eventId: renderedFrames[0].eventId }, nodes: [] },
        rootEffectState: "ACTIVE",
      });
    }
    const privateCardIds = [privateDaqiaoCard.id, privateTargetCard.id, observerNegation.id, privateObserverCard.id];
    for (const projection of [actorProjection, targetProjection, observerProjection]) {
      const publicPresentationJson = JSON.stringify(projection.presentationSnapshot);
      for (const cardId of privateCardIds) expect(publicPresentationJson).not.toContain(cardId);
    }
    for (const projection of [actorProjection, targetProjection]) {
      const viewerJson = JSON.stringify(projection);
      expect(viewerJson).not.toContain(observerNegation.id);
      expect(viewerJson).not.toContain(privateObserverCard.id);
    }
    expect(observerProjection.currentAction?.options?.flatMap((option) => option.selection?.eligibleCardIds ?? []))
      .toContain(observerNegation.id);
  } finally {
    await targetContext.close();
    await observerContext.close();
  }
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

test("W3: Prodigal Healer shows its proven Hand cost to every phone viewer", async ({ page, browser, request }, testInfo) => {
  test.setTimeout(120_000);
  const cost = card("Attack", "w3-prodigal-public-cost");
  const privateCard = card("Dodge", "w3-prodigal-private-hand", "♥");
  const nextTurnAttack = card("Attack", "w3-prodigal-next-turn-attack", "♣");
  const seed = await seedSkillRoom(request, {
    hero: "hua-tuo", hand: [cost, privateCard],
    targets: [{ name: "INJURED TARGET", role: "Loyalist", hero: "liu-bei", hp: 3, maxHp: 4, hand: [nextTurnAttack] }],
  });
  const owner = seed.players[0];
  const target = seed.players[1];
  const otherViewers = seed.players.slice(1).map(async (player) => {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    return { player, context, page: await context.newPage() };
  });
  const openedViewers = await Promise.all(otherViewers);
  const viewers = [{ player: owner, page, context: null }, ...openedViewers];

  try {
    await Promise.all(viewers.map(({ player, page: viewerPage }) => player.id === owner.id
      ? openSkillUser(viewerPage, seed, { width: 390, height: 844 })
      : openSkillViewer(viewerPage, seed, player, player.id === seed.players[3].id
        ? { width: 390, height: 700 } : { width: 390, height: 844 })));
    await Promise.all(viewers.map(({ player, page: viewerPage }) =>
      expect(viewerPage.locator(`.local-player-dock[data-player-anchor="${player.id}"]`)).toBeVisible()));
    await Promise.all(viewers.map(({ page: viewerPage }) => expect(viewerPage.locator(".public-card-display")).toHaveCount(0)));
    await Promise.all(viewers.map(({ page: viewerPage }) => viewerPage.evaluate(() => {
      const trace = { active: true, announcementTransitions: [], ownershipTransitions: [], lastAnnouncement: null, lastAnnouncementState: null, lastOwnership: null };
      const sample = () => {
        const display = [...document.querySelectorAll(".public-card-display[data-public-card-action-key]")]
          .find((candidate) => candidate.dataset.publicCardActionKey?.startsWith("prodigal-healer-cost:")) ?? null;
        const announcement = display?.querySelector('[data-public-card-announcement="true"]') ?? null;
        const style = announcement ? getComputedStyle(announcement) : null;
        const rect = announcement?.getBoundingClientRect();
        const frameRect = display?.querySelector('[data-public-card-frame-effect-id="hua_tuo_prodigal_healer"]')?.getBoundingClientRect();
        const visible = Boolean(announcement && style && rect && style.display !== "none" && style.visibility === "visible"
          && Number(style.opacity) > 0 && rect.width > 0 && rect.height > 0);
        const state = {
          visible,
          eventId: announcement?.dataset.publicCardAnnouncementEventId ?? null,
          text: announcement?.textContent?.trim() ?? null,
          rootEventId: display?.getAttribute("data-public-card-root-event-id") ?? null,
          actionKey: display?.getAttribute("data-public-card-action-key") ?? null,
          motion: display?.getAttribute("data-public-card-motion") ?? null,
          layoutPending: display?.getAttribute("data-public-card-layout-pending") ?? null,
          currentPhase: document.querySelector("[data-console-decision-kind]")?.getAttribute("data-console-decision-kind") ?? null,
          copy: announcement ? {
            positioned: announcement.dataset.publicCardAnnouncementPositioned ?? null,
            fallback: announcement.dataset.publicCardAnnouncementFallback ?? null,
            stableCopy: announcement.dataset.publicCardAnnouncementStableCopy ?? null,
            stability: announcement.dataset.publicCardAnnouncementStability ?? null,
            compact: announcement.dataset.publicCardAnnouncementCompact ?? null,
            rect: rect ? { left: rect.left, top: rect.top, width: rect.width, height: rect.height } : null,
          } : null,
          frame: frameRect ? { left: frameRect.left, top: frameRect.top, right: frameRect.right, bottom: frameRect.bottom } : null,
        };
        const key = `${visible ? "visible" : "hidden"}:${state.eventId ?? "none"}:${state.actionKey ?? "none"}`;
        const transitionKey = `${key}:${state.copy?.positioned ?? ""}:${state.copy?.fallback ?? ""}:${state.copy?.stability ?? ""}`;
        if (transitionKey !== trace.lastAnnouncement && trace.announcementTransitions.length < 300) {
          const at = performance.now();
          const previous = trace.lastAnnouncementState;
          if (previous?.visible && (!visible || previous.eventId !== state.eventId)) {
            trace.announcementTransitions.push({ at, ...previous, visible: false, reason: visible ? "replaced-by-new-event" : "removed-or-hidden" });
          }
          if (visible) trace.announcementTransitions.push({ at, ...state });
          else if (!previous?.visible && key !== trace.lastAnnouncement) trace.announcementTransitions.push({ at, ...state });
          trace.lastAnnouncement = transitionKey;
          trace.lastAnnouncementState = state;
        }
        const table = document.querySelector(".play-table");
        const ownership = {
          ready: table?.getAttribute("data-public-card-journey-ownership-ready") ?? null,
          rootEventId: display?.getAttribute("data-public-card-root-event-id") ?? null,
          actionKey: display?.getAttribute("data-public-card-action-key") ?? null,
        };
        const ownershipKey = JSON.stringify(ownership);
        if (ownershipKey !== trace.lastOwnership && trace.ownershipTransitions.length < 300) {
          trace.ownershipTransitions.push({ at: performance.now(), ...ownership });
          trace.lastOwnership = ownershipKey;
        }
      };
      const observer = new MutationObserver(sample);
      observer.observe(document.documentElement, {
        attributes: true, attributeFilter: ["style", "class", "data-public-card-journey-ownership-ready", "data-public-card-layout-pending"],
        childList: true, subtree: true,
      });
      const tick = () => {
        if (!trace.active) return;
        sample();
        requestAnimationFrame(tick);
      };
      trace.stop = () => { trace.active = false; observer.disconnect(); };
      window.__w3ProdigalLifecycleTrace = trace;
      requestAnimationFrame(tick);
    })));

    const frameWaiters = viewers.map(({ player, page: viewerPage }, index) => viewerPage.waitForFunction((viewerId) => {
      const frame = document.querySelector('[data-public-card-frame-effect-id="hua_tuo_prodigal_healer"]');
      const journeyCard = frame?.closest("[data-public-card-journey-event-id]");
      const display = journeyCard?.closest(".public-card-display");
      const announcement = display?.querySelector('[data-public-card-announcement="true"]');
      const announcementStyle = announcement ? getComputedStyle(announcement) : null;
      const announcementRect = announcement?.getBoundingClientRect();
      const announcementVisible = Boolean(announcement && announcementStyle && announcementRect
        && announcementStyle.display !== "none" && announcementStyle.visibility === "visible"
        && Number(announcementStyle.opacity) > 0 && announcementRect.width > 0 && announcementRect.height > 0
        && announcement.dataset.publicCardAnnouncementPositioned === "true");
      const safelyHiddenForShortViewport = innerHeight <= 740
        && announcement?.dataset.publicCardAnnouncementStability === "hidden-after-sustained-placement-failure";
      if (!frame || !journeyCard || !display || !announcement || !announcementStyle || !announcementRect
        || display.dataset.publicCardLayoutPending !== "false"
        || (!announcementVisible && !safelyHiddenForShortViewport)) return false;
      const anchorId = journeyCard.dataset.publicCardJourneyActorId;
      const anchor = viewerId === anchorId
        ? document.querySelector(`.local-player-dock[data-player-anchor="${anchorId}"]`)
        : document.querySelector(`.opponent-player-card[data-player-anchor="${anchorId}"]`);
      const anchorRect = anchor?.getBoundingClientRect();
      const frameRect = frame.getBoundingClientRect();
      const visibleAnnouncementRect = announcement.getBoundingClientRect();
      return {
        eventId: journeyCard.dataset.publicCardJourneyEventId,
        phase: journeyCard.dataset.publicCardJourneyPhase,
        viewerId: display.dataset.publicCardViewerId,
        actorId: anchorId,
        cardIds: journeyCard.dataset.publicCardJourneyCardIds,
        effectId: frame.dataset.publicCardFrameEffectId,
        effectClass: frame.dataset.publicCardFrameClass,
        activationOwnerId: frame.dataset.publicCardFrameActivationOwnerId,
        materialOwnerIds: frame.dataset.publicCardFrameMaterialOwnerIds,
        materialCardIds: frame.dataset.publicCardFrameMaterialCardIds,
        title: frame.querySelector(".public-card-effect-frame-title")?.textContent?.trim(),
        target: {
          left: Number(journeyCard.dataset.publicCardJourneyTargetLeft),
          top: Number(journeyCard.dataset.publicCardJourneyTargetTop),
          width: Number(journeyCard.dataset.publicCardJourneyTargetWidth),
          height: Number(journeyCard.dataset.publicCardJourneyTargetHeight),
        },
        frame: { left: frameRect.left, top: frameRect.top, right: frameRect.right, bottom: frameRect.bottom },
        announcement: {
          status: announcementVisible ? "visible" : "hidden-no-safe-anchor",
          left: visibleAnnouncementRect.left, top: visibleAnnouncementRect.top,
          right: visibleAnnouncementRect.right, bottom: visibleAnnouncementRect.bottom,
          visibility: announcementStyle.visibility, opacity: Number(announcementStyle.opacity),
          text: announcement.textContent?.trim(),
          placement: announcement.dataset.publicCardAnnouncementPlacement,
          stableCopy: announcement.dataset.publicCardAnnouncementStableCopy,
          fallback: announcement.dataset.publicCardAnnouncementFallback,
          stability: announcement.dataset.publicCardAnnouncementStability,
        },
        anchor: anchorRect ? {
          left: anchorRect.left, top: anchorRect.top, right: anchorRect.right,
          bottom: anchorRect.bottom, width: anchorRect.width,
        } : null,
        viewport: { width: innerWidth, height: innerHeight, scrollWidth: document.documentElement.scrollWidth },
      };
    }, player.id, { timeout: 8_000 }).then(async (handle) => {
      const evidence = await handle.jsonValue();
      const size = evidence.viewport.height === 700 ? "390x700" : "390x844";
      await attachJourneyScreenshot(
        viewerPage, testInfo, `w3-prodigal-${index === 0 ? "owner" : `viewer-${index + 1}`}-${size}`, "revealed-frame");
      return evidence;
    }).catch(async (error) => ({
      timeout: true,
      viewerId: player.id,
      error: String(error),
      state: await viewerPage.evaluate(() => ({
        viewport: { width: innerWidth, height: innerHeight, visualViewportHeight: visualViewport?.height ?? null },
        displays: [...document.querySelectorAll(".public-card-display")].map((display) => ({
          attributes: { ...display.dataset },
          className: display.className,
          tableRect: (() => {
            const rect = display.closest(".play-table")?.getBoundingClientRect();
            return rect ? { left: rect.left, top: rect.top, width: rect.width, height: rect.height } : null;
          })(),
          cards: [...display.querySelectorAll("[data-public-card-journey-event-id]")].map((card) => ({ ...card.dataset })),
        })),
        anchors: [...document.querySelectorAll("[data-player-anchor]")].map((anchor) => {
          const rect = anchor.getBoundingClientRect();
          return { playerId: anchor.getAttribute("data-player-anchor"), className: anchor.className,
            rect: { left: rect.left, top: rect.top, width: rect.width, height: rect.height } };
        }),
        announcements: [...document.querySelectorAll('[data-public-card-announcement="true"]')].map((node) => ({
          eventId: node.dataset.publicCardAnnouncementEventId,
          visibility: getComputedStyle(node).visibility,
          positioned: node.dataset.publicCardAnnouncementPositioned,
          stableCopy: node.dataset.publicCardAnnouncementStableCopy,
          fallback: node.dataset.publicCardAnnouncementFallback,
          stability: node.dataset.publicCardAnnouncementStability,
          rect: (() => { const rect = node.getBoundingClientRect(); return { left: rect.left, top: rect.top, width: rect.width, height: rect.height }; })(),
          text: node.textContent?.trim(),
        })),
        lifecycleTrace: (() => {
          const trace = window.__w3ProdigalLifecycleTrace;
          return trace ? { announcementTransitions: trace.announcementTransitions, ownershipTransitions: trace.ownershipTransitions } : null;
        })(),
      })),
    })));

    const started = await completeSkillSelection({
      page, request, seed, skillName: "Prodigal Healer", providerId: "hua_tuo_prodigal_healer",
      cardIds: [cost.id], targetIndexes: [1],
    });
    const frameEvidence = await Promise.all(frameWaiters);
    const costEvent = started.room.timeline.find((event) => (event.type === "card" ? event.card.id === cost.id
      : event.type === "cards" && event.cards.some((face) => face.id === cost.id)));
    expect(costEvent).toBeTruthy();
    const parkedEvidence = await Promise.all(viewers.map(async ({ player, page: viewerPage }) => {
      await waitForJourneyActorAnchor(viewerPage, player, owner, costEvent.id);
      return viewerPage.locator(`[data-public-card-journey-event-id="${costEvent.id}"]`).evaluate((journeyCard) => {
        const actual = journeyCard.getBoundingClientRect();
        return {
          eventId: journeyCard.dataset.publicCardJourneyEventId,
          phase: journeyCard.dataset.publicCardJourneyPhase,
          viewerId: journeyCard.closest(".public-card-display")?.getAttribute("data-public-card-viewer-id"),
          actorId: journeyCard.dataset.publicCardJourneyActorId,
          cardIds: journeyCard.dataset.publicCardJourneyCardIds,
          actual: { left: actual.left, top: actual.top, width: actual.width, height: actual.height },
          target: {
            left: Number(journeyCard.dataset.publicCardJourneyTargetLeft),
            top: Number(journeyCard.dataset.publicCardJourneyTargetTop),
            width: Number(journeyCard.dataset.publicCardJourneyTargetWidth),
            height: Number(journeyCard.dataset.publicCardJourneyTargetHeight),
          },
        };
      });
    }));
    await attachJourneyJson(testInfo, "w3-prodigal-proof-diagnostics.json", {
      event: costEvent,
      effects: started.room.presentationSnapshot.publicCardEffects.filter((candidate) => candidate.eventId === costEvent.id),
      viewers: started.room.players.map(({ id, name, hero }) => ({ id, name, hero })),
      frameEvidence,
      parkedEvidence,
    });
    expect(frameEvidence.filter((evidence) => evidence?.timeout), JSON.stringify(frameEvidence)).toHaveLength(0);
    for (let index = 0; index < viewers.length; index += 1) {
      const { player } = viewers[index];
      const evidence = frameEvidence[index];
      expect(evidence).toMatchObject({
        eventId: costEvent.id, phase: "reveal", viewerId: player.id, actorId: owner.id,
        cardIds: cost.id, effectId: "hua_tuo_prodigal_healer", effectClass: "COST",
        activationOwnerId: owner.id, materialOwnerIds: owner.id, materialCardIds: cost.id,
        title: "PRODIGAL HEALER", viewport: {
          width: 390, height: player.id === seed.players[3].id ? 700 : 844, scrollWidth: 390,
        },
      });
      expect(evidence.anchor).toBeTruthy();
      expect(evidence.announcement.text).toContain("Prodigal Healer");
      if (evidence.announcement.status === "hidden-no-safe-anchor") {
        expect(evidence.viewport.height).toBe(700);
        expect(evidence.announcement.fallback).toBe("true");
        expect(evidence.announcement.stability).toBe("hidden-after-sustained-placement-failure");
      } else {
        expect(evidence.announcement.visibility).toBe("visible");
        expect(evidence.announcement.opacity).toBeGreaterThan(0);
        expect(evidence.announcement.bottom <= evidence.frame.top - 2 || evidence.announcement.top >= evidence.frame.bottom + 2,
          JSON.stringify({ viewerId: player.id, evidence })).toBe(true);
      }
      if (player.id === owner.id) {
        expect(evidence.target.left).toBeCloseTo(evidence.anchor.left + 8, 0);
        expect(evidence.target.top).toBeCloseTo(evidence.anchor.top - evidence.target.height - 6, 0);
      } else {
        expect(evidence.target.left + evidence.target.width / 2)
          .toBeCloseTo(evidence.anchor.left + evidence.anchor.width / 2, 0);
        expect(evidence.target.top).toBeCloseTo(evidence.anchor.bottom + 6, 0);
      }
    }
    for (const [index, { player }] of viewers.entries()) {
      expect(parkedEvidence[index]).toMatchObject({
        eventId: costEvent.id, phase: "parked", viewerId: player.id, actorId: owner.id, cardIds: cost.id,
      });
      expect(Math.abs(parkedEvidence[index].actual.left - parkedEvidence[index].target.left)).toBeLessThan(1);
      expect(Math.abs(parkedEvidence[index].actual.top - parkedEvidence[index].target.top)).toBeLessThan(1);
    }
    const effect = started.room.presentationSnapshot.publicCardEffects.find((candidate) => candidate.eventId === costEvent.id);
    expect(effect).toMatchObject({
      semantics: "PROVEN", effectId: "hua_tuo_prodigal_healer", effectClass: "COST",
      activationOwnerId: owner.id, targetId: target.id, outcome: "RECOVERY_APPLIED",
      cards: [{ id: cost.id }],
      materials: [{ cardId: cost.id, ownerId: owner.id, fromZone: "HAND", toZone: "DISCARD" }],
    });
    expect(started.room.players.find((player) => player.id === target.id).hp).toBe(4);

    const projections = await Promise.all(viewers.map(({ player }) => projectedRoom(request, seed, player)));
    for (const [index, { player }] of viewers.entries()) {
      const serialized = JSON.stringify(projections[index]);
      const handCardInDom = await viewers[index].page.locator(`[data-hand-card-id="${privateCard.id}"]`).count();
      expect(serialized).toContain(cost.id);
      if (player.id === owner.id) {
        expect(serialized).toContain(privateCard.id);
        expect(handCardInDom).toBe(1);
      } else {
        expect(serialized).not.toContain(privateCard.id);
        expect(handCardInDom).toBe(0);
      }
      if (player.id === target.id) expect(serialized).toContain(nextTurnAttack.id);
      else expect(serialized).not.toContain(nextTurnAttack.id);
    }

    await Promise.all(viewers.map(({ page: viewerPage }) => expect(viewerPage.locator(
      `[data-public-card-announcement-event-id="${costEvent.id}"]`,
    )).toHaveCount(0, { timeout: 8_000 })));
    for (const { page: viewerPage } of viewers) {
      await expect(viewerPage.locator(`[data-public-card-journey-event-id="${costEvent.id}"]`)).toHaveAttribute("data-public-card-journey-phase", "parked");
    }

    const ended = await request.post(`${API}/api/rooms`, {
      data: { action: "end_turn", code: seed.code, token: owner.token },
    });
    expect(ended.ok()).toBeTruthy();
    const afterEnd = await projectedRoom(request, seed, target);
    expect(afterEnd.currentAction).toMatchObject({ kind: "turn", actorId: target.id });
    const drew = await request.post(`${API}/api/rooms`, {
      data: { action: "draw", code: seed.code, token: target.token },
    });
    expect(drew.ok()).toBeTruthy();
    const attacked = await request.post(`${API}/api/rooms`, {
      data: { action: "play_card", code: seed.code, token: target.token, cardId: nextTurnAttack.id, targetId: owner.id },
    });
    expect(attacked.ok()).toBeTruthy();
    const attackProjection = await projectedRoom(request, seed, owner);
    expect(attackProjection.currentAction).toMatchObject({ kind: "response", actorId: owner.id, requirement: "dodge" });
    const attackEvent = attackProjection.timeline.find((event) => event.type === "card" && event.card.id === nextTurnAttack.id);
    expect(attackEvent).toBeTruthy();
    await Promise.all(viewers.map(async ({ page: viewerPage }) => {
      const attackDisplay = viewerPage.locator(`.public-card-display[data-public-card-motion="attack-dodge"][data-public-card-root-event-id="${attackEvent.id}"]`);
      await expect(attackDisplay).toBeVisible({ timeout: 10_000 });
      await expect(attackDisplay.locator('[data-public-card-announcement="true"]')).toContainText("Attack");
      await expect(viewerPage.locator(`[data-public-card-announcement-event-id="${costEvent.id}"]`)).toHaveCount(0);
    }));

    const response = await request.post(`${API}/api/rooms`, {
      data: { action: "respond", code: seed.code, token: owner.token, providerId: "card", cardId: privateCard.id },
    });
    expect(response.ok()).toBeTruthy();
    for (const turnOwner of [target, seed.players[2], seed.players[3]]) {
      const current = await projectedRoom(request, seed, turnOwner);
      expect(current.currentAction).toMatchObject({ kind: "turn", actorId: turnOwner.id });
      if (current.phase === "draw") {
        const drew = await request.post(`${API}/api/rooms`, {
          data: { action: "draw", code: seed.code, token: turnOwner.token },
        });
        expect(drew.ok()).toBeTruthy();
      }
      const passed = await request.post(`${API}/api/rooms`, {
        data: { action: "end_turn", code: seed.code, token: turnOwner.token },
      });
      expect(passed.ok()).toBeTruthy();
      await Promise.all(viewers.map(({ page: viewerPage }) =>
        expect(viewerPage.locator(`[data-public-card-announcement-event-id="${costEvent.id}"]`)).toHaveCount(0)));
    }
    const lifecycleTrace = await Promise.all(viewers.map(async ({ player, page: viewerPage }) => ({
      viewerId: player.id,
      ...await viewerPage.evaluate(() => {
        const trace = window.__w3ProdigalLifecycleTrace;
        trace.stop?.();
        return { announcementTransitions: trace.announcementTransitions, ownershipTransitions: trace.ownershipTransitions };
      }),
    })));
    for (const [index, trace] of lifecycleTrace.entries()) {
      const costTransitions = trace.announcementTransitions.filter((entry) => entry.eventId === costEvent.id);
      if (frameEvidence[index].announcement.status === "hidden-no-safe-anchor") {
        expect(costTransitions.some((entry) => entry.copy?.stability === "hidden-after-sustained-placement-failure"),
          JSON.stringify(trace)).toBe(true);
        expect(costTransitions.filter((entry) => entry.visible), JSON.stringify(trace)).toHaveLength(0);
      } else {
        expect(costTransitions.filter((entry) => entry.visible), JSON.stringify(trace)).toHaveLength(1);
        expect(costTransitions.at(-1)?.visible, JSON.stringify(trace)).toBe(false);
      }
      const rapidOwnershipFlaps = trace.ownershipTransitions.filter((entry, index, entries) => index > 0
        && entry.ready !== entries[index - 1]?.ready
        && entry.ready === "false"
        && entries.slice(index + 1).some((later) => later.ready === "true" && later.at - entry.at < 250));
      expect(rapidOwnershipFlaps, JSON.stringify(trace)).toHaveLength(0);
    }
    await attachJourneyJson(testInfo, "w3-prodigal-lifecycle-trace.json", { costEventId: costEvent.id, attackEventId: attackEvent.id, viewers: lifecycleTrace });
    await viewers[2].page.reload();
    await expect(viewers[2].page.locator(`[data-public-card-announcement-event-id="${costEvent.id}"]`)).toHaveCount(0);

    await attachJourneyJson(testInfo, "w3-prodigal-four-viewer-frame-evidence.json", {
      costEventId: costEvent.id, costCardId: cost.id, activationOwnerId: owner.id, targetId: target.id,
      effect, viewers: frameEvidence, parkedEvidence,
    });
  } finally {
    await Promise.all(openedViewers.map(({ context }) => context.close()));
  }
});

test("W3: Divine Wisdom shows every proven Hand cost card to all phone viewers", async ({ page, browser, request }, testInfo) => {
  test.setTimeout(120_000);
  const costCards = [
    card("Attack", "w3-divine-public-attack"),
    card("Dodge", "w3-divine-public-dodge", "♥"),
    card("Peach", "w3-divine-public-peach", "♦"),
  ];
  const privateCards = [
    card("Peach", "w3-divine-private-previous", "♥"),
    null,
    card("Dodge", "w3-divine-private-target"),
    card("Attack", "w3-divine-private-renegade"),
  ];
  const seeded = await request.post(`${API}/__test/seed-playing-game`, {
    data: {
      phase: "play", turnSeat: 0,
      players: [
        { name: "PREVIOUS PLAYER", role: "Lord", hero: "cao-cao", hp: 4, maxHp: 4, hand: [privateCards[0]] },
        { name: "LADY GAN", role: "Loyalist", hero: "lady-gan", hp: 2, maxHp: 3, hand: costCards },
        { name: "TARGET", role: "Rebel", hero: "sun-quan", hp: 4, maxHp: 4, hand: [privateCards[2]] },
        { name: "RENEGADE", role: "Renegade", hero: "liu-bei", hp: 4, maxHp: 4, hand: [privateCards[3]] },
      ],
      deck: [card("Attack", "w3-divine-next-draw"), card("Dodge", "w3-divine-later-draw")],
    },
  });
  expect(seeded.ok()).toBeTruthy();
  const seed = await seeded.json();
  const owner = seed.players[1];
  const otherViewers = await Promise.all(seed.players.map(async (player, index) => {
    if (index === 1) return null;
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    return { player, context, page: await context.newPage() };
  }));
  const openedViewers = otherViewers.filter(Boolean);
  const viewers = [
    { player: owner, page, context: null },
    ...openedViewers,
  ].sort((left, right) => left.player.seat - right.player.seat);

  try {
    await Promise.all(viewers.map(({ player, page: viewerPage }) =>
      openSkillViewer(viewerPage, seed, player, { width: 390, height: 844 })));
    await Promise.all(viewers.map(({ player, page: viewerPage }) =>
      expect(viewerPage.locator(`.local-player-dock[data-player-anchor="${player.id}"]`)).toBeVisible()));

    const frameWaiters = viewers.map(({ player, page: viewerPage }, index) => viewerPage.waitForFunction(() => {
      const frame = document.querySelector('[data-public-card-frame-effect-id="lady_gan_divine_wisdom"]');
      const journeyCard = frame?.closest("[data-public-card-journey-event-id]");
      const display = journeyCard?.closest(".public-card-display");
      const announcement = display?.querySelector('[data-public-card-announcement="true"]');
      const announcementStyle = announcement ? getComputedStyle(announcement) : null;
      const announcementRect = announcement?.getBoundingClientRect();
      if (!frame || !journeyCard || !display || !announcement
        || announcement.dataset.publicCardAnnouncementPositioned !== "true"
        || !announcementStyle || announcementStyle.display === "none" || announcementStyle.visibility !== "visible"
        || Number(announcementStyle.opacity) <= 0 || !announcementRect || announcementRect.width <= 0 || announcementRect.height <= 0
        || display.dataset.publicCardLayoutPending !== "false") return false;
      const frameRect = frame.getBoundingClientRect();
      const visibleAnnouncementRect = announcement.getBoundingClientRect();
      return {
        eventId: journeyCard.dataset.publicCardJourneyEventId,
        phase: journeyCard.dataset.publicCardJourneyPhase,
        viewerId: display.dataset.publicCardViewerId,
        actorId: journeyCard.dataset.publicCardJourneyActorId,
        journeyCardIds: journeyCard.dataset.publicCardJourneyCardIds,
        effectId: frame.dataset.publicCardFrameEffectId,
        effectClass: frame.dataset.publicCardFrameClass,
        activationOwnerId: frame.dataset.publicCardFrameActivationOwnerId,
        materialOwnerIds: frame.dataset.publicCardFrameMaterialOwnerIds,
        materialCardIds: frame.dataset.publicCardFrameMaterialCardIds,
        materialCount: Number(frame.dataset.publicCardFrameMaterialCount),
        title: frame.querySelector(".public-card-effect-frame-title")?.textContent?.trim(),
        frame: { left: frameRect.left, top: frameRect.top, right: frameRect.right, bottom: frameRect.bottom },
        announcement: {
          left: visibleAnnouncementRect.left, top: visibleAnnouncementRect.top,
          right: visibleAnnouncementRect.right, bottom: visibleAnnouncementRect.bottom,
          text: announcement.textContent?.trim(), visibility: announcementStyle.visibility,
          opacity: Number(announcementStyle.opacity),
        },
        viewport: { width: innerWidth, height: innerHeight, scrollWidth: document.documentElement.scrollWidth },
      };
    }, null, { timeout: 8_000 }).then(async (handle) => {
      const evidence = await handle.jsonValue();
      await attachJourneyScreenshot(viewerPage, testInfo,
        `w3-divine-${index === 0 ? "owner" : `viewer-${index + 1}`}-390x844`, "revealed-frame");
      return evidence;
    }).catch((error) => ({ timeout: true, viewerId: player.id, error: String(error) })));

    const previous = seed.players[0];
    const endTurn = await request.post(`${API}/api/rooms`, {
      data: { action: "end_turn", code: seed.code, token: previous.token },
    });
    expect(endTurn.ok()).toBeTruthy();
    const turnStart = await projectedRoom(request, seed, owner);
    expect(turnStart.currentAction).toMatchObject({ kind: "trigger", actorId: owner.id, triggerEvent: "turn_start" });
    expect(turnStart.currentAction.triggerOptions.map((option) => option.effectId)).toContain("lady_gan_divine_wisdom");

    const ownerDock = page.locator(`.local-player-dock[data-player-anchor="${owner.id}"]`);
    const skill = ownerDock.locator(".local-hero-skills").getByRole("button", { name: "Divine Wisdom", exact: true });
    await expect(skill).toBeEnabled();
    const submissionPromise = page.waitForResponse((response) => response.url() === `${API}/api/rooms`
      && response.request().method() === "POST"
      && response.request().postDataJSON()?.action === "trigger"
      && response.request().postDataJSON()?.providerId === "lady_gan_divine_wisdom");
    await skill.click();
    const submitted = await submissionPromise;
    expect(submitted.ok()).toBeTruthy();
    expect(submitted.request().postDataJSON()).toMatchObject({
      action: "trigger", code: seed.code, token: owner.token, providerId: "lady_gan_divine_wisdom",
    });
    const started = await submitted.json();
    const costEvent = started.room.timeline.find((event) => event.type === "cards"
      && event.cards.length === costCards.length && costCards.every((cost) => event.cards.some((face) => face.id === cost.id)));
    expect(costEvent).toBeTruthy();
    expect(costEvent.cards.map((face) => face.id)).toEqual(costCards.map((cost) => cost.id));
    const effect = started.room.presentationSnapshot.publicCardEffects.find((candidate) => candidate.eventId === costEvent.id);
    expect(effect).toMatchObject({
      semantics: "PROVEN", eventId: costEvent.id, effectId: "lady_gan_divine_wisdom", effectClass: "COST",
      activationOwnerId: owner.id, outcome: "RECOVERY_APPLIED",
    });
    expect(effect.materials.map(({ cardId, ownerId, fromZone, toZone }) => ({ cardId, ownerId, fromZone, toZone })))
      .toEqual(costCards.map((cost) => ({ cardId: cost.id, ownerId: owner.id, fromZone: "HAND", toZone: "DISCARD" })));
    expect(effect.cards.map(({ id, kind, suit, rank }) => ({ id, kind, suit, rank }))).toEqual(costCards);
    expect(started.room.players.find((player) => player.id === owner.id).hp).toBe(3);
    expect(started.room.currentAction).toMatchObject({ kind: "trigger", actorId: owner.id, triggerEvent: "hp_recovered" });
    expect(started.room.currentAction.triggerOptions.map((option) => option.effectId)).toContain("lady_gan_prudence");

    const frameEvidence = await Promise.all(frameWaiters);
    expect(frameEvidence.filter((evidence) => evidence?.timeout), JSON.stringify(frameEvidence)).toHaveLength(0);
    for (const [index, { player }] of viewers.entries()) {
      const evidence = frameEvidence[index];
      expect(evidence).toMatchObject({
        eventId: costEvent.id, phase: "reveal", viewerId: player.id, actorId: owner.id,
        journeyCardIds: costCards.map((cost) => cost.id).join(","),
        effectId: "lady_gan_divine_wisdom", effectClass: "COST", activationOwnerId: owner.id,
        materialOwnerIds: Array(costCards.length).fill(owner.id).join(","),
        materialCardIds: costCards.map((cost) => cost.id).join(","), materialCount: costCards.length,
        title: "DIVINE WISDOM", viewport: { width: 390, height: 844, scrollWidth: 390 },
      });
      expect(evidence.announcement.text).toContain("Divine Wisdom");
      expect(evidence.announcement.text).toContain("recovering 1 HP");
      expect(evidence.announcement.visibility).toBe("visible");
      expect(evidence.announcement.opacity).toBeGreaterThan(0);
      expect(evidence.announcement.bottom <= evidence.frame.top - 2 || evidence.announcement.top >= evidence.frame.bottom + 2)
        .toBe(true);
    }

    const parkedEvidence = await Promise.all(viewers.map(async ({ player, page: viewerPage }) => {
      await waitForJourneyActorAnchor(viewerPage, player, owner, costEvent.id);
      return viewerPage.locator(`[data-public-card-journey-event-id="${costEvent.id}"]`).evaluate((journeyCard) => {
        const rect = journeyCard.getBoundingClientRect();
        return {
          phase: journeyCard.dataset.publicCardJourneyPhase,
          actorId: journeyCard.dataset.publicCardJourneyActorId,
          cardIds: journeyCard.dataset.publicCardJourneyCardIds,
          actual: { left: rect.left, top: rect.top },
          target: {
            left: Number(journeyCard.dataset.publicCardJourneyTargetLeft),
            top: Number(journeyCard.dataset.publicCardJourneyTargetTop),
          },
        };
      });
    }));
    for (const parked of parkedEvidence) {
      expect(parked).toMatchObject({
        phase: "parked", actorId: owner.id, cardIds: costCards.map((cost) => cost.id).join(","),
      });
      expect(Math.abs(parked.actual.left - parked.target.left)).toBeLessThan(1);
      expect(Math.abs(parked.actual.top - parked.target.top)).toBeLessThan(1);
    }

    const projections = await Promise.all(viewers.map(({ player }) => projectedRoom(request, seed, player)));
    const allPrivateIds = privateCards.filter(Boolean).map((privateCard) => privateCard.id);
    for (const [index, { player }] of viewers.entries()) {
      const serialized = JSON.stringify(projections[index]);
      for (const cost of costCards) expect(serialized).toContain(cost.id);
      for (const [privateIndex, privateCard] of privateCards.entries()) {
        if (!privateCard) continue;
        const isOwner = player.id === seed.players[privateIndex].id;
        expect(serialized.includes(privateCard.id)).toBe(isOwner);
        expect(await viewers[index].page.locator(`[data-hand-card-id="${privateCard.id}"]`).count()).toBe(isOwner ? 1 : 0);
      }
      expect(allPrivateIds.every((privateId) => privateId === privateCards[index]?.id || !serialized.includes(privateId))).toBe(true);
    }
    await attachJourneyJson(testInfo, "w3-divine-wisdom-four-viewer-evidence.json", {
      event: costEvent, effect, ownerId: owner.id,
      viewers: frameEvidence, parkedEvidence,
      privacy: privateCards.map((privateCard, index) => ({ ownerId: seed.players[index].id, cardId: privateCard?.id ?? null })),
    });
  } finally {
    await Promise.all(openedViewers.map(({ context }) => context.close()));
  }
});

test("W3: Dauntless shows Yue Jin's proven Basic Hand cost to every phone viewer", async ({ page, browser, request }, testInfo) => {
  test.setTimeout(120_000);
  const cost = card("Peach", "w3-dauntless-basic-cost", "♥");
  const ownerPrivate = card("Dodge", "w3-dauntless-yue-private");
  const targetPrivate = card("Peach", "w3-dauntless-target-private", "♦");
  const rebelPrivate = card("Attack", "w3-dauntless-rebel-private");
  const equipment = card("ZhugeCrossbow", "w3-dauntless-target-equipment");
  const seeded = await request.post(`${API}/__test/seed-playing-game`, {
    data: {
      phase: "play", turnSeat: 0,
      players: [
        { name: "ENDING PLAYER", role: "Lord", hero: "cao-cao", hp: 4, maxHp: 4, hand: [targetPrivate], equipment: { weapon: equipment } },
        { name: "YUE JIN", role: "Loyalist", hero: "yue-jin", hp: 4, maxHp: 4, hand: [cost, ownerPrivate] },
        { name: "REBEL", role: "Rebel", hero: "sun-quan", hp: 4, maxHp: 4, hand: [rebelPrivate] },
        { name: "RENEGADE", role: "Renegade", hero: "liu-bei", hp: 4, maxHp: 4, hand: [] },
      ],
    },
  });
  expect(seeded.ok()).toBeTruthy();
  const seed = await seeded.json();
  const owner = seed.players[1];
  const target = seed.players[0];
  const openedViewers = await Promise.all(seed.players.map(async (player, index) => {
    if (index === 1) return null;
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    return { player, context, page: await context.newPage() };
  }));
  const viewers = [
    { player: owner, page, context: null },
    ...openedViewers.filter(Boolean),
  ].sort((left, right) => left.player.seat - right.player.seat);

  try {
    await Promise.all(viewers.map(({ player, page: viewerPage }) =>
      openSkillViewer(viewerPage, seed, player, { width: 390, height: 844 })));
    await Promise.all(viewers.map(({ player, page: viewerPage }) =>
      expect(viewerPage.locator(`.local-player-dock[data-player-anchor="${player.id}"]`)).toBeVisible()));

    const frameWaiters = viewers.map(({ player, page: viewerPage }, index) => viewerPage.waitForFunction(() => {
      const frame = document.querySelector('[data-public-card-frame-effect-id="yue_jin_dauntless"]');
      const journeyCard = frame?.closest("[data-public-card-journey-event-id]");
      const display = journeyCard?.closest(".public-card-display");
      const announcement = display?.querySelector('[data-public-card-announcement="true"]');
      const announcementStyle = announcement ? getComputedStyle(announcement) : null;
      const announcementRect = announcement?.getBoundingClientRect();
      if (!frame || !journeyCard || !display || !announcement
        || announcement.dataset.publicCardAnnouncementPositioned !== "true"
        || !announcementStyle || announcementStyle.display === "none" || announcementStyle.visibility !== "visible"
        || Number(announcementStyle.opacity) <= 0 || !announcementRect || announcementRect.width <= 0 || announcementRect.height <= 0
        || display.dataset.publicCardLayoutPending !== "false") return false;
      const frameRect = frame.getBoundingClientRect();
      const visibleAnnouncementRect = announcement.getBoundingClientRect();
      return {
        eventId: journeyCard.dataset.publicCardJourneyEventId,
        phase: journeyCard.dataset.publicCardJourneyPhase,
        viewerId: display.dataset.publicCardViewerId,
        actorId: journeyCard.dataset.publicCardJourneyActorId,
        cardIds: journeyCard.dataset.publicCardJourneyCardIds,
        effectId: frame.dataset.publicCardFrameEffectId,
        effectClass: frame.dataset.publicCardFrameClass,
        activationOwnerId: frame.dataset.publicCardFrameActivationOwnerId,
        materialOwnerIds: frame.dataset.publicCardFrameMaterialOwnerIds,
        materialCardIds: frame.dataset.publicCardFrameMaterialCardIds,
        title: frame.querySelector(".public-card-effect-frame-title")?.textContent?.trim(),
        announcement: {
          left: visibleAnnouncementRect.left, top: visibleAnnouncementRect.top,
          right: visibleAnnouncementRect.right, bottom: visibleAnnouncementRect.bottom,
          text: announcement.textContent?.trim(), visibility: announcementStyle.visibility,
          opacity: Number(announcementStyle.opacity),
        },
        frame: { left: frameRect.left, top: frameRect.top, right: frameRect.right, bottom: frameRect.bottom },
        viewport: { width: innerWidth, height: innerHeight, scrollWidth: document.documentElement.scrollWidth },
      };
    }, null, { timeout: 10_000 }).then(async (handle) => {
      const evidence = await handle.jsonValue();
      await attachJourneyScreenshot(viewerPage, testInfo,
        `w3-dauntless-${index === 0 ? "target" : `viewer-${index + 1}`}-390x844`, "revealed-frame");
      return evidence;
    }).catch((error) => ({ timeout: true, viewerId: player.id, error: String(error) })));

    const ended = await request.post(`${API}/api/rooms`, {
      data: { action: "end_turn", code: seed.code, token: target.token },
    });
    expect(ended.ok()).toBeTruthy();
    const ownerProjection = await projectedRoom(request, seed, owner);
    expect(ownerProjection.currentAction).toMatchObject({ kind: "trigger", actorId: owner.id, triggerEvent: "turn_end" });
    expect(ownerProjection.currentAction.triggerOptions.map((option) => option.effectId)).toContain("yue_jin_dauntless");

    const ownerDock = page.locator(`.local-player-dock[data-player-anchor="${owner.id}"]`);
    const skill = ownerDock.locator(".local-hero-skills").getByRole("button", { name: "Dauntless", exact: true });
    await expect(skill).toBeEnabled();
    await skill.click();
    await ownerDock.locator(`[data-hand-card-id="${cost.id}"] .game-card`).click();
    const ownerConfirm = ownerDock.locator('[data-action-slot="primary"] button.primary');
    await expect(ownerConfirm).toHaveText("Confirm");
    const activationPromise = page.waitForResponse((response) => response.url() === `${API}/api/rooms`
      && response.request().method() === "POST"
      && response.request().postDataJSON()?.action === "trigger"
      && response.request().postDataJSON()?.providerId === "yue_jin_dauntless");
    await ownerConfirm.click();
    const activation = await activationPromise;
    expect(activation.ok()).toBeTruthy();
    expect(activation.request().postDataJSON()).toMatchObject({
      action: "trigger", providerId: "yue_jin_dauntless", cardIds: [cost.id],
    });
    const committed = await activation.json();
    const costEvent = committed.room.timeline.find((event) => (event.type === "card" && event.card.id === cost.id)
      || (event.type === "cards" && event.cards.length === 1 && event.cards[0].id === cost.id));
    expect(costEvent).toBeTruthy();
    expect(costEvent.resolutionId).toBeTruthy();
    expect(costEvent.action).toBe("discard");
    const costFaces = costEvent.type === "card" ? [costEvent.card] : costEvent.cards;
    const effect = committed.room.presentationSnapshot.publicCardEffects.find((candidate) => candidate.eventId === costEvent.id);
    const rawCostEffects = costEvent.publicCardEffects.filter((candidate) =>
      candidate.effectId === "yue_jin_dauntless" && candidate.effectClass === "COST");
    expect(rawCostEffects).toHaveLength(1);
    expect(rawCostEffects[0]).toMatchObject({
      activationOwnerId: owner.id, targetId: target.id, outcome: "ACTIVATION_COST",
      materials: [{ cardId: cost.id, ownerId: owner.id, fromZone: "HAND", toZone: "DISCARD" }],
    });
    expect(effect).toMatchObject({
      semantics: "PROVEN", eventId: costEvent.id, effectId: "yue_jin_dauntless", effectClass: "COST",
      activationOwnerId: owner.id, targetId: target.id, outcome: "ACTIVATION_COST",
      cards: [cost], materials: [{ cardId: cost.id, ownerId: owner.id, fromZone: "HAND", toZone: "DISCARD" }],
    });
    expect(costFaces).toEqual([cost]);
    expect(committed.room.currentAction).toMatchObject({ kind: "trigger", actorId: target.id, triggerEvent: "turn_end" });

    const frameEvidence = await Promise.all(frameWaiters);
    expect(frameEvidence.filter((evidence) => evidence?.timeout), JSON.stringify(frameEvidence)).toHaveLength(0);
    for (const [index, { player }] of viewers.entries()) {
      const evidence = frameEvidence[index];
      expect(evidence).toMatchObject({
        eventId: costEvent.id, phase: "reveal", viewerId: player.id, actorId: owner.id,
        cardIds: cost.id, effectId: "yue_jin_dauntless", effectClass: "COST",
        activationOwnerId: owner.id, materialOwnerIds: owner.id, materialCardIds: cost.id,
        title: "DAUNTLESS", viewport: { width: 390, height: 844, scrollWidth: 390 },
      });
      expect(evidence.announcement.text).toContain("YUE JIN");
      expect(evidence.announcement.text).toContain("ENDING PLAYER");
      expect(evidence.announcement.text).toContain("Dauntless");
      expect(evidence.announcement.text).toContain("Basic Hand card");
      expect(evidence.announcement.visibility).toBe("visible");
      expect(evidence.announcement.opacity).toBeGreaterThan(0);
      expect(evidence.announcement.bottom <= evidence.frame.top - 2 || evidence.announcement.top >= evidence.frame.bottom + 2)
        .toBe(true);
    }

    const parkedEvidence = await Promise.all(viewers.map(async ({ player, page: viewerPage }) => {
      await waitForJourneyActorAnchor(viewerPage, player, owner, costEvent.id);
      return viewerPage.locator(`[data-public-card-journey-event-id="${costEvent.id}"]`).evaluate((journeyCard) => {
        const rect = journeyCard.getBoundingClientRect();
        return {
          phase: journeyCard.dataset.publicCardJourneyPhase,
          viewerId: journeyCard.closest(".public-card-display")?.getAttribute("data-public-card-viewer-id"),
          actorId: journeyCard.dataset.publicCardJourneyActorId,
          cardIds: journeyCard.dataset.publicCardJourneyCardIds,
          actual: { left: rect.left, top: rect.top },
          target: {
            left: Number(journeyCard.dataset.publicCardJourneyTargetLeft),
            top: Number(journeyCard.dataset.publicCardJourneyTargetTop),
          },
        };
      });
    }));
    for (const [index, { player }] of viewers.entries()) {
      expect(parkedEvidence[index]).toMatchObject({ phase: "parked", viewerId: player.id, actorId: owner.id, cardIds: cost.id });
      expect(Math.abs(parkedEvidence[index].actual.left - parkedEvidence[index].target.left)).toBeLessThan(1);
      expect(Math.abs(parkedEvidence[index].actual.top - parkedEvidence[index].target.top)).toBeLessThan(1);
    }

    const privateCards = [
      { ownerId: owner.id, card: ownerPrivate },
      { ownerId: target.id, card: targetPrivate },
      { ownerId: seed.players[2].id, card: rebelPrivate },
    ];
    const projections = await Promise.all(viewers.map(({ player }) => projectedRoom(request, seed, player)));
    for (const [index, { player, page: viewerPage }] of viewers.entries()) {
      const serialized = JSON.stringify(projections[index]);
      expect(serialized).toContain(cost.id);
      for (const { ownerId, card: privateCard } of privateCards) {
        const isOwner = player.id === ownerId;
        expect(serialized.includes(privateCard.id)).toBe(isOwner);
        expect(await viewerPage.locator(`[data-hand-card-id="${privateCard.id}"]`).count()).toBe(isOwner ? 1 : 0);
      }
    }

    const targetProjection = await projectedRoom(request, seed, target);
    expect(targetProjection.currentAction).toMatchObject({ kind: "trigger", actorId: target.id, triggerEvent: "turn_end" });
    expect(targetProjection.currentAction.triggerOptions.find((option) => option.effectId === "yue_jin_dauntless")?.selection)
      .toMatchObject({ type: "target_cards", targetId: target.id, eligibleKeys: [equipment.id] });
    const targetPage = viewers.find(({ player }) => player.id === target.id).page;
    const targetDock = targetPage.locator(`.local-player-dock[data-player-anchor="${target.id}"]`);
    const equipmentChoice = targetDock.locator(`[data-equipment-id="${equipment.id}"] .local-zone-card-button`);
    await expect(equipmentChoice).toBeEnabled();
    await equipmentChoice.click();
    const targetConfirm = targetDock.locator('[data-action-slot="primary"] button.primary');
    await expect(targetConfirm).toHaveText("Confirm");
    const equipmentPromise = targetPage.waitForResponse((response) => response.url() === `${API}/api/rooms`
      && response.request().method() === "POST"
      && response.request().postDataJSON()?.action === "trigger"
      && response.request().postDataJSON()?.providerId === "yue_jin_dauntless");
    await targetConfirm.click();
    const equipmentResponse = await equipmentPromise;
    expect(equipmentResponse.ok()).toBeTruthy();
    expect(equipmentResponse.request().postDataJSON()).toMatchObject({
      action: "trigger", providerId: "yue_jin_dauntless", cardKeys: [equipment.id],
    });
    const equipmentResolved = await equipmentResponse.json();
    const equipmentEvent = equipmentResolved.room.timeline.find((event) => (event.type === "card" && event.card.id === equipment.id)
      || (event.type === "cards" && event.cards.some((face) => face.id === equipment.id)));
    const equipmentEffect = equipmentResolved.room.presentationSnapshot.publicCardEffects.find((candidate) => candidate.eventId === equipmentEvent?.id);
    expect(equipmentEffect).toMatchObject({
      effectId: "yue_jin_dauntless", effectClass: "EFFECT", activationOwnerId: owner.id, targetId: target.id,
      outcome: "DAMAGE_PREVENTED",
      materials: [{ cardId: equipment.id, ownerId: target.id, fromZone: "EQUIPMENT", toZone: "DISCARD" }],
    });
    await attachJourneyJson(testInfo, "w3-dauntless-four-viewer-frame-evidence.json", {
      costEvent, effect, ownerId: owner.id, targetId: target.id, viewers: frameEvidence,
      parkedEvidence, equipmentEvent, equipmentEffect,
      privacy: privateCards.map(({ ownerId, card: privateCard }) => ({ ownerId, cardId: privateCard.id })),
    });
  } finally {
    await Promise.all(openedViewers.filter(Boolean).map(({ context }) => context.close()));
  }
});

test("W3: Betrothment shows its two proven costs and actual recovery to every phone viewer", async ({ page, browser, request }, testInfo) => {
  test.setTimeout(120_000);
  const costCards = [card("Dodge", "w3-betrothment-cost-dodge", "♣"), card("Peach", "w3-betrothment-cost-peach", "♥")];
  const privateCards = [
    card("Attack", "w3-betrothment-private-owner"),
    card("Peach", "w3-betrothment-private-target", "♦"),
    card("Dodge", "w3-betrothment-private-rebel"),
    card("Attack", "w3-betrothment-private-renegade"),
  ];
  const seeded = await request.post(`${API}/__test/seed-playing-game`, {
    data: {
      phase: "play", turnSeat: 0,
      players: [
        { name: "SUN SHANGXIANG", role: "Lord", hero: "sun-shangxiang", hp: 3, maxHp: 4, hand: [...costCards, privateCards[0]] },
        { name: "INJURED MAN", role: "Loyalist", hero: "zhao-yun", hp: 3, maxHp: 4, hand: [privateCards[1]] },
        { name: "REBEL", role: "Rebel", hero: "cao-cao", hp: 4, maxHp: 4, hand: [privateCards[2]] },
        { name: "RENEGADE", role: "Renegade", hero: "liu-bei", hp: 4, maxHp: 4, hand: [privateCards[3]] },
      ],
    },
  });
  expect(seeded.ok()).toBeTruthy();
  const seed = await seeded.json();
  const owner = seed.players[0];
  const target = seed.players[1];
  const openedViewers = await Promise.all(seed.players.map(async (player, index) => {
    if (index === 0) return null;
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    return { player, context, page: await context.newPage() };
  }));
  const viewers = [{ player: owner, page, context: null }, ...openedViewers.filter(Boolean)]
    .sort((left, right) => left.player.seat - right.player.seat);

  try {
    await Promise.all(viewers.map(({ player, page: viewerPage }) =>
      openSkillViewer(viewerPage, seed, player, { width: 390, height: 844 })));
    await Promise.all(viewers.map(({ player, page: viewerPage }) =>
      expect(viewerPage.locator(`.local-player-dock[data-player-anchor="${player.id}"]`)).toBeVisible()));

    const frameWaiters = viewers.map(({ player, page: viewerPage }, index) => viewerPage.waitForFunction(() => {
      const frame = document.querySelector('[data-public-card-frame-effect-id="sun_shangxiang_betrothment"]');
      const journeyCard = frame?.closest("[data-public-card-journey-event-id]");
      const display = journeyCard?.closest(".public-card-display");
      const announcement = display?.querySelector('[data-public-card-announcement="true"]');
      const announcementStyle = announcement ? getComputedStyle(announcement) : null;
      const announcementRect = announcement?.getBoundingClientRect();
      if (!frame || !journeyCard || !display || !announcement || !announcementStyle || !announcementRect
        || display.dataset.publicCardLayoutPending !== "false") return false;
      const frameRect = frame.getBoundingClientRect();
      const visibleAnnouncementRect = announcement.getBoundingClientRect();
      return {
        eventId: journeyCard.dataset.publicCardJourneyEventId,
        phase: journeyCard.dataset.publicCardJourneyPhase,
        viewerId: display.dataset.publicCardViewerId,
        actorId: journeyCard.dataset.publicCardJourneyActorId,
        cardIds: journeyCard.dataset.publicCardJourneyCardIds,
        effectId: frame.dataset.publicCardFrameEffectId,
        effectClass: frame.dataset.publicCardFrameClass,
        activationOwnerId: frame.dataset.publicCardFrameActivationOwnerId,
        materialOwnerIds: frame.dataset.publicCardFrameMaterialOwnerIds,
        materialCardIds: frame.dataset.publicCardFrameMaterialCardIds,
        materialCount: Number(frame.dataset.publicCardFrameMaterialCount),
        title: frame.querySelector(".public-card-effect-frame-title")?.textContent?.trim(),
        frame: { left: frameRect.left, top: frameRect.top, right: frameRect.right, bottom: frameRect.bottom },
        announcement: {
          left: visibleAnnouncementRect.left, top: visibleAnnouncementRect.top,
          right: visibleAnnouncementRect.right, bottom: visibleAnnouncementRect.bottom,
          text: announcement.textContent?.trim(), visibility: announcementStyle.visibility,
          opacity: Number(announcementStyle.opacity),
          positioned: announcement.dataset.publicCardAnnouncementPositioned === "true",
          fallback: announcement.dataset.publicCardAnnouncementFallback === "true",
          compact: announcement.dataset.publicCardAnnouncementCompact === "true",
          width: announcement.dataset.publicCardAnnouncementWidth,
          rect: { width: announcementRect.width, height: announcementRect.height },
        },
        viewport: { width: innerWidth, height: innerHeight, scrollWidth: document.documentElement.scrollWidth },
      };
    }, null, { timeout: 10_000 }).then(async (handle) => {
      const evidence = await handle.jsonValue();
      await viewerPage.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      await attachJourneyScreenshot(viewerPage, testInfo,
        `w3-betrothment-${index === 0 ? "owner" : `viewer-${index + 1}`}-390x844`, "revealed-frame");
      return evidence;
    }).catch((error) => ({ timeout: true, viewerId: player.id, error: String(error) })));

    const started = await completeSkillSelection({
      page, request, seed, skillName: "Betrothment", providerId: "sun_shangxiang_betrothment",
      cardIds: costCards.map((cost) => cost.id), targetIndexes: [1],
    });
    const costEvent = started.room.timeline.find((event) => event.type === "cards"
      && event.action === "discard" && event.cards.length === 2
      && costCards.every((cost) => event.cards.some((face) => face.id === cost.id)));
    expect(costEvent).toBeTruthy();
    expect(costEvent.resolutionId).toBeTruthy();
    expect(costEvent.cards.map((face) => face.id)).toEqual(costCards.map((cost) => cost.id));
    const rawEffect = costEvent.publicCardEffects.find((candidate) =>
      candidate.effectId === "sun_shangxiang_betrothment" && candidate.effectClass === "COST");
    const effect = started.room.presentationSnapshot.publicCardEffects.find((candidate) => candidate.eventId === costEvent.id);
    expect(rawEffect).toMatchObject({
      effectId: "sun_shangxiang_betrothment", effectClass: "COST", activationOwnerId: owner.id,
      targetId: target.id, outcome: "SOURCE_AND_TARGET_RECOVERED",
      materials: costCards.map((cost) => ({ cardId: cost.id, ownerId: owner.id, fromZone: "HAND", toZone: "DISCARD" })),
    });
    expect(effect).toMatchObject({
      semantics: "PROVEN", eventId: costEvent.id, effectId: "sun_shangxiang_betrothment", effectClass: "COST",
      activationOwnerId: owner.id, targetId: target.id, outcome: "SOURCE_AND_TARGET_RECOVERED",
      cards: costCards,
      materials: costCards.map((cost) => ({ cardId: cost.id, ownerId: owner.id, fromZone: "HAND", toZone: "DISCARD" })),
    });
    expect(started.room.players.find((player) => player.id === owner.id).hp).toBe(4);
    expect(started.room.players.find((player) => player.id === target.id).hp).toBe(4);

    const frameEvidence = await Promise.all(frameWaiters);
    expect(frameEvidence.filter((evidence) => evidence?.timeout), JSON.stringify(frameEvidence)).toHaveLength(0);
    for (const [index, { player }] of viewers.entries()) {
      const evidence = frameEvidence[index];
      expect(evidence).toMatchObject({
        eventId: costEvent.id, phase: "reveal", viewerId: player.id, actorId: owner.id,
        cardIds: costCards.map((cost) => cost.id).join(","), effectId: "sun_shangxiang_betrothment",
        effectClass: "COST", activationOwnerId: owner.id,
        materialOwnerIds: Array(costCards.length).fill(owner.id).join(","),
        materialCardIds: costCards.map((cost) => cost.id).join(","), materialCount: 2,
        title: "BETROTHMENT", viewport: { width: 390, height: 844, scrollWidth: 390 },
      });
      expect(evidence.announcement.positioned, JSON.stringify(evidence)).toBe(true);
      expect(evidence.announcement.visibility).toBe("visible");
      expect(evidence.announcement.opacity).toBeGreaterThan(0);
      expect(evidence.announcement.text).toContain("SUN SHANGXIANG");
      expect(evidence.announcement.text).toContain("INJURED MAN");
      expect(evidence.announcement.text).toContain("both healed 1 HP");
      expect(evidence.announcement.bottom <= evidence.frame.top - 2 || evidence.announcement.top >= evidence.frame.bottom + 2)
        .toBe(true);
    }

    const parkedEvidence = await Promise.all(viewers.map(async ({ player, page: viewerPage }) => {
      await waitForJourneyActorAnchor(viewerPage, player, owner, costEvent.id);
      return viewerPage.locator(`[data-public-card-journey-event-id="${costEvent.id}"]`).evaluate((journeyCard) => {
        const rect = journeyCard.getBoundingClientRect();
        return {
          phase: journeyCard.dataset.publicCardJourneyPhase,
          viewerId: journeyCard.closest(".public-card-display")?.getAttribute("data-public-card-viewer-id"),
          actorId: journeyCard.dataset.publicCardJourneyActorId,
          cardIds: journeyCard.dataset.publicCardJourneyCardIds,
          actual: { left: rect.left, top: rect.top },
          target: {
            left: Number(journeyCard.dataset.publicCardJourneyTargetLeft),
            top: Number(journeyCard.dataset.publicCardJourneyTargetTop),
          },
        };
      });
    }));
    for (const [index, { player }] of viewers.entries()) {
      expect(parkedEvidence[index]).toMatchObject({
        phase: "parked", viewerId: player.id, actorId: owner.id, cardIds: costCards.map((cost) => cost.id).join(","),
      });
      expect(Math.abs(parkedEvidence[index].actual.left - parkedEvidence[index].target.left)).toBeLessThan(1);
      expect(Math.abs(parkedEvidence[index].actual.top - parkedEvidence[index].target.top)).toBeLessThan(1);
    }

    const projections = await Promise.all(viewers.map(({ player }) => projectedRoom(request, seed, player)));
    for (const [index, { player, page: viewerPage }] of viewers.entries()) {
      const serialized = JSON.stringify(projections[index]);
      for (const cost of costCards) expect(serialized).toContain(cost.id);
      for (const [ownerIndex, privateCard] of privateCards.entries()) {
        expect(serialized.includes(privateCard.id)).toBe(player.id === seed.players[ownerIndex].id);
        await expect(viewerPage.locator(`[data-hand-card-id="${privateCard.id}"]`))
          .toHaveCount(player.id === seed.players[ownerIndex].id ? 1 : 0);
      }
    }
    await attachJourneyJson(testInfo, "w3-betrothment-four-viewer-evidence.json", {
      costEvent, rawEffect, effect, ownerId: owner.id, targetId: target.id,
      viewers: frameEvidence, parkedEvidence,
      recovery: { ownerHp: 4, targetHp: 4, outcome: effect.outcome },
      privacy: privateCards.map((privateCard, index) => ({ ownerId: seed.players[index].id, cardId: privateCard.id })),
    });
  } finally {
    await Promise.all(openedViewers.filter(Boolean).map(({ context }) => context.close()));
  }
});

test("W3: Equilibrium shows its exact mixed Hand and Equipment costs to every phone viewer", async ({ page, browser, request }, testInfo) => {
  test.setTimeout(120_000);
  const handCost = card("Peach", "w3-equilibrium-hand-cost", "♥");
  const equipmentCost = card("BlueSteelSword", "w3-equilibrium-equipment-cost", "♠");
  const replacementCards = [card("Attack", "w3-equilibrium-private-replacement-one"), card("Dodge", "w3-equilibrium-private-replacement-two", "♣")];
  const privateCards = [
    card("Peach", "w3-equilibrium-owner-unspent", "♦"),
    card("Attack", "w3-equilibrium-loyalist-private", "♣"),
    card("Dodge", "w3-equilibrium-rebel-private", "♥"),
    card("Peach", "w3-equilibrium-renegade-private", "♠"),
  ];
  const seeded = await request.post(`${API}/__test/seed-playing-game`, {
    data: {
      phase: "play", turnSeat: 0, deck: replacementCards,
      players: [
        { name: "SUN QUAN", role: "Lord", hero: "sun-quan", hp: 4, maxHp: 5, hand: [handCost, privateCards[0]], equipment: { weapon: equipmentCost } },
        { name: "LOYALIST", role: "Loyalist", hero: "liu-bei", hp: 4, maxHp: 4, hand: [privateCards[1]] },
        { name: "REBEL", role: "Rebel", hero: "cao-cao", hp: 4, maxHp: 4, hand: [privateCards[2]] },
        { name: "RENEGADE", role: "Renegade", hero: "zhuge-liang", hp: 4, maxHp: 4, hand: [privateCards[3]] },
      ],
    },
  });
  expect(seeded.ok()).toBeTruthy();
  const seed = await seeded.json();
  const owner = seed.players[0];
  const openedViewers = await Promise.all(seed.players.slice(1).map(async (player) => {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    return { player, context, page: await context.newPage() };
  }));
  const viewers = [{ player: owner, page, context: null }, ...openedViewers];

  try {
    await Promise.all(viewers.map(({ player, page: viewerPage }) => player.id === owner.id
      ? openSkillUser(viewerPage, seed, { width: 390, height: 844 })
      : openSkillViewer(viewerPage, seed, player, { width: 390, height: 844 })));
    await Promise.all(viewers.map(({ player, page: viewerPage }) =>
      expect(viewerPage.locator(`.local-player-dock[data-player-anchor="${player.id}"]`)).toBeVisible()));

    const frameWaiters = viewers.map(({ player, page: viewerPage }, index) => viewerPage.waitForFunction((viewerId) => {
      const frame = document.querySelector('[data-public-card-frame-effect-id="sun_quan_zhiheng"]');
      const journeyCard = frame?.closest("[data-public-card-journey-event-id]");
      const display = journeyCard?.closest(".public-card-display");
      const announcement = display?.querySelector('[data-public-card-announcement="true"]');
      const announcementStyle = announcement ? getComputedStyle(announcement) : null;
      const announcementRect = announcement?.getBoundingClientRect();
      if (!frame || !journeyCard || !display || !announcement || !announcementStyle || !announcementRect
        || display.dataset.publicCardLayoutPending !== "false"
        || display.dataset.publicCardViewerId !== viewerId
        || journeyCard.dataset.publicCardJourneyPhase !== "reveal"
        || announcement.dataset.publicCardAnnouncementPositioned !== "true"
        || announcementStyle.display === "none" || announcementStyle.visibility !== "visible"
        || Number(announcementStyle.opacity) <= 0 || announcementRect.width <= 0 || announcementRect.height <= 0) return false;
      const frameRect = frame.getBoundingClientRect();
      const materialCardIds = [...frame.querySelectorAll(".public-card-effect-frame-material [data-public-card-effect-frame-card-id]")]
        .map((element) => element.getAttribute("data-public-card-effect-frame-card-id"));
      return {
        eventId: journeyCard.dataset.publicCardJourneyEventId,
        phase: journeyCard.dataset.publicCardJourneyPhase,
        viewerId: display.dataset.publicCardViewerId,
        actorId: journeyCard.dataset.publicCardJourneyActorId,
        journeyCardIds: journeyCard.dataset.publicCardJourneyCardIds,
        effectId: frame.dataset.publicCardFrameEffectId,
        effectClass: frame.dataset.publicCardFrameClass,
        activationOwnerId: frame.dataset.publicCardFrameActivationOwnerId,
        materialOwnerIds: frame.dataset.publicCardFrameMaterialOwnerIds,
        materialCardIds: frame.dataset.publicCardFrameMaterialCardIds,
        materialFaces: materialCardIds,
        materialCount: Number(frame.dataset.publicCardFrameMaterialCount),
        title: frame.querySelector(".public-card-effect-frame-title")?.textContent?.trim(),
        frameRect: { left: frameRect.left, top: frameRect.top, right: frameRect.right, bottom: frameRect.bottom },
        announcement: {
          text: announcement.textContent?.trim(),
          rect: { left: announcementRect.left, top: announcementRect.top, right: announcementRect.right, bottom: announcementRect.bottom },
          overlapsFrame: announcementRect.left < frameRect.right && announcementRect.right > frameRect.left
            && announcementRect.top < frameRect.bottom && announcementRect.bottom > frameRect.top,
        },
        viewport: { width: innerWidth, height: innerHeight, scrollWidth: document.documentElement.scrollWidth },
      };
    }, player.id, { timeout: 10_000 }).then(async (handle) => {
      const evidence = await handle.jsonValue();
      await attachJourneyScreenshot(viewerPage, testInfo,
        `w3-equilibrium-${index === 0 ? "owner" : `viewer-${index + 1}`}-390x844`, "revealed-frame");
      return evidence;
    }).catch((error) => ({ timeout: true, viewerId: player.id, error: String(error) })));

    const ownerDock = page.locator(`.local-player-dock[data-player-anchor="${owner.id}"]`);
    const actionBefore = await projectedRoom(request, seed, owner);
    const equilibriumOption = actionBefore.currentAction.triggerOptions.find((option) => option.effectId === "sun_quan_zhiheng");
    expect(equilibriumOption.selection.eligibleCardIds).toEqual(expect.arrayContaining([handCost.id, equipmentCost.id]));
    expect(equilibriumOption.selection.eligibleCardIds).toContain(privateCards[0].id);
    await ownerDock.locator(".local-hero-skills").getByRole("button", { name: "Equilibrium", exact: true }).click();
    const selectedHandCard = ownerDock.locator(`[data-hand-card-id="${handCost.id}"] .game-card`);
    await expect(selectedHandCard).toBeEnabled();
    await selectedHandCard.click();
    const selectedEquipment = ownerDock.locator(`[data-equipment-id="${equipmentCost.id}"] .local-zone-card-button`);
    await expect(selectedEquipment).toBeEnabled();
    await selectedEquipment.click();
    const confirm = ownerDock.locator('[data-action-slot="primary"] button.primary');
    await expect(confirm).toHaveText("Confirm");
    const actionPromise = page.waitForResponse((response) => response.url() === `${API}/api/rooms`
      && response.request().method() === "POST"
      && response.request().postDataJSON()?.action === "trigger"
      && response.request().postDataJSON()?.providerId === "sun_quan_zhiheng");
    await confirm.click();
    const actionResponse = await actionPromise;
    expect(actionResponse.ok()).toBeTruthy();
    const actionRequest = actionResponse.request().postDataJSON();
    expect(actionRequest).toMatchObject({ action: "trigger", providerId: "sun_quan_zhiheng", cardIds: [handCost.id, equipmentCost.id] });
    expect(actionRequest.cardIds).not.toContain(privateCards[0].id);
    const started = await actionResponse.json();
    const costEvent = started.room.timeline.find((event) => event.type === "cards" && event.action === "discard"
      && event.cards.some((face) => face.id === handCost.id) && event.cards.some((face) => face.id === equipmentCost.id));
    expect(costEvent).toBeTruthy();
    expect(costEvent.cards.map((face) => face.id)).toEqual([handCost.id, equipmentCost.id]);
    const rawEffect = costEvent.publicCardEffects.find((effect) => effect.effectId === "sun_quan_zhiheng" && effect.effectClass === "COST");
    const effect = started.room.presentationSnapshot.publicCardEffects.find((candidate) => candidate.eventId === costEvent.id);
    const expectedMaterials = [
      { cardId: handCost.id, ownerId: owner.id, fromZone: "HAND", toZone: "DISCARD" },
      { cardId: equipmentCost.id, ownerId: owner.id, fromZone: "EQUIPMENT", toZone: "DISCARD" },
    ];
    expect(rawEffect).toMatchObject({
      effectId: "sun_quan_zhiheng", effectClass: "COST", activationOwnerId: owner.id,
      outcome: "DRAW_COUNT_MATCHES_DISCARDED", materials: expectedMaterials,
    });
    expect(effect).toMatchObject({
      semantics: "PROVEN", eventId: costEvent.id, effectId: "sun_quan_zhiheng", effectClass: "COST",
      activationOwnerId: owner.id, outcome: "DRAW_COUNT_MATCHES_DISCARDED",
      cards: [handCost, equipmentCost], materials: expectedMaterials,
    });
    expect(effect.targetId).toBeFalsy();
    expect(started.room.players.find((player) => player.id === owner.id).equipmentCards).not.toContainEqual(equipmentCost);
    expect(started.room.myHand.map((face) => face.id)).toContain(privateCards[0].id);
    expect(started.room.myHand.map((face) => face.id)).toEqual(expect.arrayContaining(replacementCards.map((face) => face.id)));

    const frameEvidence = await Promise.all(frameWaiters);
    expect(frameEvidence.filter((evidence) => evidence?.timeout), JSON.stringify(frameEvidence)).toHaveLength(0);
    for (const [index, { player }] of viewers.entries()) {
      expect(frameEvidence[index]).toMatchObject({
        eventId: costEvent.id, phase: "reveal", viewerId: player.id, actorId: owner.id,
        journeyCardIds: `${handCost.id},${equipmentCost.id}`, effectId: "sun_quan_zhiheng", effectClass: "COST",
        activationOwnerId: owner.id, materialOwnerIds: `${owner.id},${owner.id}`,
        materialCardIds: `${handCost.id},${equipmentCost.id}`,
        materialFaces: [handCost.id, equipmentCost.id], materialCount: 2, title: "EQUILIBRIUM",
        viewport: { width: 390, height: 844, scrollWidth: 390 },
      });
      expect(frameEvidence[index].announcement.text).toContain("Equilibrium");
      expect(frameEvidence[index].announcement.overlapsFrame, JSON.stringify(frameEvidence[index])).toBe(false);
    }

    const parkedEvidence = await Promise.all(viewers.map(async ({ player, page: viewerPage }) => {
      await waitForJourneyActorAnchor(viewerPage, player, owner, costEvent.id);
      return viewerPage.locator(`[data-public-card-journey-event-id="${costEvent.id}"]`).evaluate((journeyCard) => {
        const rect = journeyCard.getBoundingClientRect();
        return {
          phase: journeyCard.dataset.publicCardJourneyPhase,
          viewerId: journeyCard.closest(".public-card-display")?.getAttribute("data-public-card-viewer-id"),
          actorId: journeyCard.dataset.publicCardJourneyActorId,
          cardIds: journeyCard.dataset.publicCardJourneyCardIds,
          actual: { left: rect.left, top: rect.top },
          target: {
            left: Number(journeyCard.dataset.publicCardJourneyTargetLeft),
            top: Number(journeyCard.dataset.publicCardJourneyTargetTop),
          },
        };
      });
    }));
    for (const [index, { player }] of viewers.entries()) {
      expect(parkedEvidence[index]).toMatchObject({
        phase: "parked", viewerId: player.id, actorId: owner.id, cardIds: `${handCost.id},${equipmentCost.id}`,
      });
      expect(Math.abs(parkedEvidence[index].actual.left - parkedEvidence[index].target.left)).toBeLessThan(1);
      expect(Math.abs(parkedEvidence[index].actual.top - parkedEvidence[index].target.top)).toBeLessThan(1);
    }

    const projections = await Promise.all(viewers.map(({ player }) => projectedRoom(request, seed, player)));
    for (const [index, { player, page: viewerPage }] of viewers.entries()) {
      const projectionJson = JSON.stringify(projections[index]);
      for (const cost of [handCost, equipmentCost]) expect(projectionJson).toContain(cost.id);
      for (const replacement of replacementCards) {
        expect(projectionJson.includes(replacement.id)).toBe(player.id === owner.id);
        await expect(viewerPage.locator(`[data-hand-card-id="${replacement.id}"]`))
          .toHaveCount(player.id === owner.id ? 1 : 0);
      }
      for (const [privateIndex, privateCard] of privateCards.entries()) {
        expect(projectionJson.includes(privateCard.id)).toBe(player.id === seed.players[privateIndex].id);
        await expect(viewerPage.locator(`[data-hand-card-id="${privateCard.id}"]`))
          .toHaveCount(player.id === seed.players[privateIndex].id ? 1 : 0);
      }
      expect(projections[index].players.find((candidate) => candidate.id === owner.id).equipmentCards)
        .not.toContainEqual(equipmentCost);
    }
    await attachJourneyJson(testInfo, "w3-equilibrium-four-viewer-frame-evidence.json", {
      costEvent, rawEffect, effect, ownerId: owner.id, viewers: frameEvidence, parkedEvidence,
      privateReplacementIds: replacementCards.map((face) => face.id),
    });
  } finally {
    await Promise.all(openedViewers.map(({ context }) => context.close()));
  }
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

test("real Lust keeps player-name order through Skip and settlement after the cost reveal", async ({ page, request }, testInfo) => {
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
  const preSubmitActions = [];
  page.on("request", (browserRequest) => {
    if (browserRequest.url() === `${API}/api/rooms` && browserRequest.method() === "POST") {
      preSubmitActions.push(browserRequest.postDataJSON()?.action ?? "unknown");
    }
  });
  const started = await completeSkillSelection({
    page, request, seed, skillName: "Lust", providerId: "diao_chan_lust", cardIds: [cost.id], targetIndexes: [1, 2],
    onChoosingTargets: async () => {
      const inspectButtons = page.locator(".opponent-seat-inspect-button");
      await expect(inspectButtons).toHaveCount(3);
      const firstTarget = page.locator(`[data-player-anchor="${seed.players[1].id}"]`);
      const hitGeometry = await firstTarget.evaluate((seat) => {
        const bounds = (element) => {
          const rect = element.getBoundingClientRect();
          return { top: rect.top, bottom: rect.bottom, left: rect.left, right: rect.right, width: rect.width, height: rect.height };
        };
        const portrait = seat.querySelector(".opponent-hero-portrait");
        const hero = seat.querySelector(".opponent-hero-card");
        const target = seat.querySelector(".opponent-hero-target");
        const inspect = seat.querySelector(".opponent-seat-inspect-button");
        const style = getComputedStyle(inspect);
        return {
          portrait: bounds(portrait), hero: bounds(hero), target: bounds(target), inspect: bounds(inspect),
          inspectPaint: { background: style.backgroundColor, radius: style.borderRadius, shadow: style.boxShadow },
          visibleName: inspect.querySelector(".opponent-player-name")?.textContent,
        };
      });
      expect(hitGeometry.portrait).toEqual(hitGeometry.hero);
      expect(hitGeometry.target.bottom).toBeLessThanOrEqual(hitGeometry.inspect.top + 0.5);
      expect(hitGeometry.inspect.height).toBeGreaterThanOrEqual(44);
      expect(hitGeometry.inspectPaint).toEqual({ background: "rgba(0, 0, 0, 0)", radius: "0px", shadow: "none" });
      expect(hitGeometry.visibleName).toBe("FIRST MAN");
      await expect(page.locator(`[data-hand-card-id="${cost.id}"]`)).toHaveAttribute("data-card-selected", "true");

      await firstTarget.locator(".opponent-seat-inspect-button").click();
      await expect(page.locator(`.opponent-inspection-panel[data-inspect-player-id="${seed.players[1].id}"]`)).toBeVisible();
      await expect(page.locator(`[data-hand-card-id="${cost.id}"]`)).toHaveAttribute("data-card-selected", "true");
      await page.keyboard.press("Escape");
      await expect(page.locator(".opponent-inspection-panel")).toHaveCount(0);
      expect(preSubmitActions).toEqual([]);
    },
  });
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
  const display = page.locator('.public-card-display[data-public-card-motion="lust-duel"]');
  const presentedCost = display.locator(`[data-public-card-journey-card-id="${cost.id}"]`);
  const announcement = display.locator('[data-public-card-announcement="true"]');
  await expect(display).toBeVisible();
  await expect(presentedCost).toHaveAttribute("data-public-card-journey-phase", "parked");
  await expect(presentedCost).toHaveAttribute("data-public-card-journey-actor-id", seed.players[0].id);
  await expect(announcement).toHaveAttribute("data-public-card-announcement-event-id", activation.costEventId);
  await expect(announcement).toContainText(compactLustOrderMessage(seed.players[1], seed.players[2], seed.players[1]));
  await expect(page.locator(`[data-effect-notice-event-id="${activation.eventId}"]`)).toHaveCount(0);
  await expect(display.locator("[data-public-card-frame-kind='DIAO_CHAN_LUST_COST']")).toHaveCount(0);
  await expect(display.locator("[data-public-card-journey-card-id]")).toHaveCount(1);

  const inspectPosts = [];
  page.on("request", (browserRequest) => {
    if (browserRequest.url() === `${API}/api/rooms` && browserRequest.method() === "POST") {
      inspectPosts.push(browserRequest.postDataJSON()?.action ?? "unknown");
    }
  });
  const beforeInspect = await presentedCost.boundingBox();
  const lustHistoryInspectorOpener = page.locator(`[data-player-anchor="${seed.players[1].id}"] .opponent-hero-target`);
  await lustHistoryInspectorOpener.click();
  const lustInspector = page.locator('.interaction-stage[data-local-ui-mode="INSPECT"] .opponent-inspection-floating-shell');
  await expect(lustInspector).toBeVisible();
  const retainedLustDisplay = page.locator('.public-card-display[data-public-card-motion="lust-duel"][data-public-card-inspection-history="true"]');
  await expect(retainedLustDisplay).toBeVisible();
  const retainedLustCost = retainedLustDisplay.locator(`[data-public-card-journey-card-id="${cost.id}"]`);
  await expect(retainedLustCost).toHaveAttribute("data-public-card-journey-phase", "parked");
  await expect(retainedLustCost).toHaveAttribute("data-public-card-journey-actor-id", seed.players[0].id);
  await expect(retainedLustCost).toHaveAttribute("data-public-card-inspectable", "false");
  await expect(retainedLustDisplay.locator(".public-card-display-journey-copy")).toHaveCount(0);
  const duringInspect = await retainedLustCost.boundingBox();
  expect(beforeInspect).toBeTruthy();
  expect(duringInspect).toBeTruthy();
  expect(Math.abs(duringInspect.x - beforeInspect.x)).toBeLessThanOrEqual(1);
  expect(Math.abs(duringInspect.y - beforeInspect.y)).toBeLessThanOrEqual(1);
  expect(inspectPosts).toEqual([]);
  await page.keyboard.press("Escape");
  await expect(page.locator('.interaction-stage[data-local-ui-mode="INSPECT"]')).toHaveCount(0);
  await expect(display).toBeVisible();
  await expect(presentedCost).toHaveAttribute("data-public-card-journey-phase", "parked");
  expect(inspectPosts).toEqual([]);

  await expect(presentedCost).toHaveAttribute("data-public-card-journey-size", "thumbnail");
  const parked = await presentedCost.boundingBox();
  const target = await presentedCost.evaluate((element) => ({
    left: Number(element.dataset.publicCardJourneyTargetLeft),
    top: Number(element.dataset.publicCardJourneyTargetTop),
  }));
  const dock = await page.locator(`.local-player-dock[data-player-anchor="${seed.players[0].id}"]`).boundingBox();
  expect(Math.abs(parked.x - target.left)).toBeLessThan(1);
  expect(Math.abs(parked.y - target.top)).toBeLessThan(1);
  expect(Math.abs(target.left - (dock.x + 8))).toBeLessThan(1);
  expect(Math.abs(target.top - (dock.y - 78))).toBeLessThan(1);
  await page.screenshot({ path: testInfo.outputPath("lust-cost-frame-440-restored-duel-history.png") });

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
  await page.addInitScript(({ targetViewerId, actorId, cardId }) => {
    const capture = {
      samples: [],
      frame: 0,
      firstVisibleFrame: null,
      done: false,
    };
    const read = () => {
      const card = [...document.querySelectorAll("[data-public-card-journey-card-id]")]
        .find((element) => element.getAttribute("data-public-card-journey-card-id") === cardId);
      const display = card?.closest(".public-card-display");
      if (!display || !card) return null;
      const rect = card.getBoundingClientRect();
      const anchor = [...document.querySelectorAll("[data-player-anchor]")]
        .find((element) => element.getAttribute("data-player-anchor") === actorId);
      return {
        viewerId: display.getAttribute("data-public-card-viewer-id"),
        layoutViewerId: display.getAttribute("data-public-card-layout-viewer-id"),
        displayPending: display.getAttribute("data-public-card-layout-pending"),
        displayClass: display.className,
        actorId: card.getAttribute("data-public-card-journey-actor-id"),
        phase: card.getAttribute("data-public-card-journey-phase"),
        cardPending: card.getAttribute("data-public-card-journey-layout-pending"),
        visibility: getComputedStyle(card).visibility,
        actual: { left: rect.left, top: rect.top },
        target: {
          left: Number(card.getAttribute("data-public-card-journey-target-left")),
          top: Number(card.getAttribute("data-public-card-journey-target-top")),
        },
        transitionProperty: getComputedStyle(card).transitionProperty,
        actorAnchorPresent: Boolean(anchor && anchor.getBoundingClientRect().width > 0 && anchor.getBoundingClientRect().height > 0),
      };
    };
    const sample = () => {
      const values = read();
      if (values) capture.samples.push({ frame: capture.frame, ...values });
    };
    const inspectFrame = () => {
      capture.frame += 1;
      sample();
      if (capture.firstVisibleFrame == null && capture.samples.some((entry) => entry.viewerId === targetViewerId && entry.visibility === "visible")) {
        capture.firstVisibleFrame = capture.frame;
      }
      if (capture.firstVisibleFrame != null && capture.frame - capture.firstVisibleFrame >= 3) {
        capture.done = true;
        return;
      }
      if (capture.frame < 600) window.requestAnimationFrame(inspectFrame);
    };
    window.__q3LustRebase = capture;
    window.requestAnimationFrame(inspectFrame);
  }, { targetViewerId: firstViewer.id, actorId: seed.players[0].id, cardId: cost.id });
  await page.evaluate(({ code, token, name }) => {
    localStorage.setItem("three-realms-session", JSON.stringify({ code, token, name }));
  }, { code: seed.code, token: firstViewer.token, name: firstViewer.name });
  await page.reload();
  await expect(page.locator(`.public-card-display[data-public-card-viewer-id="${firstViewer.id}"]`)).toBeVisible();
  await expect.poll(() => page.evaluate((viewerId) => window.__q3LustRebase.samples.some((sample) =>
    sample.viewerId === viewerId && sample.visibility === "visible"), firstViewer.id), { timeout: 15_000 }).toBe(true);
  const restored = page.locator(`[data-public-card-journey-card-id="${cost.id}"]`);
  await expect(restored).toHaveAttribute("data-public-card-journey-phase", "parked");
  await expect(restored).toHaveAttribute("data-public-card-journey-actor-id", seed.players[0].id);
  const lustRebaseSamples = await page.evaluate(() => window.__q3LustRebase.samples);
  const firstVisibleLustFrame = lustRebaseSamples.find((sample) => sample.viewerId === firstViewer.id && sample.visibility === "visible");
  expect(firstVisibleLustFrame, JSON.stringify(lustRebaseSamples)).toBeTruthy();
  expect(firstVisibleLustFrame.phase).toBe("parked");
  expect(firstVisibleLustFrame.actorId).toBe(seed.players[0].id);
  expect(firstVisibleLustFrame.layoutViewerId).toBe(firstViewer.id);
  expect(firstVisibleLustFrame.actorAnchorPresent).toBe(true);
  expect(Math.abs(firstVisibleLustFrame.actual.left - firstVisibleLustFrame.target.left)).toBeLessThanOrEqual(2);
  expect(Math.abs(firstVisibleLustFrame.actual.top - firstVisibleLustFrame.target.top)).toBeLessThanOrEqual(2);
  expect(firstVisibleLustFrame.transitionProperty).toBe("none");
  console.log(`[Q3 LUST viewer rebase] ${JSON.stringify({ firstVisibleLustFrame, sampleCount: lustRebaseSamples.length })}`);
  await expect(page.locator(`[data-public-card-frame-event-id="${activation.eventId}"]`)).toHaveCount(0);
  await expect(page.locator(`[data-effect-notice-event-id="${activation.eventId}"]`)).toHaveCount(0);
  await expect(page.locator(`[data-public-card-announcement-event-id="${activation.costEventId}"]`)).toBeVisible();
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
  const settlementResponsePromise = page.waitForResponse((response) => response.url() === `${API}/api/rooms`
    && response.request().method() === "POST" && response.request().postDataJSON()?.action === "decline_response");
  await skip.click();
  const submitted = await skipSubmission;
  expect(submitted.postDataJSON()).toMatchObject({ action: "decline_response", code: seed.code, token: firstViewer.token });
  const settlementResponse = await settlementResponsePromise;
  const settlement = (await settlementResponse.json()).room.presentationSnapshot.lustDuelExchange.settlement;
  const resultCopy = page.locator(`.public-card-display[data-public-card-motion="lust-duel"][data-public-card-settlement-event-id="${settlement.eventId}"] [data-public-card-announcement='true'][data-public-card-result="LUST_DUEL_DAMAGE_APPLIED"]`);
  await expect(resultCopy).toBeVisible();
  await expect(resultCopy).toContainText("FIRST MAN failed to play Attack; 1 Duel damage from SECOND MAN applies.");
  await expect(page.locator(`[data-effect-notice-event-id="${settlement.eventId}"]`)).toHaveCount(0);
});

test("L4: opponent Inspect keeps a live three-Attack LUST history, then reloads and settles", async ({ page, browser, request }, testInfo) => {
  test.setTimeout(120_000);
  const cost = card("Dodge", "l4-lust-inspect-cost");
  const privateCard = card("Peach", "l4-lust-inspect-private", "♥");
  const firstAttack = card("Attack", "l4-lust-inspect-first-attack", "♣");
  const secondAttack = card("Attack", "l4-lust-inspect-second-attack", "♦");
  const thirdAttack = card("Attack", "l4-lust-inspect-third-attack", "♠");
  const seed = await seedSkillRoom(request, {
    hero: "diao-chan", hand: [cost, privateCard],
    targets: [
      { name: "Test Player 3", role: "Loyalist", hero: "liu-bei", hp: 4, maxHp: 4, hand: [firstAttack, thirdAttack] },
      { name: "Test Player 4", role: "Rebel", hero: "cao-cao", hp: 4, maxHp: 4, hand: [secondAttack] },
    ],
  });
  const owner = seed.players[0];
  const first = seed.players[1];
  const second = seed.players[2];
  const observer = seed.players[3];
  const firstContext = await browser.newContext({ viewport: { width: 440, height: 894 } });
  const secondContext = await browser.newContext({ viewport: { width: 440, height: 894 } });
  const observerContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const firstPage = await firstContext.newPage();
  const secondPage = await secondContext.newPage();
  const observerPage = await observerContext.newPage();
  const viewers = [
    { player: owner, page },
    { player: first, page: firstPage },
    { player: second, page: secondPage },
    { player: observer, page: observerPage },
  ];
  try {
    await openSkillUser(page, seed, { width: 390, height: 700 });
    await openSkillViewer(firstPage, seed, first, { width: 390, height: 844 });
    await openSkillViewer(secondPage, seed, second, { width: 440, height: 894 });
    await openSkillViewer(observerPage, seed, observer, { width: 390, height: 844 });
    const started = await completeSkillSelection({ page, request, seed, skillName: "Lust", providerId: "diao_chan_lust", cardIds: [cost.id], targetIndexes: [1, 2] });
    const activation = started.room.presentationSnapshot.diaoChanSkillNotices.find((notice) => notice.notice === "ACTIVATION");
    const exchange = started.room.presentationSnapshot.lustDuelExchange;
    const costEvent = started.room.timeline.find((event) => event.id === activation.costEventId);
    expect(exchange).toMatchObject({ semantics: "PROVEN", responseCount: 0, root: { ownerId: owner.id, costCardId: cost.id } });
    expect(exchange.root.firstParticipantId).toBe(first.id);
    expect(exchange.root.secondParticipantId).toBe(second.id);
    const firstProjection = await projectedRoom(request, seed, first);
    expect(firstProjection.currentAction).toMatchObject({ kind: "response", actorId: first.id, requirement: "attack" });
    const handProjections = await Promise.all(viewers.map(({ player }) => projectedRoom(request, seed, player)));
    for (const [index, { player }] of viewers.entries()) {
      const serializedProjection = JSON.stringify(handProjections[index]);
      if (player.id === owner.id) expect(serializedProjection).toContain(privateCard.id);
      else expect(serializedProjection).not.toContain(privateCard.id);
    }

    const eventIdentities = [{ eventId: costEvent.id, cardId: cost.id, actorId: owner.id }];
    const displayFor = (viewerPage) => viewerPage.locator(`.public-card-display[data-public-card-motion="lust-duel"][data-public-card-root-event-id="${costEvent.id}"]`);
    const waitForParkedEvent = async ({ eventId, cardId, actorId }) => Promise.all(viewers.map(async ({ player, page: viewerPage }) => {
      const display = displayFor(viewerPage);
      await expect(display).toHaveCount(1);
      await expect(display).toHaveAttribute("data-public-card-viewer-id", player.id);
      const physicalCard = display.locator(`[data-public-card-journey-event-id="${eventId}"]`);
      await expect(physicalCard).toHaveAttribute("data-public-card-journey-phase", "parked", { timeout: 12_000 });
      await expect(physicalCard).toHaveAttribute("data-public-card-journey-card-id", cardId);
      await expect(physicalCard).toHaveAttribute("data-public-card-journey-actor-id", actorId);
    }));
    const waitForAllHistory = async () => Promise.all(viewers.map(async ({ player, page: viewerPage }) => {
      const display = displayFor(viewerPage);
      await expect(display.locator("[data-public-card-journey-event-id]")).toHaveCount(eventIdentities.length);
      for (const event of eventIdentities) {
        const physicalCard = display.locator(`[data-public-card-journey-event-id="${event.eventId}"]`);
        await expect(physicalCard).toHaveAttribute("data-public-card-journey-phase", "parked");
        await expect(physicalCard).toHaveAttribute("data-public-card-journey-card-id", event.cardId);
        await expect(physicalCard).toHaveAttribute("data-public-card-journey-actor-id", event.actorId);
      }
      if (player.id === owner.id) {
        await expect(viewerPage.locator(`[data-hand-card-id="${privateCard.id}"]`)).toHaveCount(1);
      } else {
        await expect(viewerPage.locator(`[data-hand-card-id="${privateCard.id}"]`)).toHaveCount(0);
      }
      await expect(display).toHaveAttribute("data-public-card-viewer-id", player.id);
    }));
    await waitForParkedEvent(eventIdentities[0]);
    const expectedOrderCopy = compactLustOrderMessage(first, second, seed.players.find((player) => player.id === exchange.root.firstActorId));
    await Promise.all(viewers.map(async ({ page: viewerPage }) => {
      const display = displayFor(viewerPage);
      const announcement = display.locator("[data-public-card-announcement='true']");
      const geometry = await announcement.evaluate((element) => {
        const copy = element.querySelector("b") ?? element;
        const range = document.createRange();
        range.selectNodeContents(copy);
        const lineTops = [...range.getClientRects()].filter((rect) => rect.width > 0 && rect.height > 0)
          .reduce((tops, rect) => {
            if (!tops.some((top) => Math.abs(top - rect.top) <= 1)) tops.push(rect.top);
            return tops;
          }, []);
        const textRect = element.getBoundingClientRect();
        const tableRect = document.querySelector(".play-table")?.getBoundingClientRect();
        const overlaps = [...document.querySelectorAll([
          ".opponent-player-card", ".player-square", ".player-board-status", ".visible-countdown",
          ".stage-system-cluster", ".public-activity-chip", ".local-player-dock", ".local-hand-rail", ".console-guidance",
        ].join(", "))].flatMap((obstacle) => {
          if (obstacle === element || element.contains(obstacle)) return [];
          const rect = obstacle.getBoundingClientRect();
          return textRect.left < rect.right - 1 && textRect.right > rect.left + 1
            && textRect.top < rect.bottom - 1 && textRect.bottom > rect.top + 1
            ? [{ selector: obstacle.className?.baseVal ?? obstacle.className ?? obstacle.tagName }] : [];
        });
        return {
          text: copy.textContent?.trim() ?? "",
          lines: lineTops.length,
          overlaps,
          centerDelta: tableRect ? Math.abs(textRect.left + textRect.width / 2 - (tableRect.left + tableRect.width / 2)) : null,
        };
      });
      if (viewerPage === page) await testInfo.attach("l4-lust-order-390x700.png", {
        body: await viewerPage.screenshot(), contentType: "image/png",
      });
      expect(geometry.text.replace(/\s+/g, " ")).toBe(expectedOrderCopy.replace(/\s+/g, " "));
      expect(geometry.text).not.toContain("…");
      expect(geometry.lines, JSON.stringify({ viewerId: viewerPage === page ? owner.id : null, geometry })).toBe(2);
      expect(geometry.overlaps).toEqual([]);
      expect(geometry.centerDelta).toBeLessThanOrEqual(12);
    }));

    const firstAccepted = await submitDuelAttack(firstPage, first, firstAttack.id);
    const firstEvent = firstAccepted.room.timeline.find((event) => event.type === "card" && event.card?.id === firstAttack.id);
    eventIdentities.push({ eventId: firstEvent.id, cardId: firstAttack.id, actorId: first.id });
    expect(firstEvent.lustDuelAttackResponse).toMatchObject({
      relation: "LUST_DUEL_EXCHANGE", activationEventId: activation.eventId, costEventId: costEvent.id,
      ordinal: 1, sourceId: first.id, targetId: second.id, decisionActorId: first.id, responseActorId: first.id,
    });
    await waitForParkedEvent(eventIdentities.at(-1));

    const secondAccepted = await submitDuelAttack(secondPage, second, secondAttack.id);
    const secondEvent = secondAccepted.room.timeline.find((event) => event.type === "card" && event.card?.id === secondAttack.id);
    eventIdentities.push({ eventId: secondEvent.id, cardId: secondAttack.id, actorId: second.id });
    expect(secondEvent.lustDuelAttackResponse).toMatchObject({
      relation: "LUST_DUEL_EXCHANGE", activationEventId: activation.eventId, costEventId: costEvent.id,
      ordinal: 2, sourceId: second.id, targetId: first.id, decisionActorId: second.id, responseActorId: second.id,
    });
    await waitForParkedEvent(eventIdentities.at(-1));

    const thirdAccepted = await submitDuelAttack(firstPage, first, thirdAttack.id);
    const thirdEvent = thirdAccepted.room.timeline.find((event) => event.type === "card" && event.card?.id === thirdAttack.id);
    eventIdentities.push({ eventId: thirdEvent.id, cardId: thirdAttack.id, actorId: first.id });
    expect(thirdEvent.lustDuelAttackResponse).toMatchObject({
      relation: "LUST_DUEL_EXCHANGE", activationEventId: activation.eventId, costEventId: costEvent.id,
      ordinal: 3, sourceId: first.id, targetId: second.id, decisionActorId: first.id, responseActorId: first.id,
    });
    expect(thirdAccepted.room.presentationSnapshot.lustDuelExchange.responses.map((response) => response.ordinal)).toEqual([1, 2, 3]);
    await waitForParkedEvent(eventIdentities.at(-1));
    await waitForAllHistory();
    const secondProjection = await projectedRoom(request, seed, second);
    expect(secondProjection.currentAction).toMatchObject({ kind: "response", actorId: second.id, requirement: "attack" });
    const beforeInspect = await Promise.all(eventIdentities.map(({ eventId }) => displayFor(secondPage)
      .locator(`[data-public-card-journey-event-id="${eventId}"]`).boundingBox()));

    const inspectPosts = [];
    secondPage.on("request", (browserRequest) => {
      if (browserRequest.url() === `${API}/api/rooms` && browserRequest.method() === "POST") {
        inspectPosts.push(browserRequest.postDataJSON()?.action ?? "unknown");
      }
    });
    await secondPage.locator(`[data-player-anchor="${first.id}"] .opponent-hero-target`).click();
    const inspector = secondPage.locator('.interaction-stage[data-local-ui-mode="INSPECT"] .opponent-inspection-floating-shell');
    await expect(inspector).toBeVisible();
    const passiveHistory = secondPage.locator(`.public-card-display[data-public-card-motion="lust-duel"][data-public-card-root-event-id="${costEvent.id}"][data-public-card-inspection-history="true"]`);
    await expect(passiveHistory).toBeVisible();
    await expect(passiveHistory.locator("[data-public-card-journey-event-id]")).toHaveCount(eventIdentities.length);
    await expect(passiveHistory.locator(".public-card-display-journey-copy")).toHaveCount(0);
    for (const [index, event] of eventIdentities.entries()) {
      const parked = passiveHistory.locator(`[data-public-card-journey-event-id="${event.eventId}"]`);
      await expect(parked).toHaveAttribute("data-public-card-journey-phase", "parked");
      await expect(parked).toHaveAttribute("data-public-card-journey-card-id", event.cardId);
      await expect(parked).toHaveAttribute("data-public-card-journey-actor-id", event.actorId);
      await expect(parked).toHaveAttribute("data-public-card-inspectable", "false");
      const duringInspect = await parked.boundingBox();
      expect(duringInspect).toBeTruthy();
      expect(Math.abs(duringInspect.x - beforeInspect[index].x)).toBeLessThanOrEqual(1);
      expect(Math.abs(duringInspect.y - beforeInspect[index].y)).toBeLessThanOrEqual(1);
    }
    const inspectorHit = await inspector.evaluate((element) => {
      const rect = element.getBoundingClientRect();
      const target = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
      return Boolean(target && element.contains(target));
    });
    expect(inspectorHit).toBe(true);
    expect(inspectPosts).toEqual([]);
    await secondPage.keyboard.press("Escape");
    await expect(secondPage.locator('.interaction-stage[data-local-ui-mode="INSPECT"]')).toHaveCount(0);
    const skip = secondPage.locator(`.local-player-dock[data-player-anchor="${second.id}"] [data-action-slot="decline"] button`);
    await expect(skip).toHaveText("Skip");
    await expect(skip).toBeEnabled();
    await waitForAllHistory();
    expect(inspectPosts).toEqual([]);

    await secondPage.reload();
    await expect(secondPage.locator(`.local-player-dock[data-player-anchor="${second.id}"]`)).toBeVisible();
    await waitForAllHistory();
    await Promise.all(viewers.map(({ page: viewerPage }) => installLustSettlementPaintTrace(viewerPage)));
    const settlementPromise = secondPage.waitForResponse((response) => response.url() === `${API}/api/rooms`
      && response.request().method() === "POST" && response.request().postDataJSON()?.action === "decline_response");
    await skip.click();
    const settlementResponse = await settlementPromise;
    expect(settlementResponse.ok()).toBeTruthy();
    const settledRoom = (await settlementResponse.json()).room;
    const settlement = settledRoom.presentationSnapshot.lustDuelExchange.settlement;
    expect(settledRoom.presentationSnapshot.lustDuelExchange).toMatchObject({
      semantics: "PROVEN", responseCount: 3,
      settlement: { failedPlayerId: second.id, damageSourceId: first.id, damageAmount: 1, outcome: "DAMAGE_APPLIED" },
    });
    for (const { player, page: viewerPage } of viewers) {
      const display = viewerPage.locator(`.public-card-display[data-public-card-motion="lust-duel"][data-public-card-settlement-event-id="${settlement.eventId}"]`);
      await expect(display).toBeVisible();
      await expect(display.locator("[data-public-card-journey-event-id]")).toHaveCount(eventIdentities.length);
      for (const event of eventIdentities) {
        const parked = display.locator(`[data-public-card-journey-event-id="${event.eventId}"]`);
        await expect(parked).toHaveAttribute("data-public-card-journey-phase", "parked");
        await expect(parked).toHaveAttribute("data-public-card-journey-card-id", event.cardId);
        await expect(parked).toHaveAttribute("data-public-card-journey-actor-id", event.actorId);
      }
      await expect(display).toHaveAttribute("data-public-card-viewer-id", player.id);
    }
    const settlementPaintStates = await Promise.all(viewers.map(async ({ player, page: viewerPage }) => {
      const paintObserved = await viewerPage.waitForFunction(
        () => window.__lustSettlementPaintTrace?.trace.firstVisibleAt !== null,
        null,
        { timeout: 1400 },
      ).then(() => true).catch(() => false);
      const state = await viewerPage.evaluate((eventId) => {
        const display = document.querySelector(`.public-card-display[data-public-card-settlement-event-id="${eventId}"]`);
        const copy = display?.querySelector("[data-public-card-announcement='true']");
        const rectOf = (element) => {
          if (!element) return null;
          const rect = element.getBoundingClientRect();
          const style = getComputedStyle(element);
          return { left: rect.left, top: rect.top, width: rect.width, height: rect.height,
            display: style.display, visibility: style.visibility, opacity: style.opacity };
        };
        const layoutSelectors = [".play-table", ".player-board", ".local-player-dock", ".local-hand-rail",
          ".console-guidance", ".opponent-player-card", ".player-square", ".player-board-status",
          ".visible-countdown", ".stage-system-cluster", ".public-activity-chip"];
        const layout = Object.fromEntries(layoutSelectors.map((selector) => [selector,
          [...document.querySelectorAll(selector)].map((element) => ({
            className: element.className?.baseVal ?? element.className ?? null,
            rect: rectOf(element),
          }))]));
        const journeyCards = [...(display?.querySelectorAll("[data-public-card-journey-event-id]") ?? [])].map((card) => ({
          attributes: Object.fromEntries([...card.attributes].map(({ name, value }) => [name, value])),
          rect: rectOf(card),
        }));
        return {
          viewport: { width: innerWidth, height: innerHeight },
          trace: window.__lustSettlementPaintTrace?.trace ?? null,
          displayPresent: Boolean(display), displayClass: display?.className ?? null,
          displayLayoutPending: display?.getAttribute("data-public-card-layout-pending") ?? null,
          displayAttributes: display ? Object.fromEntries([...display.attributes].map(({ name, value }) => [name, value])) : null,
          copyText: copy?.textContent?.trim() ?? null,
          copyAttributes: copy ? Object.fromEntries([...copy.attributes].map(({ name, value }) => [name, value])) : null,
          displayRect: rectOf(display), copyRect: rectOf(copy), layout, journeyCards,
        };
      }, settlement.eventId);
      return { viewerId: player.id, paintObserved, ...state };
    }));
    await testInfo.attach("l4-lust-settlement-painted-state.json", {
      body: JSON.stringify(settlementPaintStates, null, 2), contentType: "application/json",
    });
    for (const state of settlementPaintStates.filter(({ paintObserved }) => !paintObserved)) {
      const viewer = viewers.find(({ player }) => player.id === state.viewerId);
      if (viewer) await testInfo.attach(`l4-unpainted-${state.viewerId}.png`, {
        body: await viewer.page.screenshot(), contentType: "image/png",
      });
    }
    expect(settlementPaintStates.filter(({ paintObserved }) => paintObserved), JSON.stringify(settlementPaintStates))
      .toHaveLength(viewers.length);
    await Promise.all(viewers.map(async ({ page: viewerPage }) => {
      const settlementDisplay = viewerPage.locator(
        `.public-card-display[data-public-card-motion="lust-duel"][data-public-card-settlement-event-id="${settlement.eventId}"]`,
      );
      await expect(settlementDisplay).toHaveCount(0, { timeout: 5000 });
      const trace = await viewerPage.evaluate(() => window.__lustSettlementPaintTrace.trace);
      const visibleSpan = trace.lastVisibleAt - trace.firstVisibleAt;
      expect(visibleSpan).toBeGreaterThanOrEqual(1800);
      expect(visibleSpan).toBeLessThanOrEqual(2400);
    }));
  } finally {
    await Promise.all([firstContext.close(), secondContext.close(), observerContext.close()]);
  }
});

test("L5: four authenticated viewers see the complete LUST Duel reveal, history, and settlement", async ({ page, browser, request }, testInfo) => {
  test.setTimeout(120_000);
  const cost = card("Dodge", "l5-lust-cost");
  const privateCard = card("Peach", "l5-lust-unspent-private", "♥");
  const firstAttack = card("Attack", "l5-lust-first-attack", "♣");
  const secondAttack = card("Attack", "l5-lust-second-attack", "♦");
  const seed = await seedSkillRoom(request, {
    hero: "diao-chan", hand: [cost, privateCard],
    targets: [
      { name: "FIRST PLAYER WITH A VERY LONG NAME 测试甲乙丙丁戊己庚辛", role: "Loyalist", hero: "guo-jia", hp: 4, maxHp: 4, hand: [firstAttack] },
      { name: "玩家姓名特别特别特别长测试乙甲乙丙丁戊己庚辛壬癸", role: "Rebel", hero: "cao-cao", hp: 4, maxHp: 4, hand: [secondAttack] },
    ],
  });
  const owner = seed.players[0];
  const first = seed.players[1];
  const second = seed.players[2];
  const third = seed.players[3];
  const firstContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const secondContext = await browser.newContext({ viewport: { width: 440, height: 894 } });
  const thirdContext = await browser.newContext({
    viewport: { width: 440, height: 956 },
    recordVideo: { dir: testInfo.outputDir, size: { width: 440, height: 956 } },
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
        maxAnnouncementLines: label === "cost" || label.startsWith("attack-") ? 8 : 2,
        ...(id === third.id ? { screenshotPrefix: `l5-${label}-third-view`, testInfo } : {}),
      },
    )));
    const firstAccessibleFrameName = parkedCards[0].accessibleName;
    for (const [index, viewer] of viewers.entries()) {
      expect(parkedCards[index].actorId).toBe(actor.id);
      expect(parkedCards[index].cardIds).toBe(cardId);
      expect(parkedCards[index].accessibleName).toBe(firstAccessibleFrameName);
      if (label.startsWith("attack-")) {
        const announcement = parkedCards[index].journeyAnnouncements[0];
        const target = actor.id === first.id ? second : first;
        expect(announcement.accessibleText).toContain(actor.name);
        expect(announcement.accessibleText).toContain(target.name);
        expect([
          compactLustAttackMessage(actor, target),
          `${actor.name.trim()} played Attack targeting ${target.name.trim()}`,
        ]).toContain(announcement.text);
        expect(announcement.supportingText).toBe(`Waiting for ${target.name}`);
        expect(announcement.text).not.toContain("…");
        expect(announcement.text).toContain(actor.name);
        expect(announcement.text).toContain(target.name);
      }
      await assertJourneyUsesActorAnchor(viewer.page, viewer.player, actor, parkedCards[index]);
    }
    return parkedCards;
  };

  try {
    await openSkillUser(page, seed, { width: 390, height: 844 });
    await openSkillViewer(firstPage, seed, first, { width: 390, height: 844 });
    await openSkillViewer(secondPage, seed, second, { width: 440, height: 766 });
    await openSkillViewer(thirdPage, seed, third, { width: 480, height: 900 });
    for (const { id, page: viewerPage } of viewers) {
      viewerPage.on("pageerror", (error) => runtimeErrors.push({ viewerId: id, message: error.message }));
      await installPublicJourneyTrace(viewerPage, id);
    }
    const started = await completeSkillSelection({ page, request, seed, skillName: "Lust", providerId: "diao_chan_lust", cardIds: [cost.id], targetIndexes: [1, 2] });
    const activation = started.room.presentationSnapshot.diaoChanSkillNotices.find((notice) => notice.notice === "ACTIVATION");
    const initialExchange = started.room.presentationSnapshot.lustDuelExchange;
    const costEvent = started.room.timeline.find((event) => event.id === activation.costEventId);
    const firstActor = seed.players.find((player) => player.id === initialExchange.root.firstActorId);
    const firstParticipant = seed.players.find((player) => player.id === initialExchange.root.firstParticipantId);
    const secondParticipant = seed.players.find((player) => player.id === initialExchange.root.secondParticipantId);
    expect(firstActor).toBeTruthy();
    expect(firstParticipant).toBe(first);
    expect(secondParticipant).toBe(second);
    expect(activation.firstActorId).toBe(firstActor.id);
    expect(costEvent.cards).toEqual([cost]);
    expect(initialExchange).toMatchObject({
      semantics: "PROVEN", root: { activationEventId: activation.eventId, costEventId: costEvent.id, costCardId: cost.id, ownerId: owner.id },
      responseCount: 0, currentParticipantId: first.id, decisionActorId: first.id,
    });
    await expect.poll(async () => Promise.all(viewers.map(({ page: viewerPage }) =>
      viewerPage.locator("[data-public-activity-chip]").count())))
      .toEqual(Array(4).fill(0));
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
      expect(geometry.publicFrameClass).toBe("COST");
      expect(geometry.publicFrameEffectId).toBe("diao_chan_lust");
      expect(geometry.publicFrameActivationOwnerId).toBe(owner.id);
      expect(geometry.publicFrameMaterialOwnerIds).toBe(owner.id);
      expect(geometry.publicFrameMaterialCardIds).toBe(cost.id);
      expect(geometry.publicFrameMaterialCount).toBe("1");
      expect(geometry.publicFrameGridColumns).toBe("1");
      expect(geometry.actorId).toBe(owner.id);
      expect(geometry.accessibleName).toMatch(/LUST cost frame.*Dodge/);
      expect(geometry.accessibleName).toContain(owner.name);
      expect(geometry.publicFrameRole).toBe("group");
    }
    expect(new Set(costFrameGeometry.map((geometry) => geometry.accessibleName)).size).toBe(1);
    await Promise.all(viewers.map(({ page: viewerPage }, index) => viewerPage.screenshot({
      path: testInfo.outputPath(`l5-cost-frame-initial-${costFrameGeometry[index].viewport.width}x${costFrameGeometry[index].viewport.height}.png`),
    })));
    console.log("[LUST Frame geometry]", JSON.stringify(costFrameGeometry.map(({ viewerId, viewport, playTableRect, lustFrameRect, lustFrameOverlaps, journeyAnnouncements }) => ({ viewerId, viewport, playTableRect, lustFrameRect, lustFrameOverlaps, journeyAnnouncements }))));
    for (const geometry of costFrameGeometry) {
      const frame = geometry.lustFrameRect;
      const table = geometry.playTableRect;
      expect(frame).toBeTruthy();
      expect(table).toBeTruthy();
      expect(frame.width).toBeCloseTo(168, 0);
      expect(frame.height).toBeCloseTo(190, 0);
      expect(geometry.lustFrameTitleRect).toBeTruthy();
      expect(geometry.lustFrameTitleFontSize).toBe("22px");
      expect(geometry.lustFrameTransformOrigin).toBe("39px 43px");
      expect(geometry.lustFrameBorder).toEqual({ width: "1px", style: "solid" });
      expect(geometry.lustFrameDecorationBorder).toEqual({ width: "1px", style: "solid" });
      expect(geometry.lustFrameOverlaps).toEqual([]);
      expect(Math.abs(frame.left + frame.width / 2 - (table.left + table.width / 2))).toBeLessThanOrEqual(12);
      expect(frame.left).toBeGreaterThanOrEqual(table.left + 8);
      expect(frame.left + frame.width).toBeLessThanOrEqual(table.left + table.width - 8);
      expect(geometry.actual.left).toBeGreaterThanOrEqual(frame.left);
      expect(geometry.actual.left + geometry.actual.width).toBeLessThanOrEqual(frame.left + frame.width);
      expect(Math.abs(geometry.actual.left - (frame.left + 39))).toBeLessThanOrEqual(1);
      expect(Math.abs(geometry.actual.top - (frame.top + 43))).toBeLessThanOrEqual(1);
      expect(geometry.lustFrameTitleRect.top - frame.top).toBeGreaterThanOrEqual(8);
      expect(geometry.actual.top - (geometry.lustFrameTitleRect.top + geometry.lustFrameTitleRect.height)).toBeGreaterThanOrEqual(8);
      expect(geometry.actual.top - (geometry.lustFrameTitleRect.top + geometry.lustFrameTitleRect.height)).toBeLessThanOrEqual(14);
      expect(frame.top + frame.height - (geometry.actual.top + geometry.actual.height)).toBeGreaterThanOrEqual(11);
    }
    checkpoints.push(...costFrameGeometry);

    // Finish the root reveal/parking sample before a responder changes the local action state.
    const rootParkedCards = await rootMotion;
    for (const parkedCard of rootParkedCards) {
      const announcement = parkedCard.journeyAnnouncements[0];
      expect(announcement.text).toBe(compactLustOrderMessage(firstParticipant, secondParticipant, firstActor));
      expect(announcement.lineClamp).toBe("none");
      expect(announcement.textOverflow).toBe("visible");
      expect(announcement.supportingText).toBe(`Waiting for ${firstActor.name}`);
      expect(announcement.accessibleText).toContain(`${firstParticipant.name} vs. ${secondParticipant.name} · ${firstActor.name} attacks first.`);
      expect(announcement.accessibleText).toContain(`Waiting for ${firstActor.name} · Duel · Duel Exchange`);
      expect(announcement.text).not.toMatch(/Liu Bei|Cao Cao/);
      expect(announcement.accessibleText).not.toMatch(/Liu Bei|Cao Cao/);
    }
    await expect(rootOnOwner).toHaveAttribute("data-public-card-journey-phase", "parked");

    await expect(firstPage.locator(`[data-hand-card-id="${firstAttack.id}"] .game-card`)).toBeEnabled();
    const firstDock = firstPage.locator(`.local-player-dock[data-player-anchor="${first.id}"]`);
    const skip = firstDock.locator('[data-action-slot="decline"] button');
    await expect(skip).toHaveText("Skip");
    await expect(skip).toBeEnabled();
    await firstPage.locator(`[data-hand-card-id="${firstAttack.id}"] .game-card`).click();
    const firstConfirm = firstDock.locator('[data-action-slot="primary"] button.primary');
    await expect(firstConfirm).toHaveText("Confirm");
    await expect(firstConfirm).toBeEnabled();

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
      viewerPage.locator("[data-public-activity-chip]").count())))
      .toEqual(Array(4).fill(0));
    await expect.poll(async () => Promise.all(viewers.map(({ page: viewerPage }) =>
      viewerPage.locator("[data-public-card-announcement='true'] .public-card-announcement-support").textContent())))
      .toEqual(Array(4).fill(`Waiting for ${second.name}`));
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
      viewerPage.locator("[data-public-activity-chip]").count())))
      .toEqual(Array(4).fill(0));
    await expect.poll(async () => Promise.all(viewers.map(({ page: viewerPage }) =>
      viewerPage.locator("[data-public-card-announcement='true'] .public-card-announcement-support").textContent())))
      .toEqual(Array(4).fill(`Waiting for ${first.name}`));
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
    lateContext = await browser.newContext({ viewport: { width: 440, height: 894 } });
    const latePage = await lateContext.newPage();
    await latePage.emulateMedia({ reducedMotion: "reduce" });
    await openSkillViewer(latePage, seed, third, { width: 440, height: 894 });
    const lateDisplay = latePage.locator('.public-card-display[data-public-card-motion="lust-duel"]');
    await expect(lateDisplay).toBeVisible();
    await expect(lateDisplay.locator("[data-public-card-journey-phase='reveal'], [data-public-card-journey-phase='move']")).toHaveCount(0);
    for (const [eventId, actor] of [[costEvent.id, owner], [firstEvent.id, first], [secondEvent.id, second]]) {
      const restored = lateDisplay.locator(`[data-public-card-journey-event-id="${eventId}"]`);
      await expect(restored).toHaveCount(1);
      await expect(restored).toHaveAttribute("data-public-card-journey-phase", "parked");
      const geometry = await readJourneyCheckpoint(latePage, eventId, third.id, "late-join-reduced-motion-440x894");
      expect(geometry.protectedOverlaps).toEqual([]);
      expect(geometry.viewport.scrollWidth).toBeLessThanOrEqual(440);
      await assertJourneyUsesActorAnchor(latePage, third, actor, geometry);
      checkpoints.push(geometry);
    }
    await expect(latePage.locator(`[data-hand-card-id="${privateCard.id}"]`)).toHaveCount(0);
    await expect(latePage.locator('.public-card-display[data-public-card-motion="duel"]')).toHaveCount(0);
    await latePage.screenshot({ path: testInfo.outputPath("l5-lust-late-join-reduced-motion-440x894.png") });
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
        const actorId = await journeyCard.getAttribute("data-public-card-journey-actor-id");
        const actor = [owner, first, second].find((player) => player.id === actorId);
        expect(actor, `a public event actor exists for ${eventId}`).toBeTruthy();
        await waitForJourneyActorAnchor(viewer.page, viewer.player, actor, eventId);
        await expect.poll(async () => journeyCard.evaluate((element) => {
          const rect = element.getBoundingClientRect();
          const display = element.closest(".public-card-display");
          const target = {
            left: Number(element.dataset.publicCardJourneyTargetLeft),
            top: Number(element.dataset.publicCardJourneyTargetTop),
            width: Number(element.dataset.publicCardJourneyTargetWidth),
            height: Number(element.dataset.publicCardJourneyTargetHeight),
          };
          return element.dataset.publicCardJourneyPhase === "parked"
            && Math.abs(rect.left - target.left) < 1 && Math.abs(rect.top - target.top) < 1
            && display?.getAttribute("data-public-card-layout-pending") === "false"
            && !display.classList.contains("is-layout-pending") && !display.classList.contains("is-viewer-layout-pending")
            && document.documentElement.scrollWidth <= window.innerWidth
            && rect.left >= -1 && rect.right <= window.innerWidth + 1;
        }), { timeout: 3000 }).toBe(true);
        const resized = await readJourneyCheckpoint(viewer.page, eventId, viewer.id, "parked-after-390px-resize");
        expect(resized.protectedOverlaps).toEqual([]);
        checkpoints.push(resized);
        await assertJourneyUsesActorAnchor(viewer.page, viewer.player, actor, resized);
      }
    }
    await thirdPage.screenshot({ path: testInfo.outputPath("l5-lust-history-390x844-late-view.png") });
    const settlementViewports = [
      { width: 390, height: 700 },
      { width: 390, height: 844 },
      { width: 440, height: 894 },
      { width: 440, height: 956 },
    ];
    await Promise.all(viewers.map(({ page: viewerPage }, index) => viewerPage.setViewportSize(settlementViewports[index])));
    await Promise.all(viewers.map(({ page: viewerPage }) => installLustSettlementPaintTrace(viewerPage)));
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
    expect(settledRoom.currentAction.kind).toBe("trigger");
    expect(settledRoom.currentAction.actorId).toBe(first.id);
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
    const terminalCopy = settledDisplay.locator("[data-public-card-announcement='true']");
    try {
      await firstPage.waitForFunction(() => window.__lustSettlementPaintTrace?.trace.firstVisibleAt !== null, null, { timeout: 5000 });
    } catch (error) {
      const noPaintDiagnostics = await firstPage.evaluate((eventId) => {
        const display = document.querySelector(`.public-card-display[data-public-card-settlement-event-id="${eventId}"]`);
        const element = display?.querySelector("[data-public-card-announcement='true']") ?? null;
        const rect = (node) => {
          if (!node) return null;
          const value = node.getBoundingClientRect();
          const style = getComputedStyle(node);
          return { left: value.left, top: value.top, right: value.right, bottom: value.bottom,
            width: value.width, height: value.height, display: style.display, visibility: style.visibility, opacity: style.opacity };
        };
        if (!element || !display) return { present: false, settlementEventId: eventId };
        return {
          text: element.querySelector("b")?.textContent?.trim(),
          accessibleLabel: element.querySelector("b")?.getAttribute("aria-label"),
          copyRect: rect(element),
          copyAttributes: Object.fromEntries([...element.attributes].map(({ name, value }) => [name, value])),
          display: { ...rect(display), classes: display?.className, layoutPending: display?.getAttribute("data-public-card-layout-pending"), resultRemainingMs: display?.getAttribute("data-public-card-result-remaining-ms") },
          table: rect(document.querySelector(".play-table")),
          centerCards: [...document.querySelectorAll(".public-card-journey-card")].map((card) => ({
            eventId: card.getAttribute("data-public-card-journey-event-id"), actorId: card.getAttribute("data-public-card-journey-actor-id"),
            phase: card.getAttribute("data-public-card-journey-phase"), layoutPending: card.getAttribute("data-public-card-journey-layout-pending"),
            reason: card.getAttribute("data-public-card-journey-layout-reason"), actual: rect(card),
            target: { left: Number(card.getAttribute("data-public-card-journey-target-left")), top: Number(card.getAttribute("data-public-card-journey-target-top")),
              width: Number(card.getAttribute("data-public-card-journey-target-width")), height: Number(card.getAttribute("data-public-card-journey-target-height")) },
          })),
          obstacles: [".public-activity-chip", ".local-player-dock", ".console-guidance", ".local-hand-rail"]
            .flatMap((selector) => [...document.querySelectorAll(selector)].map((node) => ({ selector, rect: rect(node) }))),
          paintTrace: window.__lustSettlementPaintTrace?.trace ?? null,
        };
      }, settlementNotice.eventId);
      console.log(`[L5 no visible terminal paint] ${JSON.stringify(noPaintDiagnostics)}`);
      await testInfo.attach("l5-terminal-no-paint-diagnostics.json", {
        body: JSON.stringify(noPaintDiagnostics, null, 2), contentType: "application/json",
      });
      throw error;
    }
    const terminalCopyDiagnostics = await terminalCopy.evaluate((element) => {
      const rectOf = (node) => {
        if (!node) return null;
        const rect = node.getBoundingClientRect();
        const style = getComputedStyle(node);
        return { selector: node.className || node.tagName, left: rect.left, top: rect.top, width: rect.width, height: rect.height,
          right: rect.right, bottom: rect.bottom, display: style.display, visibility: style.visibility, opacity: style.opacity };
      };
      const selectors = [".play-table", ".opponent-player-card", ".player-square", ".player-board-status", ".visible-countdown",
        ".stage-system-cluster", ".public-activity-chip", ".local-player-dock", ".local-hand-rail", ".console-guidance"];
      return {
        viewport: { width: innerWidth, height: innerHeight, clientWidth: document.documentElement.clientWidth, clientHeight: document.documentElement.clientHeight,
          visualViewport: window.visualViewport ? { width: visualViewport.width, height: visualViewport.height, offsetLeft: visualViewport.offsetLeft, offsetTop: visualViewport.offsetTop } : null },
        copy: { text: element.textContent?.trim(), ariaLabel: element.querySelector("b")?.getAttribute("aria-label"), rect: rectOf(element),
          attributes: Object.fromEntries([...element.attributes].map(({ name, value }) => [name, value])),
          font: getComputedStyle(element).font, lineHeight: getComputedStyle(element).lineHeight, scrollHeight: element.scrollHeight, clientHeight: element.clientHeight },
        display: rectOf(element.closest(".public-card-display")),
        layoutPending: element.closest(".public-card-display")?.dataset.publicCardLayoutPending ?? null,
        obstacles: [...selectors, "[data-public-card-copy-anchor-event-id]", ".private-draw-content"]
          .flatMap((selector) => [...document.querySelectorAll(selector)].map(rectOf).filter((rect) => rect && rect.width > 0 && rect.height > 0 && rect.visibility !== "hidden" && rect.display !== "none")),
        journeyCards: [...document.querySelectorAll(".public-card-journey-card")].map((node) => ({
          eventId: node.getAttribute("data-public-card-journey-event-id"), actorId: node.getAttribute("data-public-card-journey-actor-id"),
          phase: node.getAttribute("data-public-card-journey-phase"), layoutPending: node.classList.contains("is-layout-pending"),
          layoutReason: node.getAttribute("data-public-card-journey-layout-reason"), rect: rectOf(node),
          target: { left: node.dataset.publicCardJourneyTargetLeft, top: node.dataset.publicCardJourneyTargetTop,
            width: node.dataset.publicCardJourneyTargetWidth, height: node.dataset.publicCardJourneyTargetHeight },
        })),
        activity: rectOf(document.querySelector(".public-activity-chip")),
      };
    });
    console.log(`[L5 terminal announcement placement] ${JSON.stringify(terminalCopyDiagnostics)}`);
    await testInfo.attach("l5-terminal-announcement-placement-diagnostics.json", {
      body: JSON.stringify(terminalCopyDiagnostics, null, 2), contentType: "application/json",
    });
    await firstPage.screenshot({ path: testInfo.outputPath("l5-terminal-announcement-before-assertion.png") });
    const accessibleSettlementCopy = await terminalCopy.locator("b").getAttribute("aria-label");
    expect(accessibleSettlementCopy).toContain(`${first.name} failed to play Attack; 1 Duel damage from ${second.name} applies.`);
    await expect(firstPage.locator(`[data-effect-notice-event-id="${settlementNotice.eventId}"]`)).toHaveCount(0);
    await expect(settledDisplay.locator("[data-public-card-announcement='true']"))
      .toHaveAttribute("data-public-card-announcement-positioned", "true");
    expect(await settledDisplay.locator("[data-public-card-announcement='true']").getAttribute("data-public-card-announcement-fallback")).toBeNull();
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
      const accessibleViewerSettlementCopy = await viewerSettlementDisplay.locator("[data-public-card-announcement='true'] b").getAttribute("aria-label");
      expect(accessibleViewerSettlementCopy).toContain(`${first.name} failed to play Attack; 1 Duel damage from ${second.name} applies.`);
      await expect(viewer.page.locator(`[data-effect-notice-event-id="${settlementNotice.eventId}"]`)).toHaveCount(0);
    }

    // Capture the original viewers while their settlement displays are still
    // mounted. The later reconnect check intentionally waits past the server
    // read clock and therefore outlives these first-pass client presentations.
    await Promise.all(viewers.map(({ page: viewerPage }) => viewerPage.waitForFunction((eventId) => {
      const display = document.querySelector(`.public-card-display[data-public-card-settlement-event-id="${eventId}"]`);
      const announcement = display?.querySelector("[data-public-card-announcement='true']");
      return Boolean(announcement?.dataset.publicCardAnnouncementPositioned === "true"
        && getComputedStyle(announcement).visibility === "visible");
    }, settlementNotice.eventId, { timeout: 7000 })));
    expect(await page.locator('.public-card-display[data-public-card-motion="lust-duel"] [data-public-card-announcement="true"]')
      .getAttribute("data-public-card-announcement-width")).not.toBe("224");
    expect(await page.locator('.public-card-display[data-public-card-motion="lust-duel"] [data-public-card-announcement="true"]')
      .getAttribute("data-public-card-announcement-fallback")).toBeNull();
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

    const firstDockAfterDamage = firstPage.locator(`.local-player-dock[data-player-anchor="${first.id}"]`);
    const legacySkip = firstDockAfterDamage.locator('[data-action-slot="decline"] button');
    await expect(legacySkip).toHaveText("Skip");
    await expect(legacySkip).toBeEnabled();
    await firstPage.waitForFunction(() => window.__lustSettlementPaintTrace?.trace.firstVisibleAt !== null);
    const quickSkipStartedAt = Date.now();
    const legacySkipResponsePromise = firstPage.waitForResponse((response) => response.url() === `${API}/api/rooms`
      && response.request().method() === "POST"
      && response.request().postDataJSON()?.action === "decline_trigger");
    await legacySkip.click();
    const legacySkipResponse = await legacySkipResponsePromise;
    expect(legacySkipResponse.status()).toBe(200);
    const afterLegacySkip = (await legacySkipResponse.json()).room;
    expect(afterLegacySkip.presentationSnapshot.lustDuelExchange?.settlement?.eventId).toBe(settlementNotice.eventId);
    expect(afterLegacySkip.currentAction.actorId).toBe(owner.id);
    const quickSkipResponseMs = Date.now() - quickSkipStartedAt;
    const serverReadRemainingAfterSkipMs = afterLegacySkip.presentationSnapshot.lustDuelExchange?.settlement?.readRemainingMs;
    expect(quickSkipResponseMs).toBeLessThan(1500);
    expect(serverReadRemainingAfterSkipMs).toBeGreaterThan(0);

    // Reconnect after the server's original two-second read clock has expired.
    // The same authenticated viewer must get a fresh two-second reading window
    // from its own first visible paint, even though its room projection reports
    // no server-clock time remaining.
    const settleReadDeadline = settlementNotice.settledAt + 2_300;
    const waitForLateReconnect = Math.max(0, settleReadDeadline - Date.now());
    if (waitForLateReconnect > 0) await firstPage.waitForTimeout(waitForLateReconnect);
    const lateSettlementProjection = await projectedRoom(request, seed, third);
    expect(lateSettlementProjection.presentationSnapshot.lustDuelExchange?.settlement).toMatchObject({
      eventId: settlementNotice.eventId, outcome: "DAMAGE_APPLIED", readRemainingMs: 0,
    });
    expect(JSON.stringify(lateSettlementProjection)).not.toContain(privateCard.id);
    lateContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const lateSettlementPage = await lateContext.newPage();
    await installLustSettlementPaintTraceBeforeNavigation(lateSettlementPage);
    await openSkillViewer(lateSettlementPage, seed, third, { width: 390, height: 844 });
    await expect.poll(() => lateSettlementPage.evaluate(() => Boolean(window.__lustSettlementPaintTrace?.trace)))
      .toBe(true);
    const lateSettlementDisplay = lateSettlementPage.locator(`.public-card-display[data-public-card-motion="lust-duel"][data-public-card-settlement-event-id="${settlementNotice.eventId}"]`);
    const lateSettlementCopy = lateSettlementDisplay.locator("[data-public-card-announcement='true']");
    await expect(lateSettlementDisplay).toHaveCount(1);
    const lateSettlementAccessibleCopy = await lateSettlementCopy.locator("b").getAttribute("aria-label");
    expect(lateSettlementAccessibleCopy).toContain(`${first.name} failed to play Attack; 1 Duel damage from ${second.name} applies.`);
    await lateSettlementPage.waitForFunction(() => {
      const trace = window.__lustSettlementPaintTrace?.trace;
      return Boolean(trace && trace.firstVisibleAt !== null);
    }, null, { timeout: 5000 });
    await expect(lateSettlementDisplay).toHaveCount(0, { timeout: 5000 });
    const lateSettlementTrace = await lateSettlementPage.evaluate(() => {
      return window.__lustSettlementPaintTrace.trace;
    });
    const lateSettlementVisibleSpan = lateSettlementTrace.lastVisibleAt - lateSettlementTrace.firstVisibleAt;
    expect(lateSettlementVisibleSpan).toBeGreaterThanOrEqual(1800);
    expect(lateSettlementVisibleSpan).toBeLessThanOrEqual(2400);
    expect(lateSettlementTrace.maxHiddenGapMs).toBeLessThanOrEqual(200);
    expect(lateSettlementTrace.text).toMatch(/failed(?: to play)? Attack/);
    expect(lateSettlementTrace.rect.width).toBeGreaterThan(0);
    expect(lateSettlementTrace.rect.left).toBeGreaterThanOrEqual(0);
    expect(lateSettlementTrace.rect.right).toBeLessThanOrEqual(390);
    await expect(lateSettlementPage.locator(`[data-hand-card-id="${privateCard.id}"]`)).toHaveCount(0);
    await lateSettlementPage.screenshot({ path: testInfo.outputPath("l5-late-reconnect-settlement-390x844.png") });
    checkpoints.push({ checkpoint: "late-reconnect-settlement-visible-lifetime", viewerId: third.id,
      eventId: settlementNotice.eventId, firstVisibleUtc: lateSettlementTrace.firstVisibleUtc,
      firstPaintAfterSettledAtMs: Date.parse(lateSettlementTrace.firstVisibleUtc) - settlementNotice.settledAt,
      visibleSpanMs: Math.round(lateSettlementVisibleSpan), text: lateSettlementTrace.text,
      rect: lateSettlementTrace.rect, serverReadRemainingMs: lateSettlementProjection.presentationSnapshot.lustDuelExchange.settlement.readRemainingMs,
      interactionId: settlementNotice.interactionId, rootFrameId: settlementNotice.rootFrameId,
      responseCount: settlementNotice.responseCount, settledAt: settlementNotice.settledAt,
      quickSkipResponseMs, serverReadRemainingAfterSkipMs });

    for (const viewer of viewers) {
      const viewerSettlementDisplay = viewer.page.locator(`.public-card-display[data-public-card-motion="lust-duel"][data-public-card-settlement-event-id="${settlementNotice.eventId}"]`);
      await expect(viewerSettlementDisplay).toHaveCount(0, { timeout: 5000 });
      const trace = await viewer.page.evaluate(() => {
        return window.__lustSettlementPaintTrace.trace;
      });
      const visibleSpan = trace.lastVisibleAt - trace.firstVisibleAt;
      expect(visibleSpan).toBeGreaterThanOrEqual(1800);
      expect(visibleSpan).toBeLessThanOrEqual(2400);
      expect(trace.maxHiddenGapMs).toBeLessThanOrEqual(200);
      if (viewer.id === owner.id) {
        expect(trace.rect.width).toBeGreaterThan(224);
        expect(trace.rect.left).toBeGreaterThanOrEqual(0);
        expect(trace.rect.right).toBeLessThanOrEqual(390);
      }
      checkpoints.push({ checkpoint: "settlement-visible-lifetime", viewerId: viewer.id,
        eventId: settlementNotice.eventId, firstVisibleUtc: trace.firstVisibleUtc, visibleSpanMs: Math.round(visibleSpan),
        firstPaintAfterSettledAtMs: Date.parse(trace.firstVisibleUtc) - settlementNotice.settledAt,
        maxHiddenGapMs: Math.round(trace.maxHiddenGapMs), text: trace.text, rect: trace.rect,
        interactionId: settlementNotice.interactionId, rootFrameId: settlementNotice.rootFrameId,
        responseCount: settlementNotice.responseCount, settledAt: settlementNotice.settledAt,
        quickSkipResponseMs, serverReadRemainingAfterSkipMs });
    }
    await expect(settledDisplay).toHaveCount(0, { timeout: 1000 });
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
    if (thirdVideo) {
      const videoPath = await thirdVideo.path();
      try {
        await access(videoPath);
        await testInfo.attach("l5-lust-duel-fourth-viewer.webm", { path: videoPath, contentType: "video/webm" });
      } catch (error) {
        if (error?.code !== "ENOENT") console.warn("[L5] Unable to attach the fourth-viewer recording", error);
      }
    }
  }
});

test("L5: immediate Attack decline and Legacy Skip retain public result in four mobile views", async ({ page, browser, request }, testInfo) => {
  const cost = card("Dodge", "l5-immediate-decline-cost");
  const privateCard = card("Peach", "l5-immediate-decline-private", "♥");
  const seed = await seedSkillRoom(request, {
    hero: "diao-chan", hand: [cost, privateCard],
    targets: [
      { name: "FIRST PLAYER WITH A LONG NAME 测试甲", role: "Loyalist", hero: "guo-jia", hp: 4, maxHp: 4, hand: [] },
      { name: "玩家姓名特别特别特别长测试乙", role: "Rebel", hero: "cao-cao", hp: 4, maxHp: 4, hand: [] },
    ],
  });
  const owner = seed.players[0];
  const first = seed.players[1];
  const second = seed.players[2];
  const third = seed.players[3];
  const viewports = [
    { width: 390, height: 700 },
    { width: 390, height: 844 },
    { width: 440, height: 894 },
    { width: 440, height: 956 },
  ];
  const contexts = await Promise.all(viewports.slice(1).map((viewport) => browser.newContext({ viewport })));
  const pages = [page, ...await Promise.all(contexts.map((context) => context.newPage()))];
  const viewers = [owner, first, second, third].map((player, index) => ({ player, page: pages[index], viewport: viewports[index] }));
  const runtimeErrors = [];

  try {
    await Promise.all(viewers.map(async ({ player, page: viewerPage, viewport }, index) => {
      await installLustSettlementPaintTraceBeforeNavigation(viewerPage);
      if (index === 0) await openSkillUser(viewerPage, seed, viewport);
      else await openSkillViewer(viewerPage, seed, player, viewport);
      viewerPage.on("pageerror", (error) => runtimeErrors.push({ viewerId: player.id, message: error.message }));
    }));
    const started = await completeSkillSelection({ page, request, seed, skillName: "Lust", providerId: "diao_chan_lust", cardIds: [cost.id], targetIndexes: [1, 2] });
    const activation = started.room.presentationSnapshot.diaoChanSkillNotices.find((notice) => notice.notice === "ACTIVATION");
    const costEvent = started.room.timeline.find((event) => event.id === activation.costEventId);
    const initialExchange = started.room.presentationSnapshot.lustDuelExchange;
    expect(initialExchange).toMatchObject({ semantics: "PROVEN", responseCount: 0, currentParticipantId: first.id, decisionActorId: first.id });
    expect(started.room.currentAction.actorId).toBe(first.id);
    const firstDock = firstPageFor(viewers, first);
    const attackSkip = firstDock.locator('[data-action-slot="decline"] button');
    await expect(attackSkip).toHaveText("Skip");
    await expect(attackSkip).toBeEnabled();

    const declineStartedAt = Date.now();
    const declinePromise = firstPageFor(viewers, first).waitForResponse((response) => response.url() === `${API}/api/rooms`
      && response.request().method() === "POST" && response.request().postDataJSON()?.action === "decline_response");
    await attackSkip.click();
    const declined = await declinePromise;
    const declineResponseMs = Date.now() - declineStartedAt;
    expect(declined.status()).toBe(200);
    const declinedRoom = (await declined.json()).room;
    expect(declinedRoom.presentationSnapshot.lustDuelExchange?.settlement?.outcome).toBe("DAMAGE_APPLIED");
    expect(declinedRoom.presentationSnapshot.lustDuelExchange?.settlement?.failedPlayerId).toBe(first.id);
    expect(declinedRoom.currentAction).toMatchObject({ kind: "trigger", actorId: first.id });
    const settlement = declinedRoom.presentationSnapshot.lustDuelExchange.settlement;
    const settlementNotice = declinedRoom.presentationSnapshot.diaoChanSkillNotices.find((notice) => notice.notice === "DUEL_RESULT");
    expect(settlementNotice?.eventId).toBe(settlement.eventId);
    expect(settlementNotice?.responseCount).toBe(0);
    expect(settlementNotice.interactionId).toBe(initialExchange.interactionId);

    const legacySkip = firstDock.locator('[data-action-slot="decline"] button');
    await expect(legacySkip).toHaveText("Skip");
    await expect(legacySkip).toBeEnabled();
    const quickSkipStartedAt = Date.now();
    const quickSkipPromise = firstPageFor(viewers, first).waitForResponse((response) => response.url() === `${API}/api/rooms`
      && response.request().method() === "POST" && response.request().postDataJSON()?.action === "decline_trigger");
    await legacySkip.click();
    const quickSkip = await quickSkipPromise;
    const quickSkipResponseMs = Date.now() - quickSkipStartedAt;
    expect(quickSkip.status()).toBe(200);
    const afterQuickSkip = (await quickSkip.json()).room;
    const serverReadRemainingAfterSkipMs = afterQuickSkip.presentationSnapshot.lustDuelExchange?.settlement?.readRemainingMs;
    expect(afterQuickSkip.presentationSnapshot.lustDuelExchange?.settlement?.eventId).toBe(settlement.eventId);
    expect(afterQuickSkip.currentAction.actorId).toBe(owner.id);
    expect(declineResponseMs).toBeLessThan(1500);
    expect(quickSkipResponseMs).toBeLessThan(1500);
    expect(serverReadRemainingAfterSkipMs).toBeGreaterThan(0);

    const publicViews = await Promise.all(viewers.map(({ player }) => projectedRoom(request, seed, player)));
    const sharedExchange = publicViews[0].presentationSnapshot.lustDuelExchange;
    const normalizeExchange = (exchange) => {
      const normalized = structuredClone(exchange);
      if (normalized?.settlement) delete normalized.settlement.readRemainingMs;
      return normalized;
    };
    for (const [index, { player, page: viewerPage, viewport }] of viewers.entries()) {
      const projection = publicViews[index];
      expect(normalizeExchange(projection.presentationSnapshot.lustDuelExchange)).toEqual(normalizeExchange(sharedExchange));
      if (player.id === owner.id) {
        await expect(viewerPage.locator(`[data-hand-card-id="${privateCard.id}"]`)).toHaveCount(1);
      } else {
        expect(JSON.stringify(projection)).not.toContain(privateCard.id);
        await expect(viewerPage.locator(`[data-hand-card-id="${privateCard.id}"]`)).toHaveCount(0);
      }
      const display = viewerPage.locator(`.public-card-display[data-public-card-motion="lust-duel"][data-public-card-settlement-event-id="${settlement.eventId}"]`);
      const copy = display.locator("[data-public-card-announcement='true']");
      await expect(display).toHaveCount(1);
      await expect(copy).toHaveAttribute("data-public-card-announcement-positioned", "true");
      await expect(copy.locator("b")).toHaveAttribute("aria-label",
        `${first.name} failed to play Attack; 1 Duel damage from ${second.name} applies.`);
      await expect(copy).toContainText(
        `Duel: ${compactLustResultPlayerName(first.name)} failed Attack; 1 damage from ${compactLustResultPlayerName(second.name)}.`);
      await viewerPage.waitForFunction(() => window.__lustSettlementPaintTrace?.trace.firstVisibleAt !== null, null, { timeout: 5000 });
      await viewerPage.screenshot({ path: testInfo.outputPath(`l5-immediate-decline-result-${viewport.width}x${viewport.height}.png`) });
    }

    const visibleResults = await Promise.all(viewers.map(async ({ player, page: viewerPage, viewport }) => {
      const display = viewerPage.locator(`.public-card-display[data-public-card-motion="lust-duel"][data-public-card-settlement-event-id="${settlement.eventId}"]`);
      await expect(display).toHaveCount(0, { timeout: 5000 });
      const trace = await viewerPage.evaluate(() => window.__lustSettlementPaintTrace.trace);
      const visibleSpanMs = trace.lastVisibleAt - trace.firstVisibleAt;
      expect(visibleSpanMs).toBeGreaterThanOrEqual(1800);
      expect(visibleSpanMs).toBeLessThanOrEqual(2400);
      expect(trace.maxHiddenGapMs).toBeLessThanOrEqual(200);
      expect(trace.rect.left).toBeGreaterThanOrEqual(0);
      expect(trace.rect.right).toBeLessThanOrEqual(viewport.width);
      expect(trace.rect.top).toBeGreaterThanOrEqual(0);
      expect(trace.rect.bottom).toBeLessThanOrEqual(viewport.height);
      return {
        viewerId: player.id, viewport, eventId: settlement.eventId,
        interactionId: initialExchange.interactionId, rootFrameId: initialExchange.rootFrameId,
        responseCount: settlementNotice.responseCount, settledAt: settlement.settledAt,
        firstVisibleUtc: trace.firstVisibleUtc,
        firstPaintAfterSettledAtMs: Date.parse(trace.firstVisibleUtc) - settlement.settledAt,
        visibleSpanMs: Math.round(visibleSpanMs), maxHiddenGapMs: Math.round(trace.maxHiddenGapMs),
        serverReadRemainingAfterSkipMs, declineResponseMs, quickSkipResponseMs, text: trace.text, rect: trace.rect,
      };
    }));
    expect(runtimeErrors).toEqual([]);
    const paintEvidence = JSON.stringify({ costEventId: costEvent.id, settlement: settlementNotice, viewers: visibleResults }, null, 2);
    await testInfo.attach("l5-immediate-decline-four-viewer-paint.json", {
      body: paintEvidence,
      contentType: "application/json",
    });
    await writeFile(testInfo.outputPath("l5-immediate-decline-four-viewer-paint.json"), paintEvidence, "utf8");
  } finally {
    await Promise.all(contexts.map((context) => context.close()));
  }
});

function firstPageFor(viewers, player) {
  const viewer = viewers.find((entry) => entry.player.id === player.id);
  if (!viewer) throw new Error(`No viewer page for ${player.id}`);
  return viewer.page;
}

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

test("real Lust guidance fits long names at 390px and stays local before Confirm", async ({ page, request, browser }, testInfo) => {
  const cost = card("Dodge", "real-lust-toggle-cost");
  const seed = await seedSkillRoom(request, {
    hero: "diao-chan", hand: [cost],
    targets: [
      { name: "TEST PLAYER THREE WITH LONG NAME", role: "Loyalist", hero: "liu-bei", hp: 4, maxHp: 4, hand: [] },
      { name: "TEST PLAYER FOUR WITH LONG NAME", role: "Rebel", hero: "cao-cao", hp: 4, maxHp: 4, hand: [] },
    ],
  });
  const user = await openSkillUser(page, seed);

  const dock = page.locator(`.local-player-dock[data-player-anchor="${user.id}"]`);
  const skill = dock.locator(".local-hero-skills").getByRole("button", { name: "Lust", exact: true });
  const guidance = dock.locator(".decision-status");
  const confirm = dock.locator('[data-action-slot="primary"] button.primary');
  const costButton = dock.locator(`[data-hand-card-id="${cost.id}"] .game-card`);
  const firstName = "TEST PLAYER THREE WITH LONG NAME";
  const secondName = "TEST PLAYER FOUR WITH LONG NAME";
  const firstTarget = page.getByRole("button", { name: `Select ${firstName}`, exact: true });
  const secondTarget = page.getByRole("button", { name: `Select ${secondName}`, exact: true });
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
  await expect(order).toHaveText(`Attack order: ${firstName} first → ${secondName} second.`);
  await expect(page.locator(".console-guidance > small[role='status']")).toHaveCount(0);
  await expect(confirm).toBeEnabled();
  const geometry = await order.evaluate((element) => {
    const rect = (node) => {
      const { left, right, top, bottom, width, height } = node.getBoundingClientRect();
      return { left, right, top, bottom, width, height };
    };
    const statusRect = rect(element.closest(".decision-status"));
    const handRect = rect(document.querySelector(".local-hand-section"));
    const bounds = rect(element);
    const style = getComputedStyle(element);
    const visualLineCount = Math.round(bounds.height / Number.parseFloat(style.lineHeight));
    return {
      bounds,
      statusRect,
      handRect,
      fontSize: Number.parseFloat(style.fontSize),
      lineHeight: Number.parseFloat(style.lineHeight),
      lineCount: visualLineCount,
      clientWidth: element.clientWidth,
      scrollWidth: element.scrollWidth,
      text: element.textContent,
    };
  });
  await testInfo.attach("u13-c-long-names-390x844.png", { body: await page.screenshot(), contentType: "image/png" });
  expect(geometry.fontSize).toBeGreaterThanOrEqual(12);
  expect(geometry.lineHeight).toBeGreaterThanOrEqual(15.6);
  expect(geometry.lineCount).toBeGreaterThanOrEqual(2);
  expect(geometry.lineCount, JSON.stringify(geometry)).toBeLessThanOrEqual(3);
  expect(geometry.bounds.left).toBeGreaterThanOrEqual(geometry.statusRect.left - 1);
  expect(geometry.bounds.right).toBeLessThanOrEqual(geometry.statusRect.right + 1);
  expect(geometry.bounds.bottom).toBeLessThanOrEqual(geometry.handRect.top);
  expect(geometry.scrollWidth).toBeLessThanOrEqual(geometry.clientWidth + 1);
  const observerContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  try {
    const observerPage = await observerContext.newPage();
    await openSkillViewer(observerPage, seed, seed.players[3]);
    await expect(observerPage.locator("[data-testid='lust-order-guidance']")).toHaveCount(0);
    await expect(observerPage.locator(".decision-status")).not.toContainText("Attack order:");
    await expect(observerPage.locator(".decision-status")).not.toContainText(firstName);
    await expect(observerPage.locator(".decision-status")).not.toContainText(secondName);
  } finally {
    await observerContext.close();
  }

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
