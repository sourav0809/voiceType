const { contextBridge, ipcRenderer } = require('electron');

const ALLOWED_EVENTS = [
  'recording-state',
  'download-progress',
  'download-complete',
  'download-error',
  'model-status-update',
  'model-ready',
  'pipeline-error',
];

contextBridge.exposeInMainWorld('voiceType', {
  platform: process.platform,

  getSettings: () => ipcRenderer.invoke('get-settings'),
  setSetting: (key, value) => ipcRenderer.invoke('set-setting', key, value),

  checkPermissions: () => ipcRenderer.invoke('check-permissions'),
  openMicSettings: () => ipcRenderer.invoke('open-mic-settings'),
  openAccessibilitySettings: () => ipcRenderer.invoke('open-accessibility-settings'),

  getModelStatus: () => ipcRenderer.invoke('get-model-status'),
  downloadModel: (id) => ipcRenderer.invoke('download-model', id),
  deleteModel: (id) => ipcRenderer.invoke('delete-model', id),
  switchModel: (id) => ipcRenderer.invoke('switch-model', id),
  getModelReady: () => ipcRenderer.invoke('get-model-ready'),
  setHotkey: (id) => ipcRenderer.invoke('set-hotkey', id),
  getHotkeyOptions: () => ipcRenderer.invoke('get-hotkey-options'),

  completeOnboarding: () => ipcRenderer.invoke('complete-onboarding'),

  on: (channel, cb) => {
    if (!ALLOWED_EVENTS.includes(channel)) return () => {};
    const handler = (_, data) => cb(data);
    ipcRenderer.on(channel, handler);
    return () => ipcRenderer.removeListener(channel, handler);
  },
});
