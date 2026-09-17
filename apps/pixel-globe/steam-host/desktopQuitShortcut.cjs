function isDesktopQuitInput(input) {
  if (!input || typeof input !== "object") {
    throw new Error("Desktop quit shortcut requires a keyboard event");
  }
  const type = input.type;
  if (typeof type === "string" && type.toLowerCase() !== "keydown") return false;
  if (input.repeat === true || input.isAutoRepeat === true) return false;
  const code = typeof input.code === "string" ? input.code : "";
  if (code.length === 0) return false;
  const alt = input.altKey === true || input.alt === true;
  const ctrl = input.ctrlKey === true || input.control === true;
  const meta = input.metaKey === true || input.meta === true;
  if (alt && !ctrl && !meta && code === "F4") return true;
  if (meta && !alt && !ctrl && code === "KeyQ") return true;
  if (ctrl && !alt && !meta && code === "KeyQ") return true;
  return false;
}

module.exports = { isDesktopQuitInput };
