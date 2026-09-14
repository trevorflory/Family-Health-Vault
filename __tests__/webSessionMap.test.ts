/**
 * @jest-environment jsdom
 */
import {
  clearSessionMap,
  loadSessionMap,
  persistSessionMap,
} from '../db/webSessionMap';

describe('webSessionMap', () => {
  const key = 'healthcare.test.webSessionMap';

  beforeEach(() => {
    clearSessionMap(key);
  });

  afterEach(() => {
    clearSessionMap(key);
  });

  it('round-trips Map entries through sessionStorage', () => {
    const map = new Map([
      ['a', { id: 'a', value: 1 }],
      ['b', { id: 'b', value: 2 }],
    ]);
    persistSessionMap(key, map);

    const restored = loadSessionMap<{ id: string; value: number }>(key);
    expect(restored.get('a')).toEqual({ id: 'a', value: 1 });
    expect(restored.get('b')).toEqual({ id: 'b', value: 2 });
    expect(restored.size).toBe(2);
  });

  it('returns an empty Map when nothing is stored', () => {
    expect(loadSessionMap(key).size).toBe(0);
  });
});
