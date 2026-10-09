import assert from "node:assert/strict";
import test from "node:test";
import { shouldRestartAfterKnownProxyDisconnect } from "./browser/wrangler-worker-restart-policy.mjs";

const proxyDisconnectLog = `Error in ProxyController: Error inside ProxyWorker\nError\n  cause: { message: 'Network connection lost.' }`;

test("restarts only a ready Wrangler Worker that exited on the known ProxyWorker disconnect", () => {
  assert.equal(shouldRestartAfterKnownProxyDisconnect({ code: 1, wasReady: true, log: proxyDisconnectLog }), true);
  assert.equal(shouldRestartAfterKnownProxyDisconnect({ code: 1, wasReady: true, log: "Error: application exception" }), false);
  assert.equal(shouldRestartAfterKnownProxyDisconnect({ code: 0, wasReady: true, log: proxyDisconnectLog }), false);
  assert.equal(shouldRestartAfterKnownProxyDisconnect({ code: 1, wasReady: false, log: proxyDisconnectLog }), false);
});

test("retries repeated known ProxyWorker disconnects throughout one CI browser run", () => {
  for (const restartCount of [0, 1, 2, 3, 8, 32]) {
    assert.equal(shouldRestartAfterKnownProxyDisconnect({ code: 1, wasReady: true, restartCount, log: proxyDisconnectLog }), true);
  }
});

test("a later unrelated Wrangler error supersedes an earlier proxy disconnect", () => {
  const log = `${proxyDisconnectLog}\nError in RuntimeController: invalid worker configuration`;
  assert.equal(shouldRestartAfterKnownProxyDisconnect({ exitCode: 1, wasReady: true, restartCount: 0, log }), false);
});
