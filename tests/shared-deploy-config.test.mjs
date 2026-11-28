import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import test from "node:test";
import { DEFAULT_GENERATED_CONFIG_PATH, SHARED_DEPLOY_TARGET, verifySharedDeployConfig } from "../scripts/verify-shared-deploy-config.mjs";

const REPOSITORY_ROOT = resolve(fileURLToPath(new URL("../", import.meta.url)));
const SCRIPT_PATH = resolve(REPOSITORY_ROOT, "scripts/verify-shared-deploy-config.mjs");

function generatedDefaultFixture(root = REPOSITORY_ROOT) {
  const configPath = resolve(root, "dist/server/wrangler.json");
  const migrationsPath = resolve(root, "drizzle");
  const sourceConfig = resolve(root, "wrangler.jsonc");
  return {
    configPath: sourceConfig,
    userConfigPath: sourceConfig,
    topLevelName: SHARED_DEPLOY_TARGET.workerName,
    definedEnvironments: ["ux3-staging"],
    compatibility_date: "2026-09-01",
    compatibility_flags: ["nodejs_compat"],
    jsx_factory: "React.createElement",
    jsx_fragment: "React.Fragment",
    rules: [{ type: "ESModule", globs: ["**/*.js", "**/*.mjs"] }],
    name: SHARED_DEPLOY_TARGET.workerName,
    main: "index.js",
    triggers: {},
    assets: { directory: "../client" },
    vars: {},
    durable_objects: { bindings: [] },
    workflows: [],
    migrations: [],
    exports: {},
    kv_namespaces: [],
    cloudchamber: {},
    send_email: [],
    queues: { producers: [], consumers: [] },
    connect: [],
    r2_buckets: [],
    d1_databases: [{
      binding: SHARED_DEPLOY_TARGET.databaseBinding,
      database_name: SHARED_DEPLOY_TARGET.databaseName,
      database_id: SHARED_DEPLOY_TARGET.databaseId,
      migrations_dir: relative(dirname(configPath), migrationsPath),
    }],
    vectorize: [],
    ai_search_namespaces: [],
    ai_search: [],
    agent_memory: [],
    hyperdrive: [],
    services: [],
    analytics_engine_datasets: [],
    dispatch_namespaces: [],
    mtls_certificates: [],
    pipelines: [],
    secrets_store_secrets: [],
    artifacts: [],
    unsafe_hello_world: [],
    flagship: [],
    worker_loaders: [],
    ratelimits: [],
    vpc_services: [],
    vpc_networks: [],
    logfwdr: { bindings: [] },
    python_modules: { exclude: ["**/*.pyc"] },
    dev: {
      ip: "localhost",
      local_protocol: "http",
      upstream_protocol: "http",
      enable_containers: true,
      generate_types: false,
    },
    no_bundle: true,
  };
}

function assertRejected(mutator) {
  const config = generatedDefaultFixture();
  mutator(config);
  assert.throws(
    () => verifySharedDeployConfig(config, { configPath: DEFAULT_GENERATED_CONFIG_PATH }),
    /generated Wrangler config rejected/,
  );
}

test("accepts the reviewed default generated shared target", () => {
  assert.deepEqual(
    verifySharedDeployConfig(generatedDefaultFixture(), { configPath: DEFAULT_GENERATED_CONFIG_PATH }),
    {
      workerName: "three-kingdoms",
      databaseName: "three-kingdoms-db",
      databaseBinding: "DB",
    },
  );
});

test("rejects a selected named environment", () => {
  assertRejected((config) => { config.targetEnvironment = "ux3-staging"; });
});

test("rejects a wrong Worker name or top-level target", () => {
  assertRejected((config) => { config.name = "three-kingdoms-ux3-staging"; });
  assertRejected((config) => { config.topLevelName = "three-kingdoms-ux3-staging"; });
});

test("rejects a changed generated environment inventory", () => {
  assertRejected((config) => { config.definedEnvironments = []; });
  assertRejected((config) => { config.definedEnvironments.push("production"); });
});

test("rejects missing, extra, or incorrectly named D1 bindings", () => {
  assertRejected((config) => { config.d1_databases = []; });
  assertRejected((config) => { config.d1_databases.push({ binding: "OTHER" }); });
  assertRejected((config) => { config.d1_databases[0].binding = "OTHER"; });
  assertRejected((config) => { config.d1_databases[0].database_name = "other-db"; });
});

test("rejects AI Staging, UX3 sentinel, wrong, and malformed database IDs", () => {
  assertRejected((config) => { config.d1_databases[0].database_id = "62616495-59ea-4a9c-b669-2d3267a83cab"; });
  assertRejected((config) => { config.d1_databases[0].database_id = "00000000-0000-0000-0000-000000000000"; });
  assertRejected((config) => { config.d1_databases[0].database_id = "11111111-1111-4111-8111-111111111111"; });
  assertRejected((config) => { config.d1_databases[0].database_id = "not-a-uuid"; });
});

test("rejects remote D1 overrides and migration path changes", () => {
  assertRejected((config) => { config.d1_databases[0].remote = true; });
  assertRejected((config) => { config.d1_databases[0].remote = false; });
  assertRejected((config) => { config.d1_databases[0].migrations_dir = "drizzle"; });
  assertRejected((config) => { config.d1_databases[0].migrations_dir = "../../../../outside"; });
  assertRejected((config) => { config.d1_databases[0].migrations_dir = "/tmp/drizzle"; });
});

test("rejects extra DB bindings, routes, domains, and Cron", () => {
  assertRejected((config) => { config.d1_databases.push({ binding: "OTHER" }); });
  assertRejected((config) => { config.routes = [{ pattern: "example.invalid/*" }]; });
  assertRejected((config) => { config.custom_domains = ["example.invalid"]; });
  assertRejected((config) => { config.triggers.crons = ["* * * * *"]; });
});

test("rejects workers.dev, preview, image, and other binding overrides", () => {
  assertRejected((config) => { config.workers_dev = true; });
  assertRejected((config) => { config.preview_urls = true; });
  assertRejected((config) => { config.images = { binding: "IMAGES" }; });
  assertRejected((config) => { config.services = [{ binding: "API", service: "other-worker" }]; });
  assertRejected((config) => { config.kv_namespaces = [{ binding: "CACHE", id: "fixture" }]; });
});

test("rejects active test, Bot, and AI variables", () => {
  assertRejected((config) => { config.vars = { WTK_TEST_CAPABILITIES: "1" }; });
  assertRejected((config) => { config.vars = { BOT_CRON_ENABLED: "1" }; });
  assertRejected((config) => { config.vars = { AI_BACKEND: "enabled" }; });
});

test("rejects unsafe and legacy named-binding maps", () => {
  assertRejected((config) => { config.unsafe = { bindings: [{ name: "OTHER" }] }; });
  assertRejected((config) => { config.unsafe_hello_world = [{ binding: "UNSAFE" }]; });
  assertRejected((config) => { config.wasm_modules = [{ name: "module" }]; });
  assertRejected((config) => { config.text_blobs = [{ name: "text" }]; });
  assertRejected((config) => { config.data_blobs = [{ name: "data" }]; });
});

test("rejects missing and non-object generated configurations", () => {
  assert.throws(() => verifySharedDeployConfig(null), /missing or invalid/);
  assert.throws(() => verifySharedDeployConfig([]), /missing or invalid/);
});

test("rejects a caller-selected generated-config path", () => {
  assert.throws(
    () => verifySharedDeployConfig(generatedDefaultFixture(), { configPath: resolve(REPOSITORY_ROOT, "other.json") }),
    /only the default generated Wrangler config/,
  );
});

test("matches the actual generated default when a build artifact is present", { skip: !existsSync(DEFAULT_GENERATED_CONFIG_PATH) }, () => {
  const actual = JSON.parse(readFileSync(DEFAULT_GENERATED_CONFIG_PATH, "utf8"));
  assert.doesNotThrow(() => verifySharedDeployConfig(actual, { configPath: DEFAULT_GENERATED_CONFIG_PATH }));
});

function makeCliSandbox() {
  const tempRoot = mkdtempSync(resolve(REPOSITORY_ROOT, ".ux3-shared-deploy-"));
  const scriptsDirectory = resolve(tempRoot, "scripts");
  const generatedDirectory = resolve(tempRoot, "dist/server");
  mkdirSync(scriptsDirectory, { recursive: true });
  mkdirSync(generatedDirectory, { recursive: true });
  writeFileSync(resolve(tempRoot, "wrangler.jsonc"), "{}\n");
  cpSync(SCRIPT_PATH, resolve(scriptsDirectory, "verify-shared-deploy-config.mjs"));
  return { tempRoot, generatedPath: resolve(generatedDirectory, "wrangler.json") };
}

function invokeCliInChild(tempRoot, generatedPath) {
  const scriptUrl = pathToFileURL(resolve(tempRoot, "scripts/verify-shared-deploy-config.mjs")).href;
  const args = ["--config", generatedPath];
  const source = "import { runCli } from " + JSON.stringify(scriptUrl)
    + "; process.exitCode = runCli(" + JSON.stringify(args) + ");";
  return spawnSync(process.execPath, ["--input-type=module", "-e", source], {
    cwd: tempRoot,
    encoding: "utf8",
  });
}

test("CLI rejects a generated config symlink that escapes its checkout", () => {
  const sandbox = makeCliSandbox();
  const outside = mkdtempSync(resolve(tmpdir(), "ux3-shared-config-outside-"));
  try {
    const outsideConfig = resolve(outside, "wrangler.json");
    writeFileSync(outsideConfig, JSON.stringify(generatedDefaultFixture(sandbox.tempRoot)));
    symlinkSync(outsideConfig, sandbox.generatedPath);
    const result = invokeCliInChild(sandbox.tempRoot, sandbox.generatedPath);
    assert.notEqual(result.status, 0, JSON.stringify({ status: result.status, stdout: result.stdout, stderr: result.stderr, error: result.error }));
    assert.match(result.stderr, /generated config resolves outside the trusted checkout/);
  } finally {
    rmSync(sandbox.tempRoot, { recursive: true, force: true });
    rmSync(outside, { recursive: true, force: true });
  }
});

test("CLI rejects a migrations directory symlink that escapes its checkout", () => {
  const sandbox = makeCliSandbox();
  const outside = mkdtempSync(resolve(tmpdir(), "ux3-shared-migrations-outside-"));
  try {
    symlinkSync(outside, resolve(sandbox.tempRoot, "drizzle"), "dir");
    writeFileSync(sandbox.generatedPath, JSON.stringify(generatedDefaultFixture(sandbox.tempRoot)));
    const result = invokeCliInChild(sandbox.tempRoot, sandbox.generatedPath);
    assert.notEqual(result.status, 0, result.stdout + result.stderr);
    assert.match(result.stderr, /generated migrations directory resolves outside the trusted checkout/);
  } finally {
    rmSync(sandbox.tempRoot, { recursive: true, force: true });
    rmSync(outside, { recursive: true, force: true });
  }
});

test("CLI rejects invalid generated JSON without echoing its contents", () => {
  const sandbox = makeCliSandbox();
  try {
    writeFileSync(sandbox.generatedPath, "{not valid JSON and not safe to echo}");
    const result = invokeCliInChild(sandbox.tempRoot, sandbox.generatedPath);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /missing or invalid JSON/);
    assert.doesNotMatch(result.stderr, /not safe to echo/);
  } finally {
    rmSync(sandbox.tempRoot, { recursive: true, force: true });
  }
});
