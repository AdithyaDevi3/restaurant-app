import { MenuItem, RestaurantMenu } from '../types';

interface StructuredMenuCandidate {
  name?: string;
  description?: string;
  price?: number;
  currency?: string;
}

function extractMenuItemsFromText(text: string): MenuItem[] {
  const structured = extractStructuredCandidates(text);
  if (structured.length > 0) {
    return structured.slice(0, 30).map((item, index) => ({
      id: `menu-item-${index}-${slugify(item.name || `item-${index}`)}`,
      name: item.name || `Item ${index + 1}`,
      description: item.description,
      price: item.price,
      currency: item.currency,
    }));
  }

  const fallbackLines = text
    .split(/\n|,/)
    .map((line) => line.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim())
    .filter((line) => line.length > 2)
    .filter((line) => looksLikeMenuLine(line))
    .slice(0, 25);

  return fallbackLines.map((name, index) => ({
    id: `menu-item-${index}-${slugify(name)}`,
    name,
  }));
}

export async function importRestaurantMenu(
  restaurantId: string,
  sourceUrl: string,
): Promise<RestaurantMenu> {
  const response = await fetch(sourceUrl);
  if (!response.ok) {
    throw new Error(`Failed to load menu from ${sourceUrl}`);
  }

  const contentType = response.headers.get('content-type') || '';
  const bodyText = await response.text();

  const items = contentType.includes('application/json')
    ? parseJsonMenu(bodyText)
    : contentType.includes('text/html')
      ? parseHtmlMenu(bodyText)
      : extractMenuItemsFromText(bodyText);

  return {
    restaurantId,
    sourceUrl,
    items,
    lastSyncedAt: Date.now(),
  };
}

function parseJsonMenu(raw: string): MenuItem[] {
  try {
    const parsed = JSON.parse(raw);
    const candidateItems = Array.isArray(parsed)
      ? parsed
      : Array.isArray(parsed.items)
        ? parsed.items
        : [];

    return candidateItems.slice(0, 20).map((item: any, index: number) => ({
      id: item.id ? String(item.id) : `menu-item-${index}`,
      name: String(item.name || item.title || `Item ${index + 1}`),
      description: item.description ? String(item.description) : undefined,
      price: typeof item.price === 'number' ? item.price : undefined,
      currency: typeof item.currency === 'string' ? item.currency : undefined,
    }));
  } catch {
    return [];
  }
}

function parseHtmlMenu(raw: string): MenuItem[] {
  const jsonLdMatches = raw.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi) || [];
  for (const scriptTag of jsonLdMatches) {
    const scriptContent = scriptTag.replace(/^[\s\S]*?>/, '').replace(/<\/script>$/i, '');
    const parsed = parseJsonMenu(scriptContent);
    if (parsed.length > 0) {
      return parsed;
    }
  }

  const itempropMatches = Array.from(
    raw.matchAll(
      /<[^>]+itemprop=["']name["'][^>]*>([^<]+)<\/[^>]+>|<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["'][^>]*>/gi,
    ),
  ).map((match) => match[1] || match[2]).filter(Boolean) as string[];

  const headings = Array.from(
    raw.matchAll(/<(h[1-6]|p|li|span|div)[^>]*>([^<]{4,120})<\/\1>/gi),
  )
    .map((match) => match[2].replace(/\s+/g, ' ').trim())
    .filter((line) => looksLikeMenuLine(line));

  const combined = [...itempropMatches, ...headings]
    .map((line) => line.replace(/&amp;/g, '&').trim())
    .filter(Boolean);

  return combined.map((name, index) => ({
    id: `menu-item-${index}-${slugify(name)}`,
    name,
  }));
}

function extractStructuredCandidates(raw: string): StructuredMenuCandidate[] {
  const candidates: StructuredMenuCandidate[] = [];

  try {
    const parsed = JSON.parse(raw);
    collectStructuredItems(parsed, candidates);
  } catch {
    // Not JSON, continue with HTML heuristics.
  }

  const jsonLdBlocks = raw.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi) || [];
  jsonLdBlocks.forEach((scriptTag) => {
    const scriptContent = scriptTag.replace(/^[\s\S]*?>/, '').replace(/<\/script>$/i, '');
    try {
      collectStructuredItems(JSON.parse(scriptContent), candidates);
    } catch {
      // Ignore malformed JSON-LD.
    }
  });

  return candidates;
}

function collectStructuredItems(value: unknown, bucket: StructuredMenuCandidate[]): void {
  if (Array.isArray(value)) {
    value.forEach((item) => collectStructuredItems(item, bucket));
    return;
  }

  if (!value || typeof value !== 'object') {
    return;
  }

  const record = value as Record<string, unknown>;

  const name = typeof record.name === 'string' ? record.name : undefined;
  const description = typeof record.description === 'string' ? record.description : undefined;
  const price = typeof record.price === 'number' ? record.price : typeof record.price === 'string' ? Number(record.price) : undefined;
  const currency = typeof record.currency === 'string' ? record.currency : typeof record.priceCurrency === 'string' ? record.priceCurrency : undefined;

  if (name && name.length > 2) {
    bucket.push({ name, description, price: Number.isFinite(price as number) ? price : undefined, currency });
  }

  if (Array.isArray(record.hasMenuSection)) {
    record.hasMenuSection.forEach((section) => collectStructuredItems(section, bucket));
  }

  if (Array.isArray(record.hasMenuItem)) {
    record.hasMenuItem.forEach((item) => collectStructuredItems(item, bucket));
  }

  if (record.itemListElement) {
    collectStructuredItems(record.itemListElement, bucket);
  }

  if (record.offers) {
    collectStructuredItems(record.offers, bucket);
  }
}

function looksLikeMenuLine(value: string): boolean {
  const lower = value.toLowerCase();
  if (lower.length < 3) return false;
  if (/^(home|menu|about|contact|login|sign up|copyright)$/i.test(lower)) return false;
  if (/\b(add to cart|order now|reserve|book a table)\b/i.test(lower)) return false;
  return /[a-z]/i.test(value);
}

function slugify(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'item';
}