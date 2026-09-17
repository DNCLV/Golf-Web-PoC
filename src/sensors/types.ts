export type AxisValues = { x: number | null; y: number | null; z: number | null };
export type AngleValues = { alpha: number | null; beta: number | null; gamma: number | null };

export interface SensorSnapshot {
  timestamp: string;
  epochMs: number;
  acceleration: AxisValues;
  accelerationIncludingGravity: AxisValues;
  rotationRate: AngleValues;
  orientation: AngleValues;
  interval: number | null;
  source: 'motion' | 'orientation';
}

export interface SensorStatus {
  motionSupported: boolean;
  orientationSupported: boolean;
  motionPermission: 'not-required' | 'prompt' | 'granted' | 'denied' | 'unavailable';
  orientationPermission: 'not-required' | 'prompt' | 'granted' | 'denied' | 'unavailable';
  motionEvents: number;
  orientationEvents: number;
  frequencyHz: number | null;
}
