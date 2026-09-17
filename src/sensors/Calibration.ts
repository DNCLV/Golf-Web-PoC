import type { AngleValues, AxisValues, SensorSnapshot } from './types';

type Offsets = { acceleration: AxisValues; gravity: AxisValues; rotation: AngleValues; orientation: AngleValues };
const zeroAxes = (): AxisValues => ({ x: null, y: null, z: null });
const zeroAngles = (): AngleValues => ({ alpha: null, beta: null, gamma: null });

/** Keeps display-only offsets. It never mutates a SensorSnapshot or recording. */
export class Calibration {
  private offsets: Offsets = { acceleration: zeroAxes(), gravity: zeroAxes(), rotation: zeroAngles(), orientation: zeroAngles() };
  calibrate(snapshot: SensorSnapshot): void {
    this.offsets = { acceleration: { ...snapshot.acceleration }, gravity: { ...snapshot.accelerationIncludingGravity }, rotation: { ...snapshot.rotationRate }, orientation: { ...snapshot.orientation } };
  }
  reset(): void { this.offsets = { acceleration: zeroAxes(), gravity: zeroAxes(), rotation: zeroAngles(), orientation: zeroAngles() }; }
  get active(): boolean { return Object.values(this.offsets).some((group) => Object.values(group).some((value) => value !== null)); }
}
