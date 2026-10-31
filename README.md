# Rustavi Drive

A browser-based 3D driving practice game built with Three.js and Vite. Eight distinct **illustrative** Rustavi-inspired routes, procedural streets, traffic lights, moving vehicles, pedestrians, a passenger instructor, and practice assessments. These are not verified official exam routes; the scoring is a game model, not Georgian exam regulations.

## Run

Requires Node.js 20.19+ or 22.12+.

```sh
npm ci
npm run dev
```

Open the address printed by Vite. `npm run build` creates a static site in `dist`; `npm run preview` serves that build. `npm test` runs the route and rule tests. No credentials or backend required.

## Play

Select one of eight routes, start practice, and press B to buckle up. W/S or up/down accelerate and brake; R selects drive/reverse while stopped; W accelerates in the selected gear. Braking never automatically selects reverse. A/D or left/right steer. Q/E toggle indicators, Space brakes, C switches camera, P pauses. Touch buttons provide basic driving controls. Follow the route markers and map on the right; checkpoints must be visited in order. The traffic-light cycle is shared across intersections: north/south green for 13 seconds, 3 seconds all red, east/west green for 13 seconds, 3 seconds all red. Stop before the marked line; yield to people crossing.

Three minor violations fail a session. Collisions, red-light crossings, driving without a seat belt, and excessive speed fail immediately. The posted speed limit is 40 km/h. Routes can be restarted or changed at any time. Opening controls or leaving the browser pauses an active session.

## Scope

This is a playable stylized prototype, not a photorealistic or certified training product. Traffic follows simple fixed paths, pedestrian movement is procedural, collision volumes are approximate, and car dynamics are simplified. Reproducing the eight official routes requires validated current route maps and road rules. No claim of official route accuracy is made.

## Immersive driving update

The simulator fills the browser viewport by default; the Fullscreen button optionally hides browser chrome. Routes and examiner details are accessible through the toolbar drawers. Three live, horizontally reflected rear-facing camera views show traffic behind the vehicle. Mirrors refresh at up to 20 Hz; static scenery is batched by material to reduce rendering work. The cockpit includes a steering wheel linked to the vehicle steering, windshield pillars, and a speed display. Optional synthesized engine sound starts only after the sound button is pressed and silences while paused.

Driving uses a simplified bicycle model with progressive steering, speed-sensitive steering limits, coasting resistance, and separate braking/reverse controls. It is still a stylized simulator, not a validated vehicle dynamics model.

### Route research status

Requests to `https://www.sa.gov.ge/` and Google search were retried for the realism update, but both were rejected by the environment proxy (403). No official geometry or current street-level references were obtained. None of the eight illustrative routes, houses, traffic signs, or intersections should be described as an exact Rustavi reconstruction. Network-access changes for route research are saved in the environment configuration draft, awaiting application by the user.

### Browser smoke test

With the dev server running, run `npm run test:browser`. Install Playwright's Chromium with `npx playwright install chromium`, or set `CHROMIUM_PATH` to an existing Chromium executable (for this cloud environment: `/usr/bin/chromium`). `BROWSER_URL` optionally selects another server. The smoke test checks viewport sizing, changing mirror imagery, acceleration, belt status, pause behavior, route switching, reverse selection, the controls dialog, and mobile layout. The unit suite also covers braking without accidental reverse and frame-rate consistency. Full-route driving and official exam fidelity are not covered.
