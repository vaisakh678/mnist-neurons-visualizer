# mnist-neurons-visualizer

Watch a neural network think. A small network trained in PyTorch to recognise handwritten digits (0–9), and a 2D and 3D visualizer that shows every neuron firing, in slow motion, right in the browser.

**Live:** [3D](https://mnist-neurons-visualizer.pages.dev/3d) · [2D](https://mnist-neurons-visualizer.pages.dev/2d)

## Setup

```bash
python3.13 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python -m ipykernel install --user --name mnist-neurons --display-name "Python (mnist-neurons)"
```

## Run

```bash
jupyter lab mnist_prediction.ipynb
```

Pick the **Python (mnist-neurons)** kernel. MNIST (~11 MB) downloads into `data/` on first run.

## Test the model

```bash
python test_model.py                 # accuracy report on the 10,000 test images
python test_model.py --image 7.png   # predict your own image
```

## Visualizer

Watch the network think in slow motion: draw a digit and see each layer fire.

```bash
python export_weights.py             # after (re)training: writes web/weights.json + web/samples.json
python -m http.server 8000           # from the project root, then open http://localhost:8000/web/
```

Keys: `C` clear · `Space` replay · `R` random test digit · `L` loop random digits (on by default; drawing stops it). Hover a neuron in hidden layer 1 to see the pattern it looks for.

## 3D visualizer

A deeper network (784 → 512 → 256 → 128 → 10, ~98.5% accuracy) rendered in 3D with Three.js. The camera follows the signal from the input pixels to the winning digit.

```bash
python train_3d.py                     # trains models/digit_net_3d.pt (~1 min on Apple Silicon)
python export_weights.py --3d          # writes web3d/weights.json + web3d/samples.json
python -m http.server 8000             # from the project root, then open http://localhost:8000/web3d/
```

Keys: `C` clear · `Space` replay · `R` random digit · `L` loop · `V` camera mode: orbit (default, slow 360°) → follow the signal → manual (dragging also switches to manual) · `H` hide UI for clean recordings.

## Code layout

```
model.py, train_3d.py, test_model.py, export_weights.py   training + export (Python)
shared/   network.js (forward pass) · pad.js (drawing → 28×28) · player.js (slow-mo clock, loop) · ui.js (panel + controls)
web/      2D page: app.js (wiring) · render2d.js (canvas drawing) · tooltip.js (neuron weights on hover)
web3d/    3D page: app.js (wiring) · stage.js (renderer + bloom) · network3d.js (neurons, signals) · camera.js · hud.js
```

Plain ES modules, no build step. Serve from the project root so both pages can load `shared/`.

## Deploy

```bash
npx wrangler login   # once
./deploy.sh          # builds dist/ and deploys to Cloudflare Pages: /3d, /2d (root redirects to /3d)
```
