const BASE64_CHUNK_BYTES = 0x8000;

self.addEventListener("message", (event) => {
  void compressRequest(event.data);
});

async function compressRequest(request) {
  const id = request?.id;
  try {
    if (!Number.isInteger(id) || id < 1) throw new Error(`Invalid save compression request: ${id}`);
    if (!(request.bytes instanceof ArrayBuffer)) {
      throw new Error("Save compression request is missing bytes");
    }
    if (typeof CompressionStream !== "function") {
      throw new Error("Browser compression is unavailable for the local save");
    }
    const stream = new Blob([request.bytes]).stream().pipeThrough(new CompressionStream("deflate"));
    const compressed = new Uint8Array(await new Response(stream).arrayBuffer());
    self.postMessage({ id, data: bytesToBase64(compressed) });
  } catch (error) {
    self.postMessage({
      id,
      error: error instanceof Error ? error.message : String(error)
    });
  }
}

function bytesToBase64(bytes) {
  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += BASE64_CHUNK_BYTES) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + BASE64_CHUNK_BYTES));
  }
  return btoa(binary);
}
