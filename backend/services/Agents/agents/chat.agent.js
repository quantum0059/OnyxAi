import { getModel } from "../config/llmModels.js";
import { getMemory } from "../config/memory.js";
import { AIMessage, HumanMessage, SystemMessage } from "@langchain/core/messages";

export const chatAgent = async (state) => {
    const llm = await getModel("chat");

    const history = await getMemory(state.conversationId, state.userId);

    let searchContext = "";
    if (state.searchResults) {
        if (Array.isArray(state.searchResults)) {
            const snippets = state.searchResults.slice(0, 4).map((r, i) =>
                `[${i + 1}] ${r.title || "Source"}: ${r.content ? r.content.slice(0, 450) : ""}`
            ).join("\n\n");
            searchContext = `Web Search Results:\n${snippets}\n\nAnswer the user using the above verified search results.`;
        } else if (typeof state.searchResults === "string") {
            searchContext = `Web Search Results:\n${state.searchResults.slice(0, 1600)}`;
        } else {
            searchContext = `Web Search Results:\n${JSON.stringify(state.searchResults).slice(0, 1600)}`;
        }
    }

    const systemPrompt = `You are OnyxAi, an intelligent AI assistant.

        ${searchContext}

        if searchContext exists:
        -Use search results to answer
        -Do not mention internal tools.

        
        Rules:
        For simple questions, greetings, and short queries, respond naturally in plain text.
        For technical, educational, coding, or detailed topics, use clean Markdown.
        Formatting:
        Use # for titles and ## for sections.
        Leave a blank line after headings.
        Use bullet points for lists.
        Use numbered lists for steps.
        Use fenced code blocks with language tags for code.
        Keep paragraphs short and readable.
        Never write headings and content on the same line. Never generate large walls of text.`;

    const messages = [
        new SystemMessage(systemPrompt),
        ...history.map(({ role, content }) => {
            const textContent = typeof content === "string" ? content : JSON.stringify(content);
            return role === "user" ? new HumanMessage(textContent) : new AIMessage(textContent);
        })
    ];

    // Safety fallback: if prompt is missing from history, ensure it is sent to the LLM
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
        aiResponse: aiContent,
        images: Array.isArray(state?.images) ? state.images : []
    };
};

