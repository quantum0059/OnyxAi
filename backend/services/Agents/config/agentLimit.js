import redis from "../../../shared/redis.js"

const Limits = {
    chat: 20,
    coding: 5,
    pdf: 5,
    pdfRag: 5,
    "pdf-rag": 5,
    ppt: 5,
    image: 3,
    imageAnalyzer: 3,
    search: 5,
    vision: 3,
}

// Normalize agent name to a Limits key
const resolveAgent = (agent) => {
    const name = (agent || "chat").toLowerCase();
    if (name === "pdfrag" || name === "pdf-rag") return "pdfRag";
    if (name === "imageanalyzer") return "imageAnalyzer";
    return agent in Limits ? agent : "chat";
};

export const checkAgentLimit = async (userId, agent) => {
    const resolved = resolveAgent(agent);
    const max = Limits[resolved] ?? Limits["chat"];
    const key = `rate:${userId}:${resolved}`

    const count = await redis.incr(key)

    if (count == 1) {
        await redis.expire(key, 60)
    }

    const ttl = await redis.ttl(key)

    if (count > max) {
        const minutes = Math.floor(ttl / 60)
        const seconds = (ttl % 60)
        const time = minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`

        const error = new Error(`Rate limit exceeded for ${resolved}.`)
        error.status = 429
        error.data = {
            success: false,
            agent: resolved,
            limit: max,
            remainingTime: ttl,
            retryAfter: time,
            message: `You have reached the ${resolved} limit (${max} requests/min). Try again in ${time}`
        }

        throw error
    }

    return {
        remaining: max - count,
        limit: max
    }
}