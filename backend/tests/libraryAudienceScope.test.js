import { afterEach, beforeEach, describe, expect, test, jest } from '@jest/globals';
import mongoose from 'mongoose';

import * as LibraryResourceModule from '../models/LibraryResource.js';
import * as SubjectModule from '../models/Subject.js';
import * as EnrollmentModule from '../models/Enrollment.js';
import * as TeacherAssignmentModule from '../models/TeacherAssignment.js';
import { createLibraryResource, listLibraryResources } from '../controllers/libraryController.js';

function mockRes() {
  return {
    statusCode: 200,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(obj) { this.body = obj; return this; },
  };
}

/** Build a chainable query mock that resolves to `rows`. */
function makeQueryChain(rows) {
  const chain = {
    sort: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    populate: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    lean: jest.fn().mockResolvedValue(rows),
  };
  return chain;
}

describe('library audience scoping (public vs level)', () => {
  let findByIdSpy;
  let findOneSpy;
  let findSpy;
  let countSpy;
  let taFindSpy;
  let saveSpy;

  beforeEach(() => {
    findByIdSpy = jest.spyOn(SubjectModule.default, 'findById');
    findOneSpy = jest.spyOn(EnrollmentModule.default, 'findOne');
    findSpy = jest.spyOn(LibraryResourceModule.default, 'find');
    countSpy = jest.spyOn(LibraryResourceModule.default, 'countDocuments');
    taFindSpy = jest.spyOn(TeacherAssignmentModule.default, 'find');
    saveSpy = jest.spyOn(LibraryResourceModule.default.prototype, 'save');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('teacher can create public resources without grade/subject', async () => {
    const teacherId = new mongoose.Types.ObjectId();
    saveSpy.mockImplementation(async function () { this._id = new mongoose.Types.ObjectId(); return this; });

    const req = {
      body: { title: 'Public Link', kind: 'link', audience: 'public', linkUrl: 'https://example.com' },
      user: { _id: teacherId, role: 'teacher', teacherRef: new mongoose.Types.ObjectId() },
    };
    const res = mockRes();

    await createLibraryResource(req, res);

    expect(res.statusCode).toBe(201);
    expect(res.body?.success).toBe(true);
    expect(String(res.body?.data?.audience || '')).toBe('public');
    expect(res.body?.data?.grade ?? null).toBeNull();
    expect(res.body?.data?.subject ?? null).toBeNull();
  });

  test('teacher can create level resources only for assigned grade, with subject belonging to grade', async () => {
    const teacherId = new mongoose.Types.ObjectId();
    const teacherRef = new mongoose.Types.ObjectId();
    const gradeId = new mongoose.Types.ObjectId();
    const subjectId = new mongoose.Types.ObjectId();
    const gsId = new mongoose.Types.ObjectId();

    findByIdSpy.mockReturnValue(makeQueryChain({ grades: [gradeId] }));
    taFindSpy.mockReturnValue(makeQueryChain([{ gradeSection: { grade: gradeId } }]));
    saveSpy.mockImplementation(async function () { this._id = new mongoose.Types.ObjectId(); return this; });

    const req = {
      body: {
        title: 'Level Link',
        kind: 'link',
        audience: 'level',
        gradeId: String(gradeId),
        subjectId: String(subjectId),
        linkUrl: 'https://example.com',
      },
      user: { _id: teacherId, role: 'teacher', teacherRef },
    };
    const res = mockRes();

    await createLibraryResource(req, res);

    expect(res.statusCode).toBe(201);
    expect(res.body?.success).toBe(true);
    expect(String(res.body?.data?.audience || '')).toBe('level');
    void gsId; // referenced above for readability
  });

  test('teacher cannot create level resources for unassigned grade', async () => {
    const teacherId = new mongoose.Types.ObjectId();
    const teacherRef = new mongoose.Types.ObjectId();
    const gradeA = new mongoose.Types.ObjectId();
    const gradeB = new mongoose.Types.ObjectId();
    const subjectIdB = new mongoose.Types.ObjectId();

    // Subject belongs to gradeB
    findByIdSpy.mockReturnValue(makeQueryChain({ grades: [gradeB] }));
    // Teacher is assigned to gradeA only
    taFindSpy.mockReturnValue(makeQueryChain([{ gradeSection: { grade: gradeA } }]));

    const req = {
      body: {
        title: 'Wrong Level Link',
        kind: 'link',
        audience: 'level',
        gradeId: String(gradeB),
        subjectId: String(subjectIdB),
        linkUrl: 'https://example.com',
      },
      user: { _id: teacherId, role: 'teacher', teacherRef },
    };
    const res = mockRes();

    await createLibraryResource(req, res);

    expect(res.statusCode).toBe(403);
    expect(String(res.body?.message || '')).toMatch(/not assigned/i);
  });

  test('level resources require subject that belongs to selected grade', async () => {
    const teacherId = new mongoose.Types.ObjectId();
    const teacherRef = new mongoose.Types.ObjectId();
    const gradeA = new mongoose.Types.ObjectId();
    const gradeB = new mongoose.Types.ObjectId();
    const subjectOnlyB = new mongoose.Types.ObjectId();

    // Subject belongs only to gradeB, not gradeA
    findByIdSpy.mockReturnValue(makeQueryChain({ grades: [gradeB] }));
    // Teacher is assigned to gradeA (so they're authorized for gradeA)
    taFindSpy.mockReturnValue(makeQueryChain([{ gradeSection: { grade: gradeA } }]));

    const req = {
      body: {
        title: 'Mismatch Subject',
        kind: 'link',
        audience: 'level',
        gradeId: String(gradeA),
        subjectId: String(subjectOnlyB),
        linkUrl: 'https://example.com',
      },
      user: { _id: teacherId, role: 'teacher', teacherRef },
    };
    const res = mockRes();

    await createLibraryResource(req, res);

    expect(res.statusCode).toBe(400);
    expect(String(res.body?.message || '')).toMatch(/subject is not valid/i);
  });

  test('list endpoint filters visibility for student and teacher (public + own level only)', async () => {
    const gradeA = new mongoose.Types.ObjectId();
    const gradeB = new mongoose.Types.ObjectId();
    const subjectA = new mongoose.Types.ObjectId();
    const subjectB = new mongoose.Types.ObjectId();
    const studentRef = new mongoose.Types.ObjectId();
    const teacherRef = new mongoose.Types.ObjectId();

    const allResources = [
      { _id: new mongoose.Types.ObjectId(), title: 'Public', audience: 'public', grade: null, subject: null },
      { _id: new mongoose.Types.ObjectId(), title: 'Level A', audience: 'level', grade: gradeA, subject: subjectA },
      { _id: new mongoose.Types.ObjectId(), title: 'Level B', audience: 'level', grade: gradeB, subject: subjectB },
    ];

    // Student enrolled in gradeA
    findOneSpy.mockReturnValue(makeQueryChain({ grade: gradeA }));

    // First student request: filter public + level gradeA
    findSpy.mockImplementation((filter) => {
      const filtered = filterResources(filter, allResources);
      return makeQueryChain(filtered);
    });
    countSpy.mockImplementation((filter) => {
      return Promise.resolve(filterResources(filter, allResources).length);
    });

    const studentReq = { query: { limit: 50, page: 1 }, user: { role: 'student', studentRef } };
    const studentRes = mockRes();
    await listLibraryResources(studentReq, studentRes);

    expect(studentRes.statusCode).toBe(200);
    const studentTitles = (studentRes.body?.data || []).map((r) => r.title).sort();
    expect(studentTitles).toEqual(['Level A', 'Public']);

    // Teacher assigned to gradeA
    taFindSpy.mockReturnValue(makeQueryChain([{ gradeSection: { grade: gradeA } }]));

    const teacherReq = { query: { limit: 50, page: 1 }, user: { role: 'teacher', teacherRef } };
    const teacherRes = mockRes();
    await listLibraryResources(teacherReq, teacherRes);

    const teacherTitles = (teacherRes.body?.data || []).map((r) => r.title).sort();
    expect(teacherTitles).toEqual(['Level A', 'Public']);

    // Staff sees all
    const staffReq = { query: { limit: 50, page: 1 }, user: { role: 'staff' } };
    const staffRes = mockRes();
    await listLibraryResources(staffReq, staffRes);
    const staffTitles = (staffRes.body?.data || []).map((r) => r.title).sort();
    expect(staffTitles).toEqual(['Level A', 'Level B', 'Public']);
  });
});

/**
 * Simulate MongoDB audience filter logic on in-memory resources.
 * Mirrors the query the controller builds so tests remain accurate.
 */
function filterResources(filter, resources) {
  if (!filter || Object.keys(filter).length === 0) return resources;

  const and = filter.$and;
  if (!and) return resources;

  return resources.filter((r) => {
    return and.every((clause) => {
      if (!clause.$or) return true; // skip text clauses etc.
      return clause.$or.some((cond) => {
        if (cond.audience === 'public') return !r.audience || r.audience === 'public' || r.audience === '';
        if (cond.$or) {
          // nested public check inside the outer $or
          return cond.$or.some((inner) => matchCond(inner, r));
        }
        return matchCond(cond, r);
      });
    });
  });
}

function matchCond(cond, r) {
  if ('audience' in cond && cond.audience === 'public') return !r.audience || r.audience === 'public';
  if (cond.$or) return cond.$or.some((c) => matchCond(c, r));
  // level + grade match
  if (cond.audience === 'level' && cond.grade) {
    const gradeMatch = cond.grade?.$in
      ? cond.grade.$in.some((g) => String(g) === String(r.grade))
      : String(cond.grade) === String(r.grade);
    return r.audience === 'level' && gradeMatch;
  }
  if (cond.audience === undefined && (cond.$exists === false || cond === null)) return !r.audience;
  return false;
}

