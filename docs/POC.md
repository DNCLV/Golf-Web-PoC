# Golf Web PoC v0.1

## Hypothesis

Safari-accessible iPhone motion and orientation events may provide sufficiently frequent, stable raw data to observe and characterize golf-like hand/phone swings for later native-app research.

## Scope

This experiment requests device permissions explicitly, displays raw device-motion/orientation data, permits display-only baseline calibration, records each received event while manually recording, and exports CSV data.

It also offers an explicitly armed swing capture: the user initiates a five-second setup countdown, followed by a four-second raw-sample swing window. This opt-in window keeps ordinary small movements outside the armed period from being treated as shots and reduces the need for constant false-positive detection. It captures data only; it does not score or classify a swing.

## Non-goals

No ball physics, golf visuals, accounts, backend, multiplayer, MMR, production mobile architecture, or club-head-speed estimates. No swing-detection thresholds are defined before reviewing real recordings.

## Test methodology

Deploy over HTTPS, use iPhone Safari, grant permissions from the UI, and capture named trials: stationary baseline, slow rehearsal, normal golf-like motion, and deliberate varied motions. Note phone placement/orientation, iPhone model, iOS version, browser version, and trial intent alongside each exported file. Review event frequency, data completeness, repeatability, spikes, drift, and whether movements are distinguishable before proposing algorithms.

Timing analysis must distinguish raw and observed values. `rawEventInterval` is preserved exactly from the browser and has no assumed unit. `observedIntervalMs` and `observedFrequencyHz` are derived from consecutive receipt timestamps within the same stream (motion or orientation), not from interleaved events across both streams.

## Success criteria

The app loads on iPhone Safari, permissions work after an explicit tap, useful event streams arrive, every received event is represented in an exported CSV during recording, and the data is sufficient to decide whether native sensor investigation should continue. Desktop absence of APIs must be reported without failure.
