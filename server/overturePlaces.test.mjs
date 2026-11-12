import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { nearbyRestaurants, searchOvertureRestaurants } from './overturePlaces.mjs';

const origin = { lat: 40.715, lon: -73.96, radius: 1000 };
const restaurant = { id: 'a', name: 'Example Kitchen', lat: 40.716, lon: -73.96 };

test('clips downloaded rectangles to the exact search radius and removes duplicate listings', () => {
  const result = nearbyRestaurants([restaurant, { ...restaurant, id: 'duplicate' },
    { ...restaurant, id: 'far', name: 'Far Kitchen', lat: 41 }], origin);
  assert.equal(result.length, 1);
  assert.equal(result[0].id, 'a');
  assert.ok(result[0].distance > 0 && result[0].distance < 150);
});

test('uses a fresh local public-data download without requiring a Python process or live API', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'restaurant-open-cache-'));
  const previous = process.env.OPEN_PLACES_CACHE_DIR;
  process.env.OPEN_PLACES_CACHE_DIR = directory;
  try {
    await writeFile(join(directory, 'area_40.715_-73.96_1000.json'), JSON.stringify({
      release: 'example-release', cacheVersion: 1, fetchedAt: Date.now(), restaurants: [restaurant],
    }));
    const result = await searchOvertureRestaurants(origin);
    assert.equal(result.release, 'example-release');
    assert.equal(result.restaurants[0].id, 'a');
  } finally {
    if (previous === undefined) delete process.env.OPEN_PLACES_CACHE_DIR;
    else process.env.OPEN_PLACES_CACHE_DIR = previous;
    await rm(directory, { recursive: true, force: true });
  }
});
