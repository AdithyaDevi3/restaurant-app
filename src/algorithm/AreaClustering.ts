import { VisitArea, VisitRecord } from '../types';

const MERGE_DISTANCE_METERS = 1000;
const MIN_AREA_RADIUS_METERS = 1500;

export function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const toRad = (deg: number) => deg * (Math.PI / 180);
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function hasValidLocation(visit: VisitRecord): boolean {
  return Number.isFinite(visit.lat) && Number.isFinite(visit.lon) && !(visit.lat === 0 && visit.lon === 0);
}

/**
 * Greedy single-pass clustering of visit locations into areas.
 * Visits within MERGE_DISTANCE_METERS of an existing cluster centroid join it;
 * otherwise they seed a new cluster. Legacy visits without coordinates are skipped.
 */
export function clusterVisits(visits: VisitRecord[]): VisitArea[] {
  const located = visits.filter(hasValidLocation);

  interface Cluster {
    visits: VisitRecord[];
    centroid: { lat: number; lon: number };
  }

  const clusters: Cluster[] = [];

  located.forEach((visit) => {
    const match = clusters.find(
      (cluster) =>
        haversineMeters(cluster.centroid.lat, cluster.centroid.lon, visit.lat, visit.lon) <=
        MERGE_DISTANCE_METERS,
    );

    if (match) {
      match.visits.push(visit);
      match.centroid = {
        lat: match.visits.reduce((sum, v) => sum + v.lat, 0) / match.visits.length,
        lon: match.visits.reduce((sum, v) => sum + v.lon, 0) / match.visits.length,
      };
    } else {
      clusters.push({ visits: [visit], centroid: { lat: visit.lat, lon: visit.lon } });
    }
  });

  return clusters.map((cluster, index) => {
    const spread = Math.max(
      ...cluster.visits.map((v) =>
        haversineMeters(cluster.centroid.lat, cluster.centroid.lon, v.lat, v.lon),
      ),
      0,
    );

    // Most recent visit names the area
    const anchor = [...cluster.visits].sort((a, b) => b.timestamp - a.timestamp)[0];

    return {
      id: `area-${index}-${cluster.centroid.lat.toFixed(3)}-${cluster.centroid.lon.toFixed(3)}`,
      label: `Around ${anchor.restaurantName}`,
      centroid: cluster.centroid,
      radiusMeters: Math.max(MIN_AREA_RADIUS_METERS, Math.round(spread + 500)),
      visitIds: cluster.visits.map((v) => v.restaurantId),
    };
  });
}
