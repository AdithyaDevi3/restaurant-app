/** Browser photos are resized and stored as durable data URIs with the visit. */
export async function persistVisitPhoto(sourceUri: string, _visitId: string): Promise<string> {
  const image = new Image();
  image.src = sourceUri;
  await image.decode();
  const scale = Math.min(1, 900 / Math.max(image.width, image.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(image.width * scale));
  canvas.height = Math.max(1, Math.round(image.height * scale));
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Photo storage is unavailable in this browser.');
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  const uri = canvas.toDataURL('image/jpeg', 0.7);
  if (uri.length > 600000) throw new Error('Choose a smaller photo.');
  return uri;
}

export function deleteVisitPhoto(_uri: string): void { /* Removed with the visit data. */ }
export function deleteVisitPhotos(_uris: string[] | undefined): void { /* Removed with the visit data. */ }
export function reconcileVisitPhotos(_uris: string[]): number { return 0; }
