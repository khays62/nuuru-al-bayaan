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
  changePasswordStudent,
} from "../controllers/studentController.js";

import { protect, authorizeRoles } from "../middleware/authMiddleware.js";
import { checkAnyPermission, checkPermission } from "../middleware/checkPermission.js";

const router = express.Router();

const canReadStudents = checkAnyPermission([
  { module: "students", action: "view" },
  { module: "students", action: "add" },
  { module: "students", action: "edit" },
  { module: "students", action: "delete" },
  { module: "students", action: "transfer" },
  { module: "students", action: "deactivate" },
  { module: "students", action: "reactivate" },
  { module: "students", action: "download" }
]);

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
    canReadStudents,
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
router.put(
  "/change-password",
  protect,
  authorizeRoles("student"),
  changePasswordStudent
);

router.get(
  "/:id",
  protect,
  canReadStudents,
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
  canReadStudents,
  getStudentHistory
);

// ==========================
// TRANSFERS
// ==========================
router.get(
  "/:id/transfers",
  protect,
  canReadStudents,
  getStudentTransfers
);

router.get(
  "/:id/latest-transfer",
  protect,
  canReadStudents,
  getLatestTransfer
);

// ==========================
// TRANSCRIPT
// ==========================
router.get(
  "/:id/full-transcript",
  protect,
  canReadStudents,
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
