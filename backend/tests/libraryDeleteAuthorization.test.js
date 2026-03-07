import { beforeAll, afterAll, afterEach, describe, expect, test } from '@jest/globals';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

import LibraryResource from '../models/LibraryResource.js';
import { deleteLibraryResource } from '../controllers/libraryController.js';

function mockRes() {
  return {
    statusCode: 200,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(obj) { this.body = obj; return this; },
  };
}

describe('library delete authorization', () => {
  let mongod;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();
    await mongoose.connect(uri, { dbName: 'testdb' });
  });

  afterEach(async () => {
    await LibraryResource.deleteMany({});
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongod.stop();
  });

  test('teacher cannot delete other users resources', async () => {
    const ownerId = new mongoose.Types.ObjectId();
    const teacherId = new mongoose.Types.ObjectId();

    const doc = await LibraryResource.create({
      title: 'Public Link',
      kind: 'link',
      linkUrl: 'https://example.com',
      createdById: ownerId,
      createdByRole: 'staff',
      createdByName: 'Someone',
    });

    const req = { params: { id: String(doc._id) }, user: { _id: teacherId, role: 'teacher' } };
    const res = mockRes();

    await deleteLibraryResource(req, res);

    expect(res.statusCode).toBe(403);
    expect(String(res.body?.message || '')).toMatch(/only delete resources you uploaded/i);
    expect(await LibraryResource.countDocuments({})).toBe(1);
  });

  test('teacher can delete own resources', async () => {
    const teacherId = new mongoose.Types.ObjectId();

    const doc = await LibraryResource.create({
      title: 'Teacher Link',
      kind: 'link',
      linkUrl: 'https://example.com',
      createdById: teacherId,
      createdByRole: 'teacher',
      createdByName: 'Teacher',
    });

    const req = { params: { id: String(doc._id) }, user: { _id: teacherId, role: 'teacher' } };
    const res = mockRes();

    await deleteLibraryResource(req, res);

    expect(res.statusCode).toBe(200);
    expect(await LibraryResource.countDocuments({})).toBe(0);
  });

  test('staff can delete own resources (controller-level check)', async () => {
    const staffId = new mongoose.Types.ObjectId();
    const ownerId = new mongoose.Types.ObjectId();

    const doc = await LibraryResource.create({
      title: 'Other Link',
      kind: 'link',
      linkUrl: 'https://example.com',
      createdById: ownerId,
      createdByRole: 'teacher',
      createdByName: 'Other',
    });

    const req = { params: { id: String(doc._id) }, user: { _id: staffId, role: 'staff' } };
    const res = mockRes();

    await deleteLibraryResource(req, res);

    expect(res.statusCode).toBe(200);
    expect(await LibraryResource.countDocuments({})).toBe(0);
  });

  test('admin can delete any resources', async () => {
    const ownerId = new mongoose.Types.ObjectId();
    const adminId = new mongoose.Types.ObjectId();

    const doc = await LibraryResource.create({
      title: 'Any Link',
      kind: 'link',
      linkUrl: 'https://example.com',
      createdById: ownerId,
      createdByRole: 'teacher',
      createdByName: 'Other',
    });

    const req = { params: { id: String(doc._id) }, user: { _id: adminId, role: 'admin' } };
    const res = mockRes();

    await deleteLibraryResource(req, res);

    expect(res.statusCode).toBe(200);
    expect(await LibraryResource.countDocuments({})).toBe(0);
  });
});
