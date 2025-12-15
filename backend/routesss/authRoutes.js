// import express from "express";
// // import { login } from "../controllers/authController.js";

// import { login } from "../controllers/authController.js";

// const router = express.Router();

// // router.post("/login", login);

// router.post("/login", login);
// // router.get("/me", me);
// // router.post("/logout", logout);

// export default router;


// routes/auth.js
import express from "express";
import { login, logout, verifyUser, resetLoginLockout} from "../controllersss/authController.js";

const router = express.Router();

router.post("/login", login);
router.get("/verify", verifyUser);
router.post("/logout", logout);
// router.patch("/:id/reset-lockout", resetLoginLockout);
router.patch("/users/:id/reset-lockout", resetLoginLockout);

export default router;
