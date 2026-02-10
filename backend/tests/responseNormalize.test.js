import { normalizeJsonBody, responseNormalize } from '../middleware/responseNormalize.js';

describe('responseNormalize', () => {
  test('adds success:true to plain object on 200', () => {
    const out = normalizeJsonBody({ message: 'OK', data: { a: 1 } }, 200);
    expect(out).toEqual({ message: 'OK', data: { a: 1 }, success: true });
  });

  test('adds success:false to plain object on 400', () => {
    const out = normalizeJsonBody({ message: 'Bad request', code: 'VALIDATION_ERROR' }, 400);
    expect(out).toEqual({ message: 'Bad request', code: 'VALIDATION_ERROR', success: false });
  });

  test('does not change arrays', () => {
    const body = [{ id: 1 }];
    const out = normalizeJsonBody(body, 200);
    expect(out).toBe(body);
  });

  test('does not change primitives', () => {
    expect(normalizeJsonBody('ok', 200)).toBe('ok');
    expect(normalizeJsonBody(123, 200)).toBe(123);
    expect(normalizeJsonBody(null, 200)).toBe(null);
  });

  test('does not override existing success property', () => {
    const body = { success: false, message: 'Already set' };
    const out = normalizeJsonBody(body, 200);
    expect(out).toBe(body);
    expect(out).toEqual({ success: false, message: 'Already set' });
  });

  test('skips likely mongoose documents', () => {
    const docLike = {
      $__: {},
      _doc: { id: 1 },
      toObject() {
        return this._doc;
      },
      populate() {
        return this;
      },
    };

    const out = normalizeJsonBody(docLike, 200);
    expect(out).toBe(docLike);
    expect(Object.prototype.hasOwnProperty.call(out, 'success')).toBe(false);
  });

  test('translates transfer-log reason fields (data array) when locale is set', () => {
    const mw = responseNormalize();
    const req = { locale: 'ar', headers: {} };

    const calls = [];
    const res = {
      statusCode: 200,
      json(payload) {
        calls.push(payload);
        return payload;
      },
    };

    mw(req, res, () => {});

    res.json({
      data: [
        { _id: '1', date: new Date().toISOString(), reason: 'Promotion', student: { _id: 's1' }, from: { section: 1 }, to: { section: 2 } },
        { _id: '2', date: new Date().toISOString(), reason: 'Graduation', student: { _id: 's2' }, fromGradeSection: { _id: 'x' }, toGradeSection: null },
      ],
      meta: { page: 1, limit: 10, total: 2, totalPages: 1 },
    });

    expect(calls).toHaveLength(1);
    expect(calls[0].success).toBe(true);
    expect(calls[0].data[0].reason).toBe('ترقية');
    expect(calls[0].data[1].reason).toBe('تخرج');
  });
});
