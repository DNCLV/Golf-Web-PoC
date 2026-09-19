import type { Recording, RecordingSample } from '../recording/Recorder';

export interface SwingAnalysisConfig { smoothingWindowSamples: number; baselineQuantile: number; accelerationActivityScale: number; rotationActivityScale: number; accelerationWeight: number; rotationWeight: number; minimumPeakScore: number; activityScoreThreshold: number; quietSamplesToEndRegion: number; minimumRegionSamples: number; }
/** First-pass settings only. Tune against a varied collection of iPhone recordings. */
export const defaultSwingAnalysisConfig: SwingAnalysisConfig = { smoothingWindowSamples: 5, baselineQuantile: 0.25, accelerationActivityScale: 3, rotationActivityScale: 80, accelerationWeight: 1, rotationWeight: 0.7, minimumPeakScore: 1.5, activityScoreThreshold: 0.35, quietSamplesToEndRegion: 3, minimumRegionSamples: 6 };
export interface MotionFeature { elapsedMs: number; accelerationMagnitude: number | null; rotationMagnitude: number | null; smoothedAcceleration: number | null; smoothedRotation: number | null; activityScore: number | null; }
export interface SwingAnalysisResult { detected: boolean; startElapsedMs: number | null; peakElapsedMs: number | null; endElapsedMs: number | null; durationMs: number | null; peakAcceleration: number | null; peakRotation: number | null; motionSampleCount: number; }
const emptyResult = (motionSampleCount: number): SwingAnalysisResult => ({ detected: false, startElapsedMs: null, peakElapsedMs: null, endElapsedMs: null, durationMs: null, peakAcceleration: null, peakRotation: null, motionSampleCount });
const magnitude = (...values: Array<number | null>): number | null => values.some((value) => value === null) ? null : Math.hypot(...values as number[]);
const median = (values: number[]): number => { const sorted = [...values].sort((a, b) => a - b); const middle = Math.floor(sorted.length / 2); return sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle]; };
const quantile = (values: number[], fraction: number): number => { const sorted = [...values].sort((a, b) => a - b); return sorted[Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * fraction))]; };
const smooth = (values: number[], windowSize: number): number[] => values.map((_, index) => { const start = Math.max(0, index - Math.floor(windowSize / 2)); const end = Math.min(values.length, index + Math.ceil(windowSize / 2)); return values.slice(start, end).reduce((sum, value) => sum + value, 0) / (end - start); });

/** Pure heuristic analysis of one completed armed recording; it never mutates samples. */
export function analyzeSwing(recording: Recording, config: SwingAnalysisConfig = defaultSwingAnalysisConfig): SwingAnalysisResult {
  const motionSamples = recording.samples.filter((sample) => sample.source === 'motion');
  const features: MotionFeature[] = motionSamples.map((sample: RecordingSample) => ({ elapsedMs: sample.elapsedMs, accelerationMagnitude: magnitude(sample.acceleration.x, sample.acceleration.y, sample.acceleration.z), rotationMagnitude: magnitude(sample.rotationRate.alpha, sample.rotationRate.beta, sample.rotationRate.gamma), smoothedAcceleration: null, smoothedRotation: null, activityScore: null }));
  const valid = features.filter((feature) => feature.accelerationMagnitude !== null && feature.rotationMagnitude !== null);
  if (valid.length < config.minimumRegionSamples) return emptyResult(motionSamples.length);
  const acceleration = smooth(valid.map((feature) => feature.accelerationMagnitude!), config.smoothingWindowSamples);
  const rotation = smooth(valid.map((feature) => feature.rotationMagnitude!), config.smoothingWindowSamples);
  const accelerationBaseline = median(acceleration.filter((value) => value <= quantile(acceleration, config.baselineQuantile)));
  const rotationBaseline = median(rotation.filter((value) => value <= quantile(rotation, config.baselineQuantile)));
  const scores = acceleration.map((value, index) => { valid[index].smoothedAcceleration = value; valid[index].smoothedRotation = rotation[index]; const score = config.accelerationWeight * Math.max(0, value - accelerationBaseline) / config.accelerationActivityScale + config.rotationWeight * Math.max(0, rotation[index] - rotationBaseline) / config.rotationActivityScale; valid[index].activityScore = score; return score; });
  const peakIndex = scores.reduce((best, score, index) => score > scores[best] ? index : best, 0);
  if (scores[peakIndex] < config.minimumPeakScore) return emptyResult(motionSamples.length);
  let startIndex = 0; let quiet = 0;
  for (let index = peakIndex - 1; index >= 0; index -= 1) { quiet = scores[index] <= config.activityScoreThreshold ? quiet + 1 : 0; if (quiet >= config.quietSamplesToEndRegion) { startIndex = index + config.quietSamplesToEndRegion; break; } }
  let endIndex = valid.length - 1; quiet = 0;
  for (let index = peakIndex + 1; index < valid.length; index += 1) { quiet = scores[index] <= config.activityScoreThreshold ? quiet + 1 : 0; if (quiet >= config.quietSamplesToEndRegion) { endIndex = index - config.quietSamplesToEndRegion; break; } }
  if (endIndex - startIndex + 1 < config.minimumRegionSamples) return emptyResult(motionSamples.length);
  const region = valid.slice(startIndex, endIndex + 1);
  return { detected: true, startElapsedMs: region[0].elapsedMs, peakElapsedMs: valid[peakIndex].elapsedMs, endElapsedMs: region[region.length - 1].elapsedMs, durationMs: region[region.length - 1].elapsedMs - region[0].elapsedMs, peakAcceleration: Math.max(...region.map((feature) => feature.accelerationMagnitude!)), peakRotation: Math.max(...region.map((feature) => feature.rotationMagnitude!)), motionSampleCount: motionSamples.length };
}
