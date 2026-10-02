import "dotenv/config";
import express from "express";
import mongoose from "mongoose";
import path from "path";
import __dirname from "./rootDir.js";
import cookieParser from "cookie-parser";
import authRoutes from "./routes/auth.js";
import auth from "./middlewares/is_auth.js";
import userRoutes from "./routes/api/user.js";
import feedRoutes from "./routes/api/feed.js";
import settingRoutes from "./routes/api/setting.js";
import conversationRoutes from "./routes/api/conversation.js";
import messageRoutes from "./routes/api/message.js";
import mediaRoutes from "./routes/api/media.js";
import cloudinaryRoutes from "./routes/api/cloudinary.js";
import { createServer } from "http";
import { initSocketIO } from "./config/socket.js";
import compression from "compression";
import rateLimit from "express-rate-limit";

const app = express();

// Real client IP through Render's proxy chain (Cloudflare + Render LB).
app.set("trust proxy", true);

app.use(compression());

// Client key that cannot be faked: Render's Cloudflare layer sets
// cf-connecting-ip and overwrites whatever the visitor sent.
// Fallback (local dev / no header): req.ip.
const clientKey = (req) => req.get("cf-connecting-ip") || req.ip;

// 1) STRICT: login / signup / refresh attempts
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 30,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    keyGenerator: clientKey,
    handler: (req, res) => {
        console.warn(`[429 AUTH] ${clientKey(req)} ${req.method} ${req.originalUrl}`);
        res.status(429).json({ message: "Too many attempts. Try again later." });
    },
});

// 2) GENEROUS: everything under /api
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 3000,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    keyGenerator: clientKey,
    handler: (req, res) => {
        console.warn(`[429 API] ${clientKey(req)} ${req.method} ${req.originalUrl}`);
        res.status(429).json({ message: "Too many requests. Please slow down." });
    },
});

const httpServer = createServer(app);
initSocketIO(httpServer);

app.use(cookieParser());
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: false, limit: "100kb" }));

// Health: registered BEFORE the api limiter = never limited (keep-alive + Render checks)
app.get("/api/health", (req, res) => res.json({ ok: true, uptime: Math.round(process.uptime()) }));

// TEMP: open once after deploy to verify, then delete this route
app.get("/api/ipcheck", (req, res) => res.json({
    key: req.get("cf-connecting-ip") || req.ip,
    ip: req.ip,
    cf: req.get("cf-connecting-ip"),
    xff: req.get("x-forwarded-for"),
}));

app.use(["/signup", "/login", "/auth", "/cloudinary/signup-signature"], authLimiter);

app.use(authRoutes);

app.use("/api", apiLimiter);
app.use("/api/cloudinary", auth, cloudinaryRoutes);
app.use("/api/media", auth, mediaRoutes);
app.use("/api", auth, userRoutes);
app.use("/api", auth, feedRoutes);
app.use("/api", auth, settingRoutes);
app.use("/api/conversations", auth, conversationRoutes);
app.use("/api/conversations", auth, messageRoutes);

app.use(express.static(path.join(__dirname, "public"), {
    maxAge: "1h",
    setHeaders: (res, filePath) => {
        if (filePath.endsWith(".html")) res.setHeader("Cache-Control", "no-cache");
    }
}));

app.use((req, res) => {
    if (req.path.startsWith("/api")) {
        return res.status(404).json({ message: "API endpoint not found" });
    }
    if (!req.headers.accept?.includes("text/html")) {
        return res.status(404).send("Not found");
    }
    res.sendFile(path.join(__dirname, "public", "html", "index.html"));
});

app.use((err, req, res, next) => {
    console.log(err);
    const statusCode = err.statusCode || 500;
    res.status(statusCode).json({ message: "Error happened try to refresh" });
});

// ============================================================
// BOOT
// ============================================================
try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("MongoDB connected");
} catch (error) {
    console.error("MongoDB connection failed:", error);
    process.exit(1);
}

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, "0.0.0.0", () => console.log(`Api running on port ${PORT}`));

// later: graceful shutdown, refresh-token rotation