import React from 'react';
import { auth, googleProvider } from '../../utils/firebase';
import { signInWithPopup, signOut } from 'firebase/auth';
import api from '../../utils/axios';
import { FcGoogle } from 'react-icons/fc';
import { useDispatch, useSelector } from 'react-redux';
import { setUserData } from '../redux/userSlice';

const Home = () => {
    const { userData, loading } = useSelector((state) => state.user);
    const dispatch = useDispatch();

    // Backend Login
    const handelLogin = async (token) => {
        try {
            const { data } = await api.post('/api/auth/login', { token });
            dispatch(setUserData(data));

            console.log('Logged in:', data);

            return data;
        } catch (error) {
            console.error('Backend login failed:', error);
            throw error;
        }
    };

    // Logout
    const handelLogout = async () => {
        try {
            await api.get('/api/auth/logout');

            // Sign out from Firebase
            await signOut(auth);

            dispatch(setUserData(null));

            console.log('Logged out successfully');
        } catch (error) {
            console.error('Logout failed:', error);
        }
    };

    // Google Login
    const googleLogin = async () => {
        try {
            const result = await signInWithPopup(auth, googleProvider);

            const token = await result.user.getIdToken();

            await handelLogin(token);

        } catch (error) {
            console.error('Google login failed:', error);
        }
    };

    return (
        <div className="h-screen flex flex-col bg-[#0d0f14] text-white overflow-hidden p-6">

            {userData && (
                <div className="flex justify-between items-center w-full max-w-4xl mx-auto py-4 px-6 bg-[#13151c] rounded-xl border border-white/[0.08]">

                    <div className="flex items-center gap-3">

                        {userData.avatar ? (
                            <img
                                src={userData.avatar}
                                alt={userData.name}
                                className="w-10 h-10 rounded-full border border-white/20"
                            />
                        ) : (
                            <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center font-bold">
                                {userData.name?.[0] || 'U'}
                            </div>
                        )}

                        <div>
                            <h3 className="font-semibold text-slate-100">
                                {userData.name}
                            </h3>

                            <p className="text-xs text-slate-400">
                                {userData.email}
                            </p>
                        </div>

                    </div>

                    <button
                        onClick={handelLogout}
                        className="px-4 py-2 text-xs font-semibold bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg transition-all cursor-pointer"
                    >
                        Sign Out
                    </button>

                </div>
            )}

            {!userData && !loading && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur">

                    <div className="w-[340px] bg-[#13151c] border border-white/[0.08] rounded-2xl p-7 flex flex-col gap-5">

                        <div className="flex flex-col gap-1">

                            <h2 className="text-[17px] font-semibold text-slate-100 tracking-tight">
                                Welcome to OynxAi
                            </h2>

                            <p className="text-[13px] text-slate-500">
                                Please login to continue using this app.
                            </p>

                        </div>

                        <button
                            type="button"
                            onClick={googleLogin}
                            className="group relative w-full h-12 px-5 overflow-hidden
                            flex items-center justify-center gap-3
                            rounded-full
                            bg-gradient-to-b from-white to-[#f8f9fa]
                            text-[#3c4043] text-sm font-semibold tracking-wide
                            border border-[#dadce0]
                            shadow-[0_1px_2px_rgba(60,64,67,0.15),0_1px_3px_1px_rgba(60,64,67,0.08)]
                            transition-all duration-200 ease-out cursor-pointer
                            hover:-translate-y-0.5 hover:border-[#c6dafc]
                            hover:shadow-[0_6px_16px_-4px_rgba(66,133,244,0.35)]
                            active:translate-y-0 active:scale-[0.98] active:shadow-sm
                            focus:outline-none focus-visible:ring-4 focus-visible:ring-[#4285f4]/30
                            disabled:opacity-60 disabled:pointer-events-none"
                        >

                            <span
                                aria-hidden="true"
                                className="pointer-events-none absolute inset-0 -translate-x-full
                                bg-gradient-to-r from-transparent via-[#4285f4]/10 to-transparent
                                transition-transform duration-700 ease-out
                                group-hover:translate-x-full"
                            />

                            <FcGoogle
                                size={20}
                                className="relative transition-transform duration-200 group-hover:scale-110"
                            />

                            <span className="relative">
                                Continue with Google
                            </span>

                        </button>

                    </div>

                </div>
            )}

        </div>
    );
};

export default Home;
