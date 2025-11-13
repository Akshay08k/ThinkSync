import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";
import passport from "passport";
import sessionMiddleware from "./config/session.js";
import setupPassport from "./config/passport.js";
import axios from "axios";
import likeRoutes from "./routes/like.routes.js";
import authRoutes from "./routes/auth.routes.js";
import userRoutes from "./routes/user.routes.js";
import postRoutes from "./routes/post.routes.js";
import bookmarkRoutes from "./routes/bookmark.routes.js";
import commentRoutes from "./routes/comment.routes.js";
import followRoutes from "./routes/follower.routes.js";
import topicRoutes from "./routes/topics.routes.js";
import messageRoutes from "./routes/message.routes.js";
import moderationRoutes from "./routes/moderation.routes.js";
import notificationRoutes from "./routes/notification.routes.js";
import aiRecommendationRoutes from "./routes/aiRecommendation.routes.js";
import adminRoutes from "./routes/admin.routes.js";
import announcementRoutes from "./routes/announcement.routes.js";
import { createServer } from "http";
import { Server } from "socket.io";
import fs from "fs";
import path from "path";
import { log } from "./utils/Logger.js";
import { getUserRoomId } from "./utils/socketRooms.js";
dotenv.config();

// Create Express app
const app = express();

// Trust proxy - required for Railway and other hosting platforms behind a proxy
// This ensures req.protocol and req.secure are correctly set for HTTPS
app.set("trust proxy", 1);

// Create HTTP server for Socket.IO
const server = createServer(app);

// Socket.IO setup
// Setting here origin to allow requests from frontend
const io = new Server(server, {
  cors: {
    origin:
      process.env.CORS_ORIGIN ||
      "http://localhost:5173" ||
      "https://thinksync.me",
    credentials: true,
  },
});

// ---- USER-SOCKETID MAPPING ----
const userSocketMap = {}; // userId: socketId

io.on("connection", (socket) => {
  log("🔌 New socket connection:", socket.id);

  socket.on("registerUser", (userId) => {
    if (userId) {
      userSocketMap[userId] = socket.id;
      socket.userId = userId;
      const personalRoom = getUserRoomId(userId);
      socket.join(personalRoom);
      log(`✅ User ${userId} registered with socket ${socket.id}`);
    }
  });

  socket.on("disconnect", (reason) => {
    log(`🔌 Socket ${socket.id} disconnected:`, reason);
    if (socket.userId && userSocketMap[socket.userId] === socket.id) {
      delete userSocketMap[socket.userId];
      log(`🗑️ Removed user ${socket.userId} from socket map`);
    }
  });

  socket.on("error", (error) => {
    console.error("❌ Socket error:", error);
  });

  // Join a chat room between two users
  socket.on("joinRoom", (roomId) => {
    socket.join(roomId);
    log(`📥 Socket ${socket.id} joined room: ${roomId}`);
  });

  socket.on("leaveRoom", (roomId) => {
    socket.leave(roomId);
    log(`📤 Socket ${socket.id} left room: ${roomId}`);
  });

  // Send a message in real-time
  socket.on("sendMessage", ({ roomId, message }) => {
    io.to(roomId).emit("receiveMessage", message);
    log(`💬 Message sent to room ${roomId}`);
  });
});

// ---------------------
// Middleware
// ---------------------
app.use(express.json());
app.use(
  cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  })
);
app.use(cookieParser());
app.use(sessionMiddleware);

// CRITICAL: setupPassport() must be called BEFORE passport.session()
// This registers serializeUser and deserializeUser functions
setupPassport();

app.use(passport.initialize());
app.use(passport.session());

// for proxying images to avoid CORS issues
app.get("/proxy", async (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).send("Missing URL");

  try {
    const decodedUrl = decodeURIComponent(url);
    const response = await axios.get(decodedUrl, {
      responseType: "arraybuffer",
      headers: {
        "User-Agent":
          "windows-1252''Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3",
      },
    });

    res.set("Content-Type", response.headers["content-type"]);
    res.send(response.data);
  } catch (err) {
    console.error("Proxy error:", err.message);
    res.status(500).send("Failed to load image");
  }
});

// ---------------------
// Serve static files (for uploads, images, etc.)
// ---------------------

const tempDir = path.join(process.cwd(), "public", "temp");
if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

// This lets users access images via: /public/temp/filename.jpg
app.use("/public", express.static(path.join(process.cwd(), "public")));

// ---------------------
// Routes
// ---------------------
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/user", userRoutes);
app.use("/api/v1/posts", postRoutes);
app.use("/api/v1/likes", likeRoutes);
app.use("/api/v1/bookmark", bookmarkRoutes);
app.use("/api/v1/comment", commentRoutes);
app.use("/api/v1/follower", followRoutes);
app.use("/api/v1/topics", topicRoutes);
app.use("/api/v1/messages", messageRoutes(io));
app.use("/api/v1/moderation", moderationRoutes);
app.use("/api/v1/notifications", notificationRoutes);
app.use("/api/v1/ai", aiRecommendationRoutes);
app.use("/api/v1/admin", adminRoutes);
app.use("/api/v1/announcements", announcementRoutes);

app.get("/health", (req, res) => {
  res.json({
    message: "Server is running",

    sessionSecret: process.env.SESSION_SECRET ? "Set" : "Not set",
    databaseUrl: process.env.DATABASE_URL ? "Set" : "Not set",
    corsOrigin: process.env.CORS_ORIGIN || "Not set",
    nodeEnv: process.env.NODE_ENV || "Not set",
    protocol: req.protocol,
    secure: req.secure,
  });
});

// Session test endpoint (for debugging)
app.get("/api/v1/test-session", (req, res) => {
  req.session.test = "Session is working";
  req.session.save((err) => {
    if (err) {
      return res
        .status(500)
        .json({ error: "Session save failed", details: err.message });
    }

    // Get Set-Cookie header to verify Partitioned attribute
    const setCookieHeaders = res.getHeader("set-cookie") || [];

    res.json({
      sessionId: req.sessionID,
      session: req.session,
      sessionPassport: req.session.passport,
      cookies: req.cookies,
      protocol: req.protocol,
      secure: req.secure,
      nodeEnv: process.env.NODE_ENV,
      isAuthenticated: req.isAuthenticated(),
      user: req.user ? "present" : "missing",
      setCookieHeaders: Array.isArray(setCookieHeaders)
        ? setCookieHeaders
        : [setCookieHeaders],
      headers: {
        origin: req.headers.origin,
        referer: req.headers.referer,
        cookie: req.headers.cookie,
      },
    });
  });
});

export { app, server, io, userSocketMap };
