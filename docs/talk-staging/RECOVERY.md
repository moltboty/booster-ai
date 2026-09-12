# Staging recovery — 2026-09-12

Production remains on main. Do not merge without the owner's approval.

The preview returned `503 FASEE7_TTS_URL not configured` even though the Preview setting was saved. Redeploy after changing environment variables; older deployments retain their previous configuration. Retrying the preview deployment restored the voice connection.

The local server is D:\fasee7-tts\server.py, port 7865. Its health endpoint must report CUDA and default_ref_exists: true. Preview FASEE7_TTS_URL must contain the active tunnel origin, without /tts. Quick tunnel URLs change when recreated; the PC and local server must stay on.

The client aborts timed-out requests, stops audio on hangup, ignores late replies from old calls, preserves text and a visible error when speech fails, and sends each current user message once. It distinguishes preparing audio from playback. TTS verifies the upstream WAV header and has a 120-second deadline.

Chat defaults to Llama 3.3 70B with JSON mode. Optional Preview variable TALK_MODEL overrides it. A bounded arithmetic parser calculates model-proposed expressions before the final reply. Input interpretation and final wording still depend on the model. Conversation history lasts for the current call only.

Run node --test tests/talk.test.mjs. Nine regression tests cover arithmetic, cancellation, timeouts, history, structured output and upstream failures. Browser acceptance observed a fresh freestyle reply return from playback to LISTENING with no errors. A corrected arithmetic follow-up returned three hours after initially failing without the calculator. Production main stayed at 576e638.

Known limitation: local speech synthesis is slow. A longer freestyle reply took approximately 75 seconds to generate; this is not yet a low-latency voice assistant. Voice identity and pronunciation still need owner listening acceptance.

Cloudflare JSON mode reference: https://developers.cloudflare.com/workers-ai/features/json-mode/
