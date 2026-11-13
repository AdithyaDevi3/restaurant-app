import { RestaurantMenu } from '../types';
import { apiEndpoint } from './apiEndpoint';
import { parseMenuDocument, findMenuLink } from '../algorithm/MenuParser';

async function loadPage(url: string): Promise<{ body: string; contentType: string }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(apiEndpoint ? `${apiEndpoint}/menu?url=${encodeURIComponent(url)}` : url, { signal: controller.signal });
    if (!response.ok) throw new Error('Could not read this menu. Add dishes manually or try a direct menu URL.');
    return apiEndpoint ? await response.json() : { body: await response.text(), contentType: response.headers.get('content-type') ?? '' };
  } finally { clearTimeout(timeout); }
}

export async function importRestaurantMenu(restaurantId: string, sourceUrl: string): Promise<RestaurantMenu> {
  let url: URL;
  try {
    url = new URL(sourceUrl);
    if (!['http:', 'https:'].includes(url.protocol)) throw new Error();
  } catch { throw new Error('Menu URL must use http or https'); }
  let page = await loadPage(url.href);
  let items = parseMenuDocument(page.body, page.contentType);
  // Restaurant websites often link a separate menu page from their homepage.
  if (page.contentType.includes('html')) {
    const linkedMenu = findMenuLink(page.body, url.href);
    if (linkedMenu && items.length < 3) {
      try {
        const menuPage = await loadPage(linkedMenu);
        const menuItems = parseMenuDocument(menuPage.body, menuPage.contentType);
        if (menuItems.length > items.length) { items = menuItems; url = new URL(linkedMenu); page = menuPage; }
      } catch { /* Keep any usable dishes from the original page. */ }
    }
  }
  if (!items.length) throw new Error('No readable dishes found. Try a direct menu URL or add dishes manually.');
  return { restaurantId, sourceUrl: url.href, items, lastSyncedAt: Date.now() };
}
