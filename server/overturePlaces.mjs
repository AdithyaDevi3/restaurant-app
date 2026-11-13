import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdir, readFile, writeFile, readdir, stat, unlink, rename } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const execute = promisify(execFile);
const projectRoot = fileURLToPath(new URL('../', import.meta.url));
const pending = new Map();
let queue = Promise.resolve();
const TTL = 7 * 24 * 60 * 60 * 1000;

export function distanceMeters(lat, lon, restaurant) {
  const rad = (value) => value * Math.PI / 180;
  const a = Math.sin(rad(restaurant.lat - lat) / 2) ** 2 + Math.cos(rad(lat)) * Math.cos(rad(restaurant.lat)) * Math.sin(rad(restaurant.lon - lon) / 2) ** 2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(Math.max(0, 1 - a)));
}

export function nearbyRestaurants(restaurants, { lat, lon, radius }) {
  const seen = new Set();
  return restaurants.map((restaurant) => ({ ...restaurant, distance: distanceMeters(lat, lon, restaurant) }))
    .filter((restaurant) => restaurant.distance <= radius)
    .sort((a, b) => a.distance - b.distance)
    .filter((restaurant) => {
      const key = `${restaurant.name.toLowerCase().replace(/[^a-z0-9]/g, '')}:${restaurant.lat.toFixed(3)}:${restaurant.lon.toFixed(3)}`;
      if (seen.has(key)) return false;
      seen.add(key); return true;
    }).slice(0, 1000);
}

async function download(location, path) {
  const python = process.env.OVERTURE_PYTHON || resolve(projectRoot, process.platform === 'win32' ? '.venv/Scripts/python.exe' : '.venv/bin/python');
  let stdout;
  try {
    ({ stdout } = await execute(python, [fileURLToPath(new URL('./open_places.py', import.meta.url)),
      '--lat', String(location.lat), '--lon', String(location.lon), '--radius', String(location.radius)],
    { timeout: 120000, maxBuffer: 8 * 1024 * 1024 }));
  } catch (error) {
    if (error.code === 'ENOENT') throw new Error('Restaurant data setup is incomplete. Please contact the app owner.');
    throw new Error('Could not download this area’s open restaurant data. Please try again shortly.');
  }
  const payload = JSON.parse(stdout);
  if (!Array.isArray(payload.restaurants)) throw new Error('Invalid open restaurant data.');
  const result = { ...payload, cacheVersion: 1, fetchedAt: Date.now() };
  await mkdir(resolve(path, '..'), { recursive: true });
  const directory = resolve(path, '..');
  const files = await readdir(directory);
  const entries = await Promise.all(files.filter((name) => /^area_[-\d._]+\.json$/.test(name))
    .map(async (name) => ({ path: resolve(directory, name), time: (await stat(resolve(directory, name))).mtimeMs })));
  for (const entry of entries.sort((a, b) => a.time - b.time).slice(0, Math.max(0, entries.length - 63))) await unlink(entry.path);
  const temporaryPath = `${path}.${process.pid}.tmp`;
  try {
    await writeFile(temporaryPath, JSON.stringify(result));
    await rename(temporaryPath, path);
  } finally {
    await unlink(temporaryPath).catch(() => {});
  }
  return result;
}

export async function searchOvertureRestaurants(location) {
  const lat = Number(location.lat.toFixed(3)), lon = Number(location.lon.toFixed(3));
  const key = `area_${lat}_${lon}_${location.radius}.json`;
  const directory = process.env.OPEN_PLACES_CACHE_DIR || resolve(projectRoot, '.cache/open-places');
  const path = resolve(directory, key);
  try {
    const cached = JSON.parse(await readFile(path, 'utf8'));
    if (cached.cacheVersion === 1 && Array.isArray(cached.restaurants) && Date.now() - cached.fetchedAt < TTL)
      return { ...cached, restaurants: nearbyRestaurants(cached.restaurants, location) };
  } catch { /* Missing/corrupt downloads are rebuilt from the public source. */ }
  if (!pending.has(path)) {
    if (pending.size >= 4) throw new Error('Restaurant data downloads are busy. Please try again shortly.');
    const task = queue.catch(() => {}).then(() => download({ lat, lon, radius: location.radius }, path));
    queue = task;
    pending.set(path, task.finally(() => pending.delete(path)));
  }
  const result = await pending.get(path);
  return { ...result, restaurants: nearbyRestaurants(result.restaurants, location) };
}
