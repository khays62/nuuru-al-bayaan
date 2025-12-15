// import express from "express";
// import { createUser, getUsers, updateUser, deleteUser, toggleUserStatus } from "../controllers/userController.js";

// const router = express.Router();

// router.post("/", createUser);       // Create
// router.get("/", getUsers);          // Read
// router.put("/:id", updateUser);     // Update
// router.delete("/:id", deleteUser);  // Delete

// // router.patch("/:id/status", toggleUserStatus);
// router.patch("/:id/toggle", toggleUserStatus);

// export default router;

// import express from "express";
// import {
//   getUsers,
//   createUser,
//   updateUser,
//   deleteUser,
//   toggleUserStatus
// } from "../controllers/userController.js";

// const router = express.Router();

// router.get("/users", getUsers);
// router.post("/users", createUser);
// router.put("/users/:id", updateUser);          // ✅ REQUIRED
// router.delete("/users/:id", deleteUser);
// router.patch("/users/:id/status", toggleUserStatus);

// export default router;


// routes/userRoutes.js
import express from "express";
import {
  createUser,
  getUsers,
  updateUser,
  deleteUser,
  toggleUserStatus,
  getUserById
} from "../controllersss/userController.js";

const router = express.Router();

router.post("/users", createUser);
router.get("/users", getUsers);
router.put("/users/:id", updateUser);
router.delete("/users/:id", deleteUser);
router.patch("/users/:id/toggle", toggleUserStatus); // ✅ matches frontend call now
router.get("/users/:id", getUserById);

export default router;
