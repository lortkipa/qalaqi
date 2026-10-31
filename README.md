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

Select one of eight routes, start practice, and press B to buckle up. W/S or up/down accelerate and brake; holding brake at rest reverses. A/D or left/right steer. Q/E toggle indicators, Space brakes, C switches camera, P pauses. Touch buttons provide basic driving controls. Follow the route markers and map on the right; checkpoints must be visited in order. The traffic-light cycle is shared across intersections: north/south green for 13 seconds, 3 seconds all red, east/west green for 13 seconds, 3 seconds all red. Stop before the marked line; yield to people crossing.

Three minor violations fail a session. Collisions, red-light crossings, driving without a seat belt, and excessive speed fail immediately. The posted speed limit is 40 km/h. Routes can be restarted or changed at any time. Opening controls or leaving the browser pauses an active session.

## Scope

This is a playable stylized prototype, not a photorealistic or certified training product. Traffic follows simple fixed paths, pedestrian movement is procedural, collision volumes are approximate, and car dynamics are simplified. Reproducing the eight official routes requires validated current route maps and road rules. No claim of official route accuracy is made.
