import { useEffect, useRef } from 'react';

interface Star {
  x: number;
  y: number;
  radius: number;
  color: string;
  twinklePhase: number;
  twinkleSpeed: number;
}

export default function AnimeBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Read CSS variables at mount time
    const style = getComputedStyle(document.documentElement);
    const primaryColor = style.getPropertyValue('--deco-particle-color').trim() || '#FF6B9D';
    const secondaryColor = style.getPropertyValue('--deco-particle-secondary').trim() || '#FFD700';

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const COUNT = 120;
    const stars: Star[] = Array.from({ length: COUNT }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      radius: 0.5 + Math.random() * 2,        // 0.5–2.5
      color: Math.random() < 0.5 ? primaryColor : secondaryColor,
      twinklePhase: Math.random() * Math.PI * 2,
      twinkleSpeed: 0.02 + Math.random() * 0.03, // 0.02–0.05
    }));

    function drawStar(star: Star, opacity: number) {
      ctx!.save();
      ctx!.globalAlpha = opacity;
      ctx!.fillStyle = star.color;
      ctx!.strokeStyle = star.color;

      // Circle
      ctx!.beginPath();
      ctx!.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
      ctx!.fill();

      // 4-point sparkle cross for larger stars
      if (star.radius > 1.5) {
        const len = star.radius * 3;
        ctx!.lineWidth = 0.8;
        ctx!.globalAlpha = opacity * 0.7;

        for (let i = 0; i < 4; i++) {
          const angle = (i * Math.PI) / 4; // 0°, 45°, 90°, 135°
          ctx!.beginPath();
          ctx!.moveTo(
            star.x - Math.cos(angle) * len,
            star.y - Math.sin(angle) * len
          );
          ctx!.lineTo(
            star.x + Math.cos(angle) * len,
            star.y + Math.sin(angle) * len
          );
          ctx!.stroke();
        }
      }

      ctx!.restore();
    }

    // Static render for reduced-motion users
    if (reducedMotion) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const star of stars) {
        drawStar(star, 1);
      }
      return;
    }

    let rafId: number;

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (const star of stars) {
        star.twinklePhase += star.twinkleSpeed;
        const opacity = 0.3 + 0.7 * (0.5 + 0.5 * Math.sin(star.twinklePhase));
        drawStar(star, opacity);
      }

      rafId = requestAnimationFrame(animate);
    };

    rafId = requestAnimationFrame(animate);

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
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
