import { pickAreaLabel } from './areaLabel';

describe('pickAreaLabel', () => {
  it('returns null for empty results', () => {
    expect(pickAreaLabel([])).toBe(null);
  });

  it('prefers district over city', () => {
    expect(pickAreaLabel([{ district: 'SoHo', city: 'New York' }])).toBe('SoHo');
  });

  it('falls back through city, subregion, region', () => {
    expect(pickAreaLabel([{ district: null, city: 'Brooklyn' }])).toBe('Brooklyn');
    expect(pickAreaLabel([{ subregion: 'Kings County' }])).toBe('Kings County');
    expect(pickAreaLabel([{ region: 'NY' }])).toBe('NY');
  });

  it('skips blank values and later addresses can win', () => {
    expect(pickAreaLabel([{ district: '  ' }, { city: 'Queens' }])).toBe('Queens');
  });

  it('trims the chosen label', () => {
    expect(pickAreaLabel([{ district: ' Mission District ' }])).toBe('Mission District');
  });
});
