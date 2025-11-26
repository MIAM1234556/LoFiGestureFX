import { Particle, Point } from "../types";

export function drawStar(ctx: CanvasRenderingContext2D, cx: number, cy: number, spikes: number, outerRadius: number, innerRadius: number, color: string) {
    let rot = Math.PI / 2 * 3;
    let x = cx;
    let y = cy;
    const step = Math.PI / spikes;

    ctx.beginPath();
    ctx.moveTo(cx, cy - outerRadius);
    for (let i = 0; i < spikes; i++) {
        x = cx + Math.cos(rot) * outerRadius;
        y = cy + Math.sin(rot) * outerRadius;
        ctx.lineTo(x, y);
        rot += step;

        x = cx + Math.cos(rot) * innerRadius;
        y = cy + Math.sin(rot) * innerRadius;
        ctx.lineTo(x, y);
        rot += step;
    }
    ctx.lineTo(cx, cy - outerRadius);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
}

export function drawHeart(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, color: string) {
  ctx.beginPath();
  const topCurveHeight = size * 0.3;
  ctx.moveTo(x, y + topCurveHeight);
  // top left curve
  ctx.bezierCurveTo(
    x, y, 
    x - size / 2, y, 
    x - size / 2, y + topCurveHeight
  );
  // bottom left curve
  ctx.bezierCurveTo(
    x - size / 2, y + (size + topCurveHeight) / 2, 
    x, y + (size + topCurveHeight) / 2, 
    x, y + size
  );
  // bottom right curve
  ctx.bezierCurveTo(
    x, y + (size + topCurveHeight) / 2, 
    x + size / 2, y + (size + topCurveHeight) / 2, 
    x + size / 2, y + topCurveHeight
  );
  // top right curve
  ctx.bezierCurveTo(
    x + size / 2, y, 
    x, y, 
    x, y + topCurveHeight
  );
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
}

export const renderParticles = (ctx: CanvasRenderingContext2D, particles: Particle[]) => {
  particles.forEach(p => {
    ctx.globalAlpha = p.life / p.maxLife;
    
    if (p.shape === 'star') {
      drawStar(ctx, p.x, p.y, 5, p.size * 2, p.size, p.color);
    } else if (p.shape === 'heart') {
      drawHeart(ctx, p.x, p.y - p.size, p.size * 3, p.color);
    } else if (p.shape === 'spray') {
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x, p.y, p.size, p.size);
    } else {
      // Circle default
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.fill();
    }
  });
  ctx.globalAlpha = 1.0;
};

// Used for "Trails" (Non-persistent)
export const renderLine = (
  ctx: CanvasRenderingContext2D, 
  points: Point[], 
  color: string, 
  width: number, 
  glow: number, 
  glowEnabled: boolean
) => {
  if (points.length < 2) return;

  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.lineWidth = width;
  ctx.strokeStyle = color;

  if (glowEnabled && glow > 0) {
    ctx.shadowBlur = glow;
    ctx.shadowColor = color;
  } else {
    ctx.shadowBlur = 0;
  }

  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  
  // Smooth quadratic bezier curve
  for (let i = 1; i < points.length - 1; i++) {
    const xc = (points[i].x + points[i + 1].x) / 2;
    const yc = (points[i].y + points[i + 1].y) / 2;
    ctx.quadraticCurveTo(points[i].x, points[i].y, xc, yc);
  }
  
  // Connect the last point
  if (points.length > 2) {
      ctx.lineTo(points[points.length - 1].x, points[points.length - 1].y);
  } else {
      ctx.lineTo(points[1].x, points[1].y);
  }

  ctx.stroke();
  
  // Reset shadow for performance
  ctx.shadowBlur = 0;
};

// Used for "Painting" (Persistent)
export const drawSegment = (
  ctx: CanvasRenderingContext2D,
  from: Point,
  to: Point,
  color: string,
  width: number,
  glow: number,
  glowEnabled: boolean
) => {
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.lineWidth = width;
  ctx.strokeStyle = color;

  if (glowEnabled && glow > 0) {
    ctx.shadowBlur = glow;
    ctx.shadowColor = color;
  } else {
    ctx.shadowBlur = 0;
  }

  ctx.beginPath();
  ctx.moveTo(from.x, from.y);
  ctx.lineTo(to.x, to.y);
  ctx.stroke();

  ctx.shadowBlur = 0;
};