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

  let finalRoom;
  for (let selection = 0; selection < 4; selection += 1) {
    const firstCandidate = page.getByRole("button", { name: /^Select / }).first();
    await expect(firstCandidate).toBeVisible();
    await expect(firstCandidate).toBeEnabled();
    await firstCandidate.click();
    const confirm = page.getByRole("button", { name: /^Confirm / });
    const responsePromise = page.waitForResponse((response) => {
      if (response.url() !== `${API}/api/rooms` || response.request().method() !== "POST") return false;
      try { return JSON.parse(response.request().postData() ?? "{}").action === "choose_hero"; }
      catch { return false; }
    });
    await confirm.click();
    const heroResponse = await responsePromise;
    expect(heroResponse.ok(), `hero selection ${selection + 1} must be accepted`).toBe(true);
    const result = await heroResponse.json();
    finalRoom = result.room;
    expect(finalRoom.players.filter((player) => player.generalReady)).toHaveLength(selection + 1);
    expect(finalRoom.status).toBe(selection === 3 ? "playing" : "heroes");
    if (selection < 3) {
      const projectedOptionIds = finalRoom.myHeroOptions.map((hero) => hero.id);
      await expect.poll(async () => page.locator(".hero-choice-grid [data-hero-id]").evaluateAll((elements) => elements.map((element) => element.getAttribute("data-hero-id")))).toEqual(projectedOptionIds);
    }
  }

  expect(finalRoom.currentAction).toBeTruthy();
  expect(finalRoom.actionRevision).toBeTruthy();
  await expect(page.locator(".game-shell")).toBeVisible();
  await expect(page.locator(`[data-player-anchor="${finalRoom.meId}"]`)).toBeVisible();
});
