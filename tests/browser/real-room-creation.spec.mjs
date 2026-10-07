import { expect, test } from "@playwright/test";

const API = "http://127.0.0.1:3137";

test("Host Game reaches the production page with server-generated match authority", async ({ page }) => {
  await page.goto(`${API}/`);
  await page.getByPlaceholder("Enter your name").fill("ROOM FLOW TEST");
  await page.getByRole("button", { name: "Host Game" }).click();

  await expect(page.locator(".lobby-shell")).toBeVisible();
  await page.getByRole("button", { name: /Add 3 Test Players/ }).click();
  await expect(page.locator(".lobby-actions")).toContainText("4 / 8 players");
  await page.getByRole("button", { name: "Start game" }).click();
  await expect(page.locator(".hero-shell")).toBeVisible();

  let finalHeroResponse;
  for (let selection = 0; selection < 4; selection += 1) {
    await page.getByRole("button", { name: /^Select / }).first().click();
    const confirm = page.getByRole("button", { name: /^Confirm / });
    const responsePromise = selection === 3
      ? page.waitForResponse((response) => {
        if (response.url() !== `${API}/api/rooms` || response.request().method() !== "POST") return false;
        try { return JSON.parse(response.request().postData() ?? "{}").action === "choose_hero"; }
        catch { return false; }
      })
      : null;
    await confirm.click();
    if (responsePromise) finalHeroResponse = await responsePromise;
  }

  const finalRoom = await finalHeroResponse.json();
  expect(finalRoom.room.status).toBe("playing");
  expect(finalRoom.room.currentAction).toBeTruthy();
  expect(finalRoom.room.actionRevision).toBeTruthy();
  await expect(page.locator(".game-shell")).toBeVisible();
  await expect(page.locator(`[data-player-anchor="${finalRoom.room.meId}"]`)).toBeVisible();
});
