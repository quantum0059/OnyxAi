import { signInWithPopup, signOut } from 'firebase/auth';
import { FcGoogle } from 'react-icons/fc';
import { useDispatch, useSelector } from 'react-redux';
import { auth, googleProvider } from '../../utils/firebase';
import api from '../../utils/axios';
import { setUserData } from '../redux/userSlice';
import ChatLayout from '../layouts/ChatLayout';
import { ChatProvider } from '../contexts/ChatContext';

/** Full-screen spinner shown while session is being resolved */
const LoadingScreen = () => (
    <div className="h-screen flex items-center justify-center bg-app-bg">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
    </div>
);

/** Login modal overlay */
const LoginModal = ({ onGoogleLogin }) => (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
        <div className="w-[340px] bg-panel border border-border-muted rounded-2xl p-7 flex flex-col gap-5 shadow-2xl">
            <div className="flex flex-col gap-1">
                <h2 className="text-[17px] font-semibold text-text-primary tracking-tight">
                    Welcome to OnyxAI
                </h2>
                <p className="text-[13px] text-text-secondary">
                    Please sign in to continue using this app.
                </p>
            </div>

            <button
                type="button"
                onClick={onGoogleLogin}
                className="
                    group relative w-full h-12 px-5 overflow-hidden
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
                    disabled:opacity-60 disabled:pointer-events-none
                "
            >
                {/* Shimmer overlay */}
                <span
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 -translate-x-full
                        bg-gradient-to-r from-transparent via-[#4285f4]/10 to-transparent
                        transition-transform duration-700 ease-out
                        group-hover:translate-x-full"
                />
                <FcGoogle size={20} className="relative transition-transform duration-200 group-hover:scale-110" />
                <span className="relative">Continue with Google</span>
            </button>
        </div>
    </div>
);

const Home = () => {
    const { userData, loading } = useSelector((state) => state.user);
    const dispatch = useDispatch();

    const handleBackendLogin = async (token) => {
        const { data } = await api.post('/api/auth/login', { token });
        dispatch(setUserData(data));
    };

    const handleGoogleLogin = async () => {
        try {
            const result = await signInWithPopup(auth, googleProvider);
            const token = await result.user.getIdToken();
            await handleBackendLogin(token);
        } catch (err) {
            console.error('Google login failed:', err);
        }
    };

    if (loading) return <LoadingScreen />;

    return (
        <ChatProvider>
            <ChatLayout />
            {!userData && <LoginModal onGoogleLogin={handleGoogleLogin} />}
        </ChatProvider>
    );
};

export default Home;
