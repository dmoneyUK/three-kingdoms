import assert from "node:assert/strict";
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
  assert.match(html, /Host multiplayer game/);
  assert.match(html, /Quick game/);
  assert.match(html, /PLAYER NAME/);
  assert.doesNotMatch(html, /Your display name/);
  assert.match(html, /Join multiplayer game/);
  assert.match(html, /Lord/);
  assert.match(html, /Loyalist/);
  assert.match(html, /Rebel/);
  assert.match(html, /Spy/);
  assert.doesNotMatch(html, /Your site is taking shape|Building your site/);
});
