import { requireEntityId } from "./entityIds.js";

export function migrateLegacyPortCityId(cityId, {
  legacyCityIdForPortReference = null,
  reference,
  diagnosticScope
}) {
  if (typeof diagnosticScope !== "string" || diagnosticScope.trim() === "") {
    throw new Error("Legacy port identity migration requires a label");
  }
  if (cityId !== undefined && cityId !== null) {
    return requireEntityId(cityId, diagnosticScope);
  }
  if (typeof legacyCityIdForPortReference !== "function") {
    throw new Error(
      `Legacy ${diagnosticScope.toLowerCase()} migration requires a canonical city resolver`
    );
  }
  if (!reference || typeof reference !== "object" || Array.isArray(reference)) {
    throw new Error(
      `Legacy ${diagnosticScope.toLowerCase()} migration requires a port reference`
    );
  }
  return requireEntityId(
    legacyCityIdForPortReference(Object.freeze({ ...reference })),
    `Migrated ${diagnosticScope.toLowerCase()}`
  );
}
