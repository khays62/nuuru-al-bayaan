import connectDB from '../config/db.js';
import { getFullTranscript } from '../controllers/transcriptController.js';

const studentId = process.argv[2];
if (!studentId) {
  console.error('Usage: node scripts/smokeFullTranscript.js <studentId>');
  process.exit(2);
}

await connectDB();

const req = { params: { id: studentId } };
const res = {
  statusCode: 200,
  status(code) {
    this.statusCode = code;
    return this;
  },
  json(payload) {
    console.log('STATUS', this.statusCode);
    if (!payload || typeof payload !== 'object') {
      console.log(String(payload));
      return;
    }

    const student = payload.student;
    const enrollments = Array.isArray(payload.enrollments) ? payload.enrollments : [];
    const transfers = Array.isArray(payload.transfers) ? payload.transfers : [];

    console.log(
      JSON.stringify({
        student: student ? { _id: student._id, studentId: student.studentId, fullName: student.fullName } : null,
        enrollmentsCount: enrollments.length,
        transfersCount: transfers.length,
        summary: payload.summary || null,
      })
    );
  },
};

await getFullTranscript(req, res);
process.exit(0);
