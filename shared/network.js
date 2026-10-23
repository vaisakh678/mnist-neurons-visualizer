export const MEAN = 0.1307; // average and spread of the training pixels
export const STD = 0.3081;

export async function loadModel(url) {
  const data = await fetch(url).then((r) => r.json());
  return {
    accuracy: data.accuracy,
    layers: data.layers.map((l) => ({ ...l, w: Float32Array.from(l.w), b: Float32Array.from(l.b) })),
  };
}

export const maxOf = (arr) => arr.reduce((m, v) => (v > m ? v : m), 1e-6);

// one layer: each neuron adds up (weight x input) + bias, and negatives become 0
function dense(layer, x, relu) {
  const y = new Float32Array(layer.out);
  for (let j = 0; j < layer.out; j++) {
    let s = layer.b[j];
    const row = j * layer.in;
    for (let i = 0; i < layer.in; i++) s += layer.w[row + i] * x[i];
    y[j] = relu ? Math.max(0, s) : s;
  }
  return y;
}

// turn the 10 scores into percentages that add up to 100
function softmax(z) {
  const m = Math.max(...z);
  const e = Array.from(z, (v) => Math.exp(v - m));
  const sum = e.reduce((a, b) => a + b, 0);
  return e.map((v) => v / sum);
}

// find which inputs pushed each neuron the hardest (these become the lines)
function topConnections(layer, input, output, k, sourceOk = () => true) {
  const conns = [];
  for (let j = 0; j < layer.out; j++) {
    if (output[j] <= 0) continue;
    const row = j * layer.in;
    const best = [];
    for (let i = 0; i < layer.in; i++) {
      if (!sourceOk(i)) continue;
      const c = layer.w[row + i] * input[i];
      if (c <= 0) continue;
      if (best.length < k) best.push({ from: i, to: j, c });
      else if (c > best[k - 1].c) best[k - 1] = { from: i, to: j, c };
      else continue;
      best.sort((a, b) => b.c - a.c);
    }
    conns.push(...best);
  }
  const max = maxOf(conns.map((c) => c.c));
  for (const c of conns) {
    c.s = c.c / max; // how strong, 0 to 1
    c.delay = Math.random() * 0.45;
  }
  return conns;
}

export function predict(layers, pixels, topK) {
  const x = Float32Array.from(pixels, (p) => (p - MEAN) / STD);
  const acts = [];
  let h = x;
  for (const layer of layers.slice(0, -1)) {
    h = dense(layer, h, true);
    acts.push(h);
  }
  const probs = softmax(dense(layers.at(-1), h, false));
  const outAct = Float32Array.from(probs, (p) => (p > 0.02 ? p : 0));
  const inputs = [x, ...acts];
  const outputs = [...acts, outAct];
  const conns = layers.map((layer, k) =>
    topConnections(layer, inputs[k], outputs[k], topK[k], k === 0 ? (i) => pixels[i] > 0.15 : undefined),
  );
  for (const c of conns.at(-1)) c.s *= Math.sqrt(probs[c.to]);
  return { pixels, acts, maxes: acts.map(maxOf), probs, conns, winner: probs.indexOf(Math.max(...probs)) };
}
