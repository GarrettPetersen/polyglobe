import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import ts from "typescript";

const STATIC_REFERENCE_DIAGNOSTIC_CODES = new Set([
  2304, // Cannot find name.
  2305, // Module has no exported member.
  2307, // Cannot find module.
  2459, // Module declares a name locally but does not export it.
  2552, // Cannot find name. Did you mean ...?
  2614, // Module has no exported member. Did you mean a default import?
  2724, // Module has no exported member. Did you mean ...?
  2792 // Cannot find module under the current resolution mode.
]);

export function productionJavaScriptFiles(sourceDirectory) {
  return walkFiles(path.resolve(sourceDirectory)).filter((filePath) => (
    filePath.endsWith(".js") && !filePath.endsWith(".test.js")
  ));
}

export function staticReferenceDiagnostics(rootNames) {
  if (!Array.isArray(rootNames) || rootNames.length === 0) {
    throw new Error("Static reference analysis requires JavaScript source files");
  }
  const options = {
    allowJs: true,
    checkJs: true,
    noEmit: true,
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.NodeNext,
    moduleResolution: ts.ModuleResolutionKind.NodeNext,
    skipLibCheck: true,
    lib: ["lib.es2022.d.ts", "lib.dom.d.ts", "lib.dom.iterable.d.ts"]
  };
  const program = ts.createProgram(rootNames.map((entry) => path.resolve(entry)), options);
  return ts.getPreEmitDiagnostics(program).filter((diagnostic) => (
    STATIC_REFERENCE_DIAGNOSTIC_CODES.has(diagnostic.code)
  ));
}

export function formatStaticReferenceDiagnostic(diagnostic, cwd = process.cwd()) {
  const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n");
  if (!diagnostic.file || diagnostic.start === undefined) {
    return `TS${diagnostic.code}: ${message}`;
  }
  const position = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start);
  return `${path.relative(cwd, diagnostic.file.fileName)}:${position.line + 1}:${position.character + 1} ` +
    `TS${diagnostic.code}: ${message}`;
}

function walkFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);
    return entry.isDirectory() ? walkFiles(entryPath) : [entryPath];
  });
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : null;
if (invokedPath === fileURLToPath(import.meta.url)) {
  const sourceDirectory = path.resolve("src");
  const rootNames = productionJavaScriptFiles(sourceDirectory);
  const diagnostics = staticReferenceDiagnostics(rootNames);
  if (diagnostics.length > 0) {
    for (const diagnostic of diagnostics) {
      console.error(formatStaticReferenceDiagnostic(diagnostic));
    }
    console.error(`Static reference check failed with ${diagnostics.length} error(s).`);
    process.exitCode = 1;
  } else {
    console.log(`Static reference check passed for ${rootNames.length} production modules.`);
  }
}
