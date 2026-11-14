import { getModel } from "../config/llmModels.js";
import { getMemory } from "../config/memory.js";
import { generatePpt } from "../utils/generatePpt.js";
import { uploadToS3 } from "../utils/uplodeToS3.js";
import { getFromS3 } from "../utils/getFromS3.js";
import { deductCredits } from "../utils/deductCredits.js";
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

/**
 * Validates slides to ensure no empty or malformed slide is rendered.
 * Filters out slides that have fewer than 2 bullets unless it's a quote layout.
 */
function validateAndCleanPptData(data) {
    if (!data || typeof data !== "object") return null;
    if (!data.title || typeof data.title !== "string") return null;

    if (!Array.isArray(data.slides)) {
        data.slides = [];
    }

    // Keep only slides with sufficient content
    data.slides = data.slides.filter((slide) => {
        if (!slide || typeof slide !== "object") return false;
        if (!slide.title || typeof slide.title !== "string") return false;
        const bullets = Array.isArray(slide.bullets)
            ? slide.bullets.filter((b) => typeof b === "string" && b.trim())
            : [];
        slide.bullets = bullets;

        // Quote slides can work with 1 quote; other layouts need at least 2 bullets
        if (slide.layout === "quote") {
            return bullets.length >= 1;
        }
        return bullets.length >= 2;
    });

    return data.slides.length > 0 ? data : null;
}

export const pptAgent = async (state) => {
    try {
        const llm = await getModel("ppt");
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
                // Ignore history retrieval error
            }
        }

        const systemPrompt = `You are an expert presentation designer who creates clear, engaging, professional slide decks.

Turn the user's request into the content of a PowerPoint presentation.

Return ONLY valid JSON. No markdown, no code fences, no explanations, no text before or after the JSON.

Schema:
{
  "title": "Short, specific presentation title",
  "subtitle": "One line describing the purpose or audience",
  "slides": [
    {
      "layout": "bullets",
      "title": "Short slide title",
      "bullets": [
        "A short, clear point of 15 words or fewer."
      ],
      "notes": "1 to 3 sentences the presenter can say for this slide."
    }
  ]
}

Allowed layout values:
- "bullets": standard title with 3 to 5 bullet points.
- "two_column": title with comparative or categorized points split across 2 columns.
- "stats": 2 or 3 metric or highlight points in format "Value: Description" (e.g. "99.9%: Target Uptime").
- "quote": a key impactful takeaway, quote, or principle with author/source in notes.
- "closing": the final slide with summary or next steps (2 to 3 bullets).

Rules:
- Follow the user's request exactly. Keep any topic, tone, slide count, or section they specify.
- Use 5 to 8 slides unless specified otherwise. Do NOT include the title slide in "slides".
- Vary the layouts naturally (e.g., bullets -> two_column -> stats or quote -> closing).
- EVERY slide MUST have at least 2 informative bullet points (except quote which has 1 or 2).
- Slide titles must be under 8 words.
- Each bullet must be 15 words or fewer. Never write whole paragraphs.
- Put longer explanations in "notes".
- Do not repeat the same idea on different slides.
- Do not use markdown symbols (#, *, -) inside JSON strings.
- Escape double quotes properly.

${recentContext ? `Recent conversation context:\n${recentContext}\n\n` : ""}User Request:
${userPrompt}`;

        let pptData = null;
        let attempts = 0;

        // Validate JSON and retry once if slides are invalid/empty
        while (!pptData && attempts < 2) {
            attempts++;
            const res = await llm.invoke(systemPrompt);
            const rawContent = typeof res?.content === "string" ? res.content : JSON.stringify(res?.content || "");
            const parsed = extractJson(rawContent);
            pptData = validateAndCleanPptData(parsed);
        }

        if (!pptData || !pptData.title) {
            throw new Error("Failed to generate valid structured presentation data with enough slide content");
        }

        // 1. Generate PPT buffer via pptxgenjs (using LAYOUT_WIDE)
        const pptBuffer = await generatePpt(pptData);

        // 2. Upload to S3
        const safeTitle = (pptData.title || "presentation")
            .toLowerCase()
            .replace(/[^a-z0-9]/g, "-")
            .slice(0, 30);
        const filename = `ppt-${safeTitle}-${Date.now()}-${crypto.randomBytes(3).toString("hex")}.pptx`;

        await uploadToS3(filename, pptBuffer, "application/vnd.openxmlformats-officedocument.presentationml.presentation");

        // 3. Generate presigned URL (valid for 24 hours)
        const downloadUrl = await getFromS3(filename, 86400);

        // Slide outline summary for chat area
        const slidesCount = Array.isArray(pptData.slides) ? pptData.slides.length + 1 : 1;
        const slidesOverview = (pptData.slides || [])
            .map((slide, i) => `**Slide ${i + 2}: ${slide.title}** (${slide.layout || "bullets"})\n${(slide.bullets || []).map((b) => `• ${b}`).join("\n")}`)
            .join("\n\n");

        const chatSummary = [
            `Your **${slidesCount}-slide presentation** on **${pptData.title}** has been generated and is ready to view.`,
            pptData.subtitle ? `*${pptData.subtitle}*\n` : "",
            `### Deck Outline`,
            slidesOverview,
            `\nYou can view and download the full **.pptx** file directly from the artifact panel on the right.`
        ].filter(Boolean).join("\n\n");

        const deductRes = await deductCredits(state.userId, "ppt");

        return {
            ...state,
            aiResponse: chatSummary,
            remainingCredits: deductRes?.credits,
            artifacts: [
                {
                    id: Date.now(),
                    type: "Presentation",
                    title: `${pptData.title}.pptx`,
                    url: downloadUrl,
                    files: [
                        {
                            name: `${safeTitle}.pptx`,
                            url: downloadUrl,
                            content: downloadUrl
                        }
                    ]
                }
            ]
        };
    } catch (error) {
        console.error("Error in pptAgent:", error);
        return {
            ...state,
            aiResponse: "I encountered an error generating your PowerPoint presentation. Please try again with a more specific description.",
            artifacts: []
        };
    }
};
