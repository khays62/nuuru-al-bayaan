// routes/auth.js
import express from "express";
import { login, logout, verifyUser, resetLoginLockout} from "../controllers/authController.js";

const router = express.Router();

router.post("/login", login);
router.get("/verify", verifyUser);
router.post("/logout", logout);
// router.patch("/:id/reset-lockout", resetLoginLockout);
router.patch("/users/:id/reset-lockout", resetLoginLockout);

export default router;
