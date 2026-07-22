let mutationHandler = null;

export const gameStorage = Object.freeze({
  getItem(key) {
    return browserStorage().getItem(requiredKey(key));
  },

  setItem(key, value) {
    const normalizedKey = requiredKey(key);
    const normalizedValue = String(value);
    browserStorage().setItem(normalizedKey, normalizedValue);
    mutationHandler?.(normalizedKey);
  },

  removeItem(key) {
    const normalizedKey = requiredKey(key);
    browserStorage().removeItem(normalizedKey);
    mutationHandler?.(normalizedKey);
  }
});

export function setGameStorageMutationHandler(handler) {
  if (handler !== null && typeof handler !== "function") {
    throw new Error("Game storage mutation handler must be a function or null");
  }
  mutationHandler = handler;
}

function browserStorage() {
  if (typeof localStorage === "undefined") throw new Error("Local storage is unavailable");
  return localStorage;
}

function requiredKey(key) {
  if (typeof key !== "string" || key.length === 0) throw new Error("Game storage key is required");
  return key;
}
