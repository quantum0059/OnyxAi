import { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
    HiOutlineXMark,
    HiOutlineCheck,
    HiOutlineSparkles,
    HiOutlineBolt,
    HiOutlineArrowPath,
} from 'react-icons/hi2';
import {
    loadRazorpayScript,
    createPaymentOrder,
    verifyPaymentOrder,
} from '../features/payment';
import currentUser from '../features/getCurrentUser';
import { setUserData } from '../redux/userSlice';

export const PLANS_CONFIG = [
    {
        id: 'free',
        name: 'Free',
        badge: 'Current',
        tagline: 'Explore what OnyxAI can do.',
        amount: 0,
        period: '/month',
        credits: 100,
        features: [
            '100 monthly AI credits',
            'Access to Normal Chat & Search',
            'Standard generation speed',
            'Basic artifact & coding previews',
        ],
        ctaText: 'Your current plan',
        isCurrent: true,
        popular: false,
    },
    {
        id: 'starter',
        name: 'Starter',
        badge: 'Popular',
        tagline: 'More credits and capabilities for frequent creators.',
        amount: 199,
        originalAmount: 299,
        period: '/month',
        credits: 500,
        features: [
            '500 monthly AI credits',
            'Access to PDF & Presentation Agents',
            'High-resolution Vision generation',
            'Priority queue & faster response times',
            'Save unlimited chat histories',
        ],
        ctaText: 'Upgrade to Starter',
        isCurrent: false,
        popular: true,
    },
    {
        id: 'pro',
        name: 'Pro',
        badge: 'Best Value',
        tagline: 'High volume credits for power users and builders.',
        amount: 499,
        originalAmount: 699,
        period: '/month',
        credits: 1000,
        features: [
            '1,000 monthly AI credits',
            'DeepSeek coding & multi-file full project exports',
            'High-fidelity PDF document creation with S3 download',
            'Full PowerPoint (PPTX) deck generation',
            'Dedicated high-throughput model endpoints',
        ],
        ctaText: 'Upgrade to Pro',
        isCurrent: false,
        popular: false,
    },
];

const UpgradePlanModal = ({ isOpen, onClose }) => {
    const dispatch = useDispatch();
    const { userData } = useSelector((state) => state.user);

    const [billingTab, setBillingTab] = useState('personal'); // 'personal' | 'business'
    const [processingPlanId, setProcessingPlanId] = useState(null);
    const [statusMessage, setStatusMessage] = useState(null); // { type: 'success' | 'error', text: string }

    if (!isOpen) return null;

    const currentPlanId = userData?.plan?.toLowerCase() || 'free';

    const handleSubscribe = async (plan) => {
        if (plan.id === currentPlanId || plan.amount === 0) return;

        setProcessingPlanId(plan.id);
        setStatusMessage(null);

        try {
            const razorpayKeyId = import.meta.env.VITE_RAZORPAY_KEY_ID;
            if (!razorpayKeyId) {
                throw new Error('Razorpay key is not configured. Please set VITE_RAZORPAY_KEY_ID.');
            }

            // 1. Ensure Razorpay SDK is ready
            const isLoaded = await loadRazorpayScript();
            if (!isLoaded) {
                throw new Error('Razorpay SDK failed to load. Please check your internet connection.');
            }

            // 2. Call backend via gateway to create order
            const orderData = await createPaymentOrder(plan.id);
            const { order } = orderData;

            if (!order || !order.id) {
                throw new Error('Failed to create payment order.');
            }

            // 3. Configure Razorpay Checkout options
            const options = {
                key: razorpayKeyId,
                amount: order.amount,
                currency: order.currency || 'INR',
                name: 'OnyxAI Platform',
                description: `Upgrade to ${plan.name} Plan (${plan.credits} credits)`,
                order_id: order.id,
                prefill: {
                    name: userData?.name || '',
                    email: userData?.email || '',
                },
                theme: {
                    color: '#6366f1', // Indigo brand
                },
                handler: async function (response) {
                    try {
                        setProcessingPlanId(plan.id);
                        setStatusMessage({ type: 'info', text: 'Verifying payment...' });

                        // 4. Verify signature on backend
                        await verifyPaymentOrder({
                            razorpay_order_id: response.razorpay_order_id,
                            razorpay_payment_id: response.razorpay_payment_id,
                            razorpay_signature: response.razorpay_signature,
                        });

                        // 5. Refresh user session / state in Redux
                        const updatedUser = await currentUser();
                        if (updatedUser) {
                            dispatch(setUserData(updatedUser));
                        }

                        setStatusMessage({
                            type: 'success',
                            text: `🎉 Successfully upgraded to the ${plan.name} plan!`,
                        });

                        // Close modal after brief success feedback
                        setTimeout(() => {
                            onClose();
                            setStatusMessage(null);
                        }, 2000);
                    } catch (verifyError) {
                        console.error('Payment verification failed:', verifyError);
                        setStatusMessage({
                            type: 'error',
                            text: verifyError.response?.data?.message || 'Payment verification failed. Please contact support.',
                        });
                    } finally {
                        setProcessingPlanId(null);
                    }
                },
                modal: {
                    ondismiss: function () {
                        setProcessingPlanId(null);
                    },
                },
            };

            const rzp = new window.Razorpay(options);
            rzp.on('payment.failed', function (resp) {
                console.error('Payment failed:', resp.error);
                setStatusMessage({
                    type: 'error',
                    text: resp.error.description || 'Payment failed. Please try again.',
                });
                setProcessingPlanId(null);
            });

            rzp.open();
        } catch (error) {
            console.error('Checkout error:', error);
            setStatusMessage({
                type: 'error',
                text: error.response?.data?.message || error.message || 'Something went wrong.',
            });
            setProcessingPlanId(null);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 overflow-y-auto">
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity animate-fade-in"
                onClick={onClose}
                aria-hidden="true"
            />

            {/* Modal Dialog */}
            <div className="relative w-full max-w-5xl bg-[#1A1A1A] border border-white/[0.08] rounded-3xl shadow-2xl p-6 sm:p-8 z-10 my-auto text-white overflow-hidden animate-fade-up">
                {/* Close Button */}
                <button
                    onClick={onClose}
                    aria-label="Close modal"
                    className="absolute top-5 right-5 p-2 rounded-xl text-[#8e92a2] hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer"
                >
                    <HiOutlineXMark size={20} />
                </button>

                {/* Header */}
                <div className="text-center max-w-lg mx-auto mb-6">
                    <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-white mb-2">
                        Upgrade your plan
                    </h2>
                    <p className="text-sm text-[#8e92a2]">
                        Choose the right plan to get more credits, faster responses, and specialized agents.
                    </p>

                    {/* Personal vs Business toggle */}
                    <div className="inline-flex items-center p-1 mt-4 rounded-full bg-[#262626] border border-white/[0.07]">
                        <button
                            type="button"
                            onClick={() => setBillingTab('personal')}
                            className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer ${
                                billingTab === 'personal'
                                    ? 'bg-[#2A2A2A] text-white shadow-sm'
                                    : 'text-[#A1A1AA] hover:text-white'
                            }`}
                        >
                            Personal
                        </button>
                        <button
                            type="button"
                            onClick={() => setBillingTab('business')}
                            className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer ${
                                billingTab === 'business'
                                    ? 'bg-[#2A2A2A] text-white shadow-sm'
                                    : 'text-[#A1A1AA] hover:text-white'
                            }`}
                        >
                            Business
                        </button>
                    </div>
                </div>

                {/* Status banner */}
                {statusMessage && (
                    <div
                        className={`max-w-md mx-auto mb-6 px-4 py-2.5 rounded-xl text-xs text-center font-medium flex items-center justify-center gap-2 ${
                            statusMessage.type === 'success'
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : statusMessage.type === 'info'
                                ? 'bg-white/[0.06] text-[#A1A1AA] border border-white/[0.1]'
                                : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        }`}
                    >
                        {statusMessage.type === 'info' && <HiOutlineArrowPath size={14} className="animate-spin" />}
                        <span>{statusMessage.text}</span>
                    </div>
                )}

                {/* Pricing Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6 mt-2">
                    {PLANS_CONFIG.map((plan) => {
                        const isCurrent = plan.id === currentPlanId;
                        const isProcessing = processingPlanId === plan.id;

                        return (
                            <div
                                key={plan.id}
                                className={`
                                    relative flex flex-col justify-between rounded-2xl p-6 transition-all duration-200
                                    ${plan.popular
                                        ? 'bg-[#1F1F1F] border-2 border-white/[0.18] shadow-xl'
                                        : 'bg-[#171717] border border-white/[0.08] hover:border-white/[0.14]'
                                    }
                                `}
                            >
                                {/* Top Badge if Popular */}
                                {plan.popular && (
                                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                                        <span className="flex items-center gap-1 px-3 py-0.5 rounded-full bg-white text-[#0D0D0D] text-[11px] font-semibold tracking-wide uppercase shadow-sm">
                                            <HiOutlineSparkles size={11} />
                                            {plan.badge}
                                        </span>
                                    </div>
                                )}

                                <div>
                                    {/* Plan Title & Tagline */}
                                    <div className="flex items-center justify-between mb-1">
                                        <h3 className="text-xl font-bold text-white tracking-tight">
                                            {plan.name}
                                        </h3>
                                        <span className="text-[11px] font-medium text-[#A1A1AA] bg-white/[0.07] px-2.5 py-0.5 rounded-full border border-white/[0.1]">
                                            {plan.credits} Credits
                                        </span>
                                    </div>
                                    <p className="text-xs text-[#8e92a2] min-h-[32px] mb-4">
                                        {plan.tagline}
                                    </p>

                                    {/* Price */}
                                    <div className="flex items-baseline gap-1.5 mb-5 pb-5 border-b border-white/[0.06]">
                                        {plan.originalAmount && (
                                            <span className="text-sm text-[#65697b] line-through font-medium">
                                                ₹{plan.originalAmount}
                                            </span>
                                        )}
                                        <span className="text-3xl font-extrabold text-white tracking-tight">
                                            ₹{plan.amount}
                                        </span>
                                        <span className="text-xs text-[#8e92a2] font-medium">
                                            {plan.period}
                                        </span>
                                    </div>

                                    {/* Features List */}
                                    <ul className="space-y-3 mb-6">
                                        {plan.features.map((feat, idx) => (
                                            <li key={idx} className="flex items-start gap-2.5 text-xs text-[#c6c9d8] leading-relaxed">
                                                <div className="mt-0.5 rounded-full p-0.5 bg-white/[0.1] text-[#A1A1AA] shrink-0">
                                                    <HiOutlineCheck size={12} />
                                                </div>
                                                <span>{feat}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                                {/* CTA Button */}
                                <div>
                                    <button
                                        type="button"
                                        disabled={isCurrent || isProcessing}
                                        onClick={() => handleSubscribe(plan)}
                                        className={`
                                            w-full py-2.5 px-4 rounded-xl text-xs font-semibold transition-all duration-150 cursor-pointer flex items-center justify-center gap-1.5
                                            ${isCurrent
                                                ? 'bg-[#1F1F1F] text-[#737373] cursor-not-allowed border border-white/[0.05]'
                                                : isProcessing
                                                ? 'bg-[#2A2A2A] text-[#A1A1AA] cursor-wait'
                                                : plan.popular
                                                ? 'bg-white text-[#0D0D0D] hover:bg-[#E5E5E5] shadow-lg active:scale-[0.98]'
                                                : 'bg-[#2A2A2A] text-white hover:bg-[#333333] active:scale-[0.98]'
                                            }
                                        `}
                                    >
                                        {isProcessing ? (
                                            <>
                                                <HiOutlineArrowPath size={14} className="animate-spin" />
                                                <span>Processing...</span>
                                            </>
                                        ) : isCurrent ? (
                                            <span>Your current plan</span>
                                        ) : (
                                            <>
                                                <HiOutlineBolt size={14} />
                                                <span>{plan.ctaText}</span>
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>

                <p className="text-[11px] text-[#65697b] text-center mt-6">
                    Secured by Razorpay. Prices inclusive of applicable taxes. Cancel or switch plans anytime.
                </p>
            </div>
        </div>
    );
};

export default UpgradePlanModal;
