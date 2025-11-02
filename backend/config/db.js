import mongoose from "mongoose";

import { dbURL } from "./config.js";
import chalk from "chalk";

const connectDB = async () => {
  try {
    await mongoose.connect(dbURL, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log(`Connected to the database at ${chalk.green(dbURL)}`);

  } catch (error) {
    console.error("MongoDB connection failed:", error);
    process.exit(1);
  }
};

export default connectDB;
