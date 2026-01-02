import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import chalk from 'chalk';
import cookieParser from 'cookie-parser';
import connectDB from './config/db.js';
import { ensureIndexes } from './utils/indexMaintenance.js';
// import seedDatabase from './utils/seeder.js'; // Import the seeder function

// Import routes
import lookupRoutes from './routes/lookupRoutes.js';
import studentRoutes from './routes/studentRoutes.js';
import subjectRoutes from './routes/subjectRoutes.js';
import gradeSectionRoutes from './routes/gradeSectionRoutes.js';
import examRoutes from './routes/examRoutes.js';
import cohortRoutes from './routes/cohortRoutes.js';
import promotionRoutes from './routes/promotionRoutes.js';
import transferRoutes from './routes/transferRoutes.js';
import transcriptRoutes from './routes/transcriptRoutes.js';
import teacherRoutes from './routes/teacherRoutes.js';
import attendanceRoutes from './routes/attendanceRoutes.js';
import timetableRoutes from './routes/timetableRoutes.js';
import announcementRoutes from './routes/announcementRoutes.js';

// Auth + User Management routes
import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';


dotenv.config();

// Connect to the database and then seed it
const startServer = async () => {
  await connectDB();
  await ensureIndexes();
    // After connecting, run the seeder to ensure initial data exists.
    // await seedDatabase();

    const app = express();

    const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:5173';
    app.use(cors({ origin: corsOrigin, credentials: true }));
    app.use(express.json());
    app.use(cookieParser());

    // Handle invalid JSON bodies gracefully (avoids server crashes on bad requests)
    app.use((err, req, res, next) => {
      if (err instanceof SyntaxError && 'body' in err) {
        return res.status(400).json({ success: false, message: 'Invalid JSON body' });
      }
      return next(err);
    });

    // Routes
    app.get('/', (req, res) => res.send('API is running...'));
    app.use('/api/auth', authRoutes);
    app.use('/api/lookups', lookupRoutes);
    app.use('/api/students', studentRoutes);
    app.use('/api/subjects', subjectRoutes);
    // legacy /api/classes removed
    app.use('/api/grades', gradeSectionRoutes);
    app.use('/api/exams', examRoutes);
    app.use('/api/cohorts', cohortRoutes);
    app.use('/api/promotions', promotionRoutes);
    app.use('/api/transfers', transferRoutes);
    app.use('/api/transcripts', transcriptRoutes);
    app.use('/api/teachers', teacherRoutes);
    app.use('/api/attendance', attendanceRoutes);
    app.use('/api/timetable', timetableRoutes);
    app.use('/api/announcements', announcementRoutes);

    // User management (admin-only). Keep this mounted after all other /api routers
    // so its router-level auth middleware doesn't block unrelated endpoints.
    app.use('/api', userRoutes);


    const PORT = process.env.PORT || 7000;
    app.listen(PORT, () => {
      console.log(`${chalk.green.bold('Server')} is running on port ${PORT}`);
    });
};

startServer();

