const { uIOhook, UiohookKey } = require('uiohook-napi');

let _cmdPressed = false;
let _altPressed = false;
let _onStart = null;
let _onStop = null;
let _started = false;

function setup(onStart, onStop) {
  _onStart = onStart;
  _onStop = onStop;

  uIOhook.on('keydown', (event) => {
    if (event.keycode === UiohookKey.Meta || event.keycode === UiohookKey.MetaRight) {
      _cmdPressed = true;
    }
    if (event.keycode === UiohookKey.Alt || event.keycode === UiohookKey.AltRight) {
      _altPressed = true;
    }
    if (_cmdPressed && _altPressed && _onStart) {
      _onStart();
    }
  });

  uIOhook.on('keyup', (event) => {
    if (event.keycode === UiohookKey.Meta || event.keycode === UiohookKey.MetaRight) {
      _cmdPressed = false;
    }
    if (event.keycode === UiohookKey.Alt || event.keycode === UiohookKey.AltRight) {
      _altPressed = false;
      if (_onStop) _onStop();
    }
  });

  if (!_started) {
    uIOhook.start();
    _started = true;
  }
}

function teardown() {
  if (_started) {
    uIOhook.stop();
    _started = false;
  }
}

module.exports = { setup, teardown };
