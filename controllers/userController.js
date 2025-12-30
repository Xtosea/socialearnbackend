import User from "../models/User.js";
import HistoryLog from "../models/HistoryLog.js";
import bcrypt from "bcryptjs";

// GET PROFILE
export const getProfile = async (req, res) => {
  const user = await User.findById(req.user._id).select("-password");
  if (!user) return res.status(404).json({ message: "User not found" });
  res.json(user);
};

// UPDATE PROFILE
export const updateProfile = async (req, res) => {
  const user = await User.findById(req.user._id);
  if (!user) return res.status(404).json({ message: "User not found" });

  const { username, email, country, password, bio, dob, profilePicture } = req.body;

  if (username) user.username = username.trim();
  if (email) user.email = email.trim().toLowerCase();
  if (country) user.country = country.trim();
  if (bio) user.bio = bio;
  if (dob) user.dob = dob;
  if (profilePicture) user.profilePicture = profilePicture;
  if (password) user.password = await bcrypt.hash(password, 10);

  await user.save();
  res.json({ message: "Profile updated", user });
};

// FOLLOW USER
export const followUser = async (req, res) => {
  const target = await User.findById(req.params.id);
  const current = await User.findById(req.user._id);
  if (!target || !current) return res.status(404).json({ message: "User not found" });

  if (target.followers.includes(current._id))
    return res.status(400).json({ message: "Already following" });

  target.followers.push(current._id);
  current.following.push(target._id);

  await target.save();
  await current.save();

  await HistoryLog.create({
    user: current._id,
    taskType: "follow",
    amount: 0,
    metadata: { username: target.username },
  });

  res.json({ message: `Following ${target.username}` });
};

// UNFOLLOW USER
export const unfollowUser = async (req, res) => {
  const target = await User.findById(req.params.id);
  const current = await User.findById(req.user._id);
  if (!target || !current) return res.status(404).json({ message: "User not found" });

  target.followers.pull(current._id);
  current.following.pull(target._id);

  await target.save();
  await current.save();

  await HistoryLog.create({
    user: current._id,
    taskType: "unfollow",
    amount: 0,
    metadata: { username: target.username },
  });

  res.json({ message: `Unfollowed ${target.username}` });
};

// GET REFERRALS
export const getReferrals = async (req, res) => {
  const user = await User.findById(req.user._id).populate(
    "referrals",
    "username email country points createdAt"
  );
  res.json({
    referralCode: user.referralCode,
    referralCount: user.referrals.length,
    referrals: user.referrals,
  });
};