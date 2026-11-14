import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { createProxyMiddleware } from "http-proxy-middleware";
import path from "path";
import { fileURLToPath } from "url";
import protect from "./middleware/authMiddleware.js";
import { getCurrentUser } from "./controllers/user.controller.js";
import { proxyWithHeader } from "./utils/proxyWithHeader.js";

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(currentDirectory, ".env") });

for (const variableName of ["AUTH_SERVICE", "CHAT_SERVICE", "AGENT_SERVICE"]) {
    if (!process.env[variableName]) {
        throw new Error(`Missing required gateway configuration: ${variableName}`);
    }
}

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

app.use("/api/chat", protect, proxyWithHeader(process.env.CHAT_SERVICE, "/api/chat"));
app.use("/api/agent", protect, proxyWithHeader(process.env.AGENT_SERVICE, "/api/agent"));
app.use("/api/payment", protect, proxyWithHeader(process.env.PAYMENT_SERVICE, "/api/payment"))

app.get("/", (req, res) => {
    return res.json({ message: "Gateway is running" });
});

app.get("/api/me", protect, getCurrentUser);
app.get("/me", protect, getCurrentUser);

app.listen(port, () => {
    console.log(`Gateway is running on port ${port}`);
});
