import { spawn } from "node:child_process";

const port = 3137;
let url = `http://localhost:${port}`;
let server = null;
let output = "";

try {
  const existing = await fetch("http://localhost:3000/");
  if (existing.ok && (await existing.text()).includes("Three Kingdoms")) url = "http://localhost:3000";
} catch { /* No reusable development server. */ }

if (url.endsWith(String(port))) {
  server = spawn("npm", ["run", "dev", "--", "--port", String(port)], { cwd: new URL("../", import.meta.url), env: { ...process.env }, stdio: ["ignore", "pipe", "pipe"] });
  server.stdout.on("data", (chunk) => { output += chunk; });
  server.stderr.on("data", (chunk) => { output += chunk; });
}

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
  const tests = spawn(process.execPath, ["--test", "--test-concurrency=1", "tests/rendered-html.test.mjs", "tests/game-api.test.mjs"], { cwd: new URL("../", import.meta.url), env: { ...process.env, GAME_TEST_URL: url }, stdio: "inherit" });
  process.exitCode = await new Promise((resolve) => tests.on("exit", resolve)) ?? 1;
  if (process.exitCode !== 0) process.stderr.write(`\nTest server output:\n${output}\n`);
} finally { server?.kill("SIGTERM"); }

 process.exit(0);