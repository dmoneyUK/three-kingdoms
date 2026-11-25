import { execFileSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { resolve } from "node:path";

export const AI_STAGING_LIFECYCLE_TARGET = Object.freeze({
  accountId: "42a29622b03d3a828ee253289ef7a795",
  workerName: "three-kingdoms-ai-staging",
  databaseName: "three-kingdoms-ai-staging-db",
  databaseId: "62616495-59ea-4a9c-b669-2d3267a83cab",
  productionDatabaseId: "3151997a-f69e-4a45-ab51-9e4fd062aeb3",
  cron: "* * * * *",
});

export const LIFECYCLE_EXIT_CODES = Object.freeze({
  ok: 0,
  invalidTarget: 2,
  blocked: 3,
  exposure: 4,
});

const TASK_ID = "AIP-PERF-01 STAGING-LIFECYCLE-01";
const API_BASE = "https://api.cloudflare.com/client/v4";
const DEFAULT_EVIDENCE_DIR = ".wrangler/ai-staging-lifecycle";
const DEFAULT_TIMEOUT_MS = 8_000;
const DEFAULT_ATTEMPTS = 2;

export class StagingLifecycleError extends Error {
  constructor(message, { code = "blocked", exitCode = LIFECYCLE_EXIT_CODES.blocked, endpoint = null } = {}) {
    super(message);
    this.name = "StagingLifecycleError";
    this.code = code;
    this.exitCode = exitCode;
    this.endpoint = endpoint;
  }
}

function invalidTarget(message, endpoint = null) {
  return new StagingLifecycleError(message, {
    code: "invalid_target",
    exitCode: LIFECYCLE_EXIT_CODES.invalidTarget,
    endpoint,
  });
}

function blocked(message, endpoint = null) {
  return new StagingLifecycleError(message, {
    code: "blocked",
    exitCode: LIFECYCLE_EXIT_CODES.blocked,
    endpoint,
  });
}

function exposure(message, endpoint = null) {
  return new StagingLifecycleError(message, {
    code: "remaining_exposure",
    exitCode: LIFECYCLE_EXIT_CODES.exposure,
    endpoint,
  });
}

function ensureClientTarget(client) {
  if (!client || client.accountId !== AI_STAGING_LIFECYCLE_TARGET.accountId) {
    throw invalidTarget("Cloudflare account does not match the fixed AI Staging account");
  }
}

function isoNow(now = new Date()) {
  const value = now instanceof Date ? now : new Date(now);
  if (!Number.isFinite(value.getTime())) throw blocked("lifecycle timestamp is invalid");
  return value.toISOString();
}

function safeOwner(owner) {
  if (!owner || typeof owner !== "object") throw invalidTarget("Staging lifecycle owner context is missing");
  const runId = String(owner.runId ?? "");
  const commitSha = String(owner.commitSha ?? "");
  const tag = String(owner.tag ?? "");
  if (!/^\d+$/.test(runId) && runId !== "local") throw invalidTarget("Staging lifecycle run ownership is invalid");
  if (!/^[0-9a-f]{40}$/i.test(commitSha) && commitSha !== "local") throw invalidTarget("Staging lifecycle commit ownership is invalid");
  if (!/^aip-staging-[A-Za-z0-9-]+$/.test(tag) || tag.length > 128) throw invalidTarget("Staging deployment tag is invalid");
  return Object.freeze({ runId, commitSha: commitSha.toLowerCase(), tag });
}

export function ownerFromEnvironment(env = process.env) {
  const runId = env.GITHUB_RUN_ID ?? "local";
  const commitSha = env.GITHUB_SHA ?? "local";
  const tag = env.STAGING_DEPLOY_TAG ?? `aip-staging-${runId}-${commitSha}`;
  if (env.CI === "true" && (runId === "local" || commitSha === "local")) {
    throw invalidTarget("CI Staging lifecycle requires a GitHub run ID and full commit SHA");
  }
  return safeOwner({ runId, commitSha, tag });
}

function deploymentVersionId(deployment) {
  if (!deployment || !Array.isArray(deployment.versions)) return null;
  return deployment.versions.find((version) => version?.percentage === 100)?.version_id
    ?? deployment.versions[0]?.version_id
    ?? null;
}

function deploymentTag(version) {
  return version?.annotations?.["workers/tag"] ?? null;
}

function normalizeVersion(version) {
  if (!version || typeof version !== "object") return null;
  const bindings = Array.isArray(version.resources?.bindings) ? version.resources.bindings : [];
  const d1 = bindings.find((binding) => binding?.type === "d1" && binding?.name === "DB");
  return {
    id: typeof version.id === "string" ? version.id : null,
    tag: deploymentTag(version),
    createdOn: version.metadata?.created_on ?? null,
    databaseId: d1?.database_id ?? d1?.id ?? null,
    databaseName: d1?.name ?? null,
    databaseIds: bindings.map((binding) => binding?.database_id ?? binding?.id).filter((id) => typeof id === "string"),
    bindingNames: bindings.map((binding) => binding?.name).filter((name) => typeof name === "string").sort(),
  };
}

function normalizeDeployment(deployment) {
  if (!deployment || typeof deployment !== "object") return null;
  return {
    id: typeof deployment.id === "string" ? deployment.id : null,
    createdOn: deployment.created_on ?? null,
    versionId: deploymentVersionId(deployment),
    tag: deployment.annotations?.["workers/tag"] ?? null,
  };
}

function sortDeployments(deployments) {
  return [...(Array.isArray(deployments) ? deployments : [])].sort((left, right) => {
    const a = Date.parse(left?.created_on ?? "") || 0;
    const b = Date.parse(right?.created_on ?? "") || 0;
    return b - a;
  });
}

function sanitizeInventory(inventory) {
  return {
    access: inventory.access,
    cronSchedules: inventory.cronSchedules,
    domainsCount: inventory.domainsCount,
    queueConsumers: inventory.queueConsumers,
    routeCount: inventory.routeCount,
    routeCheckFailures: inventory.routeCheckFailures,
    deployment: inventory.deployment,
    version: inventory.version,
  };
}

function serializeError(error) {
  if (error instanceof StagingLifecycleError) {
    return { code: error.code, exitCode: error.exitCode, endpoint: error.endpoint };
  }
  if (error?.name === "AbortError") return { code: "timeout", exitCode: LIFECYCLE_EXIT_CODES.blocked, endpoint: null };
  return { code: "unexpected_error", exitCode: LIFECYCLE_EXIT_CODES.blocked, endpoint: null };
}

async function writeJson(path, value) {
  await mkdir(resolve(path, ".."), { recursive: true, mode: 0o700 });
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
}

async function readJson(path, label) {
  try {
    return JSON.parse(await readFile(path, "utf8"));
  } catch {
    throw blocked(`${label} evidence is missing or invalid`);
  }
}

function phasePath(evidenceDir, phase) {
  return resolve(evidenceDir, `${phase}.json`);
}

async function recordFailure(evidencePath, base, error) {
  try {
    await writeJson(evidencePath, {
      task: TASK_ID,
      ...base,
      ok: false,
      error: serializeError(error),
    });
  } catch {
    // The original failure is more important than a secondary artifact write.
  }
}

async function withEvidence(evidencePath, base, operation) {
  try {
    const result = await operation();
    await writeJson(evidencePath, { task: TASK_ID, ...base, ...result, ok: true });
    return result;
  } catch (error) {
    await recordFailure(evidencePath, base, error);
    throw error;
  }
}

function assertVersionBinding(inventory) {
  const version = inventory.version;
  if (!version || version.databaseId !== AI_STAGING_LIFECYCLE_TARGET.databaseId
    || version.databaseName !== "DB" || version.databaseIds.includes(AI_STAGING_LIFECYCLE_TARGET.productionDatabaseId)) {
    throw invalidTarget("current Staging version does not prove the isolated D1 binding");
  }
}

function assertNoUnexpectedExposure(inventory) {
  if (inventory.routeCheckFailures > 0) throw blocked("Worker route readback is incomplete");
  if (inventory.domainsCount > 0 || inventory.queueConsumers > 0 || inventory.routeCount > 0) {
    throw exposure("unexpected Staging domain, route or queue consumer is present");
  }
}

function assertPaused(inventory) {
  if (inventory.access.enabled || inventory.access.previewsEnabled || inventory.cronSchedules.length > 0) {
    throw exposure("AI Staging is not paused before lifecycle ownership is proven");
  }
}

function assertActiveExpected(inventory) {
  if (!inventory.access.enabled || inventory.access.previewsEnabled
    || inventory.cronSchedules.length !== 1 || inventory.cronSchedules[0] !== AI_STAGING_LIFECYCLE_TARGET.cron) {
    throw blocked("deployed AI Staging readback does not match the bounded configuration");
  }
}

function assertOwnedVersion(inventory, owner, capture) {
  if (inventory.deployment?.versionId !== capture.owned?.versionId
    || inventory.version?.id !== capture.owned?.versionId
    || inventory.version?.tag !== owner.tag) {
    throw blocked("Staging version changed; refusing to pause a newer deployment");
  }
}

function assertEmergencyVersion(inventory, expectedVersionId) {
  if (inventory.deployment?.versionId !== expectedVersionId || inventory.version?.id !== expectedVersionId) {
    throw blocked("Staging version changed; refusing emergency containment");
  }
}

function currentDeploymentTags(inventory) {
  return Array.isArray(inventory.deploymentTags) ? inventory.deploymentTags : [];
}

export async function preflightStaging({ client, evidenceDir = DEFAULT_EVIDENCE_DIR, owner, now = new Date() } = {}) {
  ensureClientTarget(client);
  const safe = safeOwner(owner);
  const evidencePath = phasePath(evidenceDir, "preflight");
  return withEvidence(evidencePath, { phase: "preflight", observedAt: isoNow(now), target: AI_STAGING_LIFECYCLE_TARGET, owner: safe }, async () => {
    const inventory = await client.inventory();
    assertNoUnexpectedExposure(inventory);
    assertPaused(inventory);
    if (inventory.version) assertVersionBinding(inventory);
    if (currentDeploymentTags(inventory).includes(safe.tag)) {
      throw blocked("an existing deployment already claims this Staging run tag");
    }
    return {
      baseline: {
        deploymentId: inventory.deployment?.id ?? null,
        versionId: inventory.deployment?.versionId ?? null,
        versionCreatedOn: inventory.version?.createdOn ?? null,
      },
      inventory: sanitizeInventory(inventory),
    };
  });
}

export async function captureStaging({ client, evidenceDir = DEFAULT_EVIDENCE_DIR, owner, now = new Date() } = {}) {
  ensureClientTarget(client);
  const safe = safeOwner(owner);
  const preflight = await readJson(phasePath(evidenceDir, "preflight"), "preflight");
  if (preflight.ok !== true || preflight.owner?.tag !== safe.tag) throw blocked("Staging preflight ownership is not valid");
  const evidencePath = phasePath(evidenceDir, "capture");
  return withEvidence(evidencePath, { phase: "capture", observedAt: isoNow(now), target: AI_STAGING_LIFECYCLE_TARGET, owner: safe }, async () => {
    const inventory = await client.inventory();
    assertNoUnexpectedExposure(inventory);
    assertActiveExpected(inventory);
    assertVersionBinding(inventory);
    const versionId = inventory.deployment?.versionId ?? inventory.version?.id;
    if (!versionId || versionId === preflight.baseline?.versionId) throw blocked("Staging deployment did not produce a new version");
    if (inventory.version?.tag !== safe.tag) throw blocked("new Staging version is not owned by this run tag");
    const createdOn = Date.parse(inventory.version?.createdOn ?? "");
    const startedOn = Date.parse(preflight.observedAt ?? "");
    if (!createdOn || !startedOn || createdOn < startedOn) throw blocked("Staging version timestamp is outside this run");
    return {
      owned: {
        deploymentId: inventory.deployment?.id ?? null,
        versionId,
        versionCreatedOn: inventory.version?.createdOn ?? null,
      },
      inventory: sanitizeInventory(inventory),
    };
  });
}

export async function containStaging({ client, evidenceDir = DEFAULT_EVIDENCE_DIR, owner, now = new Date() } = {}) {
  ensureClientTarget(client);
  const safe = safeOwner(owner);
  const preflight = await readJson(phasePath(evidenceDir, "preflight"), "preflight");
  if (preflight.ok !== true || preflight.owner?.tag !== safe.tag) throw blocked("Staging preflight ownership is not valid");
  let capture = null;
  try {
    capture = await readJson(phasePath(evidenceDir, "capture"), "capture");
  } catch {
    capture = null;
  }
  if (!capture?.ok || !capture.owned?.versionId) {
    try {
      await captureStaging({ client, evidenceDir, owner: safe, now });
      capture = await readJson(phasePath(evidenceDir, "capture"), "capture");
    } catch (error) {
      const evidencePath = phasePath(evidenceDir, "contain");
      await recordFailure(evidencePath, { phase: "contain", observedAt: isoNow(now), target: AI_STAGING_LIFECYCLE_TARGET, owner: safe }, error);
      throw error;
    }
  }
  const evidencePath = phasePath(evidenceDir, "contain");
  return withEvidence(evidencePath, { phase: "contain", observedAt: isoNow(now), target: AI_STAGING_LIFECYCLE_TARGET, owner: safe }, async () => {
    const operations = [];
    let ownershipVerified = true;
    const attempt = async (name, operation) => {
      if (!ownershipVerified) return;
      try {
        const before = await client.inventory();
        assertNoUnexpectedExposure(before);
        assertOwnedVersion(before, safe, capture);
        await operation();
        operations.push({ name, ok: true });
      } catch (error) {
        operations.push({ name, ok: false, error: serializeError(error) });
        if (error instanceof StagingLifecycleError && error.code === "blocked"
          && error.message.includes("version changed")) ownershipVerified = false;
      }
    };
    await attempt("disable_cron", () => client.setSchedules([]));
    await attempt("disable_public_and_preview", () => client.setSubdomain({ enabled: false, previews_enabled: false }));

    const after = await client.inventory();
    assertNoUnexpectedExposure(after);
    if (ownershipVerified) assertOwnedVersion(after, safe, capture);
    if (!ownershipVerified || operations.some(({ ok }) => !ok)) throw blocked("one or more Staging containment operations failed");
    assertPaused(after);
    return {
      owned: capture.owned,
      operations,
      inventory: sanitizeInventory(after),
    };
  });
}

export async function emergencyContainStaging({ client, evidenceDir = DEFAULT_EVIDENCE_DIR, expectedVersionId, confirmation, now = new Date() } = {}) {
  ensureClientTarget(client);
  if (confirmation !== `PAUSE-${AI_STAGING_LIFECYCLE_TARGET.workerName}` || typeof expectedVersionId !== "string" || !expectedVersionId) {
    throw invalidTarget("emergency containment requires the fixed Worker confirmation and an exact observed version ID");
  }
  const evidencePath = phasePath(evidenceDir, "emergency-contain");
  return withEvidence(evidencePath, {
    phase: "emergency-contain",
    observedAt: isoNow(now),
    target: AI_STAGING_LIFECYCLE_TARGET,
    expectedVersionId,
  }, async () => {
    const before = await client.inventory();
    assertNoUnexpectedExposure(before);
    assertVersionBinding(before);
    assertEmergencyVersion(before, expectedVersionId);
    const operations = [];
    let ownershipVerified = true;
    const attempt = async (name, operation) => {
      if (!ownershipVerified) return;
      try {
        const current = await client.inventory();
        assertNoUnexpectedExposure(current);
        assertEmergencyVersion(current, expectedVersionId);
        await operation();
        operations.push({ name, ok: true });
      } catch (error) {
        operations.push({ name, ok: false, error: serializeError(error) });
        if (error instanceof StagingLifecycleError && error.code === "blocked"
          && error.message.includes("version changed")) ownershipVerified = false;
      }
    };
    await attempt("disable_cron", () => client.setSchedules([]));
    await attempt("disable_public_and_preview", () => client.setSubdomain({ enabled: false, previews_enabled: false }));
    const after = await client.inventory();
    assertNoUnexpectedExposure(after);
    if (ownershipVerified) assertEmergencyVersion(after, expectedVersionId);
    if (!ownershipVerified || operations.some(({ ok }) => !ok)) throw blocked("emergency Staging containment did not complete safely");
    assertPaused(after);
    return { operations, inventory: sanitizeInventory(after) };
  });
}

export function createCloudflareClient({ token, accountId = AI_STAGING_LIFECYCLE_TARGET.accountId, fetchImpl = globalThis.fetch, timeoutMs = DEFAULT_TIMEOUT_MS, attempts = DEFAULT_ATTEMPTS } = {}) {
  if (accountId !== AI_STAGING_LIFECYCLE_TARGET.accountId) throw invalidTarget("Cloudflare account ID does not match the fixed AI Staging account");
  if (typeof token !== "string" || token.length === 0) throw blocked("Cloudflare credentials are unavailable");
  if (typeof fetchImpl !== "function") throw blocked("Cloudflare HTTP client is unavailable");
  const workerPath = `/accounts/${AI_STAGING_LIFECYCLE_TARGET.accountId}/workers/scripts/${AI_STAGING_LIFECYCLE_TARGET.workerName}`;

  async function request(label, path, { method = "GET", body, raw = false } = {}) {
    let lastError = null;
    for (let attempt = 0; attempt < Math.max(1, attempts); attempt += 1) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const response = await fetchImpl(`${API_BASE}${path}`, {
          method,
          headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
          body: body === undefined ? undefined : JSON.stringify(body),
          signal: controller.signal,
        });
        let payload;
        try {
          payload = await response.json();
        } catch {
          throw blocked(`Cloudflare ${label} returned invalid JSON`, label);
        }
        if (!response.ok || payload?.success !== true) {
          const status = response.status;
          const error = status === 403 ? blocked(`Cloudflare ${label} denied access`, label)
            : status >= 500 ? blocked(`Cloudflare ${label} returned a server error`, label)
              : blocked(`Cloudflare ${label} returned an API error`, label);
          if (status < 500 || attempt + 1 >= Math.max(1, attempts)) throw error;
          lastError = error;
          continue;
        }
        return raw ? payload : payload.result;
      } catch (error) {
        if (error instanceof StagingLifecycleError && error.code !== "blocked") throw error;
        if (error instanceof StagingLifecycleError && !/server error|timeout/i.test(error.message)) throw error;
        if (error?.name === "AbortError") lastError = blocked(`Cloudflare ${label} timed out`, label);
        else if (error instanceof StagingLifecycleError) lastError = error;
        else lastError = blocked(`Cloudflare ${label} network request failed`, label);
        if (attempt + 1 >= Math.max(1, attempts)) throw lastError;
      } finally {
        clearTimeout(timeout);
      }
    }
    throw lastError ?? blocked("Cloudflare request failed");
  }

  async function inventory() {
    const [subdomain, schedule, domains, queues, zones, deploymentResult] = await Promise.all([
      request("subdomain readback", `${workerPath}/subdomain`),
      request("schedule readback", `${workerPath}/schedules`),
      request("custom-domain readback", `/accounts/${AI_STAGING_LIFECYCLE_TARGET.accountId}/workers/domains?service=${AI_STAGING_LIFECYCLE_TARGET.workerName}`),
      request("queue readback", `/accounts/${AI_STAGING_LIFECYCLE_TARGET.accountId}/queues?per_page=100`, { raw: true }),
      request("zone readback", `/zones?account.id=${AI_STAGING_LIFECYCLE_TARGET.accountId}&per_page=50`, { raw: true }),
      request("deployment readback", `${workerPath}/deployments`),
    ]);
    if ((zones?.result_info?.total_pages ?? 1) > 1) throw blocked("zone readback is paginated; refusing incomplete route verification");
    if ((queues?.result_info?.total_pages ?? 1) > 1) throw blocked("queue readback is paginated; refusing incomplete consumer verification");
    const zoneList = Array.isArray(zones?.result) ? zones.result : Array.isArray(zones) ? zones : [];
    const routeResults = await Promise.all(zoneList.map((zone) => request("Worker route readback", `/zones/${zone.id}/workers/routes`).catch((error) => ({ error }))));
    const routeCheckFailures = routeResults.filter((result) => result?.error).length;
    const routes = routeResults.flatMap((result) => Array.isArray(result) ? result : []);
    const queueList = Array.isArray(queues?.result) ? queues.result : Array.isArray(queues) ? queues : [];
    const queueConsumers = queueList.reduce((count, queue) => count + (queue.consumers ?? []).filter((consumer) => consumer?.script_name === AI_STAGING_LIFECYCLE_TARGET.workerName).length, 0);
    const domainsList = Array.isArray(domains?.result) ? domains.result : Array.isArray(domains) ? domains : [];
    const deployments = sortDeployments(deploymentResult?.deployments ?? deploymentResult ?? []);
    const deployment = deployments[0] ?? null;
    const versionId = deploymentVersionId(deployment);
    const versionRaw = versionId ? await request("version binding readback", `${workerPath}/versions/${versionId}`) : null;
    const version = normalizeVersion(versionRaw);
    return {
      accountId: AI_STAGING_LIFECYCLE_TARGET.accountId,
      access: { enabled: subdomain?.enabled === true, previewsEnabled: subdomain?.previews_enabled === true },
      cronSchedules: Array.isArray(schedule?.schedules) ? schedule.schedules.map((entry) => entry?.cron).filter((cron) => typeof cron === "string") : [],
      domainsCount: domainsList.length,
      queueConsumers,
      routeCount: routes.filter((route) => route?.script === AI_STAGING_LIFECYCLE_TARGET.workerName).length,
      routeCheckFailures,
      deployment: normalizeDeployment(deployment),
      version,
      deploymentTags: [...new Set([
        ...deployments.map((item) => item?.annotations?.["workers/tag"]),
        version?.tag,
      ].filter((tag) => typeof tag === "string"))],
    };
  }

  return Object.freeze({
    accountId: AI_STAGING_LIFECYCLE_TARGET.accountId,
    inventory,
    setSchedules: (schedules) => request("schedule update", `${workerPath}/schedules`, { method: "PUT", body: schedules }),
    setSubdomain: (state) => request("subdomain update", `${workerPath}/subdomain`, { method: "POST", body: state }),
  });
}

function resolveToken(env = process.env) {
  if (env.CLOUDFLARE_API_TOKEN) return env.CLOUDFLARE_API_TOKEN;
  try {
    return readFileSync(`${homedir()}/.wrangler/config/default.toml`, "utf8").match(/^oauth_token\s*=\s*["']([^"']+)["']/m)?.[1];
  } catch {
    return null;
  }
}

function resolveAccountId(env = process.env) {
  if (env.CLOUDFLARE_ACCOUNT_ID) return env.CLOUDFLARE_ACCOUNT_ID;
  try {
    const output = execFileSync("node_modules/.bin/wrangler", ["whoami"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
    const ids = [...new Set(output.match(/\b[a-f0-9]{32}\b/g) ?? [])];
    if (ids.length === 1) return ids[0];
  } catch {
    // The caller receives the fixed-target error below.
  }
  return null;
}

async function cli() {
  const mode = process.argv[2];
  if (!new Set(["preflight", "capture", "contain", "emergency-contain"]).has(mode)) throw invalidTarget("usage: ai-staging-lifecycle.mjs <preflight|capture|contain|emergency-contain>");
  const evidenceDir = process.env.STAGING_LIFECYCLE_EVIDENCE_DIR ?? DEFAULT_EVIDENCE_DIR;
  const accountId = resolveAccountId();
  if (accountId !== AI_STAGING_LIFECYCLE_TARGET.accountId) throw invalidTarget("Cloudflare credentials select the wrong account");
  const client = createCloudflareClient({ token: resolveToken(), accountId });
  const owner = ownerFromEnvironment();
  const result = mode === "preflight"
    ? await preflightStaging({ client, evidenceDir, owner })
    : mode === "capture"
      ? await captureStaging({ client, evidenceDir, owner })
      : mode === "contain"
        ? await containStaging({ client, evidenceDir, owner })
        : await emergencyContainStaging({
          client,
          evidenceDir,
          expectedVersionId: process.env.STAGING_EMERGENCY_VERSION_ID,
          confirmation: process.env.STAGING_EMERGENCY_CONFIRM,
        });
  console.log(JSON.stringify({ task: TASK_ID, phase: mode, ok: true, target: AI_STAGING_LIFECYCLE_TARGET, result }));
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(new URL(import.meta.url).pathname)) {
  cli().catch((error) => {
    const exitCode = error instanceof StagingLifecycleError ? error.exitCode : LIFECYCLE_EXIT_CODES.blocked;
    console.error(`Staging lifecycle failed: ${error instanceof StagingLifecycleError ? error.message : "unexpected error"}`);
    process.exitCode = exitCode;
  });
}
