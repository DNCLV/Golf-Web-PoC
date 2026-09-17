import type { SensorSnapshot } from '../sensors/types';

export interface RecordingSample extends SensorSnapshot { recordingId: string; elapsedMs: number; }
export interface Recording { id: string; startedAt: string; samples: RecordingSample[]; }

export class Recorder {
  private active: Recording | null = null;
  private startEpochMs = 0;
  start(): Recording {
    this.startEpochMs = Date.now();
    this.active = { id: `motion-${this.startEpochMs}`, startedAt: new Date(this.startEpochMs).toISOString(), samples: [] };
    return this.active;
  }
  stop(): Recording | null { const finished = this.active; this.active = null; return finished; }
  get isRecording(): boolean { return this.active !== null; }
  get sampleCount(): number { return this.active?.samples.length ?? 0; }
  record(snapshot: SensorSnapshot): void {
    if (!this.active) return;
    this.active.samples.push({ ...snapshot, recordingId: this.active.id, elapsedMs: snapshot.epochMs - this.startEpochMs });
  }
}
