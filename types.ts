// MediaPipe Types (Partial definition for what we need)
export interface Results {
  multiHandLandmarks: Array<Array<{ x: number; y: number; z: number }>>;
  multiHandedness: Array<{ index: number; score: number; label: string; displayName?: string }>;
  image: HTMLCanvasElement | HTMLImageElement | HTMLVideoElement;
}

export interface FaceResults {
  multiFaceLandmarks: Array<Array<{ x: number; y: number; z: number }>>;
  image: HTMLCanvasElement | HTMLImageElement | HTMLVideoElement;
}

export interface Hands {
  setOptions: (options: {
    maxNumHands?: number;
    modelComplexity?: number;
    minDetectionConfidence?: number;
    minTrackingConfidence?: number;
  }) => void;
  onResults: (callback: (results: Results) => void) => void;
  send: (input: { image: HTMLVideoElement }) => Promise<void>;
  close: () => Promise<void>;
}

export interface FaceMesh {
  setOptions: (options: {
    maxNumFaces?: number;
    refineLandmarks?: boolean;
    minDetectionConfidence?: number;
    minTrackingConfidence?: number;
  }) => void;
  onResults: (callback: (results: FaceResults) => void) => void;
  send: (input: { image: HTMLVideoElement }) => Promise<void>;
  close: () => Promise<void>;
}

export interface Camera {
  start: () => Promise<void>;
  stop: () => void;
}

declare global {
  interface Window {
    Hands: new (config: { locateFile: (file: string) => string }) => Hands;
    FaceMesh: new (config: { locateFile: (file: string) => string }) => FaceMesh;
    Camera: new (element: HTMLVideoElement, config: { onFrame: () => Promise<void>; width: number; height: number }) => Camera;
  }
}

// App Types
export type SparkShape = 'circle' | 'star' | 'heart' | 'spray';
export type AppMode = 'SNAP' | 'DRAW';
export type VideoFilter = 'NORMAL' | 'GLOW' | 'PURE' | 'BLUSH' | 'CLARENDON' | 'GINGHAM' | 'MOON' | 'LARK' | 'REYES' | 'JUNO' | 'SLUMBER' | 'CREMA' | 'INKWELL' | 'LOFI';

export interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
  shape: SparkShape;
}

export interface Point {
  x: number;
  y: number;
  timestamp: number;
}

export interface AppConfig {
  sparkColor: string;
  sparkSize: number;
  sparkShape: SparkShape;
  lineColor: string;
  lineWidth: number;
  lineGlow: number; // 0 to 50
  glowEnabled: boolean;
  persistentLine: boolean; // New setting for persistent drawing
  activeFilter: VideoFilter;
}