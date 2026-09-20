import './style.css';
import { Recorder, type Recording } from './recording/Recorder';
import { downloadRecording } from './recording/csv';
import { SensorManager } from './sensors/SensorManager';
import { Calibration } from './sensors/Calibration';
import { ArmSwingFlow, type ArmSwingStatus } from './swing/ArmSwingFlow';
import { analyzeSwing, type SwingAnalysisResult } from './swing/SwingAnalyzer';
import { renderApp, set, updateArmSwing, updateSnapshot, updateStatus, updateSwingAnalysis } from './ui/app';

renderApp();
const sensors = new SensorManager(); const recorder = new Recorder(); const calibration = new Calibration(); let lastRecording: Recording | null = null; let latestSnapshot: import('./sensors/types').SensorSnapshot | null = null; let armStatus: ArmSwingStatus = { state: 'idle', countdown: null }; let armedCaptureHasData: boolean | null = null; let swingAnalysis: SwingAnalysisResult | null = null;
const refreshArmSwing = (): void => { updateArmSwing(armStatus, recorder.isRecording && armStatus.state === 'idle', armedCaptureHasData); updateSwingAnalysis(swingAnalysis); };
const armSwing = new ArmSwingFlow({
  onCaptureStart: () => { armedCaptureHasData = null; swingAnalysis = null; lastRecording = recorder.start(); refreshArmSwing(); set('recording-state', 'Armed swing capture'); set('sample-count', '0 samples'); },
  onCaptureEnd: () => {
    lastRecording = recorder.stop();
    armedCaptureHasData = Boolean(lastRecording?.samples.length);
    set('recording-state', armedCaptureHasData ? 'Swing capture stopped' : 'No sensor data captured');
    set('sample-count', `${lastRecording?.samples.length ?? 0} samples`);
    document.querySelector<HTMLButtonElement>('#download')!.disabled = !armedCaptureHasData;
    if (!armedCaptureHasData) set('message', 'No sensor data captured. Enable motion sensors first.');
    else { swingAnalysis = analyzeSwing(lastRecording!); refreshArmSwing(); if (!swingAnalysis.detected) set('message', 'No swing detected'); }
  },
  onStatusChange: (status) => { armStatus = status; refreshArmSwing(); },
});
refreshArmSwing();
sensors.onStatus(updateStatus);
sensors.onSnapshot((snapshot) => { latestSnapshot = snapshot; recorder.record(snapshot); updateSnapshot(snapshot); if (recorder.isRecording) set('sample-count', `${recorder.sampleCount} samples`); });

document.getElementById('permission')!.addEventListener('click', async () => { await sensors.requestPermissions(); set('message', 'Sensor permission request completed. Move the phone and watch for events.'); });
document.getElementById('record')!.addEventListener('click', () => {
  if (armStatus.state !== 'idle') return;
  const button = document.querySelector<HTMLButtonElement>('#record')!;
  if (!recorder.isRecording) { lastRecording = recorder.start(); button.textContent = 'Stop recording'; button.classList.add('active'); set('recording-state', 'Recording raw events'); set('sample-count', '0 samples'); refreshArmSwing(); }
  else { lastRecording = recorder.stop(); button.textContent = 'Start recording'; button.classList.remove('active'); set('recording-state', 'Stopped'); set('sample-count', `${lastRecording?.samples.length ?? 0} samples`); document.querySelector<HTMLButtonElement>('#download')!.disabled = !lastRecording?.samples.length; refreshArmSwing(); }
});
document.getElementById('arm-swing')!.addEventListener('click', () => { armSwing.arm(); });
document.getElementById('download')!.addEventListener('click', () => { if (lastRecording) downloadRecording(lastRecording); });
document.getElementById('calibrate')!.addEventListener('click', () => { if (!latestSnapshot) { set('message', 'Await a sensor event before calibrating.'); return; } calibration.calibrate(latestSnapshot); set('message', 'Display baseline captured. Raw readings and CSV samples are never changed.'); });
document.getElementById('reset-calibration')!.addEventListener('click', () => { calibration.reset(); set('message', 'Calibration baseline cleared.'); });
