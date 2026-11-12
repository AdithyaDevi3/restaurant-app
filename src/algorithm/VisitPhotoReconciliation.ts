/** Return app-managed photo URIs that are no longer referenced by a visit. */
export function findOrphanedVisitPhotoUris(
  managedPhotoUris: string[],
  referencedPhotoUris: string[],
): string[] {
  const referenced = new Set(referencedPhotoUris);
  return [...new Set(managedPhotoUris)].filter((uri) => !referenced.has(uri));
}
