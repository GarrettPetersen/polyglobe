import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import ts from "typescript";

const TYPESCRIPT_SAFETY_DIAGNOSTIC_CODES = new Set([
  1117, // Duplicate object-literal property.
  2300, // Duplicate identifier.
  2304, // Cannot find name.
  2305, // Module has no exported member.
  2307, // Cannot find module.
  2349, // Expression is not callable.
  2358, // Invalid instanceof operand.
  2363, // Invalid arithmetic operand.
  2365, // Invalid operator operands.
  2393, // Duplicate function implementation.
  2451, // Cannot redeclare block-scoped variable.
  2459, // Module declares a name locally but does not export it.
  2552, // Cannot find name. Did you mean ...?
  2554, // Wrong argument count.
  2614, // Module has no exported member. Did you mean a default import?
  2698, // Spread value is not an object.
  2724, // Module has no exported member. Did you mean ...?
  2774, // Condition is always true because a function exists.
  2792, // Cannot find module under the current resolution mode.
  2869, // Nullish-coalescing right operand is unreachable.
  2871, // Expression is always nullish.
  2872, // Expression is always truthy.
  2873, // Expression is always falsy.
  7027, // Unreachable code.
  7029, // Fallthrough case in switch.
  7030 // Not all code paths return a value.
]);

const COMPILER_OPTIONS = Object.freeze({
  allowJs: true,
  checkJs: true,
  noEmit: true,
  target: ts.ScriptTarget.ES2022,
  module: ts.ModuleKind.NodeNext,
  moduleResolution: ts.ModuleResolutionKind.NodeNext,
  skipLibCheck: true,
  lib: ["lib.es2022.d.ts", "lib.dom.d.ts", "lib.dom.iterable.d.ts"],
  noImplicitReturns: true,
  noFallthroughCasesInSwitch: true,
  allowUnreachableCode: false
});

export function productionJavaScriptFiles(sourceDirectory) {
  return walkFiles(path.resolve(sourceDirectory)).filter((filePath) => (
    filePath.endsWith(".js") && !filePath.endsWith(".test.js")
  ));
}

export function productionSafetyFindings(rootNames) {
  if (!Array.isArray(rootNames) || rootNames.length === 0) {
    throw new Error("Production safety analysis requires JavaScript source files");
  }
  const normalizedRoots = rootNames.map((entry) => path.resolve(entry));
  const rootSet = new Set(normalizedRoots);
  const program = ts.createProgram(normalizedRoots, COMPILER_OPTIONS);
  const findings = ts.getPreEmitDiagnostics(program)
    .filter((diagnostic) => TYPESCRIPT_SAFETY_DIAGNOSTIC_CODES.has(diagnostic.code))
    .map(typescriptFinding);
  const checker = program.getTypeChecker();
  const sourceFiles = program.getSourceFiles().filter((sourceFile) => rootSet.has(sourceFile.fileName));
  for (const sourceFile of sourceFiles) {
    collectAstSafetyFindings(sourceFile, checker, findings);
  }
  findings.push(...moduleCycleFindings(sourceFiles, rootSet));
  return Object.freeze(findings);
}

export function formatProductionSafetyFinding(finding, cwd = process.cwd()) {
  const location = finding.fileName
    ? `${path.relative(cwd, finding.fileName)}:${finding.line}:${finding.column}`
    : "production source";
  return `${location} ${finding.code}: ${finding.message}`;
}

function collectAstSafetyFindings(sourceFile, checker, findings) {
  visit(sourceFile);

  function visit(node) {
    if (ts.isBinaryExpression(node) &&
        node.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
        node.left.getText(sourceFile) === node.right.getText(sourceFile)) {
      findings.push(customFinding(
        sourceFile,
        node,
        "self-assignment",
        `Assignment writes ${node.left.getText(sourceFile)} back to itself`
      ));
    }
    if (ts.isSwitchStatement(node)) collectDuplicateSwitchCases(sourceFile, node, findings);
    if (ts.isExpressionStatement(node) && floatingPromiseCall(node.expression, checker)) {
      findings.push(customFinding(
        sourceFile,
        node,
        "floating-promise",
        "Promise-returning call must be awaited, returned, assigned, explicitly voided, or caught"
      ));
    }
    ts.forEachChild(node, visit);
  }
}

function collectDuplicateSwitchCases(sourceFile, switchStatement, findings) {
  const seen = new Set();
  for (const clause of switchStatement.caseBlock.clauses) {
    if (!ts.isCaseClause(clause)) continue;
    const key = staticCaseKey(clause.expression);
    if (key === null) continue;
    if (seen.has(key)) {
      findings.push(customFinding(
        sourceFile,
        clause,
        "duplicate-switch-case",
        `Duplicate switch case ${clause.expression.getText(sourceFile)}`
      ));
    }
    seen.add(key);
  }
}

function staticCaseKey(expression) {
  if (ts.isStringLiteral(expression)) return `string:${expression.text}`;
  if (ts.isNumericLiteral(expression)) return `number:${Number(expression.text)}`;
  if (expression.kind === ts.SyntaxKind.TrueKeyword) return "boolean:true";
  if (expression.kind === ts.SyntaxKind.FalseKeyword) return "boolean:false";
  if (expression.kind === ts.SyntaxKind.NullKeyword) return "null";
  return null;
}

function floatingPromiseCall(expression, checker) {
  if (!ts.isCallExpression(expression)) return false;
  if (!promiseLikeType(checker.getTypeAtLocation(expression))) return false;
  if (!ts.isPropertyAccessExpression(expression.expression)) return true;
  const method = expression.expression.name.text;
  if (method === "catch") return false;
  if (method === "then" && expression.arguments.length >= 2) return false;
  return true;
}

function promiseLikeType(type) {
  if (type.getProperty("then")) return true;
  return type.isUnion() && type.types.some((member) => promiseLikeType(member));
}

function moduleCycleFindings(sourceFiles, rootSet) {
  const graph = new Map(sourceFiles.map((sourceFile) => [sourceFile.fileName, []]));
  for (const sourceFile of sourceFiles) {
    for (const statement of sourceFile.statements) {
      if (!(ts.isImportDeclaration(statement) || ts.isExportDeclaration(statement)) ||
          !statement.moduleSpecifier || !ts.isStringLiteral(statement.moduleSpecifier)) {
        continue;
      }
      const specifier = statement.moduleSpecifier.text;
      if (!specifier.startsWith(".")) continue;
      const dependency = path.resolve(path.dirname(sourceFile.fileName), specifier);
      if (rootSet.has(dependency)) graph.get(sourceFile.fileName).push(dependency);
    }
  }
  return stronglyConnectedComponents(graph)
    .filter((component) => component.length > 1 || graph.get(component[0]).includes(component[0]))
    .map((component) => ({
      code: "static-import-cycle",
      fileName: component[0],
      line: 1,
      column: 1,
      message: `Static import cycle: ${component.map((entry) => path.basename(entry)).join(" -> ")}`
    }));
}

function stronglyConnectedComponents(graph) {
  let nextIndex = 0;
  const stack = [];
  const indices = new Map();
  const lowLinks = new Map();
  const onStack = new Set();
  const components = [];
  for (const node of graph.keys()) {
    if (!indices.has(node)) visit(node);
  }
  return components;

  function visit(node) {
    indices.set(node, nextIndex);
    lowLinks.set(node, nextIndex);
    nextIndex += 1;
    stack.push(node);
    onStack.add(node);
    for (const dependency of graph.get(node)) {
      if (!indices.has(dependency)) {
        visit(dependency);
        lowLinks.set(node, Math.min(lowLinks.get(node), lowLinks.get(dependency)));
      } else if (onStack.has(dependency)) {
        lowLinks.set(node, Math.min(lowLinks.get(node), indices.get(dependency)));
      }
    }
    if (lowLinks.get(node) !== indices.get(node)) return;
    const component = [];
    let member;
    do {
      member = stack.pop();
      onStack.delete(member);
      component.push(member);
    } while (member !== node);
    components.push(component);
  }
}

function typescriptFinding(diagnostic) {
  const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n");
  if (!diagnostic.file || diagnostic.start === undefined) {
    return { code: `TS${diagnostic.code}`, fileName: null, line: 1, column: 1, message };
  }
  const position = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start);
  return {
    code: `TS${diagnostic.code}`,
    fileName: diagnostic.file.fileName,
    line: position.line + 1,
    column: position.character + 1,
    message
  };
}

function customFinding(sourceFile, node, code, message) {
  const position = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
  return {
    code,
    fileName: sourceFile.fileName,
    line: position.line + 1,
    column: position.character + 1,
    message
  };
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
  const findings = productionSafetyFindings(rootNames);
  if (findings.length > 0) {
    for (const finding of findings) console.error(formatProductionSafetyFinding(finding));
    console.error(`Production safety check failed with ${findings.length} error(s).`);
    process.exitCode = 1;
  } else {
    console.log(`Production safety check passed for ${rootNames.length} production modules.`);
  }
}
