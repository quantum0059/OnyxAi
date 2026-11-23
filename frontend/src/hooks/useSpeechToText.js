import { useState, useRef, useEffect, useCallback } from 'react';

const getSpeechRecognition = () => {
    if (typeof window === 'undefined') return null;
    return window.SpeechRecognition || window.webkitSpeechRecognition || null;
};

/**
 * Custom hook for Web Speech API Speech-to-Text.
 *
 * @param {Object}   options
 * @param {Function} options.onTranscript   – called with the latest transcript string (interim + final)
 * @param {Function} options.getCurrentText – returns current textarea value so spoken text can append to it
 */
export const useSpeechToText = ({ onTranscript, getCurrentText }) => {
    const [isListening, setIsListening]   = useState(false);
    const [transcript, setTranscript]     = useState('');
    const [error, setError]               = useState(null);

    const recognitionRef         = useRef(null);
    const baseTextRef            = useRef('');
    const shouldKeepListeningRef = useRef(false);
    const latestTranscriptRef    = useRef('');

    const isSupported = typeof window !== 'undefined' && !!getSpeechRecognition();

    /* ── stop ──────────────────────────────────── */
    const stopListening = useCallback(() => {
        shouldKeepListeningRef.current = false;
        try { recognitionRef.current?.stop(); } catch { /* ok */ }
        setIsListening(false);
    }, []);

    /* ── cancel (discard transcript) ───────────── */
    const cancelListening = useCallback(() => {
        shouldKeepListeningRef.current = false;
        try { recognitionRef.current?.abort(); } catch { /* ok */ }
        setIsListening(false);
        setTranscript('');
        latestTranscriptRef.current = '';
        // restore pre-recording text
        if (onTranscript) onTranscript(baseTextRef.current);
    }, [onTranscript]);

    /* ── start ─────────────────────────────────── */
    const startListening = useCallback(() => {
        const SpeechRecognition = getSpeechRecognition();

        if (!SpeechRecognition) {
            setError('Speech recognition is not supported in this browser. Please use Chrome or Edge.');
            return;
        }
        if (!window.isSecureContext) {
            setError('Microphone requires a secure connection. Access the app via http://localhost:5173');
            return;
        }

        setError(null);
        setTranscript('');
        latestTranscriptRef.current = '';

        // snapshot whatever is already in the textarea
        const currentText = typeof getCurrentText === 'function' ? getCurrentText() : '';
        baseTextRef.current = currentText ? currentText.trim() : '';

        try {
            try { recognitionRef.current?.abort(); } catch { /* ok */ }

            const recognition = new SpeechRecognition();
            recognitionRef.current         = recognition;
            shouldKeepListeningRef.current = true;

            recognition.continuous     = true;
            recognition.interimResults = true;
            recognition.lang           = navigator.language || 'en-US';

            recognition.onstart = () => setIsListening(true);

            recognition.onresult = (event) => {
                let finalText   = '';
                let interimText = '';

                for (let i = 0; i < event.results.length; i++) {
                    const result = event.results[i];
                    if (result.isFinal) {
                        finalText += result[0].transcript;
                    } else {
                        interimText += result[0].transcript;
                    }
                }

                const spoken = (finalText + (interimText ? (finalText ? ' ' : '') + interimText : '')).trim();
                latestTranscriptRef.current = spoken;
                setTranscript(spoken);

                if (onTranscript) {
                    const prefix = baseTextRef.current ? baseTextRef.current + ' ' : '';
                    onTranscript(prefix + spoken);
                }
            };

            recognition.onerror = (event) => {
                if (event.error === 'not-allowed') {
                    setError('Microphone access denied. Please allow microphone access in your browser settings.');
                    shouldKeepListeningRef.current = false;
                    setIsListening(false);
                } else if (event.error === 'no-speech' || event.error === 'aborted') {
                    // non-fatal – ignore
                } else if (event.error === 'network') {
                    setError('Network error with speech recognition service.');
                    shouldKeepListeningRef.current = false;
                    setIsListening(false);
                } else {
                    setError(`Speech recognition error: ${event.error}`);
                    shouldKeepListeningRef.current = false;
                    setIsListening(false);
                }
            };

            recognition.onend = () => {
                if (shouldKeepListeningRef.current) {
                    try { recognition.start(); return; } catch { /* restart failed */ }
                }
                setIsListening(false);
            };

            recognition.start();
        } catch (err) {
            console.error('[STT] Failed to start:', err);
            setError(err.message || 'Could not start microphone recording');
            setIsListening(false);
        }
    }, [getCurrentText, onTranscript]);

    /* ── toggle ────────────────────────────────── */
    const toggleListening = useCallback(() => {
        if (isListening) stopListening();
        else startListening();
    }, [isListening, startListening, stopListening]);

    /* ── cleanup on unmount ────────────────────── */
    useEffect(() => {
        return () => {
            shouldKeepListeningRef.current = false;
            try { recognitionRef.current?.abort(); } catch { /* ok */ }
        };
    }, []);

    return {
        isListening,
        transcript,
        isSupported,
        error,
        startListening,
        stopListening,
        cancelListening,
        toggleListening,
        clearError: () => setError(null),
    };
};

export default useSpeechToText;
