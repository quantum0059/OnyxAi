import { useState, useEffect, useCallback } from 'react';
import SideBar from '../components/SideBar';
import TopBar from '../components/TopBar';
import ChatArea from '../components/ChatArea';
import Artifacts from '../components/Artifacts';
import { useChatContext } from '../contexts/ChatContext';

const MIN_PANEL_WIDTH = 360;
const DEFAULT_PANEL_WIDTH = 480;

/**
 * ChatLayout orchestrates the responsive 3-column layout:
 * - Desktop: [Sidebar (56px rail or 256px)] | [TopBar + Chat Area] | [Resizable Artifact Panel]
 * - Mobile (< 768px): [Overlay Drawer + Backdrop] | [Full-width Chat] | [Full-screen Artifact Sheet]
 */
const ChatLayout = () => {
    const { sidebarOpen, artifactOpen } = useChatContext();
    const [panelWidth, setPanelWidth] = useState(DEFAULT_PANEL_WIDTH);
    const [isDragging, setIsDragging] = useState(false);
    const [isMobile, setIsMobile] = useState(() =>
        typeof window !== 'undefined' ? window.innerWidth < 768 : false
    );

    // Track window resize for responsive breakpoint adjustments
    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth < 768);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const handleResizeStart = useCallback((e) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    // Handle mouse drag for resizing artifact panel (desktop only)
    useEffect(() => {
        if (!isDragging) return;

        const handleMouseMove = (e) => {
            const maxWidth = Math.min(window.innerWidth * 0.65, 840);
            const newWidth = window.innerWidth - e.clientX;
            if (newWidth >= MIN_PANEL_WIDTH && newWidth <= maxWidth) {
                setPanelWidth(newWidth);
            }
        };

        const handleMouseUp = () => {
            setIsDragging(false);
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging]);

    return (
        <div
            className={`flex h-screen bg-app-bg text-text-primary overflow-hidden ${
                isDragging ? 'select-none cursor-col-resize' : ''
            }`}
        >
            {/* Sidebar (drawer on mobile, rail/column on desktop) */}
            <SideBar />

            {/* Spacer that pushes main content — desktop only */}
            <div
                className="hidden md:block shrink-0 transition-all duration-200 ease-out"
                style={{ width: sidebarOpen ? '256px' : '56px' }}
                aria-hidden="true"
            />

            {/* Main content: TopBar + ChatArea */}
            <main className="flex-1 min-w-0 flex flex-col h-full overflow-hidden">
                <TopBar />
                <div className="flex-1 min-h-0">
                    <ChatArea />
                </div>
            </main>

            {/* Artifact Panel: Full-screen sheet on mobile, resizable side panel on desktop */}
            <div
                className={`
                    shrink-0 overflow-hidden
                    ${isDragging ? '' : 'transition-all duration-200 ease-out'}
                    ${artifactOpen
                        ? 'fixed inset-0 z-50 w-full h-full md:relative md:inset-auto md:z-10'
                        : 'w-0'
                    }
                `}
                style={{
                    width: artifactOpen
                        ? isMobile
                            ? '100%'
                            : `${panelWidth}px`
                        : '0px',
                }}
                aria-label="Artifact preview panel"
            >
                <Artifacts onResizeStart={isMobile ? undefined : handleResizeStart} />
            </div>
        </div>
    );
};

export default ChatLayout;
