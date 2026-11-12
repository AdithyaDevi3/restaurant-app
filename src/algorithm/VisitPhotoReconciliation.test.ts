import { findOrphanedVisitPhotoUris } from './VisitPhotoReconciliation';

describe('findOrphanedVisitPhotoUris', () => {
  it('returns only app-managed photos that no visit references', () => {
    expect(
      findOrphanedVisitPhotoUris(
        ['file:///visit-photos/kept.jpg', 'file:///visit-photos/orphan.jpg'],
        ['file:///visit-photos/kept.jpg', 'file:///source-library/unmanaged.jpg'],
      ),
    ).toEqual(['file:///visit-photos/orphan.jpg']);
  });

  it('deduplicates managed files before cleanup', () => {
    expect(
      findOrphanedVisitPhotoUris(
        ['file:///visit-photos/orphan.jpg', 'file:///visit-photos/orphan.jpg'],
        [],
      ),
    ).toEqual(['file:///visit-photos/orphan.jpg']);
  });

  it('does not remove anything when every managed photo is referenced', () => {
    const uri = 'file:///visit-photos/kept.jpg';
    expect(findOrphanedVisitPhotoUris([uri], [uri])).toEqual([]);
  });
});
