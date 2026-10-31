// Units: metres, seconds, radians. Bicycle model with a 2.65 m wheelbase.
export function advanceVehicle(state, input, dt) {
  const limit = 0.52 / (1 + Math.abs(state.speed) * 0.055);
  const target = input.steer * limit;
  const steering =
    state.steering + (target - state.steering) * (1 - Math.exp(-5 * dt));
  let speed = state.speed;
  const direction = input.reverse ? -1 : 1;
  if (input.brake || input.handbrake) {
    speed =
      Math.sign(speed) *
      Math.max(0, Math.abs(speed) - (input.handbrake ? 12 : 7.5) * dt);
  } else if (input.throttle) {
    // Shifting is permitted only at rest by the UI.
    speed += direction * Math.max(1.1, 3.1 - Math.abs(speed) * 0.07) * dt;
  } else {
    speed =
      Math.sign(speed) *
      Math.max(0, Math.abs(speed) - (0.22 + speed * speed * 0.0015) * dt);
  }
  speed = Math.max(-4, Math.min(26, speed));
  const yaw = state.yaw + (speed / 2.65) * Math.tan(steering) * dt;
  return {
    speed,
    steering,
    yaw,
    dx: -Math.sin(yaw) * speed * dt,
    dz: -Math.cos(yaw) * speed * dt,
  };
}
