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

app.set("trust proxy", 1);

app.use(compression());

// ============================================================
// 4. RATE LIMITING - layered defense
// ============================================================
// 4a. Global: EVERY route (static + SPA + API). A blocked request
//     costs the bot ~200 bytes. Socket.io excluded (its heartbeat
//     would eat a real user's budget).
const globalLimiter = rateLimit({
    windowMs: 60 * 1000,
    limit: 120,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: { message: "Too many requests, slow down." },
});
app.use((req, res, next) => {
    if (req.path.startsWith("/socket.io")) return next();
    globalLimiter(req, res, next);
});

// 4b. Auth brute-force: strict - login/signup/refresh attempts
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 30,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: { message: "Too many attempts. Try again later." },
});

// 4c. API window: generous for real authenticated browsing
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 2000,
    standardHeaders: "draft-8",
    legacyHeaders: false,
});

const httpServer = createServer(app);
initSocketIO(httpServer);

app.use(cookieParser());
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: false, limit: "100kb" }));

app.get("/api/health", (req, res) => res.json({ ok: true, uptime: Math.round(process.uptime()) }));


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
// 11. BOOT
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