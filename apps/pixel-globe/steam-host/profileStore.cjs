const { mkdirSync, readFileSync, writeFileSync, renameSync } = require("node:fs");
const { join } = require("node:path");

function createProfileStore({ root, steamId, cloud, cloudEnabled }) {
  if (!/^\d+$/.test(String(steamId))) throw new Error("Invalid Steam profile owner");
  const directory = join(root, "profiles", String(steamId));
  function path(name) {
    if (!/^[a-z0-9][a-z0-9._-]{0,127}$/i.test(name)) throw new Error(`Invalid profile filename: ${name}`);
    return join(directory, name);
  }
  function localRead(name) {
    try { return readFileSync(path(name), "utf8"); }
    catch (error) { if (error.code === "ENOENT") return null; throw error; }
  }
  function read(name) {
    const local = localRead(name);
    const remote = cloudEnabled && cloud.fileExists(name) ? cloud.readFile(name) : null;
    if (remote === null) return local;
    if (local === null) return remote;
    // A locally committed voyage can be newer after an unsuccessful Cloud sync.
    return timestamp(local) > timestamp(remote) ? local : remote;
  }
  function write(name, contents) {
    const destination = path(name);
    timestamp(contents);
    mkdirSync(directory, { recursive: true });
    writeFileSync(`${destination}.tmp`, contents, { encoding: "utf8", mode: 0o600, flush: true });
    renameSync(`${destination}.tmp`, destination);
    if (cloudEnabled && !cloud.writeFile(name, contents)) throw new Error(`Steam Cloud rejected ${name}; local profile preserved`);
    return true;
  }
  return { read, write };
}
function timestamp(contents) {
  const profile = JSON.parse(contents);
  if (!Number.isFinite(profile.savedAt) || profile.savedAt <= 0) throw new Error("Invalid desktop profile timestamp");
  return profile.savedAt;
}
module.exports = { createProfileStore };
