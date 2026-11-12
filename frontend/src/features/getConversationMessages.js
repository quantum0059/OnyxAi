import api from "../../utils/axios";

/**
 * Fetches all saved messages for a specific conversation ID.
 * @param {string} conversationId
 * @returns {Promise<Array>} List of message documents.
 */
export const getConversationMessages = async (conversationId) => {
    if (!conversationId) return [];
    try {
        const { data } = await api.get(`/api/chat/get-conversation-messages/${conversationId}`);
        return data?.messages || [];
    } catch (error) {
        console.error("Error fetching conversation messages:", error);
        return [];
    }
};

export default getConversationMessages;

