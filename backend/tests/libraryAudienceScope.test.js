import { beforeAll, afterAll, afterEach, describe, expect, test } from '@jest/globals';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

import Grade from '../models/Grade.js';
import Subject from '../models/Subject.js';
import GradeSection from '../models/GradeSection.js';
import Teacher from '../models/Teacher.js';
import TeacherAssignment from '../models/TeacherAssignment.js';
import Student from '../models/Student.js';
import Enrollment from '../models/Enrollment.js';
import LibraryResource from '../models/LibraryResource.js';

import { createLibraryResource, listLibraryResources } from '../controllers/libraryController.js';

function mockRes() {
  return {
    statusCode: 200,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(obj) { this.body = obj; return this; },
  };
}

describe('library audience scoping (public vs level)', () => {
  let mongod;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();
    await mongoose.connect(uri, { dbName: 'testdb' });
  });

  afterEach(async () => {
    await Promise.all([
      Grade.deleteMany({}),
      Subject.deleteMany({}),
      GradeSection.deleteMany({}),
      Teacher.deleteMany({}),
      TeacherAssignment.deleteMany({}),
      Student.deleteMany({}),
      Enrollment.deleteMany({}),
      LibraryResource.deleteMany({}),
    ]);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongod.stop();
  });

  test('teacher can create public resources without grade/subject', async () => {
    const teacherProfile = await Teacher.create({ fullName: 'T1', teacherId: 'T001' });
    const req = {
      body: {
        title: 'Public Link',
        kind: 'link',
        audience: 'public',
        linkUrl: 'https://example.com',
      },
      user: {
        _id: new mongoose.Types.ObjectId(),
        role: 'teacher',
        teacherRef: teacherProfile._id,
      },
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
    const grade = await Grade.create({ gradeName: 'Grade 3', order: 3 });
    const subject = await Subject.create({ subjectName: 'Math', subjectCode: 'MATH101', grades: [grade._id] });
    const gs = await GradeSection.create({ grade: grade._id, shift: new mongoose.Types.ObjectId(), section: 'A' });

    const teacherProfile = await Teacher.create({ fullName: 'T1', teacherId: 'T001' });
    await TeacherAssignment.create({ teacher: teacherProfile._id, gradeSection: gs._id, subject: subject._id, role: 'main' });

    const req = {
      body: {
        title: 'Level Link',
        kind: 'link',
        audience: 'level',
        gradeId: String(grade._id),
        subjectId: String(subject._id),
        linkUrl: 'https://example.com',
      },
      user: {
        _id: new mongoose.Types.ObjectId(),
        role: 'teacher',
        teacherRef: teacherProfile._id,
      },
    };
    const res = mockRes();

    await createLibraryResource(req, res);

    expect(res.statusCode).toBe(201);
    expect(res.body?.success).toBe(true);
    expect(String(res.body?.data?.audience || '')).toBe('level');
    expect(String(res.body?.data?.grade || '')).toBe(String(grade._id));
    expect(String(res.body?.data?.subject || '')).toBe(String(subject._id));
  });

  test('teacher cannot create level resources for unassigned grade', async () => {
    const gradeA = await Grade.create({ gradeName: 'Grade 3', order: 3 });
    const gradeB = await Grade.create({ gradeName: 'Grade 4', order: 4 });

    const subjectA = await Subject.create({ subjectName: 'Math', subjectCode: 'MATH101', grades: [gradeA._id] });
    const subjectB = await Subject.create({ subjectName: 'Science', subjectCode: 'SCI101', grades: [gradeB._id] });

    const gsA = await GradeSection.create({ grade: gradeA._id, shift: new mongoose.Types.ObjectId(), section: 'A' });

    const teacherProfile = await Teacher.create({ fullName: 'T1', teacherId: 'T001' });
    await TeacherAssignment.create({ teacher: teacherProfile._id, gradeSection: gsA._id, subject: subjectA._id, role: 'main' });

    const req = {
      body: {
        title: 'Wrong Level Link',
        kind: 'link',
        audience: 'level',
        gradeId: String(gradeB._id),
        subjectId: String(subjectB._id),
        linkUrl: 'https://example.com',
      },
      user: {
        _id: new mongoose.Types.ObjectId(),
        role: 'teacher',
        teacherRef: teacherProfile._id,
      },
    };
    const res = mockRes();

    await createLibraryResource(req, res);

    expect(res.statusCode).toBe(403);
    expect(String(res.body?.message || '')).toMatch(/not assigned/i);
  });

  test('level resources require subject that belongs to selected grade', async () => {
    const gradeA = await Grade.create({ gradeName: 'Grade 3', order: 3 });
    const gradeB = await Grade.create({ gradeName: 'Grade 4', order: 4 });

    const subjectOnlyB = await Subject.create({ subjectName: 'Science', subjectCode: 'SCI101', grades: [gradeB._id] });

    const gsA = await GradeSection.create({ grade: gradeA._id, shift: new mongoose.Types.ObjectId(), section: 'A' });

    const teacherProfile = await Teacher.create({ fullName: 'T1', teacherId: 'T001' });
    // Assign teacher to gradeA so only the subject-grade mismatch is tested.
    await TeacherAssignment.create({ teacher: teacherProfile._id, gradeSection: gsA._id, subject: subjectOnlyB._id, role: 'main' });

    const req = {
      body: {
        title: 'Mismatch Subject',
        kind: 'link',
        audience: 'level',
        gradeId: String(gradeA._id),
        subjectId: String(subjectOnlyB._id),
        linkUrl: 'https://example.com',
      },
      user: {
        _id: new mongoose.Types.ObjectId(),
        role: 'teacher',
        teacherRef: teacherProfile._id,
      },
    };
    const res = mockRes();

    await createLibraryResource(req, res);

    expect(res.statusCode).toBe(400);
    expect(String(res.body?.message || '')).toMatch(/subject is not valid/i);
  });

  test('list endpoint filters visibility for student and teacher (public + own level only)', async () => {
    const gradeA = await Grade.create({ gradeName: 'Grade 3', order: 3 });
    const gradeB = await Grade.create({ gradeName: 'Grade 4', order: 4 });

    const subjectA = await Subject.create({ subjectName: 'Math', subjectCode: 'MATH101', grades: [gradeA._id] });
    const subjectB = await Subject.create({ subjectName: 'Science', subjectCode: 'SCI101', grades: [gradeB._id] });

    await LibraryResource.create({
      title: 'Public',
      kind: 'link',
      linkUrl: 'https://example.com',
      audience: 'public',
    });
    await LibraryResource.create({
      title: 'Level A',
      kind: 'link',
      linkUrl: 'https://example.com/a',
      audience: 'level',
      grade: gradeA._id,
      subject: subjectA._id,
    });
    await LibraryResource.create({
      title: 'Level B',
      kind: 'link',
      linkUrl: 'https://example.com/b',
      audience: 'level',
      grade: gradeB._id,
      subject: subjectB._id,
    });

    // Student enrolled in gradeA
    const studentProfile = await Student.create({
      fullName: 'S1',
      motherName: 'M',
      gender: 'Male',
      dob: new Date('2010-01-01'),
      guardianName: 'G',
      contactNumber: '000',
      admissionDate: new Date('2020-01-01'),
      password: 'pw',
    });
    await Enrollment.create({
      student: studentProfile._id,
      gradeSection: new mongoose.Types.ObjectId(),
      academicYear: new mongoose.Types.ObjectId(),
      grade: gradeA._id,
      shift: new mongoose.Types.ObjectId(),
      status: 'active',
      joinedAt: new Date(),
    });

    const studentReq = { query: { limit: 50, page: 1 }, user: { role: 'student', studentRef: studentProfile._id } };
    const studentRes = mockRes();
    await listLibraryResources(studentReq, studentRes);

    expect(studentRes.statusCode).toBe(200);
    const studentTitles = (studentRes.body?.data || []).map((r) => r.title).sort();
    expect(studentTitles).toEqual(['Level A', 'Public']);

    // Teacher assigned to gradeA
    const gsA = await GradeSection.create({ grade: gradeA._id, shift: new mongoose.Types.ObjectId(), section: 'A' });
    const teacherProfile = await Teacher.create({ fullName: 'T1', teacherId: 'T001' });
    await TeacherAssignment.create({ teacher: teacherProfile._id, gradeSection: gsA._id, subject: subjectA._id, role: 'main' });

    const teacherReq = { query: { limit: 50, page: 1 }, user: { role: 'teacher', teacherRef: teacherProfile._id } };
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
