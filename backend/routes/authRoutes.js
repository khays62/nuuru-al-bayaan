import express from "express";
import { login, logout, verifyUser, resetLoginLockout, changePassword, getCsrfToken } from "../controllers/authController.js";
import { protect, authorizeRoles } from "../middleware/authMiddleware.js";
import { z } from 'zod';
import { validate } from '../middleware/validate.js';

const router = express.Router();

router.post(
	"/login",
	validate({
		body: z
			.object({
				username: z.string().trim().min(1).max(128).optional(),
				studentId: z.string().trim().min(1).max(128).optional(),
				password: z.string().min(1).max(256),
			})
			.refine((v) => Boolean(v.username || v.studentId), { message: 'username or studentId is required' })
			.strip(),
	}),
	login
);
router.get('/csrf', getCsrfToken);
router.get("/verify", verifyUser);
router.post("/logout", logout);
router.post(
	'/change-password',
	protect,
	validate({
		body: z
			.object({
				currentPassword: z.string().max(256).optional(),
				newPassword: z.string().trim().min(6).max(256),
			})
			.strip(),
	}),
	changePassword
);
router.patch("/users/:id/reset-lockout", protect, authorizeRoles('admin'), resetLoginLockout);

export default router;
