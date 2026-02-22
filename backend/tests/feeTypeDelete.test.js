import { describe, expect, test, beforeEach, afterEach, jest } from '@jest/globals';

import * as FeeTypeModel from '../models/FeeType.js';
import * as FinanceCategory from '../models/FinanceCategory.js';
import * as FeeInvoice from '../models/FeeInvoice.js';
import { deleteFeeType } from '../controllers/financeControl/financeConfigController.js';

// Minimal mock response helpers
const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('deleteFeeType controller', () => {
  let findByIdSpy;
  let categoryExistsSpy;
  let invoiceExistsSpy;

  beforeEach(() => {
    findByIdSpy = jest.spyOn(FeeTypeModel.default, 'findById');
    categoryExistsSpy = jest.spyOn(FinanceCategory.default, 'exists');
    invoiceExistsSpy = jest.spyOn(FeeInvoice.default, 'exists');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('returns 400 FEE_TYPE_IN_USE when referenced by category', async () => {
    const req = { params: { id: '507f1f77bcf86cd799439011' }, user: { _id: 'u1' }, headers: {}, ip: '127.0.0.1' };
    const res = mockRes();

    findByIdSpy.mockImplementation(() => ({ lean: async () => ({ _id: '507f1f77bcf86cd799439011', code: 'test', name: 'Test' }) }));
    categoryExistsSpy.mockResolvedValue(true);
    invoiceExistsSpy.mockResolvedValue(false);

    await deleteFeeType(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: 'FEE_TYPE_IN_USE' }));
  });

  test('returns 400 FEE_TYPE_IN_USE when referenced by invoice discounts', async () => {
    const req = { params: { id: '507f1f77bcf86cd799439012' }, user: { _id: 'u1' }, headers: {}, ip: '127.0.0.1' };
    const res = mockRes();

    findByIdSpy.mockImplementation(() => ({ lean: async () => ({ _id: '507f1f77bcf86cd799439012', code: 'discount', name: 'Discount' }) }));
    categoryExistsSpy.mockResolvedValue(false);
    invoiceExistsSpy.mockResolvedValue(true);

    await deleteFeeType(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: 'FEE_TYPE_IN_USE' }));
  });
});
