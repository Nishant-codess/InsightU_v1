import { useEffect, useRef } from 'react';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  type: 'circle' | 'diamond';
  color: string;
  opacity: number;
  size: number;
}

function createParticle(
  width: number,
  height: number,
  primaryColor: string,
  secondaryColor: string,
  index: number
): Particle {
  return {
    x: Math.random() * width,
    y: Math.random() * height,
    vx: (Math.random() - 0.5) * 0.8,
    vy: (Math.random() - 0.5) * 0.8,
    type: Math.random() < 0.5 ? 'circle' : 'diamond',
    color: index % 2 === 0 ? primaryColor : secondaryColor,
    opacity: 0.3 + Math.random() * 0.5,
    size: Math.random() < 0.5
      ? 2 + Math.random() * 3   // circle: radius 2–5
      : 4 + Math.random() * 4,  // diamond: half-size 4–8
  };
}

function drawParticle(ctx: CanvasRenderingContext2D, p: Particle) {
  ctx.save();
  ctx.globalAlpha = p.opacity;
  ctx.fillStyle = p.color;
  ctx.strokeStyle = p.color;

  if (p.type === 'circle') {
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // Diamond: rotated square drawn with moveTo/lineTo
    const s = p.size;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y - s);
    ctx.lineTo(p.x + s, p.y);
    ctx.lineTo(p.x, p.y + s);
    ctx.lineTo(p.x - s, p.y);
    ctx.closePath();
    ctx.fill();
  }

  ctx.restore();
}

export default function DoraemonBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Read CSS variables at mount time
    const style = getComputedStyle(document.documentElement);
    const primaryColor = style.getPropertyValue('--deco-particle-color').trim() || '#1E90FF';
    const secondaryColor = style.getPropertyValue('--deco-particle-secondary').trim() || '#FFD700';

    // Size canvas to viewport
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();

    const count = window.innerWidth < 768 ? 80 : 150;
    const particles: Particle[] = Array.from({ length: count }, (_, i) =>
      createParticle(canvas.width, canvas.height, primaryColor, secondaryColor, i)
    );

    // Static render for reduced-motion users
    if (reducedMotion) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach((p) => drawParticle(ctx, p));
      return;
    }

    let rafId: number;

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (const p of particles) {
        // Move
        p.x += p.vx;
        p.y += p.vy;

        // Wrap around edges
        if (p.x < -10) p.x = canvas.width + 10;
        else if (p.x > canvas.width + 10) p.x = -10;
        if (p.y < -10) p.y = canvas.height + 10;
        else if (p.y > canvas.height + 10) p.y = -10;

        drawParticle(ctx, p);
      }

      rafId = requestAnimationFrame(animate);
    };

    rafId = requestAnimationFrame(animate);

    const handleResize = () => {
      resize();
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 0,
        pointerEvents: 'none',
        width: '100%',
        height: '100%',
      }}
    />
  );
}
