import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  AI_STAGING_LIFECYCLE_TARGET,
  LIFECYCLE_EXIT_CODES,
  StagingLifecycleError,
  captureStaging,
  containStaging,
  createCloudflareClient,
  emergencyContainStaging,
  preflightStaging,
} from "../scripts/ai-staging-lifecycle.mjs";

const owner = { runId: "12345", commitSha: "a".repeat(40), tag: `aip-staging-12345-${"a".repeat(40)}` };
const now = new Date("2026-11-25T15:00:00.000Z");

function version({ id = "version-1", tag = null, createdOn = "2026-11-25T14:00:00.000Z", databaseId = AI_STAGING_LIFECYCLE_TARGET.databaseId } = {}) {
  return {
    id,
    tag,
    createdOn,
    databaseId,
    databaseName: "DB",
    databaseIds: [databaseId],
    bindingNames: ["DB", "CF_VERSION_METADATA"],
  };
}

function inventory({ paused = true, versionId = "version-1", versionTag = null, versionCreatedOn = "2026-11-25T14:00:00.000Z", databaseId = AI_STAGING_LIFECYCLE_TARGET.databaseId, domainsCount = 0, queueConsumers = 0, routeCount = 0, routeCheckFailures = 0, enabled = !paused, previewsEnabled = false, cronSchedules = paused ? [] : [AI_STAGING_LIFECYCLE_TARGET.cron] } = {}) {
  return {
    accountId: AI_STAGING_LIFECYCLE_TARGET.accountId,
    workerName: AI_STAGING_LIFECYCLE_TARGET.workerName,
    access: { enabled, previewsEnabled },
    cronSchedules,
    domainsCount,
    queueConsumers,
    routeCount,
    routeCheckFailures,
    deployment: { id: `deployment-${versionId}`, createdOn: versionCreatedOn, versionId, tag: versionTag },
    version: version({ id: versionId, tag: versionTag, createdOn: versionCreatedOn, databaseId }),
    deploymentTags: versionTag ? [versionTag] : [],
  };
}

class FakeClient {
  constructor(initial) {
    this.accountId = AI_STAGING_LIFECYCLE_TARGET.accountId;
    this.state = structuredClone(initial);
    this.calls = [];
    this.failures = { schedules: null, subdomain: null };
  }

  async inventory() {
    this.calls.push("inventory");
    return structuredClone(this.state);
  }

  async setSchedules(schedules) {
    this.calls.push("setSchedules");
    if (this.failures.schedules) throw this.failures.schedules;
    this.state.cronSchedules = [...schedules];
  }

  async setSubdomain(state) {
    this.calls.push("setSubdomain");
    if (this.failures.subdomain) throw this.failures.subdomain;
    this.state.access = { enabled: state.enabled === true, previewsEnabled: state.previews_enabled === true };
  }
}

async function evidenceDir() {
  return mkdtemp(join(tmpdir(), "aip-staging-lifecycle-"));
}

async function prepareOwnedRun(client, dir) {
  await preflightStaging({ client, evidenceDir: dir, owner, now });
  client.state = inventory({ paused: false, versionId: "version-2", versionTag: owner.tag, versionCreatedOn: "2026-11-25T15:00:01.000Z" });
  await captureStaging({ client, evidenceDir: dir, owner, now: new Date("2026-11-25T15:00:02.000Z") });
}

test("captures a newly owned version before activation flags are complete", async () => {
  const dir = await evidenceDir();
  const client = new FakeClient(inventory());
  await preflightStaging({ client, evidenceDir: dir, owner, now });
  client.state = inventory({
    paused: false,
    enabled: false,
    previewsEnabled: true,
    cronSchedules: [],
    versionId: "version-2",
    versionTag: owner.tag,
    versionCreatedOn: "2026-11-25T15:00:01.000Z",
  });
  await captureStaging({ client, evidenceDir: dir, owner, now: new Date("2026-11-25T15:00:02.000Z") });
  const result = await containStaging({ client, evidenceDir: dir, owner, now });
  assert.equal(result.operations.length, 2);
  assert.equal(client.state.access.enabled, false);
  assert.equal(client.state.access.previewsEnabled, false);
  assert.deepEqual(client.state.cronSchedules, []);
});

test("contains a verified paused baseline as a no-op when capture evidence is absent", async () => {
  const dir = await evidenceDir();
  const client = new FakeClient(inventory());
  await preflightStaging({ client, evidenceDir: dir, owner, now });
  const result = await containStaging({ client, evidenceDir: dir, owner, now });
  assert.equal(result.noop, true);
  assert.deepEqual(result.operations, []);
  assert.deepEqual(client.calls, ["inventory", "inventory"]);
  assert.equal(client.calls.filter((call) => call.startsWith("set")).length, 0);
});

test("rejects malformed lifecycle readback before any mutation", async () => {
  const dir = await evidenceDir();
  const malformedAccess = new FakeClient(inventory());
  malformedAccess.state.access.enabled = "false";
  await assert.rejects(preflightStaging({ client: malformedAccess, evidenceDir: dir, owner, now }), /subdomain readback is missing or malformed/);

  const malformedSchedules = new FakeClient(inventory());
  malformedSchedules.state.cronSchedules = null;
  await assert.rejects(preflightStaging({ client: malformedSchedules, evidenceDir: await evidenceDir(), owner, now }), /schedule readback is missing or malformed/);
  assert.deepEqual(malformedSchedules.calls, ["inventory"]);
});

test("rejects an ambiguous active deployment readback", async () => {
  const client = createCloudflareClient({
    token: "test-token",
    attempts: 1,
    fetchImpl: async (url) => {
      const path = new URL(url).pathname;
      let result;
      if (path.endsWith("/subdomain")) result = { enabled: false, previews_enabled: false };
      else if (path.endsWith("/schedules")) result = { schedules: [] };
      else if (path.includes("/workers/domains")) result = [];
      else if (path.includes("/queues")) return new Response(JSON.stringify({ success: true, result: [], result_info: { total_pages: 1 } }), { status: 200 });
      else if (path.endsWith("/zones")) return new Response(JSON.stringify({ success: true, result: [], result_info: { total_pages: 1 } }), { status: 200 });
      else if (path.endsWith("/deployments")) {
        result = {
          deployments: [{
            id: "deployment-ambiguous",
            created_on: "2026-11-25T15:00:00.000Z",
            versions: [
              { version_id: "version-a", percentage: 100 },
              { version_id: "version-b", percentage: 100 },
            ],
          }],
        };
      } else throw new Error(`unexpected path ${path}`);
      return new Response(JSON.stringify({ success: true, result }), { status: 200 });
    },
  });
  await assert.rejects(client.inventory(), /ambiguous active versions/);
});

test("preflights a paused fixed target, captures the owned version, and contains it", async () => {
  const dir = await evidenceDir();
  const client = new FakeClient(inventory());
  await prepareOwnedRun(client, dir);
  const result = await containStaging({ client, evidenceDir: dir, owner, now: new Date("2026-11-25T15:01:00.000Z") });
  assert.deepEqual(result.operations, [
    { name: "disable_cron", ok: true },
    { name: "disable_public_and_preview", ok: true },
  ]);
  assert.equal(client.state.access.enabled, false);
  assert.deepEqual(client.state.cronSchedules, []);
  const saved = JSON.parse(await readFile(join(dir, "contain.json"), "utf8"));
  assert.equal(saved.ok, true);
  assert.equal(saved.owner.tag, owner.tag);
  assert.equal(saved.inventory.access.enabled, false);
});

test("containment is idempotent after the target is already paused", async () => {
  const dir = await evidenceDir();
  const client = new FakeClient(inventory());
  await prepareOwnedRun(client, dir);
  await containStaging({ client, evidenceDir: dir, owner, now });
  const second = await containStaging({ client, evidenceDir: dir, owner, now });
  assert.equal(second.ok, undefined);
  assert.deepEqual(client.state.cronSchedules, []);
  assert.equal(client.state.access.enabled, false);
});

test("attempts both independent safe operations after one mutation fails", async () => {
  const dir = await evidenceDir();
  const client = new FakeClient(inventory());
  await prepareOwnedRun(client, dir);
  client.failures.schedules = new StagingLifecycleError("simulated", { code: "blocked", endpoint: "schedule update" });
  await assert.rejects(containStaging({ client, evidenceDir: dir, owner, now }), (error) => error.exitCode === LIFECYCLE_EXIT_CODES.blocked);
  assert.ok(client.calls.includes("setSchedules"));
  assert.ok(client.calls.includes("setSubdomain"), "the public surface is still attempted after a Cron failure");
  const saved = JSON.parse(await readFile(join(dir, "contain.json"), "utf8"));
  assert.equal(saved.ok, false);
  assert.equal(saved.error.code, "blocked");
});

test("rejects the wrong account and a production D1 binding before mutation", async () => {
  const dir = await evidenceDir();
  const wrongAccount = new FakeClient(inventory());
  wrongAccount.accountId = "00000000000000000000000000000000";
  await assert.rejects(preflightStaging({ client: wrongAccount, evidenceDir: dir, owner, now }), (error) => error.exitCode === LIFECYCLE_EXIT_CODES.invalidTarget);

  const wrongBinding = new FakeClient(inventory({ databaseId: AI_STAGING_LIFECYCLE_TARGET.productionDatabaseId }));
  await assert.rejects(preflightStaging({ client: wrongBinding, evidenceDir: dir, owner, now }), (error) => error.exitCode === LIFECYCLE_EXIT_CODES.invalidTarget);
  assert.deepEqual(wrongBinding.calls, ["inventory"]);
});

test("fails closed when a newer deployment replaces the owned version", async () => {
  const dir = await evidenceDir();
  const client = new FakeClient(inventory());
  await prepareOwnedRun(client, dir);
  client.state = inventory({ paused: false, versionId: "newer-version", versionTag: "aip-staging-other-run", versionCreatedOn: "2026-11-25T15:00:03.000Z" });
  await assert.rejects(containStaging({ client, evidenceDir: dir, owner, now }), (error) => error.exitCode === LIFECYCLE_EXIT_CODES.blocked);
  assert.equal(client.calls.filter((call) => call.startsWith("set")).length, 0, "no mutation follows version drift");
});

test("rejects unexpected routes or domains during preflight", async () => {
  const dir = await evidenceDir();
  const client = new FakeClient(inventory({ domainsCount: 1 }));
  await assert.rejects(preflightStaging({ client, evidenceDir: dir, owner, now }), (error) => error.exitCode === LIFECYCLE_EXIT_CODES.exposure);
  assert.deepEqual(client.calls, ["inventory"]);
});

test("supports only an explicitly confirmed fixed-target emergency pause", async () => {
  const dir = await evidenceDir();
  const client = new FakeClient(inventory({ paused: false, versionId: "version-emergency" }));
  const result = await emergencyContainStaging({
    client,
    evidenceDir: dir,
    expectedVersionId: "version-emergency",
    confirmation: `PAUSE-${AI_STAGING_LIFECYCLE_TARGET.workerName}`,
    now,
  });
  assert.deepEqual(result.operations.map(({ name }) => name), ["disable_cron", "disable_public_and_preview"]);
  await assert.rejects(emergencyContainStaging({
    client,
    evidenceDir: dir,
    expectedVersionId: "different-version",
    confirmation: `PAUSE-${AI_STAGING_LIFECYCLE_TARGET.workerName}`,
    now,
  }), (error) => error.exitCode === LIFECYCLE_EXIT_CODES.blocked);
});

test("sanitizes API failures and preserves an exact bounded exit code", async () => {
  const token = "Bearer-super-secret-token-value";
  const client = createCloudflareClient({
    token,
    attempts: 1,
    fetchImpl: async () => new Response(JSON.stringify({ success: false, errors: [{ message: token }] }), { status: 403 }),
  });
  await assert.rejects(client.setSchedules([]), (error) => {
    assert.equal(error.exitCode, LIFECYCLE_EXIT_CODES.blocked);
    assert.doesNotMatch(error.message, /super-secret|Bearer/);
    return true;
  });
});

test("classifies a bounded network timeout without exposing credentials", async () => {
  const token = "Bearer-timeout-secret";
  const client = createCloudflareClient({
    token,
    attempts: 1,
    fetchImpl: async () => { throw new DOMException("timed out", "AbortError"); },
  });
  await assert.rejects(client.setSchedules([]), (error) => {
    assert.equal(error.exitCode, LIFECYCLE_EXIT_CODES.blocked);
    assert.doesNotMatch(error.message, /timeout-secret/);
    return true;
  });
});
