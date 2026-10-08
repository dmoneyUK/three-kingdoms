import { expect, test } from "@playwright/test";

const API = "http://127.0.0.1:3137";

test("Host Game creates a real room and reaches the server-authoritative game page", async ({ page, request }) => {
  const playerName = "P1 REAL HOST";
  await page.goto(`${API}/`);
  await expect(page.getByPlaceholder("Enter your name")).toBeVisible();
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
  expect(body.room).toMatchObject({ status: "lobby", isHost: true, maxPlayers: 8 });
  expect(body.room.players).toHaveLength(1);
  expect(body.room.players[0]).toMatchObject({ id: body.room.meId, name: playerName, isHost: true });

  await expect(page.getByRole("heading", { name: "Waiting room" })).toBeVisible();
  await expect(page.locator(".room b")).toHaveText(body.room.code);
  await expect(page.locator(".seat.filled b")).toHaveText(playerName);
  await expect(page.locator(".lobby-actions")).toContainText("1 / 8 players");

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
  await expect(page.locator(".lobby-actions")).toContainText("4 / 8 players");
  await page.getByRole("button", { name: "Start game" }).click();
  await expect(page.locator(".hero-shell")).toBeVisible();

  let playingRoom;
  for (let selection = 0; selection < 4; selection += 1) {
    const candidate = page.getByRole("button", { name: /^Select / }).first();
    await expect(candidate).toBeVisible();
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
