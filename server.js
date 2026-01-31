import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import morgan from "morgan";
import http from "http";
import { Server } from "socket.io";
import connectDB from "./config/db.js";

// Routes
import authRoutes from "./routes/authRoutes.js";
import taskRoutes from "./routes/taskRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import walletRoutes from "./routes/walletRoutes.js";
import postRoutes from "./routes/postRoutes.js";
import historyRoutes from "./routes/historyRoutes.js";
import contactRoutes from "./routes/contact.js";
import rewardRoutes from "./routes/rewardRoutes.js";
import pointRoutes from "./routes/pointRoutes.js";

dotenv.config();

const app = express();

// =========================================
// ✅ LOAD ALLOWED ORIGINS FROM ENV
// =========================================
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",").map(o => o.trim())
  : [];

console.log("✅ Allowed Origins:", allowedOrigins);

// =========================================
// 🧩 ORIGIN LOGGER (safe)
// =========================================
app.use((req, res, next) => {
  const origin = req.headers.origin;
  console.log(
    `🌍 Request from: ${origin || "unknown"} → ${req.method} ${req.originalUrl}`
  );
  next();
});

// =========================================
// ✅ SMART CORS CONFIGURATION
// =========================================
app.use(
  cors({
    origin: (origin, callback) => {
      if (
        !origin || // Postman / server-to-server
        allowedOrigins.includes(origin) ||
        /vercel\.app$/.test(origin) // allow all Vercel previews
      ) {
        callback(null, true);
      } else {
        console.warn("❌ Blocked by CORS:", origin);
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  })
);

// =========================================
// ✅ MIDDLEWARE
// =========================================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev"));

// =========================================
// ✅ DATABASE CONNECTION
// =========================================
connectDB();

// =========================================
// ✅ ROUTES
// =========================================
app.use("/api/auth", authRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/users", userRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/wallet", walletRoutes);
app.use("/api/history", historyRoutes);
app.use("/api/contact", contactRoutes);
app.use("/api/rewards", rewardRoutes);
app.use("/api/posts", postRoutes);
app.use("/api/points", pointRoutes);

// =========================================
// ✅ HEALTH & TEST ROUTES
// =========================================
app.get("/", (req, res) => {
  res.send("🌐 SocialEarn Backend is running successfully!");
});

app.get("/api/test", (req, res) => {
  res.json({ message: "✅ Backend connected successfully!" });
});

// =========================================
// ✅ SOCKET.IO SETUP
// =========================================
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true,
  },
});

app.set("io", io);

io.on("connection", (socket) => {
  console.log("✅ Socket connected:", socket.id);

  socket.on("joinRoom", (userId) => {
    socket.join(userId);
    console.log(`🟢 User ${userId} joined room`);
  });

  socket.on("disconnect", () => {
    console.log("🔴 Socket disconnected:", socket.id);
  });
});

// =========================================
// ✅ START SERVER (RENDER SAFE)
// =========================================
const PORT = process.env.PORT || 5000;
server.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on port ${PORT}`);
});