const Store = require('electron-store');

const store = new Store({
  name: 'voicetype-settings',
  defaults: {
    onboardingComplete: false,
    activeModel: 'base',
    theme: 'dark',
    hotkey: process.platform === 'darwin' ? 'meta+alt' : 'ctrl+alt',
  },
});

module.exports = store;
