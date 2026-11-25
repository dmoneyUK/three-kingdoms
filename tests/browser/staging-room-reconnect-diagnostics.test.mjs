import assert from "node:assert/strict";
import test from "node:test";
import {
  classifyRejoinFailure,
  createRejoinDiagnostics,
  extractRayId,
  sessionEvidence,
} from "./staging-room-reconnect-diagnostics.mjs";

const roomCode = "AB12C";
const token = "session-token-never-written-to-evidence";

test("tracks only the expected room/session request and hides raw URL values", () => {
  const diagnostics = createRejoinDiagnostics({ roomCode, expectedToken: token, startedAt: 100 });
  diagnostics.requestStarted(`https://example.test/api/rooms?code=${roomCode}&token=${token}`);
  diagnostics.response(`https://example.test/api/rooms?code=${roomCode}&token=${token}`, "GET", 200);
  diagnostics.requestStarted("https://example.test/api/rooms?code=WRONG&token=other", "GET");
  diagnostics.requestFailed("https://example.test/api/rooms?code=WRONG&token=other", "GET");
  const snapshot = diagnostics.snapshot();
  assert.equal(snapshot.requests.expected, 1);
  assert.equal(snapshot.requests.unrelated, 1);
  assert.equal(snapshot.requests.failed, 1);
  assert.equal(JSON.stringify(snapshot).includes(token), false);
  assert.equal(JSON.stringify(snapshot).includes(roomCode), false);
});
test("classifies a missing session and wrong-room session without accepting either", () => {
  assert.deepEqual(sessionEvidence({ session: null, roomCode, expectedToken: token }), {
    present: false, codeMatches: false, tokenPresent: false, matches: false,
  });
  assert.deepEqual(sessionEvidence({ session: { code: "WRONG", token }, roomCode, expectedToken: token }), {
    present: true, codeMatches: false, tokenPresent: true, matches: false,
  });
});

test("classifies navigation, API, resource-limit and no-response failures", () => {
  assert.deepEqual(classifyRejoinFailure({ errorMessage: "page.reload: net::ERR_FAILED" }), {
    category: "navigation_error", status: null, rayId: null,
  });
  assert.deepEqual(classifyRejoinFailure({ status: 503, body: "upstream" }), {
    category: "api_http_error", status: 503, rayId: null,
  });
  assert.deepEqual(classifyRejoinFailure({ body: "Error 1102 Worker exceeded resource limits Ray ID: a1b2c3d4" }), {
    category: "resource_limit_1102", status: null, rayId: "a1b2c3d4",
  });
  assert.deepEqual(classifyRejoinFailure({ errorMessage: "Timed out waiting for response" }), {
    category: "response_timeout", status: null, rayId: null,
  });
  assert.deepEqual(classifyRejoinFailure({ requestFailed: true }), {
    category: "api_request_failed", status: null, rayId: null,
  });
});

test("records ready/session/failure state as sanitized evidence", () => {
  const diagnostics = createRejoinDiagnostics({ roomCode, expectedToken: token });
  diagnostics.phase("before_reload", 1);
  diagnostics.session("beforeReload", { present: true, codeMatches: true, tokenPresent: true, matches: true });
  diagnostics.markReady(2);
  diagnostics.session("afterReload", { present: true, codeMatches: true, tokenPresent: true, matches: true });
  diagnostics.failure({ category: "resource_limit_1102", status: 1102, rayId: "abcdef12" });
  const snapshot = diagnostics.snapshot();
  assert.equal(snapshot.ready, true);
  assert.equal(snapshot.session.afterReload.matches, true);
  assert.equal(snapshot.failure.category, "resource_limit_1102");
  assert.equal(extractRayId("Ray ID: ABCDEF12"), "ABCDEF12");
  assert.equal(JSON.stringify(snapshot).includes(token), false);
});
