import { useState, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import hljs from 'highlight.js';
import 'highlight.js/styles/github-dark.css';
import {
    HiOutlineXMark,
    HiOutlineCodeBracket,
    HiOutlineDocumentText,
    HiOutlineComputerDesktop,
    HiOutlinePhoto,
    HiOutlineEye,
    HiOutlineClipboard,
    HiOutlineCheck,
    HiOutlineArrowDownTray,
    HiOutlineArrowTopRightOnSquare,
} from 'react-icons/hi2';
import { useChatContext } from '../contexts/ChatContext';

const EXT_MAP = {
    javascript: 'js',
    js: 'js',
    typescript: 'ts',
    ts: 'ts',
    jsx: 'jsx',
    tsx: 'tsx',
    python: 'py',
    py: 'py',
    html: 'html',
    css: 'css',
    json: 'json',
    markdown: 'md',
    md: 'md',
    sql: 'sql',
    bash: 'sh',
    shell: 'sh',
    svg: 'svg',
    text: 'txt',
};

/** Get extension from filename or language */
const getFileExtension = (name = '', fallback = 'txt') => {
    if (name.includes('.')) {
        return name.split('.').pop().toLowerCase();
    }
    if (EXT_MAP[name.toLowerCase()]) {
        return EXT_MAP[name.toLowerCase()];
    }
    return fallback;
};

/** Icon mapped by artifact type */
const ARTIFACT_ICONS = {
    code: HiOutlineCodeBracket,
    document: HiOutlineDocumentText,
    pdf: HiOutlineDocumentText,
    presentation: HiOutlineComputerDesktop,
    ppt: HiOutlineComputerDesktop,
    image: HiOutlinePhoto,
    project: HiOutlineCodeBracket,
    fix: HiOutlineCodeBracket,
    review: HiOutlineCodeBracket,
    optimization: HiOutlineCodeBracket,
    conversion: HiOutlineCodeBracket,
    documentation: HiOutlineDocumentText,
};

/** Syntax-highlighted code viewer with line numbers */
const HighlightedCodeView = ({ content, language }) => {
    const highlighted = useMemo(() => {
        if (!content) return '';
        try {
            if (language && hljs.getLanguage(language)) {
                return hljs.highlight(content, { language }).value;
            }
            return hljs.highlightAuto(content).value;
        } catch {
            return content;
        }
    }, [content, language]);

    const lines = useMemo(() => (content ? content.split('\n') : ['']), [content]);

    return (
        <div className="flex-1 overflow-auto bg-[#0d1117] flex text-[13px] font-mono leading-relaxed">
            {/* Line numbers gutter */}
            <div className="py-4 px-3 text-right text-text-disabled select-none bg-[#090d13] border-r border-border-subtle shrink-0 font-mono text-xs">
                {lines.map((_, i) => (
                    <div key={i} className="leading-relaxed">
                        {i + 1}
                    </div>
                ))}
            </div>

            {/* Code lines */}
            <pre className="p-4 overflow-x-auto flex-1 m-0 text-text-primary font-mono">
                <code
                    className={language ? `language-${language}` : ''}
                    dangerouslySetInnerHTML={{ __html: highlighted }}
                />
            </pre>
        </div>
    );
};

const Artifacts = ({ onResizeStart }) => {
    const { artifactOpen, currentArtifact, closeArtifact } = useChatContext();
    const [tab, setTab] = useState('preview'); // 'preview' | 'code'
    const [activeFileIndex, setActiveFileIndex] = useState(0);
    const [copied, setCopied] = useState(false);

    // Normalize files from the standard artifact schema { id, type, files: [{ name, content }] }
    const files = useMemo(() => {
        if (Array.isArray(currentArtifact?.files) && currentArtifact.files.length > 0) {
            return currentArtifact.files;
        }
        if (currentArtifact?.content) {
            return [{
                name: currentArtifact.title || 'solution',
                content: currentArtifact.content,
            }];
        }
        return [];
    }, [currentArtifact]);

    const activeFile = files[activeFileIndex] || files[0] || { name: 'file', content: '' };
    const activeExt = getFileExtension(activeFile.name);

    // Build bundled HTML if an HTML file exists
    const liveHtml = useMemo(() => {
        const html = files.find(f => f.name?.endsWith('.html'));
        const css = files.find(f => f.name?.endsWith('.css'));
        const js = files.find(f => f.name?.endsWith('.js'));
        if (html) {
            let doc = html.content || '';
            if (css && !doc.includes(css.content)) {
                doc = doc.replace('</head>', `<style>\n${css.content}\n</style>\n</head>`);
            }
            if (js && !doc.includes(js.content)) {
                doc = doc.replace('</body>', `<script>\n${js.content}\n</script>\n</body>`);
            }
            return doc;
        }
        if (activeFile.name?.endsWith('.html') || (typeof activeFile.content === 'string' && activeFile.content.includes('<html'))) {
            return activeFile.content;
        }
        return null;
    }, [files, activeFile]);

    if (!artifactOpen) return null;

    const iconKey = (currentArtifact?.type || 'code').toLowerCase();
    const Icon = ARTIFACT_ICONS[iconKey] ?? HiOutlineCodeBracket;

    const isPdfArtifact =
        currentArtifact?.type?.toLowerCase() === 'pdf' ||
        activeFile?.name?.toLowerCase().endsWith('.pdf') ||
        (typeof activeFile?.content === 'string' && activeFile.content.includes('.pdf') && activeFile.content.startsWith('http')) ||
        (Boolean(currentArtifact?.url) && currentArtifact?.title?.toLowerCase().endsWith('.pdf'));

    const isPptArtifact =
        currentArtifact?.type?.toLowerCase() === 'presentation' ||
        currentArtifact?.type?.toLowerCase() === 'ppt' ||
        activeFile?.name?.toLowerCase().endsWith('.pptx') ||
        activeFile?.name?.toLowerCase().endsWith('.ppt') ||
        (Boolean(currentArtifact?.url) && (currentArtifact?.title?.toLowerCase().endsWith('.pptx') || currentArtifact?.title?.toLowerCase().endsWith('.ppt')));

    const fileUrl = currentArtifact?.url || activeFile?.url || (typeof activeFile?.content === 'string' && activeFile.content.startsWith('http') ? activeFile.content.trim() : null);
    const pdfUrl = isPdfArtifact ? fileUrl : null;
    const pptUrl = isPptArtifact ? fileUrl : null;

    const handleCopy = async () => {
        if (!activeFile?.content) return;
        try {
            await navigator.clipboard.writeText(activeFile.content);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy artifact content:', err);
        }
    };

    const handleDownload = async () => {
        // If it's a binary document (PDF or PPTX), fetch the binary blob and trigger a direct file download
        if ((isPdfArtifact && pdfUrl) || (isPptArtifact && pptUrl)) {
            const targetUrl = pdfUrl || pptUrl;
            const ext = isPdfArtifact ? 'pdf' : 'pptx';
            try {
                const response = await fetch(targetUrl);
                const blob = await response.blob();
                const blobUrl = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = blobUrl;
                let downloadName = currentArtifact?.title || activeFile?.name || `presentation.${ext}`;
                if (!downloadName.toLowerCase().endsWith(`.${ext}`)) {
                    downloadName = `${downloadName}.${ext}`;
                }
                a.download = downloadName;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(blobUrl);
                return;
            } catch (err) {
                // Fallback to opening the presigned S3 link in a new tab
                window.open(targetUrl, '_blank', 'noopener,noreferrer');
                return;
            }
        }

        if (!activeFile?.content) return;

        const filename = activeFile.name || `artifact.${activeExt}`;
        const blob = new Blob([activeFile.content], { type: 'text/plain;charset=utf-8' });
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
        <div className="flex flex-col h-full bg-panel border-l border-border-muted shadow-2xl relative select-none">
            {/* Drag Handle (Desktop only) */}
            {onResizeStart && (
                <div
                    onMouseDown={onResizeStart}
                    className="hidden md:flex absolute -left-1.5 top-0 bottom-0 w-3 cursor-col-resize hover:bg-accent/40 active:bg-accent transition-colors z-30 group items-center justify-center"
                    title="Drag to resize artifact panel"
                    aria-label="Drag to resize panel"
                >
                    <div className="w-0.5 h-8 rounded-full bg-border-strong group-hover:bg-accent transition-colors" />
                </div>
            )}

            {/* Header */}
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-border-subtle bg-elevated shrink-0">
                {/* Title & Type Badge */}
                <div className="flex items-center gap-2 min-w-0 max-w-[45%]">
                    <Icon size={16} className="text-accent-hover shrink-0" />
                    <span className="text-[13px] font-semibold text-text-primary truncate">
                        {currentArtifact?.type ?? 'Artifact'}
                    </span>
                    {activeFile?.name && (
                        <span className="shrink-0 text-[10px] font-mono bg-border-muted text-text-secondary px-1.5 py-0.5 rounded-md truncate max-w-[120px]">
                            {activeFile.name}
                        </span>
                    )}
                </div>

                {/* Tab Switcher (Preview / Code) */}
                <div className="flex items-center rounded-lg bg-panel border border-border-subtle p-0.5">
                    <button
                        onClick={() => setTab('preview')}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                            tab === 'preview'
                                ? 'bg-border-strong text-text-primary shadow-sm'
                                : 'text-text-muted hover:text-text-primary'
                        }`}
                        aria-label="View artifact preview"
                    >
                        <HiOutlineEye size={13} />
                        <span>Preview</span>
                    </button>
                    <button
                        onClick={() => setTab('code')}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                            tab === 'code'
                                ? 'bg-border-strong text-text-primary shadow-sm'
                                : 'text-text-muted hover:text-text-primary'
                        }`}
                        aria-label="View artifact code"
                    >
                        <HiOutlineCodeBracket size={13} />
                        <span>Code</span>
                    </button>
                </div>

                {/* Actions: Copy, Download, Close */}
                <div className="flex items-center gap-1 shrink-0">
                    <button
                        onClick={handleCopy}
                        title={copied ? 'Copied!' : 'Copy active file'}
                        aria-label="Copy active file content"
                        className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-border-subtle transition-colors cursor-pointer"
                    >
                        {copied ? <HiOutlineCheck size={15} className="text-success" /> : <HiOutlineClipboard size={15} />}
                    </button>

                    <button
                        onClick={handleDownload}
                        title="Download active file"
                        aria-label="Download active file"
                        className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-border-subtle transition-colors cursor-pointer"
                    >
                        <HiOutlineArrowDownTray size={15} />
                    </button>

                    <button
                        onClick={closeArtifact}
                        aria-label="Close artifact panel"
                        title="Close panel"
                        className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-border-subtle transition-colors cursor-pointer"
                    >
                        <HiOutlineXMark size={16} />
                    </button>
                </div>
            </div>

            {/* Multi-file Tabs Bar (when multiple files exist) */}
            {files.length > 1 && (
                <div className="flex items-center gap-1 px-3 py-1.5 bg-[#090d13] border-b border-border-subtle overflow-x-auto no-scrollbar shrink-0 select-none">
                    {files.map((file, idx) => (
                        <button
                            key={file.name || idx}
                            onClick={() => setActiveFileIndex(idx)}
                            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono transition-colors cursor-pointer whitespace-nowrap ${
                                activeFileIndex === idx
                                    ? 'bg-[#1f242c] text-accent-hover font-semibold border border-border-muted shadow-sm'
                                    : 'text-text-muted hover:text-text-secondary hover:bg-white/[0.04]'
                            }`}
                        >
                            <span>{file.name}</span>
                        </button>
                    ))}
                </div>
            )}

            {/* Body: Preview vs Code */}
            {tab === 'preview' ? (
                isPdfArtifact && pdfUrl ? (
                    <div className="flex-1 w-full h-full bg-[#18191f] overflow-hidden flex flex-col">
                        <iframe
                            src={`${pdfUrl}#toolbar=1&navpanes=0`}
                            title={currentArtifact?.title || "PDF Viewer"}
                            className="w-full flex-1 border-none bg-white"
                        />
                    </div>
                ) : isPptArtifact && pptUrl ? (
                    <div className="flex-1 w-full h-full bg-[#0d1117] flex flex-col items-center justify-center p-6 text-center select-none">
                        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mb-4 shadow-lg animate-pulse">
                            <HiOutlineComputerDesktop size={32} />
                        </div>
                        <h3 className="text-base font-semibold text-text-primary mb-1 max-w-sm truncate">
                            {currentArtifact?.title || "Presentation Deck"}
                        </h3>
                        <p className="text-xs text-text-muted mb-5 max-w-xs leading-relaxed">
                            PowerPoint presentation (.pptx) is ready. Click below or use the top download button to download and open it in PowerPoint or Google Slides.
                        </p>
                        <button
                            type="button"
                            onClick={handleDownload}
                            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-black font-semibold text-xs transition-all shadow-md active:scale-95 cursor-pointer"
                        >
                            <HiOutlineArrowDownTray size={16} />
                            <span>Download Presentation (.pptx)</span>
                        </button>
                    </div>
                ) : liveHtml ? (
                    <div className="flex-1 overflow-hidden bg-white">
                        <iframe
                            srcDoc={liveHtml}
                            title="Live Preview"
                            sandbox="allow-scripts allow-modals"
                            className="w-full h-full border-none"
                        />
                    </div>
                ) : activeFile?.name?.endsWith('.md') ? (
                    <div className="flex-1 overflow-auto p-6 bg-panel text-text-primary text-[14.5px] leading-relaxed">
                        <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
                            {activeFile.content}
                        </ReactMarkdown>
                    </div>
                ) : (
                    <div className="flex-1 overflow-auto p-4 bg-panel text-text-primary flex flex-col">
                        <div className="mb-3 px-1">
                            <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
                                File View: {activeFile.name}
                            </h3>
                        </div>
                        <div className="flex-1 rounded-xl border border-border-muted overflow-hidden flex flex-col">
                            <HighlightedCodeView content={activeFile.content} language={activeExt} />
                        </div>
                    </div>
                )
            ) : (
                <HighlightedCodeView content={activeFile.content} language={activeExt} />
            )}
        </div>
    );
};

export default Artifacts;
