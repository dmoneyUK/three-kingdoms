import { expect, test } from "@playwright/test";

test("mobile browser creates a Staging room and rejoins it after refresh", async ({ page, request }) => {
  const healthResponse = await request.get("/api/health");
  expect(healthResponse.status()).toBe(200);
  expect(await healthResponse.json()).toMatchObject({ ok: true, worker: "available" });

  const playerName = `STAGING REJOIN ${Date.now().toString(36).toUpperCase().slice(-4)}`;
  await page.goto("/");
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
  expect(rejoinedRoom.status).toBe("lobby");

  await expect(page.locator(".lobby-shell")).toBeVisible();
  await expect(page.locator(".room b")).toHaveText(roomCode);
  await expect(page.locator(".seat.filled b")).toContainText("STAGING REJOIN");
});
