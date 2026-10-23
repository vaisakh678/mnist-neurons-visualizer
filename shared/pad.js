const PREDICT_DELAY_MS = 450; // wait a bit after you stop drawing

export function createPad(canvas, hint, { onStroke, onDigit }) {
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  let drawing = false;
  let last = null;
  let timer = null;
  let sample = null; // the test digit on the pad, if there is one

  function clear() {
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    sample = null;
    hint.classList.remove("hidden");
  }

  function showSample(raw) {
    const small = document.createElement("canvas");
    small.width = small.height = 28;
    const sc = small.getContext("2d");
    const img = sc.createImageData(28, 28);
    raw.forEach((v, k) => img.data.set([v, v, v, 255], k * 4));
    sc.putImageData(img, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(small, 0, 0, canvas.width, canvas.height);
    sample = raw;
    hint.classList.add("hidden");
  }

  function resize() {
    const keep = sample;
    canvas.width = canvas.height = Math.round(canvas.clientWidth * (window.devicePixelRatio || 1));
    clear();
    if (keep) showSample(keep);
  }

  const point = (e) => {
    const r = canvas.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * canvas.width, y: ((e.clientY - r.top) / r.height) * canvas.height };
  };

  function strokeTo(p) {
    ctx.strokeStyle = "#fff";
    ctx.lineCap = ctx.lineJoin = "round";
    ctx.lineWidth = canvas.width * 0.075;
    ctx.beginPath();
    ctx.moveTo(last.x, last.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    last = p;
  }

  canvas.addEventListener("pointerdown", (e) => {
    canvas.setPointerCapture(e.pointerId);
    drawing = true;
    clearTimeout(timer);
    onStroke();
    if (sample) clear();
    last = point(e);
    strokeTo({ x: last.x + 0.01, y: last.y });
    hint.classList.add("hidden");
  });
  canvas.addEventListener("pointermove", (e) => drawing && strokeTo(point(e)));
  canvas.addEventListener("pointerup", () => {
    drawing = false;
    timer = setTimeout(() => {
      const pixels = toPixels();
      if (pixels) onDigit(pixels);
    }, PREDICT_DELAY_MS);
  });

  // shrink the drawing and center it so it looks like the training pics
  function toPixels() {
    const { width: w, height: h } = canvas;
    const data = ctx.getImageData(0, 0, w, h).data;
    let minX = w, minY = h, maxX = -1, maxY = -1;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (data[(y * w + x) * 4] > 30) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }
    if (maxX < 0) return null;

    const bw = maxX - minX + 1;
    const bh = maxY - minY + 1;
    const scale = 20 / Math.max(bw, bh);
    const box = document.createElement("canvas");
    box.width = box.height = 28;
    const b = box.getContext("2d", { willReadFrequently: true });
    b.imageSmoothingQuality = "high";
    b.drawImage(canvas, minX, minY, bw, bh, (28 - bw * scale) / 2, (28 - bh * scale) / 2, bw * scale, bh * scale);

    const raw = b.getImageData(0, 0, 28, 28).data;
    let mass = 0, cx = 0, cy = 0;
    for (let i = 0; i < 784; i++) {
      const v = raw[i * 4] / 255;
      mass += v;
      cx += v * (i % 28);
      cy += v * Math.floor(i / 28);
    }
    const dx = Math.round(13.5 - cx / mass);
    const dy = Math.round(13.5 - cy / mass);

    const pixels = new Float32Array(784);
    for (let y = 0; y < 28; y++) {
      for (let x = 0; x < 28; x++) {
        const sx = x - dx, sy = y - dy;
        if (sx >= 0 && sx < 28 && sy >= 0 && sy < 28) pixels[y * 28 + x] = raw[(sy * 28 + sx) * 4] / 255;
      }
    }
    return pixels;
  }

  return { clear, showSample, resize };
}
