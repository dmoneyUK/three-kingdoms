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
    await expect(localGuidance.locator("small")).toHaveText("RESPONSE SUBMITTED");
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
