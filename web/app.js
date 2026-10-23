import { loadModel } from "../shared/network.js";
import { createPad } from "../shared/pad.js";
import { createPlayer } from "../shared/player.js";
import { bindControls, setLoopButton, showResult, showThinking } from "../shared/ui.js";
import { createRenderer2d } from "./render2d.js";
import { bindNeuronTooltip } from "./tooltip.js";

const TOP_K = [4, 6, 8]; // how many lines to draw into each neuron
const PHASES = [500, 1100, 1000, 1000]; // how long each step takes (ms)
const LOOP_HOLD_MS = 700;

const $ = (id) => document.getElementById(id);

const [model, samples] = await Promise.all([loadModel("weights.json"), fetch("samples.json").then((r) => r.json())]);
$("accuracy").textContent = `${(model.accuracy * 100).toFixed(1)}%`;

const renderer = createRenderer2d($("net"), model.layers);
const pad = createPad($("pad"), $("pad-hint"), {
  onStroke: () => player.setLooping(false),
  onDigit: (pixels) => player.start(pixels),
});
const player = createPlayer({
  layers: model.layers,
  samples,
  topK: TOP_K,
  phases: PHASES,
  holdMs: LOOP_HOLD_MS,
  onStart: showThinking,
  onResult: (run) => showResult(run.probs),
  onSample: pad.showSample,
  onLoopChange: setLoopButton,
});
const hovered = bindNeuronTooltip($("net"), renderer, model.layers[0], () => player.run);

bindControls(player, pad);

function resize() {
  renderer.resize();
  pad.resize();
}
window.addEventListener("resize", resize);
resize();

function frame(now) {
  const ps = player.tick(now);
  renderer.draw(player.run, ps, { speed: player.speed, progress: player.progress, hovered: hovered() });
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
player.setLooping(true);
