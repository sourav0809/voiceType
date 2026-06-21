const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { EventEmitter } = require('events');
const { getModelsDir } = require('./whisper-native');

const BASE_URL = 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main';

const MODELS = {
  tiny: {
    id: 'tiny',
    name: 'Whisper Tiny',
    filename: 'ggml-tiny.bin',
    sizeMB: 75,
    description: 'Fastest. Good for quick notes on low-end machines.',
  },
  base: {
    id: 'base',
    name: 'Whisper Base',
    filename: 'ggml-base.bin',
    sizeMB: 142,
    description: 'Recommended. Best balance of speed and accuracy.',
    recommended: true,
  },
  small: {
    id: 'small',
    name: 'Whisper Small',
    filename: 'ggml-small.bin',
    sizeMB: 466,
    description: 'Better accuracy, ~2x slower than Base.',
  },
  medium: {
    id: 'medium',
    name: 'Whisper Medium',
    filename: 'ggml-medium.bin',
    sizeMB: 1500,
    description: 'High accuracy. Needs 4 GB+ RAM.',
  },
  'large-v3': {
    id: 'large-v3',
    name: 'Whisper Large v3',
    filename: 'ggml-large-v3.bin',
    sizeMB: 2900,
    description: 'Best accuracy. Needs 8 GB+ RAM.',
  },
};

class ModelManager extends EventEmitter {
  constructor() {
    super();
    this.activeDownloads = new Map();
  }

  getModelPath(modelId) {
    const m = MODELS[modelId];
    return m ? path.join(getModelsDir(), m.filename) : null;
  }

  isInstalled(modelId) {
    const p = this.getModelPath(modelId);
    return p ? fs.existsSync(p) : false;
  }

  getStatus() {
    const result = {};
    for (const [id, m] of Object.entries(MODELS)) {
      result[id] = {
        ...m,
        installed: this.isInstalled(id),
        downloading: this.activeDownloads.has(id),
        progress: this.activeDownloads.get(id) ?? 0,
      };
    }
    return result;
  }

  download(modelId) {
    if (this.activeDownloads.has(modelId)) return;
    if (this.isInstalled(modelId)) return;

    const m = MODELS[modelId];
    if (!m) return;

    const destPath = this.getModelPath(modelId);
    const tmpPath = destPath + '.tmp';

    this.activeDownloads.set(modelId, 0);
    this.emit('download-start', { modelId });

    this._fetch(`${BASE_URL}/${m.filename}`, tmpPath, (progress) => {
      this.activeDownloads.set(modelId, progress);
      this.emit('download-progress', { modelId, progress });
    })
      .then(() => {
        fs.renameSync(tmpPath, destPath);
        this.activeDownloads.delete(modelId);
        this.emit('download-complete', { modelId });
      })
      .catch((err) => {
        if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);
        this.activeDownloads.delete(modelId);
        this.emit('download-error', { modelId, error: err.message });
      });
  }

  _fetch(url, dest, onProgress, redirectCount = 0) {
    return new Promise((resolve, reject) => {
      if (redirectCount > 5) return reject(new Error('Too many redirects'));

      const proto = url.startsWith('https') ? https : http;
      proto.get(url, { headers: { 'User-Agent': 'VoiceType/1.0' } }, (res) => {
        if (res.statusCode === 301 || res.statusCode === 302 || res.statusCode === 307) {
          res.resume();
          this._fetch(res.headers.location, dest, onProgress, redirectCount + 1)
            .then(resolve)
            .catch(reject);
          return;
        }

        if (res.statusCode !== 200) {
          res.resume();
          return reject(new Error(`HTTP ${res.statusCode}`));
        }

        const total = parseInt(res.headers['content-length'] || '0');
        let received = 0;
        const file = fs.createWriteStream(dest);

        res.on('data', (chunk) => {
          received += chunk.length;
          if (total > 0) onProgress(received / total);
        });

        res.pipe(file);
        file.on('finish', () => { file.close(); resolve(); });
        file.on('error', reject);
        res.on('error', reject);
      }).on('error', reject);
    });
  }

  delete(modelId) {
    if (modelId === 'base') return false;
    const p = this.getModelPath(modelId);
    if (p && fs.existsSync(p)) {
      fs.unlinkSync(p);
      return true;
    }
    return false;
  }
}

module.exports = { ModelManager, MODELS };
