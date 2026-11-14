import axios from "axios";

export const deductCredits = async (userId, agent) => {
    try {
        const { data } = await axios.post(
            `${process.env.AUTH_SERVICE_URL}/deductCredits`, { userId, agent }
        );
        return data;
    } catch (err) {
        console.error("Failed to deduct Credits:", err.message);
    }
};