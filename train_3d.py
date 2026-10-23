import os

import torch
import torch.nn.functional as F
from torch.utils.data import DataLoader
from torchvision import datasets

from model import DeepDigitNet, transform

EPOCHS = 8
MODEL_PATH = "models/digit_net_3d.pt"

torch.manual_seed(42)
device = torch.device("mps" if torch.backends.mps.is_available() else "cpu")

train_set = datasets.MNIST("data", train=True, download=True, transform=transform)
test_set = datasets.MNIST("data", train=False, download=True, transform=transform)
train_loader = DataLoader(train_set, batch_size=128, shuffle=True)
test_loader = DataLoader(test_set, batch_size=1000)

model = DeepDigitNet().to(device)
optimizer = torch.optim.Adam(model.parameters(), lr=1e-3)
scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(optimizer, EPOCHS)
print(f"device: {device} | parameters: {sum(p.numel() for p in model.parameters()):,}")

for epoch in range(1, EPOCHS + 1):
    model.train()
    total_loss = 0.0
    for x, y in train_loader:
        x, y = x.to(device), y.to(device)
        optimizer.zero_grad()
        loss = F.cross_entropy(model(x), y)
        loss.backward()
        optimizer.step()
        total_loss += loss.item() * x.size(0)
    scheduler.step()

    model.eval()
    correct = 0
    with torch.no_grad():
        for x, y in test_loader:
            correct += (model(x.to(device)).argmax(1) == y.to(device)).sum().item()
    print(f"epoch {epoch}: loss {total_loss / len(train_set):.4f} | test accuracy {correct / len(test_set):.2%}")

os.makedirs("models", exist_ok=True)
torch.save(model.state_dict(), MODEL_PATH)
print(f"saved to {MODEL_PATH}")
