export function downloadBlob(blob, filename, options = {}) {
  if (!(blob instanceof Blob)) throw new Error("Browser download requires a Blob");
  if (typeof filename !== "string" || filename.trim() === "") {
    throw new Error("Browser download requires a filename");
  }
  const documentRef = options.documentRef ?? document;
  const urlApi = options.urlApi ?? URL;
  const url = urlApi.createObjectURL(blob);
  const anchor = documentRef.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  documentRef.body.append(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => urlApi.revokeObjectURL(url), 1000);
}
