import api from "../../utils/axios";

/**
 * Dynamically loads the Razorpay checkout.js script if not already present.
 * @returns {Promise<boolean>}
 */
export const loadRazorpayScript = () => {
    return new Promise((resolve) => {
        if (typeof window !== "undefined" && window.Razorpay) {
            resolve(true);
            return;
        }

        const script = document.createElement("script");
        script.src = "https://checkout.razorpay.com/v1/checkout.js";
        script.async = true;
        script.onload = () => resolve(true);
        script.onerror = () => {
            console.error("Failed to load Razorpay SDK");
            resolve(false);
        };
        document.body.appendChild(script);
    });
};

/**
 * Initiates Razorpay Order Creation on backend (routed via gateway -> payment service).
 * @param {string} planId - 'starter' | 'pro' | 'enterprise'
 * @returns {Promise<{ order: Object, plan: Object }>}
 */
export const createPaymentOrder = async (planId) => {
    const { data } = await api.post("/api/payment/create-order", { plan: planId });
    return data;
};

/**
 * Verifies the Razorpay payment signature on backend.
 * @param {Object} paymentPayload - { razorpay_order_id, razorpay_payment_id, razorpay_signature }
 * @returns {Promise<{ message: string, payment: Object }>}
 */
export const verifyPaymentOrder = async (paymentPayload) => {
    const { data } = await api.post("/api/payment/verify-payment", paymentPayload);
    return data;
};

