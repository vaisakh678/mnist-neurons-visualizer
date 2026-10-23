import { clamp01, ease } from "../shared/player.js";
import { canvasColors as C } from "../shared/theme.js";

const LAYER_COLORS = C.layers;
const WIN = C.win;
const HIDDEN_X = [0.44, 0.64]; // where the columns go across the screen
const CAPTIONS = [
  "Reading 784 pixels…",
  "Hidden layer 1 — neurons detecting strokes and edges",
  "Hidden layer 2 — combining strokes into shapes",
  "Output — each digit votes",
];

const rgba = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;
const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);

export function createRenderer2d(canvas, layers) {
  const net = canvas.getContext("2d");
  const hidden = layers.slice(0, -1).map((l) => l.out);
  let L = null;

  function resize() {
    const dpr = window.devicePixelRatio || 1;
    const W = canvas.clientWidth;
    const H = canvas.clientHeight;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    net.setTransform(dpr, 0, 0, dpr, 0, 0);

    const top = 90, bottom = 70;
    const usable = H - top - bottom;
    const mid = top + usable / 2;

    const grid = Math.min(usable * 0.56, W * 0.2);
    const cell = grid / 28;
    const gx = W * 0.05;
    const gy = mid - grid / 2;
    const input = [];
    for (let i = 0; i < 784; i++) input.push({ x: gx + (i % 28 + 0.5) * cell, y: gy + (Math.floor(i / 28) + 0.5) * cell });

    const column = (n, cx) => {
      const cols = Math.ceil(n / 32);
      const rows = n / cols;
      const dy = Math.min(19, (usable * 0.8) / rows);
      const dx = dy * 1.05;
      const pts = [];
      for (let i = 0; i < n; i++) {
        const c = i % cols, r = Math.floor(i / cols);
        pts.push({ x: cx + (c - (cols - 1) / 2) * dx, y: mid + (r - (rows - 1) / 2) * dy + (c % 2 ? dy / 2 : 0) - dy / 4 });
      }
      return { pts, r: dy * 0.32 };
    };

    const outGap = Math.min(46, (usable * 0.75) / 10);
    L = {
      W, H, cell, grid, gx, gy, input,
      hidden: hidden.map((n, l) => column(n, W * HIDDEN_X[l])),
      out: Array.from({ length: 10 }, (_, i) => ({ x: W * 0.8, y: mid + (i - 4.5) * outGap })),
      outR: Math.min(17, outGap * 0.36),
    };
  }

  function label(text, x, y, color = C.muted, align = "center") {
    net.fillStyle = color;
    net.font = `500 11px ui-monospace, "SF Mono", Menlo, monospace`;
    net.textAlign = align;
    net.fillText(text, x, y);
  }

  function drawConnections(conns, from, to, p, color) {
    net.globalCompositeOperation = "lighter";
    for (const c of conns) {
      const lp = clamp01((p - c.delay) / 0.55);
      if (lp <= 0) continue;
      const a = from[c.from], b = to[c.to];
      const x = a.x + (b.x - a.x) * ease(lp);
      const y = a.y + (b.y - a.y) * ease(lp);
      net.strokeStyle = rgba(color, (0.06 + 0.32 * c.s) * (lp < 1 ? 1 : 0.75));
      net.lineWidth = 0.6 + 1.4 * c.s;
      net.beginPath();
      net.moveTo(a.x, a.y);
      net.lineTo(x, y);
      net.stroke();
      if (lp < 1) {
        net.fillStyle = rgba([255, 255, 255], 0.5 + 0.5 * c.s);
        net.beginPath();
        net.arc(x, y, 1.2 + 2 * c.s, 0, Math.PI * 2);
        net.fill();
      }
    }
    net.globalCompositeOperation = "source-over";
  }

  function idleCircle() {
    net.fillStyle = C.idleFill;
    net.fill();
    net.strokeStyle = C.idleStroke;
    net.lineWidth = 1;
    net.stroke();
  }

  function drawNeurons(layer, acts, max, p, color, hovered) {
    const glow = clamp01((p - 0.45) / 0.55);
    layer.pts.forEach((pt, i) => {
      const a = acts ? (acts[i] / max) * glow : 0;
      net.beginPath();
      net.arc(pt.x, pt.y, layer.r, 0, Math.PI * 2);
      if (a > 0.02) {
        net.shadowColor = rgba(color, 0.9);
        net.shadowBlur = 16 * a;
        net.fillStyle = rgba(mix(color, [255, 255, 255], a * a), 0.25 + 0.75 * a);
        net.fill();
        net.shadowBlur = 0;
      } else {
        idleCircle();
      }
      if (i === hovered) {
        net.strokeStyle = rgba(WIN, 0.9);
        net.lineWidth = 2;
        net.stroke();
      }
    });
  }

  function drawInput(run, p) {
    net.fillStyle = C.gridBg;
    net.fillRect(L.gx, L.gy, L.grid, L.grid);
    if (run) {
      for (let i = 0; i < 784; i++) {
        const row = Math.floor(i / 28);
        const v = run.pixels[i] * clamp01(p * 1.4 - row / 28);
        if (v < 0.02) continue;
        net.fillStyle = rgba(mix(C.inkLow, C.inkHigh, v), v);
        net.fillRect(L.gx + (i % 28) * L.cell, L.gy + row * L.cell, L.cell - 0.5, L.cell - 0.5);
      }
    }
    net.strokeStyle = C.idleStroke;
    net.lineWidth = 1;
    net.strokeRect(L.gx - 0.5, L.gy - 0.5, L.grid + 1, L.grid + 1);
  }

  function drawOutputs(run, p) {
    const grow = ease(clamp01((p - 0.35) / 0.65));
    L.out.forEach((pt, d) => {
      const prob = run ? run.probs[d] * grow : 0;
      const isWin = run && p === 1 && d === run.winner;
      const color = isWin ? WIN : LAYER_COLORS.at(-1);

      net.beginPath();
      net.arc(pt.x, pt.y, L.outR, 0, Math.PI * 2);
      if (prob > 0.01) {
        net.shadowColor = rgba(color, 0.9);
        net.shadowBlur = 24 * prob;
        net.fillStyle = rgba(color, 0.2 + 0.8 * prob);
        net.fill();
        net.shadowBlur = 0;
      } else {
        idleCircle();
      }

      net.fillStyle = isWin || prob > 0.3 ? "#06080d" : C.digit;
      net.font = `700 ${Math.round(L.outR * 0.95)}px ui-monospace, "SF Mono", Menlo, monospace`;
      net.textAlign = "center";
      net.textBaseline = "middle";
      net.fillText(String(d), pt.x, pt.y + 1);
      net.textBaseline = "alphabetic";

      const barX = pt.x + L.outR + 14;
      const barW = Math.min(170, L.W - barX - 70);
      net.fillStyle = C.track;
      net.fillRect(barX, pt.y - 3, barW, 6);
      if (prob > 0) {
        net.fillStyle = rgba(color, isWin ? 1 : 0.85);
        net.fillRect(barX, pt.y - 3, Math.max(1, barW * prob), 6);
      }
      if (run && grow > 0) {
        const pctColor = isWin ? rgba(WIN, 1) : prob > 0.01 ? C.text : C.dim;
        label(`${(prob * 100).toFixed(1)}%`, barX + barW + 8, pt.y + 4, pctColor, "left");
      }
    });
  }

  function drawCaptions(run, ps, speed, progress) {
    const capY = L.H - 34;
    const fired = (acts) => acts.reduce((n, v) => n + (v > 0), 0);
    label("INPUT · 28×28 PIXELS", L.gx + L.grid / 2, capY);
    L.hidden.forEach((layer, l) => {
      const x = layer.pts[0].x + 15;
      label(`HIDDEN ${l + 1} · ${hidden[l]}`, x, capY);
      if (run && ps[l + 1] === 1) label(`${fired(run.acts[l])} firing`, x, capY + 16, rgba(LAYER_COLORS[l], 0.8));
    });
    label("OUTPUT · 0–9", L.out[0].x + 40, capY);

    const i = ps.findIndex((p) => p < 1);
    const text = !run ? "Draw a digit on the left — or press R for a random one" : CAPTIONS[i] ?? `It's a ${run.winner}`;
    net.fillStyle = C.text;
    net.font = `500 16px ui-sans-serif, -apple-system, system-ui, sans-serif`;
    net.textAlign = "left";
    net.fillText(text, L.gx, 52);
    if (run) {
      net.fillStyle = C.track;
      net.fillRect(L.gx, 66, 220, 2);
      net.fillStyle = rgba(LAYER_COLORS[0], 0.9);
      net.fillRect(L.gx, 66, 220 * progress, 2);
      label(`${speed}× speed`, L.gx + 232, 70, C.muted, "left");
    }
  }

  function draw(run, ps, { speed, progress, hovered = -1 }) {
    net.clearRect(0, 0, L.W, L.H);
    drawInput(run, ps[0]);
    if (run) {
      const chain = [L.input, ...L.hidden.map((h) => h.pts), L.out];
      run.conns.forEach((conns, k) => drawConnections(conns, chain[k], chain[k + 1], ps[k + 1], k === run.conns.length - 1 ? WIN : LAYER_COLORS[k]));
    }
    L.hidden.forEach((layer, l) => drawNeurons(layer, run?.acts[l], run?.maxes[l], ps[l + 1], LAYER_COLORS[l], l === 0 ? hovered : -1));
    drawOutputs(run, ps.at(-1));
    drawCaptions(run, ps, speed, progress);
  }

  const neuronAt = (x, y) => L.hidden[0].pts.findIndex((p) => Math.hypot(p.x - x, p.y - y) < L.hidden[0].r + 3);

  return { resize, draw, neuronAt, size: () => ({ W: L.W, H: L.H }) };
}
