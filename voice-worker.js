// All runtime and model files are hosted with the site; audio never leaves this worker.
import { pipeline, env } from './vendor/transformers/transformers.min.js';

env.allowRemoteModels = false;
env.allowLocalModels = true;
env.localModelPath = new URL('./models/', import.meta.url).href;
env.backends.onnx.wasm.wasmPaths = new URL('./vendor/transformers/', import.meta.url).href;
// GitHub Pages has no cross-origin isolation headers. One WASM thread works without them.
env.backends.onnx.wasm.numThreads = 1;
env.backends.onnx.wasm.proxy = false;

let transcriber;
let loading;
async function prepare() {
  if (!loading) {
    loading = pipeline('automatic-speech-recognition', 'whisper-tiny', {
      device: 'wasm',
      dtype: 'q8',
      progress_callback: progress => {
        if (progress.status === 'progress') {
          self.postMessage({ type: 'progress', file: progress.file, progress: progress.progress });
        }
      }
    }).then(result => { transcriber = result; });
  }
  await loading;
}

self.onmessage = async ({ data }) => {
  try {
    await prepare();
    if (data.type === 'prepare') {
      self.postMessage({ type: 'ready' });
    } else if (data.type === 'transcribe') {
      const result = await transcriber(data.audio, {
        language: data.language,
        task: 'transcribe',
        chunk_length_s: 30,
        stride_length_s: 5,
        return_timestamps: false,
      });
      self.postMessage({ type: 'result', id: data.id, text: result.text });
    }
  } catch (error) {
    self.postMessage({ type: 'error', id: data.id, message: String(error.message || error) });
  }
};
