import argparse

import torch
import torch.nn.functional as F
from PIL import Image, ImageOps, ImageStat
from torch.utils.data import DataLoader
from torchvision import datasets

from model import DigitNet, transform

MODEL_PATH = "models/digit_net.pt"


def load_model():
    model = DigitNet()
    model.load_state_dict(torch.load(MODEL_PATH, map_location="cpu"))
    model.eval()
    return model


def evaluate(model):
    test_set = datasets.MNIST("data", train=False, download=True, transform=transform)
    correct = torch.zeros(10)
    total = torch.zeros(10)
    confusions = {}
    with torch.no_grad():
        for x, y in DataLoader(test_set, batch_size=1000):
            pred = model(x).argmax(1)
            for t, p in zip(y.tolist(), pred.tolist()):
                total[t] += 1
                if t == p:
                    correct[t] += 1
                else:
                    confusions[(t, p)] = confusions.get((t, p), 0) + 1

    print(f"Overall accuracy: {correct.sum() / total.sum():.2%}  ({int(correct.sum())}/{int(total.sum())})\n")
    print("Per-digit accuracy:")
    for d in range(10):
        acc = correct[d] / total[d]
        print(f"  {d}: {acc:6.2%}  {'█' * int(acc * 40)}")
    print("\nMost common mistakes:")
    for (t, p), n in sorted(confusions.items(), key=lambda kv: -kv[1])[:5]:
        print(f"  {t} predicted as {p}: {n} times")


def predict_image(model, path):
    img = Image.open(path).convert("L")
    # flip it if it's dark ink on white paper
    if ImageStat.Stat(img).mean[0] > 127:
        img = ImageOps.invert(img)
    img = img.resize((28, 28))
    with torch.no_grad():
        probs = F.softmax(model(transform(img).unsqueeze(0)), dim=1).squeeze()
    digit = probs.argmax().item()
    print(f"Prediction: {digit}  ({probs[digit]:.1%} confident)\n")
    for d in range(10):
        print(f"  {d}: {probs[d]:6.1%}  {'█' * int(probs[d] * 40)}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Test the trained MNIST digit model.")
    parser.add_argument("--image", help="path to an image of a single digit")
    args = parser.parse_args()

    model = load_model()
    if args.image:
        predict_image(model, args.image)
    else:
        evaluate(model)
