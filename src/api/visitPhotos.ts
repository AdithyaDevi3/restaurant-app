import { Directory, File, Paths } from 'expo-file-system';
import { findOrphanedVisitPhotoUris } from '../algorithm/VisitPhotoReconciliation';

const photoDirectory = new Directory(Paths.document, 'visit-photos');

function ensurePhotoDirectory(): void {
  photoDirectory.create({ idempotent: true, intermediates: true });
}

function safeId(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 60) || 'visit';
}

export async function persistVisitPhoto(sourceUri: string, visitId: string): Promise<string> {
  ensurePhotoDirectory();

  const source = new File(sourceUri);
  const extension = source.extension || '.jpg';
  const destination = new File(
    photoDirectory,
    `${safeId(visitId)}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}${extension}`,
  );

  await source.copy(destination);
  return destination.uri;
}

export function deleteVisitPhoto(uri: string): void {
  try {
    const photo = new File(uri);
    if (photo.exists) photo.delete();
  } catch {
    // A missing or inaccessible photo must not prevent a visit from being updated.
  }
}

export function deleteVisitPhotos(uris: string[] | undefined): void {
  uris?.forEach(deleteVisitPhoto);
}

/** Delete only unreferenced files inside the app-owned visit-photo directory. */
export function reconcileVisitPhotos(referencedPhotoUris: string[]): number {
  try {
    if (!photoDirectory.exists) return 0;

    const managedPhotoUris = photoDirectory
      .list()
      .filter((entry): entry is File => entry instanceof File)
      .map((photo) => photo.uri);
    const orphanedPhotoUris = findOrphanedVisitPhotoUris(
      managedPhotoUris,
      referencedPhotoUris,
    );

    orphanedPhotoUris.forEach(deleteVisitPhoto);
    return orphanedPhotoUris.length;
  } catch {
    // Cleanup is best-effort and must never prevent the app from starting.
    return 0;
  }
}
