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
        await redis.set(`session-${sessionId}`, JSON.stringify({
            userId: user._id,
            name: user.name,
            email: user.email,
            avatar: user.avatar
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