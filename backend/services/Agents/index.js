import "dotenv/config";
import express from "express";
import connectDB from "./config/db.js";


const app = express();
app.use(express.json());
const port = process.env.PORT;
connectDB();

app.get("/", (req, res) => {
    return res.json({ message: "Agents service is running" });
})

app.listen(port, () => {
    console.log(`Agent is running on port ${port}`);
});