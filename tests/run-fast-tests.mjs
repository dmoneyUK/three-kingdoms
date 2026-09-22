import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { performance } from "node:perf_hooks";

const fastTests = [
  "tests/dying.test.mjs",
  "tests/standard-deck.test.mjs",
  "tests/private-hand.test.mjs",
  "tests/game-messages.test.mjs",
  "tests/response-capabilities.test.mjs",
  "tests/room-safety.test.mjs",
  "tests/room-safety-render.test.mjs",
];

// rendered-html exercises the built SSR bundle, so test:fast includes it when
// a build already exists (test:all builds first) while remaining build-free on
// a fresh checkout.
if (existsSync("dist/server/index.js")) fastTests.push("tests/rendered-html.test.mjs");

const startedAt = performance.now();
const child = spawn(process.execPath, ["--import", "tsx", "--test", "--test-concurrency=1", ...fastTests], {
  stdio: ["ignore", "pipe", "pipe"],
});
let output = "";
for (const stream of [child.stdout, child.stderr]) stream.on("data", (chunk) => { const text = chunk.toString(); output += text; process.stdout.write(text); });

const exitCode = await new Promise((resolve) => child.on("exit", (code) => resolve(code ?? 1)));
const durationMs = performance.now() - startedAt;
const testCount = Number(output.match(/ℹ tests (\d+)/)?.[1] ?? 0);
console.log(`\nTiming: fast tests=${testCount}, duration=${(durationMs / 1000).toFixed(2)}s, files=${fastTests.length}`);
process.exit(exitCode);
