import { Annotation } from "@langchain/langgraph";

export const agentsState = Annotation.Root({
    prompt: Annotation(),
    aiResponse: Annotation(),
    agent: Annotation()
})

