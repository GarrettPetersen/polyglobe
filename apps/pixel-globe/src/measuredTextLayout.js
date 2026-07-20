export function fitMeasuredText(text, maxWidth, measureText) {
  validateTextLayoutInputs(text, maxWidth, measureText);
  if (measureText(text) <= maxWidth) return text;
  const suffix = "...";
  let kept = "";
  for (const character of text) {
    if (measureText(kept + character + suffix) > maxWidth) break;
    kept += character;
  }
  return kept ? `${kept}${suffix}` : suffix;
}

export function wrapMeasuredText(text, maxWidth, maxLines, measureText) {
  validateTextLayoutInputs(text, maxWidth, measureText);
  if (!Number.isInteger(maxLines) || maxLines <= 0) {
    throw new Error(`Measured text requires a positive line limit: ${maxLines}`);
  }
  const wrapped = wrapAllMeasuredText(text, maxWidth, measureText);
  const lines = wrapped.slice(0, maxLines);
  if (wrapped.length > maxLines && lines.length > 0) {
    lines[lines.length - 1] = fitMeasuredText(`${lines[lines.length - 1]} ...`, maxWidth, measureText);
  }
  return lines.length > 0 ? lines : [""];
}

export function wrapAllMeasuredText(text, maxWidth, measureText) {
  validateTextLayoutInputs(text, maxWidth, measureText);
  if (containsCjk(text)) return wrapCjkText(text, maxWidth, measureText);
  const words = text.split(/\s+/).filter(Boolean);
  const wrapped = [];
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (measureText(next) <= maxWidth) {
      line = next;
      continue;
    }
    if (line) wrapped.push(line);
    const segments = splitMeasuredToken(word, maxWidth, measureText);
    wrapped.push(...segments.slice(0, -1));
    line = segments.at(-1) || "";
  }
  if (line) wrapped.push(line);
  return wrapped.length > 0 ? wrapped : [""];
}

function wrapCjkText(text, maxWidth, measureText) {
  const wrapped = [];
  let line = "";
  for (const character of text) {
    const next = line + character;
    if (line && measureText(next) > maxWidth) {
      wrapped.push(line.trimEnd());
      line = character.trimStart();
      continue;
    }
    line = next;
  }
  if (line) wrapped.push(line.trimEnd());
  return wrapped.length > 0
    ? wrapped
    : [""];
}

function splitMeasuredToken(token, maxWidth, measureText) {
  if (measureText(token) <= maxWidth) return [token];
  const segments = [];
  let segment = "";
  for (const character of token) {
    if (segment && measureText(segment + character) > maxWidth) {
      segments.push(segment);
      segment = character;
      continue;
    }
    segment += character;
    if (measureText(segment) > maxWidth) {
      throw new Error(`Measured text character cannot fit within ${maxWidth}px: ${character}`);
    }
  }
  if (segment) segments.push(segment);
  return segments;
}

function containsCjk(text) {
  return /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/u.test(text);
}

function validateTextLayoutInputs(text, maxWidth, measureText) {
  if (typeof text !== "string") throw new Error(`Measured text must be a string: ${text}`);
  if (!Number.isFinite(maxWidth) || maxWidth <= 0) {
    throw new Error(`Measured text requires positive width: ${maxWidth}`);
  }
  if (typeof measureText !== "function") throw new Error("Measured text requires a measurement function");
}
