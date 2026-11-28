import "dotenv/config";
import express from "express";
import cookieParser from "cookie-parser";
import connectDB from "./config/db.js";
import authRoutes from "./src/routes/auth.route.js";

const app = express();
app.set("trust proxy", 1);
app.use(express.json());
app.use(cookieParser());
const port = process.env.PORT;
connectDB();

app.get("/", (req, res) => {
    return res.json({ message: "Auth service is running" });
})
app.use("/api/auth", authRoutes);
app.use("/auth", authRoutes);
app.listen(port, () => {
    console.log(`Auth is running on port ${port}`);
});