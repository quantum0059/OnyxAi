import { ChatGroq } from "@langchain/groq"
import { ChatGoogleGenerativeAI } from "@langchain/google-genai"
import { ChatOpenRouter } from "@langchain/openrouter";
const groq = new ChatGroq({
    model: "openai/gpt-oss-120b"
})

const gemini = new ChatGoogleGenerativeAI({
    model: "gemini-2.5-flash"
})

const deepSeek = new ChatOpenRouter({
    model: "deepseek/deepseek-chat",
    temperature: 0,
    maxTokens: 6000,  // project generation needs room for 3 full files
});

export const getModel = async (agent) => {
    switch (agent) {
        case "chat":
            return groq;
        case "search":
            return groq;
        case "coding":
            return deepSeek;
        case "pdf":
            return groq;
        case "ppt":
            return groq;
        default:
            return groq;
    }
}