import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
  {
    // ===== BASIC INFO =====
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

    country: {
      type: String,
    },

    // ===== EMAIL VERIFICATION =====
    isEmailVerified: {
      type: Boolean,
      default: false,
    },

    emailVerificationToken: {
      type: String,
    },

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
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);