// Butler reconstructs ZIP directory entries, and itch counts those against its
// HTML upload limit even when the original archive listed only regular files.
export function itchArchiveEntryCount(paths) {
  const directories = new Set();
  for (const filePath of paths) {
    const parts = filePath.split("/");
    for (let length = 1; length < parts.length; length++) {
      directories.add(parts.slice(0, length).join("/"));
    }
  }
  return paths.length + directories.size;
}

export function combinedItchCredits(credits, notices) {
  return credits + "\n\n## Complete bundled license notices\n" + notices.map(
    ({ relativePath, source }) => `\n### ${relativePath}\n\n${source}\n`
  ).join("");
}
