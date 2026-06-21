
const {
  app,
  BrowserWindow,
  clipboard,
} = require("electron");

const fs = require("fs");
const http = require("http");

const { spawn } = require("child_process");

const {
  keyboard,
  Key,
} = require("@nut-tree-fork/nut-js");

const {
  uIOhook,
  UiohookKey,
} = require("uiohook-napi");

let recording = false;

let cmdPressed = false;
let optionPressed = false;

let ffmpegProcess = null;

function createWindow() {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
  });

  win.loadURL("https://google.com");
}

function startRecording() {

  if (recording) return;

  console.log("START RECORDING");

  ffmpegProcess = spawn("ffmpeg", [
    "-y",
    "-f",
    "avfoundation",
    "-i",
    ":0",
    "-ar",
    "16000",
    "-ac",
    "1",
    "audio.wav"
  ]);

  ffmpegProcess.on(
    "error",
    err => {
      console.log(
        "MIC ERROR:"
      );
      console.log(err);
    }
  );

  recording = true;

  console.log(
    "RECORDING STARTED"
  );
}

async function pasteText(text) {

  // SAVE CURRENT CLIPBOARD
  const oldClipboard =
    clipboard.readText();

  // SET NEW TEXT
  clipboard.writeText(text);

  // SMALL DELAY
  await new Promise(resolve =>
    setTimeout(resolve, 50)
  );

  // CMD + V
  await keyboard.pressKey(
    Key.LeftSuper
  );

  await keyboard.pressKey(
    Key.V
  );

  await keyboard.releaseKey(
    Key.V
  );

  await keyboard.releaseKey(
    Key.LeftSuper
  );

  // RESTORE OLD CLIPBOARD
  setTimeout(() => {

    clipboard.writeText(
      oldClipboard
    );

  }, 100);
}

function stopRecording() {

  if (!recording) return;

  console.log("STOP RECORDING");

  if (ffmpegProcess) {
    ffmpegProcess.kill("SIGINT");
    ffmpegProcess = null;
  }

  recording = false;

  console.log(
    "RECORDING STOPPED"
  );

  // WAIT FOR FILE WRITE
  setTimeout(async () => {

    console.log(
      "STARTING TRANSCRIPTION"
    );

    try {

      const FormData =
        require("form-data");

      const axios =
        require("axios");

      const form =
        new FormData();

      form.append(
        "file",
        fs.createReadStream(
          "audio.wav"
        )
      );

      const response =
        await axios.post(
          "http://127.0.0.1:8080/inference",
          form,
          {
            headers:
              form.getHeaders(),
          }
        );

      console.log(
        "RAW RESPONSE:"
      );

      console.log(
        response.data
      );

      const cleanedText =
        response.data.text.trim();

      console.log(
        "FINAL TEXT:"
      );

      console.log(
        cleanedText
      );

      // PASTE TEXT
      await pasteText(
        cleanedText
      );

      console.log(
        "DONE PASTING"
      );

    } catch (err) {

      console.log(
        "SERVER ERROR:"
      );

      console.log(err);
    }

  }, 1500);
}


app.whenReady().then(() => {

  console.log("APP READY");

  createWindow();

  // KEY DOWN
  uIOhook.on(
    "keydown",
    event => {

      // CMD
      if (
        event.keycode ===
        UiohookKey.Meta
      ) {
        cmdPressed = true;
      }

      // OPTION
      if (
        event.keycode ===
        UiohookKey.Alt
      ) {
        optionPressed = true;
      }

      // START RECORDING
      if (
        cmdPressed &&
        optionPressed
      ) {

        console.log(
          "HOTKEY DOWN"
        );

        startRecording();
      }
    }
  );

  // KEY UP
  uIOhook.on(
    "keyup",
    event => {

      // CMD RELEASE
      if (
        event.keycode ===
        UiohookKey.Meta
      ) {
        cmdPressed = false;
      }

      // OPTION RELEASE
      if (
        event.keycode ===
        UiohookKey.Alt
      ) {

        optionPressed = false;

        console.log(
          "HOTKEY RELEASE"
        );

        stopRecording();
      }
    }
  );

  uIOhook.start();

  console.log(
    "uIOhook started"
  );
});

app.on("will-quit", () => {
  uIOhook.stop();
});
