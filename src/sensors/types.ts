export type AxisValues = { x: number | null; y: number | null; z: number | null };
export type AngleValues = { alpha: number | null; beta: number | null; gamma: number | null };

export interface SensorSnapshot {
  timestamp: string;
  epochMs: number;
  acceleration: AxisValues;
  accelerationIncludingGravity: AxisValues;
  rotationRate: AngleValues;
  orientation: AngleValues;
  /** Browser-provided DeviceMotionEvent.interval; its unit/meaning is browser-defined. */
  rawEventInterval: number | null;
  /** Derived from consecutive received timestamps for the same sensor stream. */
  observedIntervalMs: number | null;
  /** Derived from observedIntervalMs; never supplied by the browser. */
  observedFrequencyHz: number | null;
  source: 'motion' | 'orientation';
}

export interface SensorStatus {
  motionSupported: boolean;
  orientationSupported: boolean;
  motionPermission: 'not-required' | 'prompt' | 'granted' | 'denied' | 'unavailable';
  orientationPermission: 'not-required' | 'prompt' | 'granted' | 'denied' | 'unavailable';
  motionEvents: number;
  orientationEvents: number;
  motionObservedFrequencyHz: number | null;
  orientationObservedFrequencyHz: number | null;
  motionObservedIntervalMs: number | null;
  orientationObservedIntervalMs: number | null;
}
