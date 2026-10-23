import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { ease } from "../shared/player.js";

const MODES = ["orbit", "follow", "manual"];
const ORBIT_SECONDS = 40; // seconds for one full spin
const NETWORK_HALF_LENGTH = 11.5;

// camera spots for follow mode
const POSES = [
  { pos: [-18, 4, 9], target: [-10, 0, 0] },
  { pos: [-13, 4.5, 12], target: [-7, 0, 0] },
  { pos: [-7, 6, 15], target: [-2.5, 0, 0] },
  { pos: [-1, 6, 16], target: [2, 0, 0] },
  { pos: [5, 4.5, 14], target: [6, 0, 0] },
  { pos: [16, 2.5, 9], target: [9.5, 0, 0] },
].map((p) => ({ pos: new THREE.Vector3(...p.pos), target: new THREE.Vector3(...p.target) }));

export function createCameraRig(camera, canvas, { onModeChange }) {
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.minDistance = 4;
  controls.maxDistance = 60;
  controls.addEventListener("start", () => setMode("manual"));

  const target = new THREE.Vector3(-10, 0, 0);
  const wantPos = new THREE.Vector3();
  const wantTarget = new THREE.Vector3();
  camera.position.set(-18, 4, 9);
  camera.lookAt(target);

  let mode = "orbit";
  let angle = 0;
  let fill = 0.6;

  function orbitRadius() {
    const tanHalfWidth = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.aspect;
    return Math.max(16, NETWORK_HALF_LENGTH / (tanHalfWidth * fill));
  }

  function setMode(m) {
    mode = m;
    if (m === "orbit") angle = Math.atan2(camera.position.x, camera.position.z);
    if (m === "manual") controls.target.copy(target);
    onModeChange(m);
  }

  function update(run, ps, dt, time) {
    if (mode === "manual") {
      controls.update();
      return;
    }
    if (mode === "follow" && run) {
      let i = ps.findIndex((p) => p < 1);
      if (i < 0) i = ps.length - 1;
      const t = ease(ps[i]);
      wantPos.lerpVectors(POSES[i].pos, POSES[i + 1].pos, t);
      wantTarget.lerpVectors(POSES[i].target, POSES[i + 1].target, t);
    } else {
      angle += (dt * 2 * Math.PI) / ORBIT_SECONDS;
      const r = orbitRadius();
      wantPos.set(Math.sin(angle) * r, 5 + Math.sin(time * 0.2) * 2, Math.cos(angle) * r);
      wantTarget.set(0, 0, 0);
    }
    wantPos.y += Math.sin(time * 0.35) * 0.4;
    const k = 1 - Math.exp(-dt * 2.2);
    camera.position.lerp(wantPos, k);
    target.lerp(wantTarget, k);
    camera.lookAt(target);
  }

  return {
    setMode,
    next: () => setMode(MODES[(MODES.indexOf(mode) + 1) % MODES.length]),
    setFill: (f) => (fill = f),
    update,
  };
}
