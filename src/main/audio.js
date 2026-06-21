const { spawn } = require('child_process');

let ffmpegProcess = null;
let _recording = false;
let _chunks = [];

function startRecording() {
  if (_recording) return false;

  _chunks = [];

  const args =
    process.platform === 'darwin'
      ? ['-f', 'avfoundation', '-i', ':0', '-ar', '16000', '-ac', '1', '-f', 's16le', 'pipe:1']
      : ['-f', 'dshow', '-i', 'audio=default', '-ar', '16000', '-ac', '1', '-f', 's16le', 'pipe:1'];

  ffmpegProcess = spawn('ffmpeg', args);
  ffmpegProcess.stdout.on('data', (chunk) => { _chunks.push(chunk); });
  ffmpegProcess.stderr.on('data', () => {});
  ffmpegProcess.on('error', (err) => {
    console.error('FFmpeg error:', err.message);
    _recording = false;
  });

  _recording = true;
  return true;
}

function stopRecording() {
  if (!_recording || !ffmpegProcess) {
    _recording = false;
    return Promise.resolve(Buffer.alloc(0));
  }
  _recording = false;
  const proc = ffmpegProcess;
  ffmpegProcess = null;

  return new Promise((resolve) => {
    proc.once('close', () => {
      resolve(Buffer.concat(_chunks));
      _chunks = [];
    });
    proc.kill('SIGINT');
  });
}

function isRecording() {
  return _recording;
}

module.exports = { startRecording, stopRecording, isRecording };
