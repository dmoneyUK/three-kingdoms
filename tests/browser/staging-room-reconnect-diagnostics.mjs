const API_PATH = "/api/rooms";
const SENSITIVE_KEYS = "token|access[_-]?token|authorization|cookie|session(?:[_-]?token)?|room[_-]?token";
const DYNAMIC_SECRETS = new Set();

export function registerSensitiveSecrets(secrets = []) {
  for (const secret of secrets) if (typeof secret === "string" && secret) DYNAMIC_SECRETS.add(secret);
}

function encodedVariants(secret) {
  if (typeof secret !== "string" || !secret) return [];
  const variants = new Set([secret]);
  let current = secret;
  for (let index = 0; index < 3; index += 1) {
    try {
      const decoded = decodeURIComponent(current);
      if (decoded === current) break;
      variants.add(decoded);
      current = decoded;
    } catch { break; }
  }
  try { variants.add(encodeURIComponent(secret)); } catch { /* ignore malformed input */ }
  return [...variants].filter(Boolean).sort((a, b) => b.length - a.length);
}

/**
 * Redact credential-bearing values before an Error, reporter, or attachment
 * can retain the raw Playwright URL/POST body.  The explicit secret list is
 * dynamic; the key-value pass is defense-in-depth for encoded/unknown tokens.
 */
export function redactSensitiveText(value, secrets = []) {
  let text = String(value ?? "");
  for (const secret of [...DYNAMIC_SECRETS, ...secrets].flatMap(encodedVariants)) text = text.split(secret).join("[REDACTED]");
  const keyPattern = new RegExp(`([?&\\"']?(?:${SENSITIVE_KEYS})[\\"']?\\s*(?:=|:)\\s*)([^&#,\\s}\\"']+)`, "gi");
  return text
    .replace(/(authorization\s*:\s*(?:bearer\s+)?)[^\s,;]+/gi, "$1[REDACTED]")
    .replace(/(cookie\s*:\s*)[^\r\n]+/gi, "$1[REDACTED]")
    .replace(keyPattern, "$1[REDACTED]");
}

export function safeRejoinError({ failure, operation = "Staging room request" } = {}) {
  const safe = failure && typeof failure === "object" ? failure : { category: "unknown", status: null, rayId: null };
  const category = typeof safe.category === "string" ? safe.category : "unknown";
  const status = safeStatus(safe.status);
  const rayId = typeof safe.rayId === "string" && /^[a-f0-9]{8,32}$/i.test(safe.rayId) ? safe.rayId : null;
  const suffix = [category, status === null ? null : `HTTP ${status}`, rayId ? `Ray ${rayId}` : null].filter(Boolean).join(", ");
  const error = new Error(`${redactSensitiveText(operation)} failed (${suffix})`);
  error.name = "StagingRejoinError";
  error.category = category;
  error.status = status;
  if (rayId) error.rayId = rayId;
  return error;
}

/**
 * Convert an assertion into a stable, credential-free failure.  Playwright's
 * default assertion formatter may include the compared values, so callers
 * pass only the boolean verdict and a static label here.
 */
export function safeAssertion(condition, label, secrets = []) {
  if (condition) return;
  const error = new Error(redactSensitiveText(String(label || "Staging assertion failed"), secrets));
  error.name = "StagingSafeAssertionError";
  throw error;
}

/**
 * Attach only sanitized text/json evidence.  Binary screenshots, traces and
 * HARs are deliberately omitted because they cannot be proven credential-free
 * at this boundary.
 */
export function safeAttachment({ name, body, contentType = "text/plain", secrets = [] } = {}) {
  if (typeof name !== "string" || !name || /(?:screenshot|trace|har|network)/i.test(name)) return null;
  const text = redactSensitiveText(typeof body === "string" ? body : JSON.stringify(body ?? null), secrets);
  return { name, body: text, contentType };
}

export function sanitizeReporterError(error, secrets = []) {
  if (!error || typeof error !== "object") return null;
  void secrets;
  return {
    message: "staging_test_failure",
    name: typeof error.name === "string" && /^[A-Za-z][A-Za-z0-9_]{0,40}$/.test(error.name) ? error.name : "Error",
    stack: null,
  };
}

/**
 * One authenticated request boundary for the staging smoke.  Playwright's
 * transport errors are normalized here; callers never rethrow the raw error
 * that may contain a URL, POST body, cookie, or session token.
 */
export function createSafeAuthenticatedRequest(request, { roomCode, expectedToken } = {}) {
  const secrets = [expectedToken];
  const invoke = async (method, url, options = {}) => {
    try {
      return await request[method](url, options);
    } catch (error) {
      const classified = classifyRejoinFailure({ errorMessage: redactSensitiveText(error?.message, secrets), requestFailed: true });
      throw safeRejoinError({ failure: classified, operation: `${method.toUpperCase()} ${API_PATH}` });
    }
  };
  return Object.freeze({
    get: (url, options) => invoke("get", url, options),
    post: (url, options) => invoke("post", url, options),
    roomCode,
  });
}

function requestParts(url, roomCode, expectedToken) {
  try {
    const parsed = new URL(url);
    const isRoomsGet = parsed.pathname === API_PATH;
    const methodRoomMatches = parsed.searchParams.get("code") === roomCode;
    const token = parsed.searchParams.get("token");
    const tokenPresent = typeof token === "string" && token.length > 0;
    return {
      isRoomsGet,
      roomMatches: isRoomsGet && methodRoomMatches,
      tokenPresent,
      sessionMatches: isRoomsGet && methodRoomMatches && token === expectedToken,
    };
  } catch {
    return { isRoomsGet: false, roomMatches: false, tokenPresent: false, sessionMatches: false };
  }
}
function safeStatus(status) {
  return Number.isInteger(status) && status >= 100 && status <= 1199 ? status : null;
}

export function extractRayId(text) {
  const match = typeof text === "string" ? text.match(/ray\s*id\s*[:\s]+([a-f0-9]{8,32})/i) : null;
  return match?.[1] ?? null;
}

export function classifyRejoinFailure({ errorMessage = "", status = null, body = "", requestFailed = false } = {}) {
  const numericStatus = safeStatus(status);
  if (numericStatus === 1102 || /error\s*1102|worker\s+exceeded\s+resource\s+limits/i.test(body)) {
    return { category: "resource_limit_1102", status: numericStatus, rayId: extractRayId(body) };
  }
  if (requestFailed) return { category: "api_request_failed", status: numericStatus, rayId: null };
  if (numericStatus !== null && numericStatus >= 500) return { category: "api_http_error", status: numericStatus, rayId: extractRayId(body) };
  if (/timeout|timed out|exceeded.*deadline/i.test(String(errorMessage))) return { category: "response_timeout", status: numericStatus, rayId: null };
  if (/navigation|page\.reload|net::|ERR_/i.test(String(errorMessage))) return { category: "navigation_error", status: numericStatus, rayId: null };
  if (numericStatus !== null && numericStatus >= 400) return { category: "api_http_error", status: numericStatus, rayId: extractRayId(body) };
  return { category: "unknown", status: numericStatus, rayId: null };
}

export function createRejoinDiagnostics({ roomCode, expectedToken, startedAt = Date.now() } = {}) {
  const state = {
    startedAt,
    phases: [],
    ready: false,
    session: {
      beforeReload: { present: false, codeMatches: false, tokenPresent: false, matches: false },
      afterReload: { present: false, codeMatches: false, tokenPresent: false, matches: false },
    },
    requests: {
      totalStarted: 0,
      totalCompleted: 0,
      totalFailed: 0,
      started: 0,
      completed: 0,
      failed: 0,
      expected: 0,
      unrelated: 0,
      statusCounts: {},
      byKind: {
        navigation: { started: 0, completed: 0, failed: 0 },
        assets: { started: 0, completed: 0, failed: 0 },
        api: { started: 0, completed: 0, failed: 0 },
      },
    },
    failure: null,
  };

  const phase = (name, at = Date.now()) => {
    if (typeof name !== "string" || !name) return;
    state.phases.push({ name, at: Number.isFinite(at) ? at : Date.now() });
  };

  const requestKind = (url, resourceType) => {
    if (requestParts(url, roomCode, expectedToken).isRoomsGet) return "api";
    return resourceType === "document" ? "navigation" : "assets";
  };

  const requestStarted = (url, method = "GET", resourceType = "fetch") => {
    const kind = requestKind(url, resourceType);
    state.requests.totalStarted += 1;
    state.requests.byKind[kind].started += 1;
    if (method !== "GET") return null;
    const parts = requestParts(url, roomCode, expectedToken);
    if (!parts.isRoomsGet) return parts;
    state.requests.started += 1;
    if (parts.sessionMatches) state.requests.expected += 1;
    else state.requests.unrelated += 1;
    return parts;
  };

  const response = (url, method, status, resourceType = "fetch") => {
    const kind = requestKind(url, resourceType);
    state.requests.totalCompleted += 1;
    state.requests.byKind[kind].completed += 1;
    if (method !== "GET") return null;
    const parts = requestParts(url, roomCode, expectedToken);
    if (!parts.isRoomsGet) return parts;
    state.requests.completed += 1;
    const numericStatus = safeStatus(status);
    if (numericStatus !== null) state.requests.statusCounts[numericStatus] = (state.requests.statusCounts[numericStatus] ?? 0) + 1;
    return parts;
  };

  return Object.freeze({
    phase,
    requestStarted,
    response,
    requestFailed(url, method = "GET", resourceType = "fetch") {
      const kind = requestKind(url, resourceType);
      state.requests.totalFailed += 1;
      state.requests.byKind[kind].failed += 1;
      const parts = requestParts(url, roomCode, expectedToken);
      if (method === "GET" && parts.isRoomsGet) state.requests.failed += 1;
      return parts;
    },
    session(stage, { present = false, codeMatches = false, tokenPresent = false, matches = false } = {}) {
      if (stage !== "beforeReload" && stage !== "afterReload") return;
      state.session[stage] = { present: present === true, codeMatches: codeMatches === true, tokenPresent: tokenPresent === true, matches: matches === true };
    },
    markReady(at = Date.now()) {
      state.ready = true;
      phase("client_ready", at);
    },
    failure(failure) {
      const safe = failure && typeof failure === "object" ? failure : classifyRejoinFailure({ errorMessage: String(failure ?? "") });
      state.failure = {
        category: typeof safe.category === "string" ? safe.category : "unknown",
        status: safeStatus(safe.status),
        rayId: typeof safe.rayId === "string" && /^[a-f0-9]{8,32}$/i.test(safe.rayId) ? safe.rayId : null,
      };
    },
    snapshot() {
      return structuredClone(state);
    },
  });
}

export function sessionEvidence({ session, roomCode, expectedToken } = {}) {
  if (!session || typeof session !== "object") return { present: false, codeMatches: false, tokenPresent: false, matches: false };
  const tokenPresent = typeof session.token === "string" && session.token.length > 0;
  const codeMatches = session.code === roomCode;
  return {
    present: true,
    codeMatches,
    tokenPresent,
    matches: codeMatches && tokenPresent && session.token === expectedToken,
  };
}

export async function waitForRejoinResponse(page, { roomCode, expectedToken, diagnostics, timeoutMs = 30_000 } = {}) {
  diagnostics?.phase("rejoin_response_wait_started");
  try {
    const response = await page.waitForResponse((candidate) => {
      const request = candidate.request();
      const parts = requestParts(candidate.url(), roomCode, expectedToken);
      if (request.method() !== "GET" || !parts.isRoomsGet) return false;
      return parts.sessionMatches;
    }, { timeout: timeoutMs });
    diagnostics?.phase("rejoin_response_received");
    return response;
  } catch (error) {
    const failure = classifyRejoinFailure({ errorMessage: error?.message });
    diagnostics?.failure(failure);
    throw safeRejoinError({ failure, operation: "GET /api/rooms rejoin" });
  }
}
