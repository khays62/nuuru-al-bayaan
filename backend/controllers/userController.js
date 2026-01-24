import User from "../models/User.js";
import bcrypt from "bcryptjs";
import Admin from "../models/Admin.js";
import { writeAuditLog } from "../services/auditService.js";




// CREATE USER
export const createUser = async (req, res) => {
  try {
    const { fullName, username, email, phone, role, permissions, password } = req.body;
    if (!password) return res.status(400).json({ message: "Password required" });

    const normalizedRole = String(role || 'staff').trim().toLowerCase();
    if (normalizedRole === 'student' || normalizedRole === 'teacher') {
      return res.status(400).json({
        message: "User Management can only create staff/admin accounts. Use Students/Teachers modules instead.",
        field: "role",
      });
    }

    if (normalizedRole !== 'admin' && normalizedRole !== 'staff') {
      return res.status(400).json({ message: "Invalid role", field: "role" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await User.create({
      fullName,
      username,
      email,
      phone,
      role: normalizedRole,
      permissions,
      password: hashedPassword,
    });

    await writeAuditLog({
      userId: req.user?._id,
      action: 'users.create',
      description: `created user=${newUser._id} role=${normalizedRole}`,
      req,
    });

    res.status(201).json(newUser);
  } catch (error) {
    console.error("❌ Create user error:", error);
    res.status(500).json({ message: error.message });
  }
};

// UPDATE USER
export const updateUser = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);
    if (!user) return res.status(404).json({ message: "User not found" });

    const { fullName, username, email, phone, role, permissions, password } = req.body;

    const normalizedRole = String(role || user.role || 'staff').trim().toLowerCase();
    if (normalizedRole === 'student' || normalizedRole === 'teacher') {
      return res.status(400).json({
        message: "User Management can only manage staff/admin accounts. Use Students/Teachers modules instead.",
        field: "role",
      });
    }

    if (normalizedRole !== 'admin' && normalizedRole !== 'staff') {
      return res.status(400).json({ message: "Invalid role", field: "role" });
    }

    user.fullName = fullName;
    user.username = username;
    user.email = email;
    user.phone = phone;
    user.role = normalizedRole;
    user.permissions = permissions; // must be object matching schema

    if (password && password.trim() !== "") {
      user.password = await bcrypt.hash(password, 10);
    }

    await user.save();

    await writeAuditLog({
      userId: req.user?._id,
      action: 'users.update',
      description: `updated user=${user._id} role=${normalizedRole}`,
      req,
    });
    res.json({ message: "User updated successfully", user });
  } catch (error) {
    console.error("❌ Update user error:", error);
    res.status(500).json({ message: error.message });
  }
};


// Get all users
export const getUsers = async (req, res) => {
  try {
    const { search, role, status, sortBy, sortOrder } = req.query;
    const query = {};

    const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    // User Management should only list staff/admin accounts.
    // Students and teachers have their own dedicated pages and APIs.
    query.role = { $nin: ['student', 'teacher'] };

    if (role) {
      const normalizedRole = String(role).trim().toLowerCase();
      if (normalizedRole !== 'admin' && normalizedRole !== 'staff') {
        return res.status(400).json({ message: "Invalid role filter" });
      }
      query.role = normalizedRole;
    }

    if (status) {
      const normalizedStatus = String(status).trim().toLowerCase();
      if (normalizedStatus !== 'active' && normalizedStatus !== 'inactive') {
        return res.status(400).json({ message: "Invalid status filter" });
      }
      query.status = normalizedStatus;
    }

    if (search) {
      const raw = String(search);
      const trimmed = raw.trim().slice(0, 64);
      const safe = escapeRegex(trimmed);
      query.$or = [
        { fullName: { $regex: safe, $options: "i" } },
        { username: { $regex: safe, $options: "i" } },
        { email: { $regex: safe, $options: "i" } },
        { phone: { $regex: safe, $options: "i" } },
      ];
    }

    const safeSortBy = ['createdAt', 'updatedAt', 'fullName', 'username', 'email', 'role', 'status'].includes(String(sortBy || ''))
      ? String(sortBy)
      : 'createdAt';
    const direction = String(sortOrder || '').toLowerCase() === 'asc' ? 1 : -1;
    const users = await User.find(query).sort({ [safeSortBy]: direction });
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delete user
export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    const target = await User.findById(id);
    if (!target) return res.status(404).json({ message: "User not found" });

    // Guard: don't let an admin delete themselves if they're a User-admin account
    if (String(req.user?._id || '') === String(target._id)) {
      return res.status(400).json({ message: "You cannot delete your own account" });
    }

    // Guard: don't remove the last remaining admin
    if (String(target.role || '').toLowerCase() === 'admin') {
      const adminCount = await Admin.countDocuments({});
      const userAdminCount = await User.countDocuments({ role: 'admin', status: 'active' });
      const totalAdmins = adminCount + userAdminCount;
      if (totalAdmins <= 1) {
        return res.status(400).json({ message: "Cannot delete the last admin" });
      }
    }

    await User.deleteOne({ _id: target._id });

    await writeAuditLog({
      userId: req.user?._id,
      action: 'users.delete',
      description: `deleted user=${target._id} role=${target.role}`,
      req,
    });
    res.json({ message: "User deleted" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Toggle user status
export const toggleUserStatus = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    // Guard: don't let an admin deactivate themselves if they're a User-admin account
    if (String(req.user?._id || '') === String(user._id)) {
      return res.status(400).json({ message: "You cannot change your own status" });
    }

    // Guard: don't deactivate the last remaining admin
    const nextStatus = user.status === "active" ? "inactive" : "active";
    if (String(user.role || '').toLowerCase() === 'admin' && user.status === 'active' && nextStatus === 'inactive') {
      const adminCount = await Admin.countDocuments({});
      const userAdminCount = await User.countDocuments({ role: 'admin', status: 'active' });
      const totalAdmins = adminCount + userAdminCount;
      if (totalAdmins <= 1) {
        return res.status(400).json({ message: "Cannot deactivate the last admin" });
      }
    }

    user.status = nextStatus;
    await user.save();

    await writeAuditLog({
      userId: req.user?._id,
      action: 'users.toggleStatus',
      description: `user=${user._id} status=${nextStatus}`,
      req,
    });

    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message || 'Server error' });
  }
};

export const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).lean();

    if (!user)
      return res.status(404).json({ message: "User not found" });

    res.json({ data: user });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch user" });
  }
};

