// import express from "express";
// import {
//   createAnnouncement,
//   getAnnouncements,
//   deleteAnnouncement,
// } from "../controllers/announcementController.js";
// import { protect } from "../middleware/authMiddleware.js"; // optional if you have login

// const router = express.Router();

// router.post("/", protect, createAnnouncement); // admin creates
// router.get("/", protect, getAnnouncements); // everyone can read
// router.delete("/:id", protect, deleteAnnouncement);

// export default router;

// import express from "express";
// import { createAnnouncement, getAnnouncements } from "../controllers/announcementController.js";
// import { protect } from "../middleware/authMiddleware.js";

// const router = express.Router();

// router.get("/", getAnnouncements);
// router.post("/", protect, createAnnouncement);

// export default router;

// import express from "express";
// import { createAnnouncement, getAnnouncements } from "../controllers/announcementController.js";
// import { protect } from "../middleware/authMiddleware.js";

// const router = express.Router();

// // 🟢 Anyone (even not admin) can view announcements
// router.get("/", getAnnouncements);

// // 🔒 Only logged-in users (admin or teacher) can post
// router.post("/", protect, createAnnouncement);

// export default router;


// import express from "express";
// import {
//   createAnnouncement,
//   getAnnouncements,
//   updateAnnouncement,
//   deleteAnnouncement,
// } from "../controllers/announcementController.js";
// import { protect } from "../middleware/authMiddleware.js";

// const router = express.Router();

// // Public
// router.get("/", getAnnouncements);

// // Protected
// router.post("/", protect, createAnnouncement);
// router.put("/:id", protect, updateAnnouncement);
// router.delete("/:id", protect, deleteAnnouncement);

// export default router;


// import express from "express";
// import {
//   createAnnouncement,
//   getAnnouncements,
//   updateAnnouncement,
//   deleteAnnouncement,
// } from "../controllers/announcementController.js";
// import { protect } from "../middleware/authMiddleware.js";

// const router = express.Router();

// // Public route
// router.get("/", getAnnouncements);

// // Protected CRUD routes
// router.post("/", protect, createAnnouncement);
// router.put("/:id", protect, updateAnnouncement);
// router.delete("/:id", protect, deleteAnnouncement);

// export default router;



// import express from "express";
// import {
//   createAnnouncement,
//   getAnnouncements,
//   updateAnnouncement,
//   deleteAnnouncement,
// } from "../controllers/announcementController.js";
// import { protect } from "../middleware/authMiddleware.js";

// const router = express.Router();

// router.get("/", getAnnouncements);
// router.post("/", protect, createAnnouncement);
// router.put("/:id", protect, updateAnnouncement);
// router.delete("/:id", protect, deleteAnnouncement);

// export default router;


import express from "express";
import {
  createAnnouncement,
  getAnnouncements,
  updateAnnouncement,
  deleteAnnouncement,
} from "../controllers/announcementController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// Auth required for create/update/delete
router.route("/")
  .get(getAnnouncements)
  .post(protect, createAnnouncement);

router.route("/:id")
  .put(protect, updateAnnouncement)
  .delete(protect, deleteAnnouncement);

export default router;
