import { test } from "node:test";
import assert from "node:assert/strict";
import {
  routes,
  turnAt,
  lightGreen,
  applyViolation,
  lanePath,
} from "../src/routes.js";
test("eight distinct connected routes stay on the city grid", () => {
  assert.equal(routes.length, 8);
  assert.equal(new Set(routes.map((r) => JSON.stringify(r.nodes))).size, 8);
  for (const r of routes) {
    assert.ok(r.length > 500);
    assert.ok(r.turns >= 2);
    r.nodes.forEach((p, i) => {
      assert.ok(p.every((n) => n >= 0 && n <= 4));
      if (i) {
        const a = r.nodes[i - 1];
        assert.equal(Math.abs(p[0] - a[0]) + Math.abs(p[1] - a[1]), 1);
      }
    });
  }
});
test("lane offsets keep northbound and eastbound cars on the right", () => {
  assert.equal(
    lanePath([
      [1, 2],
      [1, 1],
    ])[0].x,
    123.3,
  );
  assert.equal(
    lanePath([
      [1, 1],
      [2, 1],
    ])[0].z,
    123.3,
  );
});
test("navigation distinguishes left, right, straight and finish", () => {
  const p = [
    { x: 0, z: 100 },
    { x: 0, z: 0 },
    { x: 100, z: 0 },
  ];
  assert.equal(turnAt(p, 1), "right");
  p[2].x = -100;
  assert.equal(turnAt(p, 1), "left");
  p[2] = { x: 0, z: -100 };
  assert.equal(turnAt(p, 1), "straight");
  assert.equal(turnAt(p, 2), "finish");
});
test("traffic signals never grant both axes green", () => {
  for (let t = 0; t < 96; t += 0.25)
    assert.ok(!(lightGreen(t, "x") && lightGreen(t, "z")));
  assert.equal(lightGreen(14, "x"), false);
  assert.equal(lightGreen(14, "z"), false);
  assert.equal(lightGreen(17, "x"), true);
});
test("three minor mistakes or a dangerous violation fails the exam", () => {
  let state = { mistakes: 0 };
  state = applyViolation(state);
  assert.equal(state.failed, false);
  state = applyViolation(state);
  assert.equal(state.failed, false);
  state = applyViolation(state);
  assert.equal(state.failed, true);
  assert.equal(state.score, 0);
  assert.equal(applyViolation({ mistakes: 0 }, true).failed, true);
});
import { advanceVehicle } from "../src/driving.js";
test("braking stops without unexpectedly reversing", () => {
  let state = { speed: 8, yaw: 0, steering: 0 };
  for (let i = 0; i < 180; i++)
    state = advanceVehicle(state, { brake: true, steer: 0 }, 1 / 60);
  assert.equal(state.speed, 0);
});
test("reverse accelerator moves backwards and steering returns smoothly", () => {
  const reverse = advanceVehicle(
    { speed: 0, yaw: 0, steering: 0.2 },
    { reverse: true, throttle: true, steer: 0 },
    0.1,
  );
  assert.ok(reverse.speed < 0);
  assert.ok(reverse.dz > 0);
  assert.ok(reverse.steering < 0.2 && reverse.steering > 0);
});
test("vehicle movement is approximately independent of frame rate", () => {
  function run(dt) {
    let s = { speed: 0, yaw: 0, steering: 0 },
      z = 0;
    for (let t = 0; t < 3 - dt / 2; t += dt) {
      s = advanceVehicle(s, { throttle: true, steer: 0 }, dt);
      z += s.dz;
    }
    return { s, z };
  }
  const a = run(1 / 60),
    b = run(1 / 120);
  assert.ok(Math.abs(a.s.speed - b.s.speed) < 0.02);
  assert.ok(Math.abs(a.z - b.z) < 0.1);
});
