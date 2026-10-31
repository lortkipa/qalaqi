import * as THREE from "three";
// Independent rear-facing cameras; rendered into textures and reflected horizontally.
// One renderer/context avoids three extra WebGL contexts and duplicate scene assets.
export function createMirrors(renderer, scene, vehicle) {
  const overlay = new THREE.Scene();
  const ortho = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const panel = new THREE.Mesh(
    new THREE.PlaneGeometry(2, 2),
    new THREE.MeshBasicMaterial({
      depthTest: false,
      depthWrite: false,
      toneMapped: false,
    }),
  );
  overlay.add(panel);
  const specs = [
    { id: "mirror-rear", x: 0, angle: 0, fov: 48 },
    { id: "mirror-left", x: -1.05, angle: -0.28, fov: 60 },
    { id: "mirror-right", x: 1.05, angle: 0.28, fov: 60 },
  ].map((s) => ({
    ...s,
    camera: new THREE.PerspectiveCamera(s.fov, 2.5, 0.2, 250),
    target: new THREE.WebGLRenderTarget(384, 160),
    rect: null,
  }));
  for (const s of specs) {
    s.target.texture.repeat.x = -1;
    s.target.texture.offset.x = 1;
  }
  function resize() {
    for (const s of specs) {
      s.rect = document.getElementById(s.id).getBoundingClientRect();
      s.camera.aspect = s.rect.width / s.rect.height;
      s.camera.updateProjectionMatrix();
    }
  }
  resize();
  let last = -Infinity;
  return {
    resize,
    render(time, yaw) {
      const visible = vehicle.visible;
      const previousAutoClear = renderer.autoClear;
      if (time - last > 1 / 20 || time < last) {
        last = time;
        vehicle.visible = false;
        const shadows = renderer.shadowMap.autoUpdate;
        renderer.shadowMap.autoUpdate = false;
        for (const s of specs) {
          s.camera.position
            .set(s.x, 1.8, 0.6)
            .applyAxisAngle(THREE.Object3D.DEFAULT_UP, yaw)
            .add(vehicle.position);
          const direction = new THREE.Vector3(
            Math.sin(s.angle),
            0,
            Math.cos(s.angle),
          ).applyAxisAngle(THREE.Object3D.DEFAULT_UP, yaw);
          s.camera.lookAt(s.camera.position.clone().add(direction));
          renderer.setRenderTarget(s.target);
          renderer.render(scene, s.camera);
        }
        renderer.setRenderTarget(null);
        renderer.shadowMap.autoUpdate = shadows;
        vehicle.visible = visible;
      }
      renderer.autoClear = false;
      renderer.setScissorTest(true);
      const size = renderer.getSize(new THREE.Vector2());
      for (const s of specs) {
        const r = s.rect;
        if (!r || !r.width) continue;
        const y = size.y - r.bottom;
        renderer.setViewport(r.left, y, r.width, r.height);
        renderer.setScissor(r.left, y, r.width, r.height);
        panel.material.map = s.target.texture;
        renderer.render(overlay, ortho);
      }
      renderer.setScissorTest(false);
      renderer.setViewport(0, 0, size.x, size.y);
      renderer.autoClear = previousAutoClear;
    },
  };
}
