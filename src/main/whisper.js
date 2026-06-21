const { spawn } = require('child_process');
const { app } = require('electron');
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

let whisperProcess = null;
let _serverReady = false;
let _startPromise = null;

const PORT = 8080;

function getBinaryPath() {
  return app.isPackaged
    ? path.join(process.resourcesPath, 'whisper/bin/whisper-server')
    : path.join(__dirname, '../../whisper/build/bin/whisper-server');
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

function isBinaryAvailable() {
  return fs.existsSync(getBinaryPath());
}

function isServerReady() {
  return _serverReady;
}

async function startServer(modelId = 'base') {
  if (_startPromise) return _startPromise;

  _startPromise = new Promise((resolve) => {
    const binaryPath = getBinaryPath();
    if (!isBinaryAvailable()) {
      console.error('Whisper binary not found:', binaryPath);
      resolve(false);
      return;
    }

    const modelPath = getModelPath(modelId);
    if (!fs.existsSync(modelPath)) {
      console.error('Model not found:', modelPath);
      resolve(false);
      return;
    }

    if (whisperProcess) {
      whisperProcess.kill();
      whisperProcess = null;
      _serverReady = false;
    }

    console.log(`Starting whisper-server with ${modelId}...`);
    whisperProcess = spawn(binaryPath, [
      '-m', modelPath,
      '-l', 'en',
      '--port', String(PORT),
      '--host', '127.0.0.1',
    ]);

    let resolved = false;

    const onReady = (data) => {
      const text = data.toString();
      if (!resolved && (text.includes('listening') || text.includes('HTTP server') || text.includes('server listening'))) {
        resolved = true;
        _serverReady = true;
        resolve(true);
      }
    };

    whisperProcess.stdout.on('data', onReady);
    whisperProcess.stderr.on('data', onReady);

    whisperProcess.on('close', (code) => {
      console.log('Whisper server closed, code:', code);
      _serverReady = false;
      whisperProcess = null;
      _startPromise = null;
    });

    whisperProcess.on('error', (err) => {
      console.error('Whisper server error:', err.message);
      if (!resolved) {
        resolved = true;
        resolve(false);
      }
    });

    // If server doesn't announce itself in 12s, assume it's ready
    setTimeout(() => {
      if (!resolved) {
        resolved = true;
        _serverReady = true;
        resolve(true);
      }
    }, 12000);
  });

  return _startPromise;
}

async function restartWithModel(modelId) {
  _startPromise = null;
  _serverReady = false;
  if (whisperProcess) {
    whisperProcess.kill();
    whisperProcess = null;
  }
  await new Promise((r) => setTimeout(r, 500));
  return startServer(modelId);
}

async function transcribe(audioPath) {
  if (!_serverReady) throw new Error('Whisper server not ready');

  const form = new FormData();
  form.append('file', fs.createReadStream(audioPath));

  const res = await axios.post(`http://127.0.0.1:${PORT}/inference`, form, {
    headers: form.getHeaders(),
    timeout: 30000,
  });

  const text = (res.data?.text || '').trim();
  // Strip whisper artifacts like [BLANK_AUDIO], (music), etc.
  return text.replace(/\[.*?\]/g, '').replace(/\(.*?\)/g, '').trim();
}

function stopServer() {
  if (whisperProcess) {
    whisperProcess.kill();
    whisperProcess = null;
  }
  _serverReady = false;
  _startPromise = null;
}

module.exports = {
  startServer,
  stopServer,
  restartWithModel,
  transcribe,
  isServerReady,
  isModelDownloaded,
  isBinaryAvailable,
  getModelPath,
  getModelsDir,
};
