import './style.css';
import { Recorder, type Recording } from './recording/Recorder';
import { downloadRecording } from './recording/csv';
import { SensorManager } from './sensors/SensorManager';
import { Calibration } from './sensors/Calibration';
import { renderApp, set, updateSnapshot, updateStatus } from './ui/app';

renderApp();
const sensors = new SensorManager(); const recorder = new Recorder(); const calibration = new Calibration(); let lastRecording: Recording | null = null; let latestSnapshot: import('./sensors/types').SensorSnapshot | null = null;
sensors.onStatus(updateStatus);
sensors.onSnapshot((snapshot) => { latestSnapshot = snapshot; recorder.record(snapshot); updateSnapshot(snapshot); if (recorder.isRecording) set('sample-count', `${recorder.sampleCount} samples`); });

document.getElementById('permission')!.addEventListener('click', async () => { await sensors.requestPermissions(); set('message', 'Sensor permission request completed. Move the phone and watch for events.'); });
document.getElementById('record')!.addEventListener('click', () => {
  const button = document.querySelector<HTMLButtonElement>('#record')!;
  if (!recorder.isRecording) { lastRecording = recorder.start(); button.textContent = 'Stop recording'; button.classList.add('active'); set('recording-state', 'Recording raw events'); set('sample-count', '0 samples'); }
  else { lastRecording = recorder.stop(); button.textContent = 'Start recording'; button.classList.remove('active'); set('recording-state', 'Stopped'); set('sample-count', `${lastRecording?.samples.length ?? 0} samples`); document.querySelector<HTMLButtonElement>('#download')!.disabled = !lastRecording?.samples.length; }
});
document.getElementById('download')!.addEventListener('click', () => { if (lastRecording) downloadRecording(lastRecording); });
document.getElementById('calibrate')!.addEventListener('click', () => { if (!latestSnapshot) { set('message', 'Await a sensor event before calibrating.'); return; } calibration.calibrate(latestSnapshot); set('message', 'Display baseline captured. Raw readings and CSV samples are never changed.'); });
document.getElementById('reset-calibration')!.addEventListener('click', () => { calibration.reset(); set('message', 'Calibration baseline cleared.'); });
