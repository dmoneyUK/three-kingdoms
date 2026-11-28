import { readFileSync, realpathSync } from "node:fs";
import { dirname, isAbsolute, relative, resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export const SHARED_DEPLOY_TARGET = Object.freeze({
  workerName: "three-kingdoms",
  databaseBinding: "DB",
  databaseName: "three-kingdoms-db",
  databaseId: "3151997a-f69e-4a45-ab51-9e4fd062aeb3",
});

const TRUSTED_CHECKOUT_ROOT = realpathSync(resolve(fileURLToPath(new URL("../", import.meta.url))));
const TRUSTED_WRANGLER_CONFIG_PATH = resolve(TRUSTED_CHECKOUT_ROOT, "wrangler.jsonc");
const TRUSTED_MIGRATION_DIRECTORY = resolve(TRUSTED_CHECKOUT_ROOT, "drizzle");
export const DEFAULT_GENERATED_CONFIG_PATH = resolve(
  TRUSTED_CHECKOUT_ROOT,
  "dist",
  "server",
  "wrangler.json",
);

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isPathInside(directory, target) {
  const relativePath = relative(directory, target);
  return relativePath === ""
    || (relativePath !== ".."
      && !relativePath.startsWith(".." + sep)
      && !isAbsolute(relativePath));
}

function expectedGeneratedConfig(configPath) {
  return {
    configPath: TRUSTED_WRANGLER_CONFIG_PATH,
    userConfigPath: TRUSTED_WRANGLER_CONFIG_PATH,
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
      migrations_dir: relative(dirname(configPath), TRUSTED_MIGRATION_DIRECTORY),
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

function collectShapeDifferences(actual, expected, path = "config", differences = []) {
  if (Array.isArray(actual) || Array.isArray(expected)) {
    if (!Array.isArray(actual) || !Array.isArray(expected)) {
      differences.push(path);
      return differences;
    }
    if (actual.length !== expected.length) differences.push(path + ".length");
    for (let index = 0; index < Math.min(actual.length, expected.length); index += 1) {
      collectShapeDifferences(actual[index], expected[index], path + "[" + index + "]", differences);
    }
    return differences;
  }

  if (isRecord(actual) || isRecord(expected)) {
    if (!isRecord(actual) || !isRecord(expected)) {
      differences.push(path);
      return differences;
    }
    const keys = new Set([...Object.keys(actual), ...Object.keys(expected)]);
    for (const key of [...keys].sort()) {
      if (!Object.hasOwn(actual, key) || !Object.hasOwn(expected, key)) {
        differences.push(path + "." + key);
      } else {
        collectShapeDifferences(actual[key], expected[key], path + "." + key, differences);
      }
    }
    return differences;
  }

  if (actual !== expected) differences.push(path);
  return differences;
}

function resolveGeneratedConfigPath(configPath) {
  if (typeof configPath !== "string" || configPath.trim() === "") {
    throw new Error("generated config path must be a non-empty string");
  }
  const resolvedConfigPath = resolve(configPath);
  if (!isPathInside(TRUSTED_CHECKOUT_ROOT, resolvedConfigPath)) {
    throw new Error("generated config path must be inside the trusted checkout");
  }
  if (resolvedConfigPath !== DEFAULT_GENERATED_CONFIG_PATH) {
    throw new Error("only the default generated Wrangler config is allowed");
  }
  return resolvedConfigPath;
}

/** Offline-only validation. This never invokes Wrangler or contacts Cloudflare. */
export function verifySharedDeployConfig(config, options = {}) {
  if (!isRecord(config)) throw new Error("generated Wrangler config is missing or invalid");

  const configPath = resolveGeneratedConfigPath(options.configPath ?? DEFAULT_GENERATED_CONFIG_PATH);
  const differences = collectShapeDifferences(config, expectedGeneratedConfig(configPath));
  if (differences.length > 0) {
    throw new Error("generated Wrangler config rejected; unexpected reviewed-shape fields: "
      + [...new Set(differences)].join(", "));
  }

  return Object.freeze({
    workerName: SHARED_DEPLOY_TARGET.workerName,
    databaseName: SHARED_DEPLOY_TARGET.databaseName,
    databaseBinding: SHARED_DEPLOY_TARGET.databaseBinding,
  });
}

function verifyGeneratedConfigRealPath(configPath) {
  let checkoutRoot;
  let generatedPath;
  try {
    checkoutRoot = realpathSync(TRUSTED_CHECKOUT_ROOT);
    generatedPath = realpathSync(configPath);
  } catch {
    throw new Error("generated config could not be resolved safely");
  }

  const expectedGeneratedPath = resolve(checkoutRoot, relative(TRUSTED_CHECKOUT_ROOT, DEFAULT_GENERATED_CONFIG_PATH));
  if (!isPathInside(checkoutRoot, generatedPath) || generatedPath !== expectedGeneratedPath) {
    throw new Error("generated config resolves outside the trusted checkout");
  }
}

function verifyMigrationsRealPath(config, configPath) {
  const checkoutRoot = realpathSync(TRUSTED_CHECKOUT_ROOT);
  const expectedMigrationsPath = resolve(checkoutRoot, "drizzle");
  let migrationsPath;
  try {
    migrationsPath = realpathSync(resolve(dirname(configPath), config.d1_databases[0].migrations_dir));
  } catch {
    throw new Error("generated migrations directory could not be resolved safely");
  }
  if (!isPathInside(checkoutRoot, migrationsPath) || migrationsPath !== expectedMigrationsPath) {
    throw new Error("generated migrations directory resolves outside the trusted checkout");
  }
}

function parseArguments(args) {
  if (args.length !== 2 || args[0] !== "--config" || !args[1] || args[1].startsWith("--")) {
    throw new Error("usage: node scripts/verify-shared-deploy-config.mjs --config dist/server/wrangler.json");
  }
  return resolveGeneratedConfigPath(args[1]);
}

export function runCli(args) {
  try {
    const configPath = parseArguments(args);
    verifyGeneratedConfigRealPath(configPath);
    let source;
    try {
      source = readFileSync(configPath, "utf8");
    } catch {
      throw new Error("generated Wrangler config could not be read");
    }

    let config;
    try {
      config = JSON.parse(source);
    } catch {
      throw new Error("generated Wrangler config is missing or invalid JSON");
    }

    const result = verifySharedDeployConfig(config, { configPath });
    verifyMigrationsRealPath(config, configPath);
    console.log("Shared deploy target verified offline: Worker " + result.workerName
      + ", D1 " + result.databaseName + ". No remote operation was performed.");
    return 0;
  } catch (error) {
    console.error(error instanceof Error ? error.message : "generated Wrangler config rejected");
    return 1;
  }
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  process.exitCode = runCli(process.argv.slice(2));
}
