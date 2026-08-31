import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import ts from "typescript";

const DISPLAY_PROPERTY_NAMES = new Set([
  "accept", "accepted", "account", "body", "captain", "comment", "decline", "declined",
  "description", "detail", "dialogue", "effect", "established", "eventLabel", "failed",
  "failure", "feedback", "goal", "gossip", "greeting", "heading", "hint", "label", "landing", "message",
  "name", "notice", "offer", "opening", "option", "outro", "patron", "pitch", "prompt",
  "purpose", "ready", "recruitPrompt", "response", "responses", "route", "rumor", "skill",
  "speaker", "status", "subtitle", "success", "successText", "summary", "text", "title",
  "transactionText", "warning"
]);

const DISPLAY_CALL_ARGUMENTS = new Map([
  ["achievement", [1, 2]],
  ["action", [1]],
  ["animal", [1, 2, 6, 7]],
  ["animalEncounterChoice", [0]],
  ["animalEncounterChoiceOption", [1]],
  ["animalEncounterChoiceStep", [1]],
  ["animalWithExpressions", [1, 2, 5, 6]],
  ["cannonEquipment", [1]],
  ["comparisonMetric", [1]],
  ["debtOrigin", [0, 1]],
  ["dialogueLine", [1]],
  ["drawControlIconLabel", [1]],
  ["drawControllerBindingHint", [1]],
  ["drawOptionsText", [0]],
  ["drawPixelText", [0]],
  ["drawStartMenuButton", [1]],
  ["drawTutorialLabel", [0]],
  ["eventProfile", [1, 2]],
  ["exchange", [0, 1]],
  ["faction", [1, 2, 3]],
  ["fetchStage", [3, 4]],
  ["fishingNet", [1]],
  ["good", [1]],
  ["item", [1, 2]],
  ["landmark", [1, 2]],
  ["naturalistLine", [1]],
  ["openCaptainAlertModal", [0]],
  ["openCharacterAlertModal", [1]],
  ["openCharacterChoiceAlertModal", [1]],
  ["openCrewAlertModal", [0]],
  ["option", [0]],
  ["preset", [1, 2]],
  ["religion", [1]],
  ["renderedUiText", [0]],
  ["resupply", [2, 3, 4, 5]],
  ["ruler", [4]],
  ["seabird", [0]],
  ["showFishCatchNotice", [0]],
  ["showSurvivalNotice", [0]],
  ["skill", [1, 2]],
  ["species", [1]],
  ["stage", [3, 4]],
  ["standing", [1]],
  ["stat", [1]],
  ["step", [2, 3]],
  ["story", [0, 1, 2, 3]],
  ["waterFeature", [1, 2]],
  ["whaleHarpoon", [1]],
  ["yearRuler", [2]]
]);

const DISPLAY_FUNCTION_NAME = /(?:Accounts?|Biographies|Biography|Comments?|Copies|Copy|Descriptions?|Details?|Dialogues?|Epilogues?|Feedback|Goals?|Gossip|Greetings?|Hints?|Indicators?|Journals?|Labels?|Lines?|Messages?|Name|Narratives?|Notices?|Offers?|Outros?|Pitches|Pitch|Prompts?|Reminders?|Responses?|Rumors?|Stories|Story|Summaries|Summary|Texts?|Titles?|Tooltips?|Views?)$/i;

const EXCLUDED_FILES = new Set([
  "localization.js",
  "properNounLocalization.js",
  "screenTextCatalog.js",
  "screenTextLocalization.js",
  "worldWebglRenderer.js"
]);
const PERSISTENT_PROPER_NOUN_TEMPLATES = Object.freeze([
  "Alexandria",
  "Chengdu",
  "Havana",
  "Lisbon",
  "Mount Fuji",
  "Nanjing",
  "Port Royal",
  "Ribeira Grande",
  "Vienna"
]);
const NON_DISPLAY_VALIDATION_CALLS = new Set([
  "requireCityId",
  "requireEntityById",
  "requireEntityId",
  "requiredNpcRoutePort"
]);

export function extractScreenTextSourceCatalog(sourceRoot) {
  const templates = new Set(PERSISTENT_PROPER_NOUN_TEMPLATES);
  const files = readdirSync(sourceRoot)
    .filter((name) => name.endsWith(".js") && !name.endsWith(".test.js") && !EXCLUDED_FILES.has(name))
    .sort();
  for (const fileName of files) {
    const sourcePath = path.join(sourceRoot, fileName);
    const source = readFileSync(sourcePath, "utf8");
    const sourceFile = ts.createSourceFile(fileName, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
    visit(sourceFile, sourceFile, templates);
  }
  return Object.freeze([...templates].sort((left, right) => left.localeCompare(right, "en")));
}

function visit(node, sourceFile, templates) {
  if (isDisplayFunction(node)) collectDisplayFunctionBody(node.body, templates);
  if (ts.isPropertyAssignment(node) && isDisplayPropertyName(propertyName(node.name, sourceFile))) {
    collectDisplayExpression(node.initializer, templates);
  }
  if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) &&
      isDisplayPropertyName(node.name.text) && node.initializer) {
    collectDisplayExpression(node.initializer, templates);
  }
  if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
      assignedDisplayPropertyName(node.left, sourceFile) && node.right) {
    collectDisplayExpression(node.right, templates);
  }
  if (ts.isCallExpression(node) && ts.isIdentifier(node.expression)) {
    const argumentIndexes = DISPLAY_CALL_ARGUMENTS.get(node.expression.text) || [];
    for (const index of argumentIndexes) {
      if (node.arguments[index]) collectDisplayExpression(node.arguments[index], templates);
    }
    collectComposedDisplayTemplates(node, templates);
  }
  ts.forEachChild(node, (child) => visit(child, sourceFile, templates));
}

function collectComposedDisplayTemplates(call, templates) {
  if (call.expression.text !== "ruler" && call.expression.text !== "yearRuler") return;
  const titleIndex = call.expression.text === "ruler" ? 4 : 2;
  const title = call.arguments[titleIndex];
  if (!title || !ts.isStringLiteralLike(title)) return;
  const normalized = normalizeDisplayTemplate(`${title.text} {0}`);
  if (normalized) templates.add(normalized);
}

function assignedDisplayPropertyName(expression, sourceFile) {
  if (ts.isIdentifier(expression)) {
    return isDisplayPropertyName(expression.text) ? expression.text : null;
  }
  if (!ts.isPropertyAccessExpression(expression) && !ts.isElementAccessExpression(expression)) return null;
  const name = ts.isPropertyAccessExpression(expression)
    ? expression.name.text
    : expression.argumentExpression && propertyName(expression.argumentExpression, sourceFile);
  return isDisplayPropertyName(name) ? name : null;
}

function isDisplayPropertyName(name) {
  return DISPLAY_PROPERTY_NAMES.has(name) || DISPLAY_FUNCTION_NAME.test(name);
}

function isDisplayFunction(node) {
  if (!ts.isFunctionDeclaration(node) && !ts.isFunctionExpression(node) && !ts.isArrowFunction(node) &&
      !ts.isMethodDeclaration(node)) return false;
  const name = node.name?.text || (ts.isVariableDeclaration(node.parent) ? node.parent.name.getText() : "");
  return DISPLAY_FUNCTION_NAME.test(name);
}

function collectDisplayFunctionBody(body, templates) {
  function visitDisplayNode(node) {
    if (ts.isNewExpression(node) && node.expression.getText() === "Error") return;
    if (ts.isCallExpression(node) && node.expression.getText().startsWith("console.")) return;
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) &&
        NON_DISPLAY_VALIDATION_CALLS.has(node.expression.text)) return;
    if (ts.isStringLiteralLike(node) || ts.isTemplateExpression(node) ||
        (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.PlusToken)) {
      collectDisplayExpression(node, templates);
      if (ts.isStringLiteralLike(node)) return;
    }
    ts.forEachChild(node, visitDisplayNode);
  }
  visitDisplayNode(body);
}

function collectDisplayExpression(expression, templates) {
  if (ts.isCallExpression(expression) && isObjectFreezeCall(expression)) {
    for (const argument of expression.arguments) collectDisplayExpression(argument, templates);
    return;
  }
  if (ts.isArrayLiteralExpression(expression)) {
    for (const element of expression.elements) collectDisplayExpression(element, templates);
    return;
  }
  if (ts.isObjectLiteralExpression(expression)) {
    for (const property of expression.properties) {
      if (ts.isPropertyAssignment(property)) collectDisplayExpression(property.initializer, templates);
    }
    return;
  }
  if (ts.isConditionalExpression(expression)) {
    collectDisplayExpression(expression.whenTrue, templates);
    collectDisplayExpression(expression.whenFalse, templates);
  }
  const template = expressionTemplate(expression);
  const normalized = normalizeDisplayTemplate(template);
  if (normalized) templates.add(normalized);
}

function isObjectFreezeCall(expression) {
  return ts.isPropertyAccessExpression(expression.expression) &&
    ts.isIdentifier(expression.expression.expression) &&
    expression.expression.expression.text === "Object" &&
    expression.expression.name.text === "freeze";
}

function expressionTemplate(expression) {
  const state = { nextPlaceholder: 0 };
  return renderExpression(expression, state);
}

function renderExpression(expression, state) {
  if (ts.isParenthesizedExpression(expression)) return renderExpression(expression.expression, state);
  if (ts.isStringLiteralLike(expression)) return expression.text;
  if (ts.isTemplateExpression(expression)) {
    let value = expression.head.text;
    for (const span of expression.templateSpans) {
      value += placeholder(state);
      value += span.literal.text;
    }
    return value;
  }
  if (ts.isBinaryExpression(expression) && expression.operatorToken.kind === ts.SyntaxKind.PlusToken) {
    return renderExpression(expression.left, state) + renderExpression(expression.right, state);
  }
  return placeholder(state);
}

function placeholder(state) {
  const index = state.nextPlaceholder;
  state.nextPlaceholder += 1;
  return `{${index}}`;
}

function normalizeDisplayTemplate(value) {
  const normalized = String(value).replace(/\s+/g, " ").trim();
  if (normalized.length < 2 || normalized.length > 900) return null;
  if (!/[A-Za-z]/.test(normalized)) return null;
  if (/^\{\d+\}$/.test(normalized)) return null;
  if (/^\{0\}\s+\{1\}/.test(normalized)) return null;
  if (/^[a-z][a-z0-9_.:/-]*$/.test(normalized)) return null;
  if (normalized.includes("{") &&
      /^(?:\{\d+\}[:/])?[a-z0-9]+(?:[-.:/]\{?\d*\}?|[-.:/][a-z0-9]+)+$/i.test(normalized)) return null;
  const withoutPlaceholders = normalized.replace(/\{\d+\}/g, "");
  if (withoutPlaceholders.includes(".") &&
      /^[a-z][A-Za-z0-9]*(?:\.[a-z][A-Za-z0-9]*)*\.?$/.test(withoutPlaceholders)) return null;
  if (/^(?:\.\.?\/|https?:|assets\/|public\/|src\/)/i.test(normalized)) return null;
  if (/\.(?:bin|csv|js|json|mp3|mp4|ogg|otf|png|ttf|wav|webm|woff2?)(?:\?|$)/i.test(normalized)) return null;
  if (/^#[0-9a-f]{3,8}$/i.test(normalized)) return null;
  if (/\|[a-z0-9-]+$/.test(normalized)) return null;
  if (/\b(?:document\.|gl_FragColor|sampler2D|uniform\s|void main|window\.)/i.test(normalized)) return null;
  return normalized;
}

function propertyName(name, sourceFile) {
  if (ts.isIdentifier(name) || ts.isStringLiteralLike(name)) return name.text;
  return name.getText(sourceFile);
}
