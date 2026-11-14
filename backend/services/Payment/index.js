import "dotenv/config";
import express from "express";
import connectDB from "./config/db.js";
import router from "./routes/payment.route.js";


const app = express();
app.use(express.json());
const port = process.env.PORT;
connectDB();
app.use("/", router)
app.get("/", (req, res) => {
    return res.json({ message: "Payment service is running" });
})

app.listen(port, () => {
    console.log(`Payment is running on port ${port}`);
});