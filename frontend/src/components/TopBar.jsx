import { useState, useRef, useEffect } from 'react';
import {
    HiOutlinePencil,
    HiOutlineChevronDown,
    HiOutlineShare,
    HiOutlineCheck,
    HiOutlineArrowDownTray,
    HiOutlineDocumentDuplicate,
    HiOutlineSparkles,
    HiOutlineCpuChip,
    HiOutlineBars3,
    HiOutlineBolt,
} from 'react-icons/hi2';
import { useSelector, useDispatch } from 'react-redux';
import { useChatContext } from '../contexts/ChatContext';
import { updateConversationTitle } from '../redux/conversationSlice';
import { updateConversation } from '../features/updateConversation';
import { ModeDropdown } from './ModeSelector';

const MODELS = [
    {
        id: 'auto',
        name: 'Onyx Auto (Router)',
        badge: 'Default',
        desc: 'Smart agent router across Groq & Gemini',
    },
    {
        id: 'groq-oss',
        name: 'Groq GPT-OSS 120B',
        badge: 'Fast',
        desc: 'Ultra low-latency conversational agent',
    },
    {
        id: 'gemini-flash',
        name: 'Gemini 2.5 Flash',
        badge: 'Multimodal',
        desc: 'High speed code, vision, and reasoning',
    },
    {
        id: 'gemini-pro',
        name: 'Gemini 2.5 Pro',
        badge: 'Complex',
        desc: 'Deep reasoning and complex technical workflows',
    },
];

const TopBar = () => {
    const { messages, toggleSidebar } = useChatContext();
    const dispatch = useDispatch();
    const { currentConversation, currentConversationId } = useSelector(
        (state) => state.conversations
    );
    const { userData } = useSelector((state) => state.user);

    // Inline title edit synchronized with Redux current conversation
    const [title, setTitle] = useState(currentConversation?.title || 'New conversation');
    const [isEditing, setIsEditing] = useState(false);
    const [tempTitle, setTempTitle] = useState(title);
    const titleInputRef = useRef(null);

    // Synchronize title with Redux active conversation
    useEffect(() => {
        const nextTitle = currentConversation?.title || 'New conversation';
        setTitle(nextTitle);
        setTempTitle(nextTitle);
    }, [currentConversation?.title]);

    // Model dropdown
    const [selectedModel, setSelectedModel] = useState(MODELS[0]);
    const [modelOpen, setModelOpen] = useState(false);
    const modelMenuRef = useRef(null);

    // Share/Export dropdown
    const [shareOpen, setShareOpen] = useState(false);
    const [copiedLink, setCopiedLink] = useState(false);
    const shareMenuRef = useRef(null);

    // Focus input when editing starts
    useEffect(() => {
        if (isEditing) {
            titleInputRef.current?.focus();
            titleInputRef.current?.select();
        }
    }, [isEditing]);

    // Click outside to close menus
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (modelMenuRef.current && !modelMenuRef.current.contains(e.target)) {
                setModelOpen(false);
            }
            if (shareMenuRef.current && !shareMenuRef.current.contains(e.target)) {
                setShareOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSaveTitle = () => {
        const trimmed = tempTitle.trim();
        if (trimmed) {
            setTitle(trimmed);
            if (currentConversationId) {
                dispatch(updateConversationTitle({ id: currentConversationId, title: trimmed }));
                updateConversation({ id: currentConversationId, title: trimmed }).catch(() => {});
            }
        } else {
            setTempTitle(title);
        }
        setIsEditing(false);
    };

    const handleTitleKeyDown = (e) => {
        if (e.key === 'Enter') {
            handleSaveTitle();
        } else if (e.key === 'Escape') {
            setTempTitle(title);
            setIsEditing(false);
        }
    };

    const handleCopyShareLink = async () => {
        try {
            await navigator.clipboard.writeText(window.location.href);
            setCopiedLink(true);
            setTimeout(() => {
                setCopiedLink(false);
                setShareOpen(false);
            }, 1800);
        } catch (err) {
            console.error('Failed to copy link:', err);
        }
    };

    const handleExportMarkdown = () => {
        if (!messages.length) return;
        const mdContent = messages
            .map((m) => `### ${m.role === 'user' ? 'User' : 'OnyxAI'}\n\n${m.content}\n\n---`)
            .join('\n\n');
        downloadFile(mdContent, `${title.toLowerCase().replace(/\s+/g, '-')}.md`, 'text/markdown');
        setShareOpen(false);
    };

    const handleExportJSON = () => {
        if (!messages.length) return;
        const jsonContent = JSON.stringify({ title, messages, exportedAt: new Date().toISOString() }, null, 2);
        downloadFile(jsonContent, `${title.toLowerCase().replace(/\s+/g, '-')}.json`, 'application/json');
        setShareOpen(false);
    };

    const downloadFile = (content, filename, type) => {
        const blob = new Blob([content], { type });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    return (
        <header className="h-12 border-b border-border-subtle bg-panel px-3 sm:px-4 flex items-center justify-between shrink-0 select-none z-20">
            {/* Left: Mobile Menu Toggle + Chat Title (inline edit) */}
            <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 max-w-[50%] sm:max-w-[40%]">
                <button
                    onClick={toggleSidebar}
                    aria-label="Open navigation sidebar"
                    title="Open sidebar"
                    className="md:hidden p-1.5 -ml-1 rounded-lg text-text-muted hover:text-text-primary hover:bg-border-subtle transition-colors cursor-pointer shrink-0"
                >
                    <HiOutlineBars3 size={18} />
                </button>

                {isEditing ? (
                    <input
                        ref={titleInputRef}
                        type="text"
                        value={tempTitle}
                        onChange={(e) => setTempTitle(e.target.value)}
                        onBlur={handleSaveTitle}
                        onKeyDown={handleTitleKeyDown}
                        className="bg-elevated border border-accent px-2 py-0.5 rounded text-sm text-text-primary outline-none min-w-[120px] max-w-xs shadow-inner"
                        aria-label="Edit chat title"
                    />
                ) : (
                    <button
                        onClick={() => {
                            setTempTitle(title);
                            setIsEditing(true);
                        }}
                        className="group flex items-center gap-1.5 px-2 py-1 rounded-lg hover:bg-border-subtle transition-colors text-left cursor-pointer min-w-0"
                        title="Click to edit title"
                        aria-label="Chat title, click to rename"
                    >
                        <span className="text-[13px] font-semibold text-text-primary truncate">
                            {title}
                        </span>
                        <HiOutlinePencil
                            size={12}
                            className="text-text-muted opacity-0 group-hover:opacity-100 transition-opacity shrink-0 hidden sm:inline"
                        />
                    </button>
                )}
            </div>

            {/* Center: Mode Switcher + Model Selector Dropdown */}
            <div className="flex items-center gap-1.5 sm:gap-2">
                <ModeDropdown />

                <div className="relative" ref={modelMenuRef}>
                    <button
                        onClick={() => setModelOpen((prev) => !prev)}
                        className="flex items-center gap-2 px-2.5 py-1 rounded-xl bg-elevated border border-border-muted hover:border-accent-border text-xs text-text-primary shadow-sm hover:bg-border-subtle transition-all cursor-pointer"
                        aria-label="Select AI model"
                        aria-expanded={modelOpen}
                    >
                        <HiOutlineSparkles size={14} className="text-accent-hover shrink-0" />
                        <span className="font-medium truncate max-w-[100px] sm:max-w-[160px]">
                            {selectedModel.name}
                        </span>
                        <HiOutlineChevronDown
                            size={13}
                            className={`text-text-muted transition-transform duration-200 ${
                                modelOpen ? 'rotate-180' : ''
                            }`}
                        />
                    </button>


                {/* Model dropdown menu */}
                {modelOpen && (
                    <div className="absolute left-1/2 -translate-x-1/2 top-full mt-1.5 w-72 bg-overlay border border-border-muted rounded-xl shadow-2xl p-1.5 z-50 animate-fade-up">
                        <div className="px-2.5 py-1 text-[10px] font-semibold text-text-disabled uppercase tracking-wider border-b border-border-subtle mb-1">
                            Available Models
                        </div>
                        <div className="space-y-0.5">
                            {MODELS.map((model) => {
                                const isSelected = model.id === selectedModel.id;
                                return (
                                    <button
                                        key={model.id}
                                        onClick={() => {
                                            setSelectedModel(model);
                                            setModelOpen(false);
                                        }}
                                        className={`w-full text-left p-2 rounded-lg flex items-start gap-2.5 transition-colors cursor-pointer ${
                                            isSelected
                                                ? 'bg-accent-subtle text-text-primary'
                                                : 'hover:bg-border-subtle text-text-secondary hover:text-text-primary'
                                        }`}
                                    >
                                        <HiOutlineCpuChip
                                            size={16}
                                            className={`shrink-0 mt-0.5 ${
                                                isSelected ? 'text-accent' : 'text-text-muted'
                                            }`}
                                        />
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between gap-1">
                                                <span className="text-xs font-semibold truncate">
                                                    {model.name}
                                                </span>
                                                <span className="text-[10px] px-1.5 py-0.2 rounded font-mono bg-border-muted text-text-muted shrink-0">
                                                    {model.badge}
                                                </span>
                                            </div>
                                            <p className="text-[11px] text-text-muted mt-0.5 leading-snug">
                                                {model.desc}
                                            </p>
                                        </div>
                                        {isSelected && (
                                            <HiOutlineCheck size={14} className="text-accent shrink-0 mt-0.5" />
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}
                </div>
            </div>

            {/* Right: Credits & Share / Export Menu */}
            <div className="flex items-center gap-2">
                {userData && (
                    <div
                        className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#1F1F1F] border border-white/[0.08] text-xs shadow-xs"
                        title="Your available AI credits"
                    >
                        <HiOutlineBolt size={13} className="text-amber-400" />
                        <span className="font-semibold text-white">
                            {userData.credits ?? 100}
                        </span>
                        <span className="text-[10px] text-[#737373] uppercase tracking-wider">
                            credits
                        </span>
                    </div>
                )}

                <div className="relative" ref={shareMenuRef}>
                    <button
                        onClick={() => setShareOpen((prev) => !prev)}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-medium text-text-secondary hover:text-text-primary hover:bg-border-subtle border border-transparent hover:border-border-subtle transition-all cursor-pointer"
                    aria-label="Share or export conversation"
                    aria-expanded={shareOpen}
                >
                    <HiOutlineShare size={14} className="shrink-0" />
                    <span className="hidden sm:inline">Share</span>
                </button>

                {/* Share dropdown */}
                {shareOpen && (
                    <div className="absolute right-0 top-full mt-1.5 w-52 bg-overlay border border-border-muted rounded-xl shadow-2xl p-1 z-50 animate-fade-up">
                        <button
                            onClick={handleCopyShareLink}
                            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-text-secondary hover:text-text-primary hover:bg-border-subtle rounded-lg transition-colors cursor-pointer"
                        >
                            {copiedLink ? (
                                <>
                                    <HiOutlineCheck size={14} className="text-success" />
                                    <span className="text-success font-medium">Link copied!</span>
                                </>
                            ) : (
                                <>
                                    <HiOutlineDocumentDuplicate size={14} />
                                    <span>Copy share link</span>
                                </>
                            )}
                        </button>
                        <div className="h-px bg-border-subtle my-1" />
                        <button
                            onClick={handleExportMarkdown}
                            disabled={!messages.length}
                            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-text-secondary hover:text-text-primary hover:bg-border-subtle rounded-lg transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            <HiOutlineArrowDownTray size={14} />
                            <span>Export as Markdown</span>
                        </button>
                        <button
                            onClick={handleExportJSON}
                            disabled={!messages.length}
                            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-text-secondary hover:text-text-primary hover:bg-border-subtle rounded-lg transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            <HiOutlineArrowDownTray size={14} />
                            <span>Export as JSON</span>
                        </button>
                    </div>
                )}
                </div>
            </div>
        </header>
    );
};

export default TopBar;

