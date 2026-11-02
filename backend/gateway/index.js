import "dotenv/config";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { createProxyMiddleware } from "http-proxy-middleware";
import protect from "./middleware/authMiddleware.js";
import { getCurrentUser } from "./controllers/user.controller.js";
import { proxyWithHeader } from "./utils/proxyWithHeader.js";

const app = express();
const port = process.env.PORT || 8000;

// Enable CORS for frontend
app.use(cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
}));

app.use(cookieParser());


app.use(
    "/api/auth",
    createProxyMiddleware({
        target: process.env.AUTH_SERVICE,
        changeOrigin: true,
        pathRewrite: (path) => `/api/auth${path}`,
    })
);

app.use("/api/chat", protect, proxyWithHeader(process.env.CHAT_SERVICE));

app.get("/", (req, res) => {
    return res.json({ message: "Gateway is running" });
});

app.get("/api/me", protect, getCurrentUser);
app.get("/me", protect, getCurrentUser);

app.listen(port, () => {
    console.log(`Gateway is running on port ${port}`);
});
