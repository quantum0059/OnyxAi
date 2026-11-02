import express from "express";
import { createConversations, getConversationMessages, getMyConversations, saveMessages, updateConversation } from "../controllers/chat.controller.js";

const router = express.Router();

router.get("/create-conversation", createConversations);
router.get("/get-conversations", getMyConversations);
router.post("/update-conversation", updateConversation);
router.post("/save-message", saveMessages)
router.get("/get-conversation-messages/:conversationId", getConversationMessages);
export default router;