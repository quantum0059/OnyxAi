import Conversation from "../model/conversation.model.js";
import Message from "../model/message.model.js";

export const createConversations = async (req, res) => {
    try {
        const userId = req.headers["x-user-id"];
        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const conversation = await Conversation.create({
            userId: userId
        })
        return res.status(201).json({ message: "Conversation created", conversation })
    } catch (error) {
        return res.status(500).json({ message: "Error while creating new conversation", error })

    }


};

export const getMyConversations = async (req, res) => {
    try {
        const userId = req.headers["x-user-id"];
        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const conversations = await Conversation.find({
            userId: userId
        }).sort({ createdAt: -1 });
        return res.status(200).json({ message: "Conversations fetched successfully", conversations })
    } catch (error) {
        return res.status(500).json({ message: "Error while fetching conversations", error })

    }
}

export const updateConversation = async (req, res) => {
    try {
        const { id, title } = req.body;
        const userId = req.headers["x-user-id"];
        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const convo = await Conversation.findByIdAndUpdate(
            { _id: id, userId },
            { title },
            { new: true }
        );
        if (!convo) {
            return res.status(404).json({ message: "Conversation not found" });
        }

        return res.status(200).json({ message: "Conversation updated successfully", convo });
    } catch (error) {
        return res.status(500).json({ message: "Error while updating conversation", error });
    }
}

export const saveMessages = async (req, res) => {
    try {
        const { conversationId, content, role, images, artifacts, file } = req.body;
        const userId = req.headers["x-user-id"];
        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const conversation = await Conversation.findOne({ _id: conversationId, userId });
        if (!conversation) {
            return res.status(404).json({ message: "Conversation not found" });
        }

        const normalizedImages = Array.isArray(images)
            ? images.filter(Boolean)
            : (typeof images === "string" && images.trim() ? [images.trim()] : []);

        const message = await Message.create({
            conversationId: conversationId,
            content: content,
            role: role,
            images: normalizedImages,
            file,
            artifacts
        });
        return res.status(200).json({ message: "Message saved successfully", message });
    } catch (error) {
        return res.status(500).json({ message: "Error while saving message", error });
    }
}

export const getConversationMessages = async (req, res) => {
    try {
        const userId = req.headers["x-user-id"];
        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const conversation = await Conversation.findOne({
            _id: req.params.conversationId,
            userId,
        });
        if (!conversation) {
            return res.status(404).json({ message: "Conversation not found" });
        }

        const messages = await Message.find({
            conversationId: req.params.conversationId
        }).sort({ createdAt: -1 });
        return res.status(200).json({ message: "Messages fetched successfully", messages });
    } catch (error) {
        return res.status(500).json({ message: "Error while fetching messages", error });
    }
}
