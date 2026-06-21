import React, { useState, useEffect } from 'react';

const STEPS = ['welcome', 'microphone', 'accessibility', 'model', 'done'];

// ── Progress dots ─────────────────────────────────────────────────────────────
function ProgressDots({ current }) {
  return (
    <div className="flex items-center gap-1.5">
      {STEPS.map((_, i) => (
        <div key={i} className={`rounded-full transition-all duration-300 ${
          i === current ? 'w-5 h-1.5 bg-blue-500' :
          i < current  ? 'w-1.5 h-1.5 bg-zinc-600' :
                         'w-1.5 h-1.5 bg-zinc-800'
        }`} />
      ))}
    </div>
  );
}

// ── Step shell ────────────────────────────────────────────────────────────────
function Step({ icon, iconBg = 'bg-zinc-800', title, subtitle, children, action, secondaryAction }) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-10 gap-0">
      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-5 shadow-lg ${iconBg}`}>
        {icon}
      </div>
      <h2 className="text-[18px] font-semibold text-white mb-2 tracking-tight">{title}</h2>
      <p className="text-zinc-400 text-[13px] leading-relaxed mb-6 max-w-[260px]">{subtitle}</p>
      {children}
      <div className="flex flex-col items-center gap-2 mt-6">
        {action}
        {secondaryAction}
      </div>
    </div>
  );
}

// ── Shared button components ──────────────────────────────────────────────────
function PrimaryBtn({ onClick, children, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white px-6 py-2.5 rounded-lg font-medium text-[13px] transition-colors shadow-lg shadow-blue-600/20 min-w-[140px]"
    >
      {children}
    </button>
  );
}
function GhostBtn({ onClick, children }) {
  return (
    <button onClick={onClick} className="text-zinc-600 hover:text-zinc-400 text-[12px] transition-colors">
      {children}
    </button>
  );
}
function StatusBadge({ ok, label }) {
  return (
    <div className={`flex items-center gap-2 text-[13px] px-4 py-2 rounded-lg border ${
      ok ? 'text-green-400 bg-green-500/8 border-green-500/20' : 'text-amber-400 bg-amber-500/8 border-amber-500/20'
    }`}>
      {ok ? (
        <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
        </svg>
      ) : (
        <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
        </svg>
      )}
      {label}
    </div>
  );
}

// ── Steps ─────────────────────────────────────────────────────────────────────
function WelcomeStep({ onNext }) {
  return (
    <Step
      icon={<svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7"><path d="M12 2a3 3 0 0 1 3 3v7a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="22"/><line x1="8" y1="22" x2="16" y2="22"/></svg>}
      iconBg="bg-blue-600 shadow-blue-600/30"
      title="Welcome to VoiceType"
      subtitle="Speak anywhere, type anywhere — 100% local, no internet required."
      action={<PrimaryBtn onClick={onNext}>Get Started →</PrimaryBtn>}
    />
  );
}

function MicrophoneStep({ onNext }) {
  const [status, setStatus] = useState('idle');

  async function request() {
    setStatus('checking');
    const { mic } = await window.voiceType.checkPermissions();
    setStatus(mic.granted ? 'granted' : mic.needsManual ? 'manual' : 'denied');
  }

  return (
    <Step
      icon={<svg viewBox="0 0 24 24" fill="none" stroke={status === 'granted' ? 'white' : '#a1a1aa'} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7"><path d="M12 2a3 3 0 0 1 3 3v7a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="22"/><line x1="8" y1="22" x2="16" y2="22"/></svg>}
      iconBg={status === 'granted' ? 'bg-green-600 shadow-green-600/30' : 'bg-zinc-800'}
      title="Microphone Access"
      subtitle="VoiceType needs your microphone to capture your voice."
      action={
        status === 'granted'
          ? <PrimaryBtn onClick={onNext}>Continue →</PrimaryBtn>
          : <PrimaryBtn onClick={request} disabled={status === 'checking'}>
              {status === 'checking' ? 'Checking…' : 'Allow Microphone'}
            </PrimaryBtn>
      }
      secondaryAction={(status === 'manual' || status === 'denied') && <GhostBtn onClick={onNext}>Skip for now</GhostBtn>}
    >
      {status === 'granted' && <StatusBadge ok label="Microphone access granted" />}
      {status === 'manual' && (
        <div className="w-full max-w-[280px] bg-amber-500/8 border border-amber-500/25 rounded-xl p-3 text-left">
          <p className="text-amber-300 text-[12px] leading-relaxed mb-2">
            Open System Settings → Privacy → Microphone and enable VoiceType.
          </p>
          <button onClick={() => window.voiceType.openMicSettings()} className="text-amber-400 text-[12px] underline underline-offset-2">
            Open Settings →
          </button>
        </div>
      )}
    </Step>
  );
}

function AccessibilityStep({ onNext }) {
  const [granted, setGranted] = useState(false);

  async function check() {
    const { accessibility } = await window.voiceType.checkPermissions();
    setGranted(accessibility.granted);
  }

  useEffect(() => {
    check();
    const id = setInterval(check, 1500);
    return () => clearInterval(id);
  }, []);

  return (
    <Step
      icon={<svg viewBox="0 0 24 24" fill="none" stroke={granted ? 'white' : '#a1a1aa'} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>}
      iconBg={granted ? 'bg-green-600 shadow-green-600/30' : 'bg-zinc-800'}
      title="Accessibility Access"
      subtitle="Required to detect the hotkey globally and paste text into any app."
      action={
        granted
          ? <PrimaryBtn onClick={onNext}>Continue →</PrimaryBtn>
          : <PrimaryBtn onClick={() => window.voiceType.openAccessibilitySettings()}>Open Settings</PrimaryBtn>
      }
      secondaryAction={!granted && <GhostBtn onClick={onNext}>Skip for now</GhostBtn>}
    >
      {granted
        ? <StatusBadge ok label="Accessibility access granted" />
        : (
          <div className="w-full max-w-[280px] bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-left mb-2">
            <p className="text-zinc-300 text-[12px] leading-relaxed">
              Go to <span className="text-white font-medium">System Settings → Privacy & Security → Accessibility</span> and enable VoiceType.
            </p>
            {!granted && <p className="text-zinc-600 text-[11px] mt-2">Waiting for permission…</p>}
          </div>
        )
      }
    </Step>
  );
}

function ModelStep({ onNext }) {
  const [phase, setPhase] = useState('checking'); // checking | ready | needed | downloading | done | error
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    window.voiceType.getModelStatus().then((s) => {
      setPhase(s.base?.installed ? 'ready' : 'needed');
    });

    const offProgress = window.voiceType.on('download-progress', ({ modelId, progress: p }) => {
      if (modelId === 'base') { setPhase('downloading'); setProgress(p); }
    });
    const offComplete = window.voiceType.on('download-complete', ({ modelId }) => {
      if (modelId === 'base') setPhase('done');
    });
    const offError = window.voiceType.on('download-error', ({ modelId }) => {
      if (modelId === 'base') setPhase('error');
    });

    return () => { offProgress?.(); offComplete?.(); offError?.(); };
  }, []);

  function startDownload() {
    setPhase('downloading');
    setProgress(0);
    window.voiceType.downloadModel('base');
  }

  const isReady = phase === 'ready' || phase === 'done';
  const pct = Math.round(progress * 100);

  return (
    <Step
      icon={<svg viewBox="0 0 24 24" fill="none" stroke={isReady ? 'white' : '#a1a1aa'} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>}
      iconBg={isReady ? 'bg-green-600 shadow-green-600/30' : 'bg-zinc-800'}
      title="Speech Model"
      subtitle="Whisper Base (~142 MB) runs 100% locally. Downloaded once, used forever."
      action={
        isReady
          ? <PrimaryBtn onClick={onNext}>Continue →</PrimaryBtn>
          : phase === 'downloading'
          ? <PrimaryBtn disabled>Downloading…</PrimaryBtn>
          : phase === 'error'
          ? <PrimaryBtn onClick={startDownload}>Retry Download</PrimaryBtn>
          : phase === 'needed'
          ? <PrimaryBtn onClick={startDownload}>Download Model</PrimaryBtn>
          : <PrimaryBtn disabled>Checking…</PrimaryBtn>
      }
      secondaryAction={!isReady && phase !== 'downloading' && phase !== 'checking' && (
        <GhostBtn onClick={onNext}>Skip for now</GhostBtn>
      )}
    >
      {isReady && <StatusBadge ok label="Whisper Base is ready" />}
      {phase === 'error' && <StatusBadge ok={false} label="Download failed — check your connection" />}
      {phase === 'downloading' && (
        <div className="w-full max-w-[280px]">
          <div className="flex justify-between text-[11px] text-zinc-500 mb-1.5">
            <span>Downloading Whisper Base…</span>
            <span>{pct}%</span>
          </div>
          <div className="w-full bg-zinc-800 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-blue-500 h-full rounded-full transition-all duration-300"
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="text-zinc-600 text-[11px] mt-2">142 MB · This only happens once</p>
        </div>
      )}
    </Step>
  );
}

function DoneStep({ onComplete }) {
  const isMac = window.voiceType.platform === 'darwin';
  return (
    <Step
      icon={<svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7"><polyline points="20 6 9 17 4 12"/></svg>}
      iconBg="bg-green-600 shadow-green-600/30"
      title="You're all set!"
      subtitle="VoiceType is running in your menu bar."
      action={<PrimaryBtn onClick={onComplete}>Open Settings</PrimaryBtn>}
    >
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl px-5 py-4 text-center mb-2">
        <p className="text-zinc-400 text-[12px] mb-1">Hold to record</p>
        <kbd className="bg-zinc-800 text-zinc-100 px-3 py-1.5 rounded-lg font-mono text-[13px] border border-zinc-700 shadow">
          {isMac ? '⌘  Option' : 'Ctrl  Alt'}
        </kbd>
        <p className="text-zinc-600 text-[11px] mt-2">Release to stop and paste</p>
      </div>
    </Step>
  );
}

// ── Root ──────────────────────────────────────────────────────────────────────
export default function Onboarding({ onComplete }) {
  const [step, setStep] = useState(0);
  const next = () => setStep((s) => Math.min(s + 1, STEPS.length - 1));
  async function finish() {
    await window.voiceType.completeOnboarding();
    onComplete();
  }

  const pages = [
    <WelcomeStep onNext={next} />,
    <MicrophoneStep onNext={next} />,
    <AccessibilityStep onNext={next} />,
    <ModelStep onNext={next} />,
    <DoneStep onComplete={finish} />,
  ];

  return (
    <div className="h-full flex flex-col bg-zinc-950 overflow-hidden select-none">
      <div className="h-9 drag shrink-0" />
      <div className="flex-1 min-h-0">{pages[step]}</div>
      <div className="flex justify-center pb-5 shrink-0">
        <ProgressDots current={step} />
      </div>
    </div>
  );
}
