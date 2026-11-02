import { configureStore } from '@reduxjs/toolkit'
import userReducer from './userSlice'

export const store = configureStore({
    reducer: {
        user: userReducer
    },
});


//this is the redux toolkit configuration here we can store the data coming from the backend
//centrallyy and use the data when other files needed it the files in the redux context are 
//called slices and each slice can modify, add and use the data from the redux