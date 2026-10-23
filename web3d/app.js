import { loadModel } from "../shared/network.js";
import { createPad } from "../shared/pad.js";
import { createPlayer } from "../shared/player.js";
import { bindControls, setLoopButton, showResult, showThinking } from "../shared/ui.js";
import { createStage } from "./stage.js";
import { createNetwork3d } from "./network3d.js";
import { createCameraRig } from "./camera.js";
import { createHud } from "./hud.js";

const TOP_K = [3, 4, 5, 12]; // how many lines to draw into each neuron
const INPUT_MS = 600; // how long each step takes (ms)
const LAYER_MS = 950;
const LOOP_HOLD_MS = 900;
const FILL_WITH_UI = 0.55;
const FILL_CLEAN = 0.6;

const $ = (id) => document.getElementById(id);

const stage = createStage($("scene"));
const rig = createCameraRig(stage.camera, $("scene"), {
  onModeChange(mode) {
    $("camera").firstChild.textContent = `${mode[0].toUpperCase()}${mode.slice(1)} `;
    $("camera").classList.toggle("active", mode !== "manual");
  },
});

const [model, samples] = await Promise.all([loadModel("weights.json"), fetch("samples.json").then((r) => r.json())]);
$("accuracy").textContent = `${(model.accuracy * 100).toFixed(1)}%`;

const network = createNetwork3d(stage.scene, model.layers);
const hud = createHud(model.layers);
const pad = createPad($("pad"), $("pad-hint"), {
  onStroke: () => player.setLooping(false),
  onDigit: (pixels) => player.start(pixels),
});
const player = createPlayer({
  layers: model.layers,
  samples,
  topK: TOP_K,
  phases: [INPUT_MS, ...model.layers.map(() => LAYER_MS)],
  holdMs: LOOP_HOLD_MS,
  onStart: showThinking,
  onResult: (run) => showResult(run.probs),
  onSample: pad.showSample,
  onLoopChange: setLoopButton,
});

function toggleHud() {
  const clean = document.body.classList.toggle("clean");
  rig.setFill(clean ? FILL_CLEAN : FILL_WITH_UI);
}

bindControls(player, pad, { onClear: hud.reset, keys: { v: rig.next, h: toggleHud } });
$("camera").addEventListener("click", rig.next);
$("hide").addEventListener("click", toggleHud);

function resize() {
  stage.resize();
  pad.resize();
}
window.addEventListener("resize", resize);
resize();

let lastFrame = performance.now();
function frame(now) {
  const dt = Math.min(0.1, (now - lastFrame) / 1000);
  lastFrame = now;
  const ps = player.tick(now);
  network.update(player.run, ps);
  rig.update(player.run, ps, dt, now / 1000);
  hud.update(player.run, ps, player.progress);
  stage.render();
  requestAnimationFrame(frame);
}

rig.setMode("orbit");
requestAnimationFrame(frame);
player.setLooping(true);
