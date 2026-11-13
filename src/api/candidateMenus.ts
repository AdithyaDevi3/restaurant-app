import { Restaurant, RestaurantMenu } from '../types';
import { importRestaurantMenu } from './menuImport';
import { getCachedCandidateMenu, setCachedCandidateMenu } from './candidateMenuCache';

const MAX_CANDIDATE_MENU_FETCHES = 6;

export async function loadCandidateMenus(
  rankedCandidates: Restaurant[],
): Promise<Record<string, RestaurantMenu>> {
  const candidates = rankedCandidates
    .filter((candidate) => isSafeCandidateMenuUrl(candidate.sourceUrl))
    .slice(0, MAX_CANDIDATE_MENU_FETCHES);

  const entries = await Promise.all(
    candidates.map(async (candidate): Promise<[string, RestaurantMenu | null]> => {
      const sourceUrl = candidate.sourceUrl!;
      const cached = getCachedCandidateMenu(candidate.id, sourceUrl);
      if (cached.status === 'hit') return [candidate.id, cached.menu];

      try {
        const menu = await importRestaurantMenu(candidate.id, sourceUrl);
        const usableMenu = menu.items.length > 0 ? menu : null;
        setCachedCandidateMenu(candidate.id, sourceUrl, usableMenu);
        return [candidate.id, usableMenu];
      } catch {
        setCachedCandidateMenu(candidate.id, sourceUrl, null);
        return [candidate.id, null];
      }
    }),
  );

  return Object.fromEntries(
    entries.filter((entry): entry is [string, RestaurantMenu] => entry[1] !== null),
  );
}

export function isSafeCandidateMenuUrl(sourceUrl: string | undefined): sourceUrl is string {
  if (!sourceUrl) return false;

  try {
    const url = new URL(sourceUrl);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return false;

    const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, '');
    if (host === 'localhost' || host.endsWith('.local') || host === '::1') return false;

    const ipv4 = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
    if (ipv4) {
      const octets = ipv4.slice(1).map(Number);
      if (octets.some((octet) => octet > 255)) return false;
      if (
        octets[0] === 10 ||
        octets[0] === 127 ||
        (octets[0] === 169 && octets[1] === 254) ||
        (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31) ||
        (octets[0] === 192 && octets[1] === 168)
      ) return false;
    }

    return true;
  } catch {
    return false;
  }
}
