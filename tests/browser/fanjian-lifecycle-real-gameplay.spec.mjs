import { expect, test } from "@playwright/test";

const API = "http://127.0.0.1:3137";

test("real Fanjian reveal lifecycle records public animation and geometry", async ({ page, request }, testInfo) => {
  test.setTimeout(20_000);
  const physicalCardId = "fanjian-lifecycle-j-club";
  const seeded = await request.post(`${API}/__test/seed-playing-game`, { data: {
    phase: "play", turnSeat: 0, testController: true, players: [
      { name: "TEST PLAYER 2", role: "Lord", hero: "zhou-yu", hp: 4, maxHp: 4, hand: [
        { id: physicalCardId, kind: "Attack", rank: "J", suit: "♣" },
        { id: "fanjian-lifecycle-spare", kind: "Dodge", rank: "2", suit: "♥" },
      ] },
      { name: "TEST PLAYER 4", role: "Loyalist", hero: "simayi", hp: 3, maxHp: 3, hand: [] },
      { name: "THIRD", role: "Rebel", hero: "sun-quan", hp: 4, maxHp: 4, hand: [] },
      { name: "OBSERVER", role: "Renegade", hero: "liu-bei", hp: 4, maxHp: 4, hand: [] },
    ],
  } });
  expect(seeded.ok()).toBeTruthy();
  const room = await seeded.json();
  room.players.sort((a, b) => a.seat - b.seat);
  await page.setViewportSize(process.env.FANJIAN_SHORT === "1" ? { width: 390, height: 700 } : { width: 440, height: 766 });
  await page.addInitScript(({ code, token, name, recipientId }) => {
    localStorage.setItem("three-realms-session", JSON.stringify({ code, token, name }));
    sessionStorage.setItem("wtk.game-ux-trace.active.v2", "true");
    sessionStorage.setItem("wtk.game-ux-trace.document.v2", JSON.stringify({ schema: "wtk-game-ux-trace", version: 2, startedAt: new Date().toISOString(), traceId: "fanjian-lifecycle-test", environment: { buildSha: "test", userAgent: navigator.userAgent, viewport: { width: 440, height: 766, devicePixelRatio: 1 }, visualViewport: null, reducedMotion: false }, activeSession: null, droppedEntryCount: 0, entries: [] }));
    window.__fanjianLifecycle = [];
    window.__fanjianH4Frames = [];
    const record = (kind, node, extra = {}) => {
      if (!(node instanceof Element) || !node.matches(".public-hand-transfer")) return;
      const rect = (element) => {
        if (!element) return null;
        const r = element.getBoundingClientRect(); const s = getComputedStyle(element);
        return { x: r.x, y: r.y, width: r.width, height: r.height, visibility: s.visibility, display: s.display };
      };
      const destination = [...document.querySelectorAll("[data-card-origin-anchor]")].find((element) => element.getAttribute("data-card-origin-anchor") === recipientId)
        ?? [...document.querySelectorAll("[data-player-anchor]")].find((element) => element.getAttribute("data-player-anchor") === recipientId);
      window.__fanjianLifecycle.push({ t: performance.now(), kind, eventId: node.getAttribute("data-public-zone-transition-event-id"),
        cardId: node.getAttribute("data-public-zone-transition-card-id"), className: node.className,
        animations: node.getAnimations().map((a) => ({ name: a.animationName, state: a.playState, time: a.currentTime })),
        card: rect(node.querySelector(".played-card")), h4: rect(document.querySelector("[data-public-card-announcement-fixed-upper='true']")),
        pac: rect(document.querySelector("[data-public-activity-chip='true']")), destination: rect(destination),
        h4Text: document.querySelector("[data-public-card-announcement-fixed-upper='true']")?.textContent?.trim() ?? null,
        h4FixedTop: document.querySelector("[data-public-card-announcement-fixed-upper='true']")?.getAttribute("data-public-card-announcement-fixed-upper-top") ?? null, ...extra });
    };
    for (const type of ["animationstart", "animationcancel", "animationend"]) document.addEventListener(type, (event) => record(type, event.target, { name: event.animationName, elapsed: event.elapsedTime }), true);
    new MutationObserver((records) => records.forEach((mutation) => {
      if (mutation.type === "attributes") record("attribute:" + mutation.attributeName, mutation.target);
      for (const node of mutation.addedNodes) if (node instanceof Element) { record("mount", node); node.querySelectorAll(".public-hand-transfer").forEach((child) => record("mount", child)); }
      for (const node of mutation.removedNodes) if (node instanceof Element) { record("unmount", node); node.querySelectorAll(".public-hand-transfer").forEach((child) => record("unmount", child)); }
    })).observe(document, { subtree: true, childList: true, attributes: true, attributeFilter: ["class", "style"] });
    setInterval(() => {
      const transfer = document.querySelector(".public-hand-transfer"); if (transfer) record("sample", transfer);
      const h4 = document.querySelector("[data-public-card-announcement-fixed-upper='true']");
      const bounds = h4?.getBoundingClientRect(); const style = h4 ? getComputedStyle(h4) : null;
      const seats = [...document.querySelectorAll(".player-board > [data-player-anchor]")].map((element) => element.getBoundingClientRect()).filter((rect) => rect.width > 0 && rect.height > 0);
      const firstTop = Math.min(...seats.map((rect) => rect.top));
      const upperBottom = Math.max(...seats.filter((rect) => rect.top <= firstTop + 24).map((rect) => rect.bottom));
      const miniHeight = document.querySelector(".local-player-dock .local-equipment-slot")?.getBoundingClientRect().height ?? 0;
      window.__fanjianH4Frames.push({ t: performance.now(), text: h4?.textContent?.trim() ?? null, key: h4?.getAttribute("data-public-card-announcement-copy-key") ?? null, h4Top: bounds?.top ?? null, upperBottom, miniHeight, visible: Boolean(bounds && bounds.width && bounds.height && style?.display !== "none" && style?.visibility === "visible") });
    }, 100);
  }, { code: room.code, token: room.players[0].token, name: room.players[0].name, recipientId: room.players[1].id });
  await page.goto(`${API}/`);
  await expect(page.locator(".game-shell")).toBeVisible();
  await page.getByTestId(`test-view-switch-${room.players[3].id}`).click();
  await expect(page.locator(`.local-player-dock[data-player-anchor="${room.players[3].id}"]`)).toBeVisible();
  const before = await request.get(`${API}/api/rooms?code=${room.code}&token=${room.players[0].token}&testViewerId=${room.players[3].id}`);
  const observerBefore = await before.json();
  expect(JSON.stringify(observerBefore.timeline)).not.toContain(physicalCardId);
  expect(JSON.stringify(observerBefore.presentationSnapshot)).not.toContain(physicalCardId);
  const activate = await request.post(`${API}/api/rooms`, { data: { action: "trigger", code: room.code, token: room.players[0].token, providerId: "zhou_yu_fanjian", targetId: room.players[1].id } });
  expect(activate.ok(), await activate.text()).toBeTruthy();
  await page.getByTestId(`test-view-switch-${room.players[1].id}`).click();
  const stage = page.locator('[data-fanjian-combined-choice="true"]');
  await expect(stage).toBeVisible();
  await expect(stage).not.toContainText("J♣ Attack");
  const suits = stage.getByRole("group", { name: "Choose a suit" });
  const heart = suits.getByRole("button", { name: "Heart", exact: true });
  const spade = suits.getByRole("button", { name: "Spade", exact: true });
  const selectedStyle = (button) => button.evaluate((node) => ({ pressed: node.getAttribute("aria-pressed"), background: getComputedStyle(node).backgroundColor, border: getComputedStyle(node).borderTopWidth, marker: getComputedStyle(node, "::after").content.replace(/["']/g, "") }));
  await heart.click(); const red = await selectedStyle(heart);
  await spade.click(); const black = await selectedStyle(spade);
  expect(red).toEqual({ pressed: "true", background: "rgb(48, 36, 17)", border: "2px", marker: "✓" });
  expect(black).toEqual(red);
  await suits.getByRole("button", { name: "Diamond", exact: true }).click();
  await stage.getByRole("button", { name: "Choose hidden Hand position 1" }).click();
  const confirm = stage.getByRole("button", { name: "Confirm", exact: true });
  const confirmGeometry = await confirm.evaluate((node) => ({ hit: node.getBoundingClientRect().height, face: Number.parseFloat(getComputedStyle(node, "::before").height) }));
  expect(confirmGeometry).toEqual({ hit: 44, face: 30 });
  const choiceResponse = page.waitForResponse((response) => response.url() === `${API}/api/rooms` && response.request().method() === "POST" && response.request().postDataJSON()?.providerId === "zhou_yu_fanjian_choice");
  await confirm.click();
  const chosen = await choiceResponse;
  expect(chosen.ok(), await chosen.text()).toBeTruthy();
  const committed = await chosen.json();
  const reveal = committed.room.timeline.find((event) => event.type === "card" && event.action === "reveal" && event.card?.id === physicalCardId);
  expect(reveal).toBeTruthy();
  expect(reveal.publicZoneTransition.to).toEqual({ zone: "HAND", ownerId: room.players[1].id });
  expect(committed.room.myHand.map((card) => card.id)).toContain(physicalCardId);
  expect(committed.room.players.find((player) => player.id === room.players[1].id).hp).toBe(2);
  const targetViewResponse = await request.get(`${API}/api/rooms?code=${room.code}&token=${room.players[1].token}`);
  const targetView = await targetViewResponse.json();
  expect(targetView.currentAction.triggerOptions.map((option) => option.effectId)).toContain("sima_yi_fankui");
  await page.waitForTimeout(1000);
  await page.screenshot({ path: testInfo.outputPath("fanjian-reveal.png") });
  const skipped = await request.post(`${API}/api/rooms`, { data: { action: "decline_trigger", code: room.code, token: room.players[1].token } });
  expect(skipped.ok(), await skipped.text()).toBeTruthy();
  const switchDuring = process.env.FANJIAN_SWITCH_DURING === "1";
  if (!switchDuring) await expect(page.locator(".public-hand-transfer")).toHaveCount(0, { timeout: 8000 });
  await page.getByTestId(`test-view-switch-${room.players[3].id}`).click();
  await expect(page.locator(`.local-player-dock[data-player-anchor="${room.players[3].id}"]`)).toBeVisible();
  await page.getByTestId(`test-view-switch-${room.players[2].id}`).click();
  await expect(page.locator(`.local-player-dock[data-player-anchor="${room.players[2].id}"]`)).toBeVisible();
  await page.getByTestId(`test-view-switch-${room.players[3].id}`).click();
  await expect(page.locator(`.local-player-dock[data-player-anchor="${room.players[3].id}"]`)).toBeVisible();
  await expect(page.locator('[data-public-card-announcement-fixed-upper="true"]')).toContainText("revealed J♣ Attack");
  await page.waitForTimeout(switchDuring ? 4000 : 1600);
  console.log("FANJIAN_SWITCH_GEOMETRY", JSON.stringify(await page.evaluate(() => {
    const rect = (element) => { const r = element.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height, visibility: getComputedStyle(element).visibility }; };
    const h4 = document.querySelector("[data-public-card-announcement-fixed-upper='true']");
    return { h4: h4 ? { rect: rect(h4), dataset: { ...h4.dataset } } : null,
      seats: [...document.querySelectorAll(".player-board > [data-player-anchor]")].map((node) => ({ id: node.getAttribute("data-player-anchor"), rect: rect(node) })),
      journeys: [...document.querySelectorAll("[data-public-card-journey-event-id][data-public-card-journey-phase]")].map((node) => ({ dataset: { ...node.dataset }, rect: rect(node) })) };
  })));
  const lifecycle = await page.evaluate(() => window.__fanjianLifecycle);
  const h4Frames = await page.evaluate(() => window.__fanjianH4Frames);
  console.log("FANJIAN_H4_FRAMES", JSON.stringify(h4Frames));
  const traceEntries = await page.evaluate(() => JSON.parse(sessionStorage.getItem("wtk.game-ux-trace.document.v2")).entries);
  console.log("FANJIAN_H4_TRACE", JSON.stringify(traceEntries.filter((entry) => entry.stage === "h4-public-announcement-placement")));
  const matching = lifecycle.filter((entry) => entry.eventId === reveal.id);
  const changes = matching.filter((entry) => ["mount", "unmount", "animationstart", "animationcancel", "animationend"].includes(entry.kind));
  const samples = matching.filter((entry) => entry.kind === "sample");
  console.log("FANJIAN_LIFECYCLE", JSON.stringify({ revealId: reveal.id, physicalCardId, changes, samples }));
  expect(changes.filter((entry) => entry.kind === "mount")).toHaveLength(1);
  expect(changes.filter((entry) => entry.kind === "animationstart")).toHaveLength(1);
  expect(changes.filter((entry) => entry.kind === "animationend")).toHaveLength(switchDuring ? 0 : 1);
  if (!switchDuring) {
    expect(changes.filter((entry) => entry.kind === "animationcancel")).toHaveLength(0);
    const end = changes.find((entry) => entry.kind === "animationend");
    expect(end.destination).toBeTruthy();
    expect(Math.abs(end.card.x + end.card.width / 2 - (end.destination.x + end.destination.width / 2))).toBeLessThanOrEqual(3);
    expect(Math.abs(end.card.y + end.card.height / 2 - (end.destination.y + end.destination.height / 2))).toBeLessThanOrEqual(3);
  }
  const proofTrace = traceEntries.filter((entry) => entry.stage === "public-hand-reveal-lifecycle" && entry.data.eventId === reveal.id);
  expect(proofTrace.filter((entry) => entry.data.status === "completion-requested")).toHaveLength(1);
  expect(proofTrace.filter((entry) => entry.data.status === "retired")).toHaveLength(1);
  if (switchDuring) expect(proofTrace.filter((entry) => entry.data.status === "viewer-layout-interrupted")).toHaveLength(1);
  const finalStart = h4Frames.findIndex((entry) => entry.text?.includes("revealed J♣ Attack") && entry.text?.includes("takes 1 damage") && entry.visible);
  expect(finalStart).toBeGreaterThanOrEqual(0);
  const finalFrames = h4Frames.slice(finalStart);
  expect(finalFrames.at(-1).t - finalFrames[0].t).toBeGreaterThanOrEqual(3000);
  expect(finalFrames.every((entry) => entry.visible && entry.text?.includes("revealed J♣ Attack") && entry.text?.includes("takes 1 damage"))).toBeTruthy();
  expect(new Set(finalFrames.map((entry) => entry.key)).size).toBe(1);
  const shortPhone = process.env.FANJIAN_SHORT === "1";
  expect(finalFrames.every((entry) => entry.miniHeight > 0 && Math.abs(entry.h4Top - (entry.upperBottom + entry.miniHeight)) <= 2)).toBeTruthy();
  // Measure the held centre reveal, not a near-full-size easing frame on its way in/out.
  const centre = samples.filter((entry) => entry.card?.visibility === "visible" && entry.card.width >= (shortPhone ? 71 : 89) && entry.card.height >= (shortPhone ? 107 : 134) && entry.h4?.visibility === "visible" && entry.animations[0]?.time >= 1200 && entry.animations[0]?.time <= 3200);
  expect(centre.length).toBeGreaterThan(0);
  for (const entry of centre) {
    expect(entry.card.y - (entry.h4.y + entry.h4.height)).toBeGreaterThanOrEqual(3);
    expect(entry.card.y - (entry.h4.y + entry.h4.height)).toBeLessThanOrEqual(5);
    expect(entry.pac.y - (entry.card.y + entry.card.height)).toBeGreaterThanOrEqual(4);
  }
});
