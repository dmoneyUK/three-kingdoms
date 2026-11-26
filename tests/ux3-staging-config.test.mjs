import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import {
  UX3_STAGING_D1_SENTINEL,
  verifyUx3StagingConfig,
} from "../scripts/verify-ux3-staging-config.mjs";

const LOCAL_FIXTURE_D1_ID = "8a5a0648-1c23-4adf-9a38-f9c6449711a0";
const HOSTED_FIXTURE_D1_ID = "82ce5385-03fc-43a5-bace-462baef9f3b3";
const EXPECTED_PRODUCTION_D1_ID = "3151997a-f69e-4a45-ab51-9e4fd062aeb3";
const EXPECTED_AI_D1_ID = "62616495-59ea-4a9c-b669-2d3267a83cab";

const BASE_CONFIG = Object.freeze({
  targetEnvironment: "ux3-staging",
  name: "three-kingdoms-ux3-staging",
  topLevelName: "three-kingdoms",
  definedEnvironments: ["ux3-staging"],
  workers_dev: false,
  preview_urls: false,
  routes: [],
  triggers: { crons: [] },
  vars: {},
  d1_databases: [
    {
      binding: "DB",
      database_name: "three-kingdoms-ux3-staging-db",
      database_id: UX3_STAGING_D1_SENTINEL,
      migrations_dir: "../../drizzle",
    },
  ],
  kv_namespaces: [],
  r2_buckets: [],
  services: [],
  durable_objects: { bindings: [] },
  queues: { producers: [], consumers: [] },
  ai_search: [],
  ai_search_namespaces: [],
  vectorize: [],
  workflows: [],
});

const guardScript = fileURLToPath(new URL("../scripts/verify-ux3-staging-config.mjs", import.meta.url));
const cloneConfig = () => structuredClone(BASE_CONFIG);

test("preparation accepts the dedicated generated target with only the sentinel D1 ID", () => {
  const result = verifyUx3StagingConfig(cloneConfig(), { mode: "preparation" });
  assert.deepEqual(result, { mode: "preparation", databaseIdClass: "sentinel" });
});

test("preparation accepts a local fixture UUID only when separately supplied", () => {
  const config = cloneConfig();
  config.d1_databases[0].database_id = LOCAL_FIXTURE_D1_ID;
  assert.throws(() => verifyUx3StagingConfig(config, { mode: "preparation" }), /explicitly allowed local fixture/);
  assert.deepEqual(
    verifyUx3StagingConfig(config, { mode: "preparation", localD1Id: LOCAL_FIXTURE_D1_ID }),
    { mode: "preparation", databaseIdClass: "local-fixture" },
  );
});

test("offline hosted validation requires a separate expected UUID and permits only its D1 remote flag", () => {
  const config = cloneConfig();
  config.d1_databases[0].database_id = HOSTED_FIXTURE_D1_ID;
  config.d1_databases[0].remote = true;
  assert.throws(() => verifyUx3StagingConfig(config, { mode: "hosted" }), /expected database UUID/);
  assert.deepEqual(
    verifyUx3StagingConfig(config, { mode: "hosted", expectedD1Id: HOSTED_FIXTURE_D1_ID }),
    { mode: "hosted", databaseIdClass: "hosted-expected" },
  );
});

const preparationRejections = [
  ["rejects a missing generated config", null, /missing or invalid/],
  ["rejects a wrong generated target environment", (c) => { c.targetEnvironment = "production"; }, /targetEnvironment/],
  ["rejects missing or additional environment names", (c) => { c.definedEnvironments = ["ux3-staging", "production"]; }, /definedEnvironments/],
  ["rejects a production Worker name", (c) => { c.name = "three-kingdoms"; }, /dedicated UX3 Staging Worker/],
  ["rejects a production database name", (c) => { c.d1_databases[0].database_name = "three-kingdoms-db"; }, /dedicated UX3 Staging database/],
  ["rejects the production D1 UUID", (c) => { c.d1_databases[0].database_id = EXPECTED_PRODUCTION_D1_ID; }, /protected production or AI database/],
  ["rejects the AI Staging D1 UUID", (c) => { c.d1_databases[0].database_id = EXPECTED_AI_D1_ID; }, /protected production or AI database/],
  ["rejects an unapproved real-looking D1 UUID", (c) => { c.d1_databases[0].database_id = LOCAL_FIXTURE_D1_ID; }, /explicitly allowed local fixture/],
  ["rejects an invalid D1 UUID", (c) => { c.d1_databases[0].database_id = "not-a-uuid"; }, /must be a UUID/],
  ["rejects a missing D1 binding", (c) => { c.d1_databases = []; }, /exactly one D1 binding/],
  ["rejects an additional D1 binding", (c) => { c.d1_databases.push(structuredClone(c.d1_databases[0])); }, /exactly one D1 binding/],
  ["rejects an incorrect D1 binding name", (c) => { c.d1_databases[0].binding = "OTHER"; }, /binding must be DB/],
  ["rejects an incorrect migration directory", (c) => { c.d1_databases[0].migrations_dir = "other"; }, /resolve to drizzle/],
  ["rejects an unexpected D1 option", (c) => { c.d1_databases[0].preview_database_id = LOCAL_FIXTURE_D1_ID; }, /not an allowed field/],
  ["rejects workers.dev", (c) => { c.workers_dev = true; }, /workers_dev must be false/],
  ["rejects a missing workers.dev guard", (c) => { delete c.workers_dev; }, /workers_dev must be false/],
  ["rejects preview URLs", (c) => { c.preview_urls = true; }, /preview_urls must be false/],
  ["rejects a missing preview URL guard", (c) => { delete c.preview_urls; }, /preview_urls must be false/],
  ["rejects a worker route", (c) => { c.routes = [{ pattern: "example.com/*" }]; }, /routes must be absent or empty/],
  ["rejects a custom domain", (c) => { c.custom_domains = ["example.com"]; }, /custom_domains must be absent or empty/],
  ["rejects a Cron trigger", (c) => { c.triggers.crons = ["*/5 * * * *"]; }, /triggers.crons must be empty/],
  ["rejects remote D1 mode", (c) => { c.d1_databases[0].remote = true; }, /not an allowed field|remote binding is forbidden/],
  ["rejects an extra KV binding", (c) => { c.kv_namespaces = [{ binding: "CACHE", id: "x" }]; }, /additional binding/],
  ["rejects an extra R2 binding", (c) => { c.r2_buckets = [{ binding: "ASSETS", bucket_name: "x" }]; }, /additional binding/],
  ["rejects an extra service binding", (c) => { c.services = [{ binding: "AI", service: "worker" }]; }, /additional binding/],
  ["rejects an extra Durable Object binding", (c) => { c.durable_objects.bindings = [{ name: "X", class_name: "X" }]; }, /additional binding/],
  ["rejects an extra queue binding", (c) => { c.queues.producers = [{ binding: "BOT_QUEUE", queue: "x" }]; }, /additional binding|Bot flag/],
  ["rejects an unknown extra binding collection", (c) => { c.custom_bindings = [{ name: "X" }]; }, /additional binding/],
  ["rejects the local test capability even when disabled", (c) => { c.vars.WTK_TEST_CAPABILITIES = "0"; }, /WTK_TEST_CAPABILITIES/],
  ["rejects a nested local test capability", (c) => { c.dev = { WTK_TEST_CAPABILITIES: "1" }; }, /WTK_TEST_CAPABILITIES/],
  ["rejects any Bot flag, including a false flag", (c) => { c.vars.BOT_PLAYER_ENABLED = false; }, /Bot flag/],
  ["rejects AI flags even when disabled", (c) => { c.vars.AI_PLAYER_ENABLED = false; }, /AI flag/],
  ["rejects camel-case Bot flags", (c) => { c.vars.botPlayerEnabled = false; }, /Bot flag/],
  ["rejects camel-case AI flags", (c) => { c.vars.aiPlayerEnabled = false; }, /AI flag/],
];

for (const [title, mutate, expected] of preparationRejections) {
  test(`preparation ${title}`, () => {
    if (!mutate) {
      assert.throws(() => verifyUx3StagingConfig(mutate, { mode: "preparation" }), expected);
      return;
    }
    const config = cloneConfig();
    mutate(config);
    assert.throws(() => verifyUx3StagingConfig(config, { mode: "preparation" }), expected);
  });
}

test("preparation rejects a remote flag anywhere outside the D1 entry", () => {
  const config = cloneConfig();
  config.unexpected = { remote: true };
  assert.throws(() => verifyUx3StagingConfig(config, { mode: "preparation" }), /remote binding is forbidden/);
});

test("secret-like generated values are rejected without echoing their contents", () => {
  const config = cloneConfig();
  config.vars.CLOUDFLARE_API_TOKEN = "do-not-print-this";
  assert.throws(() => verifyUx3StagingConfig(config, { mode: "preparation" }), (error) => {
    assert.match(error.message, /secret-like value/);
    assert.doesNotMatch(error.message, /do-not-print-this/);
    return true;
  });
});

test("hosted mode rejects the preparation sentinel and protected or mismatched IDs", () => {
  const sentinel = cloneConfig();
  assert.throws(
    () => verifyUx3StagingConfig(sentinel, { mode: "hosted", expectedD1Id: HOSTED_FIXTURE_D1_ID }),
    /hosted mode rejects the preparation sentinel/,
  );

  for (const id of [EXPECTED_PRODUCTION_D1_ID, EXPECTED_AI_D1_ID, LOCAL_FIXTURE_D1_ID]) {
    const config = cloneConfig();
    config.d1_databases[0].database_id = id;
    assert.throws(
      () => verifyUx3StagingConfig(config, { mode: "hosted", expectedD1Id: HOSTED_FIXTURE_D1_ID }),
      /protected production or AI database|does not match/,
    );
  }
});

test("hosted mode rejects a remote binding outside the explicitly allowed D1", () => {
  const config = cloneConfig();
  config.d1_databases[0].database_id = HOSTED_FIXTURE_D1_ID;
  config.unexpected = { remote: true };
  assert.throws(
    () => verifyUx3StagingConfig(config, { mode: "hosted", expectedD1Id: HOSTED_FIXTURE_D1_ID }),
    /remote binding is forbidden/,
  );
});

test("CLI rejects unreadable and invalid generated configs without echoing content", () => {
  const directory = mkdtempSync(join(tmpdir(), "ux3-staging-config-test-"));
  const invalidJson = join(directory, "invalid.json");
  writeFileSync(invalidJson, "private-token-value {", "utf8");
  try {
    const missing = spawnSync(process.execPath, [
      guardScript, "--mode", "preparation", "--config", join(directory, "missing.json"),
    ], { encoding: "utf8" });
    assert.equal(missing.status, 1);
    assert.match(missing.stderr, /could not be read/);

    const invalid = spawnSync(process.execPath, [
      guardScript, "--mode", "preparation", "--config", invalidJson,
    ], { encoding: "utf8" });
    assert.equal(invalid.status, 1);
    assert.match(invalid.stderr, /missing or invalid JSON/);
    assert.doesNotMatch(invalid.stderr, /private-token-value/);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
