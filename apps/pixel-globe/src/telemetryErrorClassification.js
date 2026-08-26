const BROWSER_EXTENSION_URL_PATTERN = /(?:chrome|moz|safari-web|ms-browser)-extension:\/\//i;
const JAVASCRIPT_STACK_FRAME_PATTERN = /(?:^|\n)\s*(?:at\s|[^\n]*@(?:https?|file|blob):)/i;

export function globalTelemetryFailureIsActionable({
  errorName = "",
  message = "",
  stack = "",
  sourceUrl = ""
} = {}) {
  const normalizedStack = typeof stack === "string" ? stack : "";
  const normalizedSourceUrl = typeof sourceUrl === "string" ? sourceUrl : "";
  if (BROWSER_EXTENSION_URL_PATTERN.test(`${normalizedSourceUrl}\n${normalizedStack}`)) {
    return false;
  }
  const contextFreeBrowserNetworkFailure = errorName === "TypeError" &&
    message === "Failed to fetch" &&
    !JAVASCRIPT_STACK_FRAME_PATTERN.test(normalizedStack);
  return !contextFreeBrowserNetworkFailure;
}
