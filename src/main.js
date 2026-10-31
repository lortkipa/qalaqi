import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import "./style.css";
import { advanceVehicle } from "./driving.js";
import { createMirrors } from "./mirrors.js";
import { setupImmersive } from "./immersive.js";
const immersive = setupImmersive();
import { routes, turnAt, lightGreen, applyViolation } from "./routes.js";
const $ = (id) => document.getElementById(id);
const scene = new THREE.Scene();
scene.background = new THREE.Color("#bfd2d5");
scene.fog = new THREE.Fog("#bfd2d5", 170, 650);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.7));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
$("scene").appendChild(renderer.domElement);
const camera = new THREE.PerspectiveCamera(65, 1, 0.1, 800);
const hemi = new THREE.HemisphereLight("#e8f6ff", "#879474", 2.3);
scene.add(hemi);
const sun = new THREE.DirectionalLight("#fff3d8", 3);
sun.position.set(-100, 180, 120);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, {
  left: -180,
  right: 180,
  top: 180,
  bottom: -180,
  far: 500,
});
sun.shadow.bias = -0.001;
scene.add(sun);
scene.add(sun.target);
const mats = {};
function mat(color) {
  return (mats[color] ??= new THREE.MeshStandardMaterial({
    color,
    roughness: 0.85,
  }));
}
function box(w, h, d, color, x, y, z, parent = scene) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(color));
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}
function sphere(r, color, x, y, z, parent = scene) {
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(r, 10, 8), mat(color));
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  parent.add(mesh);
  return mesh;
}
const asphaltCanvas = document.createElement("canvas");
asphaltCanvas.width = asphaltCanvas.height = 128;
const asphaltContext = asphaltCanvas.getContext("2d"),
  pixels = asphaltContext.createImageData(128, 128);
let asphaltSeed = 918;
for (let i = 0; i < pixels.data.length; i += 4) {
  asphaltSeed = (asphaltSeed * 1664525 + 1013904223) >>> 0;
  const n = 135 + (asphaltSeed % 38);
  pixels.data[i] = n;
  pixels.data[i + 1] = n;
  pixels.data[i + 2] = n;
  pixels.data[i + 3] = 255;
}
asphaltContext.putImageData(pixels, 0, 0);
const asphalt = new THREE.CanvasTexture(asphaltCanvas);
asphalt.wrapS = asphalt.wrapT = THREE.RepeatWrapping;
asphalt.repeat.set(3, 70);
asphalt.colorSpace = THREE.SRGBColorSpace;
asphalt.anisotropy = renderer.capabilities.getMaxAnisotropy();
mat("#68716f").map = asphalt;
box(1400, 0.3, 1400, "#8eaa79", 240, -0.25, 240);
for (let i = 0; i < 5; i++) {
  const k = i * 120;
  box(16, 0.08, 650, "#68716f", k, 0, 240);
  box(650, 0.08, 16, "#68716f", 240, 0.01, k);
  for (const offset of [-10, 10]) {
    box(3, 0.25, 640, "#c9c7b7", k + offset, 0.1, 240);
    box(640, 0.25, 3, "#c9c7b7", 240, 0.1, k + offset);
  }
  for (let t = -70; t < 565; t += 12) {
    if (Math.abs(t - Math.round(t / 120) * 120) < 14) continue;
    box(0.13, 0.03, 5, "#e0dbbf", k, 0.065, t);
    box(5, 0.03, 0.13, "#e0dbbf", t, 0.075, k);
  }
}
// Sidewalk junctions, crosswalks, stop lines, and traffic lights.
const signals = [];
const crossings = [];
for (let x = 0; x <= 480; x += 120)
  for (let z = 0; z <= 480; z += 120) {
    box(23, 0.08, 23, "#68716f", x, 0.24, z);
    for (const sign of [-1, 1]) {
      for (let n = -6; n <= 6; n += 2) {
        box(1.1, 0.035, 3, "#e5e5d6", x + n, 0.3, z + sign * 14);
        box(3, 0.035, 1.1, "#e5e5d6", x + sign * 14, 0.3, z + n);
      }
      box(6, 0.035, 0.4, "#e5e5d6", x - sign * 3.5, 0.3, z + sign * 18);
      box(0.4, 0.035, 6, "#e5e5d6", x + sign * 18, 0.3, z + sign * 3.5);
    }
    for (const axis of ["x", "z"]) {
      const lx = x + (axis === "z" ? 9 : 17),
        lz = z + (axis === "z" ? 17 : -9);
      box(0.18, 5, 0.18, "#4e5c54", lx, 2.5, lz);
      box(0.65, 1.6, 0.6, "#233a31", lx, 5, lz);
      const red = sphere(0.17, "#ea6557", lx, 5.45, lz + 0.32),
        green = sphere(0.17, "#537b56", lx, 4.6, lz + 0.32);
      signals.push({ red, green, axis });
    }
    crossings.push({ x, z });
  }
let seed = 17;
function rand() {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 4294967296;
}
function tree(x, z) {
  box(0.7, 4, 0.7, "#7e7960", x, 2, z);
  sphere(3.2, "#789863", x, 5.8, z);
  sphere(2.5, "#8ba86c", x + 1, 7, z);
}
const wallColors = ["#d2c5ae", "#d8d6c3", "#bbc5b8", "#d0b7a0", "#b8c2bd"];
for (let gx = 0; gx < 4; gx++)
  for (let gz = 0; gz < 4; gz++) {
    const ox = gx * 120,
      oz = gz * 120;
    for (let a = 0; a < 2; a++)
      for (let b = 0; b < 2; b++) {
        const x = ox + 34 + a * 51,
          z = oz + 34 + b * 51,
          w = 27 + rand() * 8,
          d = 25 + rand() * 9,
          h = 10 + Math.floor(rand() * 5) * 3;
        box(w, h, d, wallColors[Math.floor(rand() * 5)], x, h / 2, z);
        box(w + 1, 0.5, d + 1, "#8a9083", x, h, z);
        for (let floor = 0; floor < h - 3; floor += 3.5)
          for (let win = -9; win < 11; win += 4.7) {
            box(
              1.9,
              1.8,
              0.08,
              "#677d7b",
              x + win,
              floor + 2.5,
              z + d / 2 + 0.06,
            );
            box(
              0.08,
              1.8,
              1.9,
              "#738783",
              x - w / 2 - 0.06,
              floor + 2.5,
              z + win,
            );
          }
        box(3, 3, 0.2, "#5b6e64", x, 1.5, z + d / 2 + 0.2);
      }
    for (let t = 20; t < 110; t += 22) {
      tree(ox + 13, oz + t);
      tree(ox + t, oz + 107);
    }
  }
for (let i = 0; i < 5; i++)
  for (let t = 35; t < 480; t += 60) {
    const x = i * 120 + 10,
      z = t;
    box(0.15, 7, 0.15, "#647268", x, 3.5, z);
    box(3, 0.15, 0.2, "#647268", x - 1.4, 7, z);
    box(0.8, 0.1, 0.5, "#fff2bc", x - 2.5, 6.9, z);
  }
function speedSign(x, z, rotation) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 128;
  const c = canvas.getContext("2d");
  c.fillStyle = "#fffdf4";
  c.beginPath();
  c.arc(64, 64, 59, 0, Math.PI * 2);
  c.fill();
  c.strokeStyle = "#bd362c";
  c.lineWidth = 12;
  c.stroke();
  c.fillStyle = "#202820";
  c.font = "bold 61px sans-serif";
  c.textAlign = "center";
  c.textBaseline = "middle";
  c.fillText("40", 64, 67);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  box(0.09, 2.6, 0.09, "#8c968d", x, 1.3, z);
  const face = new THREE.Mesh(
    new THREE.CircleGeometry(0.55, 32),
    new THREE.MeshStandardMaterial({
      map: texture,
      roughness: 0.8,
      side: THREE.DoubleSide,
    }),
  );
  face.position.set(x, 2.8, z);
  face.rotation.y = rotation;
  scene.add(face);
}
for (let k = 0; k <= 480; k += 120) {
  speedSign(k + 9, 425, 0);
  speedSign(k - 9, 55, Math.PI);
  speedSign(55, k + 9, -Math.PI / 2);
  speedSign(425, k - 9, Math.PI / 2);
}
// Low distant hills characteristic of Rustavi's dry landscape.
for (let i = 0; i < 16; i++) {
  const hill = new THREE.Mesh(
    new THREE.ConeGeometry(130 + rand() * 90, 60 + rand() * 100, 7),
    mat("#9eaa8a"),
  );
  hill.position.set(-300 + i * 100, 0, -230 - rand() * 120);
  scene.add(hill);
}
// Batch static scenery by material so live mirror passes remain affordable.
const dynamicLights = new Set(signals.flatMap((s) => [s.red, s.green]));
const staticGroups = new Map();
for (const mesh of [...scene.children]) {
  if (!mesh.isMesh || dynamicLights.has(mesh)) continue;
  mesh.updateMatrix();
  const geometry = mesh.geometry.clone().applyMatrix4(mesh.matrix);
  const group = staticGroups.get(mesh.material) || [];
  group.push(geometry);
  staticGroups.set(mesh.material, group);
  scene.remove(mesh);
  mesh.geometry.dispose();
}
for (const [material, geometries] of staticGroups) {
  const merged = mergeGeometries(geometries);
  const mesh = new THREE.Mesh(merged, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  scene.add(mesh);
  geometries.forEach((g) => g.dispose());
}
function car(color) {
  const g = new THREE.Group();
  box(1.9, 0.65, 4.2, color, 0, 0.72, 0, g);
  box(1.65, 0.65, 2.05, color, 0, 1.35, 0.2, g);
  box(1.5, 0.48, 0.04, "#93b8bd", 0, 1.4, -0.85, g);
  box(1.5, 0.45, 0.04, "#88a9a9", 0, 1.4, 1.24, g);
  for (const side of [-1, 1]) {
    box(0.04, 0.45, 1.7, "#8eabb0", side * 0.84, 1.4, 0.2, g);
    for (const z of [-1.3, 1.3]) {
      const wheel = new THREE.Mesh(
        new THREE.CylinderGeometry(0.35, 0.35, 0.18, 12),
        mat("#303a36"),
      );
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(side * 0.99, 0.4, z);
      g.add(wheel);
    }
    box(0.45, 0.17, 0.05, "#fff4c2", side * 0.59, 0.8, -2.13, g);
    box(0.45, 0.17, 0.05, "#c45543", side * 0.59, 0.8, 2.13, g);
  }
  scene.add(g);
  return g;
}
const player = car("#e7e9df");
const passenger = new THREE.Group();
box(0.42, 0.62, 0.3, "#355348", 0.48, 1.25, 0.25, passenger);
sphere(0.18, "#c49c7c", 0.48, 1.75, 0.25, passenger);
sphere(0.18, "#4d4a3d", 0.48, 1.84, 0.28, passenger);
player.add(passenger);
const steering = new THREE.Mesh(
  new THREE.TorusGeometry(0.25, 0.025, 8, 24),
  mat("#263e32"),
);
steering.position.set(-0.43, 1.36, -0.5);
steering.rotation.x = 0.4;
player.add(steering);
const traffic = [];
for (let i = 0; i < 14; i++) {
  const axis = i % 2 ? "x" : "z",
    line = (i % 5) * 120,
    dir = i % 3 ? 1 : -1;
  traffic.push({
    mesh: car(["#b5c4b8", "#baa78c", "#547b7b", "#d6d5cb", "#aa7061"][i % 5]),
    axis,
    line,
    dir,
    pos: -60 + i * 43,
    speed: 6 + (i % 4),
  });
}
function person() {
  const g = new THREE.Group();
  sphere(0.2, "#c59876", 0, 1.6, 0, g);
  box(
    0.4,
    0.6,
    0.25,
    ["#b28868", "#648d91", "#7a7e98"][Math.floor(rand() * 3)],
    0,
    1.08,
    0,
    g,
  );
  const legs = [
    box(0.13, 0.65, 0.15, "#43554d", -0.12, 0.45, 0, g),
    box(0.13, 0.65, 0.15, "#43554d", 0.12, 0.45, 0, g),
  ];
  box(0.12, 0.55, 0.15, "#bd967b", -0.3, 1.05, 0, g);
  box(0.12, 0.55, 0.15, "#bd967b", 0.3, 1.05, 0, g);
  scene.add(g);
  return { mesh: g, legs };
}
const walkers = Array.from({ length: 22 }, (_, i) => {
  const c = crossings[(i * 7 + 11) % crossings.length];
  return { ...person(), x: c.x, z: c.z + 14, phase: i * 2.9, crossing: false };
});
const markers = new THREE.Group();
scene.add(markers);
let selected = 0,
  active = false,
  paused = false,
  ended = false,
  belt = false,
  indicator = null,
  view = 0,
  speed = 0,
  yaw = 0,
  target = 1,
  elapsed = 0,
  worldTime = 0,
  score = 100,
  mistakes = 0,
  totalTravel = 0,
  noticeUntil = 0,
  offroad = 0,
  overSpeed = 0,
  noBelt = 0,
  wrongWay = 0;
let steeringAngle = 0,
  reverse = false;
let cooldown = {};
let lastPosition = new THREE.Vector3();
const keys = {};
let lastLightKey = "";
function route() {
  return routes[selected];
}
function updateMarkers() {
  for (const m of markers.children) {
    m.geometry.dispose();
    m.material.dispose();
  }
  markers.clear();
  route().points.forEach((p, i) => {
    if (i === 0) return;
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(i === target ? 3 : 1.1, 0.12, 5, 24),
      new THREE.MeshBasicMaterial({
        color: i === target ? "#a6f1c5" : "#58aa95",
        transparent: true,
        opacity: i < target ? 0.15 : 0.85,
      }),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(p.x, 0.36, p.z);
    markers.add(ring);
  });
}
function message(text) {
  $("instructor-message").textContent = `“${text}”`;
  const live = $("live-instruction");
  if (live) live.textContent = text;
}
function reset() {
  steeringAngle = 0;
  reverse = false;
  Object.keys(keys).forEach((k) => (keys[k] = false));
  traffic.forEach((t, i) => (t.pos = -60 + i * 43));
  active = false;
  paused = false;
  ended = false;
  belt = false;
  indicator = null;
  speed = 0;
  target = 1;
  elapsed = 0;
  score = 100;
  mistakes = 0;
  totalTravel = 0;
  cooldown = {};
  offroad = 0;
  overSpeed = 0;
  noBelt = 0;
  wrongWay = 0;
  lastLightKey = "";
  worldTime = 0;
  const p = route().points[0],
    next = route().points[1];
  player.position.set(p.x, 0.28, p.z - 25);
  yaw = Math.atan2(-(next.x - p.x), -(next.z - p.z));
  player.rotation.y = yaw;
  lastPosition.copy(player.position);
  traffic.forEach((t) => {
    const tx = t.axis === "x" ? t.pos : t.line - t.dir * 3.3,
      tz = t.axis === "z" ? t.pos : t.line + t.dir * 3.3;
    if (Math.hypot(tx - player.position.x, tz - player.position.z) < 35)
      t.pos += t.dir * 75;
  });
  $("start-cover").classList.remove("hidden");
  $("start-cover").querySelector("h2").textContent = "Take the driver’s seat.";
  $("start-cover").querySelector("p").textContent =
    "Your instructor is ready. The road is yours.";
  $("start").innerHTML = "Start practice <span>→</span>";
  $("session-state").textContent = "Ready when you are";
  $("notice").classList.add("hidden");
  $("pause").textContent = "Ⅱ";
  $("route-title").textContent =
    `Route ${String(selected + 1).padStart(2, "0")}`;
  $("difficulty").textContent = route().difficulty.toUpperCase();
  $("route-length").innerHTML =
    `${(route().length / 1000).toFixed(1)} <span>km</span>`;
  $("turn-count").textContent = route().turns;
  for (const id of ["check-speed", "check-signal", "check-ped"])
    $(id).textContent = "Watching";
  $("assessment-note").textContent = "Stay aware. Smooth is safe.";
  message(
    "A good drive starts before you move. Buckle up, check your surroundings, and take your time.",
  );
  updateMarkers();
  updateWorld(0);
  updateHUD();
}
$("routes").innerHTML = routes
  .map(
    (r, i) =>
      `<button class="route-button ${i === 0 ? "selected" : ""}" data-route="${i}"><span class="route-number">${String(i + 1).padStart(2, "0")}</span><span><strong>${r.name}</strong><small>${r.difficulty} · ${(r.length / 1000).toFixed(1)} km</small></span><span class="arrow">›</span></button>`,
  )
  .join("");
document.querySelectorAll("[data-route]").forEach(
  (b) =>
    (b.onclick = () => {
      selected = Number(b.dataset.route);
      document
        .querySelectorAll("[data-route]")
        .forEach((x) => x.classList.toggle("selected", x === b));
      reset();
    }),
);
function start() {
  if (ended) reset();
  document.body.classList.remove("routes-open");
  $("route-drawer").setAttribute("aria-expanded", "false");
  active = true;
  paused = false;
  $("start-cover").classList.add("hidden");
  $("session-state").textContent = "Practice in progress";
  message(
    belt
      ? "Follow the route. Stay in the right lane and watch the crossings."
      : "Fasten your seat belt with B before moving.",
  );
}
function finish(failed, reason) {
  active = false;
  ended = true;
  speed = 0;
  keys.w = false;
  keys.ArrowUp = false;
  $("start-cover").classList.remove("hidden");
  $("start-cover").querySelector("h2").textContent = failed
    ? "Let’s learn from that."
    : "A confident finish.";
  $("start-cover").querySelector("p").textContent = failed
    ? reason
    : `Route complete · ${score} points · ${mistakes} violations`;
  $("start").innerHTML = "Try again <span>↻</span>";
  $("session-state").textContent = failed
    ? "Exam ended — not passed"
    : "Route completed — passed";
  message(
    failed
      ? `${reason} We’ll stop the exam here. Restart when you’re ready.`
      : "Well done. You completed the route safely. Keep practicing to build confidence.",
  );
  $("assessment-note").textContent = failed
    ? "Not passed. Review your driving and retry."
    : "Passed this practice route.";
}
function violation(key, text, severe = false) {
  if (!active || elapsed < (cooldown[key] ?? 0)) return;
  cooldown[key] = elapsed + 8;
  ({ score, mistakes } = applyViolation({ mistakes }, severe));
  $("notice").textContent =
    text + (severe ? " — exam ended" : ` · Violation ${mistakes}/3`);
  $("notice").classList.remove("hidden");
  noticeUntil = elapsed + 5;
  message(text);
  if (/speed|lane|road/.test(key)) $("check-speed").textContent = "Violation";
  if (key === "signal") $("check-signal").textContent = "Violation";
  if (key === "pedestrian") $("check-ped").textContent = "Violation";
  if (severe || mistakes >= 3) finish(true, text);
}
function togglePause() {
  if (!active) return;
  paused = !paused;
  $("pause").textContent = paused ? "▶" : "Ⅱ";
  $("session-state").textContent = paused ? "Paused" : "Practice in progress";
}
function toggleBelt() {
  belt = !belt;
  message(
    belt
      ? "Seat belt secured. Check the road before moving."
      : "Fasten your belt before continuing.",
  );
  updateHUD();
}
function shiftGear() {
  if (Math.abs(speed) < 0.2) {
    reverse = !reverse;
    message(
      reverse
        ? "Reverse selected. Check all mirrors and look behind before moving."
        : "Drive selected. Check traffic before moving.",
    );
  } else message("Stop completely before changing gear.");
}
$("touch-left").onclick = () => toggleIndicator("left");
$("touch-right").onclick = () => toggleIndicator("right");
$("touch-reverse").onclick = shiftGear;
function toggleIndicator(side) {
  indicator = indicator === side ? null : side;
}
$("start").onclick = start;
$("restart").onclick = reset;
$("pause").onclick = togglePause;
$("camera").onclick = () => {
  view = 1 - view;
  $("camera").innerHTML =
    `◧ <span>${view ? "Follow view" : "Driver view"}</span>`;
};
$("help").onclick = () => {
  if (active && !paused) togglePause();
  $("help-dialog").showModal();
};
$("close-help").onclick = () => $("help-dialog").close();
$("mobile-belt").onclick = toggleBelt;
window.addEventListener("keydown", (e) => {
  if ($("help-dialog").open) return;
  const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
  if ([" ", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(k))
    e.preventDefault();
  keys[k] = true;
  if (e.repeat) return;
  if (k === "r") shiftGear();
  if (k === "b") toggleBelt();
  if (k === "q") toggleIndicator("left");
  if (k === "e") toggleIndicator("right");
  if (k === "p") togglePause();
  if (k === "c") $("camera").click();
});
window.addEventListener(
  "keyup",
  (e) => (keys[e.key.length === 1 ? e.key.toLowerCase() : e.key] = false),
);
window.addEventListener("blur", () => {
  Object.keys(keys).forEach((k) => (keys[k] = false));
  if (active && !paused) togglePause();
});
document.querySelectorAll("[data-key]").forEach((b) => {
  b.onpointerdown = (e) => {
    b.setPointerCapture(e.pointerId);
    keys[b.dataset.key] = true;
  };
  b.onpointerup = b.onpointercancel = () => (keys[b.dataset.key] = false);
});
const map = $("map"),
  ctx = map.getContext("2d");
function drawMap() {
  const scale = 0.46,
    ox = 130,
    oz = 30;
  ctx.clearRect(0, 0, 500, 310);
  ctx.fillStyle = "#edf0e7";
  ctx.fillRect(0, 0, 500, 310);
  ctx.strokeStyle = "#fff";
  ctx.lineWidth = 13;
  for (let i = 0; i < 5; i++) {
    ctx.beginPath();
    ctx.moveTo(ox + i * 120 * scale, 0);
    ctx.lineTo(ox + i * 120 * scale, 310);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, oz + i * 120 * scale);
    ctx.lineTo(500, oz + i * 120 * scale);
    ctx.stroke();
  }
  ctx.strokeStyle = "#88aa70";
  ctx.lineWidth = 5;
  ctx.lineJoin = "round";
  ctx.beginPath();
  route().points.forEach((p, i) =>
    ctx[i ? "lineTo" : "moveTo"](ox + p.x * scale, oz + p.z * scale),
  );
  ctx.stroke();
  const end = route().points.at(-1);
  ctx.fillStyle = "#77945d";
  ctx.fillRect(ox + end.x * scale - 5, oz + end.z * scale - 5, 10, 10);
  ctx.save();
  ctx.translate(ox + player.position.x * scale, oz + player.position.z * scale);
  ctx.rotate(-yaw);
  ctx.fillStyle = "#214c40";
  ctx.strokeStyle = "#fff";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, -10);
  ctx.lineTo(-7, 8);
  ctx.lineTo(0, 4);
  ctx.lineTo(7, 8);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
  ctx.font = "12px sans-serif";
  ctx.fillStyle = "#98a58c";
  ctx.fillText("N ↑", 20, 28);
}
function updateHUD() {
  const km = Math.round(Math.abs(speed) * 3.6);
  $("speed").textContent = km;
  $("speed").style.color = km > 40 ? "#ef9b80" : "";
  $("gear").textContent = reverse ? "R" : "D";
  $("belt-status").textContent = belt
    ? "◉ Seat belt secured"
    : "◉ Seat belt off";
  $("belt-status").style.color = belt ? "#b0d68e" : "#d7b778";
  $("left-lamp").classList.toggle(
    "lit",
    indicator === "left" && Math.floor(worldTime * 2) % 2 === 0,
  );
  $("right-lamp").classList.toggle(
    "lit",
    indicator === "right" && Math.floor(worldTime * 2) % 2 === 0,
  );
  $("timer").textContent =
    `${String(Math.floor(elapsed / 60)).padStart(2, "0")}:${String(Math.floor(elapsed % 60)).padStart(2, "0")}`;
  $("score").textContent = score;
  const dest = route().points[Math.min(target, route().points.length - 1)],
    dist = Math.hypot(player.position.x - dest.x, player.position.z - dest.z),
    turn = turnAt(route().points, target);
  $("navigation").textContent =
    turn === "finish"
      ? "Finish ahead"
      : dist < 60 && turn !== "straight"
        ? `Turn ${turn}`
        : "Continue straight";
  $("turn-icon").textContent =
    turn === "left" && dist < 60
      ? "↰"
      : turn === "right" && dist < 60
        ? "↱"
        : "↑";
  $("distance").textContent =
    `${Math.round(dist)} m to ${turn === "finish" ? "finish" : turn === "straight" ? "next checkpoint" : "junction"}`;
  const progress =
    ended && !$("session-state").textContent.includes("not passed")
      ? 100
      : Math.min(
          99,
          Math.max(
            0,
            Math.round(((target - 1) / (route().points.length - 1)) * 100),
          ),
        );
  $("progress").innerHTML = `${progress} <span>%</span>`;
  $("progress-bar").style.width = progress + "%";
  drawMap();
}
function updateWorld(dt) {
  worldTime += dt;
  signals.forEach((s) => {
    const green = lightGreen(worldTime, s.axis);
    s.green.material = mat(green ? "#64e99d" : "#345b45");
    s.red.material = mat(green ? "#643c32" : "#ff5d42");
  });
  traffic.forEach((t) => {
    const next =
      t.dir > 0
        ? Math.ceil((t.pos + 20) / 120) * 120
        : Math.floor((t.pos - 20) / 120) * 120;
    const distance = (next - t.pos) * t.dir;
    const stop =
      next >= 0 &&
      next <= 480 &&
      distance > 17 &&
      distance < 28 &&
      !lightGreen(worldTime, t.axis);
    const px = t.axis === "x" ? t.pos : t.line - t.dir * 3.3,
      pz = t.axis === "z" ? t.pos : t.line + t.dir * 3.3;
    const ahead =
      (t.axis === "x" ? player.position.x - px : player.position.z - pz) *
      t.dir;
    const lateral =
      t.axis === "x"
        ? Math.abs(player.position.z - pz)
        : Math.abs(player.position.x - px);
    const queued = traffic.some((other) => {
      if (
        other === t ||
        other.axis !== t.axis ||
        other.line !== t.line ||
        other.dir !== t.dir
      )
        return false;
      const gap = (other.pos - t.pos) * t.dir;
      return gap > 0 && gap < 10;
    });
    const yielding = walkers.some((w) => {
      if (!w.crossing) return false;
      const wx = w.mesh.position.x,
        wz = w.mesh.position.z;
      const gap = (t.axis === "x" ? wx - px : wz - pz) * t.dir;
      const across = t.axis === "x" ? Math.abs(wz - pz) : Math.abs(wx - px);
      return gap > 0 && gap < 15 && across < 7;
    });
    if (
      !stop &&
      !queued &&
      !yielding &&
      !(ahead > 0 && ahead < 12 && lateral < 3)
    )
      t.pos += t.dir * t.speed * dt;
    if (t.pos > 560) t.pos = -80;
    if (t.pos < -80) t.pos = 560;
    t.mesh.position.set(
      t.axis === "x" ? t.pos : t.line - t.dir * 3.3,
      0.3,
      t.axis === "z" ? t.pos : t.line + t.dir * 3.3,
    );
    t.mesh.rotation.y =
      t.axis === "x" ? (-t.dir * Math.PI) / 2 : t.dir > 0 ? Math.PI : 0;
  });
  walkers.forEach((w) => {
    const phase = (worldTime + w.phase) % 45;
    w.crossing = phase < 16;
    w.mesh.position.set(
      w.x - 11 + (w.crossing ? (phase / 16) * 22 : 22),
      0.3,
      w.z,
    );
    w.mesh.rotation.y = Math.PI / 2;
    w.legs.forEach(
      (l, i) =>
        (l.rotation.x = w.crossing
          ? Math.sin(worldTime * 7 + i * Math.PI) * 0.4
          : 0),
    );
  });
}
function updateDrive(dt) {
  elapsed += dt;
  const accel = keys.w || keys.ArrowUp,
    brake = keys.s || keys.ArrowDown;
  const steer =
    (keys.a || keys.ArrowLeft ? 1 : 0) - (keys.d || keys.ArrowRight ? 1 : 0);
  const step = advanceVehicle(
    { speed, yaw, steering: steeringAngle },
    { throttle: accel, brake, steer, handbrake: keys[" "], reverse },
    dt,
  );
  speed = step.speed;
  yaw = step.yaw;
  steeringAngle = step.steering;
  player.rotation.y = yaw;
  steering.rotation.z = -steeringAngle * 6;
  lastPosition.copy(player.position);
  player.position.x += step.dx;
  player.position.z += step.dz;
  totalTravel += Math.abs(speed) * dt;

  noBelt = !belt && Math.abs(speed) > 1 ? noBelt + dt : 0;
  if (noBelt > 1)
    violation("belt", "Driving without your seat belt is unsafe.", true);
  overSpeed = speed * 3.6 > 42 ? overSpeed + dt : 0;
  if (speed * 3.6 > 65)
    violation("speed", "Dangerous speeding: you exceeded 65 km/h.", true);
  else if (overSpeed > 2) {
    violation("speed", "Slow down. The speed limit is 40 km/h.");
    overSpeed = 0;
  }
  const p = player.position,
    nx = Math.round(p.x / 120) * 120,
    nz = Math.round(p.z / 120) * 120,
    dx = Math.abs(p.x - nx),
    dz = Math.abs(p.z - nz);
  const onRoad =
    (dx < 7.6 && nx >= 0 && nx <= 480) || (dz < 7.6 && nz >= 0 && nz <= 480);
  offroad = !onRoad && Math.abs(speed) > 1 ? offroad + dt : 0;
  if (offroad > 1.5) {
    violation("road", "You drove onto the sidewalk. Keep within your lane.");
    offroad = 0;
  }
  if (p.x < -60 || p.z < -60 || p.x > 540 || p.z > 540)
    finish(true, "You left the practice area.");
  const axis = dx < dz ? "z" : "x";
  const motion = axis === "z" ? -Math.cos(yaw) * speed : -Math.sin(yaw) * speed;
  const wrong =
    axis === "z"
      ? motion > 0
        ? p.x > nx
        : p.x < nx
      : motion > 0
        ? p.z < nz
        : p.z > nz;
  wrongWay =
    wrong && Math.min(dx, dz) < 7 && Math.max(dx, dz) > 18 && speed > 2
      ? wrongWay + dt
      : 0;
  if (wrongWay > 3) {
    violation("lane", "Keep right. You are driving in the opposing lane.");
    wrongWay = 0;
  }
  for (const c of crossings) {
    for (const a of ["x", "z"]) {
      const lat = a === "x" ? Math.abs(p.z - c.z) : Math.abs(p.x - c.x);
      if (lat > 7) continue;
      const now = a === "x" ? p.x - c.x : p.z - c.z,
        prev = a === "x" ? lastPosition.x - c.x : lastPosition.z - c.z;
      const crossed = (prev > 18 && now <= 18) || (prev < -18 && now >= -18);
      const key = `${c.x},${c.z},${a}`;
      if (crossed && !lightGreen(worldTime, a) && lastLightKey !== key) {
        lastLightKey = key;
        violation("red", "You crossed a red light.", true);
      }
    }
  }
  for (const t of traffic)
    if (Math.hypot(p.x - t.mesh.position.x, p.z - t.mesh.position.z) < 3.1) {
      violation("collision", "Collision with another vehicle.", true);
      break;
    }
  for (const w of walkers) {
    const d = Math.hypot(p.x - w.mesh.position.x, p.z - w.mesh.position.z);
    if (d < 1.7 && Math.abs(speed) > 0.5) {
      violation("pedestrian", "Collision with a pedestrian.", true);
      break;
    }
    if (
      w.crossing &&
      Math.abs(w.mesh.position.x - w.x) < 8 &&
      d < 9 &&
      speed > 3
    ) {
      violation("pedestrian", "Yield to pedestrians at the crossing.");
    }
  }
  const dest = route().points[target],
    dist = Math.hypot(p.x - dest.x, p.z - dest.z);
  if (dist < 8) {
    const turn = turnAt(route().points, target);
    if (turn === "finish") {
      if (active) finish(false, "");
    } else {
      if (turn !== "straight" && indicator !== turn)
        violation("signal", `Use your ${turn} indicator before turning.`);
      target++;
      updateMarkers();
      if (active && $("notice").classList.contains("hidden"))
        message(
          "Checkpoint reached. Follow the next marker and check for traffic.",
        );
    }
  }
  if (active && elapsed > noticeUntil) $("notice").classList.add("hidden");
}
const mirrors = createMirrors(renderer, scene, player);
const clock = new THREE.Clock();
let frames = 0;
function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.04);
  if (active && !paused && !ended) {
    updateWorld(dt);
    updateDrive(dt);
  }
  const bob =
    active && !paused
      ? Math.sin(totalTravel * 1.8) * Math.min(Math.abs(speed) * 0.0008, 0.014)
      : 0;
  const offset = view
    ? new THREE.Vector3(0, 5.4, 10)
    : new THREE.Vector3(-0.43, 1.65 + bob, -0.18);
  offset.applyAxisAngle(THREE.Object3D.DEFAULT_UP, yaw).add(player.position);
  camera.position.copy(offset);
  const look = new THREE.Vector3(0, view ? 1 : 1.55, -25)
    .applyAxisAngle(THREE.Object3D.DEFAULT_UP, yaw)
    .add(player.position);
  camera.lookAt(look);
  sun.position.set(player.position.x - 90, 150, player.position.z + 65);
  sun.target.position.copy(player.position);
  immersive.update({ speed, steering: steeringAngle, active, paused, view });
  if (++frames % 4 === 0) updateHUD();
  // The exterior cabin has opaque glass; hide it in driver view, keeping the road unobstructed.
  player.visible = view === 1;
  renderer.render(scene, camera);
  mirrors.render(clock.elapsedTime, yaw);
}
new ResizeObserver(() => {
  const r = $("scene").getBoundingClientRect();
  renderer.setSize(r.width, r.height);
  camera.aspect = r.width / r.height;
  camera.updateProjectionMatrix();
  mirrors.resize();
}).observe($("scene"));
reset();
updateWorld(0);
animate();
