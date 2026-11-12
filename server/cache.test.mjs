import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createReadCache } from './cache.mjs';

test('concurrent identical lookups share one upstream request', async () => {
  const cached = createReadCache();
  let reads = 0;
  const load = async () => { reads++; return ['restaurant']; };
  const results = await Promise.all([cached('area', 1000, load), cached('area', 1000, load)]);
  assert.equal(reads, 1);
  assert.deepEqual(results, [['restaurant'], ['restaurant']]);
});

test('a failed lookup is shared but can be retried immediately', async () => {
  const cached = createReadCache();
  let reads = 0;
  const load = async () => { reads++; throw new Error('Provider unavailable'); };
  const attempts = await Promise.allSettled([cached('area', 1000, load), cached('area', 1000, load)]);
  assert.ok(attempts.every((attempt) => attempt.status === 'rejected'));
  assert.equal(reads, 1);
  assert.deepEqual(await cached('area', 1000, async () => ['recovered']), ['recovered']);
});

test('expired results are refreshed and distinct areas never share a pending read', async () => {
  let time = 0;
  const cached = createReadCache({ now: () => time });
  assert.equal(await cached('a', 10, async () => 'old'), 'old');
  time = 11;
  const values = await Promise.all([cached('a', 10, async () => 'new'), cached('b', 10, async () => 'other')]);
  assert.deepEqual(values, ['new', 'other']);
});
