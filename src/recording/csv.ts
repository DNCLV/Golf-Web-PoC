import type { Recording } from './Recorder';

const headers = ['recordingId','timestamp','elapsedMs','source','accelerationX','accelerationY','accelerationZ','accelerationIncludingGravityX','accelerationIncludingGravityY','accelerationIncludingGravityZ','rotationAlpha','rotationBeta','rotationGamma','orientationAlpha','orientationBeta','orientationGamma','rawEventInterval','observedIntervalMs','observedFrequencyHz'];
const value = (item: number | string | null): string => item === null ? '' : String(item);
const escape = (item: string): string => `"${item.replaceAll('"', '""')}"`;

export function recordingToCsv(recording: Recording): string {
  const rows = recording.samples.map((s) => [s.recordingId, s.timestamp, s.elapsedMs, s.source, s.acceleration.x, s.acceleration.y, s.acceleration.z, s.accelerationIncludingGravity.x, s.accelerationIncludingGravity.y, s.accelerationIncludingGravity.z, s.rotationRate.alpha, s.rotationRate.beta, s.rotationRate.gamma, s.orientation.alpha, s.orientation.beta, s.orientation.gamma, s.rawEventInterval, s.observedIntervalMs, s.observedFrequencyHz].map(value).map(escape).join(','));
  return [headers.join(','), ...rows].join('\r\n');
}

export function downloadRecording(recording: Recording): void {
  const blob = new Blob([recordingToCsv(recording)], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob); const link = document.createElement('a');
  link.href = url; link.download = `${recording.id}.csv`; link.click(); URL.revokeObjectURL(url);
}
