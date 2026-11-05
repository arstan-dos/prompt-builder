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
// Aggregate the entire model download instead of showing each file's own percentage.
const modelSizes = {
  'onnx/encoder_model_quantized.onnx': 10124910,
  'onnx/decoder_model_merged_quantized.onnx': 30727765,
};
const modelLoaded = new Map();
let reportedProgress = -1;
function reportProgress(event) {
  if (!(event.file in modelSizes)) return;
  if (event.status === 'progress' || event.status === 'done') {
    const size = modelSizes[event.file];
    const loaded = event.status === 'done' ? size : Math.min(event.loaded || 0, size);
    modelLoaded.set(event.file, Math.max(modelLoaded.get(event.file) || 0, loaded));
    const total = Object.values(modelSizes).reduce((a, b) => a + b, 0);
    // Reserve the last step for runtime initialization, which has no byte progress.
    const progress = Math.floor(99 * [...modelLoaded.values()].reduce((a, b) => a + b, 0) / total);
    if (progress > reportedProgress) {
      reportedProgress = progress;
      self.postMessage({ type: 'progress', progress });
    }
  }
}
async function prepare() {
  if (!loading) {
    loading = pipeline('automatic-speech-recognition', 'whisper-tiny', {
      device: 'wasm',
      dtype: 'q8',
      progress_callback: reportProgress
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
