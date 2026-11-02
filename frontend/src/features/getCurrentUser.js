import api from "../../utils/axios"

const currentUser = async () => {
    try {
        const { data } = await api.get("/api/me");
        console.log(data);
        return data?.user || null;
    } catch (error) {
        if (error.response?.status === 401) {
            // User is not logged in / session expired
            return null;
        }
        console.error("Error fetching current user:", error);
        return null;
    }
}

export default currentUser;