import { lookup } from 'node:dns/promises';
import { request as httpRequest } from 'node:http';
import { request as httpsRequest } from 'node:https';
import { BlockList, isIP } from 'node:net';

const blocked = new BlockList();
for (const [address, prefix] of [
  ['0.0.0.0', 8], ['10.0.0.0', 8], ['100.64.0.0', 10], ['127.0.0.0', 8],
  ['169.254.0.0', 16], ['172.16.0.0', 12], ['192.0.0.0', 24], ['192.0.2.0', 24],
  ['192.168.0.0', 16], ['198.18.0.0', 15], ['198.51.100.0', 24], ['203.0.113.0', 24],
  ['224.0.0.0', 3],
]) blocked.addSubnet(address, prefix, 'ipv4');
blocked.addSubnet('2001::', 23, 'ipv6');
blocked.addSubnet('2001:db8::', 32, 'ipv6');
blocked.addSubnet('2002::', 16, 'ipv6');

export function isPublicAddress(address) {
  if (isIP(address) === 4) return !blocked.check(address, 'ipv4');
  return isIP(address) === 6 && /^[23][0-9a-f]{3}:/i.test(address) && !blocked.check(address, 'ipv6');
}

export function validatePublicUrl(value) {
  const url = new URL(value);
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password ||
    (url.port && !['80', '443'].includes(url.port))) throw new Error('Use a public http or https menu URL.');
  const host = url.hostname.replace(/^\[|\]$/g, '').toLowerCase();
  if (!host.includes('.') && !isIP(host) || host.endsWith('.local') || host.endsWith('.localhost') ||
    host === 'localhost' || (isIP(host) && !isPublicAddress(host))) throw new Error('Use a public restaurant website.');
  return url;
}

/** Resolve and pin the connection address; revalidate each redirect. Never forward browser credentials. */
export async function fetchPublicText(value, { signal = AbortSignal.timeout(6500), redirects = 2, resolveHost = lookup, body } = {}) {
  const url = validatePublicUrl(value);
  const host = url.hostname.replace(/^\[|\]$/g, '');
  const addresses = await Promise.race([
    resolveHost(host, { all: true, verbatim: true }),
    new Promise((_, reject) => {
      if (signal.aborted) reject(new Error('Website request timed out.'));
      else signal.addEventListener('abort', () => reject(new Error('Website request timed out.')), { once: true });
    }),
  ]);
  if (!addresses.length || addresses.some(({ address }) => !isPublicAddress(address))) throw new Error('Website resolves to a restricted network.');
  const chosen = addresses.find((entry) => entry.family === 4) ?? addresses[0];
  const result = await new Promise((resolve, reject) => {
    const request = (url.protocol === 'https:' ? httpsRequest : httpRequest)(url, {
      signal,
      method: body === undefined ? 'GET' : 'POST',
      lookup: (_hostname, options, callback) => options.all
        ? callback(null, [chosen]) : callback(null, chosen.address, chosen.family),
      headers: { 'User-Agent': 'RestaurantFinder/1.0 (+https://github.com/AdithyaDevi3/restaurant-app)', Accept: 'text/html,application/json,text/plain', 'Accept-Encoding': 'identity',
        ...(body === undefined ? {} : { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(body) }) },
    }, (response) => {
      const status = response.statusCode ?? 502;
      if ([301, 302, 303, 307, 308].includes(status)) {
        response.resume(); resolve({ redirect: response.headers.location, preserveBody: status === 307 || status === 308 }); return;
      }
      const contentType = response.headers['content-type'] ?? 'text/plain';
      if (status < 200 || status >= 300 || !/text\/|application\/(?:ld\+)?json/.test(contentType)) {
        response.resume(); reject(new Error('This website does not provide a readable menu.')); return;
      }
      let bytes = 0;
      const chunks = [];
      response.on('data', (chunk) => {
        bytes += chunk.length;
        if (bytes > 2 * 1024 * 1024) request.destroy(new Error('Menu page exceeds 2 MB.'));
        else chunks.push(chunk);
      });
      response.on('end', () => resolve({ body: Buffer.concat(chunks).toString('utf8'), contentType }));
      response.on('error', reject);
    });
    request.on('error', reject);
    request.end(body);
  });
  if ('redirect' in result) {
    if (!result.redirect || redirects === 0) throw new Error('Too many website redirects.');
    return fetchPublicText(new URL(result.redirect, url).href, { signal, redirects: redirects - 1, resolveHost, body: result.preserveBody ? body : undefined });
  }
  return result;
}
