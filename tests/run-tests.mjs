import { spawn } from "node:child_process";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const port = 3137;
const url = `http://localhost:${port}`;
let server = null;
let output = "";
const testStatePath = resolve(new URL("../", import.meta.url).pathname, ".wrangler/test-state");

// CI starts with an empty Miniflare D1 directory. Apply the same tracked
// migrations the production deploy uses before the API suite creates a room.
// Its isolated state never touches a developer's running local game database.
const migration = spawnSync("npx", ["wrangler", "d1", "migrations", "apply", "three-kingdoms-db", "--local", "--persist-to", testStatePath, "-c", "dist/server/wrangler.json"], { cwd: new URL("../", import.meta.url), env: { ...process.env }, encoding: "utf8" });
if (migration.status !== 0) {
  throw new Error(`Failed to initialize local D1 for tests.\n${migration.stdout}\n${migration.stderr}`);
}

server = spawn("npx", ["wrangler", "dev", "-c", "dist/server/wrangler.json", "--assets", "dist/client", "--port", String(port), "--local", "--persist-to", testStatePath, "--show-interactive-dev-session=false"], { cwd: new URL("../", import.meta.url), env: { ...process.env }, stdio: ["ignore", "pipe", "pipe"] });
server.stdout.on("data", (chunk) => { output += chunk; });
server.stderr.on("data", (chunk) => { output += chunk; });

async function waitForServer() {
  if (!server) return;
  for (let attempt = 0; attempt < 80; attempt++) {
    if (server.exitCode !== null) throw new Error(`Test server stopped early.\n${output}`);
    try { if ((await fetch(url)).ok) return; } catch { /* Server is still starting. */ }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`Timed out waiting for the test server.\n${output}`);
}

try {
  await waitForServer();
  const tests = spawn(process.execPath, ["--import", "tsx", "--test", "--test-concurrency=1", "tests/private-hand.test.mjs", "tests/response-capabilities.test.mjs", "tests/room-safety.test.mjs", "tests/room-safety-render.test.mjs", "tests/rendered-html.test.mjs", "tests/game-api.test.mjs"], { cwd: new URL("../", import.meta.url), env: { ...process.env, GAME_TEST_URL: url }, stdio: "inherit" });
  process.exitCode = await new Promise((resolve) => tests.on("exit", resolve)) ?? 1;
  if (process.exitCode !== 0) process.stderr.write(`\nTest server output:\n${output}\n`);
} finally { server?.kill("SIGTERM"); }

// Cloudflare's development server can leave worker handles alive in CI. Exit
// explicitly, but preserve the test result instead of masking failures.
process.exit(process.exitCode ?? 0);
