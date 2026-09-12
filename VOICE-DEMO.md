# Booster bilingual voice guide

The staging website uses six prepared Arabic recordings and six English recordings, generated with the local Lady voice setup. Arabic audio approved on 2026-09-13 is preserved byte-for-byte. English recordings await owner listening review.

The existing website language switch updates every guide label, answer, text direction, and recording choice. Changing languages stops playback without automatically starting another recording. The website retains its existing saved language preference.

The hero invitation and floating launcher use a play icon, clearer bilingual copy, and a three-cycle pulse. Motion stops after use and is disabled for reduced-motion preferences. Audio starts only after a click.

All twelve MP3 recordings are embedded in voice-demo.js. Runtime playback requires no local PC, tunnel, microphone, chat API, or TTS API. Old API files and older staging notes document the previous live assistant and are not used by this guide.

Validation: Node playback and language-switch tests; English speech transcription; browser playback and desktop/mobile layout checks. Speech transcription does not prove subjective accent or voice quality.

Production remains unchanged until approval to publish there. The contact form delivery remains a separate existing configuration; this change does not enable form submission.
