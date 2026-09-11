# Website voice demo

Stack:
1. Ears = browser speech recognition (Chrome/Edge, mic permission)
2. Brain = Cloudflare Workers AI (`/api/chat`, Llama 3.1 8B) + Booster Saudi sales playbook
3. Mouth = SILMA Saudi TTS (`/api/tts`, needs `SILMA_API_KEY`)

## Cloudflare setup
1. Pages project → Settings → Bindings → Add **Workers AI** → Variable name: `AI` (Production + Preview)
2. Env secret already: `SILMA_API_KEY`
3. Redeploy after adding the AI binding

## Notes
- Cheapest brain path (free daily neuron quota on Cloudflare). If dialect quality is weak, upgrade to Gemini Flash-Lite.
- Keep replies short for TTS (chat caps ~220 tokens; TTS truncates to 250 chars).
