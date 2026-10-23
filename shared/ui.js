import { SPEEDS } from "./player.js";

const $ = (id) => document.getElementById(id);

export function showThinking() {
  $("result-digit").textContent = "–";
  $("result-digit").classList.remove("live");
  $("result-conf").textContent = "thinking";
  $("result-note").textContent = "";
}

export function showResult(probs) {
  const [[p1, d1], [p2, d2]] = probs.map((p, d) => [p, d]).sort((a, b) => b[0] - a[0]);
  $("result-digit").textContent = d1;
  $("result-digit").classList.add("live");
  $("result-conf").textContent = `${(p1 * 100).toFixed(1)}% confident`;
  $("result-note").textContent = p2 > 0.1 ? `Torn — ${(p2 * 100).toFixed(0)}% says it's a ${d2}` : "";
}

export function resetResult() {
  $("result-digit").textContent = "?";
  $("result-digit").classList.remove("live");
  $("result-conf").textContent = "waiting for a digit";
  $("result-note").textContent = "";
}

export function setLoopButton(on) {
  $("loop").classList.toggle("active", on);
  $("loop").setAttribute("aria-pressed", on);
}

export function bindControls(player, pad, { onClear = () => {}, keys = {} } = {}) {
  const clearAll = () => {
    player.clear();
    pad.clear();
    resetResult();
    onClear();
  };
  const toggleLoop = () => player.setLooping(!player.looping);

  $("clear").addEventListener("click", clearAll);
  $("replay").addEventListener("click", player.replay);
  $("sample").addEventListener("click", player.loadSample);
  $("loop").addEventListener("click", toggleLoop);
  $("speed").addEventListener("input", (e) => {
    const speed = SPEEDS[+e.target.value];
    $("speed-label").textContent = `${speed}×`;
    player.setSpeed(speed);
  });

  const shortcuts = { c: clearAll, r: player.loadSample, l: toggleLoop, " ": player.replay, ...keys };
  window.addEventListener("keydown", (e) => {
    const action = shortcuts[e.key.toLowerCase()];
    if (!action || e.target.tagName === "INPUT") return;
    e.preventDefault();
    action();
  });
}
