const { systemPreferences, shell } = require('electron');

async function checkMicrophonePermission() {
  if (process.platform !== 'darwin') return { granted: true };
  const status = systemPreferences.getMediaAccessStatus('microphone');
  if (status === 'granted') return { granted: true };
  if (status === 'not-determined') {
    const granted = await systemPreferences.askForMediaAccess('microphone');
    return { granted };
  }
  return { granted: false, needsManual: true };
}

function checkAccessibilityPermission() {
  if (process.platform !== 'darwin') return { granted: true };
  const trusted = systemPreferences.isTrustedAccessibilityClient(false);
  return { granted: trusted };
}

function openMicSettings() {
  shell.openExternal(
    'x-apple.systempreferences:com.apple.preference.security?Privacy_Microphone'
  );
}

function openAccessibilitySettings() {
  shell.openExternal(
    'x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility'
  );
}

module.exports = {
  checkMicrophonePermission,
  checkAccessibilityPermission,
  openMicSettings,
  openAccessibilitySettings,
};
