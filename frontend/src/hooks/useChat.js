import { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useChatContext } from '../contexts/ChatContext';
import { sendMessage } from '../services/agentService';
import { createConversation } from '../features/createConversation';
import { updateConversation } from '../features/updateConversation';
import {
    addConversation,
    updateConversationTitle,
} from '../redux/conversationSlice';

/**
 * Encapsulates all chat send logic and connects with Redux conversation state.
 * Returns a stable `handleSend` function.
 */
const useChat = () => {
    const dispatch = useDispatch();
    const { currentConversationId, currentConversation } = useSelector(
        (state) => state.conversations
    );

    const {
        conversationId: fallbackConversationId,
        addMessage,
        setIsLoading,
        isLoading,
        openArtifact,
        activeMode,
        setActiveMode,
    } = useChatContext();

    const handleSend = useCallback(
        async (prompt) => {
            const trimmedPrompt = prompt.trim();
            if (!trimmedPrompt || isLoading) return;

            // 1. Resolve or create active conversation ID in Redux
            let activeConvoId = currentConversationId;
            let isFirstMessage = false;

            if (!activeConvoId) {
                const newConvo = await createConversation();
                if (newConvo) {
                    dispatch(addConversation(newConvo));
                    activeConvoId = newConvo._id || newConvo.id;
                    isFirstMessage = true;
                } else {
                    activeConvoId = fallbackConversationId;
                }
            }

            // 2. Add user message to UI state
            const userMessage = {
                id: crypto.randomUUID(),
                role: 'user',
                content: trimmedPrompt,
                timestamp: Date.now(),
            };
            addMessage(userMessage);
            setIsLoading(true);

            // 3. Send message to AI backend via gateway
            try {
                const response = await sendMessage({
                    prompt: trimmedPrompt,
                    conversationId: activeConvoId,
                    agent: activeMode,
                });

                const content =
                    typeof response === 'string'
                        ? response
                        : response?.answer ?? response?.response ?? response?.text ?? response?.content ?? JSON.stringify(response);

                // If currently in Auto mode, automatically shift UI active pill to the agent chosen by the router
                if (activeMode === 'auto' && response?.agent) {
                    const resolvedAgent = response.agent === 'vision' ? 'vision' : response.agent;
                    setActiveMode(resolvedAgent);
                }

                const rawImages = response?.images || response?.data?.images || [];
                const images = Array.isArray(rawImages) ? rawImages : [];

                const rawArtifacts = response?.artifacts || [];
                const artifacts = Array.isArray(rawArtifacts) ? rawArtifacts : [];

                const aiMessage = {
                    id: crypto.randomUUID(),
                    role: 'assistant',
                    content,
                    images,
                    artifacts,
                    timestamp: Date.now(),
                };
                addMessage(aiMessage);

                // Auto-generate title if it's the first message or currently "New chat"
                const currentTitle = currentConversation?.title;
                if (
                    activeConvoId &&
                    (isFirstMessage || !currentTitle || currentTitle === 'New chat' || currentTitle === 'New conversation')
                ) {
                    const generatedTitle =
                        trimmedPrompt.length > 32
                            ? `${trimmedPrompt.slice(0, 32)}…`
                            : trimmedPrompt;
                    dispatch(
                        updateConversationTitle({
                            id: activeConvoId,
                            title: generatedTitle,
                        })
                    );
                    updateConversation({ id: activeConvoId, title: generatedTitle }).catch(() => {});
                }

                // If response contains artifacts, open the preview panel
                if (artifacts.length > 0) {
                    openArtifact(artifacts[0]);
                }
            } catch (error) {
                addMessage({
                    id: crypto.randomUUID(),
                    role: 'error',
                    content: 'Something went wrong. Please try again.',
                    timestamp: Date.now(),
                });
                console.error('Chat send error:', error);
            } finally {
                setIsLoading(false);
            }
        },
        [
            isLoading,
            currentConversationId,
            currentConversation,
            fallbackConversationId,
            addMessage,
            setIsLoading,
            openArtifact,
            dispatch,
        ]
    );

    return { handleSend };
};

export default useChat;
