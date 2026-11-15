import { getModel } from "../config/llmModels.js";
import { getMemory } from "../config/memory.js";
import { SystemMessage, HumanMessage } from "@langchain/core/messages";
import redis from "../../../shared/redis.js";

const VALID_AGENTS = ["chat", "search", "coding", "pdf", "ppt", "vision", "pdfRag", "imageAnalyzer"];

export const router = async (state) => {
    // 1. File-based routing: if a file is attached, route directly based on MIME type
    const mimeType = state.file?.mimetype || state.file?.mimeType;
    if (mimeType) {
        if (mimeType === "application/pdf") {
            return { agent: "pdfRag" };
        }
        if (mimeType.startsWith("image/")) {
            return { agent: "imageAnalyzer" };
        }
    }

    // 2. If user is in an active PDF RAG conversation, route follow-up messages to pdfRag
    if (state.conversationId) {
        try {
            const hasPdfCol = await redis.get(`pdf_col:${state.conversationId}`);
            if (hasPdfCol && (!state.agent || state.agent === "auto" || state.agent === "pdf" || state.agent === "pdfrag")) {
                return { agent: "pdfRag" };
            }
        } catch {}
    }

    // If an agent is already explicitly selected and not "auto", bypass LLM routing
    if (state.agent && state.agent !== "auto") {
        const targetAgent = String(state.agent).toLowerCase().trim();
        const normalized = targetAgent === "image" ? "vision" : targetAgent;
        if (VALID_AGENTS.includes(normalized)) {
            return { agent: normalized };
        }
    }

    const llm = await getModel("router");

    // Router brain prompt to classify which agent should handle the user's request
    const systemPrompt = `You are an expert request router in a multi-agent AI system.
Your job is to analyze the user's input and classify it into exactly one of the following agent categories:

1. "chat":
   - General conversation, greetings, casual talk, explanations, brainstorming, creative writing, or general knowledge that does not require live web search or coding.

2. "search":
   - Queries requiring real-time information, breaking news, recent events, weather, stock prices, or questions that require an up-to-date web search.

3. "coding":
   - Programming tasks, writing code, debugging, refactoring, algorithms, technical design, script creation, software engineering, or syntax troubleshooting.

4. "pdf":
   - Requests to generate, create, design, or write a PDF document or file (e.g., "generate a pdf", "create a pdf document", "make a pdf on topic X"). Also tasks reading, analyzing, or extracting text from PDF files.

5. "ppt":
   - Requests related to creating, outlining, structuring, formatting, or designing PowerPoint presentations or slide decks.

6. "vision":
   - Requests to generate an image or picture (e.g. "generate an image", "create a picture of X"), or tasks analyzing, describing, performing OCR, or inspecting visual media. Do NOT select vision for PDF, document, or slide deck requests.

Instructions:
- Analyze the user prompt carefully, taking into account any recent conversation history for context on follow-up questions.
- Return ONLY a valid JSON object in this exact format:
{"agent": "<chosen_agent>"}
- The value of "agent" MUST be one of: "chat", "search", "coding", "pdf", "ppt", "vision".
- Do not output any explanation, markdown fences, or extra text.`;

    const userPrompt = typeof state.prompt === "string"
        ? state.prompt
        : JSON.stringify(state.prompt);

    // Provide recent context for follow-up questions
    let promptWithContext = userPrompt;
    if (state.conversationId && state.userId) {
        try {
            const history = await getMemory(state.conversationId, state.userId);
            const pastTurns = history
                .filter(m => !(m.role === "user" && m.content === userPrompt))
                .slice(-4);
            if (pastTurns.length > 0) {
                const contextSummary = pastTurns
                    .map(m => `${m.role}: ${m.content.slice(0, 120)}`)
                    .join("\n");
                promptWithContext = `Recent conversation context:\n${contextSummary}\n\nCurrent user request:\n${userPrompt}`;
            }
        } catch {
            // If fetching memory fails, proceed with just userPrompt
        }
    }

    const response = await llm.invoke([
        new SystemMessage(systemPrompt),
        new HumanMessage(promptWithContext),
    ]);


    let selectedAgent = "chat";

    try {
        const rawContent = typeof response.content === "string"
            ? response.content
            : JSON.stringify(response.content);

        // Strip markdown backticks if returned (e.g. ```json ... ```)
        const cleaned = rawContent
            .replace(/```(?:json)?/gi, "")
            .replace(/```/g, "")
            .trim();

        const parsed = JSON.parse(cleaned);

        if (parsed.agent && VALID_AGENTS.includes(parsed.agent.toLowerCase())) {
            selectedAgent = parsed.agent.toLowerCase();
        }
    } catch {
        // Fallback: check if any valid agent name was mentioned directly in the response
        const rawText = String(response.content || "").toLowerCase();
        const matched = VALID_AGENTS.find((agent) => rawText.includes(agent));
        if (matched) {
            selectedAgent = matched;
        }
    }

    return { agent: selectedAgent };
};
