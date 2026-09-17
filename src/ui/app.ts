import type { AxisValues, AngleValues, SensorSnapshot, SensorStatus } from '../sensors/types';

const number = (value: number | null): string => value === null ? '—' : value.toFixed(3);
const values = (v: AxisValues | AngleValues): string => Object.entries(v).map(([key, value]) => `<span><b>${key}</b>${number(value)}</span>`).join('');

export function renderApp(): void {
  document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
    <header><p class="eyebrow">Motion · Golf Web PoC</p><h1>Sensor laboratory</h1><p>Capture raw iPhone motion data. This is not swing scoring.</p></header>
    <section class="actions"><button id="permission" class="primary">Enable motion sensors</button><button id="calibrate">Calibrate display</button><button id="reset-calibration">Reset calibration</button></section>
    <section class="status" aria-label="Sensor status"><div><b>Motion</b><span id="motion-status">checking</span></div><div><b>Orientation</b><span id="orientation-status">checking</span></div><div><b>Update rate</b><span id="frequency">—</span></div></section>
    <section class="recording"><div><p class="eyebrow">Recording</p><strong id="recording-state">Ready</strong><span id="sample-count">0 samples</span></div><button id="record" class="record">Start recording</button><button id="download" disabled>Download CSV</button></section>
    <p id="message" class="message">Tap “Enable motion sensors” before testing on iPhone.</p>
    <section class="readings"><h2>Raw sensor values</h2><p class="hint">Values are shown as received. Calibrated display offsets, if set, are not recorded.</p>
      <article><h3>Acceleration <small>m/s²</small></h3><div id="acceleration" class="axes">${values({x:null,y:null,z:null})}</div></article>
      <article><h3>Acceleration incl. gravity <small>m/s²</small></h3><div id="gravity" class="axes">${values({x:null,y:null,z:null})}</div></article>
      <article><h3>Rotation rate <small>°/s</small></h3><div id="rotation" class="axes">${values({alpha:null,beta:null,gamma:null})}</div></article>
      <article><h3>Device orientation <small>°</small></h3><div id="orientation" class="axes">${values({alpha:null,beta:null,gamma:null})}</div></article>
      <article><h3>Event interval</h3><div id="interval" class="single">—</div></article>
    </section>`;
}

export function updateStatus(status: SensorStatus): void {
  const label = (supported: boolean, permission: string, count: number) => !supported ? 'Unavailable' : `${permission} · ${count} events`;
  set('motion-status', label(status.motionSupported, status.motionPermission, status.motionEvents));
  set('orientation-status', label(status.orientationSupported, status.orientationPermission, status.orientationEvents));
  set('frequency', status.frequencyHz === null ? '—' : `${status.frequencyHz.toFixed(1)} Hz`);
}
export function updateSnapshot(s: SensorSnapshot): void {
  if (s.source === 'motion') { html('acceleration', values(s.acceleration)); html('gravity', values(s.accelerationIncludingGravity)); html('rotation', values(s.rotationRate)); set('interval', s.interval === null ? '—' : `${s.interval.toFixed(2)} ms`); }
  else html('orientation', values(s.orientation));
}
export const set = (id: string, text: string): void => { document.getElementById(id)!.textContent = text; };
export const html = (id: string, value: string): void => { document.getElementById(id)!.innerHTML = value; };
