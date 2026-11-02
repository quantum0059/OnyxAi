import "dotenv/config";
import express from "express";
import connectDB from "./config/db.js";
import authRoutes from "./src/routes/auth.route.js";

const app = express();
app.use(express.json());
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