import { getModel } from "../config/llmModels.js";
import axios from "axios";
import crypto from "crypto";
import { uploadToS3 } from "../utils/uplodeToS3.js";
import { getFromS3 } from "../utils/getFromS3.js";

export const visionAgent = async (state) => {
    try {
        const llm = await getModel("chat");

        const res = await llm.invoke(`
            You are an expert image prompt engineer.

            Rewrite the user's request as a single, detailed prompt for an image generation model.

            Rules:
            - Preserve everything the user specified (subject, style, mood, colors). Never contradict it.
            - Fill in missing details: setting, composition, camera angle or framing, lighting, color palette, and mood.
            - Match the style the user asked for. Only default to photorealistic if no style is given.
            - Describe the scene in natural, concrete language rather than a list of quality buzzwords.
            - If the user wants text in the image, include it in quotes exactly as given.
            - Keep the prompt under 120 words.

            Return only the final prompt, with no explanation or quotation marks.

            User request:
            ${state.prompt}
        `);

        const promptText = typeof res?.content === "string" ? res.content.trim() : state.prompt;
        const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(promptText)}`;

        // Download generated image buffer
        const imageRes = await axios.get(imageUrl, {
            responseType: "arraybuffer",
            timeout: 30000
        });

        // Upload to S3
        const filename = `vision-${Date.now()}-${crypto.randomBytes(4).toString("hex")}.jpg`;
        await uploadToS3(filename, Buffer.from(imageRes.data), "image/jpeg");

        // Generate signed URL valid for 24 hours
        const signedUrl = await getFromS3(filename, 86400);

        return {
            ...state,
            aiResponse: `Here is the image generated based on your prompt:\n\n> *"${promptText}"*`,
            images: [signedUrl]
        };
    } catch (error) {
        console.error("Error in visionAgent:", error);
        return {
            ...state,
            aiResponse: "I encountered an error generating or uploading the image. Please try again.",
            images: []
        };
    }
};
