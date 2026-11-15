import axios from 'axios';
import { graph } from '../graph/graph.js';
import { addMessages } from '../config/memory.js';

export const agent = async (req, res) => {
    try {
        const { prompt, conversationId, agent, images } = req.body;
        const userId = req.headers["x-user-id"];
        const file = req.file;
        if (!userId) {
            return res.status(401).json({ error: "Unauthorized" });
        }

        const cleanPrompt = (typeof prompt === "string" && prompt.trim())
            ? prompt.trim()
            : (file ? "Analyze the uploaded file" : "");

        if (!cleanPrompt || !conversationId) {
            return res.status(400).json({ error: "A prompt or file, and conversation ID are required" });
        }
        const userImages = Array.isArray(images) ? images : (images ? [images] : []);
        const chatServiceConfig = {
            headers: { "x-user-id": userId },
        };

        // 1. Persist user turn (including any uploaded images and file attachment) to Chat service database
        await axios.post(`${process.env.CHAT_SERVICE_URL}/save-message`, {
            conversationId,
            role: "user",
            content: cleanPrompt,
            images: userImages,
            file: file ? {
                name: file.originalname,
                type: file.mimetype,
                size: file.size
            } : undefined
        }, chatServiceConfig);

        // 2. Add user turn to memory cache (with automatic deduplication)
        await addMessages(conversationId, "user", cleanPrompt, userId, userImages);

        // 3. Invoke agent graph
        const result = await graph.invoke({
            prompt: cleanPrompt,
            conversationId,
            userId,
            agent,
            images: userImages,
            file
        });

        const rawResponse = result?.aiResponse;
        const response = typeof rawResponse === "string"
            ? rawResponse
            : rawResponse?.content
                ? (typeof rawResponse.content === "string" ? rawResponse.content : JSON.stringify(rawResponse.content))
                : "";

        if (!response || !response.trim()) {
            throw new Error("Agent did not return a response");
        }

        const assistantImages = Array.isArray(result?.images) ? result.images : [];
        const assistantArtifacts = Array.isArray(result?.artifacts) ? result.artifacts : [];
        const remainingCredits = typeof result?.remainingCredits === "number" ? result.remainingCredits : undefined;

        // 4. Persist assistant response (including Tavily images and artifacts) to DB and memory cache
        await axios.post(`${process.env.CHAT_SERVICE_URL}/save-message`, {
            conversationId,
            role: "assistant",
            content: response,
            images: assistantImages,
            artifacts: assistantArtifacts
        }, chatServiceConfig);
        await addMessages(conversationId, "assistant", response, userId, assistantImages);

        return res.status(200).json({
            answer: response,
            response,
            agent: result?.agent,
            images: assistantImages,
            artifacts: assistantArtifacts,
            credits: remainingCredits
        });
    } catch (error) {
        console.error("Error in agent controller:", error);
        return res.status(500).json({ error: "Failed to process request" });
    }
};
