import { getModel } from "../config/llmModels.js";
import { SystemMessage, HumanMessage } from "@langchain/core/messages";

const VALID_AGENTS = ["chat", "search", "coding", "pdf", "ppt", "vision"];

export const router = async (state) => {
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
   - Tasks involving PDF files, reading, summarizing, analyzing, extracting text from, or asking questions about PDF documents.

5. "ppt":
   - Requests related to creating, outlining, structuring, formatting, or designing PowerPoint presentations or slide decks.

6. "vision":
   - Requests involving images, photos, OCR, describing visual content, or answering questions about pictures.

Instructions:
- Analyze the user prompt carefully.
- Return ONLY a valid JSON object in this exact format:
{"agent": "<chosen_agent>"}
- The value of "agent" MUST be one of: "chat", "search", "coding", "pdf", "ppt", "vision".
- Do not output any explanation, markdown fences, or extra text.`;

    const userPrompt = typeof state.prompt === "string"
        ? state.prompt
        : JSON.stringify(state.prompt);

    const response = await llm.invoke([
        new SystemMessage(systemPrompt),
        new HumanMessage(userPrompt),
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
