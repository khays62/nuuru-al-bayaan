import mongoose from "mongoose";

import { dbURL } from "./config.js";
import chalk from "chalk";

const connectDB = async () => {
  const tryConnect = async (uri, label) => {
    await mongoose.connect(uri);
    console.log(`Connected to the database at ${chalk.green(label || uri)}`);
  };
  try {
    await tryConnect(dbURL, dbURL);
  } catch (error) {
    // Handle common SRV DNS failures gracefully with a local fallback
    const isSrv = typeof dbURL === 'string' && dbURL.includes('mongodb+srv://');
    const looksDnsError = String(error?.code).toUpperCase() === 'EREFUSED' || /querySrv/i.test(String(error?.message || ''));
    const fallback = process.env.LOCAL_MONG_URL || 'mongodb://127.0.0.1:27017/nuuru';
    if (isSrv && looksDnsError) {
      console.warn(chalk.yellow(`[DB] SRV lookup failed (${error?.code || 'ERR'}). Trying local fallback → ${fallback}`));
      try {
        await tryConnect(fallback, 'LOCAL_MONG_URL');
        return;
      } catch (e2) {
        console.error('MongoDB fallback connection failed:', e2);
      }
    }
    console.error('MongoDB connection failed:', error);
    process.exit(1);
  }
};

export default connectDB;
