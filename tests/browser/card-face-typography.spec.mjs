import { readFile } from "node:fs/promises";
import { test, expect } from "@playwright/test";

const globalsCss = new URL("../../app/globals.css", import.meta.url);
const sequenceCss = new URL("../../app/sequence-overrides.css", import.meta.url);

function face(name, category = "Stratagem", className = "") {
  return `<div class="played-card ${className}" ${name.length > 20 ? 'data-card-title-fit="long"' : ""}><i>Q<small>♥</small></i><b class="card-name-mark">${name}</b><strong>${category} card</strong></div>`;
}

async function nameMetrics(locator) {
  return locator.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    const clone = element.cloneNode(true);
    const style = getComputedStyle(element);
    Object.assign(clone.style, {
      position: "fixed",
      left: "-10000px",
      top: "0",
      display: "block",
      width: `${element.clientWidth}px`,
      height: "auto",
      maxWidth: "none",
      maxHeight: "none",
      overflow: "visible",
      webkitBoxOrient: "initial",
      webkitLineClamp: "unset",
      lineHeight: style.lineHeight,
      fontSize: style.fontSize,
      letterSpacing: style.letterSpacing,
      whiteSpace: "normal",
      overflowWrap: style.overflowWrap,
      wordBreak: style.wordBreak,
      hyphens: style.hyphens,
    });
    document.body.append(clone);
    const cloneStyle = getComputedStyle(clone);
    const height = clone.getBoundingClientRect().height;
    const lineHeight = Number.parseFloat(cloneStyle.lineHeight) || 1;
    clone.remove();
    return {
      fontSize: Number.parseFloat(style.fontSize),
      width: rect.width,
      lines: Math.max(1, Math.round(height / lineHeight)),
      clipped: element.scrollHeight > element.clientHeight + 1,
    };
  });
}

test("CardFace names and type labels fit their existing phone card sizes", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.setContent(`<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body>
    <main class="game-shell" style="--hand-card-height:102px;--hand-card-face-width:68px">
      <section class="play-table" style="position:relative;width:390px;height:844px">
        <div class="public-result-card" data-case="result-medium" style="position:relative;left:auto;top:auto;translate:none;width:140px;height:210px">
          ${face("Something Out of Nothing")}
        </div>
        <div class="public-result-card" data-case="result-compact" style="position:relative;left:auto;top:auto;translate:none;width:90px;height:135px">
          ${face("Overindulgence")}
        </div>
        <div class="public-result-card" data-case="result-long" style="position:relative;left:auto;top:auto;translate:none;width:90px;height:135px">
          ${face("Yellow-Hoofed Flying-Lightning", "Equipment")}
        </div>
        <div class="active-table-reveal" style="position:relative;left:auto;top:auto;translate:none">
          <div>${face("Eight Trigrams Formation", "Equipment", "eighttrigrams")}</div>
        </div>
        <div class="private-draw-row" style="position:relative;left:auto;top:auto;transform:none;width:390px">${face("Borrowed Sword", "Stratagem", "borrowedsword")}${face("Yellow-Hoofed Flying-Lightning", "Equipment", "yellowhoofed")}</div>
        <div class="local-hand-rail" style="position:relative;top:auto;left:auto;right:auto;width:390px;height:130px;overflow:visible">
          <div class="card-slot" style="width:68px;height:102px;flex-basis:68px">
            <button type="button" class="game-card overindulgence red-suit" aria-pressed="false" style="position:relative;width:100%;height:102px">
              <span class="corner">Q<i>♥</i></span><span class="card-name-mark">Overindulgence</span><strong>Stratagem card</strong>
            </button>
          </div>
          <div class="card-slot" style="width:68px;height:102px;flex-basis:68px">
            <button type="button" class="game-card borrowedsword black-suit" aria-pressed="false" style="position:relative;width:100%;height:102px">
              <span class="corner">K<i>♠</i></span><span class="card-name-mark">Borrowed Sword</span><strong>Stratagem card</strong>
            </button>
          </div>
          <div class="card-slot" style="width:68px;height:102px;flex-basis:68px">
            <button type="button" class="game-card yellowhoofed black-suit" aria-pressed="false" style="position:relative;width:100%;height:102px">
              <span class="corner">K<i>♠</i></span><span class="card-name-mark">Yellow-Hoofed Flying-Lightning</span><strong>Equipment card</strong>
            </button>
          </div>
        </div>
        <div class="mini-equipment-card" style="position:relative;width:34px;height:51px">
          <button type="button" class="mini-equipment-button"><div class="played-card frost-sword black-suit"><i>J<small>♠</small></i><b class="card-name-mark">Frost Sword</b><strong>Equipment card</strong></div></button>
        </div>
      </section>
    </main>
  </body></html>`);
  const [globalStyles, sequenceStyles] = await Promise.all([
    readFile(globalsCss, "utf8"),
    readFile(sequenceCss, "utf8"),
  ]);
  await page.addStyleTag({ content: globalStyles });
  await page.addStyleTag({ content: sequenceStyles });

  const faces = ["result-medium", "result-compact"];
  for (const faceCase of faces) {
    const card = page.locator(`[data-case="${faceCase}"] > .played-card`);
    const name = card.locator(".card-name-mark");
    const category = card.locator("strong");
    const metrics = await nameMetrics(name);
    expect(metrics.lines, `${faceCase} full name should fit within two lines: ${JSON.stringify(metrics)}`).toBeLessThanOrEqual(2);
    expect(metrics.clipped, `${faceCase} name should not be hidden by line clamping`).toBe(false);
    await expect(category).toHaveCSS("white-space", "nowrap");
    expect(await category.evaluate((el) => el.scrollWidth <= el.clientWidth + 1), `${faceCase} category should fit one line`).toBe(true);
  }

  const handName = await nameMetrics(page.locator(".local-hand-rail .game-card.overindulgence .card-name-mark"));
  expect(handName.fontSize).toBeGreaterThanOrEqual(11);
  expect(handName.fontSize).toBeLessThanOrEqual(12);
  expect(handName.lines).toBeLessThanOrEqual(2);
  expect(handName.clipped).toBe(false);
  const handCategory = page.locator(".local-hand-rail .game-card.overindulgence > strong");
  const handCategoryFontSize = await handCategory.evaluate((el) => Number.parseFloat(getComputedStyle(el).fontSize));
  expect(handCategoryFontSize).toBeGreaterThanOrEqual(6.1);
  expect(handCategoryFontSize).toBeLessThanOrEqual(7);
  await expect(handCategory).toHaveCSS("white-space", "nowrap");
  expect(await handCategory.evaluate((el) => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
  for (const selector of [".private-draw-row .played-card.borrowedsword .card-name-mark", ".local-hand-rail .game-card.borrowedsword .card-name-mark"]) {
    const name = page.locator(selector);
    const metrics = await nameMetrics(name);
    expect(metrics.fontSize).toBeGreaterThanOrEqual(selector.startsWith(".private") ? 12 : 11);
    expect(metrics.clipped).toBe(false);
    expect(metrics.lines).toBeLessThanOrEqual(2);
    expect(await name.evaluate((element) => {
      const range = document.createRange();
      range.setStart(element.firstChild, 0);
      range.setEnd(element.firstChild, "Borrowed".length);
      return range.getClientRects().length;
    })).toBe(1);
  }
  const longDrawName = await nameMetrics(page.locator(".private-draw-row .played-card.yellowhoofed .card-name-mark"));
  expect(longDrawName.lines).toBeLessThanOrEqual(4);
  expect(longDrawName.clipped).toBe(false);
  const longHand = page.locator(".local-hand-rail .game-card.yellowhoofed");
  const longHandName = await nameMetrics(longHand.locator(".card-name-mark"));
  expect(longHandName.lines).toBeLessThanOrEqual(4);
  expect(longHandName.clipped).toBe(false);
  expect(await longHand.evaluate((card) => card.querySelector(".card-name-mark").getBoundingClientRect().bottom <= card.querySelector("strong").getBoundingClientRect().top)).toBe(true);
  const longResult = page.locator('[data-case="result-long"] .played-card');
  const longResultName = await nameMetrics(longResult.locator(".card-name-mark"));
  expect(longResultName.lines).toBeLessThanOrEqual(4);
  expect(longResultName.clipped).toBe(false);
  expect(await longResult.evaluate((card) => card.querySelector(".card-name-mark").getBoundingClientRect().bottom <= card.querySelector("strong").getBoundingClientRect().top)).toBe(true);
  const drawCategory = page.locator(".private-draw-row .played-card.borrowedsword > strong");
  expect(await drawCategory.evaluate((element) => Number.parseFloat(getComputedStyle(element).fontSize))).toBeGreaterThanOrEqual(6);
  expect(await drawCategory.evaluate((element) => element.scrollWidth <= element.clientWidth + 1)).toBe(true);
  const revealName = await nameMetrics(page.locator(".active-table-reveal .played-card .card-name-mark"));
  expect(revealName.lines).toBeLessThanOrEqual(2);
  expect(revealName.clipped).toBe(false);
  const revealCategory = page.locator(".active-table-reveal .played-card > strong");
  await expect(revealCategory).toHaveCSS("white-space", "nowrap");
  expect(await revealCategory.evaluate((el) => el.scrollWidth <= el.clientWidth + 1)).toBe(true);

  const miniName = await page.locator(".mini-equipment-card .card-name-mark").evaluate((el) => getComputedStyle(el).fontSize);
  const miniCategory = await page.locator(".mini-equipment-card .played-card > strong").evaluate((el) => getComputedStyle(el).fontSize);
  expect(miniName).toBe("5px");
  expect(miniCategory).toBe("3px");

  await page.locator(".local-hand-rail .game-card.overindulgence").evaluate((el) => el.addEventListener("click", () => { el.dataset.clicked = "true"; }, { once: true }));
  await page.locator(".local-hand-rail .game-card.overindulgence").click();
  await expect(page.locator(".local-hand-rail .game-card.overindulgence")).toHaveAttribute("data-clicked", "true");
  await expect(page.locator('.public-result-card[data-case="result-medium"]')).toHaveCSS("width", "140px");
  await expect(page.locator('.public-result-card[data-case="result-compact"]')).toHaveCSS("width", "90px");
});
