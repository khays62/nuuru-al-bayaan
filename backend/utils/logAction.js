import AuditLog from "../models/AuditLog.js";

export async function logAction({ userId, action, description, req }) {
  try {
    await AuditLog.create({
      user: userId,
      action,
      description,
      ip: req?.ip || "",
      device: req?.headers["user-agent"] || "",
    });
  } catch (err) {
    console.error("Audit log error:", err);
  }
}
