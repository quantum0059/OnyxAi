import { getAuth } from "firebase-admin/auth";
import { app } from "../../config/firebase.js";
import User from "../models/user.model.js";
import redis from "../../../../shared/redis.js";

export const login = async (req, res) => {
    try {
        const { token } = req.body;
        const decodeToken = await getAuth(app).verifyIdToken(token);
        let user = await User.findOne({
            firebaseUid: decodeToken.uid
        });
        if (!user) {
            user = await User.create({
                firebaseUid: decodeToken.uid,
                email: decodeToken.email,
                name: decodeToken.name,
                avatar: decodeToken.picture
            })
        }
        const sessionId = crypto.randomUUID();
        await redis.set(`user-session-${user._id}`, sessionId, "EX", 7 * 24 * 60 * 60);
        await redis.set(`session-${sessionId}`, JSON.stringify({
            userId: user._id,
            name: user.name,
            email: user.email,
            avatar: user.avatar,
            plan: user.plan || "free",
            credits: user.credits ?? 100,
            totalCredits: user.totalCredits ?? 100
        }), "EX", 7 * 24 * 60 * 60)

        res.cookie("session", sessionId, {
            httpOnly: true,
            secure: false,
            sameSite: "strict",
            maxAge: 7 * 24 * 60 * 60 * 1000
        })

        return res.status(200).json(user)
    } catch (error) {
        return res.status(500).json({ error: "Internal server error" });

    }
}

export const logout = async (req, res) => {
    try {
        const sessionId = req.cookies?.session;
        if (!sessionId) {
            return res.status(401).json({ message: "No session found" });
        }
        await redis.del(`session-${sessionId}`);
        res.clearCookie("session");
        return res.status(200).json({ message: "Logout successful" });
    } catch (error) {
        return res.status(500).json({ error: "Internal server error" });

    }
}

export const updateUserPayment = async (req, res) => {
    try {
        const { plan, credits, userId } = req.body;

        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({ message: "User Not Found" })
        }
        user.plan = plan;
        const addCredits = Number(credits) || 0;
        user.credits = (Number(user.credits) || 0) + addCredits;
        user.totalCredits = (Number(user.totalCredits) || 0) + addCredits;
        user.planExpiredAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        await user.save();

        // Update all active sessions belonging to this user in Redis
        try {
            const keys = await redis.keys("session-*");
            for (const key of keys) {
                const sessionRaw = await redis.get(key);
                if (sessionRaw) {
                    const sessionData = JSON.parse(sessionRaw);
                    if (String(sessionData.userId) === String(user._id)) {
                        sessionData.plan = user.plan;
                        sessionData.credits = user.credits;
                        sessionData.totalCredits = user.totalCredits;
                        sessionData.planExpiredAt = user.planExpiredAt;
                        await redis.set(key, JSON.stringify(sessionData), "EX", 7 * 24 * 60 * 60);
                    }
                }
            }
        } catch (redisError) {
            console.error("Redis session update error:", redisError);
        }

        return res.status(200).json({ message: "User Payment Updated Successfully", user });
    } catch (error) {
        return res.status(500).json({ message: `update user payment error ${error}` });
    }
}

export const deductCredits = async (req, res) => {
    try {
        const { userId, agent } = req.body;
        const COST = {
            chat: 1,
            search: 5,
            coding: 10,
            pdf: 10,
            ppt: 10,
            vision: 10
        };

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        const agentName = String(agent || "chat").toLowerCase();
        const deductionCost = COST[agentName] ?? 1;

        if ((user.credits ?? 0) < deductionCost) {
            return res.status(400).json({ message: "Insufficient Credits" });
        }

        user.credits -= deductionCost;
        await user.save();

        // Update all active sessions belonging to this user in Redis
        try {
            const keys = await redis.keys("session-*");
            for (const key of keys) {
                const sessionRaw = await redis.get(key);
                if (sessionRaw) {
                    const sessionData = JSON.parse(sessionRaw);
                    if (String(sessionData.userId) === String(user._id)) {
                        sessionData.credits = user.credits;
                        sessionData.plan = user.plan;
                        await redis.set(key, JSON.stringify(sessionData), "EX", 7 * 24 * 60 * 60);
                    }
                }
            }
        } catch (redisErr) {
            console.error("Redis update error on deductCredits:", redisErr);
        }

        return res.status(200).json({
            message: "Credits Deducted Successfully",
            credits: user.credits,
            deducted: deductionCost,
            user
        });
    } catch (error) {
        return res.status(500).json({ message: `Deduct credits error ${error.message || error}` });
    }
};