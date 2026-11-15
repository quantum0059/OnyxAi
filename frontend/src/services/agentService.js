import api from '../../utils/axios';

/**
 * Send a user prompt to the AI agent and get a response.
 * @param {Object} payload
 * @param {string} payload.prompt - The user's message
 * @param {string} payload.conversationId - The active conversation ID
 * @param {string} [payload.agent] - The selected agent mode (optional)
 * @returns {Promise<string>} The AI's response text
 */
export const sendMessage = async ({ prompt, conversationId, agent, file }) => {
    if (file) {
        const formData = new FormData();
        formData.append('prompt', prompt || 'Analyze this file');
        formData.append('conversationId', conversationId);
        if (agent) formData.append('agent', agent);
        formData.append('file', file);

        const { data } = await api.post('/api/agent/chat', formData);
        return data;
    }

    const { data } = await api.post('/api/agent/chat', { prompt, conversationId, agent });
    return data;
};
