import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      minlength: 4,
    },

    email: {
      type: String,
      required: true,
      unique: true,
    },

    password: {
      type: String,
      required: true,
    },

    country: String,

    // ===== EMAIL VERIFICATION =====
    isEmailVerified: {
      type: Boolean,
      default: false,
    },

    emailVerificationToken: String,

    // ===== ROLE =====
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },

    // ===== PROFILE =====
    bio: {
      type: String,
      default: "",
    },

    dob: {
      type: String,
      default: "",
    },

    profilePicture: {
      type: String,
      default: "",
    },

    // ===== POINTS =====
    points: {
      type: Number,
      default: 0,
      min: 0,
    },

    // ===== SOCIAL =====
    followers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    following: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],

    // ===== REFERRALS =====
    referrals: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],

    referredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    referralCode: {
      type: String,
      unique: true,
      sparse: true,
      default: null,
    },

    referralRewarded: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// ================= PASSWORD HASH =================
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.matchPassword = async function (enteredPassword) {
  return bcrypt.compare(enteredPassword, this.password);
};

// ================= MODEL EXPORT =================
const User =
  mongoose.models.User || mongoose.model("User", userSchema);

export default User;