import { getModel } from "../config/llmModels.js";
import { getMemory } from "../config/memory.js";
import { generatedPdf } from "../utils/generatePdf.js";
import { uploadToS3 } from "../utils/uplodeToS3.js";
import { getFromS3 } from "../utils/getFromS3.js";
import crypto from "crypto";

/**
 * Extracts and parses JSON from model output safely.
 */
function extractJson(text) {
    if (!text) return null;
    let cleaned = text.replace(/```(?:json)?\s*/gi, "").replace(/```/g, "").trim();
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start === -1 || end <= start) return null;
    try {
        return JSON.parse(cleaned.slice(start, end + 1));
    } catch {
        return null;
    }
}

export const pdfAgent = async (state) => {
    try {
        const llm = await getModel("pdf");
        const userPrompt = state.prompt || state.userRequest || "";

        // Retrieve recent history for context
        let recentContext = "";
        if (state.conversationId && state.userId) {
            try {
                const history = await getMemory(state.conversationId, state.userId);
                const pastTurns = history
                    .filter((m) => !(m.role === "user" && m.content === userPrompt))
                    .slice(-4);
                if (pastTurns.length > 0) {
                    recentContext = pastTurns
                        .map((m) => `${m.role.toUpperCase()}: ${String(m.content).slice(0, 200)}`)
                        .join("\n");
                }
            } catch {
                // Ignore history failure
            }
        }

        const systemPrompt = `You are an expert document writer who creates clear, well-structured, professional documents.

Turn the user's request into the content of a PDF document.

Return ONLY valid JSON. No markdown, no code fences, no explanations, no text before or after the JSON.

Schema:
{
  "title": "Short, specific document title",
  "subtitle": "One line describing the purpose or audience",
  "sections": [
    {
      "heading": "Section heading",
      "points": [
        "A complete, informative sentence or two. Not a vague fragment."
      ]
    }
  ]
}

Rules:
- Follow the user's request exactly. Keep any topic, tone, length, or section they specify.
- If the request is vague, make reasonable assumptions and write a useful, general document.
- Use 3 to 6 sections in a logical order (e.g. Introduction, Key Areas, Implementation, Next Steps).
- Each section should have 2 to 5 bullet points with clear, factual information.
- Do not use markdown symbols (#, *, -) inside JSON strings.
- Escape double quotes properly.

${recentContext ? `Recent conversation context:\n${recentContext}\n\n` : ""}User Request:
${userPrompt}`;

        const res = await llm.invoke(systemPrompt);
        const rawContent = typeof res?.content === "string" ? res.content : JSON.stringify(res?.content || "");
        const docData = extractJson(rawContent);

        if (!docData || !docData.title) {
            throw new Error("Failed to generate structured document data from LLM");
        }

        // 1. Generate PDF buffer via PDFKit
        const pdfBuffer = await generatedPdf(docData);

        // 2. Upload to S3
        const safeTitle = (docData.title || "document")
            .toLowerCase()
            .replace(/[^a-z0-9]/g, "-")
            .slice(0, 30);
        const filename = `pdf-${safeTitle}-${Date.now()}-${crypto.randomBytes(3).toString("hex")}.pdf`;

        await uploadToS3(filename, pdfBuffer, "application/pdf");

        // 3. Generate presigned URL (valid for 24 hours)
        const downloadUrl = await getFromS3(filename, 86400);

        // Clean conversational summary for chat area (like Claude)
        const summaryParagraphs = (docData.sections || [])
            .map((sec) => `**${sec.heading}**: ${(sec.points || []).slice(0, 2).join(" ")}`)
            .join("\n\n");

        const chatSummary = [
            `Your PDF **${docData.title}.pdf** has been generated and is ready to view.`,
            docData.subtitle ? `*${docData.subtitle}*` : "",
            summaryParagraphs,
            `You can view the full document and download it directly from the artifact panel on the right.`
        ].filter(Boolean).join("\n\n");

        return {
            ...state,
            aiResponse: chatSummary,
            artifacts: [
                {
                    id: Date.now(),
                    type: "PDF",
                    title: `${docData.title}.pdf`,
                    url: downloadUrl,
                    files: [
                        {
                            name: `${safeTitle}.pdf`,
                            url: downloadUrl,
                            content: downloadUrl
                        }
                    ]
                }
            ]
        };
    } catch (error) {
        console.error("Error in pdfAgent:", error);
        return {
            ...state,
            aiResponse: "I encountered an error generating your PDF document. Please try again with a more specific description.",
            artifacts: []
        };
    }
};
