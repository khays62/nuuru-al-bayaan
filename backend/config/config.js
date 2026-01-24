import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// Load env variables reliably regardless of the working directory.
// Priority:
// 1) backend/.env (recommended)
// 2) repo-root .env (fallback for some setups)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const backendEnvPath = path.resolve(__dirname, "..", ".env");
dotenv.config({ path: backendEnvPath });

if (!process.env.MONG_URL && !process.env.JWT_SECRET) {
	const rootEnvPath = path.resolve(__dirname, "..", "..", ".env");
	dotenv.config({ path: rootEnvPath });
}

export const port = process.env.PORT;
export const dbURL = process.env.MONG_URL;