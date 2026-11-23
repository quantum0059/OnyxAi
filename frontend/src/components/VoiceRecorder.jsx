/**
 * VoiceRecorder — ChatGPT-style real-time waveform overlay.
 *
 * Uses Web Audio API AnalyserNode to read actual microphone amplitude each
 * animation frame. No fake CSS loops — bars react to your real voice.
 *
 * Props:
 *   isListening  boolean          – controls recording on/off
 *   transcript   string           – live spoken text so far
 *   onStop       () => void       – user clicked ✓ (keep text)
 *   onCancel     () => void       – user clicked ✗ (discard text)
 */

import { useEffect, useRef, useCallback } from 'react';
import { HiOutlineCheck, HiOutlineXMark } from 'react-icons/hi2';

/* ─── constants ─────────────────────────────────── */
const BAR_COUNT = 40;          // number of waveform bars
const MIN_BAR_H = 3;           // px – silent floor
const MAX_BAR_H = 48;          // px – loudest possible bar
const FFT_SIZE   = 256;        // Web Audio FFT resolution
const SMOOTHING  = 0.82;       // 0–1: higher = smoother decay

/* ─── helpers ───────────────────────────────────── */

/** Map a frequency-bin value (0-255) to a bar height (px) */
const amplitudeToHeight = (amp) =>
    MIN_BAR_H + ((amp / 255) ** 1.4) * (MAX_BAR_H - MIN_BAR_H);

/** Colour each bar: clean monochrome neutral, fades when silent */
const barColor = (index, total, amp) => {
    const pos  = index / (total - 1);               // 0 → 1
    const dist = Math.abs(pos - 0.5) * 2;           // 0 (centre) → 1 (edge)
    const v = Math.round(245 - dist * 35);
    const a = 0.35 + (amp / 255) * 0.65;            // transparency tied to volume
    return `rgba(${v},${v},${v},${a})`;
};

/* ─── component ─────────────────────────────────── */
const VoiceRecorder = ({ isListening, transcript, onStop, onCancel }) => {
    const canvasRef      = useRef(null);
    const rafRef         = useRef(null);
    const audioCtxRef    = useRef(null);
    const analyserRef    = useRef(null);
    const sourceRef      = useRef(null);
    const streamRef      = useRef(null);
    const dataArrayRef   = useRef(null);
    const heightsRef     = useRef(new Float32Array(BAR_COUNT).fill(MIN_BAR_H));

    /* ── draw one frame ───────────────────────── */
    const drawFrame = useCallback(() => {
        const canvas   = canvasRef.current;
        const analyser = analyserRef.current;
        if (!canvas || !analyser) return;

        const ctx    = canvas.getContext('2d');
        const W      = canvas.width;
        const H      = canvas.height;
        const data   = dataArrayRef.current;

        analyser.getByteFrequencyData(data);

        // Pick BAR_COUNT evenly-spaced bins from the lower half of spectrum
        // (voice fundamentals live in 80 Hz – 3 kHz → roughly first quarter of FFT)
        const usableBins = Math.floor(data.length * 0.35);
        const step       = usableBins / BAR_COUNT;

        ctx.clearRect(0, 0, W, H);

        const barW   = W / BAR_COUNT;
        const gap    = Math.max(1.5, barW * 0.18);
        const halfH  = H / 2;

        for (let i = 0; i < BAR_COUNT; i++) {
            // average a small window of bins for each bar
            let sum = 0;
            const start = Math.floor(i * step);
            const end   = Math.min(Math.ceil((i + 1) * step), data.length);
            for (let b = start; b < end; b++) sum += data[b];
            const amp = sum / Math.max(1, end - start);

            // smooth heights so bars glide up/down
            const target    = amplitudeToHeight(amp);
            heightsRef.current[i] += (target - heightsRef.current[i]) * 0.25;
            const h = heightsRef.current[i];

            const x = i * barW + gap / 2;
            const w = barW - gap;

            // draw top + bottom mirrored bar
            ctx.fillStyle = barColor(i, BAR_COUNT, amp);

            // rounded rect helper (canvas 2D)
            const r = Math.min(w / 2, 3);
            roundRect(ctx, x, halfH - h, w, h, r);        // top
            roundRect(ctx, x, halfH,     w, h, r);        // bottom (mirror)
        }

        rafRef.current = requestAnimationFrame(drawFrame);
    }, []);

    /* ── start audio pipeline ─────────────────── */
    const startAudio = useCallback(async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
            streamRef.current = stream;

            const audioCtx  = new (window.AudioContext || window.webkitAudioContext)();
            const analyser  = audioCtx.createAnalyser();
            analyser.fftSize            = FFT_SIZE;
            analyser.smoothingTimeConstant = SMOOTHING;

            const source = audioCtx.createMediaStreamSource(stream);
            source.connect(analyser);

            audioCtxRef.current  = audioCtx;
            analyserRef.current  = analyser;
            sourceRef.current    = source;
            dataArrayRef.current = new Uint8Array(analyser.frequencyBinCount);

            rafRef.current = requestAnimationFrame(drawFrame);
        } catch {
            // Mic already granted to SpeechRecognition; just animate silently
            rafRef.current = requestAnimationFrame(drawFrame);
        }
    }, [drawFrame]);

    /* ── stop audio pipeline ──────────────────── */
    const stopAudio = useCallback(() => {
        cancelAnimationFrame(rafRef.current);
        try { sourceRef.current?.disconnect(); }  catch { /* ok */ }
        try { audioCtxRef.current?.close(); }     catch { /* ok */ }
        try { streamRef.current?.getTracks().forEach(t => t.stop()); } catch { /* ok */ }
        audioCtxRef.current = null;
        analyserRef.current = null;
        sourceRef.current   = null;
        streamRef.current   = null;
        // fade bars to zero
        if (canvasRef.current) {
            canvasRef.current.getContext('2d')
                .clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        }
    }, []);

    /* ── sync with isListening prop ───────────── */
    useEffect(() => {
        if (isListening) {
            heightsRef.current.fill(MIN_BAR_H);
            startAudio();
        } else {
            stopAudio();
        }
        return stopAudio;
    }, [isListening, startAudio, stopAudio]);

    /* ── resize canvas to match DOM size ─────── */
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ro = new ResizeObserver(() => {
            canvas.width  = canvas.offsetWidth  * window.devicePixelRatio;
            canvas.height = canvas.offsetHeight * window.devicePixelRatio;
            const ctx = canvas.getContext('2d');
            ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
        });
        ro.observe(canvas);
        return () => ro.disconnect();
    }, []);

    if (!isListening) return null;

    return (
        <div className="w-full flex flex-col gap-2 animate-fade-in">
            {/* Waveform canvas */}
            <div className="relative w-full h-16 rounded-2xl overflow-hidden bg-[#171717] border border-white/[0.08]">
                {/* centre line */}
                <div className="absolute inset-x-0 top-1/2 h-px bg-white/[0.06]" />

                <canvas
                    ref={canvasRef}
                    className="w-full h-full"
                    style={{ display: 'block' }}
                    aria-hidden="true"
                />

                {/* Recording dot */}
                <span className="absolute top-2 right-2.5 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse shadow-[0_0_6px_rgba(244,63,94,0.8)]" />
                    <span className="text-[10px] text-rose-400/80 font-medium tracking-wide select-none">REC</span>
                </span>
            </div>

            {/* Live transcript preview */}
            <div className="min-h-[22px] px-1">
                {transcript ? (
                    <p className="text-sm text-[#F5F5F5] leading-snug line-clamp-2 select-none">
                        {transcript}
                        <span className="inline-block w-0.5 h-3.5 ml-0.5 bg-[#F5F5F5] align-middle animate-pulse rounded-sm" />
                    </p>
                ) : (
                    <p className="text-sm text-[#737373] select-none animate-pulse">
                        Listening… speak now
                    </p>
                )}
            </div>

            {/* Controls */}
            <div className="flex items-center justify-between pt-0.5 px-0.5">
                <button
                    type="button"
                    onClick={onCancel}
                    title="Cancel recording"
                    aria-label="Cancel recording"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-[#A1A1AA] hover:text-white hover:bg-white/[0.06] transition-all duration-150 cursor-pointer"
                >
                    <HiOutlineXMark size={15} />
                    Cancel
                </button>

                <button
                    type="button"
                    onClick={onStop}
                    title="Confirm and use transcript"
                    aria-label="Confirm recording"
                    className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-semibold bg-[#F5F5F5] text-[#0D0D0D] hover:bg-white shadow-sm transition-all duration-150 cursor-pointer active:scale-95"
                >
                    <HiOutlineCheck size={15} />
                    Done
                </button>
            </div>
        </div>
    );
};

/* ── canvas helper: rounded rect ────────────────── */
function roundRect(ctx, x, y, w, h, r) {
    if (h < 0) { y += h; h = -h; }
    if (w <= 0 || h <= 0) return;
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
    ctx.fill();
}

export default VoiceRecorder;

