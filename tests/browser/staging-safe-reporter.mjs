import { redactSensitiveText } from "./staging-room-reconnect-diagnostics.mjs";

// The Staging smoke deliberately uses a summary-only reporter. Playwright's
// default error formatter may include a full request URL, POST body or stack;
// this reporter emits only the test title, outcome and redacted static text.
export default class StagingSafeReporter {
  onBegin(_config, suite) {
    this.total = suite.allTests().length;
    this.completed = 0;
  }

  onTestEnd(test, result) {
    this.completed += 1;
    const outcome = result.status === "passed" ? "passed" : result.status;
    const safeTitle = redactSensitiveText(test.titlePath().join(" > "));
    const safeErrors = (result.errors ?? [])
      .map((error) => redactSensitiveText(error?.message ?? "test failed")).filter(Boolean);
    const suffix = safeErrors.length ? `: ${safeErrors[0]}` : "";
    process.stdout.write(`[staging-safe] ${outcome} ${safeTitle}${suffix}\n`);
  }

  onEnd(result) {
    const safeStatus = redactSensitiveText(result.status ?? "unknown");
    process.stdout.write(`[staging-safe] ${this.completed}/${this.total ?? this.completed} ${safeStatus}\n`);
  }
}
