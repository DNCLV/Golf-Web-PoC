# Golf Web PoC v0.1

## Hypothesis

Safari-accessible iPhone motion and orientation events may provide sufficiently frequent, stable raw data to observe and characterize golf-like hand/phone swings for later native-app research.

## Scope

This experiment requests device permissions explicitly, displays raw device-motion/orientation data, permits display-only baseline calibration, records each received event while manually recording, and exports CSV data.

## Non-goals

No ball physics, golf visuals, accounts, backend, multiplayer, MMR, production mobile architecture, or club-head-speed estimates. No swing-detection thresholds are defined before reviewing real recordings.

## Test methodology

Deploy over HTTPS, use iPhone Safari, grant permissions from the UI, and capture named trials: stationary baseline, slow rehearsal, normal golf-like motion, and deliberate varied motions. Note phone placement/orientation, iPhone model, iOS version, browser version, and trial intent alongside each exported file. Review event frequency, data completeness, repeatability, spikes, drift, and whether movements are distinguishable before proposing algorithms.

## Success criteria

The app loads on iPhone Safari, permissions work after an explicit tap, useful event streams arrive, every received event is represented in an exported CSV during recording, and the data is sufficient to decide whether native sensor investigation should continue. Desktop absence of APIs must be reported without failure.
