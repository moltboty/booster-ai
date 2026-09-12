# Staging environment — names only (no secrets)

Do not put keys in this repo. Set values in Cloudflare Pages **staging** project (or `wrangler pages dev`), never on production until Phase C/D is approved.

## Phase B (required)

| Name | Kind | Notes |
|------|------|-------|
| `AI` | Workers AI **binding** | Binding name must be exactly `AI`. Used by `functions/api/chat.js`. |

## Phase C (declare now, do not call yet)

| Name | Kind | Notes |
|------|------|-------|
| `FASEE7_TTS_URL` | secret / env | Tunnel or public URL of the RTX 4090 Fasee7 Lady API. |
| `FASEE7_TTS_TOKEN` | secret | Bearer / auth token for that tunnel. |

See `FASEE7_TUNNEL.md` for tunnel status. Phase B does not read these vars.

## Do not wire on staging rebuild

| Name | Why |
|------|-----|
| `SILMA_API_KEY` | Legacy production `/api/tts` (502). Client must not call SILMA. |

## Optional later (Phase D)

| Name | Kind | Notes |
|------|------|-------|
| `TALK_DEBUG` | env | Server-side debug allowlist if we stop using public `?debug=1`. |
