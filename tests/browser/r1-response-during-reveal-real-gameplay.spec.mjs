import { expect, test } from "@playwright/test";

const API = "http://127.0.0.1:3137";
const card = (kind, id, suit = "♠") => ({ id, kind, suit, rank: "7" });

async function seedRoom(request, {
  suffix,
  defenderHero = "liu-bei",
  defenderHand = [card("Dodge", `${suffix}-dodge`, "♣")],
  attackerCard = card("Attack", `${suffix}-attack`),
} = {}) {
  const result = await request.post(`${API}/__test/seed-playing-game`, {
    data: {
      phase: "play",
      turnSeat: 0,
      players: [
        { name: `${suffix} ATTACKER`, role: "Lord", hero: "cao-cao", hp: 4, maxHp: 4, hand: [attackerCard] },
        { name: `${suffix} DEFENDER`, role: "Loyalist", hero: defenderHero, hp: 4, maxHp: 4, hand: defenderHand },
        { name: `${suffix} OBSERVER`, role: "Rebel", hero: "sun-quan", hp: 4, maxHp: 4, hand: [] },
        { name: `${suffix} FOURTH`, role: "Renegade", hero: "simayi", hp: 4, maxHp: 4, hand: [] },
      ],
    },
  });
  if (!result.ok()) throw new Error(`R1 room seed failed: ${await result.text()}`);
  return { ...(await result.json()), attackerCard, defenderHand };
}

async function openPlayer(page, room, index, width = 440) {
  const player = room.players[index];
  await page.setViewportSize({ width, height: width === 390 ? 844 : 894 });
  await page.addInitScript(({ code, token, name }) => {
    localStorage.setItem("three-realms-session", JSON.stringify({ code, token, name }));
  }, { code: room.code, token: player.token, name: player.name });
  await page.goto(`${API}/`);
  await expect(page.locator(".game-shell")).toBeVisible();
  return player;
}

async function watchCardPhases(page, cardIds) {
  await page.evaluate((watchedCardIds) => {
    const watched = new Set(watchedCardIds);
    const recorded = new Set();
    const pending = new Set();
    window.__r1CardPhases = [];
    const capture = () => {
      for (const element of document.querySelectorAll("[data-public-card-journey-card-id][data-public-card-journey-phase]")) {
        const cardId = element.getAttribute("data-public-card-journey-card-id");
        if (!watched.has(cardId)) continue;
        const phase = element.getAttribute("data-public-card-journey-phase");
        const key = `${cardId}:${phase}`;
        if (recorded.has(key) || pending.has(key)) continue;
        pending.add(key);
        const phaseObservedAt = performance.now();
        requestAnimationFrame((firstFrameAt) => requestAnimationFrame(() => {
          const current = document.querySelector(`[data-public-card-journey-card-id="${cardId}"]`);
          if (!current) {
            pending.delete(key);
            return;
          }
          const rect = current.getBoundingClientRect();
          recorded.add(key);
          pending.delete(key);
          window.__r1CardPhases.push({ cardId, phase, observedAt: phaseObservedAt, firstFrameAt, at: performance.now(), left: rect.left, top: rect.top, width: rect.width, height: rect.height });
        }));
      }
    };
    new MutationObserver(capture).observe(document.documentElement, {
      attributes: true, childList: true, subtree: true,
      attributeFilter: ["data-public-card-journey-phase"],
    });
    capture();
  }, cardIds);
}

async function playAttack(page, room, attacker, defender) {
  const dock = page.locator(`.local-player-dock[data-player-anchor="${attacker.id}"]`);
  await dock.locator(`[data-hand-card-id="${room.attackerCard.id}"] .game-card`).click();
  await page.getByRole("button", { name: `Select ${defender.name}`, exact: true }).click();
  const confirm = dock.locator('[data-console-surface="local-operation"] button.primary');
  await expect(confirm).toBeEnabled();
  const submitted = page.waitForResponse((response) => response.url() === `${API}/api/rooms`
    && response.request().method() === "POST"
    && response.request().postDataJSON()?.action === "play_card");
  await confirm.click();
  const accepted = await submitted;
  expect(accepted.ok()).toBeTruthy();
  expect(accepted.request().postDataJSON()).toMatchObject({
    action: "play_card", code: room.code, token: attacker.token,
    cardId: room.attackerCard.id, targetId: defender.id,
  });
}

async function getView(request, room, player) {
  const response = await request.get(`${API}/api/rooms?code=${room.code}&token=${player.token}`);
  expect(response.ok()).toBeTruthy();
  return response.json();
}

async function revealStart(page) {
  const root = page.locator('[data-public-card-journey-card-id][data-public-card-journey-phase="reveal"]').first();
  await expect(root).toBeVisible();
  await page.waitForFunction(() => window.__r1CardPhases?.some((entry) => entry.phase === "reveal"), null, { timeout: 2_000 });
  const start = await page.evaluate(() => window.__r1CardPhases.find((entry) => entry.phase === "reveal")?.at ?? null);
  expect(start).not.toBeNull();
  return { root, start };
}

async function diagnostics(page, rootId, responseCardId) {
  return page.evaluate(({ attackId, responseId }) => {
    const status = document.querySelector(".console-guidance .decision-status");
    const root = document.querySelector(`[data-public-card-journey-card-id="${attackId}"]`);
    const handCard = responseId ? document.querySelector(`[data-hand-card-id="${responseId}"] .game-card`) : null;
    const primary = document.querySelector('.local-player-dock [data-action-slot="primary"] button.primary');
    const decline = document.querySelector('.local-player-dock [data-action-slot="decline"] button');
    const rootRect = root?.getBoundingClientRect();
    return {
      sampledAtMsFromFirstReveal: Math.round(performance.now() - window.__r1CardPhases.find((entry) => entry.phase === "reveal").at),
      rootPhase: root?.getAttribute("data-public-card-journey-phase") ?? null,
      rootRect: rootRect ? { left: rootRect.left, top: rootRect.top, width: rootRect.width, height: rootRect.height } : null,
      responsePresentationReady: status?.getAttribute("data-console-response-presentation-ready") ?? null,
      responseDecisionReady: status?.getAttribute("data-console-response-decision-ready") ?? null,
      presentationBusy: status?.getAttribute("data-console-presentation-busy") ?? null,
      activeSkillSelectionBusy: status?.getAttribute("data-console-active-skill-selection-busy") ?? null,
      networkBusy: status?.getAttribute("data-console-network-busy") ?? null,
      primaryLabel: primary?.textContent?.trim() ?? null,
      primaryDisabled: primary?.disabled ?? null,
      declineDisabled: decline?.disabled ?? null,
      responseCardDisabled: handCard?.disabled ?? null,
      responseCardSelected: handCard?.classList.contains("selected") ?? null,
    };
  }, { attackId: rootId, responseId: responseCardId });
}

async function assertAuthorizedReveal(page, request, room, defender, responseCardId, expectedRequirement = "dodge") {
  const view = await getView(request, room, defender);
  expect(view.currentAction).toMatchObject({ kind: "response", actorId: defender.id, requirement: expectedRequirement });
  expect(view.currentAction.legalActions).toContain("respond");
  expect(view.actionRevision).toBeTruthy();
  const { root, start } = await revealStart(page);
  await page.waitForFunction((startedAt) => performance.now() >= startedAt + 200, start);
  const measured = await diagnostics(page, room.attackerCard.id, responseCardId);
  expect(await root.getAttribute("data-public-card-journey-phase")).toBe("reveal");
  expect(measured).toMatchObject({
    rootPhase: "reveal",
    responsePresentationReady: "false",
    responseDecisionReady: "true",
    presentationBusy: "true",
    activeSkillSelectionBusy: "false",
    networkBusy: "false",
    declineDisabled: false,
  });
  return { view, measured, start };
}

async function submitSelectedResponse(page, room, defender, cardId, providerId = "card") {
  const dock = page.locator(`.local-player-dock[data-player-anchor="${defender.id}"]`);
  const handCard = dock.locator(`[data-hand-card-id="${cardId}"] .game-card`);
  await expect(handCard).toBeEnabled();
  await handCard.click();
  const confirm = dock.locator('[data-action-slot="primary"] button.primary');
  await expect(confirm).toBeEnabled();
  const submitted = page.waitForResponse((response) => response.url() === `${API}/api/rooms`
    && response.request().method() === "POST"
    && response.request().postDataJSON()?.action === "respond");
  await confirm.click();
  const response = await submitted;
  expect(response.ok()).toBeTruthy();
  expect(response.request().postDataJSON()).toMatchObject({
    action: "respond", code: room.code, token: defender.token, providerId, cardId,
  });
  await page.evaluate((status) => {
    window.__r1ResponseSubmission = { responseReceivedAtMs: performance.now(), status };
  }, response.status());
  return response;
}

async function responseFirstPaint(page, cardId, motion = "attack-dodge") {
  await page.waitForFunction((targetCardId) => window.__r1CardPhases?.some((entry) => entry.cardId === targetCardId && entry.phase === "reveal"), cardId, { timeout: 2_000 });
  return page.evaluate(({ targetCardId, motionName }) => {
    const firstPaint = window.__r1CardPhases.find((entry) => entry.cardId === targetCardId && entry.phase === "reveal") ?? null;
    const submission = window.__r1ResponseSubmission;
    return {
      firstPaint,
      submission,
      delayMsAfterServerAccepted: firstPaint && submission ? firstPaint.firstFrameAt - submission.responseReceivedAtMs : null,
      displayCardId: document.querySelector(`[data-public-card-display="true"][data-public-card-motion="${motionName}"]`)?.getAttribute("data-public-card-id") ?? null,
      displayEventKind: document.querySelector(`[data-public-card-display="true"][data-public-card-motion="${motionName}"]`)?.getAttribute("data-public-card-active-event-kind") ?? null,
    };
  }, { targetCardId: cardId, motionName: motion });
}

for (const { width, reducedMotion } of [
  { width: 390, reducedMotion: true },
  { width: 440, reducedMotion: false },
  { width: 480, reducedMotion: false },
]) {
  test(`R1 commits an authorized Dodge during the Attack reveal at ${width}x${width === 390 ? 844 : 894}`, async ({ browser, page, request }, testInfo) => {
    test.setTimeout(60_000);
    const suffix = `R1-${width}-${Date.now()}`;
    const room = await seedRoom(request, { suffix });
    const attackerPage = await browser.newPage({ viewport: { width, height: width === 390 ? 844 : 894 } });
    const attacker = await openPlayer(attackerPage, room, 0, width);
    const defender = await openPlayer(page, room, 1, width);
    const spectatorPage = width === 440 ? await browser.newPage({ viewport: { width, height: 894 } }) : null;
    const spectator = spectatorPage ? await openPlayer(spectatorPage, room, 3, width) : null;
    if (reducedMotion) await page.emulateMedia({ reducedMotion: "reduce" });
    await watchCardPhases(page, [room.attackerCard.id, room.defenderHand[0].id]);
    await playAttack(attackerPage, room, attacker, defender);

    const { view, measured } = await assertAuthorizedReveal(page, request, room, defender, room.defenderHand[0].id);
    if (spectatorPage && spectator) {
      const publicView = await getView(request, room, spectator);
      expect(JSON.stringify(publicView)).not.toContain(room.defenderHand[0].id);
      await expect(spectatorPage.locator(".console-guidance .decision-status")).toHaveAttribute("data-console-response-decision-ready", "false");
      await expect(spectatorPage.locator(`[data-hand-card-id="${room.defenderHand[0].id}"]`)).toHaveCount(0);
    }
    expect(measured.primaryDisabled).toBe(true);
    expect(measured.responseCardDisabled).toBe(false);
    await testInfo.attach(`r1-${width}-current-action.json`, {
      body: JSON.stringify({ actionRevision: view.actionRevision, deadline: view.currentAction.deadline, legalActions: view.currentAction.legalActions, ...measured }, null, 2),
      contentType: "application/json",
    });
    await testInfo.attach(`r1-${width}-during-reveal.png`, { body: await page.screenshot(), contentType: "image/png" });

    await submitSelectedResponse(page, room, defender, room.defenderHand[0].id);
    const committed = await getView(request, room, defender);
    const dodgeEvent = committed.timeline.find((event) => event.type === "card" && event.card?.id === room.defenderHand[0].id);
    expect(dodgeEvent).toBeTruthy();
    if (spectatorPage && spectator) {
      const publicAfterResponse = await getView(request, room, spectator);
      expect(publicAfterResponse.timeline.some((event) => event.type === "card" && event.card?.id === room.defenderHand[0].id)).toBe(true);
    }
    const dodgeJourney = page.locator(`[data-public-card-journey-card-id="${room.defenderHand[0].id}"]`);
    await expect(dodgeJourney).toHaveAttribute("data-public-card-journey-phase", "reveal", { timeout: 5_000 });
    await expect(page.locator('.public-card-display[data-public-card-motion="attack-dodge"]'))
      .toHaveAttribute("data-public-card-id", room.defenderHand[0].id);
    await expect(page.locator('.public-card-display[data-public-card-motion="attack-dodge"]'))
      .toHaveAttribute("data-public-card-active-event-kind", "response");
    const responsePaint = await responseFirstPaint(page, room.defenderHand[0].id);
    expect(responsePaint.firstPaint, JSON.stringify(responsePaint)).toBeTruthy();
    expect(responsePaint.submission, JSON.stringify(responsePaint)).toBeTruthy();
    expect(responsePaint.displayCardId).toBe(room.defenderHand[0].id);
    expect(responsePaint.displayEventKind).toBe("response");
    expect(responsePaint.delayMsAfterServerAccepted).toBeGreaterThanOrEqual(-250);
    expect(responsePaint.delayMsAfterServerAccepted).toBeLessThan(1_000);
    if (width === 440) console.log(`[R1] 440px committed Dodge first-frame delay: ${Math.round(responsePaint.delayMsAfterServerAccepted)}ms; card rect ${JSON.stringify(responsePaint.firstPaint)}`);
    await testInfo.attach(`r1-${width}-response-first-paint.json`, { body: JSON.stringify(responsePaint, null, 2), contentType: "application/json" });
    if (width === 440) await testInfo.attach("r1-440-response-first-paint.png", { body: await page.screenshot(), contentType: "image/png" });
    await expect.poll(() => page.locator(`[data-public-card-journey-card-id="${room.attackerCard.id}"]`)
      .getAttribute("data-public-card-journey-phase"), { timeout: 1_500 }).toMatch(/^(move|parked)$/);
    await expect(page.getByText("GAME SCREEN ERROR")).toHaveCount(0);
    await spectatorPage?.close();
    await attackerPage.close();
  });
}

test("R1 keeps response controls enabled at 0.2, 1, 2 and 3.5 seconds during polling", async ({ browser, page, request }, testInfo) => {
  test.setTimeout(60_000);
  const room = await seedRoom(request, { suffix: `R1-CHECKPOINT-${Date.now()}` });
  const attackerPage = await browser.newPage({ viewport: { width: 440, height: 894 } });
  const attacker = await openPlayer(attackerPage, room, 0, 440);
  const defender = await openPlayer(page, room, 1, 440);
  await watchCardPhases(page, [room.attackerCard.id]);
  await playAttack(attackerPage, room, attacker, defender);
  const { root, start } = await revealStart(page);
  const samples = [];
  for (const offset of [200, 1_000, 2_000, 3_500]) {
    await page.waitForFunction(({ startedAt, offsetMs }) => performance.now() >= startedAt + offsetMs, { startedAt: start, offsetMs: offset });
    const view = await getView(request, room, defender);
    expect(view.currentAction).toMatchObject({ kind: "response", actorId: defender.id, requirement: "dodge" });
    const measured = await diagnostics(page, room.attackerCard.id, room.defenderHand[0].id);
    expect(measured.responsePresentationReady).toBe("false");
    expect(measured.responseDecisionReady).toBe("true");
    expect(measured.presentationBusy).toBe("true");
    expect(measured.networkBusy).toBe("false");
    expect(measured.responseCardDisabled).toBe(false);
    expect(measured.declineDisabled).toBe(false);
    samples.push({ offsetMs: offset, actionRevision: view.actionRevision, deadline: view.currentAction.deadline, ...measured });
  }
  expect(await root.getAttribute("data-public-card-journey-phase")).toBe("reveal");
  await testInfo.attach("r1-440-reveal-checkpoints.json", { body: JSON.stringify(samples, null, 2), contentType: "application/json" });
  await attackerPage.close();
});

test("R1 keeps a legal Dodge decline available during Attack reveal when no Dodge exists", async ({ browser, page, request }) => {
  test.setTimeout(60_000);
  const room = await seedRoom(request, { suffix: `R1-NO-DODGE-${Date.now()}`, defenderHand: [] });
  const attackerPage = await browser.newPage({ viewport: { width: 440, height: 894 } });
  const attacker = await openPlayer(attackerPage, room, 0, 440);
  const defender = await openPlayer(page, room, 1, 440);
  await watchCardPhases(page, [room.attackerCard.id]);
  await playAttack(attackerPage, room, attacker, defender);
  await revealStart(page);

  const view = await getView(request, room, defender);
  expect(view.currentAction.legalActions).toContain("decline_response");
  await page.waitForTimeout(200);
  const decline = page.locator(`.local-player-dock[data-player-anchor="${defender.id}"] [data-action-slot="decline"] button`);
  await expect(decline).toBeEnabled();
  await expect(page.locator(`.local-player-dock[data-player-anchor="${defender.id}"] [data-hand-card-id]`)).toHaveCount(0);
  const submitted = page.waitForResponse((response) => response.url() === `${API}/api/rooms`
    && response.request().method() === "POST"
    && response.request().postDataJSON()?.action === "decline_response");
  await decline.click();
  expect((await submitted).ok()).toBeTruthy();
  const settled = await getView(request, room, defender);
  expect(settled.players.find((player) => player.id === defender.id)?.hp).toBe(3);
  await attackerPage.close();
});

test("R1 enables the server-authorized Longdan conversion during Attack reveal", async ({ browser, page, request }) => {
  test.setTimeout(60_000);
  const longdanAttack = card("Attack", `R1-LONGDAN-${Date.now()}-attack`, "♥");
  const room = await seedRoom(request, {
    suffix: `R1-LONGDAN-${Date.now()}`,
    defenderHero: "zhao-yun",
    defenderHand: [longdanAttack],
    attackerCard: card("Attack", `R1-LONGDAN-${Date.now()}-source-attack`),
  });
  const attackerPage = await browser.newPage({ viewport: { width: 440, height: 894 } });
  const attacker = await openPlayer(attackerPage, room, 0, 440);
  const defender = await openPlayer(page, room, 1, 440);
  await watchCardPhases(page, [room.attackerCard.id, longdanAttack.id]);
  await playAttack(attackerPage, room, attacker, defender);
  const { view } = await assertAuthorizedReveal(page, request, room, defender, longdanAttack.id);
  expect(view.currentAction.options.map((option) => option.providerId)).toContain("zhao_yun_attack_as_dodge");

  const dock = page.locator(`.local-player-dock[data-player-anchor="${defender.id}"]`);
  const longdan = dock.getByRole("button", { name: "Braveheart" });
  await expect(longdan).toBeEnabled();
  await longdan.click();
  await expect(dock.locator(`[data-hand-card-id="${longdanAttack.id}"] .game-card`)).toBeEnabled();
  await submitSelectedResponse(page, room, defender, longdanAttack.id, "zhao_yun_attack_as_dodge");
  const committed = await getView(request, room, defender);
  const event = committed.timeline.find((candidate) => candidate.type === "card" && candidate.card?.id === longdanAttack.id);
  expect(event?.playedAs).toBe("dodge");
  await attackerPage.close();
});

test("R1 allows a legal Duel Attack during the Duel root reveal and exposes it immediately", async ({ page, request }) => {
  test.setTimeout(60_000);
  const suffix = `R1-DUEL-${Date.now()}`;
  const duel = card("Duel", `${suffix}-root`);
  const targetAttack = card("Attack", `${suffix}-target-attack`, "♣");
  const roomResponse = await request.post(`${API}/__test/seed-playing-game`, {
    data: {
      phase: "play",
      turnSeat: 0,
      players: [
        { name: `${suffix} SOURCE`, role: "Lord", hero: "cao-cao", hp: 4, maxHp: 4, hand: [duel] },
        { name: `${suffix} TARGET`, role: "Loyalist", hero: "liu-bei", hp: 4, maxHp: 4, hand: [targetAttack] },
        { name: `${suffix} PASSER`, role: "Rebel", hero: "sun-quan", hp: 4, maxHp: 4, hand: [] },
        { name: `${suffix} OBSERVER`, role: "Renegade", hero: "simayi", hp: 4, maxHp: 4, hand: [] },
      ],
    },
  });
  expect(roomResponse.ok()).toBeTruthy();
  const room = await roomResponse.json();
  const source = room.players[0];
  const target = room.players[1];
  const passer = room.players[2];
  await openPlayer(page, room, 1, 440);
  await watchCardPhases(page, [duel.id, targetAttack.id]);

  const opened = await request.post(`${API}/api/rooms`, {
    data: { action: "play_card", code: room.code, token: source.token, cardId: duel.id, targetId: target.id },
  });
  expect(opened.ok()).toBeTruthy();
  const { root, start } = await revealStart(page);
  const negationAction = await getView(request, room, passer);
  expect(negationAction.currentAction).toMatchObject({ kind: "response", actorId: passer.id, requirement: "negate" });
  for (const player of room.players) {
    const pass = await request.post(`${API}/api/rooms`, {
      data: {
        action: "decline_response", code: room.code, token: player.token,
        context: { windowId: negationAction.currentAction.negationWindowId },
      },
    });
    const passBody = await pass.text();
    expect(pass.ok(), passBody).toBeTruthy();
  }
  const targetAction = await getView(request, room, target);
  expect(targetAction.currentAction).toMatchObject({ kind: "response", actorId: target.id, requirement: "attack" });
  expect(targetAction.currentAction.legalActions).toContain("respond");
  await page.waitForFunction((startedAt) => performance.now() >= startedAt + 250, start);
  expect(await root.getAttribute("data-public-card-journey-phase")).toBe("reveal");

  await submitSelectedResponse(page, room, target, targetAttack.id);
  const committed = await getView(request, room, target);
  const event = committed.timeline.find((candidate) => candidate.type === "card" && candidate.card?.id === targetAttack.id);
  expect(event?.duelAttackResponse).toMatchObject({ semantics: "PROVEN", ordinal: 1 });
  const responseCard = page.locator(`[data-public-card-journey-card-id="${targetAttack.id}"]`);
  await expect(responseCard).toHaveAttribute("data-public-card-journey-phase", "reveal", { timeout: 5_000 });
  const responsePaint = await responseFirstPaint(page, targetAttack.id, "duel");
  expect(responsePaint.displayCardId).toBe(targetAttack.id);
  expect(responsePaint.delayMsAfterServerAccepted).toBeGreaterThanOrEqual(-250);
  expect(responsePaint.delayMsAfterServerAccepted).toBeLessThan(1_000);
  console.log(`[R1] Duel Attack first-frame delay: ${Math.round(responsePaint.delayMsAfterServerAccepted)}ms; card rect ${JSON.stringify(responsePaint.firstPaint)}`);
});
