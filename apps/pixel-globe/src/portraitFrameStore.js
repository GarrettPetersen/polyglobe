export function createPortraitFrameStore() {
  const framesByKey = new Map();
  const displayedFrameByCharacterId = new Map();

  return {
    has(frameKey) {
      assertFrameKey(frameKey);
      return framesByKey.has(frameKey);
    },

    hasEvery(frameKeys) {
      if (!Array.isArray(frameKeys) || frameKeys.length === 0) {
        throw new Error("Portrait frame store requires a non-empty frame-key array");
      }
      return frameKeys.every((frameKey) => {
        assertFrameKey(frameKey);
        return framesByKey.has(frameKey);
      });
    },

    display(characterId, frameKey) {
      assertCharacterId(characterId);
      assertFrameKey(frameKey);
      const exactFrame = framesByKey.get(frameKey);
      if (exactFrame) {
        displayedFrameByCharacterId.set(characterId, exactFrame);
        return exactFrame;
      }
      return displayedFrameByCharacterId.get(characterId) || null;
    },

    store(characterId, frameKey, frame) {
      assertCharacterId(characterId);
      assertFrameKey(frameKey);
      if (!frame) throw new Error("Portrait frame store requires a decoded frame");
      framesByKey.set(frameKey, frame);
    }
  };
}

function assertCharacterId(characterId) {
  if (typeof characterId !== "string" || characterId.length === 0) {
    throw new Error("Portrait frame store requires a character id");
  }
}

function assertFrameKey(frameKey) {
  if (typeof frameKey !== "string" || frameKey.length === 0) {
    throw new Error("Portrait frame store requires a frame key");
  }
}
