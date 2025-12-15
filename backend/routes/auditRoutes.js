// import express from "express";
// import { getUserAuditLogs, exportAuditCsv } from "../controllers/auditController.js";

// const router = express.Router();

// // router.get("/users/:userId/logs", getUserAuditLogs);
// router.get("/users/:userId/logs/test", async (req, res) => {
//   const logs = await AuditLog.find({ user: req.params.userId }).lean();
//   res.json({ logs });
// });

// router.get("/users/:userId/logs/export", exportAuditCsv);

// export default router;


import express from "express";
import { getUserAuditLogs, exportAuditCsv } from "../controllers/auditController.js";

const router = express.Router();

router.get("/:userId/logs", getUserAuditLogs);
router.get("/:userId/logs/export", exportAuditCsv);

export default router;
