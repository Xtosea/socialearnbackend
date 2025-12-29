import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
  {
    // ================= BASIC INFO =================
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

    // ================= ACCOUNT =================
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    emailVerificationToken: String,

    // ================= PROFILE =================
    bio: { type: String, default: "" },
    dob: { type: String, default: "" },
    profilePicture: { type: String, default: "" },

    // ================= POINTS =================
    points: {
      type: Number,
      default: 0,
      min: 0,
    },

    // ================= DAILY LOGIN REWARD =================
    dailyLogin: {
  month: {
    type: Number, // 0–11
    default: new Date().getMonth(),
  },
  year: {
    type: Number,
    default: new Date().getFullYear(),
  },
  monthlyTarget: {
    type: Number,
    default: 0,
  },
  claimedDays: {
    type: [Number], // e.g. [1,2,4,7]
    default: [],
  },
  monthlyEarned: {
    type: Number,
    default: 0,
  },
},

    // ================= SOCIAL =================
    followers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    following: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],

    // ================= REFERRALS =================
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
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

//
// ================= PASSWORD =================
//
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.matchPassword = function (enteredPassword) {
  return bcrypt.compare(enteredPassword, this.password);
};

//
// ================= POINTS METHODS =================
//
userSchema.methods.addPoints = async function (amount) {
  this.points = Math.max(0, this.points + amount);
  await this.save();
  return this.points;
};

userSchema.methods.deductPoints = async function (amount) {
  this.points = Math.max(0, this.points - amount);
  await this.save();
  return this.points;
};

//
// ================= FOLLOW SYSTEM =================
//
userSchema.methods.follow = async function (targetUser) {
  if (!this.following.includes(targetUser._id)) {
    this.following.push(targetUser._id);
    targetUser.followers.push(this._id);
    await this.save();
    await targetUser.save();
  }
};

userSchema.methods.unfollow = async function (targetUser) {
  this.following = this.following.filter(
    (id) => id.toString() !== targetUser._id.toString()
  );
  targetUser.followers = targetUser.followers.filter(
    (id) => id.toString() !== this._id.toString()
  );
  await this.save();
  await targetUser.save();
};

//
// ================= VIRTUALS =================
//
userSchema.virtual("followerCount").get(function () {
  return this.followers.length;
});

userSchema.virtual("followingCount").get(function () {
  return this.following.length;
});

userSchema.virtual("referralCount").get(function () {
  return this.referrals.length;
});

const User = mongoose.model("User", userSchema);
export default User;