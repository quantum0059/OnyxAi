import axios from 'axios';
import fs from 'fs';
import crypto from 'crypto';
import { graph } from '../graph/graph.js';
import { addMessages } from '../config/memory.js';
import { checkAgentLimit } from '../config/agentLimit.js';
import { uploadToS3 } from '../utils/uplodeToS3.js';
import { getFromS3 } from '../utils/getFromS3.js';

export const agent = async (req, res, next) => {
    try {
        const { prompt, conversationId, agent: selectedAgent, images } = req.body;
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
        const userImages = Array.isArray(images) ? [...images] : (images ? [images] : []);
        const chatServiceConfig = {
            headers: { "x-user-id": userId },
        };

        // If user attached a file (image or document), persist a copy to S3 for permanent access in chat history
        let uploadedFileUrl = undefined;
        if (file && file.path) {
            try {
                const fileBuffer = await fs.promises.readFile(file.path);
                const safeName = (file.originalname || "file").replace(/[^a-zA-Z0-9.-]/g, "_");
                const s3Key = `uploads/${Date.now()}-${crypto.randomBytes(4).toString("hex")}-${safeName}`;
                await uploadToS3(s3Key, fileBuffer, file.mimetype || "application/octet-stream");
                uploadedFileUrl = await getFromS3(s3Key, 604800); // 7 days (SigV4 max)

                if (file.mimetype?.startsWith("image/")) {
                    userImages.push(uploadedFileUrl);
                }
            } catch (uploadErr) {
                console.error("Failed to upload file to S3:", uploadErr);
            }
        }

        // 1. Persist user turn (including any uploaded images and file attachment) to Chat service database
        await axios.post(`${process.env.CHAT_SERVICE_URL}/save-message`, {
            conversationId,
            role: "user",
            content: cleanPrompt,
            images: userImages,
            file: file ? {
                name: file.originalname,
                type: file.mimetype,
                size: file.size,
                url: uploadedFileUrl
            } : undefined
        }, chatServiceConfig);

        // 2. Add user turn to memory cache (with automatic deduplication)
        await addMessages(conversationId, "user", cleanPrompt, userId, userImages);

        // 3. Invoke agent graph (router resolves actual agent inside)
        const result = await graph.invoke({
            prompt: cleanPrompt,
            conversationId,
            userId,
            agent: selectedAgent,
            images: userImages,
            file
        });

        // 4. Rate-limit on the ACTUAL resolved agent (after router runs)
        const resolvedAgent = result?.agent || selectedAgent || "chat";
        await checkAgentLimit(userId, resolvedAgent);

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

        // 5. Persist assistant response (including Tavily images and artifacts) to DB and memory cache
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
        next(error)
    }
};
