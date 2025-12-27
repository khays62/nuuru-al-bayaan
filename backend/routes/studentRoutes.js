// import express from 'express';
// import { getStudents, addStudent, getStudentProfile, getStudentHistory, getStudentTransfers, deactivateStudent, reactivateStudent, updateStudent, transferEnrollment, getFullTranscript, getLatestTransfer, setEnrollmentActiveFlag } from '../controllers/studentController.js';

// const router = express.Router();

// // Waxaan habaynaynaa routes-ka
// router.route('/')
//     .get(getStudents)   // Marka la sameeyo GET /api/students
//     .post(addStudent);  // Marka la sameeyo POST /api/students

// // Profile + History
// router.get('/:id', getStudentProfile); // GET /api/students/:id
// router.patch('/:id', updateStudent); // PATCH /api/students/:id (update basic fields)
// router.get('/:id/history', getStudentHistory); // GET /api/students/:id/history
// router.get('/:id/transfers', getStudentTransfers); // GET /api/students/:id/transfers
// router.get('/:id/latest-transfer', getLatestTransfer); // GET /api/students/:id/latest-transfer
// router.get('/:id/full-transcript', getFullTranscript); // GET /api/students/:id/full-transcript
// router.patch('/:id/deactivate', deactivateStudent); // PATCH /api/students/:id/deactivate
// router.patch('/:id/reactivate', reactivateStudent); // PATCH /api/students/:id/reactivate
// // New transfer endpoint
// router.patch('/:id/enrollment/transfer', transferEnrollment); // PATCH /api/students/:id/enrollment/transfer
// // Toggle latest enrollment active/inactive (temporary lock)
// router.patch('/:id/enrollment/active', setEnrollmentActiveFlag);
// // Backward compatibility: temporarily support old path by calling transfer handler
// router.patch('/:id/enrollment/reassign', transferEnrollment);


// export default router;


import express from "express";
import {
  getStudents,
  addStudent,
  getStudentProfile,
  getStudentHistory,
  getStudentTransfers,
  deactivateStudent,
  reactivateStudent,
  updateStudent,
  transferEnrollment,
  getFullTranscript,
  getLatestTransfer,
  setEnrollmentActiveFlag,
  getMyResults, // <-- Add this
  exportStudentsCsvController,
} from "../controllers/studentController.js";

import { protect, authorizeRoles } from "../middleware/authMiddleware.js";
import { checkPermission } from "../middleware/checkPermission.js";

const router = express.Router();

// router.route("/", protect, checkPermission("students", "add")).get(getStudents).post(addStudent);
// router
//   .route("/")
//   .get( getStudents)
//   .post(protect, checkPermission("students", "add"), addStudent);

// router.get("/:id", getStudentProfile);
// router.patch("/:id", protect, checkPermission("students", "edit"), updateStudent);
// router.get("/:id/history", getStudentHistory);
// router.get("/:id/transfers", getStudentTransfers);
// router.get("/:id/latest-transfer", getLatestTransfer);
// router.get("/:id/full-transcript", getFullTranscript);
// router.patch("/:id/deactivate", deactivateStudent);
// router.patch("/:id/reactivate", reactivateStudent);
// router.patch("/:id/enrollment/transfer", transferEnrollment);
// router.patch("/:id/enrollment/active", setEnrollmentActiveFlag);
// router.patch("/:id/enrollment/reassign", transferEnrollment);

router
  .route("/")
  .get(
    protect,
    checkPermission("students", "view"),
    getStudents
  )
  .post(
    protect,
    checkPermission("students", "add"),
    addStudent
  );

  router.get(
    "/export",
    protect,
    checkPermission("students", "download"),
    exportStudentsCsvController
  );

// ==========================
// PROFILE
// ==========================
router.get(
  "/:id",
  protect,
  checkPermission("students", "view"),
  getStudentProfile
);

// ==========================
// UPDATE
// ==========================
router.patch(
  "/:id",
  protect,
  checkPermission("students", "edit"),
  updateStudent
);

// ==========================
// HISTORY
// ==========================
router.get(
  "/:id/history",
  protect,
  checkPermission("students", "view"),
  getStudentHistory
);

// ==========================
// TRANSFERS
// ==========================
router.get(
  "/:id/transfers",
  protect,
  checkPermission("students", "view"),
  getStudentTransfers
);

router.get(
  "/:id/latest-transfer",
  protect,
  checkPermission("students", "view"),
  getLatestTransfer
);

// ==========================
// TRANSCRIPT
// ==========================
router.get(
  "/:id/full-transcript",
  protect,
  checkPermission("students", "view"),
  getFullTranscript
);

// ==========================
// DEACTIVATE / REACTIVATE
// ==========================
router.patch(
  "/:id/deactivate",
  protect,
  checkPermission("students", "deactivate"),
  deactivateStudent
);

router.patch(
  "/:id/reactivate",
  protect,
  checkPermission("students", "reactivate"),
  reactivateStudent
);

// ==========================
// ENROLLMENT ACTIONS
// ==========================
router.patch(
  "/:id/enrollment/transfer",
  protect,
  checkPermission("students", "transfer"),
  transferEnrollment
);

router.patch(
  "/:id/enrollment/active",
  protect,
  checkPermission("students", "edit"),
  setEnrollmentActiveFlag
);

router.patch(
  "/:id/enrollment/reassign",
  protect,
  checkPermission("students", "transfer"),
  transferEnrollment
);

// router.post('/:id/payments', recordEnrollmentPayment);
// router.get('/student/:id/balance', getStudentBalance);


router
  .route("/student/:id/balance")
  .get(
    protect,
    checkPermission("students", "view"),
  
  )
  .post(
    protect,
    checkPermission("students", "add"),
  );






// ✅ NEW: student sees only their own results
router.get("/me/results", protect, authorizeRoles("student"), getMyResults);

export default router;
