# VoiceType Architecture

## Full Pipeline

```
🎙 MICROPHONE  (hardware / AVFoundation)
       │
       │  user holds ⌘ + Option
       ▼
┌─────────────────────────────────────────────────────────────────┐
│  ELECTRON PROCESS  (single process, Node.js)                    │
│                                                                  │
│  ┌─────────────────┐                                            │
│  │  hotkey.js      │  uiohook-napi listens globally             │
│  │                 │  keydown ⌘+Alt  → onStart()               │
│  │                 │  keyup   Alt    → onStop()                 │
│  └────────┬────────┘                                            │
│           │ onStart()                                            │
│           ▼                                                      │
│  ┌─────────────────┐                                            │
│  │  audio.js       │  spawns ffmpeg subprocess                  │
│  │                 │  args: -f avfoundation -i :0               │
│  │                 │        -ar 16000 -ac 1                     │
│  │                 │        -f s16le pipe:1    ← stdout pipe    │
│  │                 │                                            │
│  │  _chunks[]      │  ← PCM chunks arrive via stdout.on()      │
│  └────────┬────────┘                                            │
│           │ onStop() → proc.kill(SIGINT)                         │
│           │           → Buffer.concat(_chunks)                   │
│           │                                                      │
│           │  Int16 PCM buffer (16kHz, mono, in RAM)             │
│           │  no recording.wav · no disk write                   │
│           ▼                                                      │
│  ┌─────────────────┐                                            │
│  │  whisper-       │  converts Int16 → Float32 (÷ 32768.0)     │
│  │  native.js      │  calls addon.transcribe(buf, opts, cb)     │
│  │                 │  exposes loadModel() / isReady() /         │
│  │                 │          transcribe() / dispose()          │
│  └────────┬────────┘                                            │
│           │  N-API call                                          │
│           ▼                                                      │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  whisper_addon.node  (C++ N-API · native/build/Release/) │   │
│  │                                                           │   │
│  │  addon.cpp                                                │   │
│  │  └─ TranscribeWorker (Napi::AsyncWorker)                 │   │
│  │     └─ runs on libuv thread pool                         │   │
│  │        └─ whisper_full_with_state(ctx, state, params,    │   │
│  │                                   pcm, n_samples)        │   │
│  │                                                           │   │
│  │  whisper_context*  ← loaded once at startup, in RAM      │   │
│  │  whisper_state*    ← pre-allocated, reused every call    │   │
│  │                                                           │   │
│  │  libwhisper.dylib  (v1.8.4)                              │   │
│  │  ├─ libggml.dylib                                        │   │
│  │  ├─ libggml-metal.dylib   ← Metal GPU · Apple Silicon   │   │
│  │  ├─ libggml-blas.dylib    ← Apple Accelerate            │   │
│  │  └─ libggml-cpu.dylib                                    │   │
│  │                                                           │   │
│  │  returns → { text, segments[{t0,t1,text,confidence}],    │   │
│  │              language, timings{encode_ms, decode_ms} }   │   │
│  └────────┬─────────────────────────────────────────────────┘   │
│           │  result.text                                         │
│           ▼                                                      │
│  ┌─────────────────┐                                            │
│  │  paste.js       │  clipboard.writeText(text)                 │
│  │                 │  simulate Cmd+V via nut-js                 │
│  │                 │  restore old clipboard after 150ms         │
│  └─────────────────┘                                            │
│                                                                  │
└──────────────────────────┬──────────────────────────────────────┘
                           │  Cmd+V keystroke
                           ▼
              📋 ACTIVE APP  (any focused window)
```

---

## Module Dependency Map

```
index.js
 ├── hotkey.js          (uiohook-napi)
 ├── audio.js           (ffmpeg subprocess → stdout pipe)
 ├── whisper-native.js  (wraps the .node addon)
 │    └── whisper_addon.node  (C++ → libwhisper.dylib)
 ├── paste.js           (clipboard + nut-js)
 ├── ipc.js             (IPC handlers, refs whisper-native)
 ├── models.js          (download manager, refs whisper-native for paths)
 ├── store.js           (electron-store, settings)
 └── tray.js            (menu bar icon)
```

---

## Native Addon Detail

| Symbol | Description |
|---|---|
| `whisper_init_from_file_with_params()` | Loads model file into `whisper_context*` once at startup |
| `whisper_init_state()` | Pre-allocates `whisper_state*` (KV cache, mel buffer) — reused every call |
| `whisper_full_with_state()` | Runs inference. Accepts `float* pcm`, returns segments via getter calls |
| `whisper_full_get_segment_text_from_state()` | Extracts transcript text per segment |
| `whisper_full_get_segment_t0/t1_from_state()` | Timestamps per segment (centiseconds) |
| `whisper_full_get_segment_no_speech_prob_from_state()` | Silence confidence per segment |
| `whisper_get_timings()` | Per-call timing breakdown: encode, decode, sample |
| `whisper_free_state()` / `whisper_free()` | Called on `dispose()` at app quit |

---

## Audio Format

| Property | Value | Reason |
|---|---|---|
| Sample rate | 16000 Hz | Whisper's required input rate |
| Channels | 1 (mono) | Whisper expects mono |
| Encoding (ffmpeg out) | `s16le` | Signed 16-bit little-endian PCM |
| Encoding (whisper in) | `float32` | Normalized to `[-1.0, 1.0]` via `÷ 32768.0f` |
| Transport | stdout pipe | No disk I/O, no WAV headers needed |

---

## dylib Chain (macOS)

```
whisper_addon.node
  └── @rpath/libwhisper.1.dylib          (whisper.cpp v1.8.4)
        ├── @rpath/libggml.0.dylib
        ├── @rpath/libggml-cpu.0.dylib
        ├── @rpath/libggml-metal.0.dylib  ← Metal / Apple Neural Engine
        ├── @rpath/libggml-blas.0.dylib   ← Apple Accelerate framework
        └── @rpath/libggml-base.0.dylib

rpath (dev):      @loader_path/../../../whisper/lib
rpath (packaged): resources/whisper/lib/
```

---

## Startup Sequence

```
app.whenReady()
  │
  ├─ createMainWindow()
  ├─ createOverlayWindow()
  ├─ ModelManager.on('download-complete') → loadWhisperModel()
  ├─ ipc.registerHandlers()
  ├─ tray.createTray()
  ├─ hotkey.setup(onStart, onStop)
  │
  └─ setTimeout(loadWhisperModel, 800ms)
       └─ whisper.loadModel(activeModel)
            └─ addon.loadModel(modelPath)
                 └─ whisper_init_from_file_with_params()
                 └─ whisper_init_state()
                 └─ emits 'model-ready' → UI shows "Ready"
```
