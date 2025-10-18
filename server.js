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
const allowedOrigins = [
  "http://localhost:5173",  // Local Vite
  "http://localhost:3000",  // Local CRA
  "http://127.0.0.1:5173",
  "http://127.0.0.1:3000",
  "https://viralvideoplus.vercel.app", // Deployed frontend
];

// ✅ CORS Middleware
app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (like Postman, mobile, or same-server)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        console.error("❌ Blocked by CORS:", origin);
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
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