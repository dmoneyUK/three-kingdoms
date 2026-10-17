import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const AI_STAGING_TARGET = Object.freeze({
  workerName: "three-kingdoms-ai-staging",
  databaseName: "three-kingdoms-ai-staging-db",
  databaseId: "62616495-59ea-4a9c-b669-2d3267a83cab",
  productionDatabaseId: "3151997a-f69e-4a45-ab51-9e4fd062aeb3",
});

export function verifyAiStagingConfig(config) {
  if (config?.targetEnvironment !== "ai-staging") {
    throw new Error("generated config is not targeted at ai-staging");
  }
  if (config?.name !== AI_STAGING_TARGET.workerName) {
    throw new Error("generated Worker name is not the Staging Worker");
  }
  if (config?.workers_dev !== true) {
    throw new Error("Staging Worker must have workers_dev enabled");
  }
  if (config?.vars?.BOT_AI_ENABLED !== "false") {
    throw new Error("BOT_AI_ENABLED must be the string false");
  }
  if (!Array.isArray(config?.d1_databases) || config.d1_databases.length !== 1) {
    throw new Error("generated config must contain exactly one D1 binding");
  }

  const [database] = config.d1_databases;
  if (database?.binding !== "DB") {
    throw new Error("the sole D1 binding must be DB");
  }
  if (database?.database_name !== AI_STAGING_TARGET.databaseName) {
    throw new Error("DB is not bound to the Staging database name");
  }
  if (database?.database_id !== AI_STAGING_TARGET.databaseId) {
    throw new Error("DB is not bound to the expected Staging database ID");
  }
  if (JSON.stringify(config).includes(AI_STAGING_TARGET.productionDatabaseId)) {
    throw new Error("generated config contains the production D1 database ID");
  }

  return Object.freeze({
    workerName: AI_STAGING_TARGET.workerName,
    databaseBinding: "DB",
    stagingDatabaseIdMatches: true,
    productionDatabaseExcluded: true,
    workersDev: true,
    botAiEnabled: false,
  });
}

async function main() {
  const configPath = resolve(process.argv[2] ?? "dist/server/wrangler.json");
  let config;
  try {
    config = JSON.parse(await readFile(configPath, "utf8"));
  } catch {
    throw new Error("generated Staging Wrangler config is missing or invalid JSON");
  }

  const evidence = verifyAiStagingConfig(config);
  console.log(JSON.stringify(evidence));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(`Staging target verification failed: ${error.message}`);
    process.exitCode = 1;
  });
}
