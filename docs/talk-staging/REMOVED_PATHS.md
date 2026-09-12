# Legacy paths to delete (after staging replaces production)

These still exist on `main` / live `boosterai.sa`. Phase B staging does **not** include them. When production is cut over (explicit approval only), remove:

## Browser TTS (policy violation)

| Path | Where |
|------|--------|
| `window.speechSynthesis` | `assets/talk/voice-demo.js` (`stopAudio`, `speakArabicFreestyle`, voice warm-up on `DOMContentLoaded`) |
| `speechSynthesis.speak` / `.cancel` / `.getVoices` | same |
| `SpeechSynthesisUtterance` | `speakArabicFreestyle` |
| `pickArabicVoice()` | `voice-demo.js` |
| `speakArabicFreestyle()` | `voice-demo.js` |

## SILMA TTS client / proxy (dead + unused by widget)

| Path | Where |
|------|--------|
| `functions/api/tts.js` | SILMA `https://api.silma.ai/tts/v2/stream` proxy, Float32→WAV 24 kHz |
| `SILMA_API_KEY` | Cloudflare Pages env |
| Any future `fetch("/api/tts")` pointed at SILMA | do not revive; Phase C is Fasee7 |

## Dual greeting-only clip brain

| Path | Where |
|------|--------|
| Greeting fast-path `greetIds` + `matchShowcase(said)` | `voice-demo.js` `onresult` |
| `playShowcaseClip` / `playBuffer` / `decodedCache` | `voice-demo.js` |
| `matchClipByReply` (LLM text ≈ canned script) | `voice-demo.js` |
| `loadShowcase` / `assets/talk/showcase.json` as a **router** | trigger lists |
| `loadClipTexts` / `assets/talk/clips-text.json` | reply-to-clip match |
| `getClipById("fallback_discovery")` last-resort audio | wrong-content fallback |
| Prerecorded `greeting_*.wav` as the only working Lady path | `assets/talk/greeting_salam.wav` etc. |

Clips may stay as **assets** until Fasee7 is proven; they must not remain a **decision path**.

## Ad-hoc session flags (replaced by state machine)

| Path | Where |
|------|--------|
| `busy` + `sessionActive` only (no IDLE/LISTENING/…) | `voice-demo.js` |
| `catch (_)` swallowing turn errors | `onresult` |
| No `?debug=1` observability | missing |

## Do not carry forward

- Plain chat `{ reply, model }` — replaced by the seven-field JSON contract.
- Audio-only CSS that hides transcript/reply (`.voice-demo--audio-only`).
- Connect/hangup oscillator tones as a substitute for speech (Phase B is text; Phase C is Lady TTS).
- 
