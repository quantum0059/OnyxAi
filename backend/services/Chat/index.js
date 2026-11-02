import "dotenv/config";
import express from "express";
import connectDB from "./config/db.js";
import router from "./routes/chats.routes.js";


const app = express();
app.use(express.json());
const port = process.env.PORT;
connectDB();

app.get("/", (req, res) => {
    return res.json({ message: "Chat service is running" });
})
app.use("/", router);
app.listen(port, () => {
    console.log(`Chat is running on port ${port}`);
});