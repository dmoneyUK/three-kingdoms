import assert from "node:assert/strict";
import test from "node:test";
import {
  classifyRejoinFailure,
  createSafeAuthenticatedRequest,
  createRejoinDiagnostics,
  extractRayId,
  redactSensitiveText,
  safeAssertion,
  safeAttachment,
  safeRejoinError,
  sanitizeReporterError,
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

test("S2 redacts raw and encoded credentials from transport, assertions, and artifacts", async () => {
  const secret = "room/session+token?opaque=1";
  const encoded = encodeURIComponent(secret);
  const raw = `GET https://example.test/api/rooms?code=${roomCode}&token=${encoded} Authorization: Bearer ${secret} body={"sessionToken":"${secret}"}`;
  const sanitized = redactSensitiveText(raw, [secret]);
  assert.equal(sanitized.includes(secret), false);
  assert.equal(sanitized.includes(encoded), false);
  assert.match(sanitized, /token=\[REDACTED\]/i);

  const throwingRequest = {
    async get(url) { throw new Error(`transport failed for ${url}?token=${encoded}`); },
    async post(_url, options) { throw new Error(`POST body=${JSON.stringify(options?.data)} cookie=${secret}`); },
  };
  const safeRequest = createSafeAuthenticatedRequest(throwingRequest, { roomCode, expectedToken: secret });
  await assert.rejects(safeRequest.get(`/api/rooms?code=${roomCode}&token=${encoded}`), (error) => {
    assert.equal(error.category, "api_request_failed");
    assert.equal(error.message.includes(secret), false);
    assert.equal(error.message.includes(encoded), false);
    return true;
  });
  await assert.rejects(safeRequest.post("/api/rooms", { data: { action: "respond", token: secret } }), (error) => {
    assert.equal(error.category, "api_request_failed");
    assert.equal(error.message.includes(secret), false);
    return true;
  });

  const assertionError = safeRejoinError({
    failure: { category: "api_http_error", status: 503, rayId: "abcdef12" },
    operation: `POST /api/rooms token=${secret}`,
  });
  assert.equal(assertionError.message.includes(secret), false, "reporter-facing assertion text is sanitized");
  const attachment = redactSensitiveText(JSON.stringify({ raw, assertion: assertionError.message }), [secret]);
  assert.equal(attachment.includes(secret), false, "diagnostic attachment is sanitized");
  assert.equal(attachment.includes(encoded), false, "encoded credentials are sanitized from attachments");
});

test("S2 safe assertion/reporter/upload canary never emits a credential or unsanitizable artifact", () => {
  assert.throws(() => safeAssertion(false, `session token=${token}`, [token]), (error) => {
    assert.equal(error.name, "StagingSafeAssertionError");
    assert.equal(error.message.includes(token), false);
    return true;
  });
  const safe = safeAttachment({ name: "diagnostics.json", body: { token }, contentType: "application/json", secrets: [token] });
  assert.equal(safe.body.includes(token), false);
  assert.equal(safe.body.includes("[REDACTED]"), true);
  assert.equal(safeAttachment({ name: "failure.trace.zip", body: token, secrets: [token] }), null);
  assert.equal(safeAttachment({ name: "network.har", body: token, secrets: [token] }), null);
  const reporter = sanitizeReporterError({ name: "Error", message: `GET /api/rooms?token=${encodeURIComponent(token)}`, stack: `raw ${token}` }, [token]);
  assert.equal(reporter.message.includes(token), false);
  assert.equal(reporter.message.includes(encodeURIComponent(token)), false);
  assert.equal(reporter.stack, null);
});
