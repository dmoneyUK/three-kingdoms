import { expect, test } from "@playwright/test";

const API = "http://127.0.0.1:3137";
const card = (kind, id, suit = "♠") => ({ id, kind, suit, rank: "7" });

async function seed(request) {
  const response = await request.post(`${API}/__test/seed-playing-game`, {
    data: {
      phase: "play",
      turnSeat: 0,
      deck: [card("Attack", "shared-negation-deck-attack"), card("Dodge", "shared-negation-deck-dodge")],
      players: [
        { name: "WINDOW SOURCE", role: "Lord", hero: "cao-cao", hp: 4, maxHp: 4, hand: [card("DrawTwo", "shared-negation-root")] },
        { name: "NEGATION HOLDER", role: "Loyalist", hero: "liu-bei", hp: 4, maxHp: 4, hand: [card("Negation", "shared-negation-private-card", "♦")] },
        { name: "PASS PLAYER", role: "Rebel", hero: "sun-quan", hp: 4, maxHp: 4, hand: [] },
        { name: "PUBLIC OBSERVER", role: "Renegade", hero: "simayi", hp: 4, maxHp: 4, hand: [] },
      ],
    },
  });
  if (!response.ok()) throw new Error(`Shared Negation room seed failed: ${await response.text()}`);
  return response.json();
}

async function openPlayer(page, seedData, index, width = 440, height = 894) {
  const member = seedData.players[index];
  await page.setViewportSize({ width, height });
  await page.addInitScript(({ code, token, name }) => {
    localStorage.setItem("three-realms-session", JSON.stringify({ code, token, name }));
  }, { code: seedData.code, token: member.token, name: member.name });
  await page.goto(`${API}/`);
  await expect(page.locator(".game-shell")).toBeVisible();
  return member;
}

async function view(request, seedData, index) {
  const response = await request.get(`${API}/api/rooms?code=${seedData.code}&token=${seedData.players[index].token}`);
  expect(response.ok()).toBeTruthy();
  return response.json();
}

async function adjustWindowClock(request, seedData, windowId, mode) {
  const adjusted = await request.post(`${API}/__test/negation-window-clock`, {
    data: { code: seedData.code, windowId, mode },
  });
  expect(adjusted.ok()).toBeTruthy();
  expect(await adjusted.json()).toEqual({ adjusted: true });
}

async function advanceExpiredWindow(request, seedData) {
  const advanced = await request.post(`${API}/api/rooms`, {
    data: { action: "advance_timers", code: seedData.code, token: seedData.players[0].token },
  });
  expect(advanced.ok()).toBeTruthy();
}

test("real shared Negation keeps intent private until expiry and renders only the committed card", async ({ page, browser, request }, testInfo) => {
  const seedData = await seed(request);
  const source = seedData.players[0];
  const holder = seedData.players[1];
  const passPlayer = seedData.players[2];
  const rootId = "shared-negation-root";
  const negationId = "shared-negation-private-card";
  const holderContext = await browser.newContext({ viewport: { width: 440, height: 894 } });
  let holderPage;

  try {
    // Keep the live-poll client in the foreground. A second Chromium page would
    // be background-throttled and would no longer model a separate device.
    await openPlayer(page, seedData, 2);

    let clientPollAction = null;
    let firstWindowId = "";
    page.on("response", (response) => {
      if (!response.url().includes(`/api/rooms?code=${seedData.code}`) || response.request().method() !== "GET") return;
      void response.json().then((payload) => {
        const polled = payload.room ?? payload;
        if (polled.currentAction?.negationWindowId === firstWindowId) clientPollAction = polled.currentAction;
      }).catch(() => undefined);
    });
    const declared = await request.post(`${API}/api/rooms`, {
      data: { action: "play_card", code: seedData.code, token: source.token, cardId: rootId },
    });
    expect(declared.ok()).toBeTruthy();
    const declaredRoom = (await declared.json()).room;
    firstWindowId = declaredRoom.currentAction.negationWindowId;
    expect(firstWindowId).toBeTruthy();
    expect(declaredRoom.currentAction.deadline - declaredRoom.responseCountdownVisibleAt).toBe(8_000);

    await expect.poll(() => clientPollAction, { timeout: 5_000 }).toMatchObject({ actorId: passPlayer.id, negationWindowId: firstWindowId, legalActions: ["decline_response"] });

    const rootEvent = declaredRoom.timeline.find((event) => event.type === "card" && event.card?.id === rootId);
    expect(rootEvent).toMatchObject({ type: "card", card: { id: rootId }, player: source.name });

    // This authenticated client loaded during the ordinary Play Phase and has
    // not refreshed. It must discover its private Pass inside the live window.
    const livePassButton = page.getByRole("button", { name: "Pass", exact: true });
    try {
      await expect(livePassButton).toBeEnabled({ timeout: 4_000 });
    } catch (error) {
      const diagnostic = await page.evaluate(() => ({
        passButton: document.querySelector('[data-action-slot="decline"] button')?.outerHTML ?? null,
        guidance: document.querySelector(".console-guidance .decision-status")?.outerHTML ?? null,
        dock: document.querySelector(".local-player-dock")?.innerText ?? null,
      }));
      throw new Error(`Live shared Negation controls stayed disabled: ${JSON.stringify(diagnostic)}; ${String(error)}`);
    }

    await adjustWindowClock(request, seedData, firstWindowId, "hold");
    await page.reload();
    await expect(page.locator(".game-shell")).toBeVisible();

    holderPage = await holderContext.newPage();
    await openPlayer(holderPage, seedData, 1);
    const holderDock = holderPage.locator(`.local-player-dock[data-player-anchor="${holder.id}"]`);
    const holderCostCard = holderDock.locator(`[data-hand-card-id="${negationId}"] .game-card`);

    // The server opens the legal shared window immediately; a refresh while
    // that window remains open must expose each viewer's controls without
    // waiting for a visual card reveal.
    await expect(page.getByRole("button", { name: "Pass", exact: true })).toBeEnabled();
    await expect(holderCostCard).toBeEnabled();

    const holderBefore = await view(request, seedData, 1);
    const passBefore = await view(request, seedData, 2);
    expect(holderBefore.currentAction).toMatchObject({ actorId: holder.id, negationWindowId: firstWindowId });
    expect(holderBefore.currentAction.presentation?.readyAfterEventId).toBeTruthy();
    expect(holderBefore.currentAction.options).toContainEqual(expect.objectContaining({
      providerId: "negation_card",
      selection: expect.objectContaining({ eligibleCardIds: [negationId] }),
    }));
    expect(passBefore.currentAction).toMatchObject({ actorId: passPlayer.id, negationWindowId: firstWindowId, legalActions: ["decline_response"] });
    expect(passBefore.currentAction.presentation?.readyAfterEventId).toBeTruthy();
    expect(passBefore.currentAction.options).toEqual([]);

    const localGuidance = page.locator(".console-guidance .decision-status");
    await expect(localGuidance.locator("strong")).toHaveText("No Negation available. Pass.");
    await expect(page.getByRole("button", { name: "Pass", exact: true })).toBeEnabled();
    const publicStageText = (await page.locator('.interaction-stage[data-stage="NEGATION"]').allTextContents()).join(" ");
    expect(publicStageText).not.toContain("No Negation available. Pass.");
    await expect(page.locator(`[data-public-card-display="true"][data-public-card-id="${negationId}"]`)).toHaveCount(0);

    const passSubmission = page.waitForResponse((response) => response.url() === `${API}/api/rooms`
      && response.request().method() === "POST"
      && response.request().postDataJSON()?.action === "decline_response");
    await page.getByRole("button", { name: "Pass", exact: true }).click();
    const passResponse = await passSubmission;
    expect(passResponse.ok()).toBeTruthy();
    expect(passResponse.request().postDataJSON()).toMatchObject({ action: "decline_response", code: seedData.code, token: passPlayer.token });
    await expect(localGuidance.locator("small")).toHaveText("WAITING FOR OTHERS");
    const passAfter = await view(request, seedData, 2);
    expect(passAfter.pendingNegation.submitted).toBe(true);
    expect(passAfter.currentAction.options ?? []).toEqual([]);

    const negationCard = holderCostCard;
    await expect(negationCard).toBeEnabled();
    const confirm = holderDock.locator('[data-action-slot="primary"] button.primary');
    await negationCard.click();
    await expect(confirm).toHaveText("Confirm");
    await expect(confirm).toBeEnabled();

    const negationSubmission = holderPage.waitForResponse((response) => response.url() === `${API}/api/rooms`
      && response.request().method() === "POST"
      && response.request().postDataJSON()?.action === "respond"
      && response.request().postDataJSON()?.providerId === "negation_card");
    await confirm.click();
    const negationResponse = await negationSubmission;
    expect(negationResponse.ok()).toBeTruthy();
    expect(negationResponse.request().postDataJSON()).toMatchObject({
      action: "respond",
      code: seedData.code,
      token: holder.token,
      providerId: "negation_card",
      cardId: negationId,
    });

    const holderSubmitted = await view(request, seedData, 1);
    const observerSubmitted = await view(request, seedData, 3);
    expect(holderSubmitted.pendingNegation.submitted).toBe(true);
    expect(holderSubmitted.myHand.some((held) => held.id === negationId)).toBe(true);
    expect(holderSubmitted.timeline.some((event) => event.card?.id === negationId)).toBe(false);
    expect(observerSubmitted.pendingNegation.submitted).toBe(false);
    expect(JSON.stringify(observerSubmitted)).not.toContain(negationId);
    await expect(holderPage.locator(`[data-public-card-display="true"][data-public-card-id="${negationId}"]`)).toHaveCount(0);
    await expect(holderPage.locator('[data-action-slot="primary"] button, [data-action-slot="decline"] button')).toHaveCount(0);

    // Expire only the root window first so the committed Negation is checked while
    // its public reveal is active, before the separate counter window settles.
    await adjustWindowClock(request, seedData, firstWindowId, "expire");
    await advanceExpiredWindow(request, seedData);
    let counterWindow = await view(request, seedData, 3);
    const counterWindowId = counterWindow.currentAction?.negationWindowId;
    expect(counterWindowId).toBeTruthy();
    await adjustWindowClock(request, seedData, counterWindowId, "hold");
    const winningEvents = counterWindow.timeline.filter((event) => event.type === "card" && event.card?.id === negationId);
    expect(winningEvents).toHaveLength(1);
    expect(winningEvents[0].player).toBe(holder.name);
    await expect(page.locator(`[data-public-card-display="true"][data-public-card-id="${negationId}"]`)).toHaveCount(1);

    for (const { width, height } of [
      { width: 390, height: 844 },
      { width: 440, height: 894 },
      { width: 480, height: 900 },
      { width: 1440, height: 900 },
    ]) {
      await page.setViewportSize({ width, height });
      await expect(page.locator(`[data-public-card-display="true"][data-public-card-id="${negationId}"]`)).toBeVisible();
      const geometry = await page.evaluate(() => ({ viewport: window.innerWidth, document: document.documentElement.scrollWidth }));
      expect(geometry.document).toBeLessThanOrEqual(geometry.viewport);
      await testInfo.attach(`shared-negation-${width}x${height}`, {
        body: await page.screenshot({ fullPage: true }),
        contentType: "image/png",
      });
    }

    // Complete the counter window only after proving the committed-card display.
    await adjustWindowClock(request, seedData, counterWindowId, "expire");
    await advanceExpiredWindow(request, seedData);
    counterWindow = await view(request, seedData, 3);
    expect(counterWindow.currentAction?.negationWindowId).toBeFalsy();
    expect(counterWindow.pendingNegation).toBeNull();
    const finalWinningEvents = counterWindow.timeline.filter((event) => event.type === "card" && event.card?.id === negationId);
    expect(finalWinningEvents).toHaveLength(1);
    expect((await view(request, seedData, 1)).myHand.some((held) => held.id === negationId)).toBe(false);
  } finally {
    await holderContext.close();
  }
});

test("Negation selection, Confirm, and Pass stay usable through the live root reveal", async ({ page, browser, request }, testInfo) => {
  const seedData = await seed(request);
  const source = seedData.players[0];
  const holder = seedData.players[1];
  const passPlayer = seedData.players[2];
  const rootId = "shared-negation-root";
  const negationId = "shared-negation-private-card";
  const holderContext = await browser.newContext({ viewport: { width: 440, height: 894 } });

  try {
    // Both authenticated clients are mounted before the action, so neither can
    // treat the root as pre-existing history instead of a live visual reveal.
    await openPlayer(page, seedData, 2);
    const holderPage = await holderContext.newPage();
    await openPlayer(holderPage, seedData, 1);
    const rootRevealObserved = holderPage.waitForFunction((cardId) => {
      const card = document.querySelector(`[data-public-card-journey-card-id="${cardId}"]`);
      return card?.getAttribute("data-public-card-journey-phase") === "reveal" ? performance.now() : null;
    }, rootId, { polling: "raf", timeout: 20_000 }).then(async (handle) => {
      try { return await handle.jsonValue(); } finally { await handle.dispose(); }
    });
    const declaredResponse = await request.post(`${API}/api/rooms`, {
      data: { action: "play_card", code: seedData.code, token: source.token, cardId: rootId },
    });
    expect(declaredResponse.ok()).toBeTruthy();
    const declared = (await declaredResponse.json()).room;
    const windowId = declared.currentAction.negationWindowId;
    const openedAt = declared.responseCountdownVisibleAt;
    const deadline = declared.currentAction.deadline;
    expect(windowId).toBeTruthy();
    expect(deadline - openedAt).toBe(8_000);

    const revealObservedAt = await rootRevealObserved;
    const rootDisplay = holderPage.locator(`[data-public-card-display="true"][data-public-card-id="${rootId}"]`);
    const rootCard = rootDisplay.locator(`[data-public-card-journey-card-id="${rootId}"]`);
    await expect(rootDisplay).toBeVisible();
    await expect(rootCard).toHaveAttribute("data-public-card-journey-phase", "reveal");
    const holderDock = holderPage.locator(`.local-player-dock[data-player-anchor="${holder.id}"]`);
    const negationCard = holderDock.locator(`[data-hand-card-id="${negationId}"] .game-card`);
    const confirm = holderDock.locator('[data-action-slot="primary"] button.primary');
    const passButton = page.getByRole("button", { name: "Pass", exact: true });
    const samples = [];

    for (const elapsedMs of [200, 1_000, 2_000, 3_500]) {
      await holderPage.waitForFunction((targetTime) => performance.now() >= targetTime, revealObservedAt + elapsedMs);
      await expect(rootCard).toHaveAttribute("data-public-card-journey-phase", "reveal");
      await expect(negationCard).toBeEnabled();
      const passEnabled = await passButton.isEnabled();
      if (elapsedMs === 200) {
        await negationCard.click();
        await expect(negationCard).toHaveClass(/selected/);
        await expect(confirm).toBeEnabled();
      }
      const sample = await holderPage.evaluate(() => {
        const shell = document.querySelector(".game-shell");
        const status = document.querySelector(".console-guidance .decision-status");
        const root = document.querySelector('[data-public-card-journey-card-id="shared-negation-root"]');
        const confirmButton = document.querySelector('.local-player-dock [data-action-slot="primary"] button.primary');
        if (!shell || !status || !root || !(root instanceof HTMLElement) || !(confirmButton instanceof HTMLButtonElement)) return null;
        const rect = root.getBoundingClientRect();
        return {
          responsePresentationReady: status.getAttribute("data-console-response-presentation-ready"),
          presentationBusy: status.getAttribute("data-console-presentation-busy"),
          activeSkillSelectionBusy: status.getAttribute("data-console-active-skill-selection-busy"),
          networkBusy: status.getAttribute("data-console-network-busy"),
          negationWindow: status.getAttribute("data-console-negation-window"),
          primaryEnabled: status.getAttribute("data-console-primary-enabled"),
          confirmDisabled: confirmButton.disabled,
          rootPhase: root.dataset.publicCardJourneyPhase,
          rootRect: { left: rect.left, top: rect.top, width: rect.width, height: rect.height },
        };
      });
      const actionView = elapsedMs === 200 ? await view(request, seedData, 1) : null;
      const currentSample = {
        elapsedFromRevealObservationMs: Math.round(await holderPage.evaluate((startAt) => performance.now() - startAt, revealObservedAt)),
        elapsedFromWindowOpenMs: Date.now() - openedAt,
        actionRevision: actionView?.actionRevision ?? samples[0]?.actionRevision,
        windowId: actionView?.currentAction.negationWindowId ?? samples[0]?.windowId,
        deadline: actionView?.currentAction.deadline ?? samples[0]?.deadline,
        passEnabled,
        ...sample,
      };
      if (actionView) {
        expect(actionView.currentAction).toMatchObject({ actorId: holder.id, negationWindowId: windowId });
        expect(actionView.currentAction.options).toContainEqual(expect.objectContaining({
          providerId: "negation_card",
          selection: expect.objectContaining({ eligibleCardIds: [negationId] }),
        }));
        expect(actionView.actionRevision).toBeTruthy();
        const passView = await view(request, seedData, 2);
        expect(passView.currentAction).toMatchObject({ actorId: passPlayer.id, negationWindowId: windowId, legalActions: ["decline_response"] });
        currentSample.passActionRevision = passView.actionRevision;
      }
      samples.push(currentSample);
      expect(sample, `missing live Negation reveal diagnostics at ${elapsedMs}ms`).not.toBeNull();
      expect(sample, `Negation controls failed during the root reveal at ${elapsedMs}ms: ${JSON.stringify(currentSample)}`).toMatchObject({
        responsePresentationReady: "true",
        presentationBusy: "true",
        activeSkillSelectionBusy: "false",
        networkBusy: "false",
        negationWindow: "true",
        primaryEnabled: "true",
        confirmDisabled: false,
        rootPhase: "reveal",
      });
      expect(passEnabled, `Pass is disabled during the root reveal at ${elapsedMs}ms: ${JSON.stringify(currentSample)}`).toBe(true);
      expect(currentSample.windowId).toBe(windowId);
      expect(currentSample.deadline).toBe(deadline);

      if (elapsedMs === 3_500) {
        const confirmStartedAt = Date.now();
        const confirmation = holderPage.waitForResponse((response) => response.url() === `${API}/api/rooms`
          && response.request().method() === "POST"
          && response.request().postDataJSON()?.action === "respond"
          && response.request().postDataJSON()?.providerId === "negation_card");
        await confirm.click();
        const response = await confirmation;
        currentSample.confirmElapsedFromWindowOpenMs = confirmStartedAt - openedAt;
        currentSample.confirmResponseElapsedMs = Date.now() - confirmStartedAt;
        expect(response.ok()).toBeTruthy();
        expect(response.request().postDataJSON()).toMatchObject({ action: "respond", token: holder.token, providerId: "negation_card", cardId: negationId });
      }
    }

    const passStartedAt = Date.now();
    const passSubmission = page.waitForResponse((response) => response.url() === `${API}/api/rooms`
      && response.request().method() === "POST"
      && response.request().postDataJSON()?.action === "decline_response");
    await passButton.click();
    const passResponse = await passSubmission;
    expect(passResponse.ok()).toBeTruthy();
    expect(passResponse.request().postDataJSON()).toMatchObject({ action: "decline_response", token: passPlayer.token });
    samples.push({ passElapsedFromWindowOpenMs: passStartedAt - openedAt, passResponseElapsedMs: Date.now() - passStartedAt });

    const holderSubmitted = await view(request, seedData, 1);
    const passSubmitted = await view(request, seedData, 2);
    const observerView = await view(request, seedData, 3);
    expect(holderSubmitted.pendingNegation.submitted).toBe(true);
    expect(holderSubmitted.myHand.some((held) => held.id === negationId)).toBe(true);
    expect(passSubmitted.pendingNegation.submitted).toBe(true);
    expect(observerView.pendingNegation.submitted).toBe(false);
    expect(JSON.stringify(observerView)).not.toContain(negationId);
    expect(observerView.currentAction.negationWindowId).toBe(windowId);
    await testInfo.attach("negation-live-reveal-control-timing.json", {
      body: JSON.stringify({ openedAt, deadline, windowId, actionRevision: samples[0]?.actionRevision, samples }, null, 2),
      contentType: "application/json",
    });
  } finally {
    await holderContext.close();
  }
});
