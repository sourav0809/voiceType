Clearing App Data
There's no built-in clear storage button yet. To manually clear everything right now:

macOS:

# Settings (electron-store)

rm ~/Library/Application\ Support/voicetype/voicetype-settings.json

# Temp audio

rm ~/Library/Application\ Support/voicetype/recording.wav

# Full wipe (resets onboarding too)

rm -rf ~/Library/Application\ Support/voicetype/
