import AuditLog from "../models/AuditLog.js";
import { Parser } from "json2csv";

export const getUserAuditLogs = async (req, res) => {
  try {
    const logs = await AuditLog.find({ user: req.params.userId })
      .sort({ timestamp: -1 })
      .lean();

    res.json({ data: logs });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch audit logs" });
  }
};

export const exportAuditCsv = async (req, res) => {
  try {
    const logs = await AuditLog.find({ user: req.params.userId }).lean();

    if (!logs.length)
      return res.status(404).json({ message: "No logs found" });

    const parser = new Parser({
      fields: ["action", "description", "ip", "device", "timestamp"],
    });

    const csv = parser.parse(logs);

    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=user_${req.params.userId}_logs.csv`
    );

    res.send(csv);
  } catch (err) {
    res.status(500).json({ message: "Failed to generate CSV" });
  }
};
