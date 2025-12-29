// controllers/authController.js
import User from "../models/User.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { updateUserPoints } from "../utils/pointsHelpers.js";
import { dailyLoginRewardHelper } from "../utils/dailyLoginHelper.js"; // helper version of dailyLoginReward

// ================= JWT TOKEN =================
const generateToken = (id, isAdmin = false) =>
  jwt.sign({ id, isAdmin }, process.env.JWT_SECRET, { expiresIn: "30d" });

// ================= REGISTER USER =================
export const registerUser = async (req, res) => {
  let { username, email, password, country, referralCode } = req.body;
  username = username?.trim();
  email = email?.trim().toLowerCase();
  password = password?.trim();
  country = country?.trim();

  if (!username || !email || !password || !country)
    return res.status(400).json({ message: "All fields are required" });

  try {
    // Check if user exists
    const exists = await User.findOne({
      $or: [
        { email: new RegExp(`^${email}$`, "i") },
        { username: new RegExp(`^${username}$`, "i") },
      ],
    });
    if (exists) return res.status(400).json({ message: "User already exists" });

    // Create new user
    const newUser = new User({ username, email, password, country, points: 0 });
    newUser.referralCode = newUser._id.toString().slice(-6);

    // Handle referral code
    if (referralCode) {
      const referrer = await User.findOne({ referralCode });
      if (referrer) {
        await updateUserPoints({
          user: newUser,
          amount: 1500,
          taskType: "referral-bonus",
          taskId: null,
          description: `Referral bonus for using code ${referralCode}`,
          metadata: { referrerId: referrer._id },
        });

        await updateUserPoints({
          user: referrer,
          amount: 1500,
          taskType: "referral-bonus",
          taskId: null,
          description: `Referral bonus for referring ${newUser.username}`,
          metadata: { referredUserId: newUser._id },
        });

        newUser.referredBy = referrer._id;
        referrer.referrals.push(newUser._id);
        await referrer.save();
      }
    }

    await newUser.save();

    // Emit Socket.IO updates if available
    const io = req.app.get("io");
    if (io) {
      io.to(newUser._id.toString()).emit("pointsUpdate", { points: newUser.points });
      if (newUser.referredBy) {
        const referrer = await User.findById(newUser.referredBy);
        io.to(referrer._id.toString()).emit("pointsUpdate", { points: referrer.points });
      }
    }

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

    // ===== AUTOMATIC DAILY LOGIN =====
    try {
      const dailyLoginResult = await dailyLoginRewardHelper(user, req);
      // This helper directly updates points + user.dailyLogin
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
      dailyLogin: user.dailyLogin,
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ================= GET CURRENT USER =================
export const getCurrentUser = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
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