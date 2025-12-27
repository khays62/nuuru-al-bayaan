import User from "../models/User.js";
import bcrypt from "bcryptjs";

// CREATE USER
export const createUser = async (req, res) => {
  try {
    console.log("Create payload:", req.body);

    const { fullName, username, email, phone, role, permissions, password } = req.body;
    if (!password) return res.status(400).json({ message: "Password required" });

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await User.create({
      fullName,
      username,
      email,
      phone,
      role,
      permissions,
      password: hashedPassword,
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
    console.log("Update payload:", req.body);
    const { id } = req.params;

    const user = await User.findById(id);
    if (!user) return res.status(404).json({ message: "User not found" });

    const { fullName, username, email, phone, role, permissions, password } = req.body;

    user.fullName = fullName;
    user.username = username;
    user.email = email;
    user.phone = phone;
    user.role = role;
    user.permissions = permissions; // must be object matching schema

    if (password && password.trim() !== "") {
      user.password = await bcrypt.hash(password, 10);
    }

    await user.save();
    res.json({ message: "User updated successfully", user });
  } catch (error) {
    console.error("❌ Update user error:", error);
    res.status(500).json({ message: error.message });
  }
};


// Get all users
export const getUsers = async (req, res) => {
  try {
    const { search } = req.query;
    let query = {};

    if (search) {
      query = {
        $or: [
          { fullName: { $regex: search, $options: "i" } },
          { username: { $regex: search, $options: "i" } },
          { email: { $regex: search, $options: "i" } },
          { phone: { $regex: search, $options: "i" } },
        ],
      };
    }

    const users = await User.find(query);
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delete user
export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    await User.findByIdAndDelete(id);
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

    user.status = user.status === "active" ? "inactive" : "active";
    await user.save();

    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
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

