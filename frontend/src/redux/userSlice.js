import { createSlice } from "@reduxjs/toolkit";

const userSlice = createSlice({
    name: "user",
    initialState: {
        userData: null,
        loading: true,
    },
    reducers: {
        setUserData(state, action) {
            state.userData = action.payload;
            state.loading = false;
        },
        updateUserCredits(state, action) {
            if (state.userData) {
                state.userData.credits = action.payload;
            }
        },
        setLoading(state, action) {
            state.loading = action.payload;
        }
    }
});

export const { setUserData, updateUserCredits, setLoading } = userSlice.actions;
export default userSlice.reducer;

//here slices take data in from of the object