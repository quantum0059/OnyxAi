import { StateGraph } from "@langchain/langgraph";
import { agentsState } from "./state.js";
import { router } from "./router.js";
import { chatAgent } from "../agents/chat.agent.js";
import { searchAgent } from "../agents/search.agent.js";
import { codingAgent } from "../agents/coding.agent.js";
import { pdfAgent } from "../agents/pdf.agent.js";
import { pptAgent } from "../agents/ppt.agent.js";
import { visionAgent } from "../agents/vision.agent.js";
import { pdfRagAgent } from "../agents/pdfRag.agent.js";
import { imageAnalyzerAgent } from "../agents/imageAnalyzer.agent.js";

const workFlow = new StateGraph(agentsState)

workFlow.addNode("router", router)
workFlow.addNode("chat", chatAgent)
workFlow.addNode("search", searchAgent)
workFlow.addNode("coding", codingAgent)
workFlow.addNode("pdf", pdfAgent)
workFlow.addNode("ppt", pptAgent)
workFlow.addNode("vision", visionAgent)
workFlow.addNode("pdfRag", pdfRagAgent)
workFlow.addNode("imageAnalyzer", imageAnalyzerAgent)


workFlow.addEdge("__start__", "router")
workFlow.addConditionalEdges("router", (state) => {
    switch (state.agent) {
        case "chat":
            return "chat";
        case "search":
            return "search";
        case "coding":
            return "coding"
        case "pdf":
            return "pdf";
        case "ppt":
            return "ppt";
        case "vision":
            return "vision"
        case "pdfRag":
            return "pdfRag"
        case "imageAnalyzer":
            return "imageAnalyzer"

        default:
            break;
    }
}, {
    chat: "chat",
    search: "search",
    coding: "coding",
    pdf: "pdf",
    ppt: "ppt",
    vision: "vision",
    pdfRag: "pdfRag",
    imageAnalyzer: "imageAnalyzer"
})

workFlow.addEdge("search", "chat")
workFlow.addEdge("chat", "__end__")
workFlow.addEdge("pdf", "__end__")
workFlow.addEdge("ppt", "__end__")
workFlow.addEdge("coding", "__end__")
workFlow.addEdge("vision", "__end__")
workFlow.addEdge("pdfRag", "__end__")
workFlow.addEdge("imageAnalyzer", "__end__")

//now we have to compile the whole workflow

export const graph = workFlow.compile();

