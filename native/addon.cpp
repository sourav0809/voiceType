#include <napi.h>
#include "whisper.h"
#include <string>
#include <vector>
#include <cstring>
#include <cmath>
#include <thread>

// ─── Persistent state ────────────────────────────────────────────────────────
static whisper_context* g_ctx   = nullptr;
static whisper_state*   g_state = nullptr;

// ─── LoadModel ────────────────────────────────────────────────────────────────
// loadModel(modelPath: string): void
Napi::Value LoadModel(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  if (info.Length() < 1 || !info[0].IsString()) {
    Napi::TypeError::New(env, "Expected string modelPath").ThrowAsJavaScriptException();
    return env.Undefined();
  }

  std::string modelPath = info[0].As<Napi::String>();

  // Free any previous context
  if (g_state) { whisper_free_state(g_state); g_state = nullptr; }
  if (g_ctx)   { whisper_free(g_ctx);         g_ctx   = nullptr; }

  whisper_context_params cparams = whisper_context_default_params();
  cparams.use_gpu = true;

  g_ctx = whisper_init_from_file_with_params(modelPath.c_str(), cparams);
  if (!g_ctx) {
    Napi::Error::New(env, "Failed to load whisper model: " + modelPath).ThrowAsJavaScriptException();
    return env.Undefined();
  }

  g_state = whisper_init_state(g_ctx);
  if (!g_state) {
    whisper_free(g_ctx); g_ctx = nullptr;
    Napi::Error::New(env, "Failed to init whisper state").ThrowAsJavaScriptException();
    return env.Undefined();
  }

  return env.Undefined();
}

// ─── IsReady ─────────────────────────────────────────────────────────────────
Napi::Value IsReady(const Napi::CallbackInfo& info) {
  return Napi::Boolean::New(info.Env(), g_ctx != nullptr && g_state != nullptr);
}

// ─── Dispose ─────────────────────────────────────────────────────────────────
Napi::Value Dispose(const Napi::CallbackInfo& info) {
  if (g_state) { whisper_free_state(g_state); g_state = nullptr; }
  if (g_ctx)   { whisper_free(g_ctx);         g_ctx   = nullptr; }
  return info.Env().Undefined();
}

// ─── AsyncWorker for transcription ───────────────────────────────────────────
struct TranscribeResult {
  std::string text;
  std::string language;
  struct Segment {
    int64_t t0, t1;
    std::string text;
    float confidence;
  };
  std::vector<Segment> segments;
  // timings in ms
  int64_t encode_ms = 0;
  int64_t decode_ms = 0;
  int64_t total_ms  = 0;
};

class TranscribeWorker : public Napi::AsyncWorker {
public:
  TranscribeWorker(Napi::Function& cb, std::vector<float> pcm, bool word_timestamps, std::string language)
    : Napi::AsyncWorker(cb), _pcm(std::move(pcm)), _word_timestamps(word_timestamps), _language(language) {}

  void Execute() override {
    if (!g_ctx || !g_state) {
      SetError("Whisper model not loaded");
      return;
    }

    whisper_full_params params = whisper_full_default_params(WHISPER_SAMPLING_GREEDY);
    params.print_realtime   = false;
    params.print_progress   = false;
    params.print_timestamps = false;
    params.print_special    = false;
    params.translate        = false;
    params.no_context       = true;
    params.single_segment   = false;
    params.token_timestamps = _word_timestamps;
    params.n_threads        = (int)std::min((int)std::thread::hardware_concurrency(), 8);

    if (_language == "auto" || _language.empty()) {
      params.language = nullptr;
      params.detect_language = true;
    } else {
      params.language = _language.c_str();
      params.detect_language = false;
    }

    int rc = whisper_full_with_state(g_ctx, g_state, params, _pcm.data(), (int)_pcm.size());
    if (rc != 0) {
      SetError("whisper_full failed with code " + std::to_string(rc));
      return;
    }

    // Collect segments
    int n = whisper_full_n_segments_from_state(g_state);
    std::string full;
    for (int i = 0; i < n; i++) {
      const char* seg_text = whisper_full_get_segment_text_from_state(g_state, i);
      int64_t t0 = whisper_full_get_segment_t0_from_state(g_state, i);
      int64_t t1 = whisper_full_get_segment_t1_from_state(g_state, i);
      float   no_speech = whisper_full_get_segment_no_speech_prob_from_state(g_state, i);

      if (seg_text) {
        _result.segments.push_back({ t0, t1, std::string(seg_text), 1.0f - no_speech });
        full += seg_text;
      }
    }

    // Strip whisper artifacts
    std::string cleaned;
    bool in_bracket = false;
    for (char c : full) {
      if (c == '[' || c == '(') { in_bracket = true; continue; }
      if (c == ']' || c == ')') { in_bracket = false; continue; }
      if (!in_bracket) cleaned += c;
    }
    // trim
    size_t s = cleaned.find_first_not_of(" \t\n\r");
    size_t e = cleaned.find_last_not_of(" \t\n\r");
    _result.text = (s == std::string::npos) ? "" : cleaned.substr(s, e - s + 1);

    // Language
    int lang_id = whisper_full_lang_id_from_state(g_state);
    if (lang_id >= 0) {
      const char* ls = whisper_lang_str(lang_id);
      if (ls) _result.language = ls;
    }

    // Timings (struct fields: encode_ms, decode_ms in float ms, not microseconds)
    const whisper_timings* t = whisper_get_timings(g_ctx);
    if (t) {
      _result.encode_ms = (int64_t)t->encode_ms;
      _result.decode_ms = (int64_t)t->decode_ms;
      _result.total_ms  = (int64_t)(t->encode_ms + t->decode_ms + t->sample_ms);
    }
    whisper_reset_timings(g_ctx);
  }

  void OnOK() override {
    Napi::HandleScope scope(Env());
    Napi::Object res = Napi::Object::New(Env());
    res.Set("text", Napi::String::New(Env(), _result.text));
    res.Set("language", Napi::String::New(Env(), _result.language));

    Napi::Array segs = Napi::Array::New(Env(), _result.segments.size());
    for (size_t i = 0; i < _result.segments.size(); i++) {
      auto& s = _result.segments[i];
      Napi::Object obj = Napi::Object::New(Env());
      obj.Set("t0",         Napi::Number::New(Env(), (double)s.t0));
      obj.Set("t1",         Napi::Number::New(Env(), (double)s.t1));
      obj.Set("text",       Napi::String::New(Env(), s.text));
      obj.Set("confidence", Napi::Number::New(Env(), s.confidence));
      segs[i] = obj;
    }
    res.Set("segments", segs);

    Napi::Object timings = Napi::Object::New(Env());
    timings.Set("encode_ms", Napi::Number::New(Env(), (double)_result.encode_ms));
    timings.Set("decode_ms", Napi::Number::New(Env(), (double)_result.decode_ms));
    timings.Set("total_ms",  Napi::Number::New(Env(), (double)_result.total_ms));
    res.Set("timings", timings);

    Callback().Call({ Env().Null(), res });
  }

  void OnError(const Napi::Error& e) override {
    Callback().Call({ e.Value(), Env().Undefined() });
  }

private:
  std::vector<float> _pcm;
  bool               _word_timestamps;
  std::string        _language;
  TranscribeResult   _result;
};

// ─── Transcribe ───────────────────────────────────────────────────────────────
// transcribe(buffer: Buffer, opts: object, callback: Function): void
// buffer: Int16 PCM, 16kHz mono (raw s16le bytes from ffmpeg)
Napi::Value Transcribe(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  if (info.Length() < 3 || !info[0].IsBuffer() || !info[1].IsObject() || !info[2].IsFunction()) {
    Napi::TypeError::New(env, "Expected (Buffer, Object, Function)").ThrowAsJavaScriptException();
    return env.Undefined();
  }

  auto buf = info[0].As<Napi::Buffer<int16_t>>();
  auto opts = info[1].As<Napi::Object>();
  auto cb   = info[2].As<Napi::Function>();

  // Convert int16 PCM → float32 [-1, 1]
  size_t n_samples = buf.Length();
  std::vector<float> pcm(n_samples);
  const int16_t* raw = buf.Data();
  for (size_t i = 0; i < n_samples; i++) {
    pcm[i] = (float)raw[i] / 32768.0f;
  }

  bool word_ts = false;
  std::string language = "en";
  if (opts.Has("word_timestamps") && opts.Get("word_timestamps").IsBoolean())
    word_ts = opts.Get("word_timestamps").As<Napi::Boolean>();
  if (opts.Has("language") && opts.Get("language").IsString())
    language = opts.Get("language").As<Napi::String>();

  auto* worker = new TranscribeWorker(cb, std::move(pcm), word_ts, language);
  worker->Queue();
  return env.Undefined();
}

// ─── Module init ─────────────────────────────────────────────────────────────
Napi::Object Init(Napi::Env env, Napi::Object exports) {
  exports.Set("loadModel",  Napi::Function::New(env, LoadModel));
  exports.Set("isReady",    Napi::Function::New(env, IsReady));
  exports.Set("transcribe", Napi::Function::New(env, Transcribe));
  exports.Set("dispose",    Napi::Function::New(env, Dispose));
  return exports;
}

NODE_API_MODULE(whisper_addon, Init)
