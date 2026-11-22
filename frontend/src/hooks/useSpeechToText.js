import { useState, useRef, useEffect, useCallback } from 'react';

const getSpeechRecognition = () => {
    if (typeof window === 'undefined') return null;
    return window.SpeechRecognition || window.webkitSpeechRecognition || null;
};

/**
 * Custom hook for Web Speech API Speech-to-Text.
 *
 * @param {Object} options
 * @param {Function} options.onTranscript - Called with the updated full transcript string
 * @param {Function} options.getCurrentText - Function returning the current text to append to
 */
export const useSpeechToText = ({ onTranscript, getCurrentText }) => {
    const [isListening, setIsListening] = useState(false);
    const [error, setError] = useState(null);
    const recognitionRef = useRef(null);
    const baseTextRef = useRef('');
    const shouldKeepListeningRef = useRef(false);

    const isSupported = typeof window !== 'undefined' && !!getSpeechRecognition();

    const stopListening = useCallback(() => {
        shouldKeepListeningRef.current = false;
        if (recognitionRef.current) {
            try {
                recognitionRef.current.stop();
            } catch {
                // Ignore if already stopped
            }
        }
        setIsListening(false);
    }, []);

    const startListening = useCallback(() => {
        const SpeechRecognition = getSpeechRecognition();

        // Debug info
        console.log('[STT] startListening called');
        console.log('[STT] SpeechRecognition available:', !!SpeechRecognition);
        console.log('[STT] window.location.protocol:', window.location.protocol);
        console.log('[STT] isSecureContext:', window.isSecureContext);

        if (!SpeechRecognition) {
            setError('Speech recognition is not supported in this browser. Please use Google Chrome or Edge.');
            return;
        }

        if (!window.isSecureContext) {
            setError('Microphone requires a secure connection (HTTPS or localhost). Please access the app via http://localhost:5173');
            return;
        }

        setError(null);
        // Save existing text in the input so spoken text appends nicely
        const currentText = typeof getCurrentText === 'function' ? getCurrentText() : '';
        baseTextRef.current = currentText ? currentText.trim() : '';

        try {
            if (recognitionRef.current) {
                try {
                    recognitionRef.current.abort();
                } catch {
                    // Ignore
                }
            }

            const recognition = new SpeechRecognition();
            recognitionRef.current = recognition;
            shouldKeepListeningRef.current = true;

            recognition.continuous = true;
            recognition.interimResults = true;
            recognition.lang = navigator.language || 'en-US';

            recognition.onstart = () => {
                setIsListening(true);
            };

            recognition.onresult = (event) => {
                let totalFinal = '';
                let currentInterim = '';

                for (let i = 0; i < event.results.length; i++) {
                    const result = event.results[i];
                    if (result.isFinal) {
                        totalFinal += result[0].transcript;
                    } else {
                        currentInterim += result[0].transcript;
                    }
                }

                const spoken = (totalFinal + (currentInterim ? (totalFinal ? ' ' : '') + currentInterim : '')).trim();

                if (spoken && onTranscript) {
                    const prefix = baseTextRef.current ? baseTextRef.current + ' ' : '';
                    onTranscript(prefix + spoken);
                }
            };

            recognition.onerror = (event) => {
                console.warn('Speech recognition error event:', event.error);
                if (event.error === 'not-allowed') {
                    setError('Microphone access denied. Please allow microphone access in your browser settings.');
                    shouldKeepListeningRef.current = false;
                    setIsListening(false);
                } else if (event.error === 'no-speech') {
                    // User didn't speak for a moment; don't terminate abruptly
                    return;
                } else if (event.error === 'aborted') {
                    // Manual abort or user stopped
                    return;
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
                // If user didn't intentionally stop, restart if still supposed to listen
                if (shouldKeepListeningRef.current) {
                    try {
                        recognition.start();
                        return;
                    } catch {
                        // Restart failed, gracefully set false
                    }
                }
                setIsListening(false);
            };

            recognition.start();
        } catch (err) {
            console.error('Failed to start speech recognition:', err);
            setError(err.message || 'Could not start microphone recording');
            setIsListening(false);
        }
    }, [getCurrentText, onTranscript]);

    const toggleListening = useCallback(() => {
        if (isListening) {
            stopListening();
        } else {
            startListening();
        }
    }, [isListening, startListening, stopListening]);

    useEffect(() => {
        return () => {
            shouldKeepListeningRef.current = false;
            if (recognitionRef.current) {
                try {
                    recognitionRef.current.abort();
                } catch {
                    // Ignore on cleanup
                }
            }
        };
    }, []);

    return {
        isListening,
        isSupported,
        error,
        startListening,
        stopListening,
        toggleListening,
        clearError: () => setError(null),
    };
};

export default useSpeechToText;

