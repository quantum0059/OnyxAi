import api from "../../utils/axios";

/**
 * Fetches all conversations belonging to the authenticated user.
 * @returns {Promise<Array>} List of conversation documents.
 */
export const getConversations = async () => {
    try {
        const { data } = await api.get("/api/chat/get-conversations");
        return data?.conversations || [];
    } catch (error) {
        console.error("Error fetching conversations:", error);
        return [];
    }
};

export default getConversations;
