import { useEffect, useState } from 'react';

/**
 * SpidermanBackground
 * Purely decorative fixed full-screen layer rendered when the spiderman theme is active.
 * Uses CSS variables set by the theme system:
 *   --deco-web-line-color, --deco-web-dot-color, --deco-halftone-color,
 *   --deco-action-line-color, --deco-glow-color
 */
export default function SpidermanBackground() {
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  return (
    <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
      {/* ── Keyframe styles ─────────────────────────────────────────────── */}
      {!reducedMotion && (
        <style>{`
          @keyframes web-pulse {
            0%, 100% { opacity: 1; }
            50%       { opacity: 0.4; }
          }
          @keyframes halftone-drift {
            0%   { transform: translate(0, 0); }
            100% { transform: translate(20px, 20px); }
          }
          .spider-web-svg {
            animation: web-pulse 6s ease-in-out infinite;
          }
          .halftone-layer {
            animation: halftone-drift 20s linear infinite alternate;
          }
        `}</style>
      )}

      {/* ── Diagonal action lines ────────────────────────────────────────── */}
      <svg
        aria-hidden="true"
        xmlns="http://www.w3.org/2000/svg"
        className="absolute inset-0 w-full h-full"
        preserveAspectRatio="none"
      >
        {Array.from({ length: 18 }, (_, i) => {
          const x = (i / 17) * 200 - 50; // spread across -50% to 150%
          return (
            <line
              key={i}
              x1={`${x}%`} y1="-10%"
              x2={`${x + 30}%`} y2="110%"
              stroke="var(--deco-action-line-color)"
              strokeWidth="1"
            />
          );
        })}
      </svg>

      {/* ── Halftone dot grid ────────────────────────────────────────────── */}
      <svg
        aria-hidden="true"
        xmlns="http://www.w3.org/2000/svg"
        className={`absolute inset-0 w-full h-full halftone-layer`}
      >
        <defs>
          <pattern id="halftone" x="0" y="0" width="24" height="24" patternUnits="userSpaceOnUse">
            <circle cx="12" cy="12" r="2" fill="var(--deco-halftone-color)" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#halftone)" />
      </svg>

      {/* ── Web pattern SVG ──────────────────────────────────────────────── */}
      <svg
        aria-hidden="true"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 1440 900"
        className={`absolute inset-0 w-full h-full spider-web-svg`}
        preserveAspectRatio="xMidYMid slice"
      >
        {/* Top-left corner web */}
        <WebCorner cx={0} cy={0} />
        {/* Bottom-right corner web */}
        <WebCorner cx={1440} cy={900} flip />
      </svg>
    </div>
  );
}

// ── Helper: renders radial lines + concentric arcs from a corner ─────────────

interface WebCornerProps {
  cx: number;
  cy: number;
  flip?: boolean;
}

function WebCorner({ cx, cy, flip = false }: WebCornerProps) {
  const radialCount = 10;
  const arcRadii = [120, 220, 320, 420, 520];
  // Angle sweep: 0–90° for top-left, 180–270° for bottom-right
  const startAngle = flip ? Math.PI : 0;
  const endAngle = flip ? (3 * Math.PI) / 2 : Math.PI / 2;

  const lines = Array.from({ length: radialCount }, (_, i) => {
    const t = i / (radialCount - 1);
    const angle = startAngle + t * (endAngle - startAngle);
    const length = 560;
    const x2 = cx + Math.cos(angle) * length;
    const y2 = cy + Math.sin(angle) * length;
    return (
      <line
        key={i}
        x1={cx} y1={cy}
        x2={x2} y2={y2}
        stroke="var(--deco-web-line-color)"
        strokeWidth="1"
      />
    );
  });

  const arcs = arcRadii.map((r) => {
    const x1 = cx + Math.cos(startAngle) * r;
    const y1 = cy + Math.sin(startAngle) * r;
    const x2 = cx + Math.cos(endAngle) * r;
    const y2 = cy + Math.sin(endAngle) * r;
    return (
      <path
        key={r}
        d={`M ${x1} ${y1} A ${r} ${r} 0 0 ${flip ? 0 : 1} ${x2} ${y2}`}
        fill="none"
        stroke="var(--deco-web-line-color)"
        strokeWidth="1"
      />
    );
  });

  // Dot at each arc/radial intersection
  const dots = arcRadii.flatMap((r) =>
    Array.from({ length: radialCount }, (_, i) => {
      const t = i / (radialCount - 1);
      const angle = startAngle + t * (endAngle - startAngle);
      return (
        <circle
          key={`${r}-${i}`}
          cx={cx + Math.cos(angle) * r}
          cy={cy + Math.sin(angle) * r}
          r="2"
          fill="var(--deco-web-dot-color)"
        />
      );
    })
  );

  return (
    <g>
      {lines}
      {arcs}
      {dots}
    </g>
  );
}
