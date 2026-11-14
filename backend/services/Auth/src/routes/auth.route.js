import { login, logout, updateUserPayment, deductCredits } from "../controllers/auth.controller.js";
import express from "express";

const router = express.Router();

router.post("/login", login);
router.get("/logout", logout);
router.post("/update-plan", updateUserPayment)
router.post("/deduct-credits", deductCredits)
export default router;