import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { fetchPublicText } from './publicFetch.mjs';
import { createReadCache } from './cache.mjs';
import { searchOvertureRestaurants } from './overturePlaces.mjs';

const root = resolve(process.env.WEB_DIST_DIR || fileURLToPath(new URL('../dist', import.meta.url)));
const cached = createReadCache();
const requests = new Map();
const types = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.ico': 'image/x-icon', '.ttf': 'font/ttf', '.svg': 'image/svg+xml' };

export const server = createServer(async (req, res) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  try {
    const url = new URL(req.url, 'http://localhost');
    if (req.method !== 'GET') { res.writeHead(405); res.end(); return; }
    if (url.pathname.startsWith('/api/')) {
      const origin = req.headers.origin;
      if (origin && new URL(origin).host !== req.headers.host) { res.writeHead(403); res.end(); return; }
      const ip = req.socket.remoteAddress;
      const bucket = requests.get(ip);
      const current = bucket && bucket.until > Date.now() ? bucket : { count: 0, until: Date.now() + 60000 };
      requests.set(ip, current);
      if (++current.count > 90) { res.writeHead(429); res.end('Too many requests. Please try again shortly.'); return; }
      if (requests.size > 1000) for (const [key, value] of requests) if (value.until <= Date.now()) requests.delete(key);
      let result;
      if (url.pathname === '/api/menu') {
        const target = url.searchParams.get('url');
        if (!target || target.length > 2048) throw new Error('Enter a valid menu URL.');
        result = await cached(`menu:${target}`, 3600000, () => fetchPublicText(target));
      } else if (url.pathname === '/api/areas') {
        const query = url.searchParams.get('q')?.trim();
        if (!query || query.length < 3 || query.length > 150) throw new Error('Enter a city or neighborhood.');
        result = await cached(`area:${query.toLowerCase()}`, 86400000, () => fetchPublicText(`https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=5`));
      } else if (url.pathname === '/api/places') {
        const latitude = url.searchParams.get('lat');
        const longitude = url.searchParams.get('lon');
        const lat = Number(latitude), lon = Number(longitude), radius = Number(url.searchParams.get('radius'));
        if (latitude === null || longitude === null || !Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180 || !Number.isInteger(radius) || radius < 500 || radius > 5000) throw new Error('Invalid restaurant search location or radius.');
        if (process.env.FREE_PLACES_PROVIDER !== 'overpass') {
          const data = await searchOvertureRestaurants({ lat, lon, radius });
          res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
          res.end(JSON.stringify(data)); return;
        }
        const query = `[out:json][timeout:20];nwr["amenity"="restaurant"](around:${radius},${lat},${lon});out center;`;
        const provider = new URL(process.env.OVERPASS_API_URL || 'https://overpass.private.coffee/api/interpreter');
        try {
          result = await cached(`places:${lat.toFixed(4)}:${lon.toFixed(4)}:${radius}`, 300000, async () => {
            const response = await fetchPublicText(provider.href, { signal: AbortSignal.timeout(25000), body: new URLSearchParams({ data: query }).toString() });
            if (!Array.isArray(JSON.parse(response.body).elements)) throw new Error('Incomplete restaurant response.');
            return response;
          });
        } catch { throw new Error('The restaurant data provider is temporarily unavailable. Please try again shortly.'); }
      } else { res.writeHead(404); res.end(); return; }
      // Never serve arbitrary website HTML as a document on the app's origin.
      res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
      res.end(url.pathname === '/api/menu' ? JSON.stringify(result) : result.body); return;
    }
    let path = resolve(root, `.${decodeURIComponent(url.pathname)}`);
    if (path !== root && !path.startsWith(root + sep)) { res.writeHead(403); res.end(); return; }
    try { if ((await stat(path)).isDirectory()) path = resolve(path, 'index.html'); }
    catch { path = resolve(root, 'index.html'); }
    const body = await readFile(path);
    res.writeHead(200, { 'Content-Type': types[extname(path)] ?? 'application/octet-stream' }); res.end(body);
  } catch (error) {
    res.writeHead(400, { 'Content-Type': 'text/plain', 'Cache-Control': 'no-store' });
    res.end(error instanceof Error ? error.message : 'Request failed.');
  }
});

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT || 3000);
  server.listen(port, '0.0.0.0', () => console.log(`RestaurantFinder is ready at http://localhost:${port}`));
}
