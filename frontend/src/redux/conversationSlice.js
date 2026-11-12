import { createSlice } from "@reduxjs/toolkit";

const initialState = {
    conversations: [],
    currentConversationId: null,
    currentConversation: null,
    loading: false,
};

const conversationSlice = createSlice({
    name: "conversations",
    initialState,
    reducers: {
        setConversations: (state, action) => {
            state.conversations = Array.isArray(action.payload) ? action.payload : [];
            state.loading = false;
        },
        addConversation: (state, action) => {
            if (action.payload) {
                const newConvo = action.payload;
                const id = newConvo._id || newConvo.id;
                // Prepend and avoid duplicates
                state.conversations = [
                    newConvo,
                    ...state.conversations.filter((c) => (c._id || c.id) !== id),
                ];
                state.currentConversationId = id;
                state.currentConversation = newConvo;
            }
        },
        setCurrentConversation: (state, action) => {
            const convo = action.payload;
            if (!convo) {
                state.currentConversation = null;
                state.currentConversationId = null;
                return;
            }
            if (typeof convo === "string") {
                state.currentConversationId = convo;
                state.currentConversation =
                    state.conversations.find((c) => (c._id || c.id) === convo) || {
                        _id: convo,
                        title: "Conversation",
                    };
            } else {
                state.currentConversation = convo;
                state.currentConversationId = convo._id || convo.id || null;
            }
        },
        updateConversationTitle: (state, action) => {
            const { id, title } = action.payload;
            const target = state.conversations.find((c) => (c._id || c.id) === id);
            if (target) {
                target.title = title;
            }
            if (
                state.currentConversation &&
                (state.currentConversation._id === id || state.currentConversation.id === id)
            ) {
                state.currentConversation.title = title;
            }
        },
        deleteConversation: (state, action) => {
            const id = action.payload;
            state.conversations = state.conversations.filter(
                (c) => (c._id || c.id) !== id
            );
            if (state.currentConversationId === id) {
                const next = state.conversations[0] || null;
                state.currentConversation = next;
                state.currentConversationId = next ? next._id || next.id : null;
            }
        },
        setConversationLoading: (state, action) => {
            state.loading = Boolean(action.payload);
        },
        clearConversations: (state) => {
            state.conversations = [];
            state.currentConversationId = null;
            state.currentConversation = null;
            state.loading = false;
        },
    },
});

export const {
    setConversations,
    addConversation,
    setCurrentConversation,
    updateConversationTitle,
    deleteConversation,
    setConversationLoading,
    clearConversations,
} = conversationSlice.actions;

export default conversationSlice.reducer;
