export function monitorBrowserFailures(page) {
  const failures = [];
  page.on("pageerror", (error) => failures.push(error.stack || error.message));
  page.on("crash", () => failures.push("The browser page crashed"));
  // A caught programmer error is still a failed gameplay test. Watching only
  // pageerror lets a console.error + continue handler turn a broken action green.
  page.on("console", (message) => {
    if (message.type() === "error") {
      const { url, lineNumber } = message.location();
      failures.push(`console.error: ${message.text()} (${url}:${lineNumber})`);
    }
  });
  return failures;
}
