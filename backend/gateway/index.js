import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";
import { createProxyMiddleware } from "http-proxy-middleware";

dotenv.config();

const app = express();
const port = process.env.PORT || 8000;

// Enable CORS for frontend
app.use(cors({
    origin: process.env.FRONTEND_URL,
    credentials: true,
}));

app.use(cookieParser());


app.use(
    "/auth",
    createProxyMiddleware({
        target: process.env.AUTH_SERVICE,
        changeOrigin: true,
        pathRewrite: (path) => `/api/auth${path}`,
    })
);

app.get("/", (req, res) => {
    return res.json({ message: "Gateway is running" });
});

app.listen(port, () => {
    console.log(`Gateway is running on port ${port}`);
});
