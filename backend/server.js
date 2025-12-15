// import express from 'express';
// import cors from 'cors';
// import dotenv from 'dotenv';
// import chalk from 'chalk';
// import connectDB from './config/db.js';
// import { ensureIndexes } from './utils/indexMaintenance.js';
// // import seedDatabase from './utils/seeder.js'; // Import the seeder function

// // Import routes
// import lookupRoutes from './routes/lookupRoutes.js';
// import studentRoutes from './routes/studentRoutes.js';
// import subjectRoutes from './routes/subjectRoutes.js';
// import gradeSectionRoutes from './routes/gradeSectionRoutes.js';
// import examRoutes from './routes/examRoutes.js';
// import cohortRoutes from './routes/cohortRoutes.js';
// import promotionRoutes from './routes/promotionRoutes.js';
// import transferRoutes from './routes/transferRoutes.js';
// import transcriptRoutes from './routes/transcriptRoutes.js';


// dotenv.config();

// // Connect to the database and then seed it
// const startServer = async () => {
//   await connectDB();
//   await ensureIndexes();
//     // After connecting, run the seeder to ensure initial data exists.
//     // await seedDatabase();

//     const app = express();

//     app.use(cors());
//     app.use(express.json());

//     // Routes
//     app.get('/', (req, res) => res.send('API is running...'));
//     app.use('/api/lookups', lookupRoutes);
//     app.use('/api/students', studentRoutes);
//     app.use('/api/subjects', subjectRoutes);
//     // legacy /api/classes removed
//     app.use('/api/grades', gradeSectionRoutes);
//     app.use('/api/exams', examRoutes);
//     app.use('/api/cohorts', cohortRoutes);
//     app.use('/api/promotions', promotionRoutes);
//     app.use('/api/transfers', transferRoutes);
//     app.use('/api/transcripts', transcriptRoutes);


//     const PORT = process.env.PORT || 7000;
//     app.listen(PORT, () => {
//       console.log(`${chalk.green.bold('Server')} is running on port ${PORT}`);
//     });
// };

// startServer();



import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import chalk from "chalk";
import cookieParser from "cookie-parser";
import connectDB from "./config/db.js";
import { ensureIndexes } from "./utils/indexMaintenance.js";

// Routes
import userRoutes from "./routesss/userRoutes.js";
import lookupRoutes from "./routesss/lookupRoutes.js";
import studentRoutes from "./routesss/studentRoutes.js";
import subjectRoutes from "./routesss/subjectRoutes.js";
import gradeSectionRoutes from "./routesss/gradeSectionRoutes.js";
import authRoutes from "./routesss/authRoutes.js";
import announcementRoutes from "./routes/announcementRoutes.js";
import examRoutes from "./routesss/examRoutes.js";
import cohortRoutes from "./routesss/cohortRoutes.js";
// import auditRoutes from "./routes/auditRoutes.js";
import promotionRoutes from "./routesss/promotionRoutes.js";
import transcriptRoutes from "./routesss/transcriptRoutes.js";
dotenv.config();

const startServer = async () => {
  await connectDB();
  await ensureIndexes();

  const app = express();

  // Middleware
  app.use(
    cors({
      origin: "http://localhost:5173", // frontend URL
      credentials: true,
    })
  );
  app.use(express.json());
  app.use(cookieParser());

  // Routes
  app.get("/", (req, res) => res.send("API is running..."));
  app.use("/api/auth", authRoutes);
  app.use("/api/lookups", lookupRoutes);
  app.use("/api/students", studentRoutes);
  app.use("/api/subjects", subjectRoutes);
  app.use("/api/grades", gradeSectionRoutes);
  app.use("/api/exams", examRoutes);
  app.use("/api/cohorts", cohortRoutes);
  app.use("/api/announcements", announcementRoutes);
  app.use("/api", userRoutes);
  // app.use("/api/users", auditRoutes);
  app.use('/api/promotions', promotionRoutes);
  app.use('/api/transcripts', transcriptRoutes);



  const PORT = process.env.PORT || 7000;
  app.listen(PORT, () => {
    console.log(`${chalk.green.bold("✅ Server")} running on port ${PORT}`);
  });
};

startServer();
