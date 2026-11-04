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
    vars: { BOT_AI_ENABLED: "false", BOT_DEMO_ENABLED: "true" },
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
    botAiEnabled: false,
    botDemoEnabled: true,
    persistentSchedulerCronEnabled: true,
  });
});

test("the recovery Cron is configured only in the AI Staging Wrangler environment", async () => {
  const path = fileURLToPath(new URL("../wrangler.jsonc", import.meta.url));
  const config = JSON.parse(await readFile(path, "utf8"));
  assert.equal(config.triggers, undefined, "root/default production config has no Cron trigger");
  assert.deepEqual(config.env?.["ai-staging"]?.triggers?.crons, ["* * * * *"]);
  assert.notEqual(config.vars?.BOT_DEMO_ENABLED, "true", "root/default Worker cannot enable bot demo seats");
  assert.equal(config.env?.["ai-staging"]?.vars?.BOT_DEMO_ENABLED, "true", "only AI Staging enables the deterministic bot demo");
});

test("rejects a default build artifact", () => {
  assert.throws(() => verifyAiStagingConfig({ ...validConfig(), targetEnvironment: "production" }), /not targeted/);
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
  assert.throws(() => verifyAiStagingConfig({ ...validConfig(), vars: { BOT_AI_ENABLED: "true" } }), /BOT_AI_ENABLED/);
  assert.throws(() => verifyAiStagingConfig({ ...validConfig(), vars: { BOT_AI_ENABLED: "false", BOT_DEMO_ENABLED: "false" } }), /BOT_DEMO_ENABLED/);
  assert.throws(() => verifyAiStagingConfig({ ...validConfig(), triggers: {} }), /one-minute bot recovery Cron/);
  assert.throws(() => verifyAiStagingConfig({ ...validConfig(), d1_databases: [...validConfig().d1_databases, {}] }), /exactly one/);
});
