import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isPublicAddress, validatePublicUrl, fetchPublicText } from './publicFetch.mjs';

test('rejects loopback, private, metadata, multicast, mapped IPv6, and reserved addresses', () => {
  for (const address of ['127.0.0.1', '10.1.1.1', '169.254.169.254', '172.16.0.2', '192.168.1.1',
    '100.64.0.1', '224.0.0.1', '0.0.0.0', '::1', '::ffff:127.0.0.1', 'fc00::1', 'fe80::1', '2001:db8::1']) {
    assert.equal(isPublicAddress(address), false, address);
  }
  assert.equal(isPublicAddress('8.8.8.8'), true);
  assert.equal(isPublicAddress('2606:4700:4700::1111'), true);
});
test('rejects credentials, unusual ports, alternate-IP encodings and non-http URLs', () => {
  for (const url of ['file:///etc/passwd', 'http://127.1', 'http://2130706433', 'http://0x7f000001',
    'http://localhost', 'http://printer.local', 'https://user:pass@example.com', 'https://example.com:8443']) {
    assert.throws(() => validatePublicUrl(url), undefined, url);
  }
});
test('rejects DNS names that resolve to any private address before opening a connection', async () => {
  await assert.rejects(fetchPublicText('https://restaurant.example/menu', {
    resolveHost: async () => [{ address: '8.8.8.8', family: 4 }, { address: '10.0.0.1', family: 4 }],
  }), /restricted network/);
});
test('bounds DNS resolution by the request deadline', async () => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10);
  try {
    await assert.rejects(fetchPublicText('https://restaurant.example/menu', {
      signal: controller.signal, resolveHost: async () => new Promise(() => {}),
    }), /timed out/);
  } finally { clearTimeout(timer); }
});
