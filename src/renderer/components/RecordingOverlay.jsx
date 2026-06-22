import React, { useEffect, useState, useRef } from 'react';

function formatTime(ms) {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, '0')}`;
}

// Animated sound bars
function SoundBars({ active }) {
  const bars = [3, 5, 7, 5, 8, 4, 6, 4, 7, 5, 3];
  return (
    <div className="flex items-center gap-[2px] h-5">
      {bars.map((baseH, i) => (
        <div
          key={i}
          className="w-[2.5px] rounded-full"
          style={{
            height: active ? `${baseH * 2}px` : '3px',
            background: active
              ? `hsl(${220 + i * 4}, 90%, 70%)`
              : '#3f3f46',
            transition: 'height 0.15s ease',
            animation: active
              ? `soundbar ${0.4 + (i % 4) * 0.1}s ease-in-out ${i * 0.04}s infinite alternate`
              : 'none',
          }}
        />
      ))}
    </div>
  );
}

export default function RecordingOverlay() {
  const [state, setState] = useState('idle');
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
    return () => { off(); clearInterval(timerRef.current); };
  }, []);

  const isRecording  = state === 'recording';
  const isProcessing = state === 'processing';
  const visible      = isRecording || isProcessing;

  return (
    <>
      <style>{`
        @keyframes soundbar {
          from { transform: scaleY(0.35); }
          to   { transform: scaleY(1.0); }
        }
        @keyframes pulseRing {
          0%   { transform: scale(1);    opacity: 0.6; }
          100% { transform: scale(1.85); opacity: 0; }
        }
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(6px) scale(0.96); }
          to   { opacity: 1; transform: translateY(0)   scale(1); }
        }
        @keyframes fadeSlideOut {
          from { opacity: 1; transform: translateY(0)   scale(1); }
          to   { opacity: 0; transform: translateY(4px) scale(0.97); }
        }
      `}</style>

      <div className="h-full flex items-center justify-center" style={{ background: 'transparent' }}>
        <div
          style={{
            animation: visible ? 'fadeSlideIn 0.18s cubic-bezier(0.16,1,0.3,1) forwards' : 'none',
            opacity: visible ? 1 : 0,
            pointerEvents: visible ? 'auto' : 'none',
          }}
        >
          {/* Main pill */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '8px 14px 8px 10px',
              borderRadius: '100px',
              background: 'rgba(9, 9, 11, 0.92)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              border: isRecording
                ? '1px solid rgba(99, 102, 241, 0.45)'
                : '1px solid rgba(63, 63, 70, 0.6)',
              boxShadow: isRecording
                ? '0 4px 24px rgba(99,102,241,0.18), 0 1px 4px rgba(0,0,0,0.5)'
                : '0 4px 16px rgba(0,0,0,0.5)',
              transition: 'border-color 0.2s, box-shadow 0.2s',
            }}
          >
            {isProcessing ? (
              <>
                {/* Processing state */}
                <div style={{ position: 'relative', width: 18, height: 18, flexShrink: 0 }}>
                  <div style={{
                    width: 18, height: 18,
                    border: '2px solid rgba(99,102,241,0.25)',
                    borderTop: '2px solid #818cf8',
                    borderRadius: '50%',
                    animation: 'spin 0.7s linear infinite',
                  }} />
                  <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                </div>
                <span style={{ color: '#a1a1aa', fontSize: 13, fontWeight: 500, letterSpacing: '0.01em', whiteSpace: 'nowrap' }}>
                  Transcribing…
                </span>
              </>
            ) : (
              <>
                {/* Recording dot with pulse */}
                <div style={{ position: 'relative', width: 18, height: 18, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {isRecording && (
                    <div style={{
                      position: 'absolute',
                      width: 18, height: 18,
                      borderRadius: '50%',
                      background: 'rgba(99, 102, 241, 0.5)',
                      animation: 'pulseRing 1.2s ease-out infinite',
                    }} />
                  )}
                  <div style={{
                    width: 8, height: 8,
                    borderRadius: '50%',
                    background: isRecording ? '#818cf8' : '#52525b',
                    transition: 'background 0.2s',
                    flexShrink: 0,
                  }} />
                </div>

                {/* Sound bars */}
                <SoundBars active={isRecording} />

                {/* Label */}
                <span style={{
                  color: isRecording ? '#e4e4e7' : '#71717a',
                  fontSize: 13,
                  fontWeight: 500,
                  letterSpacing: '0.01em',
                  whiteSpace: 'nowrap',
                  transition: 'color 0.2s',
                }}>
                  {isRecording ? 'Listening' : 'Ready'}
                </span>

                {/* Timer — only while recording */}
                {isRecording && (
                  <span style={{
                    color: '#6366f1',
                    fontSize: 11,
                    fontFamily: 'ui-monospace, monospace',
                    fontVariantNumeric: 'tabular-nums',
                    minWidth: 32,
                    letterSpacing: '0.03em',
                  }}>
                    {formatTime(elapsed)}
                  </span>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
