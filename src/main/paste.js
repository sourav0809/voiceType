const { clipboard } = require('electron');
const { keyboard, Key } = require('@nut-tree-fork/nut-js');

keyboard.config.autoDelayMs = 0;

// Instant clipboard paste — fastest possible, no keystroke simulation overhead
async function streamText(text) {
  const t = text.trim();
  if (!t) return;

  const old = clipboard.readText();
  clipboard.writeText(t);

  await new Promise((r) => setTimeout(r, 40));

  if (process.platform === 'darwin') {
    await keyboard.pressKey(Key.LeftSuper);
    await keyboard.pressKey(Key.V);
    await keyboard.releaseKey(Key.V);
    await keyboard.releaseKey(Key.LeftSuper);
  } else {
    await keyboard.pressKey(Key.LeftControl);
    await keyboard.pressKey(Key.V);
    await keyboard.releaseKey(Key.V);
    await keyboard.releaseKey(Key.LeftControl);
  }

  // Restore clipboard after paste completes
  setTimeout(() => clipboard.writeText(old), 150);
}

module.exports = { streamText, pasteText: streamText };
