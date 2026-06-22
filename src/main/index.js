const { app, BrowserWindow, shell } = require('electron');
const path = require('path');

const store = require('./store');
const hotkey = require('./hotkey');
const audio = require('./audio');
const whisper = require('./whisper-native');
const paste = require('./paste');
const tray = require('./tray');
const ipc = require('./ipc');
const { ModelManager } = require('./models');

const isDev = process.env.ELECTRON_DEV === 'true';
const RENDERER_DEV = 'http://localhost:5173';
const RENDERER_PROD = path.join(__dirname, '../../dist/renderer/index.html');

let mainWindow = null;
let overlayWindow = null;
let modelManager = null;

if (!app.requestSingleInstanceLock()) {
  app.quit();
  process.exit(0);
}
app.on('second-instance', () => {
  if (mainWindow) { mainWindow.show(); mainWindow.focus(); }
});

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 720,
    height: 620,
    minWidth: 620,
    minHeight: 560,
    show: false,
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    backgroundColor: '#09090b',
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (isDev) {
    mainWindow.loadURL(RENDERER_DEV);
  } else {
    mainWindow.loadFile(RENDERER_PROD);
  }

  mainWindow.once('ready-to-show', () => { mainWindow.show(); });

  mainWindow.on('close', (e) => {
    e.preventDefault();
    mainWindow.hide();
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

const OVERLAY_W = 240;
const OVERLAY_H = 52;

function createOverlayWindow() {
  overlayWindow = new BrowserWindow({
    width: OVERLAY_W,
    height: OVERLAY_H,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    hasShadow: false,
    show: false,
    focusable: false,
    type: process.platform === 'linux' ? 'toolbar' : undefined,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (isDev) {
    overlayWindow.loadURL(`${RENDERER_DEV}#overlay`);
  } else {
    overlayWindow.loadFile(RENDERER_PROD, { hash: 'overlay' });
  }

  // floating panel sits above everything including full-screen apps
  overlayWindow.setAlwaysOnTop(true, 'floating', 1);
  if (process.platform === 'darwin') {
    overlayWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  }
}

function positionOverlay() {
  if (!overlayWindow) return;
  const { screen } = require('electron');
  // Always top-center of the display that currently has the mouse
  const cursor = screen.getCursorScreenPoint();
  const display = screen.getDisplayNearestPoint(cursor);
  const wa = display.workArea;
  const x = Math.round(wa.x + (wa.width - OVERLAY_W) / 2);
  const y = Math.round(wa.y + 16); // 16px below top of work area
  overlayWindow.setPosition(x, y);
}

function openSettings() {
  if (mainWindow) { mainWindow.show(); mainWindow.focus(); }
}

async function loadWhisperModel() {
  const modelId = store.get('activeModel') || 'base';
  console.log(`Loading whisper model in-process: ${modelId}`);
  try {
    const ok = await whisper.loadModel(modelId);
    ipc.sendToMain('model-ready', { ready: ok, modelId });
    if (ok) console.log('Whisper model ready');
  } catch (err) {
    console.error('Failed to load whisper model:', err.message);
    ipc.sendToMain('model-ready', { ready: false, error: err.message });
  }
}

app.whenReady().then(async () => {
  createMainWindow();
  createOverlayWindow();

  modelManager = new ModelManager();
  modelManager.on('download-progress', (d) => ipc.sendToMain('download-progress', d));
  modelManager.on('download-complete', (d) => {
    ipc.sendToMain('download-complete', d);
    ipc.sendToMain('model-status-update', modelManager.getStatus());
    // Auto-load model when the active model finishes downloading
    if (!whisper.isReady() && d.modelId === (store.get('activeModel') || 'base')) {
      loadWhisperModel();
    }
  });
  modelManager.on('download-error', (d) => ipc.sendToMain('download-error', d));

  ipc.registerHandlers();
  ipc.setModelManager(modelManager);
  ipc.setWindows(mainWindow, overlayWindow);

  tray.createTray(openSettings);

  hotkey.setup(
    () => {
      // Press: start recording
      if (!whisper.isReady()) {
        console.log('Model not ready, ignoring hotkey');
        return;
      }
      if (audio.isRecording()) return;

      audio.startRecording();
      tray.setStatus('recording');
      positionOverlay();
      overlayWindow.showInactive();
      const startTime = Date.now();
      ipc.sendToOverlay('recording-state', { active: true, startTime });
      ipc.sendToMain('recording-state', true);
    },
    async () => {
      // Release: stop and transcribe
      if (!audio.isRecording()) return;

      const pcmBufferPromise = audio.stopRecording();
      tray.setStatus('processing');
      ipc.sendToOverlay('recording-state', { active: false, processing: true });
      ipc.sendToMain('recording-state', false);

      const pcmBuffer = await pcmBufferPromise;
      overlayWindow.hide();

      try {
        if (pcmBuffer.length === 0) {
          console.log('Empty recording, skipping');
          tray.setStatus('idle');
          return;
        }
        const result = await whisper.transcribe(pcmBuffer, {
          language: store.get('language') || 'en',
        });
        if (result && result.text) {
          console.log('Transcribed:', result.text, `(${result.timings?.total_ms}ms)`);
          await paste.streamText(result.text);
        }
      } catch (err) {
        console.error('Pipeline error:', err.message);
        ipc.sendToMain('pipeline-error', err.message);
      }

      tray.setStatus('idle');
    },
    store.get('hotkey') || (process.platform === 'darwin' ? 'meta+alt' : 'ctrl+alt')
  );

  // Load model after UI is ready
  setTimeout(loadWhisperModel, 800);

  app.on('activate', () => {
    if (!mainWindow.isVisible()) openSettings();
  });
});

app.on('will-quit', () => {
  hotkey.teardown();
  whisper.dispose();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
