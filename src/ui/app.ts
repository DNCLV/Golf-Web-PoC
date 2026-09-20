import type { AxisValues, AngleValues, SensorSnapshot, SensorStatus } from '../sensors/types';
import type { ArmSwingStatus } from '../swing/ArmSwingFlow';
import type { SwingAnalysisResult } from '../swing/SwingAnalyzer';

const number = (value: number | null): string => value === null ? '—' : value.toFixed(3);
const values = (v: AxisValues | AngleValues): string => Object.entries(v).map(([key, value]) => `<span><b>${key}</b>${number(value)}</span>`).join('');

export function renderApp(): void {
  document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
    <header><p class="eyebrow">Motion · Golf Web PoC</p><h1>Sensor laboratory</h1><p>Capture raw iPhone motion data. This is not swing scoring.</p></header>
    <section class="actions"><button id="permission" class="primary">Enable motion sensors</button><button id="calibrate">Calibrate display</button><button id="reset-calibration">Reset calibration</button></section>
    <section class="status" aria-label="Sensor status"><div><b>Motion</b><span id="motion-status">checking</span></div><div><b>Orientation</b><span id="orientation-status">checking</span></div><div><b>Motion observed</b><span id="motion-timing">—</span></div><div><b>Orientation observed</b><span id="orientation-timing">—</span></div></section>
    <section class="arm-swing" aria-label="Arm a golf swing"><p class="eyebrow">Wii Sports-style capture</p><strong id="swing-state">Ready to arm a swing</strong><p id="swing-detail">Start when you are ready for a five-second setup countdown.</p><div id="analysis-result" class="analysis-result" aria-live="polite"></div><button id="arm-swing" class="arm-button">Arm swing</button></section>
    <section class="swing-debug" aria-label="Swing analysis debug"><p class="eyebrow">Swing analysis · debug</p><strong id="analysis-summary">Awaiting an armed capture</strong><div id="analysis-details" class="debug-values"></div></section>
    <section class="recording"><div><p class="eyebrow">Recording</p><strong id="recording-state">Ready</strong><span id="sample-count">0 samples</span></div><button id="record" class="record">Start recording</button><button id="download" disabled>Download CSV</button></section>
    <p id="message" class="message">Tap “Enable motion sensors” before testing on iPhone.</p>
    <section class="readings"><h2>Raw sensor values</h2><p class="hint">Values are shown as received. Calibrated display offsets, if set, are not recorded.</p>
      <article><h3>Acceleration <small>m/s²</small></h3><div id="acceleration" class="axes">${values({x:null,y:null,z:null})}</div></article>
      <article><h3>Acceleration incl. gravity <small>m/s²</small></h3><div id="gravity" class="axes">${values({x:null,y:null,z:null})}</div></article>
      <article><h3>Rotation rate <small>°/s</small></h3><div id="rotation" class="axes">${values({alpha:null,beta:null,gamma:null})}</div></article>
      <article><h3>Device orientation <small>°</small></h3><div id="orientation" class="axes">${values({alpha:null,beta:null,gamma:null})}</div></article>
      <article><h3>Raw motion event interval</h3><div id="raw-interval" class="single">—</div><p class="hint">Browser-provided value; units are browser-defined.</p></article>
      <article><h3>Observed motion interval <small>ms</small></h3><div id="observed-interval" class="single">—</div><p class="hint">Derived from consecutive received motion timestamps.</p></article>
    </section>`;
}

export function updateStatus(status: SensorStatus): void {
  const label = (supported: boolean, permission: string, count: number) => !supported ? 'Unavailable' : `${permission} · ${count} events`;
  set('motion-status', label(status.motionSupported, status.motionPermission, status.motionEvents));
  set('orientation-status', label(status.orientationSupported, status.orientationPermission, status.orientationEvents));
  const timing = (rate: number | null, interval: number | null): string => rate === null || interval === null ? '—' : `${rate.toFixed(1)} Hz · ${interval.toFixed(1)} ms`;
  set('motion-timing', timing(status.motionObservedFrequencyHz, status.motionObservedIntervalMs));
  set('orientation-timing', timing(status.orientationObservedFrequencyHz, status.orientationObservedIntervalMs));
}
export function updateSnapshot(s: SensorSnapshot): void {
  if (s.source === 'motion') { html('acceleration', values(s.acceleration)); html('gravity', values(s.accelerationIncludingGravity)); html('rotation', values(s.rotationRate)); set('raw-interval', s.rawEventInterval === null ? '—' : String(s.rawEventInterval)); set('observed-interval', s.observedIntervalMs === null ? '—' : s.observedIntervalMs.toFixed(1)); }
  else html('orientation', values(s.orientation));
}
export function updateArmSwing(status: ArmSwingStatus, manualRecording: boolean, armedCaptureHasData: boolean | null): void {
  const armButton = document.querySelector<HTMLButtonElement>('#arm-swing')!;
  const recordButton = document.querySelector<HTMLButtonElement>('#record')!;
  const detail = document.getElementById('swing-detail')!;
  const state = document.getElementById('swing-state')!;
  armButton.disabled = status.state !== 'idle' || manualRecording;
  recordButton.disabled = status.state !== 'idle';
  if (status.state === 'countdown') {
    state.textContent = String(status.countdown);
    detail.textContent = 'Get into position. Sensor data is not being treated as a swing yet.';
  } else if (status.state === 'capturing') {
    state.textContent = 'SWING!';
    detail.textContent = 'Swing window active — capturing raw sensor samples for 4 seconds.';
  } else if (status.state === 'completed') {
    state.textContent = armedCaptureHasData ? 'Swing captured' : 'No sensor data captured';
    detail.textContent = armedCaptureHasData ? 'The capture is ready to download as CSV.' : 'Enable motion sensors first, then try again.';
  } else if (manualRecording) {
    state.textContent = 'Manual recording active';
    detail.textContent = 'Stop the manual recording before arming a swing.';
  } else {
    state.textContent = 'Ready to arm a swing';
    detail.textContent = 'Start when you are ready for a five-second setup countdown.';
  }
}
export function updateSwingAnalysis(result: SwingAnalysisResult | null): void {
  const summary = document.getElementById('analysis-summary')!; const details = document.getElementById('analysis-details')!; const resultPanel = document.getElementById('analysis-result')!;
  if (result === null) { summary.textContent = 'Awaiting an armed capture'; details.textContent = ''; resultPanel.textContent = ''; return; }
  if (!result.detected) { summary.textContent = 'No swing detected'; details.textContent = `${result.motionSampleCount} motion samples analyzed`; resultPanel.textContent = 'No swing detected'; return; }
  summary.textContent = 'Swing captured';
  const duration = `${(result.durationMs! / 1000).toFixed(2)} s`; const acceleration = `${result.peakAcceleration!.toFixed(1)} m/s²`; const rotation = `${result.peakRotation!.toFixed(1)} °/s`;
  resultPanel.innerHTML = `<strong>Swing captured</strong><span>Duration: ${duration}</span><span>Peak acceleration: ${acceleration}</span><span>Peak rotation: ${rotation}</span>`;
  details.innerHTML = `<span>Start<b>${result.startElapsedMs!.toFixed(0)} ms</b></span><span>Peak<b>${result.peakElapsedMs!.toFixed(0)} ms</b></span><span>End<b>${result.endElapsedMs!.toFixed(0)} ms</b></span>`;
}
export const set = (id: string, text: string): void => { document.getElementById(id)!.textContent = text; };
export const html = (id: string, value: string): void => { document.getElementById(id)!.innerHTML = value; };
