import { expect, test } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";

const API = "http://127.0.0.1:3137";
const duelViewports = [
  { name: "390x844", width: 390, height: 844 },
  { name: "440x956", width: 440, height: 956 },
  { name: "480x900", width: 480, height: 900 },
  { name: "1440x900", width: 1440, height: 900 },
];

async function postRoomAction(request, action, code, token, values = {}) {
  const response = await request.post(`${API}/api/rooms`, { data: { action, code, token, ...values } });
  const body = await response.json();
  expect(response.status(), JSON.stringify(body)).toBeGreaterThanOrEqual(200);
  expect(response.status(), JSON.stringify(body)).toBeLessThan(300);
  return body.room ?? body;
}

async function createTestGame(request, page, presetId, hostName, viewport = { width: 390, height: 844 }, handsBySeat, options = {}) {
  const created = await request.post(`${API}/api/rooms`, { data: { action: "create", name: hostName } });
  const body = await created.json();
  expect(created.status(), JSON.stringify(body)).toBe(201);
  const code = body.room.code;
  const token = body.token;
  let room = await postRoomAction(request, "add_test_players", code, token);
  room = await postRoomAction(request, "enable_test_room", code, token);
  room = await postRoomAction(request, "configure_test_hands", code, token, { presetId, expectedRevision: 0, ...(handsBySeat ? { handsBySeat } : {}) });
  if (handsBySeat) expect(room.testHandPreset?.handsBySeat).toEqual(handsBySeat);
  room = await postRoomAction(request, "start", code, token);
  const preferredHeroesBySeat = ["cao-cao", "sun-quan", "guo-jia", "zhou-yu"];
  for (let selection = 0; room.status === "heroes" && selection < 8; selection += 1) {
    const chooser = room.players.find((player) => player.id === room.meId);
    const seat = chooser?.seat ?? room.players.find((player) => !player.hero)?.seat ?? 0;
    const preferredHeroId = options.preferredHeroesBySeat?.[seat] ?? preferredHeroesBySeat[seat];
    const hero = room.myHeroOptions.find((candidate) => candidate.id === preferredHeroId)
      ?? room.myHeroOptions.find((candidate) => candidate.id !== "liu-bei")
      ?? room.myHeroOptions[0];
    expect(hero, `test controller has a Standard hero option for seat ${seat}`).toBeTruthy();
    room = await postRoomAction(request, "choose_hero", code, token, { heroId: hero.id });
  }
  expect(room.status).toBe("playing");
  expect(room.isTestController).toBe(true);
  expect(room.players).toHaveLength(4);
  const seats = Object.fromEntries(room.players.map((player) => [player.seat, player]));
  await page.setViewportSize(viewport);
  await page.addInitScript(({ roomCode, sessionToken, name }) => {
    localStorage.setItem("three-realms-session", JSON.stringify({ code: roomCode, token: sessionToken, name }));
  }, { roomCode: code, sessionToken: token, name: hostName });
  await page.goto(`${API}/`);
  await expect(page.locator(".game-shell")).toBeVisible();
  const host = room.players.find((player) => player.isHost);
  expect(host, "the authenticated test controller has one HOST seat").toBeTruthy();
  const initialViewerId = await page.locator(".local-player-dock").getAttribute("data-player-anchor");
  if (initialViewerId !== host.id) {
    const hostViewResponse = page.waitForResponse((response) => {
      if (response.request().method() !== "GET" || !response.url().startsWith(`${API}/api/rooms?`)) return false;
      return new URL(response.url()).searchParams.get("testViewerId") === host.id;
    });
    await page.getByTestId(`test-view-switch-${host.id}`).click();
    expect((await hostViewResponse).status()).toBe(200);
  }
  await expect(page.locator(`.local-player-dock[data-player-anchor="${host.id}"]`)).toHaveCount(1);
  const initialSwitchIds = room.players.filter((player) => (player.isTestPlayer || player.isHost) && player.id !== host.id).map(({ id }) => id);
  await expect(page.getByTestId(/^test-view-switch-/)).toHaveCount(initialSwitchIds.length);
  return { code, token, room, seats };
}

async function readRoom(request, game, viewerId) {
  const query = new URLSearchParams({ code: game.code, token: game.token, testViewerId: viewerId });
  const response = await request.get(`${API}/api/rooms?${query}`);
  const body = await response.json();
  expect(response.status(), JSON.stringify(body)).toBe(200);
  const room = body.room ?? body;
  expect(room.meId).toBe(viewerId);
  return room;
}

function isRoomAction(response, action) {
  if (response.url() !== `${API}/api/rooms` || response.request().method() !== "POST") return false;
  try { return JSON.parse(response.request().postData() ?? "{}").action === action; }
  catch { return false; }
}

async function switchViewer(page, request, game, playerId) {
  const player = Object.values(game.seats).find(({ id }) => id === playerId);
  expect(player, `test seat ${playerId} exists`).toBeTruthy();
  const localDock = page.locator(`.local-player-dock[data-player-anchor="${playerId}"]`);
  if (await localDock.count() === 0) {
    const button = page.getByTestId(`test-view-switch-${playerId}`);
    await expect(button).toBeVisible();
    const selectedViewResponse = page.waitForResponse((response) => {
      if (response.request().method() !== "GET" || !response.url().startsWith(`${API}/api/rooms?`)) return false;
      return new URL(response.url()).searchParams.get("testViewerId") === playerId;
    });
    await button.click();
    const response = await selectedViewResponse;
    expect(response.status()).toBe(200);
  }
  await expect(localDock).toHaveCount(1);
  return readRoom(request, game, playerId);
}

async function readAllPerspectivesThroughViewerControls(page, request, game, playerIds) {
  const views = [];
  for (const playerId of playerIds) views.push(await switchViewer(page, request, game, playerId));
  return views;
}

async function refreshViewerAfterServerAction(page, request, game, playerId) {
  // These setup/decline transitions are committed by the authorized server
  // test harness. Reload from that authoritative snapshot so a manual SWITCH
  // does not inherit a stale animation queue from the previous viewer.
  await page.reload();
  await expect(page.locator(".game-shell")).toBeVisible();
  const currentViewerId = await page.locator(".local-player-dock").getAttribute("data-player-anchor");
  const currentSwitchIds = Object.values(game.seats).filter((player) => (player.isTestPlayer || player.isHost) && player.id !== currentViewerId).map(({ id }) => id);
  await expect(page.getByTestId(/^test-view-switch-/)).toHaveCount(currentSwitchIds.length);
  return switchViewer(page, request, game, playerId);
}

async function finishDiscardIfNeeded(request, game, actorId, afterEnd) {
  if (afterEnd.phase !== "discard") return afterEnd;
  const discardView = await readRoom(request, game, actorId);
  const player = discardView.players.find(({ id }) => id === actorId);
  const required = Math.max(0, discardView.myHand.length - (player?.hp ?? 0));
  const cardIds = discardView.myHand.slice(0, required).map(({ id }) => id);
  expect(cardIds.length).toBeGreaterThanOrEqual(required);
  return postRoomAction(request, "discard_cards", game.code, game.token, { cardIds });
}

async function driveToPlayPhase(page, request, game, actorId) {
  let viewerRoom = await switchViewer(page, request, game, actorId);
  expect(viewerRoom.currentAction?.actorId).toBe(actorId);
  for (let step = 0; step < 8; step += 1) {
    const legalActions = viewerRoom.currentAction?.legalActions ?? [];
    if (legalActions.includes("play_card") || legalActions.includes("end_turn")) return viewerRoom;
    if (legalActions.includes("decline_trigger")) {
      await postRoomAction(request, "decline_trigger", game.code, game.token);
      viewerRoom = await refreshViewerAfterServerAction(page, request, game, actorId);
      expect(viewerRoom.currentAction?.actorId).toBe(actorId);
      continue;
    }
    if (legalActions.includes("decline_response")) {
      await postRoomAction(request, "decline_response", game.code, game.token);
      viewerRoom = await refreshViewerAfterServerAction(page, request, game, actorId);
      expect(viewerRoom.currentAction?.actorId).toBe(actorId);
      continue;
    }
    if (legalActions.includes("draw")) {
      await postRoomAction(request, "draw", game.code, game.token);
      viewerRoom = await refreshViewerAfterServerAction(page, request, game, actorId);
      expect(viewerRoom.currentAction?.actorId).toBe(actorId);
      continue;
    }
    throw new Error(`cannot advance turn ${actorId}; current action is ${JSON.stringify(viewerRoom.currentAction)}`);
  }
  throw new Error(`turn ${actorId} did not reach its legal Play phase within eight CurrentAction transitions`);
}

async function endTurn(page, request, game, actorId) {
  const viewerRoom = await driveToPlayPhase(page, request, game, actorId);
  expect(viewerRoom.currentAction?.legalActions).toContain("end_turn");
  const afterEnd = await postRoomAction(request, "end_turn", game.code, game.token);
  return finishDiscardIfNeeded(request, game, actorId, afterEnd);
}

async function advanceToActor(page, request, game, playerId) {
  for (let turn = 0; turn < game.room.players.length; turn += 1) {
    const views = await readAllPerspectivesThroughViewerControls(page, request, game, Object.values(game.seats).map(({ id }) => id));
    const activeView = views.find((view) => view.currentAction?.actorId);
    const actorId = activeView?.currentAction?.actorId;
    expect(actorId, "the live test game exposes the authoritative action actor").toBeTruthy();
    if (actorId === playerId) return driveToPlayPhase(page, request, game, playerId);
    await endTurn(page, request, game, actorId);
  }
  throw new Error(`seat ${game.room.players.find(({ id }) => id === playerId)?.seat} did not receive the Play action within one turn cycle`);
}

async function playDuel(page, request, game, actorId, cardId, targetName) {
  const current = await switchViewer(page, request, game, actorId);
  expect(current.currentAction?.actorId).toBe(actorId);
  await page.locator(`.local-player-dock [data-hand-card-id="${cardId}"] .game-card`).click();
  await page.getByRole("button", { name: `Select ${targetName}`, exact: true }).click();
  const targetId = game.room.players.find((player) => player.name === targetName)?.id;
  expect(targetId, `the selected Duel target ${targetName} belongs to this test room`).toBeTruthy();
  await expect(page.locator(`.player-square.selected-target[data-player-anchor="${targetId}"]`), "the public seat selection reflects the chosen Duel target").toHaveCount(1);
  const closeInspection = page.getByRole("button", { name: `Close ${targetName} inspection`, exact: true });
  if (await closeInspection.count()) await closeInspection.click();
  const confirm = page.locator('[data-console-surface="local-operation"] button.primary');
  const localState = await page.evaluate(() => {
    const status = document.querySelector(".decision-status");
    const end = document.querySelector('[data-action-slot="decline"] button.end:last-child');
    const selectedHand = [...document.querySelectorAll("[data-hand-card-id]")].filter((node) => node.classList.contains("single-selected")).map((node) => ({ id: node.getAttribute("data-hand-card-id"), cardClass: node.querySelector(".game-card")?.className }));
    const targets = [...document.querySelectorAll(".player-square")].map((node) => ({ playerId: node.getAttribute("data-player-anchor"), selected: node.classList.contains("selected-target"), label: node.querySelector(".opponent-hero-target")?.getAttribute("aria-label") ?? null }));
    return { localPlayerId: document.querySelector(".local-player-dock")?.getAttribute("data-player-anchor"), decision: status ? Object.fromEntries([...status.attributes].map(({ name, value }) => [name, value])) : null, endDisabled: end?.disabled ?? null, selectedHand, targets };
  });
  localState.currentAction = (await readRoom(request, game, actorId)).currentAction;
  await expect(confirm, JSON.stringify(localState)).toBeEnabled({ timeout: 20_000 });
  const submitted = page.waitForResponse((response) => isRoomAction(response, "play_card"));
  await confirm.click();
  const response = await submitted;
  expect(response.status()).toBe(200);
}

async function passDuelNegationWindows(page, request, game, viewerIds, testInfo, rootViewerId) {
  let initialNegation = null;
  for (let prompt = 0; prompt < game.room.players.length + 1; prompt += 1) {
    const views = await readAllPerspectivesThroughViewerControls(page, request, game, viewerIds);
    const exchange = views[0].presentationSnapshot.duelExchange;
    if (exchange?.semantics === "PROVEN" && exchange.responseCount === 0) {
      if (!initialNegation) {
        await testInfo.attach("duel-b1-negation-window-not-observed.json", {
          body: JSON.stringify(views.map((view) => ({
            meId: view.meId,
            isTestController: view.isTestController,
            currentAction: view.currentAction,
            stage: view.presentationSnapshot?.interaction?.stage,
            reactionChain: view.presentationSnapshot?.reactionChain,
            duelExchange: view.presentationSnapshot?.duelExchange,
            pendingKind: view.pending?.kind,
            continuation: view.pending?.continuation,
            handKinds: view.myHand.map(({ kind, id }) => ({ kind, id })),
            recentEvents: view.timeline.slice(-12).map((event) => ({ id: event.id, type: event.type, action: event.action,
              player: event.player, cardKind: event.card?.kind, presentation: event.presentation, privateToPlayerId: event.privateToPlayerId })),
          })), null, 2),
          contentType: "application/json",
        });
        await testInfo.attach("duel-b1-negation-window-not-observed.png", { body: await page.screenshot({ fullPage: true }), contentType: "image/png" });
      }
      const rootPhysicalCardId = views.flatMap(({ timeline }) => timeline).find((event) => event.id === exchange.root.eventId)?.card?.id;
      for (const view of views) expect(view.presentationSnapshot.duelExchange, `public Duel proof for viewer ${view.meId}; v2=${JSON.stringify({ exchange: view.presentationV2?.duelExchange, scene: view.presentationV2?.interactionScene, stable: view.presentationV2?.stableBoundary, pending: view.pending, pendingDuel: view.pendingDuel, continuation: view.pending?.continuation, currentAction: view.currentAction, causalEnvelope: view.causalEnvelope, rootMatches: view.timeline.filter((event) => event.id === exchange.root.eventId || rootPhysicalCardId && JSON.stringify(event).includes(rootPhysicalCardId)).map(({ id, type, action, presentation, privateToPlayerId, playedAs, card, cards }) => ({ id, type, action, presentation, privateToPlayerId, playedAs, cardKind: card?.kind, cardId: card?.id, cards: cards?.map(({ kind, id }) => ({ kind, id })) })) })}`).toEqual(exchange);
      return { views, exchange, initialNegation };
    }
    const activeActionView = views.find((view) => view.currentAction?.actorId);
    const actorId = activeActionView?.currentAction?.actorId;
    expect(actorId, `one authenticated viewer exposes the current Negation-window CurrentAction and public stage: ${JSON.stringify(views.map(({ meId, currentAction, presentationSnapshot }) => ({ meId, currentAction, stage: presentationSnapshot?.interaction?.stage, proof: presentationSnapshot?.duelExchange?.semantics })))}`).toBeTruthy();
    const actorView = await switchViewer(page, request, game, actorId);
    expect(actorView.currentAction?.actorId).toBe(actorId);
    expect(actorView.currentAction?.kind).toBe("response");
    expect(actorView.currentAction?.legalActions).toContain("decline_response");
    await expect(page.getByText("Play Negation or Skip.", { exact: true })).toBeVisible();
    if (prompt === 0) await testInfo.attach("duel-b1-negation-proof-diagnostic.json", {
      body: JSON.stringify({
        snapshot: actorView.presentationSnapshot,
        presentationV2: actorView.presentationV2,
        pending: actorView.pending,
        pendingNegation: actorView.pendingNegation,
        pendingDuel: actorView.pendingDuel,
        duelEvents: actorView.timeline.filter((event) => event.type === "card" && event.card?.kind === "Duel"),
        players: actorView.players.map(({ id, seat, isTestPlayer, isHost, hero }) => ({ id, seat, isTestPlayer, isHost, hero })),
      }, null, 2),
      contentType: "application/json",
    });
    await expect(page.locator('[data-root-action-overlay="true"]')).toHaveAttribute("data-root-action-ready", "true", { timeout: 20_000 });
    await expect(page.locator(".interaction-stage")).toHaveCount(0);
    if (prompt === 0) {
      const geometry = await snapshotDuelGraph(page, viewerIds);
      const publicRootEventId = actorView.presentationSnapshot?.reactionChain?.publicEventLinks?.root?.eventId;
      expect(actorView.presentationSnapshot?.interaction?.stage).toBe("NEGATION");
      expect(actorView.presentationSnapshot?.duelExchange).toBeNull();
      expect(geometry.rootEventId).toBe(publicRootEventId);
      expect(geometry.rootCardFaceKind).toBe("Duel");
      expect(geometry.phaseNotice).toBe("NEGATION MAY BE PLAYED");
      expect(geometry.responseCount).toBe(0);
      expect(geometry.nodes).toHaveLength(0);
      const rootViewer = await switchViewer(page, request, game, rootViewerId);
      expect(rootViewer.presentationSnapshot?.interaction?.stage).toBe("NEGATION");
      const stableViewerGeometry = await snapshotDuelGraph(page, viewerIds);
      expect(stableViewerGeometry.rootEventId).toBe(geometry.rootEventId);
      const stableViewerScreenshot = await attachFrame(page, testInfo, "duel-b1-real-negation-window-root-view-390x844");
      await switchViewer(page, request, game, actorId);
      const negationDom = await page.evaluate(() => {
        const overlay = document.querySelector('[data-root-action-overlay="true"]');
        const stage = document.querySelector(".interaction-stage");
        return {
          overlay: overlay ? {
            ready: overlay.getAttribute("data-root-action-ready"),
            cardKind: overlay.getAttribute("data-root-action-card-kind"),
            rootEventId: overlay.getAttribute("data-root-action-event-id"),
            html: overlay.outerHTML,
          } : null,
          interactionStage: stage ? { text: stage.textContent?.trim(), html: stage.outerHTML } : null,
          localDockPlayerId: document.querySelector(".local-player-dock")?.getAttribute("data-player-anchor"),
        };
      });
      const publicRoot = actorView.timeline.filter((event) => event.type === "card" && event.action === "play" && event.card?.kind === "Duel")
        .map(({ id, resolutionId, card, privateToPlayerId }) => ({ id, resolutionId, physicalCardId: card.id, kind: card.kind, privateToPlayerId: privateToPlayerId ?? null }));
      const evidence = testInfo.outputPath("duel-b1-negation-window-baseline.json");
      await writeFile(evidence, JSON.stringify({
        metadata: { meId: actorView.meId, isTestController: actorView.isTestController, players: actorView.players.map(({ id, seat, isTestPlayer, isHost, hero }) => ({ id, seat, isTestPlayer, isHost, hero })) },
        stage: actorView.presentationSnapshot?.interaction,
        stableBoundary: actorView.presentationSnapshot?.stableBoundary,
        duelExchange: actorView.presentationSnapshot?.duelExchange,
        reactionChain: actorView.presentationSnapshot?.reactionChain,
        publicRoot,
        dom: negationDom,
        geometry: { ...geometry, overlayHtml: undefined },
        rootViewerGeometry: { ...stableViewerGeometry, overlayHtml: undefined },
        rootViewerId,
      }, null, 2));
      await testInfo.attach("duel-b1-negation-window-baseline.json", { path: evidence, contentType: "application/json" });
      const negationFrame = await attachFrame(page, testInfo, "duel-b1-real-negation-window-390x844");
      expect(negationDom.overlay?.ready).toBe("true");
      expect(negationDom.overlay?.cardKind).toBe("Duel");
      expect(negationDom.interactionStage).toBeNull();
      await testInfo.attach("duel-b1-negation-window-baseline.png", { path: negationFrame, contentType: "image/png" });
      initialNegation = { viewerId: rootViewerId, actorId, screenshot: negationFrame, rootViewerScreenshot: stableViewerScreenshot,
        geometry: stableViewerGeometry, activeResponderGeometry: geometry };
    }
    const skip = page.locator(`.local-player-dock[data-player-anchor="${actorId}"] [data-action-slot="decline"] button`);
    await expect(skip).toHaveText("Skip");
    await expect(skip).toBeEnabled();
    const skipped = page.waitForResponse((response) => isRoomAction(response, "decline_response"));
    await skip.click();
    expect((await skipped).status()).toBe(200);
    await refreshViewerAfterServerAction(page, request, game, actorId);
  }
  throw new Error("the test-mode Duel did not reach its server-proven open response window after legal Negation skips");
}

async function playAttack(page, request, game, actorId, cardId, targetName) {
  const current = await switchViewer(page, request, game, actorId);
  expect(current.currentAction?.actorId).toBe(actorId);
  await page.locator(`.local-player-dock [data-hand-card-id="${cardId}"] .game-card`).click();
  await page.getByRole("button", { name: `Select ${targetName}`, exact: true }).click();
  const closeInspection = page.getByRole("button", { name: `Close ${targetName} inspection`, exact: true });
  if (await closeInspection.count()) await closeInspection.click();
  const confirm = page.locator('[data-console-surface="local-operation"] button.primary');
  await expect(confirm).toBeEnabled({ timeout: 20_000 });
  const submitted = page.waitForResponse((response) => isRoomAction(response, "play_card"));
  await confirm.click();
  const response = await submitted;
  expect(response.status()).toBe(200);
}

async function respondWithAttack(page, request, game, actorId, cardId) {
  const current = await switchViewer(page, request, game, actorId);
  expect(current.currentAction?.actorId).toBe(actorId);
  const card = page.locator(`.local-player-dock [data-hand-card-id="${cardId}"] .game-card`);
  await expect(card).toBeEnabled({ timeout: 20_000 });
  await card.click();
  const confirm = page.locator('[data-console-surface="local-operation"] button.primary');
  await expect(confirm).toBeEnabled({ timeout: 20_000 });
  const submitted = page.waitForResponse((response) => isRoomAction(response, "respond"));
  await confirm.click();
  const response = await submitted;
  expect(response.status()).toBe(200);
}

async function respondWithDodge(page, request, game, actorId, cardId) {
  const current = await switchViewer(page, request, game, actorId);
  expect(current.currentAction?.actorId).toBe(actorId);
  expect(current.currentAction?.requirement).toBe("dodge");
  const card = page.locator(`.local-player-dock [data-hand-card-id="${cardId}"] .game-card`);
  await expect(card).toBeEnabled({ timeout: 20_000 });
  await card.click();
  const confirm = page.locator('[data-console-surface="local-operation"] button.primary');
  await expect(confirm).toBeEnabled({ timeout: 20_000 });
  const submitted = page.waitForResponse((response) => isRoomAction(response, "respond"));
  await confirm.click();
  const response = await submitted;
  expect(response.status()).toBe(200);
}

async function waitForStableGraph(page) {
  const result = await page.evaluate(() => new Promise((resolve) => {
    let previous = "";
    let stableFrames = 0;
    let frames = 0;
    let latestState = {};
    const sample = () => {
      const overlay = document.querySelector('[data-root-action-overlay="true"]');
      const root = document.querySelector('[data-root-action-card="true"]');
      const rect = (element) => {
        if (!element) return null;
        const box = element.getBoundingClientRect();
        return { left: box.left, top: box.top, right: box.right, bottom: box.bottom, width: box.width, height: box.height };
      };
      latestState = {
        ready: overlay?.dataset.rootActionReady ?? null,
        layout: overlay?.dataset.rootActionLayoutState ?? null,
        fallback: overlay?.dataset.rootActionFallbackReason ?? null,
        responseCount: overlay?.dataset.rootActionResponseCount ?? null,
        viewport: { width: window.innerWidth, height: window.innerHeight },
        sourceId: overlay?.dataset.rootActionSourceId ?? null,
        targetId: overlay?.dataset.rootActionTargetId ?? null,
        root: rect(root),
        responseNodes: [...(overlay?.querySelectorAll('[data-root-action-response-node="true"]') ?? [])].map((node) => ({
          eventId: node.dataset.responseEventId,
          actorId: node.dataset.responseActorId,
          side: node.dataset.responseSide,
          rect: rect(node),
        })),
        anchors: [...document.querySelectorAll("[data-player-anchor]")].map((node) => ({
          playerId: node.dataset.playerAnchor,
          localDock: node.classList.contains("local-player-dock"),
          rect: rect(node),
        })),
        controls: [...document.querySelectorAll(".stage-system-cluster, .stage-system-menu, .stage-system-menu-actions, .game-messages, .game-exit")]
          .filter((node) => node.getClientRects().length > 0)
          .map((node) => ({ className: node.className, rect: rect(node) })),
      };
      if (!overlay || !root || overlay.dataset.rootActionReady !== "true") {
        previous = "";
        stableFrames = 0;
        if (frames++ >= 180) return resolve({ stable: false, frames, ...latestState });
        requestAnimationFrame(sample);
        return;
      }
      const responseCards = [...overlay.querySelectorAll('[data-root-action-response-node="true"]')];
      const edges = [...overlay.querySelectorAll("[data-root-action-edge]")];
      const signature = JSON.stringify([
        root.getBoundingClientRect().toJSON(),
        ...responseCards.map((node) => node.getBoundingClientRect().toJSON()),
        ...edges.map((edge) => edge.getAttribute("d")),
      ]);
      latestState.visibleResponseNodeCount = responseCards.length;
      if (signature === previous) stableFrames += 1;
      else stableFrames = 0;
      if (stableFrames >= 3) return resolve({ stable: true, frames, ...latestState });
      if (frames++ >= 180) return resolve({ stable: false, frames, ...latestState });
      previous = signature;
      requestAnimationFrame(sample);
    };
    requestAnimationFrame(sample);
  }));
  expect(result.stable, JSON.stringify(result)).toBe(true);
}

async function snapshotDuelGraph(page, playerIds) {
  return page.evaluate((ids) => {
    const rect = (element) => {
      if (!element) return null;
      const box = element.getBoundingClientRect();
      return { left: box.left, top: box.top, right: box.right, bottom: box.bottom, width: box.width, height: box.height };
    };
    const pathEvidence = (path) => {
      if (!path) return null;
      const svg = path.ownerSVGElement;
      const length = path.getTotalLength();
      const ctm = path.getScreenCTM();
      const start = new DOMPoint(path.getPointAtLength(0).x, path.getPointAtLength(0).y).matrixTransform(ctm);
      const end = new DOMPoint(path.getPointAtLength(length).x, path.getPointAtLength(length).y).matrixTransform(ctm);
      const style = getComputedStyle(path);
      return {
        d: path.getAttribute("d"),
        start: { x: start.x, y: start.y },
        end: { x: end.x, y: end.y },
        svgRect: rect(svg),
        svgScreenMatrix: { a: ctm.a, b: ctm.b, c: ctm.c, d: ctm.d, e: ctm.e, f: ctm.f },
        markerEnd: path.getAttribute("marker-end"),
        stroke: style.stroke,
        strokeWidth: Number.parseFloat(style.strokeWidth),
        opacity: Number.parseFloat(style.opacity),
        className: path.getAttribute("class"),
        eventId: path.dataset.responseEventId ?? null,
        actorId: path.dataset.responseActorId ?? null,
        sourceId: path.dataset.responseSemanticSourceId ?? null,
        targetId: path.dataset.responseTargetId ?? null,
        targetResponseEventId: path.dataset.counterTargetResponseEventId ?? null,
        active: path.dataset.responseActive ?? path.dataset.duelSourceTrunkActive ?? null,
        sourceSide: path.dataset.responseSourceLane ?? null,
        currentRound: path.dataset.responseCurrentRound ?? null,
        latest: path.dataset.responseLatest ?? null,
        trunkActorId: path.dataset.duelSourceTrunkPlayerId ?? null,
        trunkEventIds: path.dataset.duelSourceTrunkResponseEventIds?.split(",") ?? [],
        sourceElbow: path.dataset.responseSourceElbowX && path.dataset.responseSourceElbowY
          ? { x: Number(path.dataset.responseSourceElbowX) + rect(path.ownerSVGElement).left,
            y: Number(path.dataset.responseSourceElbowY) + rect(path.ownerSVGElement).top }
          : null,
      };
    };
    const overlay = document.querySelector('[data-root-action-overlay="true"]');
    const root = document.querySelector('[data-root-action-card="true"]');
    const anchors = Object.fromEntries(ids.map((id) => {
      const matches = [...document.querySelectorAll("[data-player-anchor]")].filter((node) => node.dataset.playerAnchor === id);
      return [id, matches.map(rect)];
    }));
    const heroAnchors = Object.fromEntries(ids.map((id) => {
      const players = [...document.querySelectorAll("[data-player-anchor]")].filter((node) => node.dataset.playerAnchor === id);
      const selector = players[0]?.classList.contains("local-player-dock") ? ".local-hero-card" : ".opponent-hero-card";
      return [id, players.length === 1 ? [rect(players[0].querySelector(selector))].filter(Boolean) : []];
    }));
    const nodes = [...document.querySelectorAll('[data-root-action-response-node="true"]')].map((node) => ({
      rect: rect(node),
      eventId: node.dataset.responseEventId ?? null,
      ordinal: Number(node.dataset.responseOrdinal ?? 0),
      actorId: node.dataset.responseActorId ?? null,
      decisionActorId: node.dataset.responseDecisionActorId ?? null,
      targetId: node.dataset.responseTargetId ?? null,
      physicalCardId: node.dataset.responsePhysicalCardId ?? null,
      faceKind: node.dataset.responseCardFaceKind ?? null,
      side: node.dataset.responseSide ?? null,
      round: Number(node.dataset.responseRound ?? 0),
      currentRound: node.dataset.responseCurrentRound ?? null,
      latest: node.dataset.responseLatest ?? null,
      active: node.dataset.responseActive ?? null,
      targetResponseEventId: node.dataset.counterTargetResponseEventId ?? null,
      className: typeof node.className === "string" ? node.className : node.getAttribute("class"),
    }));
    const edges = (edgeName) => [...document.querySelectorAll(`[data-root-action-edge="${edgeName}"]`)].map(pathEvidence);
    const legacySettledEventIds = [...document.querySelectorAll(".table-resolution-layer .table-played-card[data-settlement-event-id]")]
      .filter((node) => node.getClientRects().length > 0 && getComputedStyle(node).display !== "none")
      .map((node) => node.dataset.settlementEventId);
    const legacyActiveRevealEventIds = [...document.querySelectorAll(".table-resolution-layer .active-table-reveal[data-settlement-event-id]")]
      .filter((node) => node.getClientRects().length > 0 && getComputedStyle(node).display !== "none")
      .map((node) => node.dataset.settlementEventId);
    const fixedZones = [
      ["guidance", document.querySelector(".console-guidance")],
      ["hand", document.querySelector(".local-hand-section")],
      ["system-menu", document.querySelector(".stage-system-menu-actions:not([hidden])")],
      ["response-timer", document.querySelector(".visible-countdown-response")],
    ].flatMap(([name, element]) => element?.getClientRects().length ? [{ name, rect: rect(element) }] : []);
    return {
      viewport: { width: innerWidth, height: innerHeight },
      shell: rect(document.querySelector(".game-shell")),
      overlay: rect(overlay),
      graphReady: overlay?.dataset.rootActionReady ?? null,
      rootElementCount: overlay?.querySelectorAll('[data-root-action-card="true"]').length ?? 0,
      responseCount: Number(overlay?.dataset.rootActionResponseCount ?? 0),
      visibleResponseCount: Number(overlay?.dataset.rootActionVisibleResponseCount ?? 0),
      collapsedResponseCount: Number(overlay?.dataset.rootActionCollapsedResponseCount ?? 0),
      root: rect(root),
      rootEventId: overlay?.dataset.rootActionEventId ?? null,
      rootSourceId: overlay?.dataset.rootActionSourceId ?? null,
      rootTargetId: overlay?.dataset.rootActionTargetId ?? null,
      rootCardId: root?.dataset.rootActionPhysicalCardId ?? null,
      rootCardFaceKind: root?.dataset.rootActionCardFaceKind ?? null,
      phaseNotice: overlay?.querySelector('[data-root-action-phase-notice="true"]')?.textContent?.trim() ?? null,
      fitStep: overlay?.dataset.rootActionCardFitStep ?? null,
      duelUsable: overlay ? {
        left: Number(overlay.dataset.duelUsableLeft) + rect(overlay).left,
        top: Number(overlay.dataset.duelUsableTop) + rect(overlay).top,
        right: Number(overlay.dataset.duelUsableRight) + rect(overlay).left,
        bottom: Number(overlay.dataset.duelUsableBottom) + rect(overlay).top,
        centerX: Number(overlay.dataset.duelCenterX) + rect(overlay).left,
      } : null,
      table: rect(document.querySelector(".play-table")),
      dock: rect(document.querySelector(".local-player-dock")),
      localPlayerId: document.querySelector(".local-player-dock")?.getAttribute("data-player-anchor") ?? null,
      anchors,
      heroAnchors,
      fixedZones,
      nodes,
      rootSourcePaths: edges("source"),
      rootTargetPaths: ["target", "root-target-context", "root-target-blocked"].flatMap(edges),
      responseSourceTrunks: edges("duel-source-trunk"),
      responseSourcePaths: edges("response-source"),
      responseTargetPaths: edges("duel-response-target"),
      legacySettledEventIds,
      legacyActiveRevealEventIds,
      scrollWidth: document.documentElement.scrollWidth,
      overlayHtml: overlay?.outerHTML ?? "",
    };
  }, playerIds);
}

async function snapshotAttackDodgeGeometry(page, playerIds) {
  return page.evaluate((ids) => {
    const rect = (element) => {
      if (!element) return null;
      const box = element.getBoundingClientRect();
      return { left: box.left, top: box.top, right: box.right, bottom: box.bottom, width: box.width, height: box.height };
    };
    const pathEvidence = (path) => {
      if (!path) return null;
      const svgRect = path.ownerSVGElement.getBoundingClientRect();
      const length = path.getTotalLength();
      const start = path.getPointAtLength(0);
      const end = path.getPointAtLength(length);
      const style = getComputedStyle(path);
      return {
        d: path.getAttribute("d"),
        start: { x: start.x + svgRect.left, y: start.y + svgRect.top },
        end: { x: end.x + svgRect.left, y: end.y + svgRect.top },
        stroke: style.stroke,
        strokeWidth: Number.parseFloat(style.strokeWidth),
        opacity: Number.parseFloat(style.opacity),
        markerEnd: path.getAttribute("marker-end"),
        className: path.getAttribute("class"),
      };
    };
    const overlay = document.querySelector('[data-root-action-overlay="true"]');
    const root = overlay?.querySelector('[data-root-action-card="true"]');
    const response = overlay?.querySelector('[data-root-action-response-card="true"]');
    const anchors = Object.fromEntries(ids.map((id) => {
      const matches = [...document.querySelectorAll("[data-player-anchor]")].filter((node) => node.dataset.playerAnchor === id);
      return [id, matches.map(rect)];
    }));
    const edges = (selector) => [...document.querySelectorAll(`[data-root-action-edge="${selector}"]`)].map((path) => ({
      ...pathEvidence(path), eventId: path.dataset.responseEventId ?? null,
      actorId: path.dataset.responseActorId ?? null, targetId: path.dataset.responseTargetId ?? null,
      targetResponseEventId: path.dataset.counterTargetResponseEventId ?? null,
    }));
    return {
      viewport: { width: innerWidth, height: innerHeight },
      ready: overlay?.dataset.rootActionReady ?? null,
      eventId: overlay?.dataset.rootActionEventId ?? null,
      interactionId: overlay?.dataset.rootActionInteractionId ?? null,
      rootFrameId: overlay?.dataset.rootActionRootFrameId ?? null,
      sourceId: overlay?.dataset.rootActionSourceId ?? null,
      targetId: overlay?.dataset.rootActionTargetId ?? null,
      attackerSide: overlay?.dataset.rootActionOrthogonalAttackerSide ?? null,
      rootCardFaceKind: root?.dataset.rootActionCardFaceKind ?? null,
      rootCardId: root?.dataset.rootActionPhysicalCardId ?? null,
      root: rect(root),
      responseEventId: response?.dataset.responseEventId ?? null,
      responseActorId: response?.dataset.responseActorId ?? null,
      responseFaceKind: response?.dataset.responseCardFaceKind ?? null,
      responsePhysicalCardId: response?.dataset.responsePhysicalCardId ?? null,
      response: rect(response),
      rootSources: edges("source"),
      targetRelations: ["target", "root-target-context", "root-target-blocked"].flatMap(edges),
      interceptions: edges("attack-dodge-interception"),
      responseSources: edges("response-source"),
      stageCount: document.querySelectorAll(".interaction-stage").length,
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      table: rect(document.querySelector(".play-table")),
      dock: rect(document.querySelector(".local-player-dock")),
      anchors,
      overlayHtml: overlay?.outerHTML ?? "",
    };
  }, playerIds);
}

function pointRectDistance(point, rect) {
  return Math.hypot(Math.max(rect.left - point.x, 0, point.x - rect.right), Math.max(rect.top - point.y, 0, point.y - rect.bottom));
}

function assertAttackDodgeGeometry(geometry, { sourceId, targetId, expectedDodgeId, requireDodge }) {
  expect(geometry.ready).toBe("true");
  expect(geometry.rootCardFaceKind).toBe("Attack");
  expect(geometry.sourceId).toBe(sourceId);
  expect(geometry.targetId).toBe(targetId);
  expect(geometry.root).not.toBeNull();
  expect(geometry.rootSources).toHaveLength(1);
  expect(geometry.targetRelations).toHaveLength(requireDodge ? 0 : 1);
  expect(geometry.stageCount).toBe(0);
  expect(geometry.overflow).toBeLessThanOrEqual(1);
  expect(geometry.table.bottom).toBeLessThanOrEqual(geometry.dock.top + 1);
  const sourceAnchor = geometry.anchors[sourceId]?.[0];
  const targetAnchor = geometry.anchors[targetId]?.[0];
  expect(sourceAnchor).toBeTruthy();
  expect(targetAnchor).toBeTruthy();
  const rootSource = geometry.rootSources[0];
  for (const point of [rootSource.start, rootSource.end]) {
    const touchesRoot = pointRectDistance(point, geometry.root) < 3;
    const touchesSource = pointRectDistance(point, sourceAnchor) < 3;
    if (touchesRoot || touchesSource) continue;
    throw new Error(`Attack author path endpoint misses both the root and source Seat/Dock: ${JSON.stringify({ point, root: geometry.root, sourceAnchor })}`);
  }
  expect(inspectOrthogonalPath(rootSource.d).valid).toBe(true);
  const midpointX = ((sourceAnchor.left + sourceAnchor.right) + (targetAnchor.left + targetAnchor.right)) / 4;
  const rootCenterX = geometry.root.left + geometry.root.width / 2;
  const rootSide = rootCenterX < midpointX ? "left" : "right";
  expect(geometry.attackerSide, JSON.stringify({
    viewport: geometry.viewport, attackerSide: geometry.attackerSide, rootSide, rootCenterX, midpointX,
    root: geometry.root, sourceId, sourceAnchor, targetId, targetAnchor,
    rootSources: geometry.rootSources, targetRelations: geometry.targetRelations,
  })).toBe(rootSide);
  const rootEndpoint = [rootSource.start, rootSource.end].find((point) => pointRectDistance(point, geometry.root) < 3);
  expect(rootEndpoint).toBeTruthy();
  expect(Math.abs(rootEndpoint.x - (rootSide === "left" ? geometry.root.left : geometry.root.right)), JSON.stringify({
    viewport: geometry.viewport, rootSide, root: geometry.root, rootEndpoint, rootSource,
  })).toBeLessThanOrEqual(1);
  expect(Math.abs(rootEndpoint.y - (geometry.root.top + geometry.root.height / 2))).toBeLessThanOrEqual(1);
  if (!requireDodge) {
    const rootTarget = geometry.targetRelations[0];
    for (const point of [rootTarget.start, rootTarget.end]) {
      const touchesRoot = pointRectDistance(point, geometry.root) < 3;
      const touchesTarget = pointRectDistance(point, targetAnchor) < 3;
      if (touchesRoot || touchesTarget) continue;
      throw new Error(`Attack target path endpoint misses both the root and proven target Seat/Dock: ${JSON.stringify({ point, root: geometry.root, targetAnchor })}`);
    }
    const targetShape = inspectOrthogonalPath(rootTarget.d);
    expect(targetShape.valid).toBe(true);
    const targetCardEndpoint = [rootTarget.start, rootTarget.end].find((point) => pointRectDistance(point, geometry.root) < 3);
    expect(targetCardEndpoint).toBeTruthy();
    expect(Math.abs(targetCardEndpoint.x - (rootSide === "left" ? geometry.root.right : geometry.root.left))).toBeLessThanOrEqual(1);
    expect(Math.abs(targetCardEndpoint.y - (geometry.root.top + geometry.root.height / 2))).toBeLessThanOrEqual(1);
    expect(Math.abs(targetShape.segments[0].start.y - targetShape.segments[0].end.y)).toBeLessThanOrEqual(1);
    expect(geometry.response).toBeNull();
    expect(geometry.interceptions).toHaveLength(0);
    return;
  }
  expect(geometry.responseFaceKind).toBe("Dodge");
  expect(geometry.responsePhysicalCardId).toBe(expectedDodgeId);
  expect(geometry.responseActorId).toBe(targetId);
  expect(geometry.responseEventId).toBeTruthy();
  expect(geometry.response).not.toBeNull();
  expect(Math.abs(geometry.response.top - geometry.root.top)).toBeLessThanOrEqual(1);
  expect(geometry.responseSources).toHaveLength(1);
  expect(geometry.interceptions).toHaveLength(1);
  const response = geometry.response;
  const responseCenterX = response.left + response.width / 2;
  expect(rootSide === "left" ? responseCenterX > midpointX : responseCenterX < midpointX, JSON.stringify({
    viewport: geometry.viewport, rootSide, midpointX, root: geometry.root, response, responseCenterX,
    anchors: geometry.anchors, interceptions: geometry.interceptions, responseSources: geometry.responseSources,
  })).toBe(true);
  const responseSource = geometry.responseSources[0];
  expect(responseSource.actorId).toBe(targetId);
  const touchesResponse = (point) => pointRectDistance(point, response) < 3;
  const touchesDefender = (point) => pointRectDistance(point, targetAnchor) < 3;
  expect([responseSource.start, responseSource.end].some(touchesResponse)).toBe(true);
  expect([responseSource.start, responseSource.end].some(touchesDefender)).toBe(true);
  const interception = geometry.interceptions[0];
  expect(inspectOrthogonalPath(interception.d).valid).toBe(true);
  expect(Math.abs(interception.start.y - interception.end.y)).toBeLessThanOrEqual(1);
  expect(Math.abs(interception.start.y - (geometry.root.top + geometry.root.height / 2))).toBeLessThanOrEqual(1);
  expect([interception.start, interception.end].some((point) => pointRectDistance(point, geometry.root) < 3)).toBe(true);
  expect([interception.start, interception.end].some(touchesResponse)).toBe(true);
  expect(interception.stroke).toBe("rgb(255, 48, 48)");
  expect(interception.opacity).toBeGreaterThan(.9);
}

function inspectOrthogonalPath(path) {
  const commands = [...path.matchAll(/([MLQ])([^MLQ]*)/g)].map(([, command, tail]) => ({
    command,
    values: tail.trim().split(/\s+/).filter(Boolean).map(Number),
  }));
  let current = null;
  let startPoint = null;
  let diagonalSegments = 0;
  const elbows = [];
  const segments = [];
  let valid = commands.length >= 2;
  for (const { command, values } of commands) {
    if (command === "M" && values.length === 2 && !current) {
      current = { x: values[0], y: values[1] };
      startPoint = current;
      continue;
    }
    if (!current || command === "M") { valid = false; continue; }
    if (command === "L" && values.length === 2) {
      const next = { x: values[0], y: values[1] };
      if (Math.abs(current.x - next.x) > .11 && Math.abs(current.y - next.y) > .11) diagonalSegments += 1;
      segments.push({ start: current, end: next });
      current = next;
      continue;
    }
    if (command === "Q" && values.length === 4) {
      const corner = { x: values[0], y: values[1] };
      const next = { x: values[2], y: values[3] };
      const incomingHorizontal = Math.abs(current.y - corner.y) <= .11;
      const incomingVertical = Math.abs(current.x - corner.x) <= .11;
      const outgoingHorizontal = Math.abs(next.y - corner.y) <= .11;
      const outgoingVertical = Math.abs(next.x - corner.x) <= .11;
      const incomingRadius = Math.hypot(current.x - corner.x, current.y - corner.y);
      const outgoingRadius = Math.hypot(next.x - corner.x, next.y - corner.y);
      const rightAngle = incomingHorizontal && outgoingVertical || incomingVertical && outgoingHorizontal;
      if (!rightAngle || incomingRadius <= 0 || Math.abs(incomingRadius - outgoingRadius) > .11 || incomingRadius > 8.11) valid = false;
      elbows.push(corner);
      segments.push({ start: current, end: corner });
      current = next;
      continue;
    }
    valid = false;
  }
  return { path, commands: commands.map(({ command }) => command), startPoint, endPoint: current, diagonalSegments, elbows, segments, valid: valid && diagonalSegments === 0 };
}

function orthogonalPathContainsPoint(path, point) {
  const tolerance = 1.1;
  if (path.elbows.some((elbow) => Math.hypot(elbow.x - point.x, elbow.y - point.y) <= tolerance)) return true;
  return path.segments.some(({ start, end }) => {
    const horizontal = Math.abs(start.y - end.y) <= tolerance && Math.abs(point.y - start.y) <= tolerance
      && point.x >= Math.min(start.x, end.x) - tolerance && point.x <= Math.max(start.x, end.x) + tolerance;
    const vertical = Math.abs(start.x - end.x) <= tolerance && Math.abs(point.x - start.x) <= tolerance
      && point.y >= Math.min(start.y, end.y) - tolerance && point.y <= Math.max(start.y, end.y) + tolerance;
    return horizontal || vertical;
  });
}

function pathIntersectsRect(edge, rect) {
  const path = inspectOrthogonalPath(edge.d);
  const matrix = edge.svgScreenMatrix;
  const toScreen = (point) => ({
    x: point.x * matrix.a + point.y * matrix.c + matrix.e,
    y: point.x * matrix.b + point.y * matrix.d + matrix.f,
  });
  return path.segments.some(({ start, end }) => {
    const first = toScreen(start);
    const last = toScreen(end);
    if (Math.abs(first.y - last.y) <= 1) return first.y > rect.top + .5 && first.y < rect.bottom - .5
      && Math.max(Math.min(first.x, last.x), rect.left) < Math.min(Math.max(first.x, last.x), rect.right);
    if (Math.abs(first.x - last.x) <= 1) return first.x > rect.left + .5 && first.x < rect.right - .5
      && Math.max(Math.min(first.y, last.y), rect.top) < Math.min(Math.max(first.y, last.y), rect.bottom);
    return true;
  });
}

function rectanglesOverlap(first, second) {
  return first.left < second.right && second.left < first.right
    && first.top < second.bottom && second.top < first.bottom;
}

function heroEdgeMidpointDistance(point, heroRect) {
  const midpointX = (heroRect.left + heroRect.right) / 2;
  const midpointY = (heroRect.top + heroRect.bottom) / 2;
  return Math.min(
    Math.hypot(point.x - midpointX, point.y - heroRect.top),
    Math.hypot(point.x - midpointX, point.y - heroRect.bottom),
    Math.hypot(point.x - heroRect.left, point.y - midpointY),
    Math.hypot(point.x - heroRect.right, point.y - midpointY),
  );
}

function edgeTouchesHeroMidpoint(edge, heroRect, tolerance = 3) {
  return [edge.start, edge.end].some((point) => heroEdgeMidpointDistance(point, heroRect) <= tolerance);
}

function assertEndpointsStayInsideViewport(edge, viewport, label) {
  for (const point of [edge.start, edge.end]) {
    expect(point.x, `${label} endpoint is inset from the horizontal viewport edges`).toBeGreaterThanOrEqual(16);
    expect(point.x, `${label} endpoint is inset from the horizontal viewport edges`).toBeLessThanOrEqual(viewport.width - 16);
    expect(point.y, `${label} endpoint remains inside the viewport`).toBeGreaterThanOrEqual(1);
    expect(point.y, `${label} endpoint remains inside the viewport`).toBeLessThanOrEqual(viewport.height - 1);
  }
}

function assertRoutePointsStayInset(edge, viewport, label) {
  const path = inspectOrthogonalPath(edge.d);
  const matrix = edge.svgScreenMatrix;
  const toScreen = (point) => ({
    x: point.x * matrix.a + point.y * matrix.c + matrix.e,
    y: point.x * matrix.b + point.y * matrix.d + matrix.f,
  });
  const points = [
    ...path.segments.flatMap(({ start, end }) => [toScreen(start), toScreen(end)]),
    ...path.elbows.map(toScreen),
  ];
  for (const point of points) {
    expect(point.x, label + " route stays inset from the left screen edge").toBeGreaterThanOrEqual(16);
    expect(point.x, label + " route stays inset from the right screen edge").toBeLessThanOrEqual(viewport.width - 16);
  }
}

function assertDuelGeometry(geometry, proof) {
  expect(geometry.graphReady).toBe("true");
  expect(geometry.rootElementCount).toBe(1);
  expect(geometry.rootCardFaceKind).toBe("Duel");
  expect(geometry.rootEventId).toBe(proof.root.eventId);
  expect(geometry.rootCardId).toBeTruthy();
  expect(geometry.rootSourceId).toBe(proof.root.sourceId);
  expect(geometry.rootTargetId).toBe(proof.root.targetId);
  expect(geometry.responseCount).toBe(proof.responseCount);
  expect(geometry.nodes.map(({ eventId }) => eventId)).toEqual(proof.responses.slice(-4).map(({ responseEventId }) => responseEventId));
  expect(geometry.nodes.every(({ faceKind }) => faceKind === "Attack")).toBe(true);
  expect(geometry.nodes.every(({ physicalCardId }) => Boolean(physicalCardId))).toBe(true);
  expect(geometry.responseSourcePaths).toHaveLength(geometry.nodes.length);
  expect(geometry.responseTargetPaths).toHaveLength(geometry.nodes.length);
  expect(geometry.responseSourceTrunks).toHaveLength(new Set(geometry.nodes.map(({ actorId }) => actorId)).size);
  expect(geometry.rootSourcePaths).toHaveLength(1);
  expect(geometry.rootTargetPaths).toHaveLength(1);
  const graphEventIds = [proof.root.eventId, ...proof.responses.map(({ responseEventId }) => responseEventId)];
  const legacyEventIds = [...geometry.legacySettledEventIds, ...geometry.legacyActiveRevealEventIds];
  expect(graphEventIds.every((eventId) => !legacyEventIds.includes(eventId))).toBe(true);
  expect(geometry.scrollWidth).toBeLessThanOrEqual(geometry.viewport.width + 1);
  expect(geometry.table.bottom).toBeLessThanOrEqual(geometry.dock.top + 1);
  expect(geometry.dock.bottom).toBeLessThanOrEqual(geometry.viewport.height + 1);
  for (const anchors of Object.values(geometry.anchors)) expect(anchors).toHaveLength(1);
  expect(geometry.duelUsable).toBeTruthy();

  const sourceAnchor = geometry.anchors[proof.root.sourceId][0];
  const targetAnchor = geometry.anchors[proof.root.targetId][0];
  const sourceHeroAnchor = geometry.heroAnchors[proof.root.sourceId]?.[0];
  const targetHeroAnchor = geometry.heroAnchors[proof.root.targetId]?.[0];
  expect(sourceHeroAnchor).toBeTruthy();
  expect(targetHeroAnchor).toBeTruthy();
  const sourceLocal = proof.root.sourceId === geometry.localPlayerId;
  const targetLocal = proof.root.targetId === geometry.localPlayerId;
  const sourceX = (sourceAnchor.left + sourceAnchor.right) / 2;
  const targetX = (targetAnchor.left + targetAnchor.right) / 2;
  const battlefieldCenterX = (geometry.table.left + geometry.table.right) / 2;
  let participantSides;
  if (sourceLocal !== targetLocal) {
    const outside = (sourceLocal ? targetX : sourceX) < battlefieldCenterX ? "left" : "right";
    participantSides = sourceLocal
      ? { [proof.root.sourceId]: outside === "left" ? "right" : "left", [proof.root.targetId]: outside }
      : { [proof.root.sourceId]: outside, [proof.root.targetId]: outside === "left" ? "right" : "left" };
  } else if (Math.abs(sourceX - targetX) > 8) {
    participantSides = sourceX < targetX
      ? { [proof.root.sourceId]: "left", [proof.root.targetId]: "right" }
      : { [proof.root.sourceId]: "right", [proof.root.targetId]: "left" };
  } else participantSides = { [proof.root.sourceId]: "left", [proof.root.targetId]: "right" };

  const nodeByEventId = new Map(geometry.nodes.map((node) => [node.eventId, node]));
  const edgeByEventId = new Map(geometry.responseTargetPaths.map((edge) => [edge.eventId, edge]));
  const sourceByEventId = new Map(geometry.responseSourcePaths.map((edge) => [edge.eventId, edge]));
  const touches = (edge, rect, tolerance = 6) => Math.min(pointRectDistance(edge.start, rect), pointRectDistance(edge.end, rect)) <= tolerance;
  expect(edgeTouchesHeroMidpoint(geometry.rootSourcePaths[0], sourceHeroAnchor), JSON.stringify({ edge: geometry.rootSourcePaths[0], sourceHeroAnchor, localPlayerId: geometry.localPlayerId, viewport: geometry.viewport })).toBe(true);
  expect(touches(geometry.rootSourcePaths[0], geometry.root), JSON.stringify({ edge: geometry.rootSourcePaths[0], root: geometry.root })).toBe(true);
  expect(edgeTouchesHeroMidpoint(geometry.rootTargetPaths[0], targetHeroAnchor), JSON.stringify({ edge: geometry.rootTargetPaths[0], targetHeroAnchor, localPlayerId: geometry.localPlayerId, viewport: geometry.viewport })).toBe(true);
  expect(touches(geometry.rootTargetPaths[0], geometry.root), JSON.stringify({ edge: geometry.rootTargetPaths[0], root: geometry.root })).toBe(true);
  expect(geometry.rootTargetPaths[0].markerEnd).toMatch(/^url\(#/);
  expect(inspectOrthogonalPath(geometry.rootSourcePaths[0].d).valid).toBe(true);
  expect(inspectOrthogonalPath(geometry.rootTargetPaths[0].d).valid).toBe(true);
  assertEndpointsStayInsideViewport(geometry.rootSourcePaths[0], geometry.viewport, "Duel root source path");
  assertEndpointsStayInsideViewport(geometry.rootTargetPaths[0], geometry.viewport, "Duel root target path");
  const rootCenter = { x: geometry.root.left + geometry.root.width / 2, y: geometry.root.top + geometry.root.height / 2 };
  expect(Math.abs(rootCenter.x - geometry.duelUsable.centerX), JSON.stringify({
    rootCenter,
    usableCenterX: geometry.duelUsable.centerX,
    table: geometry.table,
    viewport: geometry.viewport,
  })).toBeLessThanOrEqual(6);

  for (const node of geometry.nodes) {
    const expectedSide = participantSides[node.actorId];
    expect(expectedSide).toBeTruthy();
    expect(node.side).toBe(expectedSide);
    const cardCenter = { x: (node.rect.left + node.rect.right) / 2, y: (node.rect.top + node.rect.bottom) / 2 };
    expect(expectedSide === "left" ? cardCenter.x < geometry.duelUsable.centerX : cardCenter.x > geometry.duelUsable.centerX).toBe(true);
    const normalizedX = (cardCenter.x - geometry.duelUsable.left) / (geometry.duelUsable.right - geometry.duelUsable.left);
    expect(expectedSide === "left" ? normalizedX : 1 - normalizedX).toBeGreaterThanOrEqual(.25);
    expect(expectedSide === "left" ? normalizedX : 1 - normalizedX).toBeLessThanOrEqual(.35);
    expect(node.active).toBe(node.currentRound === "true" ? "true" : "false");
    if (node.currentRound === "false") expect(node.className).toContain("is-prior-round");
    for (const zone of geometry.fixedZones) expect(rectanglesOverlap(node.rect, zone.rect), `${node.eventId} overlaps ${zone.name}`).toBe(false);

    const sourceEdge = sourceByEventId.get(node.eventId);
    const targetEdge = edgeByEventId.get(node.eventId);
    const sourcePath = inspectOrthogonalPath(sourceEdge.d);
    const targetPath = inspectOrthogonalPath(targetEdge.d);
    expect(sourcePath.valid, sourceEdge.d).toBe(true);
    expect(targetPath.valid, targetEdge.d).toBe(true);
    expect(sourceEdge.stroke).toBe("rgb(166, 224, 197)");
    expect(targetEdge.stroke).toBe("rgb(255, 75, 75)");
    expect(targetEdge.markerEnd).toMatch(/^url\(#/);
    const outsideSide = expectedSide === "left" ? "left" : "right";
    const expectedOutsideX = outsideSide === "left" ? node.rect.left : node.rect.right;
    expect(Math.abs(sourceEdge.end.x - expectedOutsideX)).toBeLessThanOrEqual(2);
    expect(Math.abs(sourceEdge.end.y - cardCenter.y)).toBeLessThanOrEqual(2);
    expect(Math.abs(sourceEdge.start.x - sourceEdge.end.x)).toBeGreaterThanOrEqual(20);
    expect(sourceEdge.sourceSide).toBe(expectedSide);
    expect(sourceEdge.sourceElbow).toBeTruthy();
    expect(Math.hypot(sourceEdge.start.x - sourceEdge.sourceElbow.x, sourceEdge.start.y - sourceEdge.sourceElbow.y)).toBeLessThanOrEqual(1);
    const actorHeroAnchor = geometry.heroAnchors[node.actorId]?.[0];
    expect(actorHeroAnchor).toBeTruthy();
    const trunk = geometry.responseSourceTrunks.find((edge) => edge.trunkActorId === node.actorId);
    expect(trunk).toBeTruthy();
    expect(inspectOrthogonalPath(trunk.d).valid).toBe(true);
    expect(trunk.trunkEventIds).toContain(node.eventId);
    const elbowInSvg = { x: sourceEdge.sourceElbow.x - sourceEdge.svgRect.left, y: sourceEdge.sourceElbow.y - sourceEdge.svgRect.top };
    // The seat edge may jog a few pixels to the stable trunk lane; every response fork must meet the trunk itself.
    expect(orthogonalPathContainsPoint(inspectOrthogonalPath(trunk.d), elbowInSvg)).toBe(true);
    expect([trunk.start, trunk.end].some((point) => heroEdgeMidpointDistance(point, actorHeroAnchor) <= 3), JSON.stringify({ trunk, actorHeroAnchor })).toBe(true);
    expect(trunk.trunkEventIds.every((eventId) => geometry.nodes.some((candidate) => candidate.eventId === eventId && candidate.actorId === node.actorId))).toBe(true);
    assertEndpointsStayInsideViewport(trunk, geometry.viewport, `${node.eventId} source trunk`);
    expect(sourceEdge.active).toBe(node.currentRound === "true" ? "true" : "false");
    if (node.currentRound === "false") {
      expect(sourceEdge.opacity).toBeLessThan(.5);
      expect(targetEdge.opacity).toBeLessThan(.5);
    } else if (node.latest === "true") {
      expect(sourceEdge.opacity).toBeGreaterThan(.9);
      expect(targetEdge.opacity).toBeGreaterThan(.9);
    }

    const targetNode = node.targetResponseEventId ? nodeByEventId.get(node.targetResponseEventId) : null;
    const targetHeroAnchor = !targetNode ? geometry.heroAnchors[node.targetId]?.[0] : null;
    const targetEndpoint = targetNode?.rect ?? targetHeroAnchor;
    expect(targetEndpoint).toBeTruthy();
    expect(targetNode ? touches(targetEdge, targetEndpoint, 6) : edgeTouchesHeroMidpoint(targetEdge, targetHeroAnchor), JSON.stringify({
      viewport: geometry.viewport,
      eventId: node.eventId,
      ordinal: node.ordinal,
      actorId: node.actorId,
      targetId: node.targetId,
      targetResponseEventId: node.targetResponseEventId,
      targetEdge,
      targetEndpoint,
      targetNode,
    })).toBe(true);
    assertEndpointsStayInsideViewport(sourceEdge, geometry.viewport, `${node.eventId} source branch`);
    assertEndpointsStayInsideViewport(targetEdge, geometry.viewport, `${node.eventId} target path`);
    expect(touches(targetEdge, node.rect)).toBe(true);
    if (targetNode) expect(targetEdge.targetResponseEventId).toBe(targetNode.eventId);
    assertRoutePointsStayInset(sourceEdge, geometry.viewport, "response source");
    assertRoutePointsStayInset(targetEdge, geometry.viewport, "response target");
    if (node.ordinal > 1) expect(node.targetId).toBe(proof.responses[node.ordinal - 2].responseActorId);
    if (targetEdge.end.y > targetEdge.start.y) expect(targetEdge.markerEnd).toMatch(/^url\(#/);
    if (!targetNode && targetEdge.end.y > targetEdge.start.y) {
      const lastSegment = targetPath.segments.at(-1);
      expect(lastSegment).toBeTruthy();
      expect(lastSegment.end.y).toBeGreaterThan(lastSegment.start.y);
      expect(Math.abs(lastSegment.end.x - lastSegment.start.x)).toBeLessThanOrEqual(1);
    }
    const expectedInsideX = expectedSide === "left" ? node.rect.right : node.rect.left;
    expect(Math.abs(targetEdge.start.x - expectedInsideX)).toBeLessThanOrEqual(2);
    for (const zone of geometry.fixedZones) {
      expect(pathIntersectsRect(sourceEdge, zone.rect), `${node.eventId} source path overlaps ${zone.name}`).toBe(false);
      expect(pathIntersectsRect(targetEdge, zone.rect), `${node.eventId} target path overlaps ${zone.name}`).toBe(false);
    }
  }

  const currentNodes = geometry.nodes.filter((node) => node.currentRound === "true");
  const priorNodes = geometry.nodes.filter((node) => node.currentRound === "false");
  if (currentNodes.length === 2) {
    const left = currentNodes.find((node) => node.side === "left");
    const right = currentNodes.find((node) => node.side === "right");
    expect(left).toBeTruthy();
    expect(right).toBeTruthy();
    const leftCenterX = (left.rect.left + left.rect.right) / 2;
    const rightCenterX = (right.rect.left + right.rect.right) / 2;
    expect(Math.abs((leftCenterX + rightCenterX) / 2 - geometry.duelUsable.centerX)).toBeLessThanOrEqual(2);
    expect(Math.abs((left.rect.top + left.rect.bottom) / 2 - (right.rect.top + right.rect.bottom) / 2)).toBeLessThanOrEqual(8);
  }
  if (priorNodes.length === 2) {
    expect(priorNodes.every((node) => node.rect.top > (currentNodes[0]?.rect.top ?? -Infinity))).toBe(true);
    expect(Math.abs((priorNodes[0].rect.top + priorNodes[0].rect.bottom) / 2 - (priorNodes[1].rect.top + priorNodes[1].rect.bottom) / 2)).toBeLessThanOrEqual(8);
    expect(priorNodes.map(({ side }) => side).sort()).toEqual(["left", "right"]);
    const currentSize = currentNodes[0]?.rect;
    if (currentSize) for (const node of priorNodes) {
      expect(node.rect.width / currentSize.width).toBeGreaterThanOrEqual(.84);
      expect(node.rect.width / currentSize.width).toBeLessThanOrEqual(.86);
      expect(node.rect.height / currentSize.height).toBeGreaterThanOrEqual(.84);
      expect(node.rect.height / currentSize.height).toBeLessThanOrEqual(.86);
    }
  }
  for (const edge of [...geometry.rootSourcePaths, ...geometry.rootTargetPaths, ...geometry.responseSourceTrunks]) {
    expect(inspectOrthogonalPath(edge.d).valid, edge.d).toBe(true);
    assertRoutePointsStayInset(edge, geometry.viewport, edge.className);
    for (const zone of geometry.fixedZones) expect(pathIntersectsRect(edge, zone.rect), `path overlaps ${zone.name}`).toBe(false);
  }
}

async function attachFrame(page, testInfo, name) {
  const path = testInfo.outputPath(`${name}.png`);
  await mkdir(testInfo.outputDir, { recursive: true });
  await page.screenshot({ path, fullPage: true, animations: "disabled" });
  await testInfo.attach(name, { path, contentType: "image/png" });
  return path;
}

test("test-mode Sima Yi Duel uses four real committed Attacks in one proof-backed two-row graph", async ({ page, request }, testInfo) => {
  test.setTimeout(180_000);
  const game = await createTestGame(request, page, "custom", "B1 DUEL HOST", { width: 390, height: 844 }, {
    0: ["Attack", "Attack", "Attack", "Attack"],
    1: ["Duel", "Attack", "Attack", "Dodge"],
    2: ["Attack", "Attack", "Attack", "Attack"],
    3: ["Attack", "Attack", "Attack", "Dodge"],
  }, { preferredHeroesBySeat: { 1: "simayi" } });
  const attacker = game.seats[1];
  const defender = game.seats[2];
  const observer = game.seats[3];
  const host = Object.values(game.seats).find(({ isHost }) => isHost);
  expect(host).toBeTruthy();
  expect(game.room.isTestController).toBe(true);
  expect(attacker).toMatchObject({ hero: "simayi", isTestPlayer: true, isHost: false });
  expect(defender.isTestPlayer).toBe(true);
  await expect(page.getByTestId(`test-view-switch-${attacker.id}`)).toBeVisible();
  expect(attacker).toBeTruthy();
  expect(defender).toBeTruthy();
  expect(observer).toBeTruthy();
  for (const [player, expectedAttacks] of [[attacker, 2], [defender, 4]]) {
    const openingView = await readRoom(request, game, player.id);
    expect(openingView.myHand.filter(({ kind }) => kind === "Attack"), `seat ${player.seat + 1} opens with its configured physical Attack cards; hand=${JSON.stringify(openingView.myHand.map(({ id, kind }) => ({ id, kind })))}`).toHaveLength(expectedAttacks);
  }
  expect((await readRoom(request, game, observer.id)).myHand.filter(({ kind }) => kind === "Negation")).toHaveLength(0);

  await advanceToActor(page, request, game, attacker.id);
  const attackerView = await switchViewer(page, request, game, attacker.id);
  expect(attackerView.currentAction?.actorId).toBe(attacker.id);
  expect(attackerView.myHand.filter(({ kind }) => kind === "Attack")).toHaveLength(2);
  await expect(page.locator(`.local-player-dock[data-player-anchor="${attacker.id}"] .local-hand [data-hand-card-id]`)).toHaveCount(attackerView.myHand.length);
  const hostView = await switchViewer(page, request, game, host.id);
  expect(hostView.meId).toBe(host.id);
  await expect(page.locator(`.local-player-dock[data-player-anchor="${host.id}"] .local-hand [data-hand-card-id]`)).toHaveCount(hostView.myHand.length);
  const restoredAttackerView = await switchViewer(page, request, game, attacker.id);
  expect(restoredAttackerView.currentAction?.actorId).toBe(attacker.id);
  await expect(page.locator(`.local-player-dock[data-player-anchor="${attacker.id}"] .local-hand [data-hand-card-id]`)).toHaveCount(restoredAttackerView.myHand.length);
  const duelCard = attackerView.myHand.find(({ kind }) => kind === "Duel");
  expect(duelCard, "the selected test-hand preset supplies a physical Duel to seat 2").toBeTruthy();
  await playDuel(page, request, game, attacker.id, duelCard.id, defender.name);
  const playerIds = Object.values(game.seats).map(({ id }) => id);
  const { views: initialViews, exchange: initialProof, initialNegation } = await passDuelNegationWindows(page, request, game, playerIds, testInfo, attacker.id);
  expect(initialNegation?.viewerId).toBe(attacker.id);
  expect(initialProof).toMatchObject({
    semantics: "PROVEN", responseCount: 0,
    root: { sourceId: attacker.id, targetId: defender.id, cardKind: "Duel" },
    responses: [],
  });
  for (const view of initialViews) expect(view.presentationSnapshot.duelExchange).toEqual(initialProof);
  await expect(page.locator('[data-root-action-overlay="true"]')).toHaveAttribute("data-root-action-ready", "true", { timeout: 20_000 });
  const rootCard = page.locator('[data-root-action-card="true"]');
  await expect(rootCard).toHaveAttribute("data-root-action-card-face-kind", "Duel");
  const rootPhysicalCardId = await rootCard.getAttribute("data-root-action-physical-card-id");
  const initialRootBounds = initialNegation.geometry.root;
  const frames = [];
  const screenshots = {};
  screenshots.negationOpportunity = initialNegation.screenshot;
  screenshots.negationRootView = initialNegation.rootViewerScreenshot;
  let frameThreePrior = null;
  let finalProof = initialProof;
  const duelCardIds = new Set([rootPhysicalCardId]);
  const hiddenHandIdentityChecks = [];

  for (let ordinal = 1; ordinal <= 4; ordinal += 1) {
    const actingView = await readRoom(request, game, defender.id);
    const decisionActorId = actingView.currentAction?.actorId;
    expect(decisionActorId).toBe(ordinal % 2 === 1 ? defender.id : attacker.id);
    const responderView = await switchViewer(page, request, game, decisionActorId);
    expect(responderView.currentAction).toMatchObject({ actorId: decisionActorId });
    expect(responderView.currentAction.legalActions).toContain("respond");
    const attackCard = responderView.myHand.find(({ kind }) => kind === "Attack");
    expect(attackCard, `seat ${responderView.players.find(({ id }) => id === decisionActorId)?.seat + 1} has a physical Attack for response ${ordinal}; hand=${JSON.stringify(responderView.myHand.map(({ id, kind }) => ({ id, kind })))}`).toBeTruthy();
    await respondWithAttack(page, request, game, decisionActorId, attackCard.id);
    await expect.poll(async () => (await readRoom(request, game, defender.id)).presentationSnapshot.duelExchange?.responseCount ?? 0, { timeout: 20_000 }).toBe(ordinal);
    const views = await readAllPerspectivesThroughViewerControls(page, request, game, playerIds);
    const view = views.find(({ meId }) => meId === attacker.id);
    finalProof = view?.presentationSnapshot.duelExchange;
    expect(finalProof).toMatchObject({ semantics: "PROVEN", responseCount: ordinal, root: { eventId: initialProof.root.eventId, sourceId: attacker.id, targetId: defender.id, cardKind: "Duel" } });
    for (const perspective of views) expect(perspective.presentationSnapshot.duelExchange).toEqual(finalProof);
    expect(JSON.stringify(finalProof)).not.toContain(rootPhysicalCardId);

    const latest = finalProof.responses.at(-1);
    expect(latest).toMatchObject({ ordinal, responseCardKind: "Attack", decisionActorId, responseActorId: decisionActorId });
    const responseEvents = view.timeline.filter((event) => event.id === latest.responseEventId);
    expect(responseEvents).toHaveLength(1);
    const responseEvent = responseEvents[0];
    expect(responseEvent).toMatchObject({ type: "card", action: "play", resolutionId: finalProof.root.resolutionId, card: { kind: "Attack", id: attackCard.id } });
    expect(responseEvent.duelAttackResponse).toMatchObject({
      semantics: "PROVEN", interactionId: finalProof.interactionId, rootFrameId: finalProof.rootFrameId,
      rootEventId: finalProof.root.eventId, rootResolutionId: finalProof.root.resolutionId,
      ordinal, sourceId: latest.sourceId, targetId: latest.targetId,
      decisionActorId: latest.decisionActorId, responseActorId: latest.responseActorId,
    });
    duelCardIds.add(attackCard.id);

    await switchViewer(page, request, game, attacker.id);
    const duelOverlay = page.locator('[data-root-action-overlay="true"]');
    await expect.poll(() => duelOverlay.evaluate((overlay) => {
      const rect = (element) => {
        if (!element) return null;
        const box = element.getBoundingClientRect();
        return { left: box.left, top: box.top, right: box.right, bottom: box.bottom, width: box.width, height: box.height };
      };
      return JSON.stringify({
        ready: overlay.dataset.rootActionReady,
        layout: overlay.dataset.rootActionLayoutState,
        fallback: overlay.dataset.rootActionFallbackReason ?? null,
        responseCount: overlay.dataset.rootActionResponseCount,
        visibleResponseCount: overlay.dataset.rootActionVisibleResponseCount,
        fitStep: overlay.dataset.rootActionCardFitStep,
        root: rect(overlay.querySelector('[data-root-action-card="true"]')),
        nodes: [...overlay.querySelectorAll('[data-root-action-response-node="true"]')].map((node) => ({
          eventId: node.dataset.responseEventId,
          actorId: node.dataset.responseActorId,
          side: node.dataset.responseSide,
          rect: rect(node),
        })),
        anchors: [...overlay.closest(".game-shell").querySelectorAll("[data-player-anchor]")].map((node) => ({
          playerId: node.dataset.playerAnchor,
          rect: rect(node),
        })),
        table: rect(overlay.closest(".game-shell").querySelector(".play-table")),
        dock: rect(overlay.closest(".game-shell").querySelector(".local-player-dock")),
      });
    }), { timeout: 5_000 }).toContain('"ready":"true"');
    await expect(page.locator('[data-root-action-overlay="true"]')).toHaveAttribute("data-root-action-response-count", String(ordinal));
    await waitForStableGraph(page);
    const geometry = await snapshotDuelGraph(page, playerIds);
    assertDuelGeometry(geometry, finalProof);
    expect(geometry.rootCardId).toBe(rootPhysicalCardId);
    const publicResponseCardIds = finalProof.responses.map((response) => {
      const event = view.timeline.find((candidate) => candidate.id === response.responseEventId);
      expect(event, `one public event exists for Duel response ${response.responseEventId}`).toBeTruthy();
      return event.card?.id;
    });
    expect(geometry.nodes.map(({ physicalCardId }) => physicalCardId)).toEqual(publicResponseCardIds.slice(-4));
    const rootBounds = geometry.root;
    expect(Math.abs(rootBounds.left - initialRootBounds.left)).toBeLessThanOrEqual(1);
    expect(Math.abs(rootBounds.top - initialRootBounds.top)).toBeLessThanOrEqual(1);
    expect(Math.abs(rootBounds.width - initialRootBounds.width)).toBeLessThanOrEqual(1);
    expect(Math.abs(rootBounds.height - initialRootBounds.height)).toBeLessThanOrEqual(1);
    const framePath = await attachFrame(page, testInfo, `duel-b1-real-${ordinal}-390x844-attacker`);
    screenshots[`response${ordinal}`] = framePath;

    const hiddenHandIds = views.flatMap((perspective) => perspective.myHand.map(({ id }) => id))
      .filter((id) => !duelCardIds.has(id));
    for (const hiddenCardId of hiddenHandIds) expect(geometry.overlayHtml).not.toContain(hiddenCardId);
    hiddenHandIdentityChecks.push({ ordinal, checkedViewerCount: views.length, checkedHandCount: hiddenHandIds.length, leakedIdentity: false });
    const frameEvidence = {
      ordinal,
      publicProof: {
        rootEventId: finalProof.root.eventId,
        rootResolutionId: finalProof.root.resolutionId,
        sourceId: finalProof.root.sourceId,
        targetId: finalProof.root.targetId,
        responseEventId: latest.responseEventId,
        decisionActorId: latest.decisionActorId,
        responseActorId: latest.responseActorId,
        responseTargetId: latest.targetId,
        physicalCardId: responseEvent.card.id,
      },
      geometry: { ...geometry, overlayHtml: undefined },
      screenshot: framePath,
      forkCoordinates: [],
    };
    frames.push(frameEvidence);
    if (ordinal === 3) frameThreePrior = geometry.nodes.filter((node) => node.currentRound === "false");
    if (ordinal === 4) {
      for (const oldNode of frameThreePrior ?? []) {
        const currentNode = geometry.nodes.find(({ eventId }) => eventId === oldNode.eventId);
        expect(currentNode?.rect).toEqual(oldNode.rect);
        const priorSource = frames[2].geometry.responseSourcePaths.find(({ eventId }) => eventId === oldNode.eventId);
        const currentSource = geometry.responseSourcePaths.find(({ eventId }) => eventId === oldNode.eventId);
        const priorTarget = frames[2].geometry.responseTargetPaths.find(({ eventId }) => eventId === oldNode.eventId);
        const currentTarget = geometry.responseTargetPaths.find(({ eventId }) => eventId === oldNode.eventId);
        const oldSourcePath = inspectOrthogonalPath(priorSource.d);
        const newSourcePath = inspectOrthogonalPath(currentSource.d);
        expect(newSourcePath.commands).toEqual(oldSourcePath.commands);
        expect(newSourcePath.elbows).toEqual(oldSourcePath.elbows);
        expect(currentSource.opacity).toBe(priorSource.opacity);
        expect(currentSource.stroke).toBe(priorSource.stroke);
        expect(currentSource.strokeWidth).toBe(priorSource.strokeWidth);
        expect(Math.hypot(newSourcePath.endPoint.x - oldSourcePath.endPoint.x, newSourcePath.endPoint.y - oldSourcePath.endPoint.y)).toBeLessThanOrEqual(1);
        const sourceAnchorBefore = frames[2].geometry.anchors[oldNode.actorId][0];
        const sourceAnchorAfter = geometry.anchors[oldNode.actorId][0];
        const sourceAnchorShift = Math.max(Math.abs(sourceAnchorAfter.left - sourceAnchorBefore.left),
          Math.abs(sourceAnchorAfter.top - sourceAnchorBefore.top), Math.abs(sourceAnchorAfter.right - sourceAnchorBefore.right),
          Math.abs(sourceAnchorAfter.bottom - sourceAnchorBefore.bottom));
        expect(Math.hypot(currentSource.start.x - priorSource.start.x, currentSource.start.y - priorSource.start.y))
          .toBeLessThanOrEqual(sourceAnchorShift + .2);
        const oldTargetPath = inspectOrthogonalPath(priorTarget.d);
        const newTargetPath = inspectOrthogonalPath(currentTarget.d);
        expect(newTargetPath.commands).toEqual(oldTargetPath.commands);
        expect(newTargetPath.elbows).toEqual(oldTargetPath.elbows);
        expect(currentTarget.opacity).toBe(priorTarget.opacity);
        expect(currentTarget.stroke).toBe(priorTarget.stroke);
        expect(currentTarget.strokeWidth).toBe(priorTarget.strokeWidth);
        expect(Math.hypot(currentTarget.start.x - priorTarget.start.x, currentTarget.start.y - priorTarget.start.y)).toBeLessThanOrEqual(1);
        if (priorTarget.targetResponseEventId) {
          expect(currentTarget.d).toBe(priorTarget.d);
          expect(Math.hypot(currentTarget.end.x - priorTarget.end.x, currentTarget.end.y - priorTarget.end.y)).toBeLessThanOrEqual(1);
        } else {
          const targetAnchorBefore = frames[2].geometry.anchors[oldNode.targetId][0];
          const targetAnchorAfter = geometry.anchors[oldNode.targetId][0];
          const targetAnchorShift = Math.max(Math.abs(targetAnchorAfter.left - targetAnchorBefore.left),
            Math.abs(targetAnchorAfter.top - targetAnchorBefore.top), Math.abs(targetAnchorAfter.right - targetAnchorBefore.right),
            Math.abs(targetAnchorAfter.bottom - targetAnchorBefore.bottom));
          expect(Math.hypot(currentTarget.end.x - priorTarget.end.x, currentTarget.end.y - priorTarget.end.y))
            .toBeLessThanOrEqual(targetAnchorShift + .2);
        }
      }
      const priorFirst = geometry.nodes.find(({ ordinal: cardOrdinal }) => cardOrdinal === 1);
      const currentFirstRoundCard = frames[1].geometry.nodes.find(({ ordinal: cardOrdinal }) => cardOrdinal === 1);
      expect(priorFirst?.rect.top).toBeGreaterThan(currentFirstRoundCard.rect.top);
      expect(priorFirst.rect.width / currentFirstRoundCard.rect.width).toBeCloseTo(.85, 2);
      for (const pair of [[1, 3], [2, 4]]) {
        const older = frames[2].geometry.responseSourcePaths.find(({ eventId }) => eventId === finalProof.responses[pair[0] - 1].responseEventId);
        const newer = geometry.responseSourcePaths.find(({ eventId }) => eventId === finalProof.responses[pair[1] - 1].responseEventId);
        expect(older.actorId).toBe(newer.actorId);
        const trunk = geometry.responseSourceTrunks.find(({ trunkActorId }) => trunkActorId === newer.actorId);
        expect(trunk).toBeTruthy();
        expect(trunk.trunkEventIds).toContain(older.eventId);
        expect(trunk.trunkEventIds).toContain(newer.eventId);
        const historicalJunction = {
          x: older.sourceElbow.x - older.svgRect.left,
          y: older.sourceElbow.y - older.svgRect.top,
        };
        const currentFork = {
          x: newer.sourceElbow.x - newer.svgRect.left,
          y: newer.sourceElbow.y - newer.svgRect.top,
        };
        const trunkPath = inspectOrthogonalPath(trunk.d);
        expect(orthogonalPathContainsPoint(trunkPath, historicalJunction), JSON.stringify({ pair, historicalJunction, trunk: trunk.d })).toBe(true);
        expect(orthogonalPathContainsPoint(trunkPath, currentFork), JSON.stringify({ pair, currentFork, trunk: trunk.d })).toBe(true);
        expect(Math.abs(currentFork.x - historicalJunction.x)).toBeLessThanOrEqual(1);
        frameEvidence.forkCoordinates.push({
          actorId: newer.actorId,
          previousEventId: older.eventId,
          currentEventId: newer.eventId,
          trunkPath: trunk.d,
          historicalJunction,
          currentFork,
          branchPath: newer.d,
        });
      }
    }
  }

  for (const viewport of duelViewports.slice(1)) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await waitForStableGraph(page);
    const geometry = await snapshotDuelGraph(page, playerIds);
    assertDuelGeometry(geometry, finalProof);
    const screenshot = await attachFrame(page, testInfo, `duel-b1-real-final-${viewport.name}-attacker`);
    screenshots[`final-${viewport.name}`] = screenshot;
    frames.push({ ordinal: 4, viewport: geometry.viewport, geometry: { ...geometry, overlayHtml: undefined }, screenshot });
  }

  const finalViewScreenshots = {};
  for (const [perspective, player] of [["host", host], ["simayi", attacker], ["defender", defender], ["observer", observer]]) {
    await page.setViewportSize({ width: 390, height: 844 });
    const perspectiveRoom = await switchViewer(page, request, game, player.id);
    expect(perspectiveRoom.presentationSnapshot.duelExchange).toEqual(finalProof);
    await waitForStableGraph(page);
    const geometry = await snapshotDuelGraph(page, playerIds);
    assertDuelGeometry(geometry, finalProof);
    const screenshot = await attachFrame(page, testInfo, `duel-b1-real-final-390x844-${perspective}`);
    finalViewScreenshots[perspective] = { playerId: player.id, meId: perspectiveRoom.meId, screenshot, geometry: { ...geometry, overlayHtml: undefined } };
    const privateIds = perspectiveRoom.myHand.map(({ id }) => id).filter((id) => !duelCardIds.has(id));
    for (const hiddenCardId of privateIds) expect(geometry.overlayHtml).not.toContain(hiddenCardId);
  }

  const evidencePath = testInfo.outputPath("duel-b1-real-test-mode-evidence.json");
  await writeFile(evidencePath, JSON.stringify({
    kind: "real test-mode server-backed gameplay; no seeded-game endpoint",
    presetId: "duel_chain",
    testSeatClassification: {
      host: { id: host.id, isHost: host.isHost, isTestPlayer: host.isTestPlayer },
      simaYi: { id: attacker.id, hero: attacker.hero, isHost: attacker.isHost, isTestPlayer: attacker.isTestPlayer },
      roomIsTestController: game.room.isTestController,
      switchControl: "test-view-switch-<generated-Sima-Yi-seat-id>",
    },
    viewportFrames: frames,
    root: {
      eventId: finalProof.root.eventId,
      resolutionId: finalProof.root.resolutionId,
      interactionId: finalProof.interactionId,
      rootFrameId: finalProof.rootFrameId,
      sourceId: attacker.id,
      targetId: defender.id,
      physicalCardId: rootPhysicalCardId,
      responseEventIds: finalProof.responses.map(({ responseEventId }) => responseEventId),
    },
    responses: finalProof.responses.map((response) => ({
      ordinal: response.ordinal,
      eventId: response.responseEventId,
      decisionActorId: response.decisionActorId,
      responseActorId: response.responseActorId,
      targetId: response.targetId,
      cardKind: response.responseCardKind,
      physicalCardId: frames.find((frame) => frame.ordinal === response.ordinal)?.publicProof.physicalCardId ?? null,
    })),
    screenshots,
    finalViewScreenshots,
    viewerProofsEqual: true,
    hiddenHandIdentityChecks,
    fixtureSeedEndpointUsed: false,
  }, null, 2));
  await testInfo.attach("duel-b1-real-test-mode-evidence.json", { path: evidencePath, contentType: "application/json" });
});

test("test-mode real Attack→Dodge keeps its balanced root and routes at four viewport widths", async ({ page, request }, testInfo) => {
  test.setTimeout(180_000);
  const game = await createTestGame(request, page, "attack_dodge", "B1 ATTACK HOST");
  const attacker = game.seats[0];
  const defender = game.seats[1];
  const observer = game.seats[2];
  const playerIds = Object.values(game.seats).map(({ id }) => id);
  expect(attacker).toBeTruthy();
  expect(defender).toBeTruthy();
  expect(observer).toBeTruthy();

  const actingView = await advanceToActor(page, request, game, attacker.id);
  expect(actingView.currentAction?.actorId).toBe(attacker.id);
  const attackerView = await switchViewer(page, request, game, attacker.id);
  const attackCard = attackerView.myHand.find(({ kind }) => kind === "Attack");
  expect(attackCard).toBeTruthy();
  await playAttack(page, request, game, attacker.id, attackCard.id, defender.name);
  const beforeViews = await readAllPerspectivesThroughViewerControls(page, request, game, playerIds);
  const rootAction = beforeViews[0].presentationSnapshot.rootAction;
  expect(rootAction).toMatchObject({ action: "ATTACK", cardKind: "Attack", sourceId: attacker.id, targetId: defender.id });
  for (const view of beforeViews) expect(view.presentationSnapshot.rootAction).toEqual(rootAction);
  const rootEvent = beforeViews[0].timeline.find(({ id }) => id === rootAction.rootEventId);
  expect(rootEvent).toMatchObject({ type: "card", action: "play", card: { id: attackCard.id, kind: "Attack" } });
  await switchViewer(page, request, game, attacker.id);

  const beforeByViewport = {};
  const afterByViewport = {};
  const screenshots = {};
  for (const viewport of duelViewports) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await expect(page.locator('[data-root-action-overlay="true"]')).toHaveAttribute("data-root-action-ready", "true");
    await waitForStableGraph(page);
    const geometry = await snapshotAttackDodgeGeometry(page, playerIds);
    assertAttackDodgeGeometry(geometry, { sourceId: attacker.id, targetId: defender.id, requireDodge: false });
    expect(geometry.eventId).toBe(rootAction.rootEventId);
    expect(geometry.rootCardId).toBe(attackCard.id);
    beforeByViewport[viewport.width] = geometry;
    screenshots[`attack-only-${viewport.name}`] = await attachFrame(page, testInfo, `attack-dodge-real-before-${viewport.name}`);
  }

  const defenderView = await switchViewer(page, request, game, defender.id);
  expect(defenderView.currentAction).toMatchObject({ kind: "response", actorId: defender.id, requirement: "dodge" });
  const dodgeCard = defenderView.myHand.find(({ kind }) => kind === "Dodge");
  expect(dodgeCard).toBeTruthy();
  await respondWithDodge(page, request, game, defender.id, dodgeCard.id);
  await expect.poll(async () => (await readRoom(request, game, observer.id)).presentationSnapshot?.attackDodgeResponses?.length ?? 0, { timeout: 20_000 }).toBe(1);
  const afterViews = await readAllPerspectivesThroughViewerControls(page, request, game, playerIds);
  const responseProof = afterViews[0].presentationSnapshot.attackDodgeResponses[0];
  expect(afterViews.every((view) => view.presentationSnapshot.attackDodgeResponses.length === 1
    && JSON.stringify(view.presentationSnapshot.attackDodgeResponses[0]) === JSON.stringify(responseProof))).toBe(true);
  expect(responseProof).toMatchObject({
    semantics: "PROVEN", counterRelation: "BLOCKS_TARGET_EFFECT",
    interactionId: rootAction.interactionId, rootFrameId: rootAction.rootFrameId,
    rootEventId: rootAction.rootEventId, rootSourceId: attacker.id, targetId: defender.id,
    responseActorId: defender.id, rootCardKind: "Attack", responseCardKind: "Dodge",
  });
  expect(JSON.stringify(responseProof)).not.toContain(dodgeCard.id);
  const responseEvent = afterViews[0].timeline.find(({ id }) => id === responseProof.responseEventId);
  expect(responseEvent).toMatchObject({
    type: "card", action: "play", resolutionId: responseProof.rootResolutionId,
    card: { id: dodgeCard.id, kind: "Dodge" },
  });
  await switchViewer(page, request, game, attacker.id);

  for (const viewport of duelViewports) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await expect(page.locator('[data-root-action-overlay="true"]')).toHaveAttribute("data-root-action-ready", "true");
    await waitForStableGraph(page);
    const geometry = await snapshotAttackDodgeGeometry(page, playerIds);
    assertAttackDodgeGeometry(geometry, { sourceId: attacker.id, targetId: defender.id, expectedDodgeId: dodgeCard.id, requireDodge: true });
    expect(geometry.eventId).toBe(rootAction.rootEventId);
    expect(geometry.interactionId).toBe(rootAction.interactionId);
    expect(geometry.rootFrameId).toBe(rootAction.rootFrameId);
    expect(geometry.responseEventId).toBe(responseProof.responseEventId);
    expect(geometry.rootCardId).toBe(attackCard.id);
    const before = beforeByViewport[viewport.width];
    expect(Math.abs(geometry.root.left - before.root.left), JSON.stringify({ viewport, before: before.root, after: geometry.root })).toBeLessThanOrEqual(1);
    expect(Math.abs(geometry.root.top - before.root.top), JSON.stringify({ viewport, before: before.root, after: geometry.root })).toBeLessThanOrEqual(1);
    expect(Math.abs(geometry.root.width - before.root.width)).toBeLessThanOrEqual(1);
    expect(Math.abs(geometry.root.height - before.root.height)).toBeLessThanOrEqual(1);
    const privateHandIds = afterViews.find(({ meId }) => meId === attacker.id).myHand.map(({ id }) => id)
      .concat(afterViews.find(({ meId }) => meId === defender.id).myHand.map(({ id }) => id))
      .filter((id) => id !== attackCard.id && id !== dodgeCard.id);
    for (const privateId of privateHandIds) expect(geometry.overlayHtml).not.toContain(privateId);
    afterByViewport[viewport.width] = geometry;
    screenshots[`attack-dodge-${viewport.name}`] = await attachFrame(page, testInfo, `attack-dodge-real-after-${viewport.name}`);
  }

  const evidencePath = testInfo.outputPath("attack-dodge-real-test-mode-balance-evidence.json");
  await writeFile(evidencePath, JSON.stringify({
    kind: "real test-mode Attack then committed server-proven Dodge; API-created room, no seeded-game endpoint",
    presetId: "attack_dodge",
    root: { ...rootAction, physicalCardId: attackCard.id },
    response: {
      eventId: responseProof.responseEventId, physicalCardId: dodgeCard.id,
      actorId: responseProof.responseActorId, rootEventId: responseProof.rootEventId,
      rootResolutionId: responseProof.rootResolutionId, counterRelation: responseProof.counterRelation,
    },
    beforeByViewport,
    afterByViewport,
    screenshots,
    viewerProofsEqual: true,
    fixtureSeedEndpointUsed: false,
  }, null, 2));
  await testInfo.attach("attack-dodge-real-test-mode-balance-evidence.json", { path: evidencePath, contentType: "application/json" });
});
