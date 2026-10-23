import torch.nn as nn
import torch.nn.functional as F
from torchvision import transforms

MEAN, STD = 0.1307, 0.3081  # average and spread of the pixels
transform = transforms.Compose([transforms.ToTensor(), transforms.Normalize((MEAN,), (STD,))])


class DigitNet(nn.Module):
    def __init__(self):
        super().__init__()
        self.fc1 = nn.Linear(28 * 28, 128)
        self.fc2 = nn.Linear(128, 64)
        self.out = nn.Linear(64, 10)

    def forward(self, x):
        x = x.view(x.size(0), -1)  # turn the 28x28 image into one long row
        x = F.relu(self.fc1(x))
        x = F.relu(self.fc2(x))
        return self.out(x)  # a score for each digit 0-9


class DeepDigitNet(nn.Module):
    def __init__(self, hidden=(512, 256, 128)):
        super().__init__()
        sizes = [28 * 28, *hidden]
        self.hidden = nn.ModuleList(nn.Linear(a, b) for a, b in zip(sizes, sizes[1:]))
        self.out = nn.Linear(sizes[-1], 10)

    def forward(self, x):
        x = x.view(x.size(0), -1)
        for layer in self.hidden:
            x = F.relu(layer(x))
        return self.out(x)
