import type { Recording, RecordingSample } from '../recording/Recorder';

export interface SwingAnalysisConfig {
  smoothingWindowSamples: number;
  baselineQuantile: number;
  accelerationActivityScale: number;
  rotationActivityScale: number;
  accelerationWeight: number;
  rotationWeight: number;
  activityScoreThreshold: number;
  quietSamplesToEndRegion: number;
  minimumRegionSamples: number;
  minimumJointAccelerationActivity: number;
  minimumJointRotationActivity: number;
  minimumStrongPeakScore: number;
  minimumStrongPeakActiveDurationMs: number;
  minimumStrongPeakJointDurationMs: number;
  minimumSustainedPeakScore: number;
  minimumSustainedActiveDurationMs: number;
  minimumSustainedJointDurationMs: number;
  minimumSustainedActivityEnergy: number;
}

/** First-pass settings only. Tune against a varied collection of iPhone recordings. */
export const defaultSwingAnalysisConfig: SwingAnalysisConfig = {
  smoothingWindowSamples: 5,
  baselineQuantile: 0.25,
  accelerationActivityScale: 3,
  rotationActivityScale: 80,
  accelerationWeight: 1,
  rotationWeight: 0.7,
  activityScoreThreshold: 0.35,
  quietSamplesToEndRegion: 3,
  minimumRegionSamples: 6,
  minimumJointAccelerationActivity: 0.15,
  minimumJointRotationActivity: 0.12,
  minimumStrongPeakScore: 1.5,
  minimumStrongPeakActiveDurationMs: 180,
  minimumStrongPeakJointDurationMs: 80,
  minimumSustainedPeakScore: 0.65,
  minimumSustainedActiveDurationMs: 500,
  minimumSustainedJointDurationMs: 250,
  minimumSustainedActivityEnergy: 0.45,
};

export interface MotionFeature {
  elapsedMs: number;
  accelerationMagnitude: number | null;
  rotationMagnitude: number | null;
  smoothedAcceleration: number | null;
  smoothedRotation: number | null;
  accelerationActivity: number | null;
  rotationActivity: number | null;
  activityScore: number | null;
}

export type SwingDetectionMode = 'strong-peak' | 'sustained-swing' | 'rejected';

export interface SwingAnalysisResult {
  detected: boolean;
  startElapsedMs: number | null;
  peakElapsedMs: number | null;
  endElapsedMs: number | null;
  durationMs: number | null;
  peakAcceleration: number | null;
  peakRotation: number | null;
  motionSampleCount: number;
  peakActivityScore: number | null;
  activityEnergy: number | null;
  activeDurationMs: number | null;
  detectionMode: SwingDetectionMode;
  detectionReason: string;
}

const emptyResult = (motionSampleCount: number, reason: string, peakActivityScore: number | null = null): SwingAnalysisResult => ({
  detected: false, startElapsedMs: null, peakElapsedMs: null, endElapsedMs: null,
  durationMs: null, peakAcceleration: null, peakRotation: null, motionSampleCount,
  peakActivityScore, activityEnergy: null, activeDurationMs: null, detectionMode: 'rejected', detectionReason: reason,
});

const magnitude = (...values: Array<number | null>): number | null => values.some((value) => value === null) ? null : Math.hypot(...values as number[]);
const median = (values: number[]): number => { const sorted = [...values].sort((a, b) => a - b); const middle = Math.floor(sorted.length / 2); return sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle]; };
const quantile = (values: number[], fraction: number): number => { const sorted = [...values].sort((a, b) => a - b); return sorted[Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * fraction))]; };
export const smoothValues = (values: number[], windowSize: number): number[] => values.map((_, index) => { const start = Math.max(0, index - Math.floor(windowSize / 2)); const end = Math.min(values.length, index + Math.ceil(windowSize / 2)); return values.slice(start, end).reduce((sum, value) => sum + value, 0) / (end - start); });

/** Finds activity boundaries around a peak, requiring a sustained quiet run to end either side. */
export function findActivityRegion(scores: number[], peakIndex: number, config: Pick<SwingAnalysisConfig, 'activityScoreThreshold' | 'quietSamplesToEndRegion'>): { startIndex: number; endIndex: number } {
  let startIndex = 0; let quiet = 0;
  for (let index = peakIndex - 1; index >= 0; index -= 1) { quiet = scores[index] <= config.activityScoreThreshold ? quiet + 1 : 0; if (quiet >= config.quietSamplesToEndRegion) { startIndex = index + config.quietSamplesToEndRegion; break; } }
  let endIndex = scores.length - 1; quiet = 0;
  for (let index = peakIndex + 1; index < scores.length; index += 1) { quiet = scores[index] <= config.activityScoreThreshold ? quiet + 1 : 0; if (quiet >= config.quietSamplesToEndRegion) { endIndex = index - config.quietSamplesToEndRegion; break; } }
  return { startIndex, endIndex };
}

/** Time-integrates sample activity using actual sample timestamps. Units are normalized-score seconds. */
export function calculateActivityEnergy(features: MotionFeature[]): number {
  return features.slice(0, -1).reduce((energy, feature, index) => {
    const score = feature.activityScore ?? 0; const nextScore = features[index + 1].activityScore ?? 0;
    return energy + ((score + nextScore) / 2) * Math.max(0, features[index + 1].elapsedMs - feature.elapsedMs) / 1000;
  }, 0);
}

export function calculateActiveDurations(features: MotionFeature[], config: Pick<SwingAnalysisConfig, 'activityScoreThreshold' | 'minimumJointAccelerationActivity' | 'minimumJointRotationActivity'>): { activeDurationMs: number; jointDurationMs: number } {
  return features.slice(0, -1).reduce((durations, feature, index) => {
    const elapsedMs = Math.max(0, features[index + 1].elapsedMs - feature.elapsedMs);
    if ((feature.activityScore ?? 0) >= config.activityScoreThreshold) durations.activeDurationMs += elapsedMs;
    if ((feature.accelerationActivity ?? 0) >= config.minimumJointAccelerationActivity && (feature.rotationActivity ?? 0) >= config.minimumJointRotationActivity) durations.jointDurationMs += elapsedMs;
    return durations;
  }, { activeDurationMs: 0, jointDurationMs: 0 });
}

/** Pure heuristic analysis of one completed armed recording; it never mutates samples. */
export function analyzeSwing(recording: Recording, config: SwingAnalysisConfig = defaultSwingAnalysisConfig): SwingAnalysisResult {
  const motionSamples = recording.samples.filter((sample) => sample.source === 'motion');
  const features: MotionFeature[] = motionSamples.map((sample: RecordingSample) => ({ elapsedMs: sample.elapsedMs, accelerationMagnitude: magnitude(sample.acceleration.x, sample.acceleration.y, sample.acceleration.z), rotationMagnitude: magnitude(sample.rotationRate.alpha, sample.rotationRate.beta, sample.rotationRate.gamma), smoothedAcceleration: null, smoothedRotation: null, accelerationActivity: null, rotationActivity: null, activityScore: null }));
  const valid = features.filter((feature) => feature.accelerationMagnitude !== null && feature.rotationMagnitude !== null);
  if (valid.length < config.minimumRegionSamples) return emptyResult(motionSamples.length, 'insufficient valid motion samples');

  const acceleration = smoothValues(valid.map((feature) => feature.accelerationMagnitude!), config.smoothingWindowSamples);
  const rotation = smoothValues(valid.map((feature) => feature.rotationMagnitude!), config.smoothingWindowSamples);
  const accelerationBaseline = median(acceleration.filter((value) => value <= quantile(acceleration, config.baselineQuantile)));
  const rotationBaseline = median(rotation.filter((value) => value <= quantile(rotation, config.baselineQuantile)));
  const scores = acceleration.map((value, index) => {
    const accelerationActivity = Math.max(0, value - accelerationBaseline) / config.accelerationActivityScale;
    const rotationActivity = Math.max(0, rotation[index] - rotationBaseline) / config.rotationActivityScale;
    valid[index].smoothedAcceleration = value; valid[index].smoothedRotation = rotation[index]; valid[index].accelerationActivity = accelerationActivity; valid[index].rotationActivity = rotationActivity;
    return valid[index].activityScore = config.accelerationWeight * accelerationActivity + config.rotationWeight * rotationActivity;
  });
  const peakIndex = scores.reduce((best, score, index) => score > scores[best] ? index : best, 0);
  const peakActivityScore = scores[peakIndex]; const { startIndex, endIndex } = findActivityRegion(scores, peakIndex, config);
  if (endIndex - startIndex + 1 < config.minimumRegionSamples) return emptyResult(motionSamples.length, 'activity region is too short', peakActivityScore);

  const region = valid.slice(startIndex, endIndex + 1); const durationMs = region[region.length - 1].elapsedMs - region[0].elapsedMs;
  const activityEnergy = calculateActivityEnergy(region); const { activeDurationMs, jointDurationMs } = calculateActiveDurations(region, config);
  const strongPeak = peakActivityScore >= config.minimumStrongPeakScore && activeDurationMs >= config.minimumStrongPeakActiveDurationMs && jointDurationMs >= config.minimumStrongPeakJointDurationMs;
  const sustainedSwing = peakActivityScore >= config.minimumSustainedPeakScore && activeDurationMs >= config.minimumSustainedActiveDurationMs && jointDurationMs >= config.minimumSustainedJointDurationMs && activityEnergy >= config.minimumSustainedActivityEnergy;
  if (!strongPeak && !sustainedSwing) return { ...emptyResult(motionSamples.length, 'activity did not meet strong-peak or sustained-swing requirements', peakActivityScore), activityEnergy, activeDurationMs };

  return {
    detected: true, startElapsedMs: region[0].elapsedMs, peakElapsedMs: valid[peakIndex].elapsedMs, endElapsedMs: region[region.length - 1].elapsedMs, durationMs,
    peakAcceleration: Math.max(...region.map((feature) => feature.accelerationMagnitude!)), peakRotation: Math.max(...region.map((feature) => feature.rotationMagnitude!)), motionSampleCount: motionSamples.length,
    peakActivityScore, activityEnergy, activeDurationMs, detectionMode: strongPeak ? 'strong-peak' : 'sustained-swing', detectionReason: strongPeak ? 'high combined peak with sustained joint activity' : 'sustained joint acceleration and rotation activity',
  };
}
