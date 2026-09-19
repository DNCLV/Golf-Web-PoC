export type ArmSwingState = 'idle' | 'countdown' | 'capturing' | 'completed';

export interface ArmSwingStatus {
  state: ArmSwingState;
  countdown: number | null;
}

interface ArmSwingFlowOptions {
  onCaptureStart: () => void;
  onCaptureEnd: () => void;
  onStatusChange: (status: ArmSwingStatus) => void;
}

/** Explicitly gates a short raw-data capture; it performs no swing analysis. */
export class ArmSwingFlow {
  private state: ArmSwingState = 'idle';
  private countdown: number | null = null;
  private countdownTimer: number | null = null;
  private captureTimer: number | null = null;
  private completedTimer: number | null = null;

  constructor(private readonly options: ArmSwingFlowOptions) {}

  arm(): boolean {
    if (this.state !== 'idle') return false;
    this.state = 'countdown';
    this.countdown = 5;
    this.emit();
    this.countdownTimer = window.setInterval(() => this.advanceCountdown(), 1000);
    return true;
  }

  private advanceCountdown(): void {
    if (this.countdown === null) return;
    if (this.countdown > 1) {
      this.countdown -= 1;
      this.emit();
      return;
    }
    this.clearCountdown();
    this.countdown = null;
    this.state = 'capturing';
    this.options.onCaptureStart();
    this.emit();
    this.captureTimer = window.setTimeout(() => this.completeCapture(), 4000);
  }

  private completeCapture(): void {
    this.captureTimer = null;
    this.options.onCaptureEnd();
    this.state = 'completed';
    this.emit();
    this.completedTimer = window.setTimeout(() => {
      this.completedTimer = null;
      this.state = 'idle';
      this.emit();
    }, 1500);
  }

  private clearCountdown(): void {
    if (this.countdownTimer !== null) window.clearInterval(this.countdownTimer);
    this.countdownTimer = null;
  }

  private emit(): void { this.options.onStatusChange({ state: this.state, countdown: this.countdown }); }
}
