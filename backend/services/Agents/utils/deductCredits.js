import axios from "axios";

export const deductCredits = async (userId, agent, amount) => {
    if (!userId) return null;
    try {
        const { data } = await axios.post(
            `${process.env.AUTH_SERVICE_URL}/api/auth/deduct-credits`,
            { userId, agent, amount }
        );
        return data;
    } catch (err) {
        console.error("Failed to deduct Credits:", err.response?.data?.message || err.message);
        return null;
    }
};