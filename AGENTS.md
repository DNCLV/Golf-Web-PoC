# Golf Web PoC rules

- This repository is strictly separate from Unity and the future native Motion application.
- Keep the app framework-free and dependencies minimal unless an experiment requires otherwise.
- Preserve raw sensor samples. Derived, calibrated, filtered, or analyzed data must be separate fields or structures.
- Keep sensor acquisition in `src/sensors/`, recording/export in `src/recording/`, experimental algorithm interfaces in `src/swing/`, and DOM rendering in `src/ui/`.
- Do not add swing thresholds or club-head-speed estimates without reviewing real iPhone recordings.
- Design for HTTPS iPhone Safari and graceful unsupported desktop browsers.
- Keep this a sensor experiment: do not add platform, game, backend, identity, or multiplayer features.
