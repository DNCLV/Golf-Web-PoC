# Motion Golf Web PoC

A temporary, browser-based sensor laboratory for evaluating whether iPhone Safari motion APIs expose useful golf-swing data. It is separate from the Unity/native Motion project.

## Local development

1. Install Node.js 20 or later.
2. Run `npm install`.
3. Run `npm run dev`.
4. Open the address Vite prints. Desktop browsers should show the UI even if sensor APIs are unavailable.

For a physical iPhone, deploy the static build (`npm run build`) to an HTTPS host, open it in Safari, and tap **Enable motion sensors**. iOS requires this permission request to occur from a user interaction. `localhost` on a desktop does not make the site reachable from the phone; use an HTTPS deployment or an HTTPS local-tunnel solution.

## Commands

- `npm run dev` — development server
- `npm run build` — type-check and create `dist/`
- `npm run preview` — inspect a production build locally

## Deploy to GitHub Pages

Pushing to `main` automatically builds and deploys the site through GitHub Actions. In the repository on GitHub, open **Settings → Pages** and set the source to **GitHub Actions** once. The site will be available at `https://dnclv.github.io/Golf-Web-PoC/` after a successful workflow run.

GitHub Pages provides HTTPS. Open that URL directly in Safari on the iPhone, then tap **Enable motion sensors**; do not load the page in an embedded browser.

## Data handling

Recordings live only in browser memory until exported as CSV. The exporter leaves unavailable values blank. Raw browser-event fields are never overwritten by calibration or analysis. Do not treat these readings as club-head speed.

### Timing fields

`rawEventInterval` is the unmodified value supplied by `DeviceMotionEvent.interval`. Its units and behavior are browser-defined, so the UI and CSV do not label it as milliseconds. `observedIntervalMs` and `observedFrequencyHz` are separate derived values, calculated from consecutive received timestamps for the same sensor stream. Use observed timing when assessing delivery cadence.
