export interface GeocodedAddressLike {
  district?: string | null;
  city?: string | null;
  subregion?: string | null;
  region?: string | null;
}

/** Pick the most neighborhood-like label from a reverse-geocode result. */
export function pickAreaLabel(addresses: GeocodedAddressLike[]): string | null {
  for (const address of addresses) {
    const label = address.district || address.city || address.subregion || address.region;
    if (label && label.trim().length > 0) {
      return label.trim();
    }
  }
  return null;
}
