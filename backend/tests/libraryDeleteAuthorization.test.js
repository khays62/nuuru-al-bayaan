import { afterEach, describe, expect, test, jest, beforeEach } from '@jest/globals';
import mongoose from 'mongoose';

import * as LibraryResourceModule from '../models/LibraryResource.js';
import { deleteLibraryResource } from '../controllers/libraryController.js';

function mockRes() {
  return {
    statusCode: 200,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(obj) { this.body = obj; return this; },
  };
}

function makeDoc({ id, createdById }) {
  return {
    _id: id,
    createdById,
    file: null,
    deleteOne: jest.fn().mockResolvedValue({}),
  };
}

describe('library delete authorization', () => {
  let findByIdSpy;

  beforeEach(() => {
    findByIdSpy = jest.spyOn(LibraryResourceModule.default, 'findById');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('teacher cannot delete other users resources', async () => {
    const ownerId = new mongoose.Types.ObjectId();
    const teacherId = new mongoose.Types.ObjectId();
    const docId = new mongoose.Types.ObjectId();

    findByIdSpy.mockResolvedValue(makeDoc({ id: docId, createdById: ownerId }));

    const req = { params: { id: String(docId) }, user: { _id: teacherId, role: 'teacher' } };
    const res = mockRes();

    await deleteLibraryResource(req, res);

    expect(res.statusCode).toBe(403);
    expect(String(res.body?.message || '')).toMatch(/only delete resources you uploaded/i);
  });

  test('teacher can delete own resources', async () => {
    const teacherId = new mongoose.Types.ObjectId();
    const docId = new mongoose.Types.ObjectId();

    const doc = makeDoc({ id: docId, createdById: teacherId });
    findByIdSpy.mockResolvedValue(doc);

    const req = { params: { id: String(docId) }, user: { _id: teacherId, role: 'teacher' } };
    const res = mockRes();

    await deleteLibraryResource(req, res);

    expect(res.statusCode).toBe(200);
    expect(doc.deleteOne).toHaveBeenCalled();
  });

  test('staff can delete any resource (controller-level check)', async () => {
    const staffId = new mongoose.Types.ObjectId();
    const ownerId = new mongoose.Types.ObjectId();
    const docId = new mongoose.Types.ObjectId();

    const doc = makeDoc({ id: docId, createdById: ownerId });
    findByIdSpy.mockResolvedValue(doc);

    const req = { params: { id: String(docId) }, user: { _id: staffId, role: 'staff' } };
    const res = mockRes();

    await deleteLibraryResource(req, res);

    expect(res.statusCode).toBe(200);
    expect(doc.deleteOne).toHaveBeenCalled();
  });

  test('admin can delete any resources', async () => {
    const ownerId = new mongoose.Types.ObjectId();
    const adminId = new mongoose.Types.ObjectId();
    const docId = new mongoose.Types.ObjectId();

    const doc = makeDoc({ id: docId, createdById: ownerId });
    findByIdSpy.mockResolvedValue(doc);

    const req = { params: { id: String(docId) }, user: { _id: adminId, role: 'admin' } };
    const res = mockRes();

    await deleteLibraryResource(req, res);

    expect(res.statusCode).toBe(200);
    expect(doc.deleteOne).toHaveBeenCalled();
  });
});


