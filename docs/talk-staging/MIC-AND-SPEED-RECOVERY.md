# Microphone and voice latency recovery — 2026-09-12

Staging only. Production/main remains unchanged.

## Microphone recovery

The no-speech error and recognition end events previously each scheduled a restart. Competing timers could repeatedly stop and replace the recognizer. Reply failures also left recognition stopped.

The widget now owns one cancellable restart timer, ignores stale recognizer callbacks, clears retries on hangup, and reopens the microphone after a failed reply while retaining the error message. Eleven tests pass, including the restart race and a second spoken turn after failed audio.

## Local voice runtime

The local runtime uses PyTorch 2.6.0+cu124. VoxCPM optimization was requested but disabled because Triton was missing. Installed triton-windows==3.2.0.post21 in the existing Fasee7 virtual environment, matching the upstream compatibility table: https://github.com/triton-lang/triton-windows

The local server at D:/fasee7-tts/server.py now uses short compile-cache and triton-cache directories within D:/fasee7-tts. FASEE7_COMPILE=0 disables compilation for troubleshooting; default is enabled. Initial compilation took about 4.5 minutes and subsequent starts can reuse the cache.

The endpoint runs blocking inference in a worker thread, keeping health requests responsive. A generation lock rejects overlapping jobs with HTTP 429 instead of accumulating a silent queue. Generation duration is logged without recording request text.

The Lady reference, Najdi adapter, CFG 2.0, and 20 inference steps are retained. No LoRA weight merging or CPU thread override remains in the final runtime.

## Measurements

The same 110-character service answer previously needed 48.56 seconds for audio generation. After compilation, two local requests completed in 8.80 and 6.54 seconds (10.56 and 12 seconds of generated audio). A 149-character reply through staging generated audio in 8.25 seconds, with chat taking 4.01 seconds; browser playback completed and returned to listening without errors.

These are observed performance and playback checks, not proof of perceived Saudi accent or voice identity. Speech quality still needs human listening. Total delay also includes chat, network, and full-file buffering. PC and tunnel must remain available.
