import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { AI_STAGING_TARGET, verifyAiStagingConfig } from "../scripts/verify-ai-staging-config.mjs";

function validConfig() {
  return {
    targetEnvironment: "ai-staging",
    name: AI_STAGING_TARGET.workerName,
    workers_dev: true,
    preview_urls: false,
    version_metadata: { binding: "CF_VERSION_METADATA" },
    observability: { enabled: true, head_sampling_rate: 1, logs: { invocation_logs: false } },
    vars: { BOT_AI_ENABLED: "false", BOT_DEMO_ENABLED: "true", BOT_DEMO_DISABLE_HOURLY_ADD_LIMIT: "true", BOT_DIAGNOSTICS_ENABLED: "true", BOT_DIAGNOSTICS_PRIVATE_STAGING: "true" },
    triggers: { crons: ["* * * * *"] },
    d1_databases: [{
      binding: "DB",
      database_name: AI_STAGING_TARGET.databaseName,
      database_id: AI_STAGING_TARGET.databaseId,
    }],
  };
}

test("accepts the exact isolated Staging Worker and D1 target", () => {
  assert.deepEqual(verifyAiStagingConfig(validConfig()), {
    workerName: AI_STAGING_TARGET.workerName,
    databaseBinding: "DB",
    stagingDatabaseIdMatches: true,
    productionDatabaseExcluded: true,
    workersDev: true,
    previewUrls: false,
    workersLogsEnabled: true,
    automaticInvocationLogsDisabled: true,
    headSamplingRate: 1,
    privateStagingBotDiagnosticsEnabled: true,
    versionMetadataBound: true,
    botAiEnabled: false,
    botDemoEnabled: true,
    botDemoHourlyAddLimitDisabled: true,
    botDiagnosticsEnabled: true,
    persistentSchedulerCronEnabled: true,
  });
});

test("the recovery Cron is configured only in the AI Staging Wrangler environment", async () => {
  const path = fileURLToPath(new URL("../wrangler.jsonc", import.meta.url));
  const config = JSON.parse(await readFile(path, "utf8"));
  assert.equal(config.triggers, undefined, "root/default production config has no Cron trigger");
  assert.equal(config.observability, undefined, "root/default production config does not enable Workers Logs");
  assert.deepEqual(config.env?.["ai-staging"]?.observability, { enabled: true, head_sampling_rate: 1, logs: { invocation_logs: false } });
  assert.equal(config.env?.["ai-staging"]?.preview_urls, false, "AI Staging must not publish preview URLs");
  assert.equal(config.observability?.logs?.invocation_logs, undefined, "default Worker keeps existing invocation log behavior");
  assert.deepEqual(config.env?.["ai-staging"]?.triggers?.crons, ["* * * * *"]);
  assert.notEqual(config.vars?.BOT_DEMO_ENABLED, "true", "root/default Worker cannot enable bot demo seats");
  assert.notEqual(config.vars?.BOT_DEMO_DISABLE_HOURLY_ADD_LIMIT, "true", "root/default Worker cannot disable the hourly Bot-add guard");
  assert.notEqual(config.vars?.BOT_DIAGNOSTICS_ENABLED, "true", "root/default Worker cannot enable Bot diagnostics");
  assert.notEqual(config.vars?.BOT_DIAGNOSTICS_PRIVATE_STAGING, "true", "root/default Worker cannot enable private Bot diagnostics");
  assert.equal(config.env?.["ai-staging"]?.vars?.BOT_DEMO_ENABLED, "true", "only AI Staging enables the deterministic bot demo");
  assert.equal(config.env?.["ai-staging"]?.vars?.BOT_DEMO_DISABLE_HOURLY_ADD_LIMIT, "true", "only AI Staging disables the hourly Bot-add guard");
  assert.equal(config.env?.["ai-staging"]?.vars?.BOT_DIAGNOSTICS_ENABLED, "true", "only AI Staging enables bounded Bot diagnostics");
  assert.equal(config.env?.["ai-staging"]?.vars?.BOT_DIAGNOSTICS_PRIVATE_STAGING, "true", "only AI Staging enables private Bot diagnostics");
});

test("rejects a default build artifact", () => {
  assert.throws(() => verifyAiStagingConfig({ ...validConfig(), targetEnvironment: "production" }), /not targeted/);
});

test("rejects Workers Logs settings present only under the ignored source environment subtree", () => {
  const config = validConfig();
  delete config.observability;
  config.env = { "ai-staging": { observability: { enabled: true, head_sampling_rate: 1 } } };
  assert.throws(() => verifyAiStagingConfig(config), /Workers Logs must be enabled in the effective Staging config/);
});

test("rejects disabled or incomplete Workers Logs settings and non-unit sampling", () => {
  assert.throws(() => verifyAiStagingConfig({ ...validConfig(), observability: { enabled: false, head_sampling_rate: 1 } }), /Workers Logs must be enabled/);
  assert.throws(() => verifyAiStagingConfig({ ...validConfig(), observability: { enabled: true } }), /head_sampling_rate must be 1/);
  assert.throws(() => verifyAiStagingConfig({ ...validConfig(), observability: { enabled: true, head_sampling_rate: 0.5 } }), /head_sampling_rate must be 1/);
  assert.throws(() => verifyAiStagingConfig({ ...validConfig(), observability: { enabled: true, head_sampling_rate: 1, logs: { enabled: false, invocation_logs: false } } }), /Workers Logs must be enabled/);
  assert.throws(() => verifyAiStagingConfig({ ...validConfig(), observability: { enabled: true, head_sampling_rate: 1, logs: { invocation_logs: false, head_sampling_rate: 0.5 } } }), /sampling rate must be 1/);
});

test("requires automatic invocation logs disabled only in the effective AI Staging config", () => {
  assert.throws(() => verifyAiStagingConfig({ ...validConfig(), observability: { enabled: true, head_sampling_rate: 1 } }), /automatic invocation logs must be disabled/);
  assert.throws(() => verifyAiStagingConfig({ ...validConfig(), observability: { enabled: true, head_sampling_rate: 1, logs: { invocation_logs: true } } }), /automatic invocation logs must be disabled/);
  const config = validConfig();
  delete config.observability.logs.invocation_logs;
  config.env = { "ai-staging": { observability: { enabled: true, head_sampling_rate: 1, logs: { invocation_logs: false } } } };
  assert.throws(() => verifyAiStagingConfig(config), /automatic invocation logs must be disabled/);
});

test("rejects a production or unexpected database binding", () => {
  const config = validConfig();
  config.d1_databases[0].database_id = AI_STAGING_TARGET.productionDatabaseId;
  assert.throws(() => verifyAiStagingConfig(config), /expected Staging/);
});

test("rejects a config that contains the production database ID anywhere", () => {
  const config = { ...validConfig(), metadata: AI_STAGING_TARGET.productionDatabaseId };
  assert.throws(() => verifyAiStagingConfig(config), /contains the production/);
});

test("rejects unsafe Worker flags, AI enablement, or extra D1 bindings", () => {
  assert.throws(() => verifyAiStagingConfig({ ...validConfig(), workers_dev: false }), /workers_dev/);
  assert.throws(() => verifyAiStagingConfig({ ...validConfig(), preview_urls: true }), /preview URLs/);
  assert.throws(() => verifyAiStagingConfig({ ...validConfig(), version_metadata: undefined }), /version metadata/);
  assert.throws(() => verifyAiStagingConfig({ ...validConfig(), vars: { BOT_AI_ENABLED: "true" } }), /BOT_AI_ENABLED/);
  assert.throws(() => verifyAiStagingConfig({ ...validConfig(), vars: { BOT_AI_ENABLED: "false", BOT_DEMO_ENABLED: "false" } }), /BOT_DEMO_ENABLED/);
  assert.throws(() => verifyAiStagingConfig({ ...validConfig(), vars: { BOT_AI_ENABLED: "false", BOT_DEMO_ENABLED: "true", BOT_DEMO_DISABLE_HOURLY_ADD_LIMIT: "false" } }), /BOT_DEMO_DISABLE_HOURLY_ADD_LIMIT/);
  assert.throws(() => verifyAiStagingConfig({ ...validConfig(), vars: { BOT_AI_ENABLED: "false", BOT_DEMO_ENABLED: "true", BOT_DEMO_DISABLE_HOURLY_ADD_LIMIT: "true", BOT_DIAGNOSTICS_ENABLED: "false" } }), /BOT_DIAGNOSTICS_ENABLED/);
  assert.throws(() => verifyAiStagingConfig({ ...validConfig(), vars: { ...validConfig().vars, BOT_DIAGNOSTICS_PRIVATE_STAGING: "false" } }), /BOT_DIAGNOSTICS_PRIVATE_STAGING/);
  assert.throws(() => verifyAiStagingConfig({ ...validConfig(), triggers: {} }), /one-minute bot recovery Cron/);
  assert.throws(() => verifyAiStagingConfig({ ...validConfig(), d1_databases: [...validConfig().d1_databases, {}] }), /exactly one/);
});
