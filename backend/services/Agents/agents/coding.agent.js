import { getModel } from "../config/llmModels.js";
import { getMemory } from "../config/memory.js";

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────
const MIN_ARTIFACT_LINES = 15; // code blocks shorter than this stay inline in chat
const MAX_CONTEXT_CHARS = 300;
const MAX_GENERATION_ATTEMPTS = 3;

// PROJECT_GENERATION = websites / UIs / multi-file apps (JSON -> artifact)
// CODE_SNIPPET       = functions, algorithms, scripts, small programs (markdown)
const INTENTS = [
    "PROJECT_GENERATION",
    "CODE_SNIPPET",
    "CODE_REVIEW",
    "CODE_EXPLANATION",
    "DEBUGGING",
    "OPTIMIZATION",
    "CONVERSION",
    "DOCUMENTATION"
];

const EXT_MAP = {
    javascript: "js", js: "js", typescript: "ts", ts: "ts",
    jsx: "jsx", tsx: "tsx", python: "py", py: "py",
    html: "html", css: "css", json: "json", yaml: "yml", yml: "yml",
    bash: "sh", shell: "sh", sh: "sh", sql: "sql",
    markdown: "md", md: "md",
    java: "java", kotlin: "kt", swift: "swift",
    c: "c", cpp: "cpp", "c++": "cpp", csharp: "cs", "c#": "cs",
    go: "go", rust: "rs", ruby: "rb", php: "php"
};

// Shared output contract: injected into every prompt that may return code.
const OUTPUT_RULES = `Output rules (important):
- Put the complete final code in ONE fenced block with a language tag.
- NEVER repeat that code anywhere else in the reply: not in prose, not in a recap, not as a diff.
- Do not paste the user's original code back. If you must point at a line, quote at most ${MIN_ARTIFACT_LINES - 1} lines.
- Refer to code by name (for example "the partition function") instead of quoting it.
- Write the surrounding explanation as normal Markdown with real line breaks.`;

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

/** Normalizes LLM message content (string or array of parts) to plain text */
function toText(content) {
    if (typeof content === "string") return content;
    if (Array.isArray(content)) {
        return content.map(p => (typeof p === "string" ? p : p?.text || "")).join("");
    }
    return "";
}

/** Safely extracts JSON from model output — handles markdown fences, preamble text, trailing junk */
function extractJson(text) {
    if (!text) return null;

    // Strip ALL markdown code fences (```json ... ``` or ``` ... ```)
    let cleaned = text.replace(/```(?:json)?\s*/gi, "").replace(/```/g, "").trim();

    // Find the outermost { ... } block
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start === -1 || end <= start) return null;

    const jsonStr = cleaned.slice(start, end + 1);

    // Attempt 1: direct parse
    try { return JSON.parse(jsonStr); } catch { /* fall through */ }

    // Attempt 2: fix unescaped newlines inside string values
    try {
        const fixed = jsonStr.replace(/(?<=:\s*")([\s\S]*?)(?="[\s,\}\]])/g, (m) =>
            m.replace(/\n/g, "\\n").replace(/\r/g, "\\r").replace(/\t/g, "\\t")
        );
        return JSON.parse(fixed);
    } catch { /* fall through */ }

    // Attempt 3: aggressive — remove everything after the last valid }
    try {
        // Walk backwards to find a valid end
        for (let i = end; i >= start; i--) {
            if (cleaned[i] === "}") {
                try { return JSON.parse(cleaned.slice(start, i + 1)); } catch { /* keep trying */ }
            }
        }
    } catch { /* fall through */ }

    return null;
}

/** Keeps only well-formed { name, content } files */
function validFiles(files) {
    if (!Array.isArray(files)) return [];
    return files.filter(
        f => f && typeof f.name === "string" && f.name.trim() &&
            typeof f.content === "string" && f.content.trim()
    );
}

/** Picks a filename from the language tag; Java files are named after their public type */
function inferFileName(lang, code, defaultName) {
    const dot = defaultName.lastIndexOf(".");
    const base = dot > 0 ? defaultName.slice(0, dot) : defaultName;
    const defaultExt = dot > 0 ? defaultName.slice(dot + 1) : "txt";
    const ext = EXT_MAP[(lang || "").toLowerCase()] || defaultExt;

    if (ext === "java") {
        const m = code.match(/public\s+(?:final\s+|abstract\s+)?(?:class|interface|enum|record)\s+(\w+)/);
        if (m) return `${m[1]}.java`;
    }
    return `${base}.${ext}`;
}

/**
 * Moves long code blocks out of the chat text and into artifact files.
 * Returns the chat text (with a pointer where each block was) plus the files.
 * Blocks shorter than MIN_ARTIFACT_LINES stay inline.
 */
function splitCodeFromResponse(text, defaultName) {
    if (!text) return { chatText: "", files: [] };

    const files = [];
    const usedNames = new Set();

    const chatText = text.replace(
        /```([\w+#-]*)[^\n]*\r?\n([\s\S]*?)```/g,
        (block, lang, code) => {
            const trimmed = code.trim();
            if (trimmed.split("\n").length < MIN_ARTIFACT_LINES) return block;

            let name = inferFileName(lang, trimmed, defaultName);
            if (usedNames.has(name)) {
                const dot = name.lastIndexOf(".");
                name = `${name.slice(0, dot)}_${usedNames.size + 1}${name.slice(dot)}`;
            }
            usedNames.add(name);
            files.push({ name, content: trimmed });

            return `> 📄 **${name}** is available in the artifact panel.`;
        }
    );

    return { chatText: chatText.trim(), files };
}

/** Loads the last few turns for follow-up requests (non-blocking) */
async function loadRecentContext(state) {
    if (!state.conversationId || !state.userId) return "";
    try {
        const history = await getMemory(state.conversationId, state.userId);
        const pastTurns = history
            .filter(m => !(m.role === "user" && m.content === state.prompt))
            .slice(-4);
        return pastTurns
            .map(m => `${m.role.toUpperCase()}: ${String(m.content).slice(0, MAX_CONTEXT_CHARS)}`)
            .join("\n\n");
    } catch {
        return "";
    }
}

/**
 * Classifies the request. Definitions + examples keep "write me some code"
 * requests from being mistaken for website/project requests.
 * Falls back to CODE_SNIPPET (the safe, lightweight path) if unrecognized.
 */
async function classifyIntent(intentLlm, prompt, recentContext) {
    const intentPrompt = `You are an intent classifier for a coding assistant.
Return ONLY one label from the list below, with no other text.

PROJECT_GENERATION: The user wants a website, web page, landing page, UI, dashboard, or multi-file web app that will be built and previewed.
  Examples: "build a portfolio website", "create a todo app UI", "make a landing page for my cafe"
CODE_SNIPPET: The user wants a function, algorithm, class, script, query, or small program in ANY language. This is the label for any "write / give me code" request that is not a website or app UI.
  Examples: "give me code to sort an array", "reverse a linked list in Java", "python script to rename files", "binary search"
CODE_REVIEW: The user pasted code and wants it reviewed.
CODE_EXPLANATION: The user wants code or a concept explained.
DEBUGGING: The user has a bug, error message, or stack trace.
OPTIMIZATION: The user wants existing code made faster or more efficient.
CONVERSION: The user wants code translated to another language or framework.
DOCUMENTATION: The user wants docs, docstrings, or a README for code.

If you are unsure between PROJECT_GENERATION and CODE_SNIPPET, choose CODE_SNIPPET.

${recentContext ? `Recent Context:\n${recentContext}\n\n` : ""}User Input:
${prompt}`;

    const res = await intentLlm.invoke(intentPrompt);
    const normalized = toText(res?.content).trim().toUpperCase().replace(/[\s-]+/g, "_");

    return (
        INTENTS.find(i => normalized === i) ??
        INTENTS.find(i => normalized.includes(i)) ??
        "CODE_SNIPPET"
    );
}

function buildPrompt({ role, task, inputLabel, structure }, recentContext, userPrompt) {
    return `${role}
${task}

${OUTPUT_RULES}

${recentContext ? `Recent Context:\n${recentContext}\n\n` : ""}${inputLabel}:
${userPrompt}

Structure your response with clean Markdown:
${structure}`;
}

// ─────────────────────────────────────────────────────────────
// Intent configuration (markdown-based intents)
// defaultFile: null means the answer is prose only (no artifact)
// ─────────────────────────────────────────────────────────────
const MARKDOWN_INTENTS = {
    CODE_SNIPPET: {
        role: "You are CortexAI Senior Software Engineer.",
        task: `Answer the request with the simplest correct code, the way a concise expert would.
- Use the language the user named. If none is named, use JavaScript.
- Do NOT create web pages, HTML, CSS, or UI unless the user explicitly asks for them.
- Keep the code minimal: no frameworks, no extra boilerplate, no unrequested features.
- Include a tiny usage example with the expected output as a comment.`,
        inputLabel: "User Request",
        structure: `1. One short sentence introducing the solution.
2. The code in one fenced block.
3. 2 to 4 short bullet points: key behavior, complexity or gotchas, and alternatives if useful.
Keep the whole reply brief.`,
        defaultFile: "code.js",
        artifactType: "Code"
    },
    CODE_REVIEW: {
        role: "You are CortexAI Senior Staff Software Engineer and Code Reviewer.",
        task: "Perform a thorough, constructive, and actionable code review.",
        inputLabel: "User Code to Review",
        structure: `1. **Executive Summary**: Overall quality, architecture assessment, maintainability.
2. **Key Findings**:
   - 🔴 **Critical / Security**: Vulnerabilities, memory leaks, race conditions.
   - 🟡 **Medium / Performance & Logic**: Edge-case bugs, inefficient loops/queries, error-handling gaps.
   - 🟢 **Low / Clean Code**: Idioms, naming, type safety, modularity.
3. **Refactored Code**: The complete refactored code in one fenced block.
4. **Actionable Checklist**: Bulleted steps for the developer.`,
        defaultFile: "refactored.js",
        artifactType: "Review"
    },
    CODE_EXPLANATION: {
        role: "You are CortexAI Software Architect and Educator.",
        task: "Provide a clear, comprehensive, and engaging breakdown of the provided code or concept.",
        inputLabel: "User Input to Explain",
        structure: `1. **High-Level Purpose**: What problem does this solve, in plain language?
2. **Architecture & Execution Flow**: Step-by-step walkthrough.
3. **Deep Dive into Key Logic**: Complex functions, algorithms, parameters, state.
4. **Edge Cases & Failure Modes**
5. **Complexity Analysis**: Time and space (Big-O) if applicable.`,
        defaultFile: null,
        artifactType: null
    },
    DEBUGGING: {
        role: "You are CortexAI Expert Debugging Specialist.",
        task: "Diagnose the bug, error message, or stack trace and deliver a definitive fix.",
        inputLabel: "Code / Error to Debug",
        structure: `1. **Root Cause Analysis**: Why the bug or exception happened.
2. **The Fix**: The conceptual and technical change required.
3. **Corrected Code**: The complete, working code in one fenced block.
4. **Prevention**: Testing, typing, or validation techniques to avoid this in future.`,
        defaultFile: "fixed.js",
        artifactType: "Fix"
    },
    OPTIMIZATION: {
        role: "You are CortexAI High-Performance Systems Engineer.",
        task: "Analyze the provided code and optimize it for speed, memory, and efficiency.",
        inputLabel: "Code to Optimize",
        structure: `1. **Identified Bottlenecks**: Algorithmic inefficiencies, redundant work, excess allocations.
2. **Optimization Techniques**: Data structures, algorithms, caching, parallelization applied.
3. **Optimized Code**: The production-ready optimized code in one fenced block, with inline comments on key speedups.
4. **Complexity & Performance Comparison**: Time and space, before vs. after (use prose or a table, not a second code block).`,
        defaultFile: "optimized.js",
        artifactType: "Optimization"
    },
    CONVERSION: {
        role: "You are CortexAI Multi-Language Migration Specialist.",
        task: "Convert the provided code to the target language, framework, or paradigm the user requested.",
        inputLabel: "Code to Convert",
        structure: `1. **Migration Overview**: Source to target mapping.
2. **Converted Code**: Idiomatic, production-grade implementation in one fenced block.
3. **Language Nuances & Gotchas**: Typing, concurrency, GC, async differences.
4. **Usage / Test Example**: A short snippet (under ${MIN_ARTIFACT_LINES} lines) showing how to run it.`,
        defaultFile: "converted.js",
        artifactType: "Conversion"
    },
    DOCUMENTATION: {
        role: "You are CortexAI Technical Writer and API Documentation Specialist.",
        task: "Generate professional, comprehensive documentation for the provided code or API.",
        inputLabel: "Code to Document",
        structure: `1. **Overview & Description**
2. **API Reference**: Parameters, return values, defaults, thrown exceptions.
3. **Usage Examples**: Short, realistic, copy-pasteable examples.
4. **Configuration & Requirements**: Dependencies, environment variables, prerequisites.`,
        defaultFile: "README.md",
        artifactType: "Documentation"
    }
};

// ─────────────────────────────────────────────────────────────
// Project generation (websites / UIs, JSON output)
// Only used when the user clearly wants a website or app UI.
// ─────────────────────────────────────────────────────────────
async function generateProject(llm, state, recentContext) {
    const prompt = `You are CortexAI Coding Agent.

Generate the requested website or web app.

Default stack: HTML, CSS, JavaScript.
Use React / Next.js / Vue ONLY if explicitly requested.

Design rules:
- Responsive, modern UI
- CSS variables, Flexbox/Grid
- Smooth scroll, hover effects, good spacing
- Single page unless the user asks otherwise

CRITICAL: Your ENTIRE response must be ONLY valid JSON. No markdown. No code fences. No explanation.
Start your response with { and end with }.

JSON schema:
{
  "title": "Short title describing the project",
  "summary": "2-3 sentence description of what was built and how to run it",
  "files": [
    { "name": "index.html", "content": "...full HTML here..." },
    { "name": "style.css", "content": "...full CSS here..." },
    { "name": "script.js", "content": "...full JS here..." }
  ]
}

Rules:
- Output must start with { and end with }
- NO markdown code fences (no \`\`\`json or \`\`\`)
- "summary" must NOT contain code
- Properly escape ALL newlines as \\n and quotes as \\" inside "content" strings
- Never mention intent

${recentContext ? `Recent Context:\n${recentContext}\n\n` : ""}User Request:
${state.prompt}`;

    for (let attempt = 0; attempt < MAX_GENERATION_ATTEMPTS; attempt++) {
        const res = await llm.invoke(prompt);
        const rawText = toText(res.content);
        console.log(`[generateProject] attempt ${attempt + 1} raw (first 400 chars):`, rawText.slice(0, 400));
        const data = extractJson(rawText);
        const files = validFiles(data?.files);
        if (files.length > 0) {
            const title = typeof data?.title === "string" && data.title.trim()
                ? data.title.trim()
                : (files[0]?.name || "Project Files");
            const summary = typeof data?.summary === "string" && data.summary.trim()
                ? data.summary.trim()
                : "I've generated the project. Open the artifact panel to view the files.";
            return { title, summary, files };
        }
        console.log(`[generateProject] attempt ${attempt + 1} failed — extractJson returned:`, data);
    }
    return null;
}

// ─────────────────────────────────────────────────────────────
// Agent entry point
// ─────────────────────────────────────────────────────────────
export const codingAgent = async (state) => {
    const intentLlm = await getModel("intent");   // Groq — fast intent classification
    const projectLlm = await getModel("coding");  // DeepSeek — structured JSON for websites
    const codeLlm = await getModel("chat");       // Groq — follows markdown/snippet instructions reliably

    const recentContext = await loadRecentContext(state);
    const intent = await classifyIntent(intentLlm, state.prompt, recentContext);

    // 1. Website / app generation (structured JSON -> artifact, short chat summary)
    if (intent === "PROJECT_GENERATION") {
        const result = await generateProject(projectLlm, state, recentContext);

        if (!result) {
            return {
                ...state,
                aiResponse: "I couldn't generate the project files this time. Please try again or simplify the request.",
                artifacts: []
            };
        }

        return {
            ...state,
            aiResponse: result.summary,
            artifacts: [{
                id: Date.now(),
                type: "Project",
                title: result.title,
                files: result.files
            }]
        };
    }

    // 2. Everything else (markdown output; long code is moved out of the chat text)
    const cfg = MARKDOWN_INTENTS[intent] ?? MARKDOWN_INTENTS.CODE_SNIPPET;
    const res = await codeLlm.invoke(buildPrompt(cfg, recentContext, state.prompt));
    const text = toText(res.content);

    // Prose-only intents (e.g. explanation) keep everything in chat
    if (!cfg.defaultFile) {
        return { ...state, aiResponse: text, artifacts: [] };
    }

    const { chatText, files } = splitCodeFromResponse(text, cfg.defaultFile);
    const artifactTitle = files[0]?.name || cfg.artifactType || "Code";

    return {
        ...state,
        aiResponse: chatText,
        artifacts: files.length > 0
            ? [{
                id: Date.now(),
                type: cfg.artifactType,
                title: artifactTitle,
                files
            }]
            : []
    };
};