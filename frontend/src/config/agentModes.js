import {
    HiOutlineBolt,
    HiOutlineChatBubbleLeftRight,
    HiOutlineCodeBracket,
    HiOutlineDocumentText,
    HiOutlineComputerDesktop,
    HiOutlinePhoto,
    HiOutlineGlobeAlt,
    HiOutlineLightBulb,
    HiOutlineSparkles,
    HiOutlineBugAnt,
    HiOutlineCommandLine,
    HiOutlineChartBar,
    HiOutlineTableCells,
    HiOutlineMagnifyingGlass,
} from 'react-icons/hi2';

/**
 * Single source of truth for all Agent Modes in the UI.
 * Ordered exactly as displayed in the writing inbox pills:
 * [Auto] [Chat] [Coding] [PDF] [PPT] [Image] [Search]
 */
export const AGENT_MODES = [
    {
        id: 'auto',
        label: 'Auto Agent',
        shortLabel: 'Auto',
        badge: 'Router',
        description: 'Automatic intelligent routing across Groq & Gemini',
        placeholder: 'Ask Anything…',
        icon: HiOutlineBolt,
        theme: {
            text: 'text-[#E8D8B0]',
            bg: 'bg-[#24211A]',
            border: 'border-[#4B402D]',
            hoverBg: 'hover:bg-[#2B271F]',
            activeBorder: 'border-[#5A4E38]',
            dot: 'bg-[#CBB279]',
        },
        suggestions: [
            {
                id: 'auto-solve',
                icon: HiOutlineSparkles,
                title: 'Help me solve a problem',
                description: 'The router automatically delegates to the best agent',
            },
            {
                id: 'auto-research',
                icon: HiOutlineMagnifyingGlass,
                title: 'Research and summarize a topic',
                description: 'Synthesizes information across knowledge bases',
            },
        ],
    },
    {
        id: 'chat',
        label: 'Normal Chat',
        shortLabel: 'Chat',
        badge: 'General',
        description: 'Everyday dialogue, explanations, and creative brainstorming',
        placeholder: 'Ask Anything…',
        icon: HiOutlineChatBubbleLeftRight,
        theme: {
            text: 'text-[#B5D1C1]',
            bg: 'bg-[#18231E]',
            border: 'border-[#2C4035]',
            hoverBg: 'hover:bg-[#1E2C26]',
            activeBorder: 'border-[#375244]',
            dot: 'bg-[#8DAA99]',
        },
        suggestions: [
            {
                id: 'explain',
                icon: HiOutlineLightBulb,
                title: 'Explain a complex concept',
                description: 'Break down quantum computing or any idea simply',
            },
            {
                id: 'brainstorm',
                icon: HiOutlineSparkles,
                title: 'Brainstorm creative ideas',
                description: 'Generate fresh product features or marketing angles',
            },
        ],
    },
    {
        id: 'coding',
        label: 'Coding Agent',
        shortLabel: 'Coding',
        badge: 'Gemini Dev',
        description: 'Writing code, debugging, refactoring, and software architecture',
        placeholder: 'Ask Anything…',
        icon: HiOutlineCodeBracket,
        theme: {
            text: 'text-[#B8CEE0]',
            bg: 'bg-[#182128]',
            border: 'border-[#293B4A]',
            hoverBg: 'hover:bg-[#1E2A34]',
            activeBorder: 'border-[#364D60]',
            dot: 'bg-[#80A0BC]',
        },
        suggestions: [
            {
                id: 'algo',
                icon: HiOutlineCodeBracket,
                title: 'Write a clean algorithm',
                description: 'Generate optimal code with complexity analysis and tests',
            },
            {
                id: 'debug',
                icon: HiOutlineBugAnt,
                title: 'Debug & troubleshoot an issue',
                description: 'Paste code or stack trace to locate the root cause',
            },
        ],
    },
    {
        id: 'pdf',
        label: 'PDF Mode',
        shortLabel: 'PDF',
        badge: 'Docs',
        description: 'Read, extract, summarize, and answer questions from documents',
        placeholder: 'Ask Anything…',
        icon: HiOutlineDocumentText,
        theme: {
            text: 'text-[#DEC0C5]',
            bg: 'bg-[#261A1D]',
            border: 'border-[#482D33]',
            hoverBg: 'hover:bg-[#302125]',
            activeBorder: 'border-[#5B3941]',
            dot: 'bg-[#BD848C]',
        },
        suggestions: [
            {
                id: 'summarize-doc',
                icon: HiOutlineDocumentText,
                title: 'Executive summary of a document',
                description: 'Condense key arguments, findings, and actionable takeaways',
            },
            {
                id: 'extract-data',
                icon: HiOutlineTableCells,
                title: 'Extract tables & structured metrics',
                description: 'Format complex report figures into clear tables or JSON',
            },
        ],
    },
    {
        id: 'ppt',
        label: 'PPT Agent',
        shortLabel: 'PPT',
        badge: 'Slide Decks',
        description: 'Creating, outlining, and structuring compelling presentations',
        placeholder: 'Ask Anything…',
        icon: HiOutlineComputerDesktop,
        theme: {
            text: 'text-[#E4CAA9]',
            bg: 'bg-[#261F18]',
            border: 'border-[#483827]',
            hoverBg: 'hover:bg-[#30271E]',
            activeBorder: 'border-[#5B4732]',
            dot: 'bg-[#CDA37B]',
        },
        suggestions: [
            {
                id: 'pitch',
                icon: HiOutlineChartBar,
                title: 'Create a 10-slide startup pitch deck',
                description: 'Problem, solution, market size, business model & traction',
            },
            {
                id: 'qbr',
                icon: HiOutlineCommandLine,
                title: 'Quarterly business review (QBR)',
                description: 'Structure milestones, KPI scorecards, and strategy updates',
            },
        ],
    },
    {
        id: 'vision',
        label: 'Image Agent',
        shortLabel: 'Image',
        badge: 'Vision',
        description: 'Analyze, describe, OCR, and inspect visual media',
        placeholder: 'Ask Anything…',
        icon: HiOutlinePhoto,
        theme: {
            text: 'text-[#D5C7DB]',
            bg: 'bg-[#221B26]',
            border: 'border-[#3E2F48]',
            hoverBg: 'hover:bg-[#2B2230]',
            activeBorder: 'border-[#4F3C5C]',
            dot: 'bg-[#A992AF]',
        },
        suggestions: [
            {
                id: 'describe-image',
                icon: HiOutlinePhoto,
                title: 'Describe visual content',
                description: 'Detailed analysis of layout, elements, and context',
            },
            {
                id: 'ocr',
                icon: HiOutlineDocumentText,
                title: 'Extract text from image (OCR)',
                description: 'Transcribe printed or handwritten text accurately',
            },
        ],
    },
    {
        id: 'search',
        label: 'Searching Mode',
        shortLabel: 'Search',
        badge: 'Live Web',
        description: 'Live web intelligence, current events, and deep research',
        placeholder: 'Ask Anything…',
        icon: HiOutlineGlobeAlt,
        theme: {
            text: 'text-[#A7D4D7]',
            bg: 'bg-[#162325]',
            border: 'border-[#254044]',
            hoverBg: 'hover:bg-[#1C2C2F]',
            activeBorder: 'border-[#305257]',
            dot: 'bg-[#66A3A8]',
        },
        suggestions: [
            {
                id: 'tech-news',
                icon: HiOutlineGlobeAlt,
                title: 'Latest tech breakthroughs today',
                description: 'Live updates on AI developments, releases, and industry news',
            },
            {
                id: 'competitor',
                icon: HiOutlineMagnifyingGlass,
                title: 'Live market & competitor research',
                description: 'Synthesize market trends, pricing benchmarks, and positioning',
            },
        ],
    },
];

export const DEFAULT_MODE_ID = 'auto';

/**
 * Fast O(1) dictionary lookup by mode id
 */
export const AGENT_MODES_MAP = Object.freeze(
    AGENT_MODES.reduce((acc, mode) => {
        acc[mode.id] = mode;
        return acc;
    }, {})
);

/**
 * Safe mode getter with fallback to prevent UI crashes if an unknown mode is provided.
 * @param {string} modeId
 * @returns {typeof AGENT_MODES[0]}
 */
export const getModeConfig = (modeId) => {
    if (modeId && AGENT_MODES_MAP[modeId]) {
        return AGENT_MODES_MAP[modeId];
    }
    return AGENT_MODES_MAP[DEFAULT_MODE_ID];
};

/**
 * Checks if a mode ID is registered.
 * @param {string} modeId
 * @returns {boolean}
 */
export const isValidMode = (modeId) => Boolean(modeId && AGENT_MODES_MAP[modeId]);
