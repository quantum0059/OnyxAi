import { getModel } from "../config/llmModels.js";
import { getMemory } from "../config/memory.js";
import { AIMessage, HumanMessage, SystemMessage } from "@langchain/core/messages";

export const pdfAgent = async (state) => {
    const llm = await getModel("chat");
    const history = await getMemory(state.conversationId, state.userId);
    const systemPrompt = `You are CortexAI Document Assistant, specialized in reading, analyzing, summarizing, and extracting key insights from documents.`;

    const messages = [
        new SystemMessage(systemPrompt),
        ...history.map(({ role, content }) => {
            const textContent = typeof content === "string" ? content : JSON.stringify(content);
            return role === "user" ? new HumanMessage(textContent) : new AIMessage(textContent);
        })
    ];

    const hasCurrentPrompt = history.some(m => m.role === "user" && m.content === state.prompt);
    if (!hasCurrentPrompt && state.prompt) {
        messages.push(new HumanMessage(state.prompt));
    }

    const response = await llm.invoke(messages);
    const aiContent = typeof response?.content === "string"
        ? response.content
        : JSON.stringify(response?.content ?? "");

    return {
        ...state,
        aiResponse: aiContent
    };
};
