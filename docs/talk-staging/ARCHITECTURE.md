# Talk rebuild architecture (Phase B → D)

**Folder:** `staging/` only. Not production. Not `main`. No deploy from this tree.

## Unified pipeline (target)

```
user audio | typed text
    → STT (skip when typed)          [Phase B: Web Speech if present; typed always works]
    → POST /api/chat                 [Workers AI llama → strict JSON]
    → speakReply(reply_ar)           [Phase B: text stub | Phase C: Fasee7 Lady]
    → LISTENING
```

One brain. No greeting-clip bypass. No FAQ trigger router. Playbook is **bounds**, not keywords.

## State machine

`IDLE  LISTENING → TRANSCRIBING? → THINKING → SPEAKING → LISTENING`

`ERROR` from THINKING/STT/chat; recover to LISTENING if the session is still open.

| State | Phase B | Later |
|-------|---------|-------|
| IDLE | waiting | same |
| LISTENING | mic and/or typed | mic after TTS ends |
| TRANSCRIBING | STT only; typed skips | same |
| THINKING | `/api/chat` + 20s timeout | + session memory |
| SPEAKING | display `reply_ar` | play Fasee7 WAV |
| ERROR | debug + status | same + retry policy |

## Chat contract

```json
{
  "reply_ar": "…",
  "intent": "greeting|what_is|…|owner|other",
  "lead_stage": "explore|problem_clear|ready",
  "ask_next": "…",
  "cta": "none|contact_form|email",
  "confidence": 0.0,
  "safety_flags": []
}
```

Owner / founder questions **fail-closed** in the function (no LLM, no names). CTA: site form or `info@boosterai.sa`.

## Phase map
| Phase | What ships | What must not happen |
|-------|-----------|----------------------|
| **B (this folder)** | Text loop, JSON brain, `?debug=1`, state skeleton, typed + mic UI | `speechSynthesis`, `/api/tts`, clip matching, production deploy |
| **C** | Replace `speakReply` body with `fetch("/api/tts")`  `FASEE7_TTS_URL` + `FASEE7_TTS_TOKEN`; Lady only; log Content-Type + sample rate (expect ~48 kHz WAV) | Browser TTS; SILMA; assume 24 kHz Float32 |
| **D** | Persist `lead_stage`, captured fields, next-action; stuck-state timeouts; acceptance A–J on staging audio | Straight-to-`main` |

## Files

| Path | Role |
|------|------|
| `functions/api/chat.js` | Pages Function, CORS, strict JSON |
| `assets/talk/voice-demo.js` | Widget + state + debug |
| `assets/talk/voice-demo.css` | Widget + debug panel |
| Phase C later | `functions/api/tts.js` (Fasee7 proxy, not SILMA) |

## Observability

Open the widget page with `?debug=1`. Panel shows transcript, raw LLM JSON, state, `lead_stage`, latency, errors.

## Hard rules

- Arabic-first, 1-3 sentences in `reply_ar`.
- Never invent prices, clients, or founder names.
- `speakReply` is the **only** speech hook.
- 
