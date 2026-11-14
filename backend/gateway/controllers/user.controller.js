import redis from "../../shared/redis.js";

export const getCurrentUser = async (req, res) => {
    try {
        const sessionId = req.cookies?.session;
        if (sessionId) {
            const sessionRaw = await redis.get(`session-${sessionId}`);
            if (sessionRaw) {
                const sessionUser = JSON.parse(sessionRaw);
                return res.status(200).json({ user: sessionUser });
            }
        }
        return res.status(200).json({ user: req.user });
    } catch (error) {
        console.log("getCurrentUser error:", error);
        return res.status(200).json({ user: req.user });
    }
};