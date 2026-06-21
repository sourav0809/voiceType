import React, { useEffect, useState, useRef } from 'react';

// Animated waveform bars — each has a different animation duration for organic feel
function Waveform({ active }) {
  const bars = [
    { h: 'h-2',   d: '0.6s' },
    { h: 'h-4',   d: '0.45s' },
    { h: 'h-5',   d: '0.7s' },
    { h: 'h-3',   d: '0.5s' },
    { h: 'h-5',   d: '0.65s' },
    { h: 'h-4',   d: '0.4s' },
    { h: 'h-2',   d: '0.75s' },
  ];

  return (
    <div className="flex items-center gap-[3px] h-6">
      {bars.map((b, i) => (
        <div
          key={i}
          className={`w-[3px] rounded-full transition-all duration-300 ${
            active ? `${b.h} bg-red-400` : 'h-1 bg-zinc-600'
          }`}
          style={active ? { animation: `wave ${b.d} ease-in-out infinite alternate` } : {}}
        />
      ))}
    </div>
  );
}

function formatTime(ms) {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, '0')}`;
}

export default function RecordingOverlay() {
  const [state, setState] = useState('idle'); // idle | recording | processing
  const [elapsed, setElapsed] = useState(0);
  const startRef = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => {
    const off = window.voiceType.on('recording-state', (data) => {
      if (data?.active) {
        setState('recording');
        startRef.current = data.startTime || Date.now();
        setElapsed(0);
        timerRef.current = setInterval(() => {
          setElapsed(Date.now() - startRef.current);
        }, 100);
      } else if (data?.processing) {
        setState('processing');
        clearInterval(timerRef.current);
      } else {
        setState('idle');
        clearInterval(timerRef.current);
        setElapsed(0);
      }
    });

    return () => {
      off();
      clearInterval(timerRef.current);
    };
  }, []);

  const isRecording = state === 'recording';
  const isProcessing = state === 'processing';
  const visible = isRecording || isProcessing;

  return (
    <>
      <style>{`
        @keyframes wave {
          from { transform: scaleY(0.4); }
          to   { transform: scaleY(1.0); }
        }
      `}</style>

      <div
        className="h-full flex items-center justify-center"
        style={{ background: 'transparent' }}
      >
        <div
          className={`
            flex items-center gap-3 px-4 py-2.5 rounded-2xl
            bg-zinc-900/95 backdrop-blur-sm border border-zinc-700/50
            shadow-2xl shadow-black/60
            transition-all duration-200 ease-out
            ${visible ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'}
          `}
        >
          {isProcessing ? (
            <>
              {/* Processing spinner */}
              <div className="w-3.5 h-3.5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
              <span className="text-zinc-300 text-[13px] font-medium tracking-wide">Processing…</span>
            </>
          ) : (
            <>
              {/* Waveform */}
              <Waveform active={isRecording} />

              {/* Label */}
              <span className="text-white text-[13px] font-medium tracking-wide">Recording</span>

              {/* Timer */}
              <span className="text-red-400 text-[12px] font-mono tabular-nums min-w-[32px]">
                {formatTime(elapsed)}
              </span>
            </>
          )}
        </div>
      </div>
    </>
  );
}
