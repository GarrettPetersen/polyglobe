const url = new URL(window.location.href);
let changed = false;
if (!url.searchParams.has("app")) {
  url.searchParams.set("app", "railways");
  changed = true;
}
if (!url.searchParams.has("startDate") && !url.searchParams.has("startDateTime")) {
  url.searchParams.set("startDate", "1825-01-01T00:00:00");
  changed = true;
}
if (changed) {
  window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
}

import("../../examples/globe-demo/main.ts");
