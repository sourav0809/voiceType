const path = require('path');
const fs = require('fs');
const { app } = require('electron');

let addon = null;
let _ready = false;

function getAddonPath() {
  return app.isPackaged
    ? path.join(process.resourcesPath, 'native/whisper_addon.node')
    : path.join(__dirname, '../../native/build/Release/whisper_addon.node');
}

function getModelsDir() {
  if (app.isPackaged) {
    const dir = path.join(app.getPath('userData'), 'models');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    return dir;
  }
  return path.join(__dirname, '../../whisper/models');
}

function getModelPath(modelId) {
  return path.join(getModelsDir(), `ggml-${modelId}.bin`);
}

function isModelDownloaded(modelId) {
  return fs.existsSync(getModelPath(modelId));
}

function isReady() {
  return _ready && addon !== null && addon.isReady();
}

async function loadModel(modelId = 'base') {
  const modelPath = getModelPath(modelId);
  if (!fs.existsSync(modelPath)) {
    throw new Error(`Model not found: ${modelPath}`);
  }

  if (!addon) {
    addon = require(getAddonPath());
  }

  addon.loadModel(modelPath);
  _ready = true;
  console.log(`Whisper model loaded in-process: ${modelId}`);
  return true;
}

function transcribe(pcmBuffer, opts = {}) {
  if (!isReady()) throw new Error('Whisper model not loaded');
  if (!pcmBuffer || pcmBuffer.length === 0) throw new Error('Empty audio buffer');

  const int16buf = Buffer.isBuffer(pcmBuffer) ? pcmBuffer : Buffer.from(pcmBuffer);
  // reinterpret as Int16 view (each sample = 2 bytes)
  const int16view = new Int16Array(int16buf.buffer, int16buf.byteOffset, int16buf.byteLength / 2);
  const nodeBuf = Buffer.from(int16view.buffer, int16view.byteOffset, int16view.byteLength);

  return new Promise((resolve, reject) => {
    addon.transcribe(nodeBuf, opts, (err, result) => {
      if (err) return reject(err);
      resolve(result);
    });
  });
}

function dispose() {
  if (addon) addon.dispose();
  _ready = false;
}

module.exports = {
  loadModel,
  transcribe,
  dispose,
  isReady,
  isModelDownloaded,
  getModelPath,
  getModelsDir,
};
