import { clamp01, ease } from "../shared/player.js";

const $ = (id) => document.getElementById(id);

export function createHud(layers) {
  const captions = [
    "Reading 784 pixels",
    ...layers.slice(0, -1).map((layer, l) => `Hidden layer ${l + 1} · ${layer.out} neurons`),
    "Output · each digit votes",
  ];

  const bars = Array.from({ length: 10 }, (_, d) => {
    const li = document.createElement("li");
    li.innerHTML = `<span>${d}</span><span class="track"><span class="fill"></span></span><span class="pct"></span>`;
    $("bars").append(li);
    return { li, fill: li.querySelector(".fill"), pct: li.querySelector(".pct") };
  });

  function update(run, ps, progress) {
    $("progress-bar").style.width = `${progress * 100}%`;
    if (!run) {
      $("caption").textContent = "Draw a digit — or press R for a random one";
      return;
    }
    const i = ps.findIndex((p) => p < 1);
    let text = i < 0 ? `It's a ${run.winner}` : captions[i];
    if (i > 0 && i <= run.acts.length && ps[i] > 0.6) {
      const fired = run.acts[i - 1].reduce((n, v) => n + (v > 0), 0);
      text += ` · ${fired} firing`;
    }
    $("caption").textContent = text;

    const grow = ease(clamp01((ps.at(-1) - 0.35) / 0.65));
    bars.forEach((bar, d) => {
      const prob = run.probs[d] * grow;
      bar.fill.style.width = `${prob * 100}%`;
      bar.pct.textContent = grow > 0 ? `${(prob * 100).toFixed(1)}%` : "";
      bar.li.classList.toggle("win", ps.at(-1) === 1 && d === run.winner);
    });
  }

  function reset() {
    for (const bar of bars) {
      bar.fill.style.width = "0";
      bar.pct.textContent = "";
      bar.li.classList.remove("win");
    }
  }

  return { update, reset };
}
