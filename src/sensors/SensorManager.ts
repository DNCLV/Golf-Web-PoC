import type { AngleValues, AxisValues, SensorSnapshot, SensorStatus } from './types';

type SnapshotListener = (snapshot: SensorSnapshot) => void;
type StatusListener = (status: SensorStatus) => void;
type PermissionEvent = DeviceMotionEvent & { constructor: typeof DeviceMotionEvent & { requestPermission?: () => Promise<PermissionState> } };
type OrientationPermissionEvent = DeviceOrientationEvent & { constructor: typeof DeviceOrientationEvent & { requestPermission?: () => Promise<PermissionState> } };

const axes = (value: DeviceMotionEventAcceleration | null): AxisValues => ({
  x: value?.x ?? null, y: value?.y ?? null, z: value?.z ?? null,
});

const angles = (value: DeviceMotionEventRotationRate | null): AngleValues => ({
  alpha: value?.alpha ?? null, beta: value?.beta ?? null, gamma: value?.gamma ?? null,
});

export class SensorManager {
  private snapshotListeners = new Set<SnapshotListener>();
  private statusListeners = new Set<StatusListener>();
  private started = false;
  private readonly lastEventMsBySource: Record<SensorSnapshot['source'], number | null> = { motion: null, orientation: null };
  private readonly status: SensorStatus = {
    motionSupported: 'DeviceMotionEvent' in window,
    orientationSupported: 'DeviceOrientationEvent' in window,
    motionPermission: 'DeviceMotionEvent' in window ? 'not-required' : 'unavailable',
    orientationPermission: 'DeviceOrientationEvent' in window ? 'not-required' : 'unavailable',
    motionEvents: 0, orientationEvents: 0,
    motionObservedFrequencyHz: null, orientationObservedFrequencyHz: null,
    motionObservedIntervalMs: null, orientationObservedIntervalMs: null,
  };

  onSnapshot(listener: SnapshotListener): () => void {
    this.snapshotListeners.add(listener);
    return () => this.snapshotListeners.delete(listener);
  }

  onStatus(listener: StatusListener): () => void {
    this.statusListeners.add(listener);
    listener({ ...this.status });
    return () => this.statusListeners.delete(listener);
  }

  async requestPermissions(): Promise<void> {
    if (this.status.motionSupported) this.status.motionPermission = await this.requestMotionPermission();
    if (this.status.orientationSupported) this.status.orientationPermission = await this.requestOrientationPermission();
    this.emitStatus();
    // Either API may be denied or unsupported independently; keep the other usable stream alive.
    if (this.status.motionPermission !== 'denied' || this.status.orientationPermission !== 'denied') this.start();
  }

  start(): void {
    if (this.started) return;
    this.started = true;
    window.addEventListener('devicemotion', this.handleMotion);
    window.addEventListener('deviceorientation', this.handleOrientation);
    this.emitStatus();
  }

  private async requestMotionPermission(): Promise<SensorStatus['motionPermission']> {
    const event = DeviceMotionEvent as unknown as PermissionEvent['constructor'];
    if (!event.requestPermission) return 'not-required';
    try { return (await event.requestPermission()) === 'granted' ? 'granted' : 'denied'; } catch { return 'denied'; }
  }

  private async requestOrientationPermission(): Promise<SensorStatus['orientationPermission']> {
    const event = DeviceOrientationEvent as unknown as OrientationPermissionEvent['constructor'];
    if (!event.requestPermission) return 'not-required';
    try { return (await event.requestPermission()) === 'granted' ? 'granted' : 'denied'; } catch { return 'denied'; }
  }

  private handleMotion = (event: DeviceMotionEvent): void => {
    this.status.motionEvents += 1;
    const snapshot: SensorSnapshot = {
      timestamp: new Date().toISOString(), epochMs: Date.now(), source: 'motion',
      acceleration: axes(event.acceleration), accelerationIncludingGravity: axes(event.accelerationIncludingGravity),
      rotationRate: angles(event.rotationRate), orientation: { alpha: null, beta: null, gamma: null },
      rawEventInterval: Number.isFinite(event.interval) ? event.interval : null,
      observedIntervalMs: null, observedFrequencyHz: null,
    };
    this.receive(snapshot);
  };

  private handleOrientation = (event: DeviceOrientationEvent): void => {
    this.status.orientationEvents += 1;
    this.receive({
      timestamp: new Date().toISOString(), epochMs: Date.now(), source: 'orientation',
      acceleration: { x: null, y: null, z: null }, accelerationIncludingGravity: { x: null, y: null, z: null },
      rotationRate: { alpha: null, beta: null, gamma: null },
      orientation: { alpha: event.alpha, beta: event.beta, gamma: event.gamma },
      rawEventInterval: null, observedIntervalMs: null, observedFrequencyHz: null,
    });
  };

  private receive(snapshot: SensorSnapshot): void {
    const previousTimestamp = this.lastEventMsBySource[snapshot.source];
    if (previousTimestamp !== null) {
      const observedIntervalMs = snapshot.epochMs - previousTimestamp;
      if (observedIntervalMs > 0) {
        snapshot.observedIntervalMs = observedIntervalMs;
        snapshot.observedFrequencyHz = 1000 / observedIntervalMs;
        if (snapshot.source === 'motion') {
          this.status.motionObservedIntervalMs = observedIntervalMs;
          this.status.motionObservedFrequencyHz = snapshot.observedFrequencyHz;
        } else {
          this.status.orientationObservedIntervalMs = observedIntervalMs;
          this.status.orientationObservedFrequencyHz = snapshot.observedFrequencyHz;
        }
      }
    }
    this.lastEventMsBySource[snapshot.source] = snapshot.epochMs;
    this.snapshotListeners.forEach((listener) => listener(snapshot));
    this.emitStatus();
  }

  private emitStatus(): void { this.statusListeners.forEach((listener) => listener({ ...this.status })); }
}
