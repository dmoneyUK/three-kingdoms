import { expect, test } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

const API = "http://127.0.0.1:3137";
const evidenceRoot = process.env.H1_F_EVIDENCE_DIR;

async function seedRoom(request, { hero, playerCount = 4 }) {
  const rolesByPlayerCount = {
    4: ["Lord", "Loyalist", "Rebel", "Renegade"],
    6: ["Lord", "Loyalist", "Rebel", "Rebel", "Rebel", "Renegade"],
    8: ["Lord", "Loyalist", "Loyalist", "Rebel", "Rebel", "Rebel", "Rebel", "Renegade"],
  };
  const heroes = [hero, "sun-quan", "cao-cao", "zhao-yun", "guan-yu", "lü-bu", "daqiao", "hua-tuo"];
  const roles = rolesByPlayerCount[playerCount];
  if (!roles) throw new Error(`Unsupported H1 seat count: ${playerCount}`);
  const players = roles.map((role, index) => ({
    name: index === 0 ? "H1 REVIEWER" : `H1 PLAYER ${index + 1}`,
    role,
    hero: heroes[index],
    hp: 4,
    maxHp: 4,
    hand: index === 0 ? [{ id: "h1-reviewer-attack", kind: "Attack", suit: "♠", rank: "7" }] : [],
  }));
  const response = await request.post(`${API}/__test/seed-playing-game`, {
    data: { phase: "play", turnSeat: 0, players },
  });
  if (!response.ok()) throw new Error(`Hero details room seed failed: ${await response.text()}`);
  return response.json();
}

async function openLocalHero(page, seed, viewport, reducedMotion) {
  await page.setViewportSize(viewport);
  if (reducedMotion) await page.emulateMedia({ reducedMotion: "reduce" });
  const viewer = seed.players[0];
  await page.addInitScript(({ code, token, name }) => {
    localStorage.setItem("three-realms-session", JSON.stringify({ code, token, name }));
  }, { code: seed.code, token: viewer.token, name: viewer.name });
  await page.goto(`${API}/`);
  await expect(page.locator(".game-shell")).toBeVisible();
}

async function heroDetailsGeometry(page) {
  return page.getByRole("dialog").evaluate((panel) => {
    const rect = (element) => {
      const value = element.getBoundingClientRect();
      return { left: value.left, top: value.top, right: value.right, bottom: value.bottom, width: value.width, height: value.height };
    };
    const intersects = (first, second) => first.left < second.right && first.right > second.left
      && first.top < second.bottom && first.bottom > second.top;
    const stage = panel.parentElement;
    const skills = panel.querySelector(".hero-details-skills");
    const lastSkill = skills?.lastElementChild;
    const protectedSelectors = [
      ["opponent seat", ".opponent-player-card[data-player-anchor]"],
      ["Local Dock", ".local-player-dock"],
      ["local controls", ".play-command"],
    ];
    const overlaps = [];
    const protectedBounds = [];
    for (const [name, selector] of protectedSelectors) {
      for (const obstacle of document.querySelectorAll(selector)) {
        const style = getComputedStyle(obstacle);
        const obstacleBounds = rect(obstacle);
        if (style.display === "none" || style.visibility === "hidden" || obstacleBounds.width <= 0 || obstacleBounds.height <= 0) continue;
        protectedBounds.push({ name, rect: obstacleBounds });
        if (intersects(rect(panel), obstacleBounds)) overlaps.push(name);
      }
    }
    return {
      viewport: { width: window.innerWidth, height: window.innerHeight, pageWidth: document.documentElement.scrollWidth },
      stage: stage ? rect(stage) : null,
      panel: rect(panel),
      art: rect(panel.querySelector(".hero-details-art")),
      profile: rect(panel.querySelector(".hero-details-profile")),
      name: rect(panel.querySelector(".hero-details-identity h2")),
      close: rect(panel.querySelector(".hero-details-close")),
      nameOverlapsClose: intersects(rect(panel.querySelector(".hero-details-identity h2")), rect(panel.querySelector(".hero-details-close"))),
      skills: skills ? rect(skills) : null,
      lastSkill: lastSkill ? rect(lastSkill) : null,
      skillScroll: skills ? { clientHeight: skills.clientHeight, scrollHeight: skills.scrollHeight, overflowY: getComputedStyle(skills).overflowY } : null,
      unusedBelowLastSkill: skills && lastSkill ? rect(panel).bottom - rect(lastSkill).bottom : null,
      overlaps,
      protectedBounds,
      visibleText: panel.innerText,
    };
  });
}

const cases = [
  { hero: "huang-yueying", name: "Huang Yueying", skills: ["Cultivation", "Wizardry"], width: 390, height: 844 },
  { hero: "zhou-yu", name: "Zhou Yu", skills: ["Heroic", "Sowing Distrust"], width: 390, height: 700 },
  { hero: "huang-yueying", name: "Huang Yueying", skills: ["Cultivation", "Wizardry"], width: 440, height: 894 },
  { hero: "huang-yueying", name: "Huang Yueying", skills: ["Cultivation", "Wizardry"], width: 480, height: 900 },
  { hero: "huang-yueying", name: "Huang Yueying", skills: ["Cultivation", "Wizardry"], playerCount: 6, width: 440, height: 894 },
  { hero: "huang-yueying", name: "Huang Yueying", skills: ["Cultivation", "Wizardry"], playerCount: 8, width: 480, height: 900 },
  { hero: "zhou-yu", name: "Zhou Yu", skills: ["Heroic", "Sowing Distrust"], width: 1440, height: 900, reducedMotion: true },
];

for (const scenario of cases) {
  test(`H1-F ${scenario.name} details stay compact and usable at ${scenario.width}x${scenario.height} (${scenario.playerCount ?? 4} seats)${scenario.reducedMotion ? " with reduced motion" : ""}`, async ({ page, request }, testInfo) => {
    const seed = await seedRoom(request, scenario);
    await openLocalHero(page, seed, { width: scenario.width, height: scenario.height }, scenario.reducedMotion);

    const opener = page.getByRole("button", { name: `Explain ${scenario.name}`, exact: true });
    await expect(opener).toBeVisible();
    await opener.click();
    const dialog = page.getByRole("dialog", { name: scenario.name });
    await expect(dialog).toBeVisible();

    const geometry = await heroDetailsGeometry(page);
    if (evidenceRoot) {
      await mkdir(evidenceRoot, { recursive: true });
      const label = `${scenario.name.toLowerCase().replaceAll(" ", "-")}-${scenario.width}x${scenario.height}-${scenario.playerCount ?? 4}-seats`;
      const screenshotPath = join(evidenceRoot, `${label}.png`);
      await page.screenshot({ path: screenshotPath });
      await writeFile(join(evidenceRoot, `${label}.json`), `${JSON.stringify(geometry, null, 2)}\n`);
      await testInfo.attach(`${label}-screenshot`, { path: screenshotPath, contentType: "image/png" });
      await testInfo.attach(`${label}-geometry`, { body: JSON.stringify(geometry, null, 2), contentType: "application/json" });
    }

    await expect(dialog.getByRole("heading", { name: scenario.name, level: 2 })).toBeVisible();
    await expect(dialog.getByRole("img", { name: `${scenario.name} portrait` })).toBeVisible();
    await expect(dialog.locator(".hero-details-skill")).toHaveCount(scenario.skills.length);
    for (const skill of scenario.skills) await expect(dialog.getByRole("heading", { name: skill, level: 3 })).toBeVisible();
    await expect(dialog.getByText("HERO DETAILS", { exact: true })).toHaveCount(0);
    await expect(dialog.getByText("SHU", { exact: true })).toHaveCount(0);
    await expect(dialog.getByText("WU", { exact: true })).toHaveCount(0);
    await expect(dialog.getByText(/HP\s*\d+\/\d+/, { exact: false })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "System menu" })).toBeVisible();
    await expect(page.locator('.local-hand[aria-label="Your hand"]')).toBeVisible();

    expect(geometry.viewport.pageWidth, "the preview does not add horizontal page overflow").toBeLessThanOrEqual(scenario.width);
    expect(geometry.panel.width).toBeLessThanOrEqual(340);
    expect(geometry.panel.height).toBeLessThanOrEqual(geometry.stage.height);
    expect(geometry.panel.left).toBeGreaterThanOrEqual(geometry.stage.left);
    expect(geometry.panel.right).toBeLessThanOrEqual(geometry.stage.right);
    expect(geometry.panel.top).toBeGreaterThanOrEqual(geometry.stage.top);
    expect(geometry.panel.bottom).toBeLessThanOrEqual(geometry.stage.bottom);
    expect(geometry.art.width).toBeGreaterThanOrEqual(scenario.playerCount >= 5 || scenario.width <= 390 ? 70 : 80);
    expect(geometry.close.width).toBeGreaterThanOrEqual(44);
    expect(geometry.close.height).toBeGreaterThanOrEqual(44);
    expect(geometry.nameOverlapsClose, "the canonical Hero name remains clear of the close target").toBe(false);
    expect(geometry.overlaps, "the preview clears fixed seats, Dock and controls").toEqual([]);
    if (scenario.hero === "huang-yueying") {
      expect(geometry.panel.height, "two short skills use a content-height panel").toBeLessThan(380);
      expect(geometry.unusedBelowLastSkill, "short skill content leaves no large blank tail").toBeLessThan(24);
    }
    if (geometry.skillScroll.scrollHeight > geometry.skillScroll.clientHeight) {
      expect(geometry.skillScroll.overflowY).toBe("auto");
      const pageScrollBefore = await page.evaluate(() => window.scrollY);
      const skillsRegion = dialog.locator(".hero-details-skills");
      await skillsRegion.evaluate((element) => {
        const lastHeading = element.querySelector(".hero-details-skill:last-child h3");
        element.scrollTop += lastHeading.getBoundingClientRect().top - element.getBoundingClientRect().top;
      });
      const lastSkillHeading = dialog.getByRole("heading", { name: scenario.skills.at(-1), level: 3 });
      const scrollGeometry = await page.evaluate(() => {
        const region = document.querySelector(".hero-details-skills").getBoundingClientRect();
        const heading = document.querySelector(".hero-details-skill:last-child h3").getBoundingClientRect();
        return { region: { top: region.top, bottom: region.bottom }, heading: { top: heading.top, bottom: heading.bottom }, pageScroll: window.scrollY };
      });
      expect(scrollGeometry.heading.top).toBeGreaterThanOrEqual(scrollGeometry.region.top - 1);
      expect(scrollGeometry.heading.bottom).toBeLessThanOrEqual(scrollGeometry.region.bottom + 1);
      expect(scrollGeometry.pageScroll).toBe(pageScrollBefore);
      await expect(lastSkillHeading).toBeVisible();
    }

    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
    await expect(opener).toBeFocused();
    await opener.click();
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: `Close ${scenario.name} details` }).click();
    await expect(dialog).toHaveCount(0);
    await expect(opener).toBeFocused();

    await opener.click();
    await expect(dialog).toBeVisible();
    const systemMenu = page.getByRole("button", { name: "System menu" });
    await systemMenu.click();
    await expect(dialog).toHaveCount(0);
    await expect(systemMenu).toHaveAttribute("aria-expanded", "true");
  });
}
