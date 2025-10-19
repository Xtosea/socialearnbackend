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
import historyRoutes from "./routes/historyRoutes.js";

dotenv.config();

const app = express();

// =========================================
// ✅ CORS CONFIGURATION (LOCAL + VERCEL)
// =========================================
// =========================================
// ✅ SMART CORS CONFIGURATION
// =========================================
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:3000",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:3000",
  "https://viralvideos.vercel.app",
  "https://viralvideoplus.vercel.app",
];

// ✅ Dynamic CORS Middleware
app.use(
  cors({
    origin: function (origin, callback) {
      // ✅ Allow requests from:
      // - No origin (Postman, server-to-server)
      // - Any Vercel preview domain
      // - Any domain explicitly listed above
      if (
        !origin ||
        allowedOrigins.includes(origin) ||
        /vercel\.app$/.test(origin)
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

// Test route
app.get("/api/test", (req, res) => {
  res.json({ message: "✅ Backend connected successfully!" });
});

// =========================================
// ✅ SOCKET.IO + SERVER SETUP
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
  console.log("✅ User connected:", socket.id);

  socket.on("joinRoom", (userId) => {
    socket.join(userId);
    console.log(`🟢 User ${userId} joined their room`);
  });

  socket.on("disconnect", () => {
    console.log("🔴 User disconnected:", socket.id);
  });
});

// =========================================
// ✅ START SERVER
// =========================================
const PORT = process.env.PORT || 5000;
server.listen(PORT, () =>
  console.log(`🚀 Server running on port ${PORT}`)
);