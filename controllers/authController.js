import User from "../models/User.js";
import jwt from "jsonwebtoken";
import { updateUserPoints } from "../utils/pointsHelpers.js"; // your helper

const generateToken = (id, isAdmin = false) =>
  jwt.sign({ id, isAdmin }, process.env.JWT_SECRET, { expiresIn: "30d" });

// ================= REGISTER =================
export const registerUser = async (req, res) => {
  let { username, email, password, country, referralCode } = req.body;
  username = username?.trim();
  email = email?.trim().toLowerCase();
  password = password?.trim();
  country = country?.trim();

  if (!username || !email || !password || !country)
    return res.status(400).json({ message: "All fields are required" });

  try {
    const exists = await User.findOne({
      $or: [{ email: new RegExp(`^${email}$`, "i") }, { username: new RegExp(`^${username}$`, "i") }],
    });
    if (exists) return res.status(400).json({ message: "User already exists" });

    const newUser = new User({ username, email, password, country });
    newUser.referralCode = newUser._id.toString().slice(-6);

    // Handle referral
    if (referralCode) {
      const referrer = await User.findOne({ referralCode });
      if (referrer) {
        await updateUserPoints({ user: newUser, amount: 1500, taskType: "referral-bonus" });
        await updateUserPoints({ user: referrer, amount: 1500, taskType: "referral-bonus" });

        newUser.referredBy = referrer._id;
        referrer.referrals.push(newUser._id);
        await referrer.save();
      }
    }

    await newUser.save();

    // Emit socket events
    const io = req.app.get("io");
    if (io) io.to(newUser._id.toString()).emit("pointsUpdate", { points: newUser.points });

    res.status(201).json({ ...newUser.toObject(), token: generateToken(newUser._id) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// ================= LOGIN =================
export const loginUser = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ message: "Email & password required" });

  try {
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user || !(await user.matchPassword(password)))
      return res.status(401).json({ message: "Invalid credentials" });

    res.json({ ...user.toObject(), token: generateToken(user._id, user.role === "admin") });
  } catch (err) {
    console.error(err);
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
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// ================= UPDATE PROFILE =================
export const updateProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    const { username, country, bio, profilePicture, dob } = req.body;
    if (username) user.username = username;
    if (country) user.country = country;
    if (bio) user.bio = bio;
    if (profilePicture) user.profilePicture = profilePicture;
    if (dob) user.dob = dob;

    await user.save();
    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};