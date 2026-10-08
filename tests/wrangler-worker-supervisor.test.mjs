import assert from "node:assert/strict";
import test from "node:test";
import { MAX_KNOWN_PROXY_RESTARTS, shouldRestartAfterKnownProxyDisconnect } from "./browser/wrangler-worker-restart-policy.mjs";

const proxyDisconnectLog = `Error in ProxyController: Error inside ProxyWorker\nError\n  cause: { message: 'Network connection lost.' }`;

test("restarts only a ready Wrangler Worker that exited on the known ProxyWorker disconnect", () => {
  assert.equal(shouldRestartAfterKnownProxyDisconnect({ exitCode: 1, wasReady: true, restartCount: 0, log: proxyDisconnectLog }), true);
  assert.equal(shouldRestartAfterKnownProxyDisconnect({ exitCode: 1, wasReady: true, restartCount: 0, log: "Error: application exception" }), false);
  assert.equal(shouldRestartAfterKnownProxyDisconnect({ exitCode: 0, wasReady: true, restartCount: 0, log: proxyDisconnectLog }), false);
  assert.equal(shouldRestartAfterKnownProxyDisconnect({ exitCode: 1, wasReady: false, restartCount: 0, log: proxyDisconnectLog }), false);
  assert.equal(shouldRestartAfterKnownProxyDisconnect({ exitCode: 1, wasReady: true, restartCount: MAX_KNOWN_PROXY_RESTARTS, log: proxyDisconnectLog }), false);
});

test("a later unrelated Wrangler error supersedes an earlier proxy disconnect", () => {
  const log = `${proxyDisconnectLog}\nError in RuntimeController: invalid worker configuration`;
  assert.equal(shouldRestartAfterKnownProxyDisconnect({ exitCode: 1, wasReady: true, restartCount: 0, log }), false);
});
