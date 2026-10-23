import * as THREE from "three";
import { clamp01, ease } from "../shared/player.js";
import { sceneColors } from "../shared/theme.js";

export const LAYER_X = [-10, -5, 0, 5, 10]; // where each layer sits, left to right

export const toColor = (v) => (Array.isArray(v) ? new THREE.Color(...v) : new THREE.Color(v));
const IDLE = toColor(sceneColors.idle);
const IDLE_TILE = toColor(sceneColors.idleTile);
const LAYER_COLORS = sceneColors.layers.map(toColor);
const HOT = toColor(sceneColors.hot);
const INK = toColor(sceneColors.ink);
const WHITE = new THREE.Color(1, 1, 1);
const WIN = toColor(sceneColors.win);
const AMBIENT_LINE = toColor(sceneColors.ambient);
const MAX_CONNS = 6000;

const dummy = new THREE.Object3D();
const tmpColor = new THREE.Color();

// same random layout every time
function mulberry32(seed) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function instanced(scene, positions, size, color, depth = size) {
  const mesh = new THREE.InstancedMesh(
    new THREE.BoxGeometry(depth, size, size),
    new THREE.MeshBasicMaterial({ toneMapped: false }),
    positions.length,
  );
  positions.forEach((p, i) => {
    dummy.position.copy(p);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
    mesh.setColorAt(i, color);
  });
  scene.add(mesh);
  return mesh;
}

function digitSprite(d) {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const g = c.getContext("2d");
  g.fillStyle = "#fff";
  g.font = "600 92px ui-sans-serif, -apple-system, system-ui, sans-serif";
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillText(String(d), 64, 70);
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false, toneMapped: false }),
  );
  sprite.scale.set(0.75, 0.75, 1);
  return sprite;
}

function glowTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const g = c.getContext("2d");
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, "rgba(255,255,255,1)");
  grad.addColorStop(0.3, "rgba(255,255,255,0.5)");
  grad.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}

function dynamicGeometry(perItem) {
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(MAX_CONNS * perItem);
  const col = new Float32Array(MAX_CONNS * perItem);
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
  geo.setAttribute("color", new THREE.BufferAttribute(col, 3).setUsage(THREE.DynamicDrawUsage));
  return { geo, pos, col };
}

const additive = { vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false };

export function createNetwork3d(scene, layers) {
  const rand = mulberry32(7);
  const nodes = [];
  const meshes = [];

  // the 28x28 pixel grid
  const s = 0.24;
  nodes.push(Array.from({ length: 784 }, (_, i) => new THREE.Vector3(LAYER_X[0], (13.5 - Math.floor(i / 28)) * s, (i % 28 - 13.5) * s)));
  meshes.push(instanced(scene, nodes[0], 0.2, IDLE_TILE, 0.03));

  // the hidden layers
  layers.slice(0, -1).forEach((layer, l) => {
    const r = 0.42 * Math.cbrt(layer.out);
    const pts = Array.from(
      { length: layer.out },
      () => new THREE.Vector3(LAYER_X[l + 1] + (rand() - 0.5) * r * 0.7, (rand() - 0.5) * 2 * r, (rand() - 0.5) * 2 * r),
    );
    nodes.push(pts);
    meshes.push(instanced(scene, pts, 0.13, IDLE));
  });

  // the 0-9 answers
  const out = Array.from({ length: 10 }, (_, d) => new THREE.Vector3(LAYER_X[4], (4.5 - d) * 0.75, 0));
  nodes.push(out);
  meshes.push(instanced(scene, out, 0.3, IDLE));
  const labels = out.map((p, d) => {
    const sprite = digitSprite(d);
    sprite.position.set(p.x + 0.75, p.y, p.z);
    scene.add(sprite);
    return sprite;
  });

  // faint lines in the background
  const ambient = [];
  layers.forEach((layer, k) => {
    const per = k === layers.length - 1 ? 6 : 2;
    for (let j = 0; j < layer.out; j++) {
      const row = j * layer.in;
      const idx = Array.from({ length: layer.in }, (_, i) => i)
        .sort((a, b) => Math.abs(layer.w[row + b]) - Math.abs(layer.w[row + a]))
        .slice(0, per);
      for (const i of idx) {
        const a = nodes[k][i], b = nodes[k + 1][j];
        ambient.push(a.x, a.y, a.z, b.x, b.y, b.z);
      }
    }
  });
  const ambientGeo = new THREE.BufferGeometry();
  ambientGeo.setAttribute("position", new THREE.Float32BufferAttribute(ambient, 3));
  scene.add(
    new THREE.LineSegments(
      ambientGeo,
      new THREE.LineBasicMaterial({ color: AMBIENT_LINE, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }),
    ),
  );

  // the moving lines and dots
  const lines = dynamicGeometry(6);
  scene.add(new THREE.LineSegments(lines.geo, new THREE.LineBasicMaterial(additive)));
  const pulses = dynamicGeometry(3);
  scene.add(new THREE.Points(pulses.geo, new THREE.PointsMaterial({ ...additive, size: 0.22, map: glowTexture() })));

  function updateSignals(run, ps) {
    let n = 0, m = 0;
    if (run) {
      run.conns.forEach((conns, k) => {
        const p = ps[k + 1];
        const color = k === layers.length - 1 ? WIN : LAYER_COLORS[k];
        const from = k === 0 ? color : LAYER_COLORS[k - 1];
        for (const c of conns) {
          if (n >= MAX_CONNS) break;
          const lp = clamp01((p - c.delay) / 0.55);
          if (lp <= 0) continue;
          const a = nodes[k][c.from], b = nodes[k + 1][c.to];
          const e = ease(lp);
          const x = a.x + (b.x - a.x) * e, y = a.y + (b.y - a.y) * e, z = a.z + (b.z - a.z) * e;
          lines.pos.set([a.x, a.y, a.z, x, y, z], n * 6);
          const bright = (0.015 + 0.2 * c.s * c.s) * (lp < 1 ? 1 : 0.6);
          const tail = bright * 0.4;
          lines.col.set([from.r * tail, from.g * tail, from.b * tail, color.r * bright, color.g * bright, color.b * bright], n * 6);
          n++;
          if (lp < 1) {
            const pb = 0.25 + 1.1 * c.s;
            pulses.pos.set([x, y, z], m * 3);
            pulses.col.set([color.r * pb, color.g * pb, color.b * pb], m * 3);
            m++;
          }
        }
      });
    }
    for (const [buf, count] of [[lines, n * 2], [pulses, m]]) {
      buf.geo.setDrawRange(0, count);
      buf.geo.attributes.position.needsUpdate = true;
      buf.geo.attributes.color.needsUpdate = true;
    }
  }

  function updateNeurons(run, ps) {
    const input = meshes[0];
    for (let i = 0; i < 784; i++) {
      const v = run ? run.pixels[i] * clamp01(ps[0] * 1.4 - Math.floor(i / 28) / 28) : 0;
      input.setColorAt(i, tmpColor.copy(IDLE_TILE).lerp(INK, v).multiplyScalar(1 + 0.4 * v));
    }
    input.instanceColor.needsUpdate = true;

    layers.slice(0, -1).forEach((_, l) => {
      const mesh = meshes[l + 1];
      const glow = clamp01((ps[l + 1] - 0.45) / 0.55);
      nodes[l + 1].forEach((p, i) => {
        const a = run ? (run.acts[l][i] / run.maxes[l]) * glow : 0;
        if (a > 0.02) tmpColor.copy(LAYER_COLORS[l]).lerp(HOT, a * a).multiplyScalar(0.2 + 1.5 * a);
        else tmpColor.copy(IDLE);
        mesh.setColorAt(i, tmpColor);
        dummy.position.copy(p);
        dummy.scale.setScalar(1 + 0.9 * a);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
      });
      mesh.instanceColor.needsUpdate = true;
      mesh.instanceMatrix.needsUpdate = true;
    });

    const outMesh = meshes.at(-1);
    const pOut = ps.at(-1);
    const grow = ease(clamp01((pOut - 0.35) / 0.65));
    out.forEach((p, d) => {
      const prob = run ? run.probs[d] * grow : 0;
      const isWin = run && pOut === 1 && d === run.winner;
      if (prob > 0.01) tmpColor.copy(isWin ? WIN : LAYER_COLORS.at(-1)).multiplyScalar(0.25 + 1.8 * prob);
      else tmpColor.copy(IDLE);
      outMesh.setColorAt(d, tmpColor);
      dummy.position.copy(p);
      dummy.scale.setScalar(1 + 0.6 * prob);
      dummy.updateMatrix();
      outMesh.setMatrixAt(d, dummy.matrix);
      labels[d].material.color.copy(isWin ? WIN : WHITE).multiplyScalar(isWin ? 1.8 : 0.22 + 1.2 * prob);
    });
    outMesh.instanceColor.needsUpdate = true;
    outMesh.instanceMatrix.needsUpdate = true;
  }

  return {
    update(run, ps) {
      updateNeurons(run, ps);
      updateSignals(run, ps);
    },
  };
}
