import { spawn } from "node:child_process";
import { readdirSync } from "node:fs";
import { performance } from "node:perf_hooks";

const root = new URL("../", import.meta.url);
const files = readdirSync(new URL("./api/", import.meta.url))
  .filter((file) => file.endsWith(".test.mjs"))
  .sort()
  .map((file) => `tests/api/${file}`);

// Keep the groups explicit so measured file costs can be rebalanced without
// changing test membership. Every child gets its own Wrangler/D1 lifecycle.
const shardGroups = [
  ["tests/api/equipment.test.mjs", "tests/api/judgement.test.mjs"],
  ["tests/api/privacy-response.test.mjs", "tests/api/heroes-wu-shu.test.mjs"],
  ["tests/api/stratagems.test.mjs", "tests/api/borrowed-sword.test.mjs"],
  ["tests/api/lobby-heroes-wei.test.mjs", "tests/api/concurrency.test.mjs", "tests/api/yue-jin-dauntless.test.mjs"],
];
const assigned = shardGroups.flat();
if (assigned.length !== files.length || new Set(assigned).size !== files.length || files.some((file) => !assigned.includes(file))) {
  throw new Error(`API shard groups do not cover the discovered test files: ${files.join(", ")}`);
}

const startedAt = performance.now();
const results = await Promise.all(shardGroups.map((shardFiles, index) => new Promise((resolve) => {
  const port = 3137 + index;
  const child = spawn(process.execPath, ["tests/run-tests.mjs"], {
    cwd: root,
    env: { ...process.env, GAME_TEST_FILES: shardFiles.join(","), GAME_TEST_PORT: String(port), GAME_TEST_URL: `http://localhost:${port}`, GAME_TEST_INSPECTOR_PORT: String(9229 + index) },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let output = "";
  for (const stream of [child.stdout, child.stderr]) stream.on("data", (chunk) => {
    const text = chunk.toString();
    output += text;
    process.stdout.write(`[api-shard-${index + 1}] ${text.replaceAll("\n", `\n[api-shard-${index + 1}] `)}`);
  });
  child.on("error", (error) => resolve({ index, code: 1, output: `${output}\n${error.message}` }));
  child.on("exit", (code, signal) => resolve({ index, code: code ?? 1, signal, output }));
})));

const durationMs = performance.now() - startedAt;
const testCount = results.reduce((count, result) => count + Number(result.output.match(/ℹ tests (\d+)/)?.[1] ?? 0), 0);
console.log(`\nTiming: API tests=${testCount}, duration=${(durationMs / 1000).toFixed(2)}s, files=${files.length}, shards=${shardGroups.length}`);
const timings = results.flatMap((result) => [...result.output.matchAll(/✔ (.+?) \(([\d.]+)ms\)/g)].map(([, name, duration]) => ({ name, duration: Number(duration) }))).sort((a, b) => b.duration - a.duration);
console.log("Top 10 slowest API tests across shards:");
for (const entry of timings.slice(0, 10)) console.log(`  ${(entry.duration / 1000).toFixed(2)}s  ${entry.name}`);
for (const result of results) {
  if (result.code !== 0) console.error(`API shard ${result.index + 1} failed${result.signal ? ` (${result.signal})` : ""}.`);
}
process.exit(results.every((result) => result.code === 0) ? 0 : 1);
