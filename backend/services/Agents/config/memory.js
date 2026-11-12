import redis from "../../../shared/redis.js";
import { getMessages } from "../utils/getMessages.js";

export const getMemory = async (conversationId, userId) => {
    if (!conversationId) return [];
    const key = `messages-${conversationId}`;

    // 1. Check Redis cache with fallback
    try {
        const cached = await redis.get(key);
        if (cached) {
            const parsed = JSON.parse(cached);
            if (Array.isArray(parsed)) {
                return parsed;
            }
        }
    } catch (err) {
        console.warn("Redis getMemory warning, falling back to database:", err.message);
    }

    // 2. Fall back to Chat service database
    try {
        const messages = await getMessages(conversationId, userId);
        const safeMessages = Array.isArray(messages) ? messages : [];

        // Warm up Redis cache in the background
        redis.set(key, JSON.stringify(safeMessages), "EX", 24 * 60 * 60).catch((e) => {
            console.warn("Redis set cache warning:", e.message);
        });

        return safeMessages;
    } catch (err) {
        console.error("Failed to load memory:", err.message);
        return [];
    }
};

// Saves the latest 20 messages in memory with deduplication
export const addMessages = async (conversationId, role, content, userId, images = []) => {
    if (!conversationId) return [];
    const key = `messages-${conversationId}`;

    const messages = await getMemory(conversationId, userId);
    const safeMessages = Array.isArray(messages) ? [...messages] : [];
    const safeImages = Array.isArray(images) ? images : (images ? [images] : []);

    // Deduplication check: prevent appending duplicate consecutive identical messages
    const lastMsg = safeMessages[safeMessages.length - 1];
    if (!lastMsg || lastMsg.role !== role || lastMsg.content !== content) {
        safeMessages.push({ role, content, images: safeImages });
    }

    const trimmed = safeMessages.slice(-20);

    try {
        await redis.set(key, JSON.stringify(trimmed), "EX", 24 * 60 * 60);
    } catch (err) {
        console.warn("Redis addMessages warning:", err.message);
    }

    return trimmed;
};

export const clearMemory = async (conversationId) => {
    if (!conversationId) return;
    const key = `messages-${conversationId}`;
    try {
        await redis.del(key);
    } catch (err) {
        console.warn("Redis clearMemory warning:", err.message);
    }
};

