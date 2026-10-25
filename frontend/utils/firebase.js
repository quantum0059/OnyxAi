// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: "onyxai-75f63.firebaseapp.com",
    projectId: "onyxai-75f63",
    storageBucket: "onyxai-75f63.firebasestorage.app",
    messagingSenderId: "26933940315",
    appId: "1:26933940315:web:2be976a414f18c213c2f7e",
    measurementId: "G-S2F7EQBM3M"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
// const analytics = getAnalytics(app);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();