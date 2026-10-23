import { predict } from "./network.js";

export const SPEEDS = [0.25, 0.5, 1, 2];
export const clamp01 = (v) => Math.min(1, Math.max(0, v));
export const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

export function createPlayer({ layers, samples, topK, phases, holdMs, onStart, onResult, onSample, onLoopChange }) {
  const total = phases.reduce((a, b) => a + b, 0);
  let run = null; // the digit being shown right now
  let speed = SPEEDS[1];
  let looping = false;
  let loopTimer = null;
  let lastSample = -1;

  function start(pixels) {
    clearTimeout(loopTimer);
    run = { ...predict(layers, pixels, topK), start: performance.now(), elapsed: 0, resultShown: false };
    onStart(run);
  }

  function loadSample() {
    if (!samples.length) return;
    let i;
    do i = Math.floor(Math.random() * samples.length);
    while (i === lastSample && samples.length > 1);
    lastSample = i;
    onSample(samples[i].pixels);
    start(Float32Array.from(samples[i].pixels, (v) => v / 255));
  }

  function setLooping(on) {
    looping = on;
    clearTimeout(loopTimer);
    onLoopChange(on);
    if (on && (!run || run.resultShown)) loadSample();
  }

  function setSpeed(s) {
    speed = s;
    if (run) run.start = performance.now() - run.elapsed / speed;
  }

  // how far along each step is (0 to 1)
  function tick(now) {
    if (!run) return phases.map(() => 0);
    run.elapsed = (now - run.start) * speed;
    let t = run.elapsed;
    const ps = phases.map((d) => {
      const v = clamp01(t / d);
      t -= d;
      return v;
    });
    if (ps.at(-1) === 1 && !run.resultShown) {
      run.resultShown = true;
      if (looping) loopTimer = setTimeout(loadSample, holdMs);
      onResult(run);
    }
    return ps;
  }

  return {
    get run() { return run; },
    get speed() { return speed; },
    get looping() { return looping; },
    get progress() { return run ? clamp01(run.elapsed / total) : 0; },
    start,
    replay: () => run && start(run.pixels),
    loadSample,
    setLooping,
    setSpeed,
    tick,
    clear() {
      setLooping(false);
      run = null;
    },
  };
}
