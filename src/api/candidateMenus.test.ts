import { isSafeCandidateMenuUrl } from './candidateMenus';

describe('isSafeCandidateMenuUrl', () => {
  it('accepts public http and https restaurant sites', () => {
    expect(isSafeCandidateMenuUrl('https://restaurant.example/menu')).toBe(true);
    expect(isSafeCandidateMenuUrl('http://restaurant.example')).toBe(true);
  });

  it('rejects unsupported, malformed, and private-network URLs', () => {
    expect(isSafeCandidateMenuUrl('file:///etc/passwd')).toBe(false);
    expect(isSafeCandidateMenuUrl('not a URL')).toBe(false);
    expect(isSafeCandidateMenuUrl('http://localhost:3000')).toBe(false);
    expect(isSafeCandidateMenuUrl('http://127.0.0.1')).toBe(false);
    expect(isSafeCandidateMenuUrl('http://10.0.0.4/menu')).toBe(false);
    expect(isSafeCandidateMenuUrl('http://172.16.2.3')).toBe(false);
    expect(isSafeCandidateMenuUrl('http://192.168.1.10')).toBe(false);
    expect(isSafeCandidateMenuUrl('http://printer.local')).toBe(false);
  });
});
