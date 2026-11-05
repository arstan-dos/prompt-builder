# Speech recognition assets

The speech worker uses these locally hosted, unmodified dependencies:

- **Transformers.js 3.8.1**, Apache License 2.0. Source: https://github.com/huggingface/transformers.js . Distribution files from https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1/dist/ . License: `vendor/transformers/LICENSE`.
- **ONNX Runtime Web**, included by the Transformers.js browser distribution. MIT License. Source: https://github.com/microsoft/onnxruntime . License: `vendor/transformers/ONNX-RUNTIME-LICENSE`.
- **Whisper tiny**, MIT License, by OpenAI. Source: https://github.com/openai/whisper . ONNX conversion and quantization from https://huggingface.co/Xenova/whisper-tiny at revision `5332fcc35e32a33b86612b9a57a89be7906102b1`. License: `models/whisper-tiny/LICENSE`.

The model directory contains the quantized encoder and merged decoder, configuration, and tokenizer files. No browser speech-service API is used. Runtime and model files are downloaded from this site's own origin, and recorded audio is processed in a Web Worker on the user's device.
