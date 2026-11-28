import { expect, test } from "@playwright/test";

const API = "http://127.0.0.1:3137";

function safeHeroProjection(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return null;
  const room = payload.room && typeof payload.room === "object" ? payload.room : payload;
  if (!room || typeof room !== "object" || Array.isArray(room)) return null;
  const players = Array.isArray(room.players) ? room.players : [];
  const seatOrdinal = (playerId) => {
    if (typeof playerId !== "string") return null;
    const player = players.find((candidate) => candidate?.id === playerId);
    if (!player) return null;
    return Number.isInteger(player.seat) ? player.seat + 1 : players.indexOf(player) + 1;
  };
  const safeStatus = ["lobby", "heroes", "started", "playing", "finished"].includes(room.status) ? room.status : "other";
  const safePhase = typeof room.phase === "string" && /^[a-z0-9_-]{1,32}$/i.test(room.phase) ? room.phase : null;
  return {
    status: safeStatus,
    phase: safePhase,
    viewerSeatOrdinal: seatOrdinal(room.meId),
    actionSeatOrdinal: seatOrdinal(room.actionPlayerId),
    isMyAction: typeof room.isMyAction === "boolean" ? room.isMyAction : null,
    isTestController: typeof room.isTestController === "boolean" ? room.isTestController : null,
    isTestRoom: typeof room.isTestRoom === "boolean" ? room.isTestRoom : null,
    playerCount: players.length,
    readyCount: players.filter((player) => player?.generalReady === true).length,
    myHeroOptionsCount: Array.isArray(room.myHeroOptions) ? room.myHeroOptions.length : null,
  };
}

test("ROOM-6P-GATE-01 mobile room creation offers six seats and reaches a server-authoritative game", async ({ page, request }) => {
  const playerName = "P1 REAL HOST";
  const heroDiagnostics = [];
  const pendingDiagnosticReads = new Set();
  const renderSignals = [];
  let activeHeroSelection = null;
  page.on("pageerror", (error) => {
    renderSignals.push({ kind: "pageerror", type: ["TypeError", "ReferenceError", "SyntaxError"].includes(error.name) ? error.name : "Error" });
  });
  page.on("console", (message) => {
    if (message.type() === "error") renderSignals.push({ kind: "console-error" });
  });
  page.on("response", (response) => {
    let url;
    try { url = new URL(response.url()); } catch { return; }
    if (url.origin !== API || url.pathname !== "/api/rooms") return;
    const request = response.request();
    const method = request.method();
    if (method !== "GET") return;
    const event = { selection: activeHeroSelection, transport: "room-read", statusCode: response.status(), projection: null, errorCategory: null };
    heroDiagnostics.push(event);
    const pending = response.json().then((payload) => {
      event.projection = safeHeroProjection(payload);
      if (payload?.error) event.errorCategory = response.status() >= 500 ? "server-error" : "request-rejected";
      else if (!event.projection) event.errorCategory = response.status() >= 500 ? "server-error" : "room-projection-missing";
    }).catch(() => {
      event.errorCategory = "invalid-json";
    }).finally(() => pendingDiagnosticReads.delete(pending));
    pendingDiagnosticReads.add(pending);
  });

  async function emitHeroFailureDiagnostics(selection, error) {
    await Promise.all([...pendingDiagnosticReads]);
    const browserEvidence = await page.evaluate(() => {
      const visible = (element) => Boolean(element && element.getClientRects().length > 0 && getComputedStyle(element).visibility !== "hidden");
      const heroShell = document.querySelector(".hero-shell");
      const choiceGrid = document.querySelector(".hero-choice-grid");
      const selectButtons = Array.from(document.querySelectorAll('.hero-choice-grid button[aria-label^="Select "]'));
      const confirm = document.querySelector(".hero-confirm button");
      const connection = document.querySelector(".room-connection-status");
      const alert = document.querySelector(".hero-error[role='alert']");
      const ui = {
        heroShellVisible: visible(heroShell),
        choiceGridVisible: visible(choiceGrid),
        heroOptionNodeCount: document.querySelectorAll(".hero-choice-grid [data-hero-id]").length,
        visibleSelectButtonCount: selectButtons.filter(visible).length,
        chosenWaitVisible: visible(document.querySelector(".chosen-wait")),
        testHeroPickerVisible: visible(document.querySelector(".test-hero-picker")),
        confirmVisible: visible(confirm),
        confirmDisabled: confirm ? confirm.disabled : null,
        busyIndicator: confirm ? confirm.textContent?.trim() === "Locking in…" : null,
        connectionInterrupted: visible(connection),
        heroErrorVisible: visible(alert),
      };
      let trace = null;
      try {
        const documentValue = JSON.parse(sessionStorage.getItem("wtk.game-ux-trace.document.v2") ?? "null");
        if (documentValue?.schema === "wtk-game-ux-trace" && Array.isArray(documentValue.entries)) {
          trace = documentValue.entries.flatMap((entry) => {
            if (!entry || typeof entry !== "object" || !["gameplay-action-request", "gameplay-action-response", "room-action-published"].includes(entry.stage)) return [];
            const data = entry.data && typeof entry.data === "object" ? entry.data : {};
            if (data.action !== "choose_hero") return [];
            return [{
              stage: entry.stage,
              elapsedMs: Number.isFinite(entry.elapsedMs) ? entry.elapsedMs : null,
              ...(Number.isInteger(data.status) ? { statusCode: data.status } : {}),
              ...(typeof data.ok === "boolean" ? { ok: data.ok } : {}),
              ...(typeof data.roomReturned === "boolean" ? { roomReturned: data.roomReturned } : {}),
              ...(typeof data.stale === "boolean" ? { stale: data.stale } : {}),
            }];
          }).slice(-24);
        }
      } catch {
        trace = null;
      }
      return { ui, trace };
    });
    const { ui, trace } = browserEvidence;
    const latestProjection = [...heroDiagnostics].reverse().find((event) => event.projection)?.projection ?? null;
    const choiceResponseCount = trace?.filter((event) => event.stage === "gameplay-action-response").length ?? 0;
    const publishedChoiceCount = trace?.filter((event) => event.stage === "room-action-published").length ?? 0;
    const publicationEvidence = latestProjection && latestProjection.status === "heroes"
      ? latestProjection.isMyAction === false || latestProjection.myHeroOptionsCount === 0
        ? ui.chosenWaitVisible ? "ui-matches-authoritative-waiting-view" : "ui-does-not-match-authoritative-waiting-view"
        : ui.choiceGridVisible && ui.heroOptionNodeCount === latestProjection.myHeroOptionsCount
          ? "rendered-option-count-matches-authoritative-view"
          : "render-does-not-match-authoritative-action-view"
      : "no-authoritative-hero-view-observed";
    const failureType = error?.name === "TimeoutError" ? "assertion-timeout" : "assertion-failure";
    console.log("[UX3-FE-07A] sanitized hero selection diagnostics", JSON.stringify({
      failedSelectionOrdinal: selection + 1,
      failureType,
      gatewayEpoch: "not-exposed-to-browser-test",
      gatewayGeneration: "not-exposed-to-browser-test",
      postPublicationEvidence: trace === null ? "trace-unavailable" : choiceResponseCount === 0
        ? "no-choice-response-observed-in-trace"
        : publishedChoiceCount === choiceResponseCount
          ? "all-observed-choice-responses-published"
          : "at-least-one-choice-response-not-followed-by-publish-event",
      publicationEvidence,
      authoritativeAndTransportEvents: heroDiagnostics.slice(-12),
      ui,
      renderSignalCategories: renderSignals.slice(-8),
      safeGatewayTrace: trace,
    }));
  }

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${API}/`);
  await expect(page.getByPlaceholder("Enter your name")).toBeVisible();
  await expect(page.locator(".entry-title")).toContainText("4–6 players");
  await page.getByPlaceholder("Enter your name").fill(playerName);
  await expect(page.getByRole("button", { name: "Host Game", exact: true })).toBeEnabled();

  const createResponse = page.waitForResponse((response) => {
    if (response.url() !== `${API}/api/rooms` || response.request().method() !== "POST") return false;
    try { return JSON.parse(response.request().postData() ?? "{}").action === "create"; }
    catch { return false; }
  });
  await page.getByRole("button", { name: "Host Game", exact: true }).click();
  const response = await createResponse;
  expect(response.status()).toBe(201);

  const body = await response.json();
  expect(body.token).toEqual(expect.any(String));
  expect(body.room).toMatchObject({ status: "lobby", isHost: true, maxPlayers: 6 });
  expect(body.room.players).toHaveLength(1);
  expect(body.room.players[0]).toMatchObject({ id: body.room.meId, name: playerName, isHost: true });

  await expect(page.getByRole("heading", { name: "Waiting room" })).toBeVisible();
  await expect(page.locator(".seat-grid .seat")).toHaveCount(6);
  await expect(page.locator(".room b")).toHaveText(body.room.code);
  await expect(page.locator(".seat.filled b")).toHaveText(playerName);
  await expect(page.locator(".lobby-actions")).toContainText("1 / 6 players");

  const submitted = JSON.parse(response.request().postData());
  expect(submitted).toMatchObject({ action: "create", name: playerName });
  expect(submitted).not.toHaveProperty("currentAction");
  expect(submitted).not.toHaveProperty("presentationSnapshot");

  const session = await page.evaluate(() => JSON.parse(localStorage.getItem("three-realms-session") ?? "null"));
  expect(session).toEqual({ code: body.room.code, token: body.token, name: playerName });

  const projectionResponse = await request.get(`${API}/api/rooms?${new URLSearchParams({ code: body.room.code, token: body.token })}`);
  expect(projectionResponse.ok()).toBe(true);
  const projection = await projectionResponse.json();
  expect(projection).toMatchObject({ code: body.room.code, status: "lobby", isHost: true, meId: body.room.meId });
  expect(projection.players).toHaveLength(1);
  expect(projection.players[0]).toMatchObject({ id: body.room.meId, name: playerName });

  await page.getByRole("button", { name: /Add 3 Test Players/ }).click();
  await expect(page.locator(".lobby-actions")).toContainText("4 / 6 players");
  await page.getByRole("button", { name: "Start game" }).click();
  await expect(page.locator(".hero-shell")).toBeVisible();

  let playingRoom;
  for (let selection = 0; selection < 4; selection += 1) {
    activeHeroSelection = selection + 1;
    const candidate = page.getByRole("button", { name: /^Select / }).first();
    try {
      await expect(candidate).toBeVisible();
    } catch (error) {
      await emitHeroFailureDiagnostics(selection, error);
      throw error;
    }
    await expect(candidate).toBeEnabled();
    await candidate.click();

    const confirm = page.getByRole("button", { name: /^Confirm / });
    await expect(confirm).toBeEnabled();
    const heroResponsePromise = page.waitForResponse((candidateResponse) => {
      if (candidateResponse.url() !== `${API}/api/rooms` || candidateResponse.request().method() !== "POST") return false;
      try { return JSON.parse(candidateResponse.request().postData() ?? "{}").action === "choose_hero"; }
      catch { return false; }
    });
    await confirm.click();
    const heroResponse = await heroResponsePromise;
    expect(heroResponse.status()).toBe(200);
    const submittedHeroChoice = JSON.parse(heroResponse.request().postData() ?? "{}");
    expect(submittedHeroChoice).toMatchObject({ action: "choose_hero", code: body.room.code, token: body.token });
    expect(submittedHeroChoice).not.toHaveProperty("currentAction");
    expect(submittedHeroChoice).not.toHaveProperty("presentationSnapshot");
    playingRoom = (await heroResponse.json()).room;
    heroDiagnostics.push({ selection: selection + 1, transport: "choose_hero", statusCode: heroResponse.status(), projection: safeHeroProjection(playingRoom), errorCategory: null });
    expect(playingRoom.players.filter((player) => player.generalReady)).toHaveLength(selection + 1);
    expect(playingRoom.status).toBe(selection === 3 ? "playing" : "heroes");

    if (selection < 3) {
      const projectedOptionIds = playingRoom.myHeroOptions.map((hero) => hero.id);
      await expect.poll(async () => page.locator(".hero-choice-grid [data-hero-id]").evaluateAll((elements) => elements.map((element) => element.getAttribute("data-hero-id")))).toEqual(projectedOptionIds);
    }
  }

  expect(playingRoom.currentAction).toBeTruthy();
  expect(playingRoom.actionRevision).toBeTruthy();
  await expect(page.locator(".game-shell")).toBeVisible();
  await expect(page.locator(`[data-player-anchor="${playingRoom.meId}"]`)).toBeVisible();
});
