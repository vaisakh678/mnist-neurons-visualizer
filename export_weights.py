import argparse
import json
import os
import random

import torch
import torch.nn.functional as F
from torchvision import datasets

from model import DeepDigitNet, DigitNet, transform


def rounded(t):
    return [round(v, 5) for v in t.flatten().tolist()]


parser = argparse.ArgumentParser(description="Export model weights for the web visualizers.")
parser.add_argument("--3d", dest="deep", action="store_true", help="export the deep model for web3d/")
args = parser.parse_args()

if args.deep:
    model, model_path, out_dir = DeepDigitNet(), "models/digit_net_3d.pt", "web3d"
else:
    model, model_path, out_dir = DigitNet(), "models/digit_net.pt", "web"
model.load_state_dict(torch.load(model_path, map_location="cpu"))
model.eval()
linear_layers = [*model.hidden, model.out] if args.deep else [model.fc1, model.fc2, model.out]

test_set = datasets.MNIST("data", train=False, download=True, transform=transform)
with torch.no_grad():
    probs = torch.cat([F.softmax(model(x), dim=1) for x, _ in torch.utils.data.DataLoader(test_set, batch_size=1000)])
preds = probs.argmax(1)
accuracy = (preds == test_set.targets).float().mean().item()

layers = [
    {"in": layer.in_features, "out": layer.out_features, "w": rounded(layer.weight), "b": rounded(layer.bias)}
    for layer in linear_layers
]
os.makedirs(out_dir, exist_ok=True)
with open(f"{out_dir}/weights.json", "w") as f:
    json.dump({"accuracy": round(accuracy, 4), "layers": layers}, f, separators=(",", ":"))

# pick some digits for the random button
random.seed(0)
confident = [i for i in range(len(test_set)) if probs[i].max() > 0.99]
unsure = [i for i in range(len(test_set)) if probs[i].max() < 0.8]
picked = random.sample(confident, 60) + random.sample(unsure, min(20, len(unsure)))
samples = [{"label": int(test_set.targets[i]), "pixels": test_set.data[i].flatten().tolist()} for i in picked]
with open(f"{out_dir}/samples.json", "w") as f:
    json.dump(samples, f, separators=(",", ":"))

print(f"accuracy {accuracy:.2%} | wrote {out_dir}/weights.json and {out_dir}/samples.json ({len(samples)} samples)")
