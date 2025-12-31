# Models

## Whisper.cpp (STT)
- Model files under `/opt/models/whisper/`
- Configure in `configs/*.yaml` `stt.whispercpp.modelPath`

## Piper (TTS)
- Voice models under `/opt/models/piper/`
- Configure in `configs/*.yaml` `tts.piper.voicePath`

## Llama.cpp (LLM)
- GGUF models under `/opt/models/llama/`
- Configure in `configs/*.yaml` `llm.local.modelPath`
- Start llama-server with:
  - `/usr/local/bin/llama-server -m /opt/models/llama/llama-3.gguf -c 2048`
