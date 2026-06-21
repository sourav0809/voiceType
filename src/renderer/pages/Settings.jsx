import React, { useState, useEffect, useCallback } from 'react';

// ── Icons ─────────────────────────────────────────────────────────────────────
const Mic = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px]">
    <path d="M12 2a3 3 0 0 1 3 3v7a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="22"/><line x1="8" y1="22" x2="16" y2="22"/>
  </svg>
);
const Layers = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px]">
    <polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/>
  </svg>
);
const Info = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px]">
    <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
  </svg>
);
const Download = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
  </svg>
);
const Trash = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
    <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
  </svg>
);
const Check = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);

function Spinner({ size = 'sm' }) {
  const s = size === 'xs' ? 'w-3 h-3 border' : 'w-4 h-4 border-2';
  return <div className={`${s} border-blue-500 border-t-transparent rounded-full animate-spin`} />;
}

const NAV = [
  { id: 'general', label: 'General', Icon: Mic },
  { id: 'models',  label: 'Models',  Icon: Layers },
  { id: 'about',   label: 'About',   Icon: Info },
];

// ── General ───────────────────────────────────────────────────────────────────
function StatusDot({ color }) {
  const colors = { green: 'bg-green-500', red: 'bg-red-500', gray: 'bg-zinc-600', amber: 'bg-amber-400' };
  return <span className={`inline-block w-2 h-2 rounded-full ${colors[color] || colors.gray}`} />;
}

function Row({ label, children }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-zinc-800/60 last:border-0">
      <span className="text-zinc-400 text-[13px]">{label}</span>
      <span className="text-[13px]">{children}</span>
    </div>
  );
}

function GeneralTab({ modelReady, activeModel, recording }) {
  const isMac = window.voiceType.platform === 'darwin';
  return (
    <div className="space-y-4">
      <h2 className="text-[13px] font-semibold text-zinc-400 uppercase tracking-widest">General</h2>

      <div className="bg-zinc-900 rounded-xl border border-zinc-800 px-4">
        <Row label="Engine">
          {recording ? (
            <span className="flex items-center gap-2 text-red-400">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inset-0 rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
              </span>
              Recording
            </span>
          ) : modelReady ? (
            <span className="flex items-center gap-2 text-green-400"><StatusDot color="green" />Ready</span>
          ) : (
            <span className="flex items-center gap-2 text-zinc-500"><Spinner size="xs" /><span>Loading model…</span></span>
          )}
        </Row>
        <Row label="Active model">
          <span className="text-white capitalize font-medium">{activeModel || 'base'}</span>
        </Row>
        <Row label="Hotkey">
          <kbd className="bg-zinc-800 text-zinc-200 px-2 py-0.5 rounded-md font-mono text-[12px] border border-zinc-700">
            {isMac ? '⌘ Option' : 'Ctrl + Alt'}
          </kbd>
        </Row>
      </div>

      <div className="bg-blue-950/40 border border-blue-900/50 rounded-xl p-4">
        <p className="text-blue-300 text-[13px] font-medium mb-2">How to use</p>
        <ol className="space-y-1.5 text-blue-400/80 text-[12px] leading-relaxed list-none">
          <li className="flex gap-2"><span className="text-blue-500 font-bold">1.</span> Click where you want your text to appear</li>
          <li className="flex gap-2"><span className="text-blue-500 font-bold">2.</span> Hold <kbd className="bg-blue-900/60 px-1 rounded font-mono text-[11px] text-blue-300">{isMac ? '⌘ Option' : 'Ctrl+Alt'}</kbd> and speak</li>
          <li className="flex gap-2"><span className="text-blue-500 font-bold">3.</span> Release — your words are pasted instantly</li>
        </ol>
      </div>
    </div>
  );
}

// ── Models ────────────────────────────────────────────────────────────────────
function ModelCard({ model, isActive, onDownload, onDelete, onSwitch }) {
  const { id, name, sizeMB, description, installed, downloading, progress, recommended } = model;

  function fmtSize(mb) {
    return mb >= 1000 ? `${(mb / 1000).toFixed(1)} GB` : `${mb} MB`;
  }

  return (
    <div className={`rounded-xl border p-4 transition-all duration-150 ${
      isActive
        ? 'border-blue-600/50 bg-blue-600/5'
        : 'border-zinc-800 bg-zinc-900 hover:border-zinc-700'
    }`}>
      <div className="flex items-start gap-3">
        <div className={`mt-0.5 w-4 h-4 rounded-full flex items-center justify-center shrink-0 transition-colors ${
          isActive ? 'bg-blue-600' : 'border border-zinc-700'
        }`}>
          {isActive && <Check />}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-0.5">
            <span className="text-white text-[13px] font-medium">{name}</span>
            {recommended && <span className="text-[11px] bg-blue-600/15 text-blue-400 border border-blue-600/25 px-1.5 py-0.5 rounded-full leading-none">recommended</span>}
          </div>
          <p className="text-zinc-500 text-[12px] mb-0.5">{description}</p>
          <p className="text-zinc-600 text-[11px] tabular-nums">{fmtSize(sizeMB)}</p>

          {downloading && (
            <div className="mt-2">
              <div className="flex items-center justify-between mb-1">
                <span className="text-zinc-500 text-[11px]">Downloading…</span>
                <span className="text-zinc-400 text-[11px] tabular-nums">{Math.round(progress * 100)}%</span>
              </div>
              <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 rounded-full transition-all duration-300" style={{ width: `${progress * 100}%` }} />
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {downloading ? (
            <Spinner size="xs" />
          ) : installed ? (
            <>
              {!isActive && (
                <button
                  onClick={() => onSwitch(id)}
                  className="text-[12px] bg-zinc-800 hover:bg-zinc-700 text-zinc-200 px-3 py-1.5 rounded-lg border border-zinc-700 hover:border-zinc-600 transition-colors"
                >
                  Use
                </button>
              )}
              {id !== 'base' && (
                <button
                  onClick={() => onDelete(id)}
                  className="p-1.5 rounded-lg text-zinc-600 hover:text-red-400 hover:bg-zinc-800 transition-colors"
                  title="Delete model"
                >
                  <Trash />
                </button>
              )}
            </>
          ) : (
            <button
              onClick={() => onDownload(id)}
              className="flex items-center gap-1.5 text-[12px] bg-zinc-800 hover:bg-zinc-700 text-zinc-200 px-3 py-1.5 rounded-lg border border-zinc-700 hover:border-zinc-600 transition-colors"
            >
              <Download />
              Download
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function ModelsTab({ activeModel, onModelSwitch }) {
  const [models, setModels] = useState({});
  const [switching, setSwitching] = useState(false);

  const refresh = useCallback(async () => {
    setModels(await window.voiceType.getModelStatus());
  }, []);

  useEffect(() => {
    refresh();
    const a = window.voiceType.on('download-progress', (d) => {
      setModels((p) => ({ ...p, [d.modelId]: { ...p[d.modelId], downloading: true, progress: d.progress } }));
    });
    const b = window.voiceType.on('download-complete', refresh);
    const c = window.voiceType.on('model-status-update', setModels);
    return () => { a(); b(); c(); };
  }, [refresh]);

  async function handleDownload(id) {
    await window.voiceType.downloadModel(id);
    setModels((p) => ({ ...p, [id]: { ...p[id], downloading: true, progress: 0 } }));
  }
  async function handleDelete(id) { await window.voiceType.deleteModel(id); refresh(); }
  async function handleSwitch(id) {
    setSwitching(true);
    await window.voiceType.switchModel(id);
    onModelSwitch(id);
    setSwitching(false);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-[13px] font-semibold text-zinc-400 uppercase tracking-widest">Speech Models</h2>
        {switching && (
          <span className="flex items-center gap-2 text-zinc-500 text-[12px]">
            <Spinner size="xs" /> Loading…
          </span>
        )}
      </div>
      <div className="space-y-2">
        {['tiny', 'base', 'small', 'medium', 'large-v3'].map((id) =>
          models[id] ? (
            <ModelCard key={id} model={models[id]} isActive={activeModel === id}
              onDownload={handleDownload} onDelete={handleDelete} onSwitch={handleSwitch} />
          ) : null
        )}
      </div>
    </div>
  );
}

// ── About ─────────────────────────────────────────────────────────────────────
function AboutTab() {
  return (
    <div className="space-y-4">
      <h2 className="text-[13px] font-semibold text-zinc-400 uppercase tracking-widest">About</h2>
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-11 h-11 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-600/20">
            <Mic />
          </div>
          <div>
            <p className="text-white font-semibold text-[15px]">VoiceType</p>
            <p className="text-zinc-500 text-[12px]">Version 1.0.0</p>
          </div>
        </div>
        <div className="space-y-2 pt-4 border-t border-zinc-800">
          <p className="text-zinc-400 text-[12px] leading-relaxed">
            Speech recognition powered by <span className="text-zinc-200">OpenAI Whisper</span> (whisper.cpp)
          </p>
          <p className="text-zinc-500 text-[12px] leading-relaxed">
            Everything runs 100% locally — in-process, no server, no internet.
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function Settings() {
  const [tab, setTab] = useState('general');
  const [modelReady, setModelReady] = useState(false);
  const [activeModel, setActiveModel] = useState('base');
  const [recording, setRecording] = useState(false);

  useEffect(() => {
    window.voiceType.getSettings().then((s) => setActiveModel(s.activeModel || 'base'));
    window.voiceType.getModelReady().then((s) => setModelReady(s?.ready ?? false));
    const a = window.voiceType.on('model-ready', (s) => setModelReady(s?.ready ?? false));
    const b = window.voiceType.on('recording-state', setRecording);
    return () => { a(); b(); };
  }, []);

  return (
    <div className="h-full flex flex-col bg-zinc-950 text-white overflow-hidden select-none">
      {/* Title bar — traffic lights are ~70px wide on macOS hiddenInset */}
      <div className="h-11 drag shrink-0 flex items-center border-b border-zinc-800/60">
        <span className="absolute left-1/2 -translate-x-1/2 text-zinc-400 text-[13px] font-semibold no-drag tracking-wide pointer-events-none">
          VoiceType
        </span>
      </div>

      <div className="flex flex-1 min-h-0">
        {/* Sidebar */}
        <aside className="w-44 shrink-0 border-r border-zinc-800/60 p-2 flex flex-col gap-0.5">
          {NAV.map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-colors text-left ${
                tab === id
                  ? 'bg-zinc-800 text-white'
                  : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900'
              }`}
            >
              <span className={tab === id ? 'text-blue-400' : ''}><Icon /></span>
              {label}
            </button>
          ))}
        </aside>

        {/* Content */}
        <main className="flex-1 min-w-0 overflow-y-auto p-5">
          {tab === 'general' && <GeneralTab modelReady={modelReady} activeModel={activeModel} recording={recording} />}
          {tab === 'models'  && <ModelsTab activeModel={activeModel} onModelSwitch={(id) => setActiveModel(id)} />}
          {tab === 'about'   && <AboutTab />}
        </main>
      </div>
    </div>
  );
}
