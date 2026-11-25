import { spawn } from "node:child_process";
import { mkdirSync, readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { performance } from "node:perf_hooks";
import { fileURLToPath } from "node:url";
import { parseTestTimings } from "./test-timing.mjs";
import { shouldRetryApiShard } from "./browser/wrangler-worker-restart-policy.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const files = readdirSync(new URL("./api/", import.meta.url))
  .filter((file) => file.endsWith(".test.mjs"))
  .sort()
  .map((file) => `tests/api/${file}`);

// Keep two isolated groups explicit and run them sequentially. Each shard owns
// a local Wrangler/Miniflare/D1 process tree; concurrent shards have produced
// intermittent `fetch failed` errors in otherwise unrelated API scenarios.
// Serial execution bounds the local Worker count without skipping tests or
// changing their assertions.
const shardGroups = [
  ["tests/api/da-qiao.test.mjs", "tests/api/equipment.test.mjs", "tests/api/gongsun-zan.test.mjs", "tests/api/judgement.test.mjs", "tests/api/ma-chao.test.mjs", "tests/api/eight-trigrams-failed-response.test.mjs", "tests/api/lobby-heroes-wei.test.mjs", "tests/api/lightning-overindulgence-preset.test.mjs", "tests/api/bot-scheduler.test.mjs", "tests/api/free-budget-runtime-benchmark.test.mjs", "tests/api/concurrency.test.mjs", "tests/api/yue-jin-dauntless.test.mjs", "tests/api/huang-yueying.test.mjs", "tests/api/lady-gan.test.mjs", "tests/api/sun-shangxiang.test.mjs", "tests/api/hua-tuo.test.mjs", "tests/api/diao-chan.test.mjs", "tests/api/hua-xiong.test.mjs", "tests/api/pan-feng.test.mjs", "tests/api/huang-gai.test.mjs", "tests/api/public-activity.test.mjs"],
  ["tests/api/shared-response-window.test.mjs", "tests/api/privacy-response.test.mjs", "tests/api/heroes-wu-shu.test.mjs", "tests/api/stratagems.test.mjs", "tests/api/group-root-public-card-proof.test.mjs", "tests/api/borrowed-sword.test.mjs", "tests/api/play-target-eligibility.test.mjs", "tests/api/presentation-semantics.test.mjs", "tests/api/presentation-v2-engine.test.mjs", "tests/api/presentation-causality.test.mjs", "tests/api/zhuge-liang.test.mjs", "tests/api/normal-draw-public-outcome.test.mjs", "tests/api/peach-public-outcome.test.mjs"],
];
const assigned = shardGroups.flat();
if (assigned.length !== files.length || new Set(assigned).size !== files.length || files.some((file) => !assigned.includes(file))) {
  throw new Error(`API shard groups do not cover the discovered test files: ${files.join(", ")}`);
}

const startedAt = performance.now();
const apiLogBasePath = process.env.WRANGLER_LOG_PATH
  ? resolve(process.env.WRANGLER_LOG_PATH)
  : resolve(root, ".wrangler/api-logs");
const apiLogRunPath = apiLogBasePath.endsWith(".log")
  ? apiLogBasePath.replace(/\.log$/, `.api-run-${process.pid}-${Date.now()}.log`)
  : join(apiLogBasePath, `api-run-${process.pid}-${Date.now()}`);

function logPathFor(index, attempt) {
  if (apiLogRunPath.endsWith(".log")) {
    return apiLogRunPath.replace(/\.log$/, `.api-shard-${index + 1}-attempt-${attempt}.log`);
  }
  return join(apiLogRunPath, `api-shard-${index + 1}-attempt-${attempt}`);
}

function readWranglerLogs(path) {
  if (path.endsWith(".log")) {
    try { return readFileSync(path, "utf8"); }
    catch { return ""; }
  }
  try {
    return readdirSync(path, { withFileTypes: true })
      .filter((entry) => entry.isFile() && entry.name.endsWith(".log"))
      .map((entry) => readFileSync(join(path, entry.name), "utf8"))
      .join("\n");
  } catch { return ""; }
}

function runShard(shardFiles, index, attempt, { label = `api-shard-${index + 1}`, envOverrides = {} } = {}) {
  const port = 3137 + index;
  const wranglerLogPath = logPathFor(index, attempt);
  if (!wranglerLogPath.endsWith(".log")) mkdirSync(wranglerLogPath, { recursive: true });
  const child = spawn(process.execPath, ["tests/run-tests.mjs"], {
    cwd: root,
    env: { ...process.env, ...envOverrides, WRANGLER_LOG_PATH: wranglerLogPath, GAME_TEST_FILES: shardFiles.join(","), GAME_TEST_PORT: String(port), GAME_TEST_URL: `http://localhost:${port}`, GAME_TEST_INSPECTOR_PORT: String(9229 + index) },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let output = "";
  for (const stream of [child.stdout, child.stderr]) stream.on("data", (chunk) => {
    const text = chunk.toString();
    output += text;
    process.stdout.write(`[${label}] ${text.replaceAll("\n", `\n[${label}] `)}`);
  });
  return new Promise((resolve) => {
    child.on("error", (error) => resolve({ index, label, code: 1, output: `${output}\n${error.message}`, wranglerLog: readWranglerLogs(wranglerLogPath) }));
    child.on("exit", (code, signal) => resolve({ index, label, code: code ?? 1, signal, output, wranglerLog: readWranglerLogs(wranglerLogPath) }));
  });
}

const results = [];
for (const [index, shardFiles] of shardGroups.entries()) {
  let result = await runShard(shardFiles, index, 1, {
    envOverrides: { GAME_TEST_BOT_DEMO_DISABLE_HOURLY_ADD_LIMIT: "false" },
  });
  if (shouldRetryApiShard({
    code: result.code,
    wasReady: result.output.includes("[api-test-worker] ready"),
    log: result.wranglerLog,
    isCI: process.env.CI === "true",
    attempt: 1,
  })) {
    console.error(`[api-shard-${index + 1}] Retrying the full shard once after Wrangler's known ProxyWorker network disconnect; a new local D1 is created.`);
    result = await runShard(shardFiles, index, 2, {
      envOverrides: { GAME_TEST_BOT_DEMO_DISABLE_HOURLY_ADD_LIMIT: "false" },
    });
  }
  results.push(result);
}
// Exercise the explicit AI Staging quota opt-out against a fresh local D1.
// The full API shards above keep the flag absent and prove the default 12/hour cap.
const optOutLabel = "bot-hourly-limit-opt-out";
let optOutResult = await runShard(["tests/api/bot-scheduler.test.mjs"], 2, 1, {
  label: optOutLabel,
  envOverrides: { GAME_TEST_BOT_DEMO_DISABLE_HOURLY_ADD_LIMIT: "true" },
});
if (shouldRetryApiShard({
  code: optOutResult.code,
  wasReady: optOutResult.output.includes("[api-test-worker] ready"),
  log: optOutResult.wranglerLog,
  isCI: process.env.CI === "true",
  attempt: 1,
})) {
  console.error(`[${optOutLabel}] Retrying the focused opt-out regression once after Wrangler's known ProxyWorker network disconnect; a new local D1 is created.`);
  optOutResult = await runShard(["tests/api/bot-scheduler.test.mjs"], 2, 2, {
    label: optOutLabel,
    envOverrides: { GAME_TEST_BOT_DEMO_DISABLE_HOURLY_ADD_LIMIT: "true" },
  });
}
results.push(optOutResult);
const durationMs = performance.now() - startedAt;
const testCount = results.reduce((count, result) => count + Number(result.output.match(/^\s*(?:#|ℹ)\s+tests\s+(\d+)\s*$/m)?.[1] ?? 0), 0);
console.log(`\nTiming: API tests=${testCount}, duration=${(durationMs / 1000).toFixed(2)}s, files=${files.length}, shards=${shardGroups.length} plus focused Staging opt-out`);
const timings = results.flatMap((result) => parseTestTimings(result.output)).sort((a, b) => b.duration - a.duration);
console.log("Top 10 slowest API tests across shards:");
for (const entry of timings.slice(0, 10)) console.log(`  ${(entry.duration / 1000).toFixed(2)}s  ${entry.name}`);
for (const result of results) {
  if (result.code !== 0) console.error(`${result.label} failed${result.signal ? ` (${result.signal})` : ""}.`);
}
process.exit(results.every((result) => result.code === 0) ? 0 : 1);
