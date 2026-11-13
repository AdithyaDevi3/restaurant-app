"""Read nearby restaurants from the public Overture release (no account or key)."""
import argparse
import contextlib
import json
import math
import sys


def map_restaurant(row):
    taxonomy = row.get("taxonomy") or row.get("categories") or {}
    categories = [taxonomy.get("primary", ""), *(taxonomy.get("hierarchy") or []), *(taxonomy.get("alternates") or [])]
    if not any("restaurant" in category for category in categories if isinstance(category, str)):
        return None
    if row.get("operating_status") == "permanently_closed" or (row.get("confidence") or 0) < 0.6:
        return None
    name = (row.get("names") or {}).get("primary")
    bbox = row.get("bbox") or {}
    lat, lon = bbox.get("ymin"), bbox.get("xmin")
    if not row.get("id") or not name or not isinstance(lat, (int, float)) or not isinstance(lon, (int, float)):
        return None
    if not math.isfinite(lat) or not math.isfinite(lon) or abs(lat) > 90 or abs(lon) > 180:
        return None
    cuisine = []
    specific = [taxonomy.get("primary", ""), *(taxonomy.get("alternates") or [])]
    for category in specific:
        if isinstance(category, str) and category.endswith("_restaurant"):
            value = category.removesuffix("_restaurant").replace("_", " ").title()
            if value not in cuisine:
                cuisine.append(value)
    websites = [url for url in row.get("websites") or [] if url.startswith(("http://", "https://"))]
    return {"id": "overture-" + row["id"], "name": name, "lat": lat, "lon": lon,
            "cuisine": cuisine or ["Restaurant"], "sourceUrl": websites[0] if websites else None,
            "rating": 0, "reviewCount": 0, "priceLevel": 2, "priceLevelKnown": False,
            "distance": 0, "tags": [], "sourceProvider": "overture"}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--lat", type=float, required=True)
    parser.add_argument("--lon", type=float, required=True)
    parser.add_argument("--radius", type=int, required=True)
    args = parser.parse_args()
    if not math.isfinite(args.lat) or not math.isfinite(args.lon) or abs(args.lat) > 90 or abs(args.lon) > 180 or not 500 <= args.radius <= 5000:
        parser.error("Invalid location or radius")
    # Padding covers the small coordinate bucket used by the disk cache.
    delta_lat = (args.radius + 200) / 110574
    delta_lon = (args.radius + 200) / (111320 * max(0.01, math.cos(math.radians(args.lat))))
    south, north = max(-90, args.lat - delta_lat), min(90, args.lat + delta_lat)
    west, east = max(-180, args.lon - delta_lon), min(180, args.lon + delta_lon)
    from overturemaps.core import get_latest_release, record_batch_reader
    # Library diagnostics go to stderr; stdout is one machine-readable response.
    with contextlib.redirect_stdout(sys.stderr):
        release = get_latest_release()
        batches = record_batch_reader("place", (west, south, east, north), release=release,
                                      connect_timeout=10, request_timeout=30, stac=True)
        restaurants = []
        if batches is not None:
            for batch in batches:
                for row in batch.to_pylist():
                    restaurant = map_restaurant(row)
                    if restaurant:
                        restaurant["sourceDate"] = release[:10]
                        restaurants.append(restaurant)
    print(json.dumps({"release": release, "restaurants": restaurants}, separators=(",", ":")))


if __name__ == "__main__":
    main()
