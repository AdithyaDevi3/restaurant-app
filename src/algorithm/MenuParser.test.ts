import { parseMenuDocument, findMenuLink } from './MenuParser';

describe('menu evidence', () => {
  it('reads nested schema.org MenuItem dishes and prices, excluding restaurant and section names', () => {
    const html = '<script type="application/ld+json">' + JSON.stringify({
      '@type': 'Restaurant', name: 'Pasta House', hasMenu: { '@type': 'Menu', name: 'Dinner',
        hasMenuSection: [{ name: 'Mains', hasMenuItem: [{ '@type': 'MenuItem', name: 'Truffle Carbonara',
          offers: { price: '22', priceCurrency: 'USD' } }] }] },
    }) + '</script>';
    const items = parseMenuDocument(html, 'text/html');
    expect(items).toHaveLength(1);
    expect(items[0].name).toBe('Truffle Carbonara');
    expect(items[0].price).toBe(22);
  });
  it('does not turn homepage headings or SEO titles into dishes', () => {
    const html = '<meta property="og:title" content="Carbonara Kitchen"><h1>Best carbonara in town</h1><p>About our family</p>';
    expect(parseMenuDocument(html, 'text/html')).toHaveLength(0);
  });
  it('reads explicit JSON menus and price-bearing menu lines', () => {
    expect(parseMenuDocument('{"items":[{"name":"Miso ramen"}]}', 'application/json')[0].name).toBe('Miso ramen');
    expect(parseMenuDocument('<li>Miso ramen $18.00</li>', 'text/html')[0].name).toBe('Miso ramen');
  });
  it('follows only same-origin menu pages and skips files and external links', () => {
    expect(findMenuLink('<a href="/dinner-menu">Menu</a>', 'https://restaurant.example/')).toBe('https://restaurant.example/dinner-menu');
    expect(findMenuLink('<a href="https://other.example/menu">Menu</a>', 'https://restaurant.example/')).toBe(null);
    expect(findMenuLink('<a href="/menu.pdf">Menu</a>', 'https://restaurant.example/')).toBe(null);
  });
});
