module.exports = {
  appId: 'ai.oceanfriends.voicetype',
  productName: 'VoiceType',
  directories: { output: 'release' },
  asar: true,
  files: [
    'src/main/**/*',
    'src/preload/**/*',
    'dist/renderer/**/*',
    'assets/**/*',
    'package.json',
    '!node_modules/@nut-tree-fork/nut-js/lib/provider/darwin/native/**',
    '!node_modules/**/test/**',
    '!node_modules/**/tests/**',
    '!node_modules/**/*.md',
    '!node_modules/**/*.map',
    '!node_modules/**/LICENSE',
    '!node_modules/**/README*',
    '!node_modules/.cache/**',
  ],
  extraResources: [
    // Native addon
    { from: 'native/build/Release/whisper_addon.node', to: 'native/whisper_addon.node' },
    // All dylibs (whisper + ggml chain) that the addon loads at runtime
    { from: 'whisper/lib/', to: 'whisper/lib/', filter: ['*.dylib'] },
    // Model is downloaded on first launch — not bundled
  ],
  mac: {
    target: [{ target: 'dmg', arch: ['arm64', 'x64'] }],
    category: 'public.app-category.productivity',
    icon: 'assets/icon.png',
    identity: null,
  },
  win: {
    target: 'nsis',
    icon: 'assets/icon.png',
  },
  nsis: {
    oneClick: false,
    allowToChangeInstallationDirectory: true,
  },
};
