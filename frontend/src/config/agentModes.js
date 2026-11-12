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
            text: 'text-indigo-400',
            bg: 'bg-indigo-500/10',
            hoverBg: 'hover:bg-indigo-500/15',
            border: 'border-indigo-500/30',
            activeBorder: 'border-indigo-500/60',
            glow: 'rgba(99, 102, 241, 0.22)',
            dot: 'bg-indigo-500',
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
            text: 'text-indigo-400',
            bg: 'bg-indigo-500/10',
            hoverBg: 'hover:bg-indigo-500/15',
            border: 'border-indigo-500/30',
            activeBorder: 'border-indigo-500/60',
            glow: 'rgba(99, 102, 241, 0.22)',
            dot: 'bg-indigo-500',
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
            text: 'text-indigo-400',
            bg: 'bg-indigo-500/10',
            hoverBg: 'hover:bg-indigo-500/15',
            border: 'border-indigo-500/30',
            activeBorder: 'border-indigo-500/60',
            glow: 'rgba(99, 102, 241, 0.22)',
            dot: 'bg-indigo-500',
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
            text: 'text-rose-400',
            bg: 'bg-rose-500/10',
            hoverBg: 'hover:bg-rose-500/15',
            border: 'border-rose-500/30',
            activeBorder: 'border-rose-500/60',
            glow: 'rgba(244, 63, 94, 0.22)',
            dot: 'bg-rose-500',
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
            text: 'text-amber-400',
            bg: 'bg-amber-500/10',
            hoverBg: 'hover:bg-amber-500/15',
            border: 'border-amber-500/30',
            activeBorder: 'border-amber-500/60',
            glow: 'rgba(245, 158, 11, 0.22)',
            dot: 'bg-amber-500',
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
            text: 'text-purple-400',
            bg: 'bg-purple-500/10',
            hoverBg: 'hover:bg-purple-500/15',
            border: 'border-purple-500/30',
            activeBorder: 'border-purple-500/60',
            glow: 'rgba(168, 85, 247, 0.22)',
            dot: 'bg-purple-500',
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
            text: 'text-sky-400',
            bg: 'bg-sky-500/10',
            hoverBg: 'hover:bg-sky-500/15',
            border: 'border-sky-500/30',
            activeBorder: 'border-sky-500/60',
            glow: 'rgba(14, 165, 233, 0.22)',
            dot: 'bg-sky-500',
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
