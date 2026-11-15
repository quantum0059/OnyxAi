import fs from "fs";
import { createRequire } from "module";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { SystemMessage, HumanMessage } from "@langchain/core/messages";
import { vectorStore, getExistingVectorStore } from "../config/vectorDb.js";
import { getModel } from "../config/llmModels.js";
import { deductCredits } from "../utils/deductCredits.js";
import redis from "../../../shared/redis.js";

const require = createRequire(import.meta.url);
const { PDFParse } = require("pdf-parse");

export const pdfRag = async (state) => {
    try {
        let context = "";
        let deductRes = null;
        const cleanConvoId = String(state.conversationId || Date.now()).replace(/[^a-zA-Z0-9_-]/g, "");
        const collectionName = `pdf-${cleanConvoId}`;

        if (state.file && state.file.path) {
            // ── Case 1: PDF File Uploaded ──
            const buffer = fs.readFileSync(state.file.path);
            const parser = new PDFParse({ data: buffer });
            await parser.load();
            const result = await parser.getText();
            // result.text is the full text; strip the "-- N of M --" page markers
            const rawText = result?.text || "";
            const text = rawText.replace(/--\s*\d+\s*of\s*\d+\s*--/g, "").trim();

            const splitter = new RecursiveCharacterTextSplitter({
                chunkSize: 1500,
                chunkOverlap: 300,
            });

            const docs = await splitter.createDocuments([text || "Empty PDF document"]);

            const store = await vectorStore(docs, collectionName);

            // Store active collection for this conversation in Redis
            if (state.conversationId) {
                await redis.set(`pdf_col:${state.conversationId}`, collectionName, "EX", 7 * 24 * 60 * 60);
            }

            const query = (typeof state.prompt === "string" && state.prompt.trim())
                ? state.prompt.trim()
                : "Summarize this document and highlight its key points.";

            const revelentDocs = await store.similaritySearch(query, 12);
            context = revelentDocs.map((doc) => doc.pageContent).join("\n\n");

            // Deduct 10 credits when the PDF is uploaded
            deductRes = await deductCredits(state.userId, "pdf", 10);
        } else {
            // ── Case 2: Chatting with already uploaded PDF contents ──
            const activeCol = (state.conversationId ? await redis.get(`pdf_col:${state.conversationId}`) : null) || collectionName;
            const store = await getExistingVectorStore(activeCol);

            const query = (typeof state.prompt === "string" && state.prompt.trim())
                ? state.prompt.trim()
                : "Summarize this document.";

            const revelentDocs = await store.similaritySearch(query, 12);
            context = revelentDocs.map((doc) => doc.pageContent).join("\n\n");

            // Deduct 1 credit per message when talking from the contents
            deductRes = await deductCredits(state.userId, "chat", 1);
        }

        const llm = await getModel("pdf-rag");

        const messages = [
            new SystemMessage(`You are CortexAI PDF Assistant — an expert document analyst similar to Claude or ChatGPT.

Your job is to deeply analyze the provided PDF context and answer questions thoroughly.

Rules:
- Answer ONLY from the provided Context below.
- Give COMPREHENSIVE, DETAILED answers — never one-liners unless the user asks for brevity.
- Structure your answers with Markdown: use headings (##), bullet points, bold (**term**), and code blocks when relevant.
- When asked "what is this PDF / what does it contain" — give a full structured overview: topic, sections, key concepts, any notable data or examples.
- When asked about concepts, explain them fully with examples from the document.
- When asked for questions/exercises, generate them from the document content.
- Never hallucinate. Never fabricate information not in the context.
- If the information is genuinely missing from the PDF context, say: "This information is not covered in the uploaded PDF."`),
            new HumanMessage(`Here is the relevant content from the PDF:

---
${context}
---

User Question: ${state.prompt || "Give me a full overview of this PDF document — what it covers, its key topics, and any important details."}`)
        ];

        const response = await llm.invoke(messages);

        return {
            ...state,
            aiResponse: response.content,
            remainingCredits: deductRes?.credits
        };
    } catch (error) {
        console.error("Error in pdfRag agent:", error);
        return {
            ...state,
            aiResponse: "I encountered an error processing the PDF document. Please try again."
        };
    } finally {
        if (state.file?.path) {
            try {
                await fs.promises.unlink(state.file.path);
            } catch (err) {
                // Ignore unlink error if already removed
            }
        }
    }
};

export const pdfRagAgent = pdfRag;
