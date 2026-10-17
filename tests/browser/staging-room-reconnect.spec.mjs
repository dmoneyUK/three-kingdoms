import { expect, test } from "@playwright/test";

test("mobile browser creates a Staging room and rejoins it after refresh", async ({ page, request }) => {
  const expectedBuildSha = process.env.NEXT_PUBLIC_BUILD_SHA;
  if (process.env.CI === "true" && !/^[0-9a-f]{40}$/.test(expectedBuildSha ?? "")) {
    throw new Error("NEXT_PUBLIC_BUILD_SHA must identify the current CI commit");
  }
  if (expectedBuildSha && !/^[0-9a-f]{40}$/.test(expectedBuildSha)) {
    throw new Error("NEXT_PUBLIC_BUILD_SHA must be a full 40-character commit SHA");
  }

  const healthResponse = await request.get("/api/health");
  expect(healthResponse.status()).toBe(200);
  expect(await healthResponse.json()).toMatchObject({ ok: true, worker: "available" });

  const playerName = `STAGING REJOIN ${Date.now().toString(36).toUpperCase().slice(-4)}`;
  await page.goto("/", { waitUntil: "networkidle" });
  await expect(page.getByPlaceholder("Enter your name")).toBeVisible();
  await page.getByPlaceholder("Enter your name").fill(playerName);
  await expect(page.getByRole("button", { name: "Host Game", exact: true })).toBeEnabled();

  const createResponsePromise = page.waitForResponse((response) => {
    if (new URL(response.url()).pathname !== "/api/rooms" || response.request().method() !== "POST") return false;
    try { return JSON.parse(response.request().postData() ?? "{}").action === "create"; }
    catch { return false; }
  });
  await page.getByRole("button", { name: "Host Game", exact: true }).click();
  const createResponse = await createResponsePromise;
  expect(createResponse.status()).toBe(201);
  const created = await createResponse.json();
  expect(typeof created?.room?.code).toBe("string");
  expect(created?.room?.status).toBe("lobby");
  expect(created?.room?.players).toHaveLength(1);
  expect(created?.token?.length > 0).toBe(true);

  await expect(page.locator(".lobby-shell")).toBeVisible();
  const roomCode = created.room.code;
  await expect(page.locator(".room b")).toHaveText(roomCode);
  await expect(page.locator(".seat.filled b")).toContainText("STAGING REJOIN");

  const storedSession = await page.evaluate(() => {
    const session = JSON.parse(localStorage.getItem("three-realms-session") ?? "null");
    return {
      code: session?.code,
      name: session?.name,
      tokenPresent: typeof session?.token === "string" && session.token.length > 0,
    };
  });
  expect(storedSession.code).toBe(roomCode);
  expect(storedSession.name).toBe(playerName);
  expect(storedSession.tokenPresent).toBe(true);

  await page.getByRole("button", { name: /Add 3 Test Players/ }).click();
  await expect(page.locator(".lobby-actions")).toContainText("4 / 8 players");
  await page.getByRole("button", { name: "Start game" }).click();
  await expect(page.locator(".hero-shell")).toBeVisible();

  let currentRoom;
  for (let selection = 0; selection < 4; selection += 1) {
    const candidate = page.getByRole("button", { name: /^Select / }).first();
    await expect(candidate).toBeEnabled();
    await candidate.click();
    const confirm = page.getByRole("button", { name: /^Confirm / });
    await expect(confirm).toBeEnabled();

    const heroResponsePromise = page.waitForResponse((response) => {
      if (new URL(response.url()).pathname !== "/api/rooms" || response.request().method() !== "POST") return false;
      try { return JSON.parse(response.request().postData() ?? "{}").action === "choose_hero"; }
      catch { return false; }
    });
    await confirm.click();
    const heroResponse = await heroResponsePromise;
    expect(heroResponse.status()).toBe(200);
    currentRoom = (await heroResponse.json()).room;
    expect(currentRoom.status).toBe(selection === 3 ? "playing" : "heroes");
  }

  await expect(page.locator(".game-shell")).toBeVisible();
  if (expectedBuildSha) await expect(page.locator(".stage-system-build-sha")).toHaveAttribute("data-build-sha", expectedBuildSha);

  const rejoinResponsePromise = page.waitForResponse((response) => {
    const url = new URL(response.url());
    return url.pathname === "/api/rooms"
      && response.request().method() === "GET"
      && url.searchParams.has("code")
      && url.searchParams.has("token");
  });
  await page.reload();
  const rejoinResponse = await rejoinResponsePromise;
  expect(rejoinResponse.status()).toBe(200);
  const rejoined = await rejoinResponse.json();
  const rejoinedRoom = rejoined.room ?? rejoined;
  expect(rejoinedRoom.code).toBe(roomCode);
  expect(rejoinedRoom.status).toBe("playing");

  await expect(page.locator(".game-shell")).toBeVisible();
  await expect(page.locator(".room b")).toHaveText(roomCode);
  if (expectedBuildSha) await expect(page.locator(".stage-system-build-sha")).toHaveAttribute("data-build-sha", expectedBuildSha);
});
