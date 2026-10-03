import { expect, test } from "@playwright/test";

const API = "http://127.0.0.1:3137";
const card = (kind, id, suit = "♠") => ({ id, kind, suit, rank: "A" });

async function seedRealAssault(request) {
  const response = await request.post(`${API}/__test/seed-playing-game`, { data: {
    phase: "draw",
    turnSeat: 0,
    players: [
      { name: "ZHANG LIAO", role: "Lord", hero: "zhang-liao", hp: 4, maxHp: 4, hand: [] },
      { name: "TARGET ONE", role: "Loyalist", hero: "liu-bei", hp: 4, maxHp: 4, hand: [card("Peach", "browser-assault-one", "♥")] },
      { name: "TARGET TWO", role: "Rebel", hero: "sun-quan", hp: 4, maxHp: 4, hand: [card("Dodge", "browser-assault-two", "♣")] },
      { name: "EMPTY", role: "Renegade", hero: "cao-cao", hp: 4, maxHp: 4, hand: [] },
    ],
    deck: [card("Attack", "browser-assault-deck-one"), card("Dodge", "browser-assault-deck-two")],
  } });
  expect(response.ok()).toBeTruthy();
  return response.json();
}

test("real Draw Phase Assault keeps an enabled Confirm through two targets and explicit Cancel", async ({ page, request }) => {
  const seed = await seedRealAssault(request);
  const gameplayActions = [];
  page.on("request", (outgoing) => {
    if (outgoing.method() !== "POST" || !outgoing.url().endsWith("/api/rooms")) return;
    const body = JSON.parse(outgoing.postData() || "{}");
    if (["draw", "trigger", "decline_trigger", "start_response_timer"].includes(body.action)) gameplayActions.push(body);
  });
  await page.addInitScript(({ code, token }) => localStorage.setItem("three-realms-session", JSON.stringify({ code, token, name: "ZHANG LIAO" })), { code: seed.code, token: seed.players[0].token });
  await page.goto(`${API}/`);
  await page.locator(".game-shell").waitFor();

  const assault = page.getByRole("button", { name: "Assault" });
  await expect(assault).toBeVisible();
  await expect(assault).toBeEnabled();
  await assault.click();
  await page.getByRole("button", { name: "Select TARGET ONE" }).click();
  await page.getByRole("button", { name: "Select TARGET TWO" }).click();

  const confirm = page.locator('[data-console-surface="local-operation"] button.primary', { hasText: "Confirm" });
  await expect(confirm).toBeVisible();
  await expect(confirm).toBeEnabled();
  await assault.click();
  await expect(assault).toHaveAttribute("aria-pressed", "true");
  await expect(confirm).toBeEnabled();

  const gameplayBeforeCancel = gameplayActions.filter((action) => action.action === "trigger" || action.action === "decline_trigger").length;
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(assault).toHaveAttribute("aria-pressed", "false");
  await expect(page.getByRole("button", { name: "Inspect TARGET ONE" })).toBeVisible();
  expect(gameplayActions.filter((action) => action.action === "trigger" || action.action === "decline_trigger").length).toBe(gameplayBeforeCancel);

  await assault.click();
  await page.getByRole("button", { name: "Select TARGET ONE" }).click();
  await expect(confirm).toBeEnabled();
  await confirm.click();
  await expect.poll(() => gameplayActions.filter((action) => action.action === "trigger").at(-1)).toMatchObject({ action: "trigger", providerId: "zhang_liao_assault", targetIds: [seed.players[1].id] });
});
