import "dotenv/config";
import express from "express";
import connectDB from "./config/db.js";
import router from "./routes/agent.route.js"


const app = express();
app.use(express.json());
const port = process.env.PORT;
connectDB();

app.get("/", (req, res) => {
    return res.json({ message: "Agents service is running" });
});

app.use("/", router)

app.use((err, req, res, next) => {
    console.error("Unhandled error:", err)

    if (err.status) {
        return res.status(err.status).json({
            success: false,
            message: err.message,
            data: err.data
        })
    }

    return res.status(500).json({ error: "Failed to process request" });
})

app.listen(port, () => {
    console.log(`Agent is running on port ${port}`);
});