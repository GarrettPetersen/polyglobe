function rosterSlugSet(rosterSlugs, label) {
  if (!Array.isArray(rosterSlugs) || rosterSlugs.some((slug) => typeof slug !== "string" || !slug)) {
    throw new Error(`${label} requires non-empty roster slugs`);
  }
  const roster = new Set(rosterSlugs);
  if (roster.size !== rosterSlugs.length) throw new Error(`${label} roster contains duplicate slugs`);
  return roster;
}

export function mergeGeneratedRosterEntries(
  document,
  replacements,
  rosterSlugs,
  label
) {
  const roster = rosterSlugSet(rosterSlugs, label);
  if (!Array.isArray(replacements)) throw new Error(`${label} replacements must be an array`);
  const existing = document?.ships ?? [];
  if (!Array.isArray(existing)) throw new Error(`${label} must contain a ships array`);

  const replacementBySlug = new Map();
  for (const entry of replacements) {
    if (!entry || typeof entry.slug !== "string" || !roster.has(entry.slug)) {
      throw new Error(`${label} replacement contains an unknown ship`);
    }
    if (replacementBySlug.has(entry.slug)) {
      throw new Error(`${label} replacements contain duplicate ship ${entry.slug}`);
    }
    replacementBySlug.set(entry.slug, entry);
  }

  const seen = new Set();
  const merged = [];
  for (const entry of existing) {
    if (!entry || typeof entry.slug !== "string" || !entry.slug) {
      throw new Error(`${label} contains a ship without a slug`);
    }
    if (seen.has(entry.slug)) throw new Error(`${label} contains duplicate ship ${entry.slug}`);
    seen.add(entry.slug);
    if (!roster.has(entry.slug)) continue;
    merged.push(replacementBySlug.get(entry.slug) ?? entry);
    replacementBySlug.delete(entry.slug);
  }
  return [...merged, ...replacementBySlug.values()];
}

export function mergeGeneratedRosterMap(document, replacements, rosterSlugs, label) {
  const roster = rosterSlugSet(rosterSlugs, label);
  if (!Array.isArray(replacements)) throw new Error(`${label} replacements must be an array`);
  const existing = document?.ships ?? {};
  if (!existing || typeof existing !== "object" || Array.isArray(existing)) {
    throw new Error(`${label} must contain a ships object`);
  }
  const merged = Object.fromEntries(
    Object.entries(existing).filter(([slug]) => roster.has(slug))
  );
  const replaced = new Set();
  for (const replacement of replacements) {
    if (!Array.isArray(replacement) || replacement.length !== 2 || !roster.has(replacement[0])) {
      throw new Error(`${label} replacement contains an unknown ship`);
    }
    if (replaced.has(replacement[0])) {
      throw new Error(`${label} replacements contain duplicate ship ${replacement[0]}`);
    }
    replaced.add(replacement[0]);
    merged[replacement[0]] = replacement[1];
  }
  return merged;
}
