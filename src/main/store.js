const Store = require('electron-store');

const store = new Store({
  name: 'voicetype-settings',
  defaults: {
    onboardingComplete: false,
    activeModel: 'base',
    theme: 'dark',
  },
});

module.exports = store;
