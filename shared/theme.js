export const THEME = "mono"; // pick one: mono, nebula, classic, teal-orange

const THEMES = {
  classic: {
    // colors for the 2d page
    canvas: {
      layers: [[94, 224, 255], [94, 224, 255]], // per hidden layer
      win: [255, 179, 71],
      negative: [74, 140, 255],
      inkLow: [200, 235, 255],
      inkHigh: [255, 235, 255],
      idleFill: "#0f1520",
      idleStroke: "#1d2534",
      gridBg: "#03050a",
      track: "#121825",
      text: "#c3cbd8",
      muted: "#5d6779",
      dim: "#3d4657",
      digit: "#9aa4b5",
    },
    // colors for the 3d page (anything above 1 glows)
    scene: {
      bg: 0x0a1430,
      idle: [0.018, 0.024, 0.042],
      idleTile: [0.025, 0.035, 0.06],
      ambient: [0.035, 0.045, 0.08],
      layers: [[0.37, 0.88, 1.0], [0.37, 0.88, 1.0], [0.37, 0.88, 1.0]],
      hot: [1, 1, 1],
      ink: [1, 1, 1],
      win: [1.0, 0.62, 0.2],
    },
  },
  // black and white, answer lights up orange
  mono: {
    canvas: {
      layers: [[215, 215, 215], [215, 215, 215]],
      win: [255, 184, 77],
      negative: [90, 90, 90],
      inkLow: [200, 200, 200],
      inkHigh: [255, 255, 255],
      idleFill: "#101010",
      idleStroke: "#262626",
      gridBg: "#030303",
      track: "#1a1a1a",
      text: "#d9d9d9",
      muted: "#6e6e6e",
      dim: "#3a3a3a",
      digit: "#9a9a9a",
    },
    scene: {
      bg: 0x000000,
      idle: [0.02, 0.02, 0.02],
      idleTile: [0.03, 0.03, 0.03],
      ambient: [0.04, 0.04, 0.04],
      layers: [[0.8, 0.8, 0.8], [0.8, 0.8, 0.8], [0.8, 0.8, 0.8]],
      hot: [1, 1, 1],
      ink: [1, 1, 1],
      win: [1.4, 0.8, 0.25],
    },
  },
  // color changes as the signal goes deeper
  nebula: {
    canvas: {
      layers: [[60, 235, 220], [180, 110, 255]],
      win: [255, 200, 80],
      negative: [150, 90, 255],
      inkLow: [190, 220, 255],
      inkHigh: [240, 250, 255],
      idleFill: "#0e0c1d",
      idleStroke: "#211d3a",
      gridBg: "#05040b",
      track: "#16132a",
      text: "#d6d3ec",
      muted: "#6b6690",
      dim: "#3a3658",
      digit: "#a39fc4",
    },
    scene: {
      bg: 0x06050f,
      idle: [0.01, 0.008, 0.025],
      idleTile: [0.02, 0.016, 0.05],
      ambient: [0.03, 0.02, 0.07],
      layers: [[0.1, 0.9, 0.85], [0.5, 0.22, 1.0], [1.0, 0.18, 0.55]],
      hot: [1, 1, 1],
      ink: [0.8, 0.92, 1.0],
      win: [1.0, 0.72, 0.2],
    },
  },
  // teal and orange look
  "teal-orange": {
    canvas: {
      layers: [[255, 138, 61], [255, 138, 61]],
      win: [255, 214, 140],
      negative: [38, 190, 178],
      inkLow: [255, 196, 150],
      inkHigh: [255, 242, 228],
      idleFill: "#0a1e21",
      idleStroke: "#16363a",
      gridBg: "#020b0c",
      track: "#0f2629",
      text: "#cfe0dd",
      muted: "#5f7d7b",
      dim: "#36504f",
      digit: "#8fb0ad",
    },
    scene: {
      bg: 0x07262b,
      idle: [0.004, 0.012, 0.014],
      idleTile: [0.01, 0.04, 0.045],
      ambient: [0.02, 0.075, 0.075],
      layers: [[1.0, 0.33, 0.07], [1.0, 0.33, 0.07], [1.0, 0.33, 0.07]],
      hot: [1.0, 0.86, 0.68],
      ink: [1.0, 0.88, 0.75],
      win: [1.0, 0.78, 0.42],
    },
  },
};

export const { canvas: canvasColors, scene: sceneColors } = THEMES[THEME];

document.documentElement.dataset.theme = THEME;
