import React, { useEffect, useRef, useState, useCallback } from 'react';
import { 
  DEFAULT_CONFIG, 
  INDEX_FINGER_TIP, 
  INDEX_FINGER_PIP,
  INDEX_FINGER_MCP,
  MAX_LINE_POINTS, 
  MIDDLE_FINGER_TIP, 
  MIDDLE_FINGER_PIP, 
  RING_FINGER_TIP, 
  RING_FINGER_PIP, 
  PINKY_FINGER_TIP, 
  PINKY_FINGER_PIP, 
  PINKY_FINGER_MCP,
  PARTICLE_COUNT, 
  SNAP_RELEASE_THRESHOLD, 
  SNAP_THRESHOLD_DISTANCE, 
  THUMB_TIP,
  WRIST,
  CLUSTER_THRESHOLD,
  CLUSTER_EXTENSION_RATIO,
  RUB_MOTION_THRESHOLD,
  RUB_ACTIVATION_DELAY,
  LEFT_EYE_TOP, LEFT_EYE_BOTTOM, LEFT_EYE_INNER, LEFT_EYE_OUTER,
  RIGHT_EYE_TOP, RIGHT_EYE_BOTTOM, RIGHT_EYE_INNER, RIGHT_EYE_OUTER,
  WINK_CLOSED_THRESHOLD, WINK_OPEN_THRESHOLD, WINK_COOLDOWN_MS,
  VIDEO_FILTERS
} from './constants';
import { ControlPanel } from './components/ControlPanel';
import { renderLine, renderParticles, drawSegment } from './services/renderUtils';
import { AppConfig, Particle, Point, Results, AppMode, FaceResults } from './types';

const App: React.FC = () => {
  const [config, setConfig] = useState<AppConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [permissionError, setPermissionError] = useState(false);
  const [mode, setMode] = useState<AppMode>('DRAW'); // Start in DRAW to be safe
  const [isRecording, setIsRecording] = useState(false);

  // Refs for persistent objects
  const videoRef = useRef<HTMLVideoElement>(null);
  
  // Canvas Refs
  const fxCanvasRef = useRef<HTMLCanvasElement>(null);
  const persistentCanvasRef = useRef<HTMLCanvasElement>(null);
  const compositeCanvasRef = useRef<HTMLCanvasElement>(null); // For recording/snapshots
  
  // Recording Refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  
  // State refs to avoid closure staleness in loop
  const particlesRef = useRef<Particle[]>([]);
  
  // Line Tracking Data
  const leftHandQueueRef = useRef<Point[]>([]);
  const rightHandQueueRef = useRef<Point[]>([]);
  const prevLeftPosRef = useRef<Point | null>(null);
  const prevRightPosRef = useRef<Point | null>(null);
  
  // Gesture Tracking Refs
  const handPinchStatesRef = useRef<Record<string, boolean>>({}); 
  const prevLandmarksRef = useRef<Record<string, any[]>>({}); 
  const rubbingStartTimeRef = useRef<Record<string, number>>({}); 
  
  // Face / Wink Tracking Refs
  const lastWinkTimeRef = useRef<{left: number, right: number}>({ left: 0, right: 0 });

  const requestRef = useRef<number>();
  const configRef = useRef<AppConfig>(DEFAULT_CONFIG);
  
  // We need to access mode in the loop without closure issues
  const modeRef = useRef<AppMode>('DRAW');

  // Keep refs in sync
  useEffect(() => {
    configRef.current = config;
  }, [config]);

  // Handle persistent canvas clear when toggling feature OFF
  useEffect(() => {
    if (!config.persistentLine) {
       const pCanvas = persistentCanvasRef.current;
       if (pCanvas) {
         const ctx = pCanvas.getContext('2d');
         ctx?.clearRect(0, 0, pCanvas.width, pCanvas.height);
       }
       prevLeftPosRef.current = null;
       prevRightPosRef.current = null;
    }
  }, [config.persistentLine]);

  // --- PARTICLE SYSTEMS ---

  // 1. Standard Spark Burst (Snap)
  const createExplosion = (x: number, y: number) => {
    const newParticles: Particle[] = [];
    const { sparkColor, sparkSize, sparkShape } = configRef.current;
    
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 5 + 2;
      
      newParticles.push({
        id: Math.random(),
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1.0,
        maxLife: 1.0,
        color: sparkColor,
        size: Math.random() * sparkSize + 1,
        shape: sparkShape
      });
    }
    particlesRef.current = [...particlesRef.current, ...newParticles];
  };

  // 2. Spark Rain (Cluster Rubbing / Picture Gesture)
  const emitSparkRain = (x: number, y: number) => {
    const newParticles: Particle[] = [];
    const { sparkColor, sparkSize, sparkShape } = configRef.current;
    
    // Emit particles for continuous rain
    const count = 2; 
    
    for (let i = 0; i < count; i++) {
        newParticles.push({
            id: Math.random(),
            x: x + (Math.random() - 0.5) * 40, 
            y: y,
            vx: (Math.random() - 0.5) * 2, 
            vy: Math.random() * 3 + 2, 
            life: 1.0,
            maxLife: 1.0,
            color: sparkColor,
            size: Math.random() * sparkSize + 2, 
            shape: sparkShape 
        });
    }
    particlesRef.current = [...particlesRef.current, ...newParticles];
  }

  // 3. Wink Spark (Single Star)
  const createWinkSpark = (x: number, y: number) => {
    const { sparkColor, sparkSize, sparkShape } = configRef.current;
    // Spawn a single, larger, popping star
    particlesRef.current.push({
        id: Math.random(),
        x,
        y,
        vx: 0,
        vy: -1, // slight float up
        life: 1.2, // longer life
        maxLife: 1.2,
        color: sparkColor,
        size: sparkSize * 2.5, // Bigger than normal
        shape: sparkShape // Use selected shape as requested (or force 'star')
    });
  };

  const updateParticles = () => {
    particlesRef.current.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.2; // Gravity
      p.life -= 0.02; // Decay
    });
    particlesRef.current = particlesRef.current.filter(p => p.life > 0);
  };

  // --- GESTURE UTILS ---

  const isHandOpen = (landmarks: any[]) => {
    const wrist = landmarks[WRIST];
    const indexMCP = landmarks[5];
    const handScale = Math.hypot(indexMCP.x - wrist.x, indexMCP.y - wrist.y);

    const middleTip = landmarks[MIDDLE_FINGER_TIP];
    const ringTip = landmarks[RING_FINGER_TIP];
    const pinkyTip = landmarks[PINKY_FINGER_TIP];

    const distMiddle = Math.hypot(middleTip.x - wrist.x, middleTip.y - wrist.y);
    const distRing = Math.hypot(ringTip.x - wrist.x, ringTip.y - wrist.y);
    const distPinky = Math.hypot(pinkyTip.x - wrist.x, pinkyTip.y - wrist.y);
    
    const avgDist = (distMiddle + distRing + distPinky) / 3;
    const EXTENSION_RATIO = 1.5;
    const isExtended = avgDist > (handScale * EXTENSION_RATIO);
    
    const thumbTip = landmarks[THUMB_TIP];
    const indexTip = landmarks[INDEX_FINGER_TIP];
    const pinchDist = Math.hypot(thumbTip.x - indexTip.x, thumbTip.y - indexTip.y);
    const isPinching = pinchDist < (handScale * 0.5);

    return isExtended && !isPinching;
  };

  const isPointing = (landmarks: any[]) => {
    const wrist = landmarks[WRIST];
    const indexMCP = landmarks[5];
    const handScale = Math.hypot(indexMCP.x - wrist.x, indexMCP.y - wrist.y);

    const thumbTip = landmarks[THUMB_TIP];
    const pinkyMCP = landmarks[PINKY_FINGER_MCP];
    const thumbDist = Math.hypot(thumbTip.x - pinkyMCP.x, thumbTip.y - pinkyMCP.y);
    const thumbExtended = thumbDist > (handScale * 0.9);

    const isFingerExtended = (tipIdx: number, pipIdx: number) => {
        const tip = landmarks[tipIdx];
        const pip = landmarks[pipIdx];
        const dTip = Math.hypot(tip.x - wrist.x, tip.y - wrist.y);
        const dPip = Math.hypot(pip.x - wrist.x, pip.y - wrist.y);
        return dTip > (dPip * 1.1);
    };

    const indexExtended = isFingerExtended(INDEX_FINGER_TIP, INDEX_FINGER_PIP);
    const middleExtended = isFingerExtended(MIDDLE_FINGER_TIP, MIDDLE_FINGER_PIP);
    const ringExtended = isFingerExtended(RING_FINGER_TIP, RING_FINGER_PIP);
    const pinkyExtended = isFingerExtended(PINKY_FINGER_TIP, PINKY_FINGER_PIP);

    return indexExtended && !middleExtended && !ringExtended && !pinkyExtended && !thumbExtended;
  };

  // 1. Pose: All 5 fingertips are very close together (Cluster).
  // 2. Pose (Strict): Cluster is extended away from wrist (matches picture, NOT a fist).
  // 3. Motion: The cluster centroid moves relative to the wrist (Rubbing/Scrubbing).
  const isClusterRubbing = (landmarks: any[], label: string) => {
    const wrist = landmarks[WRIST];
    const indexMCP = landmarks[INDEX_FINGER_MCP];
    
    const tips = [
      landmarks[THUMB_TIP], landmarks[INDEX_FINGER_TIP],
      landmarks[MIDDLE_FINGER_TIP], landmarks[RING_FINGER_TIP],
      landmarks[PINKY_FINGER_TIP]
    ];

    let avgX = 0, avgY = 0;
    tips.forEach(t => { avgX += t.x; avgY += t.y; });
    avgX /= 5;
    avgY /= 5;

    for (const t of tips) {
      const dist = Math.hypot(t.x - avgX, t.y - avgY);
      if (dist > CLUSTER_THRESHOLD) return false; 
    }

    // CHECK EXTENSION (Differentiates "Italian Hand" from Fist)
    const handScale = Math.hypot(indexMCP.x - wrist.x, indexMCP.y - wrist.y);
    const clusterDistToWrist = Math.hypot(avgX - wrist.x, avgY - wrist.y);
    
    if (clusterDistToWrist < handScale * CLUSTER_EXTENSION_RATIO) {
        return false;
    }

    const prevLandmarks = prevLandmarksRef.current[label];
    if (!prevLandmarks) return false;

    const prevWrist = prevLandmarks[WRIST];
    const prevTips = [
      prevLandmarks[THUMB_TIP], prevLandmarks[INDEX_FINGER_TIP],
      prevLandmarks[MIDDLE_FINGER_TIP], prevLandmarks[RING_FINGER_TIP],
      prevLandmarks[PINKY_FINGER_TIP]
    ];
    let pAvgX = 0, pAvgY = 0;
    prevTips.forEach(t => { pAvgX += t.x; pAvgY += t.y; });
    pAvgX /= 5;
    pAvgY /= 5;

    const relX = avgX - wrist.x;
    const relY = avgY - wrist.y;
    const prevRelX = pAvgX - prevWrist.x;
    const prevRelY = pAvgY - prevWrist.y;

    const dx = relX - prevRelX;
    const dy = relY - prevRelY;
    const motion = Math.hypot(dx, dy);

    return motion > RUB_MOTION_THRESHOLD;
  };

  const clearAllCanvases = useCallback(() => {
      const pCanvas = persistentCanvasRef.current;
      const ctx = pCanvas?.getContext('2d');
      if (pCanvas && ctx) {
          ctx.clearRect(0,0, pCanvas.width, pCanvas.height);
      }
      leftHandQueueRef.current = [];
      rightHandQueueRef.current = [];
      prevLeftPosRef.current = null;
      prevRightPosRef.current = null;
  }, []);

  // --- HAND RESULTS ---
  const onResults = useCallback((results: Results) => {
    const canvas = fxCanvasRef.current;
    if (!canvas) return;
    const width = canvas.width;
    const height = canvas.height;
    const now = Date.now();

    const getCoords = (landmark: {x: number, y: number}) => ({
        x: (1 - landmark.x) * width,
        y: landmark.y * height
    });

    let detectedLeftOpen = false;
    let detectedRightOpen = false;
    const handCount = results.multiHandLandmarks ? results.multiHandLandmarks.length : 0;

    if (results.multiHandLandmarks && results.multiHandedness) {
      results.multiHandedness.forEach((hand, i) => {
        const landmarks = results.multiHandLandmarks[i];
        if (hand.label === 'Left' && isHandOpen(landmarks)) detectedLeftOpen = true;
        if (hand.label === 'Right' && isHandOpen(landmarks)) detectedRightOpen = true;
      });
    }

    // PRIORITY 1: ERASE (Both Palms)
    if (detectedLeftOpen && detectedRightOpen) {
        clearAllCanvases();
        return; 
    }

    // BUG FIX: MODE SWITCH PROTECTION
    // If more than 1 hand is detected (e.g. attempting to erase, or transitioning),
    // DO NOT change the mode. Maintain the current mode to prevent flickering.
    if (handCount > 1) {
        // Proceed to use the CURRENT mode for interactions, but skip mode switching block.
    } else {
        // PRIORITY 2: MODE SWITCHING (Strictly Single Hand)
        if (detectedLeftOpen) {
            if (modeRef.current !== 'DRAW') {
                modeRef.current = 'DRAW';
                setMode('DRAW');
            }
        } else if (detectedRightOpen) {
            if (modeRef.current !== 'SNAP') {
                modeRef.current = 'SNAP';
                setMode('SNAP');
            }
        }
    }

    const currentMode = modeRef.current;
    let leftIndexDrawing = false;
    let rightIndexDrawing = false;

    if (results.multiHandLandmarks && results.multiHandedness) {
      results.multiHandedness.forEach((hand, i) => {
        const landmarks = results.multiHandLandmarks[i];
        const label = hand.label; 
        
        if (currentMode === 'SNAP') {
            const isRubbing = isClusterRubbing(landmarks, label);
            
            if (isRubbing) {
                if (!rubbingStartTimeRef.current[label]) {
                    rubbingStartTimeRef.current[label] = now;
                }
                
                if (now - rubbingStartTimeRef.current[label] > RUB_ACTIVATION_DELAY) {
                    // EMIT FROM CENTROID ("Under fingers")
                    const tips = [
                        landmarks[THUMB_TIP], landmarks[INDEX_FINGER_TIP], 
                        landmarks[MIDDLE_FINGER_TIP], landmarks[RING_FINGER_TIP], 
                        landmarks[PINKY_FINGER_TIP]
                    ];
                    let avgX = 0, avgY = 0;
                    tips.forEach(t => { avgX += t.x; avgY += t.y; });
                    avgX /= 5;
                    avgY /= 5;
                    
                    const coords = getCoords({x: avgX, y: avgY});
                    emitSparkRain(coords.x, coords.y);
                }
                handPinchStatesRef.current[label] = false; 
            } 
            else {
                rubbingStartTimeRef.current[label] = 0;

                const thumbTip = landmarks[THUMB_TIP];
                const middleTip = landmarks[MIDDLE_FINGER_TIP];
                const dx = thumbTip.x - middleTip.x;
                const dy = thumbTip.y - middleTip.y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                const wasPinched = handPinchStatesRef.current[label] || false;

                if (distance < SNAP_THRESHOLD_DISTANCE) {
                    handPinchStatesRef.current[label] = true;
                } else {
                    if (wasPinched && distance > SNAP_RELEASE_THRESHOLD) {
                        const coords = getCoords(thumbTip);
                        createExplosion(coords.x, coords.y);
                    }
                    handPinchStatesRef.current[label] = false;
                }
            }
        }

        if (currentMode === 'DRAW') {
            if (isPointing(landmarks)) {
                const indexTip = landmarks[INDEX_FINGER_TIP];
                const coords = getCoords(indexTip);
                const point = { ...coords, timestamp: now };
    
                if (label === 'Left') {
                    leftIndexDrawing = true;
                    handleDrawing(label, point, leftHandQueueRef, prevLeftPosRef);
                } else if (label === 'Right') {
                    rightIndexDrawing = true;
                    handleDrawing(label, point, rightHandQueueRef, prevRightPosRef);
                }
            }
        }
        prevLandmarksRef.current[label] = landmarks;
      });
    }

    if (currentMode === 'DRAW') {
        if (!leftIndexDrawing) {
            prevLeftPosRef.current = null;
            if (!configRef.current.persistentLine) leftHandQueueRef.current = [];
        }
        if (!rightIndexDrawing) {
            prevRightPosRef.current = null;
            if (!configRef.current.persistentLine) rightHandQueueRef.current = [];
        }
    }
  }, [clearAllCanvases]);

  // --- FACE / WINK RESULTS ---
  const onFaceResults = useCallback((results: FaceResults) => {
    const canvas = fxCanvasRef.current;
    if (!canvas || !results.multiFaceLandmarks || results.multiFaceLandmarks.length === 0) return;
    
    const landmarks = results.multiFaceLandmarks[0]; // 1 face
    const width = canvas.width;
    const height = canvas.height;
    const now = Date.now();

    const getDist = (i1: number, i2: number) => {
        const p1 = landmarks[i1];
        const p2 = landmarks[i2];
        return Math.hypot(p1.x - p2.x, p1.y - p2.y);
    };

    // Eye Aspect Ratio (Height / Width)
    const leftHeight = getDist(LEFT_EYE_TOP, LEFT_EYE_BOTTOM);
    const leftWidth = getDist(LEFT_EYE_INNER, LEFT_EYE_OUTER);
    const leftRatio = leftHeight / leftWidth;

    const rightHeight = getDist(RIGHT_EYE_TOP, RIGHT_EYE_BOTTOM);
    const rightWidth = getDist(RIGHT_EYE_INNER, RIGHT_EYE_OUTER);
    const rightRatio = rightHeight / rightWidth;

    // Detect LEFT WINK (Left closed, Right open)
    if (leftRatio < WINK_CLOSED_THRESHOLD && rightRatio > WINK_OPEN_THRESHOLD) {
        if (now - lastWinkTimeRef.current.left > WINK_COOLDOWN_MS) {
            // Spawn at Left Outer Eye Corner
            const p = landmarks[LEFT_EYE_OUTER];
            const x = (1 - p.x) * width;
            const y = p.y * height;
            createWinkSpark(x, y);
            lastWinkTimeRef.current.left = now;
        }
    }

    // Detect RIGHT WINK (Right closed, Left open)
    if (rightRatio < WINK_CLOSED_THRESHOLD && leftRatio > WINK_OPEN_THRESHOLD) {
        if (now - lastWinkTimeRef.current.right > WINK_COOLDOWN_MS) {
            // Spawn at Right Outer Eye Corner
            const p = landmarks[RIGHT_EYE_OUTER];
            const x = (1 - p.x) * width;
            const y = p.y * height;
            createWinkSpark(x, y);
            lastWinkTimeRef.current.right = now;
        }
    }

  }, []);

  const handleDrawing = (
      label: string, 
      newPoint: Point, 
      queueRef: React.MutableRefObject<Point[]>, 
      prevPosRef: React.MutableRefObject<Point | null>
  ) => {
    const cfg = configRef.current;
    
    if (cfg.persistentLine) {
        if (prevPosRef.current && persistentCanvasRef.current) {
            const ctx = persistentCanvasRef.current.getContext('2d');
            if (ctx) {
                drawSegment(
                    ctx, 
                    prevPosRef.current, 
                    newPoint, 
                    cfg.lineColor, 
                    cfg.lineWidth, 
                    cfg.lineGlow, 
                    cfg.glowEnabled
                );
            }
        }
        prevPosRef.current = newPoint;
    } else {
        queueRef.current.push(newPoint);
        if (queueRef.current.length > MAX_LINE_POINTS) {
            queueRef.current.shift();
        }
    }
  };

  // --- COMPOSITING FOR RECORD/SNAPSHOT ---
  const compositeFrame = () => {
    const composite = compositeCanvasRef.current;
    const video = videoRef.current;
    const persistent = persistentCanvasRef.current;
    const fx = fxCanvasRef.current;

    if (!composite || !video || !persistent || !fx) return;

    const ctx = composite.getContext('2d');
    if (!ctx) return;

    // Clear
    ctx.clearRect(0, 0, composite.width, composite.height);

    // 1. Draw Video (Mirrored & Filtered)
    ctx.save();
    // Mirror the video because we are drawing on the "back" of the canvas context conceptually to match display
    ctx.translate(composite.width, 0);
    ctx.scale(-1, 1);
    
    // Apply the active CSS filter to the canvas context
    ctx.filter = VIDEO_FILTERS[configRef.current.activeFilter];
    
    ctx.drawImage(video, 0, 0, composite.width, composite.height);
    ctx.restore();

    // 2. Draw Persistent Layer
    ctx.drawImage(persistent, 0, 0);

    // 3. Draw FX Layer
    ctx.drawImage(fx, 0, 0);
  };

  const handleTakePhoto = useCallback(() => {
    compositeFrame();
    const composite = compositeCanvasRef.current;
    if (composite) {
        const dataUrl = composite.toDataURL('image/png');
        const link = document.createElement('a');
        link.download = `y2k-hand-fx-${Date.now()}.png`;
        link.href = dataUrl;
        link.click();
    }
  }, []);

  const toggleRecording = useCallback(() => {
    if (isRecording) {
        // STOP RECORDING
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop();
        }
        setIsRecording(false);
    } else {
        // START RECORDING
        const composite = compositeCanvasRef.current;
        if (!composite) return;

        // Ensure we have a fresh frame logic starting
        recordedChunksRef.current = [];
        
        // Capture stream from the composite canvas (30fps)
        const stream = composite.captureStream(30);
        
        try {
            const recorder = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp9' });
            
            recorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    recordedChunksRef.current.push(event.data);
                }
            };
            
            recorder.onstop = () => {
                const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `y2k-session-${Date.now()}.webm`;
                link.click();
                URL.revokeObjectURL(url);
            };

            recorder.start();
            mediaRecorderRef.current = recorder;
            setIsRecording(true);
        } catch (e) {
            console.error("Recording not supported or failed:", e);
        }
    }
  }, [isRecording]);


  const animate = useCallback(() => {
    const fxCanvas = fxCanvasRef.current;
    if (!fxCanvas) return;
    const ctx = fxCanvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, fxCanvas.width, fxCanvas.height);
    updateParticles();

    const cfg = configRef.current;

    if (!cfg.persistentLine) {
        if (leftHandQueueRef.current.length > 0) {
            renderLine(ctx, leftHandQueueRef.current, cfg.lineColor, cfg.lineWidth, cfg.lineGlow, cfg.glowEnabled);
        }
        if (rightHandQueueRef.current.length > 0) {
            renderLine(ctx, rightHandQueueRef.current, cfg.lineColor, cfg.lineWidth, cfg.lineGlow, cfg.glowEnabled);
        }
    }

    renderParticles(ctx, particlesRef.current);

    // If we are recording, we must update the composite canvas every frame to capture the motion
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        compositeFrame();
    }

    requestRef.current = requestAnimationFrame(animate);
  }, []);

  useEffect(() => {
    if (!videoRef.current || !fxCanvasRef.current || !persistentCanvasRef.current || !compositeCanvasRef.current) return;
    
    const setCanvasSize = () => {
        const w = window.innerWidth;
        const h = window.innerHeight;
        [fxCanvasRef.current, persistentCanvasRef.current, compositeCanvasRef.current].forEach(c => {
            if (c) { c.width = w; c.height = h; }
        });
    };
    setCanvasSize();

    const hands = new window.Hands({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
    });
    hands.setOptions({
      maxNumHands: 2,
      modelComplexity: 1,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5
    });
    hands.onResults(onResults);

    // Initialize Face Mesh
    const faceMesh = new window.FaceMesh({
        locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`
    });
    faceMesh.setOptions({
        maxNumFaces: 1,
        refineLandmarks: true,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5
    });
    faceMesh.onResults(onFaceResults);

    // Request High Quality Video (1080p)
    const camera = new window.Camera(videoRef.current, {
      onFrame: async () => {
        if (videoRef.current) {
            await hands.send({ image: videoRef.current });
            await faceMesh.send({ image: videoRef.current });
        }
      },
      width: 1920, // Increased from 1280
      height: 1080 // Increased from 720
    });

    camera.start()
      .then(() => setLoading(false))
      .catch((err) => {
        console.error("Camera error:", err);
        setPermissionError(true);
        setLoading(false);
      });

    requestRef.current = requestAnimationFrame(animate);

    const handleResize = () => {
        setCanvasSize();
    }
    window.addEventListener('resize', handleResize);

    return () => {
      camera.stop();
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      window.removeEventListener('resize', handleResize);
    };
  }, [animate, onResults, onFaceResults]);

  return (
    <div className="relative w-full h-screen bg-black overflow-hidden cursor-crosshair">
      <video
        ref={videoRef}
        className="absolute top-0 left-0 w-full h-full object-cover transform scale-x-[-1]"
        style={{ 
          filter: VIDEO_FILTERS[config.activeFilter],
          opacity: loading ? 0 : 1 
        }}
        playsInline
        muted
      />

      <canvas ref={persistentCanvasRef} className="absolute top-0 left-0 w-full h-full pointer-events-none z-10" />
      <canvas ref={fxCanvasRef} className="absolute top-0 left-0 w-full h-full pointer-events-none z-20" />
      {/* Hidden composite canvas for recording */}
      <canvas ref={compositeCanvasRef} className="hidden" />

      <div className="absolute top-0 left-0 w-full h-full pointer-events-none z-30 crt-lines opacity-40"></div>
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none z-30 opacity-10 mix-blend-overlay"
           style={{
             backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`
           }}
      ></div>

      <ControlPanel 
        config={config} 
        setConfig={setConfig} 
      />
      
      {/* LEFT STATUS & CLEAR */}
      <div className="absolute top-4 left-4 z-40 flex flex-col gap-2 pointer-events-none select-none">
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${mode === 'DRAW' ? 'bg-green-500 animate-pulse' : 'bg-gray-800'}`}></div>
            <span className={`font-mono text-sm ${mode === 'DRAW' ? 'text-green-400 font-bold' : 'text-gray-600'}`}>
                DRAW_MODE [LEFT_PALM]
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${mode === 'SNAP' ? 'bg-yellow-500 animate-pulse' : 'bg-gray-800'}`}></div>
            <span className={`font-mono text-sm ${mode === 'SNAP' ? 'text-yellow-400 font-bold' : 'text-gray-600'}`}>
                SNAP_MODE [RIGHT_PALM]
            </span>
          </div>
          <div className="text-[10px] text-gray-500 pt-1 border-t border-gray-800 mt-1 mb-2">
              [BOTH_PALMS] = ERASE | [WINK] = SPARK
          </div>
          <button 
            onClick={clearAllCanvases}
            className="pointer-events-auto bg-black/50 border border-red-500/50 text-red-400 font-mono text-xs px-4 py-2 hover:bg-red-900/20 active:bg-red-900/50 backdrop-blur-md self-start"
          >
              [CLEAR_CANVAS]
          </button>
      </div>

      {/* BOTTOM CONTROL BAR (iPhone Style) */}
      <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-black/90 to-transparent pointer-events-none z-40"></div>
      
      <div className="absolute bottom-6 left-0 w-full flex justify-center items-center gap-12 z-50 pointer-events-auto pb-4">
        {/* Snapshot (Left) */}
        <div className="flex flex-col items-center gap-2 group cursor-pointer" onClick={handleTakePhoto}>
            <div className="w-16 h-16 rounded-full border-4 border-white flex items-center justify-center bg-black/20 backdrop-blur-sm transition-transform active:scale-95 hover:bg-white/10 shadow-lg">
                <div className="w-12 h-12 bg-white rounded-full"></div>
            </div>
            <span className="text-[10px] font-mono text-white/70 tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">PHOTO</span>
        </div>

        {/* Record (Right) */}
        <div className="flex flex-col items-center gap-2 group cursor-pointer" onClick={toggleRecording}>
             <div className={`w-16 h-16 rounded-full border-4 ${isRecording ? 'border-red-500' : 'border-white'} flex items-center justify-center bg-black/20 backdrop-blur-sm transition-all active:scale-95 hover:bg-white/10 shadow-lg`}>
                <div className={`transition-all duration-300 bg-red-500 ${isRecording ? 'w-6 h-6 rounded-sm' : 'w-12 h-12 rounded-full'}`}></div>
            </div>
            <span className="text-[10px] font-mono text-white/70 tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">{isRecording ? 'STOP' : 'REC'}</span>
        </div>
      </div>

      {loading && !permissionError && (
        <div className="absolute inset-0 flex items-center justify-center z-50 bg-black text-green-500 font-mono flex-col gap-4">
          <div className="w-16 h-16 border-4 border-green-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="animate-pulse">INITIALIZING_SYSTEMS...</p>
        </div>
      )}

      {permissionError && (
        <div className="absolute inset-0 flex items-center justify-center z-50 bg-black text-red-500 font-mono p-8 text-center">
          <div className="border border-red-500 p-8 max-w-md bg-red-900/10">
            <h1 className="text-2xl mb-4 font-bold">ERROR: ACCESS_DENIED</h1>
            <p>CRITICAL FAILURE: Unable to access video input device.</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;