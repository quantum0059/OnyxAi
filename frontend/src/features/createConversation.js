import api from "../../utils/axios";

/**
 * Creates a new conversation in the backend for the authenticated user.
 * @returns {Promise<Object|null>} The created conversation document or null on error.
 */
export const createConversation = async () => {
    try {
        const { data } = await api.get("/api/chat/create-conversation");
        return data?.conversation || null;
    } catch (error) {
        console.error("Error creating conversation:", error);
        return null;
    }
};

export default createConversation;
