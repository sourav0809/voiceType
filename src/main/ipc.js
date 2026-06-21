const { ipcMain } = require('electron');
const store = require('./store');
const permissions = require('./permissions');
const whisper = require('./whisper-native');

let _modelManager = null;
let _mainWindow = null;
let _overlayWindow = null;

function setModelManager(mm) { _modelManager = mm; }
function setWindows(main, overlay) { _mainWindow = main; _overlayWindow = overlay; }

function sendToMain(channel, data) {
  if (_mainWindow && !_mainWindow.isDestroyed()) {
    _mainWindow.webContents.send(channel, data);
  }
}

function sendToOverlay(channel, data) {
  if (_overlayWindow && !_overlayWindow.isDestroyed()) {
    _overlayWindow.webContents.send(channel, data);
  }
}

function registerHandlers() {
  ipcMain.handle('get-settings', () => store.store);
  ipcMain.handle('set-setting', (_, key, value) => { store.set(key, value); return true; });

  ipcMain.handle('check-permissions', async () => {
    const mic = await permissions.checkMicrophonePermission();
    const accessibility = permissions.checkAccessibilityPermission();
    return { mic, accessibility };
  });
  ipcMain.handle('open-mic-settings', () => permissions.openMicSettings());
  ipcMain.handle('open-accessibility-settings', () => permissions.openAccessibilitySettings());

  ipcMain.handle('get-model-status', () => _modelManager ? _modelManager.getStatus() : {});
  ipcMain.handle('download-model', (_, modelId) => { if (_modelManager) _modelManager.download(modelId); return true; });
  ipcMain.handle('delete-model', (_, modelId) => _modelManager ? _modelManager.delete(modelId) : false);

  ipcMain.handle('switch-model', async (_, modelId) => {
    store.set('activeModel', modelId);
    return whisper.loadModel(modelId);
  });

  ipcMain.handle('get-model-ready', () => ({
    ready: whisper.isReady(),
  }));

  ipcMain.handle('complete-onboarding', () => { store.set('onboardingComplete', true); });
}

module.exports = { registerHandlers, setModelManager, setWindows, sendToMain, sendToOverlay };
