import User from "../models/User.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { updateUserPoints } from "../utils/pointsHelpers.js"; // points + history logging
import { dailyLoginRewardHelper } from "../utils/dailyLoginHelper.js"; // daily login helper

// Generate JWT token
const generateToken = (id, isAdmin = false) =>
  jwt.sign({ id, isAdmin }, process.env.JWT_SECRET, { expiresIn: "30d" });

// ================= REGISTER USER =================
export const registerUser = async (req, res) => {
  let { username, email, password, country, referralCode } = req.body;

  username = username?.trim();
  email = email?.trim().toLowerCase();
  password = password?.trim();
  country = country?.trim();

  if (!username || !email || !password || !country) {
    return res.status(400).json({ message: "All fields are required" });
  }

  try {
    // Check if user exists
    const exists = await User.findOne({
      $or: [
        { email: new RegExp(`^${email}$`, "i") },
        { username: new RegExp(`^${username}$`, "i") },
      ],
    });
    if (exists) {
      return res.status(400).json({ message: "User already exists" });
    }

    // Create user
    const newUser = new User({
      username,
      email,
      password,
      country,
      points: 0,
    });

    newUser.referralCode = newUser._id.toString().slice(-6);

    let referrer = null;

    // ================= REFERRAL HANDLING =================
    if (referralCode) {
      referrer = await User.findOne({ referralCode });
      if (referrer) {
        newUser.referredBy = referrer._id;
      }
    }

    // SAVE USER FIRST (IMPORTANT)
    await newUser.save();

    // ================= REFERRAL REWARDS =================
    if (referrer) {
      await updateUserPoints(
        newUser._id,
        1500,
        "referral-bonus",
        null,
        `Referral bonus for using code ${referralCode}`,
        { referrerId: referrer._id }
      );

      await updateUserPoints(
        referrer._id,
        1500,
        "referral-bonus",
        null,
        `Referral bonus for referring ${newUser.username}`,
        { referredUserId: newUser._id }
      );
    }

    // ================= SOCKET.IO UPDATES =================
    const io = req.app.get("io");
    if (io) {
      io.to(newUser._id.toString()).emit("pointsUpdate", {
        points: newUser.points,
      });

      if (referrer) {
        io.to(referrer._id.toString()).emit("pointsUpdate", {
          points: referrer.points,
        });
      }
    }

    // ================= RESPONSE =================
    res.status(201).json({
      _id: newUser._id,
      username: newUser.username,
      email: newUser.email,
      country: newUser.country,
      points: newUser.points,
      referralCode: newUser.referralCode,
      token: generateToken(newUser._id, newUser.isAdmin),
    });
  } catch (err) {
    console.error("Register error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ================= LOGIN USER =================
export const loginUser = async (req, res) => {
  const { identifier, password, adminOnly } = req.body;

  if (!identifier || !password)
    return res.status(400).json({ message: "Email/Username and password required" });

  try {
    const user = await User.findOne({
      $or: [
        { email: new RegExp(`^${identifier}$`, "i") },
        { username: new RegExp(`^${identifier}$`, "i") },
      ],
    });

    if (!user) return res.status(400).json({ message: "Invalid credentials" });

    const match = await user.matchPassword(password);
    if (!match) return res.status(400).json({ message: "Invalid credentials" });

    if (adminOnly && !user.isAdmin)
      return res.status(403).json({ message: "Access denied. Admins only." });

    // ================= AUTOMATIC DAILY LOGIN REWARD =================
    let dailyLogin = null;
    try {
      const io = req.app.get("io");
      dailyLogin = await dailyLoginRewardHelper(user, io);
    } catch (err) {
      console.error("Daily login reward error:", err.message);
    }

    res.json({
      _id: user._id,
      username: user.username,
      email: user.email,
      country: user.country,
      points: user.points,
      referralCode: user.referralCode,
      bio: user.bio,
      dob: user.dob,
      isAdmin: user.isAdmin,
      token: generateToken(user._id, user.isAdmin),
      dailyLogin,
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ================= GET CURRENT USER =================
export const getCurrentUser = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    // Automatic daily login reward on /me
    let dailyLogin = null;
    try {
      const io = req.app.get("io");
      dailyLogin = await dailyLoginRewardHelper(user, io);
    } catch (err) {
      console.error("Daily login reward error:", err.message);
    }

    res.json({
      _id: user._id,
      username: user.username,
      email: user.email,
      country: user.country,
      points: user.points,
      referralCode: user.referralCode,
      bio: user.bio,
      dob: user.dob,
      isAdmin: user.isAdmin,
      dailyLogin,
    });
  } catch (err) {
    console.error("Get current user error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ================= UPDATE PROFILE =================
export const updateProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    const { username, email, country, password, bio, dob } = req.body;

    if (username) user.username = username.trim();
    if (email) user.email = email.trim().toLowerCase();
    if (country) user.country = country.trim();
    if (bio !== undefined) user.bio = bio.trim();
    if (dob !== undefined) user.dob = dob;
    if (password) {
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(password, salt);
    }

    await user.save();
    res.json(user);
  } catch (err) {
    console.error("Profile update error:", err);
    res.status(500).json({ message: "Server error" });
  }
};