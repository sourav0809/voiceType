const { Tray, Menu, nativeImage, app } = require('electron');
const path = require('path');
const fs = require('fs');

let tray = null;
let _onOpenSettings = null;

function createTray(onOpenSettings) {
  _onOpenSettings = onOpenSettings;

  const iconPath = path.join(__dirname, '../../assets/tray-icon.png');
  let icon = fs.existsSync(iconPath)
    ? nativeImage.createFromPath(iconPath)
    : nativeImage.createEmpty();

  if (process.platform === 'darwin' && !icon.isEmpty()) {
    icon.setTemplateImage(true);
  }

  tray = new Tray(icon);
  tray.setToolTip('VoiceType');
  _rebuildMenu();

  if (process.platform !== 'linux') {
    tray.on('click', onOpenSettings);
  }
}

function _rebuildMenu() {
  if (!tray) return;
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: 'VoiceType', enabled: false },
      { type: 'separator' },
      { label: 'Settings', click: () => _onOpenSettings && _onOpenSettings() },
      { type: 'separator' },
      { label: 'Quit', click: () => app.quit() },
    ])
  );
}

function setStatus(status) {
  if (!tray) return;
  const labels = {
    idle: 'VoiceType',
    recording: 'VoiceType — Recording...',
    processing: 'VoiceType — Processing...',
    error: 'VoiceType — Error',
  };
  tray.setToolTip(labels[status] || 'VoiceType');
}

function destroy() {
  if (tray) {
    tray.destroy();
    tray = null;
  }
}

module.exports = { createTray, setStatus, destroy };
