import axios from "axios";

export const getMessages = async (conversationId, userId) => {
    try {
        const { data } = await axios.get(
            `${process.env.CHAT_SERVICE_URL}/get-conversation-messages/${conversationId}`,
            { headers: { "x-user-id": userId } }
        );
        // Chat service returns newest first; reverse so model receives chronological order.
        return (data?.messages ?? [])
            .slice(0, 20)
            .reverse()
            .map(({ role, content, images }) => ({
                role,
                content,
                images: Array.isArray(images) ? images : []
            }));
    } catch (err) {
        console.error("Failed to fetch conversation history:", err.message);
        return [];
    }
};

