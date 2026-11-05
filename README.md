# 🚀 AI Prompt Builder

**Turn rough ideas into clear, structured prompts that get noticeably better answers from any AI.**

👉 **[Try it live — no signup, no install](https://arstan-dos.github.io/prompt-builder/)**

---

Vague prompts get vague answers. **AI Prompt Builder** walks you through four simple fields — **Context · Task · Conditions & constraints · Response format** — and assembles them into a clean, well-structured prompt you can paste straight into ChatGPT, Claude, Gemini, or any other model.

I built it to make my own everyday prompts dramatically sharper — and I genuinely use it every day. It’s not tied to any one job: it works for **anyone who works with AI** — engineers, designers, project managers, marketers, founders, students, writers.

---

## ✨ Features

- 🧩 **Structured builder** — four guided fields turn a fuzzy idea into a precise prompt
- 🎙️ **Voice input** — dictate into any of the four fields or the final prompt, using the interface language
- 🧠 **Enhance** — one click adds depth, alternatives, and risk-checks to your request
- 📋 **One-click copy** — clean text, ready to paste anywhere
- 🕘 **History** — your last 5 prompts are saved and reusable
- 🌍 **6 languages** — English, Русский, Қазақша, Español, 中文, Português (interface *and* the generated prompt)
- 🌙 **Light & dark theme** — auto-detects your system, remembers your choice
- ↶ **Undo / Ctrl+Z** — never lose your work to an accidental click
- 🔒 **Local text storage** — prompts stay in your browser. No account or app backend. Optional voice input runs locally on your device; audio is never uploaded.

---

## 🚀 How to use

1. Open the **[live tool](https://arstan-dos.github.io/prompt-builder/)**
2. Fill in **Context, Task, Conditions, Format** (an example is shown under each field)
3. Click **🚀 Build prompt**
4. *(Optional)* Click **🧠 Enhance** to make it stronger
5. Click **📋 Copy** and paste into your favorite AI

No installation. No sign-up. Works on desktop and mobile.

---

## 🛠️ Tech

Plain HTML, CSS, and JavaScript in `index.html`, with a speech worker and self-hosted recognition assets. No frameworks, no build step, no backend. Your data is stored locally with the browser’s `localStorage`. Hosted free on GitHub Pages.

---

⭐ If it helps you, give the repo a star — it helps others find it too!

## Voice input

Click **Dictate**, allow microphone access, speak, and click **Stop**. Text appears after processing and is appended to the selected field. It is saved locally and supports Undo. The interface language selects the recognition language. Each recording is limited to two minutes. You can cancel processing or switch fields without late results changing the form.

The first use downloads roughly 65 MB of recognition files from this same site and can take a few minutes. A single progress bar covers the model download without resetting for each file; runtime setup and transcription follow. Wait for the text to appear. Files are cached by the browser when available. Recording can start while the model loads. Switching away from the tab stops the microphone and continues processing the recorded speech in the background; leaving the page cancels it. Audio is processed on your device and is never uploaded. No API key, speech service, account, or backend is needed. HTTPS (or localhost), microphone permission, MediaRecorder, Web Workers, and WebAssembly are required. Initial setup and processing speed depend on the connection and device. Short, clear phrases work best; review the transcript for recognition errors.

### Speech dependencies

- Transformers.js 3.8.1 (Apache-2.0), in `vendor/transformers/`.
- ONNX Runtime Web bundled with Transformers.js (MIT).
- Whisper tiny quantized ONNX weights from `Xenova/whisper-tiny`, revision `5332fcc35e32a33b86612b9a57a89be7906102b1` (MIT), in `models/whisper-tiny/`.

All runtime and model requests use same-origin URLs. WASM uses one thread so GitHub Pages does not need cross-origin isolation headers. Third-party licenses and asset provenance are in `THIRD_PARTY_NOTICES.md` and beside the assets.

### Voice regression check

The optional developer test needs Node.js and Playwright (`npm install --no-save --package-lock=false playwright`, then `npx playwright install chromium`). Run `node tests/voice-input.cjs`. Set `VOICE_TEST_CHANNEL=msedge` to use an installed Edge instead of Playwright Chromium.

The test passes a Russian WAV fixture through a fake microphone into the real MediaRecorder and local Whisper model, then checks the transcript, persistence, undo, cancellation, permission errors, failed model loading, retries, field switching, translations, mobile width, and absence of third-party network requests. The fixture was generated with Microsoft Irina TTS: “Мне нужно разработать красивый и удобный сайт для архитектурного проекта.” It contains no personal recording.
