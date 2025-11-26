import { AppConfig, VideoFilter } from "./types";

export const VIDEO_FILTERS: Record<VideoFilter, string> = {
  NORMAL: 'none',
  // Beauty Filters
  GLOW: 'brightness(1.15) contrast(1.1) saturate(1.1)', // Bright, warm, shiny
  PURE: 'brightness(1.2) contrast(1.05) saturate(0.9)', // Whitening, clean, soft
  BLUSH: 'brightness(1.1) saturate(1.15) sepia(0.1) hue-rotate(-10deg)', // Rosy/Pink tint
  // Instagram / Retro Styles
  CLARENDON: 'contrast(1.2) brightness(1.25) saturate(1.35)', // Bright, punchy, bluish
  GINGHAM: 'sepia(0.04) contrast(0.9) brightness(1.1) hue-rotate(-10deg)', // Vintage, soft
  MOON: 'grayscale(1) contrast(1.1) brightness(1.1)', // B&W, soft
  LARK: 'contrast(0.9) brightness(1.2) saturate(1.1)', // Bright, desaturated
  REYES: 'sepia(0.22) brightness(1.1) contrast(0.85) saturate(0.75)', // Washed out, warm
  JUNO: 'contrast(1.15) brightness(1.15) saturate(1.8) sepia(0.35)', // High contrast, warm, vibrant
  SLUMBER: 'saturate(0.66) brightness(1.05) sepia(0.1)', // Dreamy, desaturated
  CREMA: 'contrast(0.9) saturate(0.9) sepia(0.1)', // Creamy, smooth
  INKWELL: 'grayscale(1) sepia(0.3) contrast(1.1) brightness(1.1)', // High contrast B&W
  LOFI: 'saturate(1.1) contrast(1.5)', // High contrast, saturated
};

export const DEFAULT_CONFIG: AppConfig = {
  sparkColor: "#FFFF00", // Yellow
  sparkSize: 4,
  sparkShape: "star",
  lineColor: "#00FFCC", // Cyan/Neon Blue
  lineWidth: 3,
  lineGlow: 15,
  glowEnabled: true,
  persistentLine: false,
  activeFilter: 'CLARENDON',
};

// Hand Landmark Indices
export const WRIST = 0;
export const THUMB_MCP = 2;
export const THUMB_TIP = 4;
export const INDEX_FINGER_MCP = 5;
export const INDEX_FINGER_PIP = 6; // Knuckle
export const INDEX_FINGER_TIP = 8;
export const MIDDLE_FINGER_PIP = 10;
export const MIDDLE_FINGER_TIP = 12;
export const RING_FINGER_PIP = 14;
export const RING_FINGER_TIP = 16;
export const PINKY_FINGER_MCP = 17;
export const PINKY_FINGER_PIP = 18;
export const PINKY_FINGER_TIP = 20;

// Face Landmark Indices (Standard 468 Mesh)
// Left Eye: Outer 33, Inner 133, Top 159, Bottom 145
export const LEFT_EYE_OUTER = 33;
export const LEFT_EYE_INNER = 133;
export const LEFT_EYE_TOP = 159;
export const LEFT_EYE_BOTTOM = 145;

// Right Eye: Outer 263, Inner 362, Top 386, Bottom 374
export const RIGHT_EYE_OUTER = 263;
export const RIGHT_EYE_INNER = 362;
export const RIGHT_EYE_TOP = 386;
export const RIGHT_EYE_BOTTOM = 374;

// Logic Constants
export const SNAP_THRESHOLD_DISTANCE = 0.05; // Normalized coords
export const SNAP_RELEASE_THRESHOLD = 0.12;
export const DRAWING_COOLDOWN_MS = 400; // Time to disable drawing after a snap
export const MAX_LINE_POINTS = 30; // Length of the trail
export const PARTICLE_COUNT = 30; // Particles per snap

// Gesture Thresholds
export const PALM_OPEN_THRESHOLD = 0.25; // Distance of fingertips from wrist to consider "Open"
export const PINCH_THRESHOLD = 0.05;
export const CLUSTER_THRESHOLD = 0.06; // All 5 fingertips must be within this distance of their centroid
export const CLUSTER_EXTENSION_RATIO = 1.0; // Cluster centroid must be at least this x HandScale from wrist (prevents fists)
export const SALT_PINCH_THRESHOLD = 0.08; // Slightly looser pinch for salt sprinkling
export const SPRINKLE_THRESHOLD = 0.06; // Fingertips must be this close to thumb for "Rubbing" shape
export const RUB_MOTION_THRESHOLD = 0.010; // Sensitivity for rubbing motion (lower is more sensitive)
export const RUB_ACTIVATION_DELAY = 150; // ms to hold rubbing before rain starts

// Wink Thresholds (Eye Aspect Ratio)
export const WINK_CLOSED_THRESHOLD = 0.18; // Eye considered closed below this ratio
export const WINK_OPEN_THRESHOLD = 0.25; // Eye considered open above this ratio
export const WINK_COOLDOWN_MS = 800; // Prevent spamming