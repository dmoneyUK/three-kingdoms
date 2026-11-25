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
  if (!deployment || typeof deployment !== "object" || !Array.isArray(deployment.versions)
    || deployment.versions.length === 0) {
    throw blocked("deployment readback is missing or malformed");
  }
  const activeVersions = deployment.versions.filter((version) => version?.percentage === 100);
  if (activeVersions.length !== 1 || typeof activeVersions[0]?.version_id !== "string"
    || activeVersions[0].version_id.length === 0) {
    throw blocked("deployment readback has ambiguous active versions");
  }
  return activeVersions[0].version_id;
}

function deploymentTag(version) {
  return version?.annotations?.["workers/tag"] ?? null;
}

function normalizeVersion(version) {
  if (!version || typeof version !== "object" || Array.isArray(version)
    || typeof version.id !== "string" || version.id.length === 0
    || typeof version.metadata?.created_on !== "string") {
    throw blocked("version binding readback is missing or malformed");
  }
  if (!Array.isArray(version.resources?.bindings)) {
    throw blocked("version binding readback is missing bindings");
  }
  const bindings = version.resources.bindings;
  const d1Bindings = bindings.filter((binding) => binding?.type === "d1" && binding?.name === "DB");
  if (d1Bindings.length !== 1 || typeof d1Bindings[0]?.database_id !== "string"
    || d1Bindings[0].database_id.length === 0) {
    throw blocked("version binding readback does not prove one DB binding");
  }
  const d1 = d1Bindings[0];
  return {
    id: version.id,
    tag: deploymentTag(version),
    createdOn: version.metadata.created_on,
    databaseId: d1.database_id,
    databaseName: d1.name,
    databaseIds: bindings.map((binding) => binding?.database_id ?? binding?.id).filter((id) => typeof id === "string"),
    bindingNames: bindings.map((binding) => binding?.name).filter((name) => typeof name === "string").sort(),
  };
}

function normalizeDeployment(deployment) {
  if (!deployment || typeof deployment !== "object" || Array.isArray(deployment)
    || typeof deployment.id !== "string" || deployment.id.length === 0
    || typeof deployment.created_on !== "string") {
    throw blocked("deployment readback is missing or malformed");
  }
  return {
    id: deployment.id,
    createdOn: deployment.created_on,
    versionId: deploymentVersionId(deployment),
    tag: deployment.annotations?.["workers/tag"] ?? null,
  };
}

function sortDeployments(deployments) {
  if (!Array.isArray(deployments)) throw blocked("deployment list readback is missing or malformed");
  return [...deployments].sort((left, right) => {
    const a = Date.parse(left?.created_on ?? "") || 0;
    const b = Date.parse(right?.created_on ?? "") || 0;
    return b - a;
  });
}

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function assertInventoryShape(inventory) {
  if (!isRecord(inventory)) throw blocked("Staging inventory readback is missing or malformed");
  if (inventory.accountId !== AI_STAGING_LIFECYCLE_TARGET.accountId
    || inventory.workerName !== AI_STAGING_LIFECYCLE_TARGET.workerName) {
    throw invalidTarget("Staging inventory does not identify the fixed Worker target");
  }
  if (!isRecord(inventory.access)
    || typeof inventory.access.enabled !== "boolean"
    || typeof inventory.access.previewsEnabled !== "boolean") {
    throw blocked("subdomain readback is missing or malformed");
  }
  if (!Array.isArray(inventory.cronSchedules)
    || inventory.cronSchedules.some((cron) => typeof cron !== "string")) {
    throw blocked("schedule readback is missing or malformed");
  }
  for (const [label, value] of [
    ["domain", inventory.domainsCount],
    ["queue consumer", inventory.queueConsumers],
    ["route", inventory.routeCount],
    ["route check", inventory.routeCheckFailures],
  ]) {
    if (!Number.isInteger(value) || value < 0) throw blocked(`${label} readback is missing or malformed`);
  }
  if (!Array.isArray(inventory.deploymentTags)
    || inventory.deploymentTags.some((tag) => typeof tag !== "string")) {
    throw blocked("deployment tag readback is missing or malformed");
  }
  if (inventory.deployment !== null) {
    if (!isRecord(inventory.deployment)
      || typeof inventory.deployment.id !== "string"
      || typeof inventory.deployment.createdOn !== "string"
      || typeof inventory.deployment.versionId !== "string"
      || (inventory.deployment.tag !== null && typeof inventory.deployment.tag !== "string")) {
      throw blocked("deployment readback is missing or malformed");
    }
  }
  if (inventory.version !== null) {
    if (!isRecord(inventory.version)
      || typeof inventory.version.id !== "string"
      || typeof inventory.version.createdOn !== "string"
      || typeof inventory.version.databaseId !== "string"
      || inventory.version.databaseName !== "DB"
      || !Array.isArray(inventory.version.databaseIds)
      || inventory.version.databaseIds.some((id) => typeof id !== "string")
      || !Array.isArray(inventory.version.bindingNames)
      || inventory.version.bindingNames.some((name) => typeof name !== "string")
      || (inventory.version.tag !== null && typeof inventory.version.tag !== "string")) {
      throw blocked("version binding readback is missing or malformed");
    }
  }
}

function sanitizeInventory(inventory) {
  return {
    accountId: inventory.accountId,
    workerName: inventory.workerName,
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
  assertInventoryShape(inventory);
  const version = inventory.version;
  if (!version || version.databaseId !== AI_STAGING_LIFECYCLE_TARGET.databaseId
    || version.databaseName !== "DB" || version.databaseIds.includes(AI_STAGING_LIFECYCLE_TARGET.productionDatabaseId)) {
    throw invalidTarget("current Staging version does not prove the isolated D1 binding");
  }
}

function assertNoUnexpectedExposure(inventory) {
  assertInventoryShape(inventory);
  if (inventory.routeCheckFailures > 0) throw blocked("Worker route readback is incomplete");
  if (inventory.domainsCount > 0 || inventory.queueConsumers > 0 || inventory.routeCount > 0) {
    throw exposure("unexpected Staging domain, route or queue consumer is present");
  }
}

function assertPaused(inventory) {
  assertInventoryShape(inventory);
  if (inventory.access.enabled || inventory.access.previewsEnabled || inventory.cronSchedules.length > 0) {
    throw exposure("AI Staging is not paused before lifecycle ownership is proven");
  }
}

function assertOwnedVersion(inventory, owner, capture) {
  assertVersionBinding(inventory);
  if (inventory.deployment?.id !== capture.owned?.deploymentId
    || inventory.deployment?.versionId !== capture.owned?.versionId
    || inventory.version?.id !== capture.owned?.versionId
    || inventory.deployment?.tag !== owner.tag
    || inventory.version?.tag !== owner.tag
    || inventory.version?.databaseId !== AI_STAGING_LIFECYCLE_TARGET.databaseId) {
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

function assertCapturedDeployment(inventory, owner, preflight) {
  assertVersionBinding(inventory);
  const versionId = inventory.deployment?.versionId ?? inventory.version?.id;
  if (!inventory.deployment || !inventory.version || !versionId
    || versionId === preflight.baseline?.versionId
    || inventory.deployment.id === preflight.baseline?.deploymentId
    || inventory.deployment.versionId !== inventory.version.id) {
    throw blocked("Staging deployment did not produce a new unambiguous version");
  }
  if (inventory.deployment.tag !== owner.tag || inventory.version.tag !== owner.tag) {
    throw blocked("new Staging version is not owned by this run tag");
  }
  const createdOn = Date.parse(inventory.version.createdOn);
  const deploymentCreatedOn = Date.parse(inventory.deployment.createdOn);
  const startedOn = Date.parse(preflight.observedAt ?? "");
  if (!createdOn || !deploymentCreatedOn || !startedOn || createdOn < startedOn || deploymentCreatedOn < startedOn) {
    throw blocked("Staging version timestamp is outside this run");
  }
  return { versionId, deploymentId: inventory.deployment.id };
}

function isPausedBaseline(inventory, preflight) {
  assertNoUnexpectedExposure(inventory);
  if (inventory.access.enabled || inventory.access.previewsEnabled || inventory.cronSchedules.length > 0) return false;
  const baseline = preflight.baseline ?? {};
  return inventory.deployment?.id === (baseline.deploymentId ?? null)
    && inventory.deployment?.versionId === (baseline.versionId ?? null)
    && (inventory.deployment?.createdOn ?? null) === (baseline.deploymentCreatedOn ?? null)
    && (inventory.deployment?.tag ?? null) === (baseline.deploymentTag ?? null)
    && (inventory.version?.id ?? null) === (baseline.versionId ?? null)
    && (inventory.version?.createdOn ?? null) === (baseline.versionCreatedOn ?? null)
    && (inventory.version?.tag ?? null) === (baseline.versionTag ?? null);
}

function strictReadbackList(value, label, keys = []) {
  if (Array.isArray(value)) return value;
  if (isRecord(value)) {
    for (const key of keys) {
      if (Array.isArray(value[key])) return value[key];
    }
  }
  throw blocked(`${label} readback is missing or malformed`);
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
        deploymentCreatedOn: inventory.deployment?.createdOn ?? null,
        deploymentTag: inventory.deployment?.tag ?? null,
        versionCreatedOn: inventory.version?.createdOn ?? null,
        versionTag: inventory.version?.tag ?? null,
      },
      inventory: sanitizeInventory(inventory),
    };
  });
}

export async function captureStaging({ client, evidenceDir = DEFAULT_EVIDENCE_DIR, owner, now = new Date() } = {}) {
  ensureClientTarget(client);
  const safe = safeOwner(owner);
  const evidencePath = phasePath(evidenceDir, "capture");
  const base = { phase: "capture", observedAt: isoNow(now), target: AI_STAGING_LIFECYCLE_TARGET, owner: safe };
  let preflight;
  try {
    preflight = await readJson(phasePath(evidenceDir, "preflight"), "preflight");
    if (preflight.ok !== true || preflight.owner?.tag !== safe.tag) throw blocked("Staging preflight ownership is not valid");
  } catch (error) {
    await recordFailure(evidencePath, base, error);
    throw error;
  }
  return withEvidence(evidencePath, base, async () => {
    const inventory = await client.inventory();
    assertNoUnexpectedExposure(inventory);
    const { versionId, deploymentId } = assertCapturedDeployment(inventory, safe, preflight);
    return {
      owned: {
        deploymentId,
        versionId,
        versionCreatedOn: inventory.version?.createdOn ?? null,
        deploymentCreatedOn: inventory.deployment?.createdOn ?? null,
        tag: safe.tag,
        accountId: AI_STAGING_LIFECYCLE_TARGET.accountId,
        workerName: AI_STAGING_LIFECYCLE_TARGET.workerName,
        databaseId: AI_STAGING_LIFECYCLE_TARGET.databaseId,
      },
      inventory: sanitizeInventory(inventory),
    };
  });
}

export async function containStaging({ client, evidenceDir = DEFAULT_EVIDENCE_DIR, owner, now = new Date() } = {}) {
  ensureClientTarget(client);
  const safe = safeOwner(owner);
  const evidencePath = phasePath(evidenceDir, "contain");
  const base = { phase: "contain", observedAt: isoNow(now), target: AI_STAGING_LIFECYCLE_TARGET, owner: safe };
  let preflight;
  try {
    preflight = await readJson(phasePath(evidenceDir, "preflight"), "preflight");
    if (preflight.ok !== true || preflight.owner?.tag !== safe.tag) throw blocked("Staging preflight ownership is not valid");
  } catch (error) {
    await recordFailure(evidencePath, base, error);
    throw error;
  }
  let capture = null;
  try {
    capture = await readJson(phasePath(evidenceDir, "capture"), "capture");
  } catch {
    capture = null;
  }
  if (!capture?.ok || !capture.owned?.versionId) {
    try {
      const current = await client.inventory();
      if (isPausedBaseline(current, preflight)) {
        return withEvidence(evidencePath, base, async () => ({
          noop: true,
          owned: null,
          operations: [],
          inventory: sanitizeInventory(current),
        }));
      }
      await captureStaging({ client, evidenceDir, owner: safe, now });
      capture = await readJson(phasePath(evidenceDir, "capture"), "capture");
    } catch (error) {
      await recordFailure(evidencePath, base, error);
      throw error;
    }
  }
  return withEvidence(evidencePath, base, async () => {
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
    if (!isRecord(subdomain)
      || typeof subdomain.enabled !== "boolean"
      || typeof subdomain.previews_enabled !== "boolean") {
      throw blocked("subdomain readback is missing or malformed");
    }
    if (!isRecord(schedule) || !Array.isArray(schedule.schedules)
      || schedule.schedules.some((entry) => !isRecord(entry) || typeof entry.cron !== "string")) {
      throw blocked("schedule readback is missing or malformed");
    }
    if (!isRecord(zones) || !isRecord(zones.result_info)
      || !Number.isInteger(zones.result_info.total_pages)
      || zones.result_info.total_pages < 0 || zones.result_info.total_pages > 1) {
      throw blocked("zone readback is paginated or malformed; refusing incomplete route verification");
    }
    if (!isRecord(queues) || !isRecord(queues.result_info)
      || !Number.isInteger(queues.result_info.total_pages)
      || queues.result_info.total_pages < 0 || queues.result_info.total_pages > 1) {
      throw blocked("queue readback is paginated or malformed; refusing incomplete consumer verification");
    }
    const zoneList = strictReadbackList(zones.result, "zone", ["zones"]);
    if (zoneList.some((zone) => !isRecord(zone) || typeof zone.id !== "string" || zone.id.length === 0)) {
      throw blocked("zone readback is missing or malformed");
    }
    const routeResults = await Promise.all(zoneList.map(async (zone) => {
      try {
        const result = await request("Worker route readback", `/zones/${zone.id}/workers/routes`);
        return { routes: strictReadbackList(result, "Worker route") };
      } catch (error) {
        return { error };
      }
    }));
    const routeCheckFailures = routeResults.filter((result) => result?.error).length;
    const routes = routeResults.flatMap((result) => result.routes ?? []);
    if (routes.some((route) => !isRecord(route))) throw blocked("Worker route readback is missing or malformed");
    const queueList = strictReadbackList(queues.result, "queue", ["queues"]);
    if (queueList.some((queue) => !isRecord(queue) || !Array.isArray(queue.consumers))) {
      throw blocked("queue consumer readback is missing or malformed");
    }
    const queueConsumers = queueList.reduce((count, queue) => count
      + queue.consumers.filter((consumer) => consumer?.script_name === AI_STAGING_LIFECYCLE_TARGET.workerName).length, 0);
    const domainsList = strictReadbackList(domains, "custom-domain", ["domains"]);
    if (domainsList.some((domain) => !isRecord(domain))) throw blocked("custom-domain readback is missing or malformed");
    const deployments = sortDeployments(strictReadbackList(deploymentResult, "deployment", ["deployments"]));
    const normalizedDeployments = deployments.map((item) => normalizeDeployment(item));
    const deployment = normalizedDeployments[0] ?? null;
    const versionId = deployment?.versionId ?? null;
    const versionRaw = versionId ? await request("version binding readback", `${workerPath}/versions/${versionId}`) : null;
    const version = versionRaw === null ? null : normalizeVersion(versionRaw);
    return {
      accountId: AI_STAGING_LIFECYCLE_TARGET.accountId,
      workerName: AI_STAGING_LIFECYCLE_TARGET.workerName,
      access: { enabled: subdomain.enabled, previewsEnabled: subdomain.previews_enabled },
      cronSchedules: schedule.schedules.map((entry) => entry.cron),
      domainsCount: domainsList.length,
      queueConsumers,
      routeCount: routes.filter((route) => route?.script === AI_STAGING_LIFECYCLE_TARGET.workerName).length,
      routeCheckFailures,
      deployment,
      version,
      deploymentTags: [...new Set([
        ...normalizedDeployments.map((item) => item.tag),
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
