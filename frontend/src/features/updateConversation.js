import api from "../../utils/axios";

/**
 * Updates the title of an existing conversation.
 * @param {Object} payload
 * @param {string} payload.id - Conversation ID
 * @param {string} payload.title - New conversation title
 * @returns {Promise<Object|null>} The updated conversation document.
 */
export const updateConversation = async ({ id, title }) => {
    if (!id || !title) return null;
    try {
        const { data } = await api.post("/api/chat/update-conversation", { id, title });
        return data?.convo || null;
    } catch (error) {
        console.error("Error updating conversation:", error);
        return null;
    }
};

export default updateConversation;

