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
const app = express()

// Put right after app.set('trust proxy', 1)
app.use((req, res, next) => {
    if (!req.path.startsWith('/socket.io')) {
        console.log(`[req] ${req.method} ${req.path} | ${req.ip} | ${(req.headers['user-agent'] || '-').slice(0, 70)}`);
    }
    next();
});
app.set('trust proxy', 1)   // Render proxy - makes req.ip the real client IP for rate limiting

const httpServer = createServer(app)
app.use(compression())
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 2000,
    standardHeaders: "draft-8",
    legacyHeaders: false
});
app.use("/api", apiLimiter);

// app.use(helmet({
//     contentSecurityPolicy: {
//         directives: {
//             defaultSrc: ["'self'"],
//             // ../js/main.js ('self') + bootstrap.bundle (jsdelivr) + socket.io client + inline onerror handlers
//             scriptSrc: ["'self'", "https://cdn.jsdelivr.net", "https://cdn.socket.io", "'unsafe-inline'"],
//             // bootstrap css + bootstrap-icons css (jsdelivr) + your css ('self') + style="" attributes
//             styleSrc: ["'self'", "https://cdn.jsdelivr.net", "'unsafe-inline'"],
//             // feed/chat images from Cloudinary + FileReader data: previews + blob: pdfs
//             imgSrc: ["'self'", "data:", "blob:", "https://res.cloudinary.com"],
//             // chat videos from Cloudinary + blob: media
//             mediaSrc: ["'self'", "blob:", "https://res.cloudinary.com"],
//             // your API + direct Cloudinary uploads + socket.io websocket
//             connectSrc: ["'self'", "https://api.cloudinary.com", "wss:"],
//             // bootstrap-icons font files (woff2) from jsdelivr
//             fontSrc: ["'self'", "data:", "https://cdn.jsdelivr.net"],
//             objectSrc: ["'none'"],
//             frameAncestors: ["'self'"],
//         },
//     },
//     crossOriginEmbedderPolicy: false,
// }));

initSocketIO(httpServer)

app.use(cookieParser())
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: false, limit: "100kb" }));

app.use(authRoutes)
app.use('/api/cloudinary', auth, cloudinaryRoutes)
app.use('/api/media', auth, mediaRoutes)
app.use('/api', auth, userRoutes)
app.use('/api', auth, feedRoutes)

app.use('/api', auth, settingRoutes)
app.use('/api/conversations', auth, conversationRoutes)
app.use('/api/conversations', auth, messageRoutes);

app.use(express.static(path.join(__dirname, "public")))


app.use((req, res, next) => {
    // If it's an API route that wasn't handled, return 404
    if (req.path.startsWith('/api')) {
        return res.status(404).json({ message: 'API endpoint not found' });
    }
    // Otherwise serve the SPA for frontend routes
    res.sendFile(path.join(__dirname, "public", "html", "index.html"));
});

app.use((err, req, res, next) => {
    console.log(err)
    const statusCode = err.statusCode || 500;
    res.status(statusCode).json({ message: 'Error happened try to refresh' })
})

try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("MongoDB connected");
} catch (error) {
    console.error("MongoDB connection failed:", error);
    process.exit(1);
}

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, "0.0.0.0", () => console.log(`Api running on port ${PORT}`))

// later add graceful shutdown for mongoose and socket.io
// later add refreshtoken rotation so that after each access token previous refresh token is invalidated

