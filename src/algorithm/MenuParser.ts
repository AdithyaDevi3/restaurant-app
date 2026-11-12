import { MenuItem } from '../types';

function clean(value: string): string {
  return value.replace(/<[^>]*>/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'").replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
}

function collect(value: unknown, output: Array<Omit<MenuItem, 'id'>>, plainItems = false): void {
  if (Array.isArray(value)) { value.forEach((entry) => collect(entry, output, plainItems)); return; }
  if (!value || typeof value !== 'object') return;
  const record = value as Record<string, any>;
  const types = Array.isArray(record['@type']) ? record['@type'] : [record['@type']];
  const name = record.name ?? record.title;
  if (((plainItems && !record['@type']) || types.some((type) => typeof type === 'string' && /(?:^|\/)MenuItem$/.test(type))) && typeof name === 'string' && name.trim().length > 2) {
    const offer = Array.isArray(record.offers) ? record.offers[0] : record.offers;
    const price = Number(record.price ?? offer?.price);
    output.push({ name: clean(name), description: typeof record.description === 'string' ? clean(record.description) : undefined,
      price: Number.isFinite(price) && price > 0 ? price : undefined, currency: record.currency ?? offer?.priceCurrency });
  }
  for (const key of ['items', 'hasMenuItem', 'hasMenuSection', 'hasMenu', 'itemListElement', '@graph', 'menu']) {
    if (record[key]) collect(record[key], output, key === 'items' || key === 'hasMenuItem');
  }
}

/** Only structured dishes or price-bearing lines count as menu evidence. */
export function parseMenuDocument(raw: string, contentType: string): MenuItem[] {
  const output: Array<Omit<MenuItem, 'id'>> = [];
  if (contentType.includes('json') || /^[\s]*[\[{]/.test(raw)) {
    try { collect(JSON.parse(raw), output, true); } catch { return []; }
  } else if (contentType.includes('html')) {
    for (const match of raw.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
      try { collect(JSON.parse(match[1]), output); } catch { /* Ignore malformed schema blocks. */ }
    }
    if (!output.length) {
      for (const match of raw.matchAll(/<(h[1-6]|p|li|span|div)[^>]*>([^<]{3,160})<\/\1>/gi)) {
        const text = clean(match[2]);
        const price = text.match(/[$£€]\s*(\d+(?:\.\d{1,2})?)|\b(\d+\.\d{2})\b/);
        if (!price) continue;
        const name = text.replace(price[0], '').replace(/[.·—-]+\s*$/, '').trim();
        if (name.length > 2 && !/copyright|delivery|shipping|minimum|gift card/i.test(name)) output.push({ name, price: Number(price[1] ?? price[2]) });
      }
    }
  } else {
    for (const line of raw.split('\n')) {
      const name = clean(line);
      if (name.length > 2 && name.length < 140) output.push({ name });
    }
  }
  const unique = new Map(output.map((item) => [item.name.toLowerCase(), item]));
  return [...unique.values()].slice(0, 60).map((item, index) => ({ ...item, id: `menu-${index}-${item.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40)}` }));
}

export function findMenuLink(html: string, baseUrl: string): string | null {
  const base = new URL(baseUrl);
  for (const match of html.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    if (!/\bmenu\b|\/menus?(?:\/|$|\?)/i.test(`${match[1]} ${clean(match[2])}`)) continue;
    try {
      const link = new URL(match[1].replace(/&amp;/g, '&'), base);
      if (link.origin === base.origin && link.href !== base.href && !link.hash && !/\.pdf(?:\?|$)/i.test(link.href)) return link.href;
    } catch { /* Ignore invalid website links. */ }
  }
  return null;
}
