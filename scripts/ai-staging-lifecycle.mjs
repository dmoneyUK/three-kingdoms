import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
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
const ROOM_GUARD_TASK_ID = "AIP-PERF-BOT-02 S1 staging room guard";
export const HOSTED_LIFECYCLE_BUDGET = Object.freeze({
  activeMs: 14 * 60_000,
  totalMs: 20 * 60_000,
  closureReserveMs: 6 * 60_000,
});
export const ROOM_GUARD_SQL = `WITH room_rows AS (
  SELECT
    rooms.id AS room_id,
    rooms.status AS status,
    rooms.test_room AS test_room,
    rooms.created_at AS created_at,
    rooms.last_activity_at AS last_activity_at,
    SUM(CASE WHEN players.controller_type = 'bot' AND players.is_test_player = 0 THEN 1 ELSE 0 END) AS genuine_bot_count,
    SUM(CASE WHEN players.controller_type = 'human' AND players.is_test_player = 0 THEN 1 ELSE 0 END) AS genuine_human_count,
    MAX(CASE WHEN players.controller_type = 'human' AND players.is_test_player = 0 THEN players.connected_at ELSE NULL END) AS latest_genuine_human_connected_at,
    (SELECT COUNT(*) FROM bot_work WHERE bot_work.room_id = rooms.id) AS bot_work_count,
    (SELECT COUNT(*) FROM bot_work WHERE bot_work.room_id = rooms.id AND bot_work.status IN ('pending', 'claimed')) AS live_bot_work_count,
    (SELECT COALESCE(MAX(bot_work.updated_at), 0) FROM bot_work WHERE bot_work.room_id = rooms.id) AS latest_bot_work_at,
    (SELECT COALESCE(MAX(bot_room_scheduler.lease_until), 0) FROM bot_room_scheduler WHERE bot_room_scheduler.room_id = rooms.id) AS scheduler_lease_until,
    (SELECT COUNT(*) FROM negation_window_submissions WHERE negation_window_submissions.room_id = rooms.id) +
      (SELECT COUNT(*) FROM shared_response_window_submissions WHERE shared_response_window_submissions.room_id = rooms.id) AS response_submission_count,
    json_object(
      'id', rooms.id, 'status', rooms.status, 'phase', rooms.phase,
      'test_room', rooms.test_room, 'turn_seat', rooms.turn_seat,
      'turn_epoch', rooms.turn_epoch, 'turn_start_public_sequence', rooms.turn_start_public_sequence,
      'shared_response_commit_id', COALESCE(rooms.shared_response_commit_id, ''),
      'pending_json', COALESCE(rooms.pending_json, ''), 'log_json', COALESCE(rooms.log_json, ''),
      'skill_state_json', COALESCE(rooms.skill_state_json, ''),
      'causal_envelope_json', COALESCE(rooms.causal_envelope_json, ''),
      'created_at', rooms.created_at, 'last_activity_at', rooms.last_activity_at
    ) AS room_state_json,
    (SELECT json_group_array(json_object(
      'id', p.id, 'seat', p.seat, 'controller_type', p.controller_type,
      'is_test_player', p.is_test_player, 'alive', p.alive, 'hp', p.hp,
      'hero', p.hero, 'role', p.role, 'hand_json', COALESCE(p.hand_json, ''),
      'equipment_json', COALESCE(p.equipment_json, ''), 'connected_at', p.connected_at,
      'controller_request_id', COALESCE(p.controller_request_id, '')
    )) FROM (SELECT * FROM players WHERE players.room_id = rooms.id ORDER BY seat, id) AS p) AS player_state_json,
    (SELECT json_group_array(json_object(
      'decision_id', w.decision_id, 'bot_id', w.bot_id, 'action_revision', w.action_revision,
      'status', w.status, 'attempts', w.attempts, 'available_at', w.available_at,
      'lease_until', w.lease_until, 'budget_reserved', w.budget_reserved,
      'error_code', w.error_code, 'updated_at', w.updated_at
    )) FROM (SELECT * FROM bot_work WHERE bot_work.room_id = rooms.id ORDER BY decision_id) AS w) AS bot_work_state_json,
    (SELECT json_group_array(json_object(
      'room_id', s.room_id, 'lease_until', s.lease_until,
      'actions_reserved', s.actions_reserved, 'updated_at', s.updated_at
    )) FROM (SELECT * FROM bot_room_scheduler WHERE bot_room_scheduler.room_id = rooms.id ORDER BY room_id) AS s) AS scheduler_state_json,
    (SELECT json_group_array(json_object('source', 'negation', 'window_id', n.window_id, 'player_id', n.player_id, 'submission_json', n.submission_json))
      FROM (SELECT * FROM negation_window_submissions WHERE negation_window_submissions.room_id = rooms.id ORDER BY window_id, player_id) AS n) ||
    (SELECT json_group_array(json_object('source', 'shared', 'window_id', s.window_id, 'player_id', s.player_id, 'submission_json', s.submission_json))
      FROM (SELECT * FROM shared_response_window_submissions WHERE shared_response_window_submissions.room_id = rooms.id ORDER BY window_id, player_id) AS s) AS submission_state_json
  FROM rooms
  LEFT JOIN players ON players.room_id = rooms.id
  WHERE rooms.status IN ('lobby', 'heroes', 'playing', 'finished')
  GROUP BY rooms.id, rooms.status, rooms.test_room, rooms.created_at, rooms.last_activity_at,
    rooms.phase, rooms.turn_seat, rooms.turn_epoch, rooms.turn_start_public_sequence,
    rooms.shared_response_commit_id, rooms.pending_json, rooms.log_json, rooms.skill_state_json,
    rooms.causal_envelope_json
)
SELECT room_rows.*, COUNT(*) OVER () AS total_room_rows
FROM room_rows
ORDER BY room_id`;

export class StagingLifecycleError extends Error {
  constructor(message, { code = "blocked", exitCode = LIFECYCLE_EXIT_CODES.blocked, endpoint = null } = {}) {
    super(message);
    this.name = "StagingLifecycleError";
    this.code = code;
    this.exitCode = exitCode;
    this.endpoint = endpoint;
  }
}

function strictEpoch(value, label) {
  if (!Number.isSafeInteger(value) || value < 0) throw blocked(`${label} is missing or malformed`);
  return value;
}

/**
 * Machine-checked monotonic lifecycle budget.  Epoch milliseconds are captured
 * once immediately before activation and compared with the same clock on every
 * probe; callers must fail closed on a backwards/invalid clock rather than
 * extending the hosted window.
 */
export function assertHostedLifecycleBudget({ startedAtEpochMs, activationAtEpochMs = null, nowEpochMs, phase = "before_activation" } = {}) {
  const started = strictEpoch(startedAtEpochMs, "lifecycle T0");
  const now = strictEpoch(nowEpochMs, "lifecycle clock");
  if (now < started) throw blocked("lifecycle clock moved backwards");
  if (!["before_activation", "active", "closure"].includes(phase)) throw invalidTarget("lifecycle phase is invalid");
  if (activationAtEpochMs !== null) {
    const activation = strictEpoch(activationAtEpochMs, "lifecycle activation time");
    if (activation < started || now < activation) throw blocked("lifecycle activation time is outside the owned window");
    const totalElapsedMs = now - started;
    const activeElapsedMs = now - activation;
    if (totalElapsedMs > HOSTED_LIFECYCLE_BUDGET.totalMs) throw blocked("hosted lifecycle exceeded the 20-minute total budget");
    if (phase === "active" && activeElapsedMs > HOSTED_LIFECYCLE_BUDGET.activeMs) throw blocked("hosted active probes exceeded the 14-minute budget");
    return {
      startedAtEpochMs: started,
      activationAtEpochMs: activation,
      totalElapsedMs,
      activeElapsedMs,
      totalRemainingMs: Math.max(0, HOSTED_LIFECYCLE_BUDGET.totalMs - totalElapsedMs),
      activeRemainingMs: Math.max(0, HOSTED_LIFECYCLE_BUDGET.activeMs - activeElapsedMs),
      closureReserveSatisfied: totalElapsedMs <= HOSTED_LIFECYCLE_BUDGET.totalMs - HOSTED_LIFECYCLE_BUDGET.closureReserveMs,
    };
  }
  if (phase !== "before_activation") throw blocked("hosted activation time is missing");
  if (now - started > HOSTED_LIFECYCLE_BUDGET.totalMs - HOSTED_LIFECYCLE_BUDGET.closureReserveMs) {
    throw blocked("insufficient lifecycle time remains before activation");
  }
  return {
    startedAtEpochMs: started,
    activationAtEpochMs: null,
    totalElapsedMs: now - started,
    activeElapsedMs: 0,
    totalRemainingMs: HOSTED_LIFECYCLE_BUDGET.totalMs - (now - started),
    activeRemainingMs: HOSTED_LIFECYCLE_BUDGET.activeMs,
    closureReserveSatisfied: true,
  };
}

/**
 * Fail-closed, exact-run gate for the single future Hosted window.  This is
 * intentionally independent of Cloudflare mutation calls; the correction
 * branch can prove the gate is unavailable without activating anything.
 */
export function assertHostedActivationGate({ sourceSha, expectedSha, runId, s1, s2, historicalCredentialDisposition, controlledAccess } = {}) {
  if (typeof sourceSha !== "string" || !/^[0-9a-f]{40}$/i.test(sourceSha)
    || typeof expectedSha !== "string" || !/^[0-9a-f]{40}$/i.test(expectedSha)
    || sourceSha.toLowerCase() !== expectedSha.toLowerCase()) {
    throw invalidTarget("Hosted gate requires an exact full source SHA");
  }
  if (typeof runId !== "string" || !/^\d+$/.test(runId)) throw invalidTarget("Hosted gate requires an exact CI run ID");
  if (s1 !== true || s2 !== true) throw blocked("Hosted gate requires passing S1 and S2 safety checks");
  if (historicalCredentialDisposition !== "confirmed_invalid_or_revoked") throw blocked("historical Staging credential disposition is not confirmed");
  if (controlledAccess !== true) throw blocked("controlled Staging access is not confirmed");
  return Object.freeze({ sourceSha: sourceSha.toLowerCase(), runId, s1: true, s2: true, historicalCredentialDisposition, controlledAccess: true });
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

function roomFingerprint(row) {
  const canonical = JSON.stringify([
    row.roomId, row.status, row.testRoom, row.createdAt, row.lastActivityAt,
    row.genuineBotCount, row.genuineHumanCount, row.latestGenuineHumanConnectedAt,
    row.botWorkCount, row.liveBotWorkCount, row.latestBotWorkAt, row.schedulerLeaseUntil, row.responseSubmissionCount,
    row.roomStateDigest, row.playerStateDigest, row.botWorkStateDigest,
    row.schedulerStateDigest, row.submissionStateDigest,
  ]);
  return createHash("sha256").update(canonical).digest("hex");
}

function strictInteger(value, { nullable = false, minimum = Number.MIN_SAFE_INTEGER } = {}) {
  if (nullable && value === null) return true;
  return typeof value === "number" && Number.isSafeInteger(value) && value >= minimum;
}

function snapshotDigest(value) {
  if (typeof value !== "string" || value.length === 0 || value.length > 4_000_000) return null;
  try {
    JSON.parse(value);
  } catch {
    return null;
  }
  return createHash("sha256").update(value).digest("hex");
}

function normalizeGuardRow(row) {
  if (!isRecord(row) || typeof row.room_id !== "string" || row.room_id.length === 0
    || !["lobby", "heroes", "playing", "finished"].includes(row.status)
    || ![0, 1].includes(row.test_room)
    || !strictInteger(row.created_at, { minimum: 1 })
    || !strictInteger(row.last_activity_at, { nullable: true })
    || !strictInteger(row.genuine_bot_count, { minimum: 0 })
    || !strictInteger(row.genuine_human_count, { minimum: 0 })
    || !strictInteger(row.latest_genuine_human_connected_at, { nullable: true, minimum: 0 })
    || !strictInteger(row.bot_work_count, { minimum: 0 }) || !strictInteger(row.live_bot_work_count, { minimum: 0 })
    || !strictInteger(row.latest_bot_work_at, { minimum: 0 }) || !strictInteger(row.scheduler_lease_until, { minimum: 0 })
    || !strictInteger(row.response_submission_count, { minimum: 0 })) {
    return null;
  }
  const roomStateDigest = snapshotDigest(row.room_state_json);
  const playerStateDigest = snapshotDigest(row.player_state_json);
  const botWorkStateDigest = snapshotDigest(row.bot_work_state_json);
  const schedulerStateDigest = snapshotDigest(row.scheduler_state_json);
  const submissionStateDigest = snapshotDigest(row.submission_state_json);
  if (!roomStateDigest || !playerStateDigest || !botWorkStateDigest || !schedulerStateDigest || !submissionStateDigest) return null;
  const normalized = {
    roomId: row.room_id,
    status: row.status,
    testRoom: row.test_room,
    createdAt: row.created_at,
    lastActivityAt: row.last_activity_at,
    genuineBotCount: row.genuine_bot_count,
    genuineHumanCount: row.genuine_human_count,
    latestGenuineHumanConnectedAt: row.latest_genuine_human_connected_at,
    botWorkCount: row.bot_work_count,
    liveBotWorkCount: row.live_bot_work_count,
    latestBotWorkAt: row.latest_bot_work_at,
    schedulerLeaseUntil: row.scheduler_lease_until,
    responseSubmissionCount: row.response_submission_count,
    roomStateDigest,
    playerStateDigest,
    botWorkStateDigest,
    schedulerStateDigest,
    submissionStateDigest,
  };
  return normalized;
}

function rowIsEligible(row, now) {
  if (row.status !== "heroes" && row.status !== "playing") return false;
  const recentActivityAt = row.lastActivityAt || row.createdAt;
  const recentActivity = recentActivityAt >= now - 5 * 60_000;
  const liveHuman = row.latestGenuineHumanConnectedAt !== null
    && row.latestGenuineHumanConnectedAt >= now - 90_000;
  return row.testRoom === 0 && row.genuineBotCount >= 1 && row.genuineBotCount <= 3
    && (recentActivity || liveHuman);
}

function digestFingerprints(fingerprints) {
  return createHash("sha256").update(fingerprints.join("\n")).digest("hex");
}

/**
 * Read-only S1 admission proof.  It intentionally returns only counts and
 * opaque hashes: room IDs, codes, names, roles, hands and session material do
 * not enter the persisted evidence.
 */
export function evaluateStagingRoomGuard({ rows, now = Date.now(), baseline = null, phase = "baseline", activationAt = null, totalRoomRows = null, readbackComplete = true } = {}) {
  if (!Array.isArray(rows) || !Number.isFinite(Number(now)) || readbackComplete !== true) throw blocked("Staging room guard readback is incomplete");
  const normalized = rows.map(normalizeGuardRow);
  if (normalized.some((row) => row === null)) throw blocked("Staging room guard contains an unknown or malformed room");
  const ids = normalized.map((row) => row.roomId);
  if (new Set(ids).size !== ids.length) throw blocked("Staging room guard contains duplicate room identities");
  const reportedCount = totalRoomRows === null ? normalized.length : totalRoomRows;
  if (!strictInteger(reportedCount, { minimum: 0 }) || reportedCount !== normalized.length) throw blocked("Staging room guard inventory is truncated or has an inconsistent total count");
  const complete = true;
  const fingerprints = normalized.map(roomFingerprint).sort();
  const eligible = normalized.filter((row) => rowIsEligible(row, Number(now)));
  const result = {
    phase,
    observedAt: isoNow(new Date(Number(now))),
    complete,
    roomCount: normalized.length,
    eligibleCount: eligible.length,
    eligibleFingerprintCount: eligible.map(roomFingerprint).length,
    fingerprintDigest: digestFingerprints(fingerprints),
    fingerprints,
  };
  if (phase === "baseline") {
    if (eligible.length > 0) throw blocked("pre-existing eligible Staging rooms require isolation before activation");
    return result;
  }
  if (!baseline || baseline.complete !== true || !Array.isArray(baseline.fingerprints)
    || !strictInteger(baseline.roomCount, { minimum: 0 }) || baseline.roomCount !== baseline.fingerprints.length) {
    throw blocked("Staging room guard baseline is missing or incomplete");
  }
  const currentSet = new Set(fingerprints);
  const missing = baseline.fingerprints.filter((fingerprint) => !currentSet.has(fingerprint));
  if (missing.length > 0) throw blocked("a pre-existing Staging room changed or disappeared during the hosted window");
  if (phase === "pre_activation" && result.fingerprintDigest !== baseline.fingerprintDigest) {
    throw blocked("Staging room inventory changed before activation");
  }
  if ((phase === "monitor" || phase === "post_closure") && activationAt !== null) {
    if (!strictInteger(activationAt, { minimum: 1 })) throw blocked("Staging room guard activation time is malformed");
    const baselineIds = new Set(baseline.fingerprints);
    const unexpectedOld = normalized.some((row) => !baselineIds.has(roomFingerprint(row)) && row.createdAt < Number(activationAt));
    if (unexpectedOld) throw blocked("Staging room inventory gained an unknown pre-existing room");
  }
  return { ...result, baselineFingerprintDigest: baseline.fingerprintDigest, missingFingerprintCount: missing.length };
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
    || (inventory.deployment?.tag !== null && inventory.deployment?.tag !== owner.tag)
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
  if ((inventory.deployment.tag !== null && inventory.deployment.tag !== owner.tag)
    || inventory.version.tag !== owner.tag) {
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

export async function guardStagingRooms({ client, evidenceDir = DEFAULT_EVIDENCE_DIR, owner, phase = "baseline", now = new Date(), activationAt = null } = {}) {
  ensureClientTarget(client);
  const safe = safeOwner(owner);
  if (!["baseline", "pre_activation", "monitor", "post_closure"].includes(phase)) throw invalidTarget("Staging room guard phase is invalid");
  const evidencePath = phasePath(evidenceDir, `room-guard-${phase}`);
  const base = { task: ROOM_GUARD_TASK_ID, phase: `room-guard-${phase}`, observedAt: isoNow(now), target: AI_STAGING_LIFECYCLE_TARGET, owner: safe };
  let baseline = null;
  if (phase !== "baseline") {
    baseline = await readJson(phasePath(evidenceDir, "room-guard-baseline"), "room guard baseline");
    if (baseline.ok !== true || baseline.result?.complete !== true) throw blocked("room guard baseline evidence is not valid");
  }
  return withEvidence(evidencePath, base, async () => {
    const readback = await client.roomGuard();
    if (!isRecord(readback) || !Array.isArray(readback.result) || readback.result.length !== 1
      || !isRecord(readback.result[0]) || !Array.isArray(readback.result[0].results)) {
      throw blocked("Staging room guard D1 readback is incomplete or paginated");
    }
    const rows = readback.result[0].results;
    const rowCounts = rows.map((row) => row?.total_room_rows);
    const totalRoomRows = rows.length > 0 ? rowCounts[0] : null;
    if (rows.length === 0 || rowCounts.some((count) => count !== totalRoomRows)) {
      throw blocked("Staging room guard D1 readback does not prove a complete inventory");
    }
    const result = evaluateStagingRoomGuard({
      rows,
      now: now instanceof Date ? now.getTime() : Number(now),
      baseline: baseline?.result ?? null,
      phase,
      activationAt: activationAt instanceof Date ? activationAt.getTime() : activationAt,
      totalRoomRows,
    });
    return { result };
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
  const databaseQueryPath = `/accounts/${AI_STAGING_LIFECYCLE_TARGET.accountId}/d1/database/${AI_STAGING_LIFECYCLE_TARGET.databaseId}/query`;

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
    roomGuard: () => request("read-only D1 room guard", databaseQueryPath, {
      method: "POST",
      body: { sql: ROOM_GUARD_SQL, params: [] },
      raw: true,
    }),
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
  if (mode === "hosted-gate") {
    const result = assertHostedActivationGate({
      sourceSha: process.env.GITHUB_SHA,
      expectedSha: process.env.STAGING_EXPECTED_SHA ?? process.env.GITHUB_SHA,
      runId: process.env.GITHUB_RUN_ID,
      s1: process.env.STAGING_S1_PASSED === "true",
      s2: process.env.STAGING_S2_PASSED === "true",
      historicalCredentialDisposition: process.env.STAGING_HISTORICAL_CREDENTIAL_DISPOSITION,
      controlledAccess: process.env.STAGING_CONTROLLED_ACCESS === "true",
    });
    console.log(JSON.stringify({ task: TASK_ID, phase: mode, ok: true, result }));
    return;
  }
  if (mode === "budget") {
    const result = assertHostedLifecycleBudget({
      startedAtEpochMs: Number(process.env.STAGING_LIFECYCLE_STARTED_EPOCH_MS ?? Number.NaN),
      activationAtEpochMs: process.env.STAGING_LIFECYCLE_ACTIVATION_EPOCH_MS ? Number(process.env.STAGING_LIFECYCLE_ACTIVATION_EPOCH_MS) : null,
      nowEpochMs: Number(process.env.STAGING_LIFECYCLE_NOW_EPOCH_MS ?? Date.now()),
      phase: process.env.STAGING_LIFECYCLE_PHASE ?? "before_activation",
    });
    console.log(JSON.stringify({ task: TASK_ID, phase: mode, ok: true, result }));
    return;
  }
  if (!new Set(["preflight", "capture", "contain", "emergency-contain", "room-guard"]).has(mode)) throw invalidTarget("usage: ai-staging-lifecycle.mjs <preflight|capture|contain|emergency-contain|room-guard|hosted-gate|budget>");
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
        : mode === "room-guard"
          ? await guardStagingRooms({
            client,
            evidenceDir,
            owner,
            phase: process.env.STAGING_ROOM_GUARD_PHASE ?? "baseline",
            activationAt: process.env.STAGING_LIFECYCLE_ACTIVATION_EPOCH_MS
              ? Number(process.env.STAGING_LIFECYCLE_ACTIVATION_EPOCH_MS)
              : process.env.STAGING_LIFECYCLE_ACTIVATION_EPOCH
                ? Number(process.env.STAGING_LIFECYCLE_ACTIVATION_EPOCH) * 1000
                : null,
          })
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
