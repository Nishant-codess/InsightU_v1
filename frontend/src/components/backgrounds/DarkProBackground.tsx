import { useEffect, useRef } from 'react';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
}

function createParticle(width: number, height: number, color: string): Particle {
  return {
    x: Math.random() * width,
    y: Math.random() * height,
    vx: (Math.random() - 0.5) * 0.6,
    vy: (Math.random() - 0.5) * 0.6,
    radius: 1.5 + Math.random() * 1.5,
    color,
  };
}

const CONNECTION_DISTANCE = 120;

function drawFrame(
  ctx: CanvasRenderingContext2D,
  particles: Particle[],
  lineColor: string
) {
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

  // Draw connecting lines between nearby particles
  for (let i = 0; i < particles.length; i++) {
    for (let j = i + 1; j < particles.length; j++) {
      const a = particles[i];
      const b = particles[j];
      const dx = a.x - b.x;
      const dy = a.y - b.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < CONNECTION_DISTANCE) {
        const alpha = 1 - dist / CONNECTION_DISTANCE;
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.strokeStyle = lineColor;
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
        ctx.restore();
      }
    }
  }

  // Draw particles
  for (const p of particles) {
    ctx.save();
    ctx.fillStyle = p.color;
    ctx.globalAlpha = 0.8;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

export default function DarkProBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Read CSS variables at mount time
    const style = getComputedStyle(document.documentElement);
    const primaryColor = style.getPropertyValue('--deco-particle-color').trim() || '#66FCF1';
    const secondaryColor = style.getPropertyValue('--deco-particle-secondary').trim() || '#45A29E';
    const lineColor = style.getPropertyValue('--deco-web-line-color').trim() || 'rgba(102,252,241,0.08)';

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();

    const PARTICLE_COUNT = 80;
    const particles: Particle[] = Array.from({ length: PARTICLE_COUNT }, (_, i) =>
      createParticle(canvas.width, canvas.height, i % 3 === 0 ? secondaryColor : primaryColor)
    );

    if (reducedMotion) {
      drawFrame(ctx, particles, lineColor);
      return;
    }

    let rafId: number;

    const animate = () => {
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;

        // Wrap around edges
        if (p.x < -10) p.x = canvas.width + 10;
        else if (p.x > canvas.width + 10) p.x = -10;
        if (p.y < -10) p.y = canvas.height + 10;
        else if (p.y > canvas.height + 10) p.y = -10;
      }

      drawFrame(ctx, particles, lineColor);
      rafId = requestAnimationFrame(animate);
    };

    rafId = requestAnimationFrame(animate);

    const handleResize = () => resize();
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
