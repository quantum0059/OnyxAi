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
import { updateUserCredits } from '../redux/userSlice';

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
        async (prompt, file = null) => {
            const trimmedPrompt = (typeof prompt === 'string' ? prompt : '').trim();
            if ((!trimmedPrompt && !file) || isLoading) return;

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

            // 2. Add user message to UI state (with image preview or attached document)
            const userImages = file && file.type?.startsWith('image/')
                ? [URL.createObjectURL(file)]
                : [];

            const attachedFile = file ? {
                name: file.name,
                type: file.type,
                size: file.size,
            } : null;

            const userMessage = {
                id: crypto.randomUUID(),
                role: 'user',
                content: trimmedPrompt,
                images: userImages,
                file: attachedFile,
                timestamp: Date.now(),
            };
            addMessage(userMessage);
            setIsLoading(true);

            // 3. Send message to AI backend via gateway
            try {
                const response = await sendMessage({
                    prompt: trimmedPrompt || (file ? `Analyze the attached file: ${file.name}` : ''),
                    conversationId: activeConvoId,
                    agent: activeMode,
                    file,
                });

                const content =
                    typeof response === 'string'
                        ? response
                        : response?.answer ?? response?.response ?? response?.text ?? response?.content ?? JSON.stringify(response);

                // If currently in Auto mode, automatically shift UI active pill to the agent chosen by the router
                if (activeMode === 'auto' && response?.agent) {
                    const resolvedAgent =
                        response.agent === 'imageAnalyzer' || response.agent === 'vision'
                            ? 'vision'
                            : response.agent === 'pdfRag'
                            ? 'pdf'
                            : response.agent;
                    setActiveMode(resolvedAgent);
                }

                // If backend returned remaining credits, update Redux user store immediately
                if (typeof response?.credits === 'number') {
                    dispatch(updateUserCredits(response.credits));
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
                if (error?.isRateLimit) {
                    const { message, retryAfter, agent: limitedAgent, limit } = error.data || {};
                    addMessage({
                        id: crypto.randomUUID(),
                        role: 'rate-limit',
                        content: message || `You've hit the request limit. Please try again in ${retryAfter || 'a minute'}.`,
                        retryAfter,
                        limitedAgent,
                        limit,
                        timestamp: Date.now(),
                    });
                } else {
                    addMessage({
                        id: crypto.randomUUID(),
                        role: 'error',
                        content: 'Something went wrong. Please try again.',
                        timestamp: Date.now(),
                    });
                }
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
