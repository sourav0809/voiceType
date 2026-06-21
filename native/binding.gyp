{
  "targets": [{
    "target_name": "whisper_addon",
    "sources": [ "addon.cpp" ],
    "include_dirs": [
      "<!@(node -p \"require('node-addon-api').include\")",
      "../whisper/include"
    ],
    "libraries": [
      "<(module_root_dir)/../whisper/lib/libwhisper.dylib"
    ],
    "cflags_cc": [ "-std=c++17", "-fexceptions" ],
    "xcode_settings": {
      "CLANG_CXX_LANGUAGE_STANDARD": "c++17",
      "GCC_ENABLE_CPP_EXCEPTIONS": "YES",
      "OTHER_LDFLAGS": [
        "-Wl,-rpath,@loader_path/../../../whisper/lib"
      ]
    },
    "defines": [ "NAPI_DISABLE_CPP_EXCEPTIONS" ]
  }]
}
