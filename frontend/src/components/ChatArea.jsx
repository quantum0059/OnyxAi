import { useEffect, useRef, useState, useCallback } from 'react';
import {
    HiOutlinePaperAirplane,
    HiOutlineStopCircle,
    HiOutlineSparkles,
    HiOutlinePaperClip,
    HiOutlineMicrophone,
    HiOutlineArrowDown,
} from 'react-icons/hi2';
import { useChatContext } from '../contexts/ChatContext';
import useChat from '../hooks/useChat';
import useSpeechToText from '../hooks/useSpeechToText';
import MessageBubble from './MessageBubble';
import { AGENT_MODES } from '../config/agentModes';

/* ─── Typing indicator ─────────────────────────────────────── */
const TypingIndicator = () => (
    <div className="flex items-start gap-3 py-3 w-full animate-fade-up">
        <div className="w-7 h-7 rounded-lg bg-accent-subtle border border-accent-border flex items-center justify-center text-accent-hover shrink-0 mt-0.5 shadow-sm animate-pulse">
            <HiOutlineSparkles size={15} />
        </div>
        <div className="flex items-center gap-2 py-1.5">
            <div className="h-3.5 w-24 rounded-full bg-gradient-to-r from-accent/25 via-accent/60 to-accent/25 animate-pulse-shimmer" />
            <span className="text-xs text-text-muted font-medium animate-pulse">OnyxAI is thinking…</span>
        </div>
    </div>
);

/* ─── Writing Inbox Component (matches user design) ─────────── */
const WritingInbox = ({
    input,
    setInput,
    selectedFile,
    setSelectedFile,
    onSubmit,
    isLoading,
    activeMode,
    setActiveMode,
    textareaRef,
    isListening,
    toggleListening,
    isSpeechSupported,
    speechError,
    clearSpeechError,
}) => {
    const fileInputRef = useRef(null);
    const hasText = input.trim().length > 0;
    const hasContent = hasText || !!selectedFile;

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            onSubmit();
        }
    };

    const handleFileClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = (e) => {
        const file = e.target.files?.[0];
        if (file) {
            setSelectedFile(file);
            e.target.value = '';
        }
    };

    return (
        <div className="w-full bg-[#18191f] border border-white/[0.08] hover:border-white/[0.14] focus-within:border-white/[0.2] rounded-2xl sm:rounded-3xl p-3 shadow-2xl transition-all duration-200">
            {/* Top row: Capsule mode pills */}
            <div
                className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar pb-2 px-0.5 select-none"
                role="tablist"
                aria-label="Agent modes"
            >
                {AGENT_MODES.map((mode) => {
                    const isActive = mode.id === activeMode;
                    const Icon = mode.icon;
                    return (
                        <button
                            key={mode.id}
                            type="button"
                            role="tab"
                            aria-selected={isActive}
                            title={mode.description}
                            onClick={() => setActiveMode(mode.id)}
                            className={`
                                flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium
                                transition-all duration-150 cursor-pointer shrink-0 whitespace-nowrap
                                ${isActive
                                    ? 'bg-[#6366f1] text-white shadow-sm'
                                    : 'bg-[#22232a] text-[#8e92a2] hover:text-white hover:bg-[#2b2c36]'
                                }
                            `}
                        >
                            <Icon size={13} className="shrink-0" />
                            <span>{mode.shortLabel}</span>
                        </button>
                    );
                })}
            </div>

            {/* Speech error notice */}
            {speechError && (
                <div className="flex items-center justify-between gap-2 px-3 py-1.5 mb-2 mx-1 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs animate-fade-in">
                    <span className="truncate">{speechError}</span>
                    <button
                        type="button"
                        onClick={clearSpeechError}
                        className="text-rose-400 hover:text-white transition-colors cursor-pointer text-xs font-bold px-1"
                        title="Dismiss"
                    >
                        ✕
                    </button>
                </div>
            )}

            {/* Attached file chip if selected */}
            {selectedFile && (
                <div className="flex items-center gap-2 px-2.5 py-1 mb-1.5 mx-1 rounded-lg bg-white/[0.06] border border-white/10 w-fit text-xs text-text-secondary animate-fade-in">
                    {selectedFile.type?.startsWith('image/') ? (
                        <img
                            src={URL.createObjectURL(selectedFile)}
                            alt="preview"
                            className="w-5 h-5 rounded object-cover"
                        />
                    ) : (
                        <span className="font-semibold text-accent text-[11px]">PDF</span>
                    )}
                    <span className="max-w-[180px] sm:max-w-[260px] truncate text-white text-[12px]">{selectedFile.name}</span>
                    <button
                        type="button"
                        onClick={() => setSelectedFile(null)}
                        className="ml-1 text-[#8e92a2] hover:text-white transition-colors cursor-pointer text-xs"
                        title="Remove attachment"
                    >
                        ✕
                    </button>
                </div>
            )}

            {/* Middle row: Textarea */}
            <div className="px-1 py-1">
                <textarea
                    ref={textareaRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={isListening ? 'Listening… Speak now' : 'Ask Anything…'}
                    rows={1}
                    className="w-full bg-transparent resize-none text-[14px] sm:text-[15px] text-white placeholder:text-[#65697b] outline-none leading-relaxed max-h-[180px] overflow-y-auto py-1"
                    aria-label="Chat input"
                />
            </div>

            {/* Bottom row: Action controls */}
            <div className="flex items-center justify-between pt-1 px-1">
                {/* Left tools: Attach & Mic */}
                <div className="flex items-center gap-1 text-[#8e92a2]">
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*,.pdf"
                        className="hidden"
                        onChange={handleFileChange}
                    />
                    <button
                        type="button"
                        onClick={handleFileClick}
                        title="Attach file (Images or PDF)"
                        aria-label="Attach file"
                        className="p-1.5 rounded-xl text-[#8e92a2] hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer"
                    >
                        <HiOutlinePaperClip size={18} />
                    </button>
                    <button
                        type="button"
                        onClick={toggleListening}
                        title={
                            !isSpeechSupported
                                ? 'Speech recognition is not supported in this browser'
                                : isListening
                                ? 'Listening… Click to stop'
                                : 'Voice input (Microphone)'
                        }
                        aria-label={isListening ? 'Stop voice input' : 'Voice input'}
                        className={`p-1.5 rounded-xl transition-all duration-200 cursor-pointer flex items-center gap-1.5 ${
                            isListening
                                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40 shadow-[0_0_12px_rgba(244,63,94,0.35)] animate-pulse'
                                : 'text-[#8e92a2] hover:text-white hover:bg-white/[0.06]'
                        }`}
                    >
                        <HiOutlineMicrophone size={18} className={isListening ? 'text-rose-400 animate-bounce' : ''} />
                        {isListening && (
                            <span className="text-[11px] font-medium text-rose-400 pr-1 animate-pulse">
                                Listening…
                            </span>
                        )}
                    </button>
                </div>

                {/* Right tool: Send / Stop */}
                <button
                    onClick={onSubmit}
                    disabled={!hasContent && !isLoading}
                    aria-label={isLoading ? 'Stop generating' : 'Send message'}
                    title={isLoading ? 'Stop generating' : 'Send message'}
                    className={`
                        w-8 h-8 flex items-center justify-center rounded-xl transition-all duration-200 cursor-pointer active:scale-95
                        ${isLoading
                            ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40 hover:bg-rose-500/30'
                            : hasContent
                            ? 'bg-[#6366f1] text-white shadow-md hover:bg-indigo-500'
                            : 'bg-[#22232a] text-[#555869] cursor-not-allowed opacity-70'
                        }
                    `}
                >
                    {isLoading ? (
                        <HiOutlineStopCircle size={17} />
                    ) : (
                        <HiOutlinePaperAirplane size={15} />
                    )}
                </button>
            </div>
        </div>
    );
};

/* ─── Main Chat Area ───────────────────────────────────────── */
const ChatArea = () => {
    const { messages, isLoading, activeMode, setActiveMode } = useChatContext();
    const { handleSend } = useChat();
    const [input, setInput] = useState('');
    const [selectedFile, setSelectedFile] = useState(null);
    const [showScrollBottom, setShowScrollBottom] = useState(false);

    const scrollContainerRef = useRef(null);
    const bottomRef = useRef(null);
    const textareaRef = useRef(null);
    const inputRef = useRef(input);
    inputRef.current = input;

    const {
        isListening,
        isSupported: isSpeechSupported,
        error: speechError,
        toggleListening,
        stopListening,
        clearError: clearSpeechError,
    } = useSpeechToText({
        onTranscript: (spokenText) => {
            setInput(spokenText);
        },
        getCurrentText: () => inputRef.current,
    });

    const hasMessages = messages.length > 0;

    const scrollToBottom = useCallback((behavior = 'smooth') => {
        bottomRef.current?.scrollIntoView({ behavior });
    }, []);

    useEffect(() => {
        scrollToBottom();
    }, [messages, isLoading, scrollToBottom]);

    const handleScroll = (e) => {
        const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
        const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
        setShowScrollBottom(hasMessages && distanceFromBottom > 150);
    };

    // Auto-resize textarea
    useEffect(() => {
        const ta = textareaRef.current;
        if (!ta) return;
        ta.style.height = 'auto';
        ta.style.height = `${Math.min(ta.scrollHeight, 180)}px`;
    }, [input]);

    const submit = () => {
        if (isListening) {
            stopListening();
        }
        const trimmed = input.trim();
        if ((!trimmed && !selectedFile) || isLoading) return;
        const fileToSend = selectedFile;
        setInput('');
        setSelectedFile(null);
        handleSend(trimmed, fileToSend);
    };

    const handleRegenerate = () => {
        if (isLoading) return;
        const lastUser = [...messages].reverse().find((m) => m.role === 'user');
        if (lastUser?.content) {
            handleSend(lastUser.content);
        }
    };

    return (
        <div className="flex flex-col h-full relative">
            {!hasMessages ? (
                /* ─── Minimal Empty State (ChatGPT-style: "What's on the agenda today?") ─── */
                <div className="flex-1 flex flex-col items-center justify-center px-4 max-w-2xl sm:max-w-3xl mx-auto w-full select-none -mt-10 sm:-mt-14 animate-fade-up">
                    <h1 className="text-2xl sm:text-3xl font-medium text-text-primary tracking-tight mb-7 text-center">
                        What’s on the agenda today?
                    </h1>
                    <div className="w-full">
                        <WritingInbox
                            input={input}
                            setInput={setInput}
                            selectedFile={selectedFile}
                            setSelectedFile={setSelectedFile}
                            onSubmit={submit}
                            isLoading={isLoading}
                            activeMode={activeMode}
                            setActiveMode={setActiveMode}
                            textareaRef={textareaRef}
                            isListening={isListening}
                            toggleListening={toggleListening}
                            isSpeechSupported={isSpeechSupported}
                            speechError={speechError}
                            clearSpeechError={clearSpeechError}
                        />
                        <p className="text-[11px] text-text-muted text-center mt-2.5">
                            OnyxAI can make mistakes. Verify important information.
                        </p>
                    </div>
                </div>
            ) : (
                /* ─── Active Chat: Scrolling Messages + Bottom Writing Inbox ─── */
                <>
                    <div
                        ref={scrollContainerRef}
                        onScroll={handleScroll}
                        className="flex-1 overflow-y-auto"
                    >
                        <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
                            {messages.map((msg) => (
                                <MessageBubble
                                    key={msg.id}
                                    message={msg}
                                    onRegenerate={handleRegenerate}
                                />
                            ))}
                            {isLoading && <TypingIndicator />}
                            <div ref={bottomRef} />
                        </div>
                    </div>

                    {/* Pinned Bottom Writing Inbox */}
                    <div className="shrink-0 relative px-3 sm:px-4 pt-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] bg-gradient-to-t from-app-bg via-app-bg/95 to-transparent">
                        {/* Floating Scroll to Bottom Button — positioned cleanly above input bar */}
                        {showScrollBottom && (
                            <button
                                onClick={() => scrollToBottom('smooth')}
                                aria-label="Scroll to bottom"
                                className="absolute -top-10 left-1/2 -translate-x-1/2 z-20 w-8 h-8 flex items-center justify-center rounded-full bg-elevated border border-border-strong text-text-primary shadow-2xl hover:bg-border-muted hover:border-accent-border transition-all duration-200 cursor-pointer animate-fade-up backdrop-blur-sm"
                            >
                                <HiOutlineArrowDown size={14} className="text-accent-hover" />
                            </button>
                        )}

                        <div className="max-w-3xl mx-auto">
                            <WritingInbox
                                input={input}
                                setInput={setInput}
                                selectedFile={selectedFile}
                                setSelectedFile={setSelectedFile}
                                onSubmit={submit}
                                isLoading={isLoading}
                                activeMode={activeMode}
                                setActiveMode={setActiveMode}
                                textareaRef={textareaRef}
                                isListening={isListening}
                                toggleListening={toggleListening}
                                isSpeechSupported={isSpeechSupported}
                                speechError={speechError}
                                clearSpeechError={clearSpeechError}
                            />
                            <p className="text-[11px] text-text-muted text-center mt-2">
                                OnyxAI can make mistakes. Verify important information.
                            </p>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default ChatArea;
