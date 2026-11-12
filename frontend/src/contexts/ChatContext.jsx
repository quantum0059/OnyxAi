import { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { DEFAULT_MODE_ID, getModeConfig, isValidMode } from '../config/agentModes';

const ChatContext = createContext(null);

/**
 * Provides global chat state: messages, active agent mode, artifact panel visibility,
 * the current artifact, and conversation ID.
 */
export const ChatProvider = ({ children }) => {
    const [messages, setMessages] = useState([]);
    const [conversationId] = useState(() => crypto.randomUUID());
    const [isLoading, setIsLoading] = useState(false);

    // Active Agent Mode ('chat', 'coding', 'ppt', 'pdf', 'search')
    const [activeMode, setActiveModeState] = useState(DEFAULT_MODE_ID);

    const setActiveMode = useCallback((modeId) => {
        if (isValidMode(modeId)) {
            setActiveModeState(modeId);
        } else {
            console.warn(`[ChatContext] Attempted to set invalid mode "${modeId}". Falling back to default.`);
            setActiveModeState(DEFAULT_MODE_ID);
        }
    }, []);

    const currentModeConfig = useMemo(() => getModeConfig(activeMode), [activeMode]);

    // Artifact panel state
    const [artifactOpen, setArtifactOpen] = useState(false);
    const [currentArtifact, setCurrentArtifact] = useState(null);

    // Sidebar collapsed state
    const [sidebarOpen, setSidebarOpen] = useState(true);

    const addMessage = useCallback((message) => {
        setMessages((prev) => [...prev, message]);
    }, []);

    const openArtifact = useCallback((artifact) => {
        setCurrentArtifact(artifact);
        setArtifactOpen(true);
    }, []);

    const closeArtifact = useCallback(() => {
        setArtifactOpen(false);
    }, []);

    const toggleSidebar = useCallback(() => {
        setSidebarOpen((prev) => !prev);
    }, []);

    return (
        <ChatContext.Provider
            value={{
                messages,
                setMessages,
                addMessage,
                conversationId,
                isLoading,
                setIsLoading,
                activeMode,
                setActiveMode,
                currentModeConfig,
                artifactOpen,
                currentArtifact,
                openArtifact,
                closeArtifact,
                sidebarOpen,
                toggleSidebar,
            }}
        >
            {children}
        </ChatContext.Provider>
    );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useChatContext = () => {
    const ctx = useContext(ChatContext);
    if (!ctx) throw new Error('useChatContext must be used within ChatProvider');
    return ctx;
};


