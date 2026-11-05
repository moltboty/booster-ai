# Booster AI Website

Arabic-first static website with an English language switch. Existing approved copy is preserved.

## Preview

Run `python3 -m http.server 4185 --bind 127.0.0.1` and visit http://127.0.0.1:4185/.

## Review changes

- Native, user-initiated video player on the homepage, with a lightweight poster and optional English captions.
- Calmer brand surfaces, fewer decorative elements, and clearer spacing.
- Removed repeated vendor marquees; no implied vendor partnerships.
- Improved keyboard focus, mobile language switching, Escape handling and anchor offsets.
- Canonical and social sharing metadata point to https://boosterai.sa/.

## Contact

The contact form posts to `functions/api/contact.js`. Each lead goes to the Booster Sales Telegram bot and, when SMTP secrets are set, by email to info@boosterai.sa (Purelymail SMTP). The visitor sees success only if at least one channel delivered.

Cloudflare Pages secrets: `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`, `SMTP_USER`, `SMTP_PASS` (optional `SMTP_HOST`, `SMTP_PORT`, `CONTACT_TO`). A hidden `website` field traps bots.

## Video

`assets/video/booster-story.mp4` is the owner-approved corrected cut. It is an illustrative story, not a customer testimonial. The supplied Pika watermark remains. Playback is not automatic; preload is disabled. English captions are optional because the source already contains English text. The visible labels and story summary were removed at the owner’s request.

## Hosting

Production: https://boosterai.sa/ (Cloudflare Pages project `booster-ai`, deploys from `main`). www.boosterai.sa is also attached.

This review does not change hosting providers or configure a custom domain. Publishing requires merging the reviewed changes into the deployed branch.
