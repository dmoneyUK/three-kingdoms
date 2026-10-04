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

async function selectAssaultTargets(page, request, viewport, targetCount = 2) {
  await page.setViewportSize(viewport);
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
  await expect(assault).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Select TARGET ONE" }).click();
  if (targetCount === 2) await page.getByRole("button", { name: "Select TARGET TWO" }).click();
  await expect.poll(() => gameplayActions.some((action) => action.action === "start_response_timer")).toBeTruthy();
  return { seed, gameplayActions, assault };
}

for (const viewport of [{ width: 390, height: 844 }, { width: 480, height: 900 }]) {
  test(`mobile Assault controls stay visible after two targets at ${viewport.width}px`, async ({ page, request }) => {
    const { seed, gameplayActions, assault } = await selectAssaultTargets(page, request, viewport);
    const diagnostic = await page.evaluate(() => {
      const consoleSurface = document.querySelector('[data-console-surface="local-operation"]');
      const guidance = document.querySelector('[data-console-guidance="true"]');
      const confirm = consoleSurface?.querySelector("button.primary");
      const cancel = consoleSurface?.querySelector("button.local-target-cancel");
      const box = (element) => {
        if (!element) return null;
        const rect = element.getBoundingClientRect();
        return { x: rect.x, y: rect.y, right: rect.right, bottom: rect.bottom, width: rect.width, height: rect.height, visible: rect.width > 0 && rect.height > 0, insideViewport: rect.x >= 0 && rect.y >= 0 && rect.right <= innerWidth && rect.bottom <= innerHeight };
      };
      return {
        consolePrimary: guidance?.querySelector("[data-console-primary]")?.getAttribute("data-console-primary") ?? null,
        consolePrimaryEnabled: guidance?.querySelector("[data-console-primary-enabled]")?.getAttribute("data-console-primary-enabled") ?? null,
        confirm: { count: confirm ? 1 : 0, visible: Boolean(confirm && confirm.getClientRects().length), box: box(confirm) },
        cancel: { count: cancel ? 1 : 0, visible: Boolean(cancel && cancel.getClientRects().length), box: box(cancel) },
        lustOrder: (guidance?.textContent ?? "").includes("Lust order"),
        selectedTargets: [...document.querySelectorAll('[data-player-anchor].selected-target')].map((element) => element.getAttribute("data-player-anchor")),
      };
    });
    await expect(assault).toHaveAttribute("aria-pressed", "true");
    expect(diagnostic.selectedTargets).toEqual([seed.players[1].id, seed.players[2].id]);
    expect(diagnostic.consolePrimary).toBe("Confirm");
    expect(diagnostic.consolePrimaryEnabled).toBe("true");
    expect(diagnostic.lustOrder).toBe(false);
    expect(diagnostic.confirm.count).toBe(1);
    expect(diagnostic.confirm.visible).toBe(true);
    expect(diagnostic.confirm.box.insideViewport).toBe(true);
    expect(diagnostic.cancel.count).toBe(1);
    expect(diagnostic.cancel.visible).toBe(true);
    expect(diagnostic.cancel.box.insideViewport).toBe(true);
    await page.locator('[data-console-surface="local-operation"] button.primary', { hasText: "Confirm" }).click();
    await expect.poll(() => gameplayActions.filter((action) => action.action === "trigger")).toHaveLength(1);
    expect(gameplayActions.find((action) => action.action === "trigger")).toMatchObject({ action: "trigger", providerId: "zhang_liao_assault", targetIds: [seed.players[1].id, seed.players[2].id] });
    expect(gameplayActions.filter((action) => action.action === "decline_trigger")).toHaveLength(0);
  });
}

test("mobile Assault keeps a visible one-target Confirm and submits one target", async ({ page, request }) => {
  const { seed, gameplayActions } = await selectAssaultTargets(page, request, { width: 390, height: 844 }, 1);
  const diagnostic = await page.evaluate(() => {
    const consoleSurface = document.querySelector('[data-console-surface="local-operation"]');
    const guidance = document.querySelector('[data-console-guidance="true"]');
    const confirm = consoleSurface?.querySelector("button.primary");
    if (!confirm) return null;
    const rect = confirm.getBoundingClientRect();
    return {
      primary: guidance?.querySelector("[data-console-primary]")?.getAttribute("data-console-primary"),
      enabled: guidance?.querySelector("[data-console-primary-enabled]")?.getAttribute("data-console-primary-enabled"),
      visible: Boolean(confirm.getClientRects().length),
      insideViewport: rect.x >= 0 && rect.y >= 0 && rect.right <= innerWidth && rect.bottom <= innerHeight,
    };
  });
  expect(diagnostic).toMatchObject({ primary: "Confirm", enabled: "true", visible: true, insideViewport: true });
  await page.locator('[data-console-surface="local-operation"] button.primary', { hasText: "Confirm" }).click();
  await expect.poll(() => gameplayActions.filter((action) => action.action === "trigger")).toHaveLength(1);
  expect(gameplayActions.find((action) => action.action === "trigger")).toMatchObject({ action: "trigger", providerId: "zhang_liao_assault", targetIds: [seed.players[1].id] });
  expect(gameplayActions.filter((action) => action.action === "decline_trigger")).toHaveLength(0);
});

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
