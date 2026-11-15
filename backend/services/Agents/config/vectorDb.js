import { QdrantVectorStore } from "@langchain/qdrant";
import { embeddings } from "./embedding.js";

const getQdrantUrl = () => {
    let raw = process.env.QDRANT_URL || process.env.QDRANT_END_POINT || "http://localhost:6333";
    if (raw.startsWith("https://") && !raw.includes(":6333")) {
        raw = `${raw}:6333`;
    }
    return raw;
};

export const vectorStore = async (docs, collectionName) => {
    return await QdrantVectorStore.fromDocuments(docs, embeddings, {
        url: getQdrantUrl(),
        apiKey: process.env.QDRANT_API_KEY,
        collectionName,
    });
};

export const getExistingVectorStore = async (collectionName) => {
    return await QdrantVectorStore.fromExistingCollection(embeddings, {
        url: getQdrantUrl(),
        apiKey: process.env.QDRANT_API_KEY,
        collectionName,
    });
};
