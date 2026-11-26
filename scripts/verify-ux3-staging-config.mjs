import { readFileSync } from "node:fs";
import { dirname, isAbsolute, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

export const UX3_STAGING = Object.freeze({
  environment: "ux3-staging",
  workerName: "three-kingdoms-ux3-staging",
  databaseName: "three-kingdoms-ux3-staging-db",
  migrationDirectory: "drizzle",
});

export const UX3_STAGING_D1_SENTINEL = "00000000-0000-0000-0000-000000000000";

const TRUSTED_CHECKOUT_ROOT = resolve(fileURLToPath(new URL("../", import.meta.url)));
const TRUSTED_MIGRATION_DIRECTORY = resolve(TRUSTED_CHECKOUT_ROOT, UX3_STAGING.migrationDirectory);
export const DEFAULT_GENERATED_CONFIG_PATH = resolve(
  TRUSTED_CHECKOUT_ROOT,
  "dist",
  "server",
  "wrangler.json",
);

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DENIED_DATABASE_IDS = new Set([
  "3151997a-f69e-4a45-ab51-9e4fd062aeb3", // Production.
  "62616495-59ea-4a9c-b669-2d3267a83cab", // AI Staging.
]);

const FORBIDDEN_BINDING_KEY = /(?:^|_)(?:binding|bindings|namespace|namespaces|bucket|buckets|dataset|datasets|producer|producers|consumer|consumers|queue|queues|workflow|workflows|vectorize|hyperdrive|ratelimit|ratelimits|service|services|dispatch|pipeline|pipelines|artifact|artifacts|cloudchamber|browser|ai|durable_objects|r2|kv|send_email|secrets_store_secrets|mtls_certificates|vpc_services|vpc_networks|analytics_engine_datasets)(?:_|$)/i;
const BOT_FLAG_KEY = /bot|scheduler/i;
const AI_FLAG_KEY = /^(?:AI[A-Z0-9]|ai[A-Z0-9])|(?:^|[_-])ai(?:[_-]|$)/i;
const TEST_CAPABILITY_KEY = /^(?:wtk[_-]?)?test[_-]?capabilities$/i;
const PRIVATE_VALUE_KEY = /(?:token|secret|password|credential|private[_-]?key|account[_-]?id)/i;
const ROUTE_KEYS = ["routes", "route", "custom_domains", "custom_domain", "dev_routes"];
const LEGACY_BINDING_MAP_KEYS = new Set(["wasm_modules", "text_blobs", "data_blobs"]);

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function hasActiveValue(value) {
  if (value === null || value === undefined || value === false || value === "") return false;
  if (Array.isArray(value)) return value.some(hasActiveValue);
  if (isRecord(value)) return Object.values(value).some(hasActiveValue);
  return true;
}

function pathText(path) {
  return path.reduce((result, part) => {
    if (typeof part === "number") return `${result}[${part}]`;
    return `${result}${result ? "." : ""}${part}`;
  }, "");
}

function isPathInside(directory, target) {
  const relativePath = relative(directory, target);
  return relativePath === ""
    || (relativePath !== ".."
      && !relativePath.startsWith(`..${sep}`)
      && !isAbsolute(relativePath));
}

function resolveConfigPath(configPath, issues) {
  if (configPath === undefined) return DEFAULT_GENERATED_CONFIG_PATH;
  if (typeof configPath !== "string" || configPath.trim() === "") {
    issues.add("generated config path must be a non-empty string");
    return null;
  }

  const resolvedPath = resolve(configPath);
  if (!isPathInside(TRUSTED_CHECKOUT_ROOT, resolvedPath)) {
    issues.add("generated config path must be inside the trusted checkout");
  }
  return resolvedPath;
}

function inspectUnsafeSettings(value, issues, path = []) {
  if (!isRecord(value) && !Array.isArray(value)) return;

  const entries = Array.isArray(value)
    ? value.map((child, index) => [index, child])
    : Object.entries(value);

  for (const [key, child] of entries) {
    const nextPath = [...path, key];
    if (typeof key === "string" && /^unsafe(?:_|$)/i.test(key) && hasActiveValue(child)) {
      issues.add(`${pathText(nextPath)} unsafe setting is forbidden`);
    }
    inspectUnsafeSettings(child, issues, nextPath);
  }
}

function inspectLegacyBindingMaps(value, issues, path = []) {
  if (!isRecord(value) && !Array.isArray(value)) return;

  const entries = Array.isArray(value)
    ? value.map((child, index) => [index, child])
    : Object.entries(value);

  for (const [key, child] of entries) {
    const nextPath = [...path, key];
    if (typeof key === "string" && LEGACY_BINDING_MAP_KEYS.has(key.toLowerCase())
      && hasActiveValue(child)) {
      issues.add(`${pathText(nextPath)} legacy named binding map must be empty`);
    }
    inspectLegacyBindingMaps(child, issues, nextPath);
  }
}

function inspectForbiddenSettings(value, mode, issues, path = []) {
  if (!isRecord(value) && !Array.isArray(value)) return;

  const entries = Array.isArray(value)
    ? value.map((child, index) => [index, child])
    : Object.entries(value);

  for (const [key, child] of entries) {
    const nextPath = [...path, key];
    const normalizedKey = String(key).toLowerCase();
    const inD1Entry = path[0] === "d1_databases";
    const displayPath = pathText(nextPath);

    if (typeof key === "string" && TEST_CAPABILITY_KEY.test(key)) {
      issues.add(`${displayPath} is forbidden`);
    }

    if (typeof key === "string" && BOT_FLAG_KEY.test(key)) {
      issues.add(`${displayPath} Bot flag is forbidden`);
    } else if (typeof key === "string" && AI_FLAG_KEY.test(key)
      && (path[0] === "vars" || hasActiveValue(child))) {
      issues.add(`${displayPath} AI flag is forbidden`);
    }

    if (typeof key === "string" && PRIVATE_VALUE_KEY.test(key) && hasActiveValue(child)) {
      issues.add(`${displayPath} secret-like value is forbidden`);
    }

    if (normalizedKey === "remote") {
      const isAuthorizedHostedD1 = mode === "hosted"
        && path.length === 2
        && path[0] === "d1_databases"
        && path[1] === 0;
      if (typeof child !== "boolean") {
        issues.add(`${displayPath} must be a boolean when present`);
      } else if (child && !isAuthorizedHostedD1) {
        issues.add(`${displayPath} remote binding is forbidden`);
      }
    }

    const isD1Collection = path.length === 0 && normalizedKey === "d1_databases";
    if (!inD1Entry && !isD1Collection && typeof key === "string"
      && FORBIDDEN_BINDING_KEY.test(key) && hasActiveValue(child)) {
      issues.add(`${displayPath} is an additional binding`);
    }

    inspectForbiddenSettings(child, mode, issues, nextPath);
  }
}

function addRouteAndCronIssues(config, issues) {
  for (const key of ROUTE_KEYS) {
    if (Object.hasOwn(config, key) && hasActiveValue(config[key])) {
      issues.add(`${key} must be absent or empty`);
    }
  }

  if (Object.hasOwn(config, "triggers") && !isRecord(config.triggers)) {
    issues.add("triggers must be an object when present");
  }
  if (hasActiveValue(config.triggers?.crons)) issues.add("triggers.crons must be empty");
  if (Object.hasOwn(config, "crons") && hasActiveValue(config.crons)) issues.add("crons must be empty");
}

function validateDatabaseId(value, mode, options, issues) {
  if (typeof value !== "string" || !UUID_PATTERN.test(value)) {
    issues.add("d1_databases[0].database_id must be a UUID");
    return "invalid";
  }

  const normalized = value.toLowerCase();
  if (DENIED_DATABASE_IDS.has(normalized)) {
    issues.add("d1_databases[0].database_id matches a protected production or AI database");
    return "denied";
  }

  if (mode === "preparation") {
    const localD1Id = options.localD1Id?.toLowerCase();
    if (normalized === UX3_STAGING_D1_SENTINEL) return "sentinel";
    if (localD1Id && normalized === localD1Id && normalized !== UX3_STAGING_D1_SENTINEL) {
      return "local-fixture";
    }
    issues.add("d1_databases[0].database_id must be the sentinel or an explicitly allowed local fixture");
    return "unapproved";
  }

  const expected = options.expectedD1Id?.toLowerCase();
  if (!expected || !UUID_PATTERN.test(expected) || DENIED_DATABASE_IDS.has(expected)
    || expected === UX3_STAGING_D1_SENTINEL) {
    issues.add("hosted mode requires an independent, non-protected expected database UUID");
    return "invalid-expected";
  }
  if (normalized === UX3_STAGING_D1_SENTINEL) {
    issues.add("hosted mode rejects the preparation sentinel");
    return "sentinel";
  }
  if (normalized !== expected) {
    issues.add("d1_databases[0].database_id does not match the independently supplied expected UUID");
    return "mismatch";
  }
  return "hosted-expected";
}

/**
 * Offline-only validation for a generated Wrangler config. This function never
 * invokes Wrangler, contacts Cloudflare, provisions resources, or applies D1
 * migrations. Hosted mode is a future validation contract, not activation.
 */
export function verifyUx3StagingConfig(config, options = {}) {
  const issues = new Set();
  const { mode } = options;
  const configPath = resolveConfigPath(options.configPath, issues);

  if (mode !== "preparation" && mode !== "hosted") {
    throw new Error("mode must be preparation or hosted");
  }
  if (!isRecord(config)) throw new Error("generated Wrangler config is missing or invalid");

  if (config.targetEnvironment !== UX3_STAGING.environment) {
    issues.add("targetEnvironment must be ux3-staging");
  }
  if (config.name !== UX3_STAGING.workerName) {
    issues.add("name must be the dedicated UX3 Staging Worker");
  }
  if (!Array.isArray(config.definedEnvironments)
    || config.definedEnvironments.length !== 1
    || config.definedEnvironments[0] !== UX3_STAGING.environment) {
    issues.add("definedEnvironments must contain only ux3-staging");
  }
  if (config.workers_dev !== false) issues.add("workers_dev must be false");
  if (config.preview_urls !== false) issues.add("preview_urls must be false");

  if (!Array.isArray(config.d1_databases) || config.d1_databases.length !== 1) {
    issues.add("exactly one D1 binding is required");
  }

  let databaseIdClass = "invalid";
  if (Array.isArray(config.d1_databases) && config.d1_databases.length === 1) {
    const d1 = config.d1_databases[0];
    if (!isRecord(d1)) {
      issues.add("d1_databases[0] must be an object");
    } else {
      if (d1.binding !== "DB") issues.add("d1_databases[0].binding must be DB");
      if (d1.database_name !== UX3_STAGING.databaseName) {
        issues.add("d1_databases[0].database_name must be the dedicated UX3 Staging database");
      }
      if (typeof d1.migrations_dir !== "string"
        || !configPath
        || resolve(dirname(configPath), d1.migrations_dir) !== TRUSTED_MIGRATION_DIRECTORY) {
        issues.add("d1_databases[0].migrations_dir must resolve exactly to the trusted checkout drizzle directory");
      }

      const allowedD1Keys = mode === "hosted"
        ? new Set(["binding", "database_name", "database_id", "migrations_dir", "remote"])
        : new Set(["binding", "database_name", "database_id", "migrations_dir"]);
      for (const key of Object.keys(d1)) {
        if (!allowedD1Keys.has(key)) issues.add(`d1_databases[0].${key} is not an allowed field`);
      }

      databaseIdClass = validateDatabaseId(d1.database_id, mode, options, issues);
    }
  }

  addRouteAndCronIssues(config, issues);
  inspectForbiddenSettings(config, mode, issues);
  inspectLegacyBindingMaps(config, issues);
  inspectUnsafeSettings(config, issues);

  if (issues.size > 0) {
    throw new Error(`UX3 staging config rejected: ${[...issues].join("; ")}`);
  }

  return Object.freeze({ mode, databaseIdClass });
}

function parseArguments(args) {
  const options = {};
  for (let index = 0; index < args.length; index += 1) {
    const flag = args[index];
    const value = args[index + 1];
    if (!["--mode", "--config", "--local-d1-id", "--expected-d1-id"].includes(flag)) {
      throw new Error("usage: node scripts/verify-ux3-staging-config.mjs --mode preparation|hosted --config dist/server/wrangler.json [--local-d1-id UUID | --expected-d1-id UUID]");
    }
    if (!value || value.startsWith("--")) throw new Error(`${flag} requires a value`);
    const key = {
      "--mode": "mode",
      "--config": "configPath",
      "--local-d1-id": "localD1Id",
      "--expected-d1-id": "expectedD1Id",
    }[flag];
    if (Object.hasOwn(options, key)) throw new Error(`${flag} may be supplied only once`);
    options[key] = value;
    index += 1;
  }
  if (!options.mode || !options.configPath) {
    throw new Error("--mode and --config are required");
  }
  if (options.mode === "preparation" && options.expectedD1Id) {
    throw new Error("--expected-d1-id is available only in hosted mode");
  }
  if (options.mode === "hosted" && options.localD1Id) {
    throw new Error("--local-d1-id is available only in preparation mode");
  }
  return options;
}

export function runCli(args) {
  try {
    const options = parseArguments(args);
    const configPath = resolve(options.configPath);
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

    const result = verifyUx3StagingConfig(config, { ...options, configPath });
    console.log(`UX3 staging config verified (${result.mode}; database ID class: ${result.databaseIdClass}).`);
    return 0;
  } catch (error) {
    console.error(error instanceof Error ? error.message : "UX3 staging config rejected");
    return 1;
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exitCode = runCli(process.argv.slice(2));
}
