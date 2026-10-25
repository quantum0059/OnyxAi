import React from 'react'
import { auth, googleProvider } from '../../utils/firebase';
import { signInWithPopup } from 'firebase/auth';
import api from '../../utils/axios';
import { FcGoogle } from "react-icons/fc";

const Home = () => {
    const handelLogin = async (token) => {
        try {
            const { data } = await api.post("/auth/login", { token });
            console.log(data);
        } catch (error) {
            console.log(error);
        }
    }
    const googleLogin = async () => {
        const data = await signInWithPopup(auth, googleProvider);
        const token = await data.user.getIdToken();
        console.log(token);
        handelLogin(token);
    }
    return (
        <div className='h-screen flex bg-[#0d0f14] text-white overflow-hidden'>
            <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur'>
                <div className='w-[340px] bg-[#13151c] border border-white/[0.08] rounded-2xl p-7 flex flex-col gap-5'>
                    <div className='flex flex-col gap-1'>
                        <h2 className='text-[17px] font-semibold text-slate-100 tracking-tight'>Welcome to OynxAi</h2>
                        <p className='text-[13px] text-slate-500'>Please login to continue using this app.</p>
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
                        {/* shine sweep on hover */}
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
                        <span className="relative">Continue with Google</span>
                    </button>
                </div>
            </div>
        </div>
    )
}

export default Home