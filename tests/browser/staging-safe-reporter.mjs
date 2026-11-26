// The Staging smoke deliberately uses a summary-only reporter. Playwright's
// default error formatter may include a full request URL, POST body or stack;
// this reporter emits only categorical fields. It never serializes an error
// message, stack, URL, request body, headers, cookies or free-form assertion.
export default class StagingSafeReporter {
  onBegin(_config, suite) {
    this.total = suite.allTests().length;
    this.completed = 0;
  }

  onTestEnd(test, result) {
    this.completed += 1;
    const outcome = result.status === "passed" ? "passed" : result.status;
    const safeTitle = `test_${this.completed}`;
    const errorCount = Array.isArray(result.errors) ? result.errors.length : 0;
    process.stdout.write(`[staging-safe] ${outcome} ${safeTitle} errors=${errorCount}\n`);
  }

  onEnd(result) {
    const safeStatus = ["passed", "failed", "timedout", "interrupted"].includes(result.status) ? result.status : "unknown";
    process.stdout.write(`[staging-safe] ${this.completed}/${this.total ?? this.completed} ${safeStatus}\n`);
  }
}
