import { canvasColors } from "../shared/theme.js";

const { win: POSITIVE, negative: NEGATIVE } = canvasColors;
const $ = (id) => document.getElementById(id);

export function bindNeuronTooltip(canvas, renderer, layer, getRun) {
  const tooltip = $("tooltip");
  const tip = $("tooltip-canvas").getContext("2d");
  let hovered = -1;

  canvas.addEventListener("mousemove", (e) => {
    const r = canvas.getBoundingClientRect();
    const mx = e.clientX - r.left, my = e.clientY - r.top;
    hovered = renderer.neuronAt(mx, my);
    if (hovered < 0) {
      tooltip.hidden = true;
      return;
    }
    const w = layer.w.subarray(hovered * layer.in, (hovered + 1) * layer.in);
    const max = Math.max(...w.map(Math.abs));
    const img = tip.createImageData(28, 28);
    w.forEach((v, k) => {
      const a = Math.abs(v) / max;
      const c = v > 0 ? POSITIVE : NEGATIVE;
      img.data.set([c[0] * a, c[1] * a, c[2] * a, 255], k * 4);
    });
    tip.putImageData(img, 0, 0);

    const run = getRun();
    const firing = run ? ` · firing ${((run.acts[0][hovered] / run.maxes[0]) * 100).toFixed(0)}%` : "";
    $("tooltip-title").textContent = `neuron ${hovered}${firing}`;
    const { W, H } = renderer.size();
    tooltip.hidden = false;
    tooltip.style.left = `${Math.min(mx + 18, W - 180)}px`;
    tooltip.style.top = `${Math.min(my + 18, H - 220)}px`;
  });
  canvas.addEventListener("mouseleave", () => {
    hovered = -1;
    tooltip.hidden = true;
  });

  return () => hovered;
}
