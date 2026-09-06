/** Serializable Mulberry32 stream. Keep the cursor with the state it mutates. */
export function createRandomStream(seed) {
  if (!Number.isSafeInteger(seed)) throw new Error("Random seed must be an integer");
  return { value: seed >>> 0 };
}
export function nextSeededRandom(stream) {
  if (!stream || !Number.isInteger(stream.value) || stream.value < 0 || stream.value > 0xffffffff) {
    throw new Error("Invalid random stream cursor");
  }
  stream.value = (stream.value + 0x6D2B79F5) >>> 0;
  let word = Math.imul(stream.value ^ stream.value >>> 15, 1 | stream.value);
  word ^= word + Math.imul(word ^ word >>> 7, 61 | word);
  return ((word ^ word >>> 14) >>> 0) / 4294967296;
}
