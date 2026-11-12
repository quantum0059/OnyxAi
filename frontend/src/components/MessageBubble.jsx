import { useState, memo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import 'highlight.js/styles/github-dark.css';
import {
    HiOutlineClipboard,
    HiOutlineCheck,
    HiOutlineArrowPath,
    HiOutlineHandThumbUp,
    HiOutlineHandThumbDown,
    HiOutlineSparkles,
    HiOutlineExclamationTriangle,
    HiOutlineCodeBracket,
} from 'react-icons/hi2';
import { useChatContext } from '../contexts/ChatContext';

/** Recursively extract plain string from React node / elements */
const extractText = (node) => {
    if (typeof node === 'string') return node;
    if (typeof node === 'number') return String(node);
    if (Array.isArray(node)) return node.map(extractText).join('');
    if (node && node.props && node.props.children) return extractText(node.props.children);
    return '';
};

/** Code block with language tag, copy button, and syntax highlighting */
const CodeBlock = ({ language, children }) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        try {
            const rawText = extractText(children);
            await navigator.clipboard.writeText(rawText);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy code:', err);
        }
    };

    return (
        <div className="my-3 rounded-xl overflow-hidden border border-border-muted bg-[#0d1117] shadow-md">
            {/* Header bar */}
            <div className="flex items-center justify-between px-3.5 py-1.5 bg-[#161b22] border-b border-border-subtle text-xs text-text-muted select-none">
                <span className="font-mono text-[11px] uppercase tracking-wider text-text-secondary">
                    {language || 'code'}
                </span>
                <button
                    onClick={handleCopy}
                    type="button"
                    className="flex items-center gap-1.5 px-2 py-0.5 rounded hover:bg-border-subtle hover:text-text-primary text-[11px] transition-colors cursor-pointer"
                    aria-label={copied ? 'Code copied' : 'Copy code to clipboard'}
                >
                    {copied ? (
                        <>
                            <HiOutlineCheck size={13} className="text-success" />
                            <span className="text-success font-medium">Copied</span>
                        </>
                    ) : (
                        <>
                            <HiOutlineClipboard size={13} />
                            <span>Copy</span>
                        </>
                    )}
                </button>
            </div>

            {/* Code content */}
            <div className="p-3.5 overflow-x-auto text-[13px] font-mono leading-relaxed text-text-primary">
                <code className={language ? `language-${language}` : ''}>
                    {children}
                </code>
            </div>
        </div>
    );
};

/** AI response actions toolbar (copy, regenerate, feedback) */
const MessageActions = ({ content, onRegenerate, onLike, onDislike, messageId }) => {
    const [copied, setCopied] = useState(false);
    const [feedback, setFeedback] = useState(null); // 'like' | 'dislike' | null

    const handleCopyAll = async () => {
        try {
            await navigator.clipboard.writeText(content);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy message:', err);
        }
    };

    const handleLike = () => {
        const next = feedback === 'like' ? null : 'like';
        setFeedback(next);
        if (next) onLike?.(messageId);
    };

    const handleDislike = () => {
        const next = feedback === 'dislike' ? null : 'dislike';
        setFeedback(next);
        if (next) onDislike?.(messageId);
    };

    return (
        <div className="flex items-center gap-1 mt-2 text-text-muted opacity-80 group-hover:opacity-100 transition-opacity">
            <button
                type="button"
                onClick={handleCopyAll}
                title={copied ? 'Copied' : 'Copy message'}
                aria-label="Copy message"
                className="p-1.5 rounded-md hover:bg-border-subtle hover:text-text-primary transition-colors cursor-pointer text-xs flex items-center gap-1"
            >
                {copied ? <HiOutlineCheck size={14} className="text-success" /> : <HiOutlineClipboard size={14} />}
                {copied && <span className="text-[11px] text-success font-medium">Copied</span>}
            </button>

            {onRegenerate && (
                <button
                    type="button"
                    onClick={() => onRegenerate(messageId)}
                    title="Regenerate response"
                    aria-label="Regenerate response"
                    className="p-1.5 rounded-md hover:bg-border-subtle hover:text-text-primary transition-colors cursor-pointer"
                >
                    <HiOutlineArrowPath size={14} />
                </button>
            )}

            <button
                type="button"
                onClick={handleLike}
                title="Good response"
                aria-label="Good response"
                className={`p-1.5 rounded-md hover:bg-border-subtle transition-colors cursor-pointer ${
                    feedback === 'like' ? 'text-accent bg-accent-subtle' : 'hover:text-text-primary'
                }`}
            >
                <HiOutlineHandThumbUp size={14} />
            </button>

            <button
                type="button"
                onClick={handleDislike}
                title="Bad response"
                aria-label="Bad response"
                className={`p-1.5 rounded-md hover:bg-border-subtle transition-colors cursor-pointer ${
                    feedback === 'dislike' ? 'text-danger bg-danger-subtle' : 'hover:text-text-primary'
                }`}
            >
                <HiOutlineHandThumbDown size={14} />
            </button>
        </div>
    );
};

/** Markdown component customizers for clean typography */
const MARKDOWN_COMPONENTS = {
    pre({ children }) {
        return <>{children}</>;
    },
    code({ inline, className, children, ...props }) {
        const match = /language-(\w+)/.exec(className || '');
        const isBlock = match || String(children).includes('\n');
        if (isBlock) {
            return (
                <CodeBlock language={match ? match[1] : ''} {...props}>
                    {children}
                </CodeBlock>
            );
        }
        return (
            <code
                className="bg-border-muted text-accent-hover px-1.5 py-0.5 rounded text-[13px] font-mono"
                {...props}
            >
                {children}
            </code>
        );
    },
    h1({ children }) {
        return <h1 className="text-xl font-bold text-text-primary mt-4 mb-2 tracking-tight">{children}</h1>;
    },
    h2({ children }) {
        return <h2 className="text-lg font-semibold text-text-primary mt-3 mb-1.5 tracking-tight">{children}</h2>;
    },
    h3({ children }) {
        return <h3 className="text-base font-semibold text-text-primary mt-2.5 mb-1">{children}</h3>;
    },
    p({ children }) {
        return <p className="text-[14.5px] leading-relaxed text-text-primary mb-3 last:mb-0">{children}</p>;
    },
    ul({ children }) {
        return <ul className="list-disc list-outside pl-5 mb-3 space-y-1 text-[14.5px] text-text-primary">{children}</ul>;
    },
    ol({ children }) {
        return <ol className="list-decimal list-outside pl-5 mb-3 space-y-1 text-[14.5px] text-text-primary">{children}</ol>;
    },
    li({ children }) {
        return <li className="leading-relaxed text-text-primary">{children}</li>;
    },
    blockquote({ children }) {
        return (
            <blockquote className="border-l-2 border-accent pl-3 my-2 text-text-secondary italic">
                {children}
            </blockquote>
        );
    },
    table({ children }) {
        return (
            <div className="my-3 w-full overflow-x-auto rounded-lg border border-border-muted">
                <table className="w-full border-collapse text-left text-xs">{children}</table>
            </div>
        );
    },
    th({ children }) {
        return <th className="bg-elevated px-3 py-2 border-b border-border-muted font-medium text-text-primary">{children}</th>;
    },
    td({ children }) {
        return <td className="px-3 py-2 border-b border-border-subtle text-text-secondary">{children}</td>;
    },
    a({ href, children }) {
        return (
            <a
                href={href}
                target="_blank"
                rel="noreferrer noopener"
                className="text-accent hover:text-accent-hover underline underline-offset-2 transition-colors"
            >
                {children}
            </a>
        );
    },
    hr() {
        return <hr className="my-4 border-border-subtle" />;
    },
};

/** Single chat message bubble — user, assistant, or error */
const MessageBubble = ({ message, onRegenerate, onLike, onDislike }) => {
    const { openArtifact } = useChatContext();
    const isUser = message.role === 'user';
    const isError = message.role === 'error';

    // User Message: right-aligned, elevated surface, max-w ~75%
    if (isUser) {
        return (
            <div className="flex justify-end py-1.5">
                <div className="max-w-[75%] px-4 py-3 rounded-2xl rounded-tr-sm bg-elevated border border-border-muted text-text-primary text-[14.5px] leading-relaxed shadow-sm whitespace-pre-wrap break-words">
                    {message.content}
                    {Array.isArray(message.images) && message.images.length > 0 && (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
                            {message.images.map((imgUrl, i) => (
                                <a
                                    key={i}
                                    href={imgUrl}
                                    target="_blank"
                                    rel="noreferrer noopener"
                                    className="group relative rounded-xl overflow-hidden border border-border-muted bg-[#121318] aspect-video block"
                                >
                                    <img
                                        src={imgUrl}
                                        alt={`Uploaded ${i + 1}`}
                                        className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
                                        loading="lazy"
                                    />
                                </a>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // Error Message: styled with danger token
    if (isError) {
        return (
            <div className="flex justify-start py-1.5">
                <div className="max-w-[75%] px-4 py-3 rounded-xl bg-danger-subtle border border-danger-border text-danger text-sm leading-relaxed flex items-center gap-2.5 shadow-sm">
                    <HiOutlineExclamationTriangle size={18} className="shrink-0" />
                    <span>{message.content}</span>
                </div>
            </div>
        );
    }

    // AI Message: left-aligned with small avatar, no heavy bubble, max-w ~720px
    return (
        <div className="group flex items-start gap-3 py-3 w-full">
            {/* Small AI Avatar */}
            <div className="w-7 h-7 rounded-lg bg-accent-subtle border border-accent-border flex items-center justify-center text-accent-hover shrink-0 mt-0.5 shadow-sm">
                <HiOutlineSparkles size={15} />
            </div>

            {/* Content area */}
            <div className="flex-1 min-w-0 max-w-[720px]">
                <div className="text-text-primary text-[14.5px] leading-relaxed break-words">
                    <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        rehypePlugins={[rehypeHighlight]}
                        components={MARKDOWN_COMPONENTS}
                    >
                        {message.content}
                    </ReactMarkdown>

                    {/* Image gallery (e.g. from Tavily search or vision) */}
                    {Array.isArray(message.images) && message.images.length > 0 && (
                        <div className="mt-3">
                            <p className="text-xs font-medium text-text-muted mb-2 flex items-center gap-1.5">
                                <span>Related Images</span>
                                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-border-muted text-text-secondary">
                                    {message.images.length}
                                </span>
                            </p>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                                {message.images.map((imgUrl, i) => (
                                    <a
                                        key={i}
                                        href={imgUrl}
                                        target="_blank"
                                        rel="noreferrer noopener"
                                        className="group relative rounded-xl overflow-hidden border border-border-muted bg-[#121318] aspect-video block shadow-sm hover:border-accent-border transition-all"
                                    >
                                        <img
                                            src={imgUrl}
                                            alt={`Search visual ${i + 1}`}
                                            referrerPolicy="no-referrer"
                                            className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
                                            loading="lazy"
                                            onError={(e) => {
                                                // If an external host blocks hotlinking, gracefully hide the broken image
                                                e.currentTarget.parentElement.style.display = 'none';
                                            }}
                                        />
                                    </a>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Artifact attachments */}
                    {Array.isArray(message.artifacts) && message.artifacts.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2">
                            {message.artifacts.map((art, idx) => (
                                <button
                                    key={art.id || idx}
                                    type="button"
                                    onClick={() => openArtifact(art)}
                                    className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-border-muted bg-[#12141a] hover:bg-[#1a1d26] hover:border-accent-border transition-colors text-xs font-medium text-text-primary cursor-pointer shadow-sm"
                                >
                                    <HiOutlineCodeBracket size={15} className="text-accent-hover" />
                                    <span>View {art.type || 'Artifact'}</span>
                                    {Array.isArray(art.files) && art.files.length > 0 && (
                                        <span className="text-[10px] text-text-muted bg-border-muted px-1.5 py-0.5 rounded-md">
                                            {art.files.length} {art.files.length === 1 ? 'file' : 'files'}
                                        </span>
                                    )}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* AI Hover Actions */}
                <MessageActions
                    content={message.content}
                    onRegenerate={onRegenerate}
                    onLike={onLike}
                    onDislike={onDislike}
                    messageId={message.id}
                />
            </div>
        </div>
    );
};

export default memo(MessageBubble);
