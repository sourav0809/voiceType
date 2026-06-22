const { uIOhook, UiohookKey } = require('uiohook-napi');

// Hotkey combo definitions — id maps to a pair of keys that must both be held
const HOTKEY_DEFS = {
  // macOS
  'meta+alt':   { keys: [UiohookKey.Meta, UiohookKey.MetaRight, UiohookKey.Alt, UiohookKey.AltRight],   primary: [UiohookKey.Meta, UiohookKey.MetaRight],  secondary: [UiohookKey.Alt, UiohookKey.AltRight] },
  'meta+shift': { keys: [UiohookKey.Meta, UiohookKey.MetaRight, UiohookKey.Shift, UiohookKey.ShiftRight], primary: [UiohookKey.Meta, UiohookKey.MetaRight], secondary: [UiohookKey.Shift, UiohookKey.ShiftRight] },
  'ctrl+alt':   { keys: [UiohookKey.Ctrl, UiohookKey.CtrlRight, UiohookKey.Alt, UiohookKey.AltRight],    primary: [UiohookKey.Ctrl, UiohookKey.CtrlRight],  secondary: [UiohookKey.Alt, UiohookKey.AltRight] },
  'ctrl+shift': { keys: [UiohookKey.Ctrl, UiohookKey.CtrlRight, UiohookKey.Shift, UiohookKey.ShiftRight], primary: [UiohookKey.Ctrl, UiohookKey.CtrlRight], secondary: [UiohookKey.Shift, UiohookKey.ShiftRight] },
};

let _primaryDown  = false;
let _secondaryDown = false;
let _onStart = null;
let _onStop  = null;
let _started = false;
let _currentDef  = null;

function _isPrimary(code) {
  return _currentDef?.primary.includes(code) ?? false;
}
function _isSecondary(code) {
  return _currentDef?.secondary.includes(code) ?? false;
}
function _isReleaseTrigger(code) {
  // Releasing either key in the combo triggers stop
  return _isPrimary(code) || _isSecondary(code);
}

function setup(onStart, onStop, hotkeyId) {
  _onStart = onStart;
  _onStop  = onStop;

  const id = hotkeyId || (process.platform === 'darwin' ? 'meta+alt' : 'ctrl+alt');
  _currentDef = HOTKEY_DEFS[id] || HOTKEY_DEFS['meta+alt'];

  _primaryDown   = false;
  _secondaryDown = false;

  uIOhook.removeAllListeners('keydown');
  uIOhook.removeAllListeners('keyup');

  uIOhook.on('keydown', (e) => {
    if (_isPrimary(e.keycode))   _primaryDown   = true;
    if (_isSecondary(e.keycode)) _secondaryDown = true;
    if (_primaryDown && _secondaryDown && _onStart) _onStart();
  });

  uIOhook.on('keyup', (e) => {
    const wasActive = _primaryDown && _secondaryDown;
    if (_isPrimary(e.keycode))   _primaryDown   = false;
    if (_isSecondary(e.keycode)) _secondaryDown = false;
    if (wasActive && _isReleaseTrigger(e.keycode) && _onStop) _onStop();
  });

  if (!_started) {
    uIOhook.start();
    _started = true;
  }
}

function updateHotkey(hotkeyId) {
  const def = HOTKEY_DEFS[hotkeyId];
  if (!def) return false;
  _currentDef    = def;
  _primaryDown   = false;
  _secondaryDown = false;
  return true;
}

function teardown() {
  if (_started) {
    uIOhook.stop();
    _started = false;
  }
}

// Human-readable label for a hotkey id
function hotkeyLabel(id, platform) {
  const isMac = (platform || process.platform) === 'darwin';
  const labels = {
    'meta+alt':   isMac ? '⌘ + Option' : 'Win + Alt',
    'meta+shift': isMac ? '⌘ + Shift'  : 'Win + Shift',
    'ctrl+alt':   isMac ? '⌃ + Option' : 'Ctrl + Alt',
    'ctrl+shift': isMac ? '⌃ + Shift'  : 'Ctrl + Shift',
  };
  return labels[id] || id;
}

const HOTKEY_OPTIONS = Object.keys(HOTKEY_DEFS);

module.exports = { setup, teardown, updateHotkey, hotkeyLabel, HOTKEY_OPTIONS };
