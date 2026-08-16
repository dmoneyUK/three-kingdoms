import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(new Request("http://localhost/", { headers: { accept: "text/html" } }), {
    ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) },
  }, { waitUntil() {}, passThroughOnException() {} });
}

test("server-renders the Three Kingdoms lobby", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
  const html = await response.text();
  assert.match(html, /<title>Three Kingdoms/);
  assert.match(html, /Classic hidden-role mode/i);
  assert.match(html, /Start test game/);
  assert.match(html, /YOU ARE PLAYING AS/);
  assert.doesNotMatch(html, /Your display name/);
  assert.match(html, /Join room/);
  assert.match(html, /Lord/);
  assert.match(html, /Loyalist/);
  assert.match(html, /Rebel/);
  assert.match(html, /Renegade/);
  assert.doesNotMatch(html, /Your site is taking shape|Building your site/);
});

test("client keeps the turn, response, presentation, and selection controls", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  assert.match(page, /TURN OWNER/);
  assert.match(page, /CURRENT PHASE/);
  assert.match(page, /ACTING NOW/);
  assert.match(page, /onActionRef\.current\("draw"\)/);
  assert.match(page, /send\("create", \{ quickStart: true \}\)/);
  assert.doesNotMatch(page, /previousTurn/);
  assert.match(page, /Play selected/);
  assert.match(page, /Take 1 damage/);
  assert.match(page, /Give selected Peach/);
  assert.equal((page.match(/Give selected Peach/g) ?? []).length, 1);
  assert.match(page, /cardId: card\.id/);
  assert.match(page, /rescueDecisionReady && item\.kind !== "Peach"/);
  assert.match(page, /PRIVATE RESCUE DECISION/);
  assert.match(page, /rescueDecisionReady/);
  assert.match(page, /role="alertdialog"/);
  assert.match(page, /Do not give/);
  assert.match(page, /A Peach rescue check is in progress/);
  assert.match(page, /skip_rescue/);
  assert.match(page, /start_rescue_timer/);
  assert.match(page, /automaticRescueSkip/);
  assert.match(page, /5000/);
  assert.match(page, /Discard \{excessCards\} selected/);
  assert.match(page, /discard-card-row/);
  assert.match(page, /ids\.includes\(item\.id\) \? ids\.filter/);
  assert.match(page, /setTimeout\(\(\) => setActiveEvent\(null\), 5000\)/);
  assert.match(page, /PRIVATE DRAW/);
  assert.match(page, /ROLE REVEALED/);
  assert.match(page, /roleReveal/);
  assert.match(page, /Only you can see these cards/);
  assert.match(page, /knownHandCards/);
  assert.match(page, /setTimeout\(\(\) => setPrivateDrawCards\(\[\]\), 5000\)/);
  assert.match(page, /Event history/);
  assert.doesNotMatch(page, /readyTurn/);
});
