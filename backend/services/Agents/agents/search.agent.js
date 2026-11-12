import { tool as searchTool } from "../config/tavily.js";

export const searchAgent = async (state) => {
    try {
        const query = typeof state.prompt === "string" ? state.prompt : JSON.stringify(state.prompt);
        const results = await searchTool.invoke({ query });

        const images = Array.isArray(results?.images) ? results.images : [];
        const searchResults = results?.results || results || "No results found";

        return {
            ...state,
            searchResults,
            images
        };
    } catch (error) {
        console.error("Error in searchAgent:", error?.message || error);
        return {
            ...state,
            searchResults: "Error in searching",
            images: []
        };
    }
};
