import { parseLimit, parsePagination } from '../utils/pagination.js';

describe('pagination utils', () => {
  test('parsePagination applies defaults and bounds', () => {
    const { pageNum, limitNum, skip } = parsePagination({}, { defaultPage: 1, defaultLimit: 10, maxLimit: 100 });
    expect(pageNum).toBe(1);
    expect(limitNum).toBe(10);
    expect(skip).toBe(0);
  });

  test('parsePagination clamps and computes skip', () => {
    const { pageNum, limitNum, skip } = parsePagination({ page: '-2', limit: '1000' }, { defaultLimit: 10, maxLimit: 100 });
    expect(pageNum).toBe(1);
    expect(limitNum).toBe(100);
    expect(skip).toBe(0);

    const out2 = parsePagination({ page: '3', limit: '20' }, { defaultLimit: 10, maxLimit: 100 });
    expect(out2.pageNum).toBe(3);
    expect(out2.limitNum).toBe(20);
    expect(out2.skip).toBe(40);
  });

  test('parseLimit clamps', () => {
    expect(parseLimit({ limit: '0' }, { defaultLimit: 20 }).limitNum).toBe(1);
    expect(parseLimit({ limit: '999' }, { defaultLimit: 20, maxLimit: 100 }).limitNum).toBe(100);
  });
});
