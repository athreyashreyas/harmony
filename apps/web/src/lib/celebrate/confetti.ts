// A small, self-contained confetti burst. No dependency, so we own the palette
// (tinted to the section's own colour) and can keep it soft and papery rather
// than the usual loud primary-colour shower. Draws to a throwaway full-screen
// canvas, animates with requestAnimationFrame, then removes itself.
//
// Honours prefers-reduced-motion by doing nothing at all — the celebration is
// pure motion, so there's nothing meaningful lost by sitting it out (the
// congratulatory note in CelebrationToast still shows).

import { hexToRgb } from '../color';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rot: number;
  vr: number;
  size: number;
  color: string;
  life: number;
}

const GRAVITY = 0.16; // px/frame^2, pulling the pieces back down
const DRAG = 0.99; // air resistance, so they drift rather than fly forever

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

// A gentle spread around one section colour: the hue itself, two lighter tints,
// and a little white, so the burst clearly belongs to that area without being
// garish. Given several section colours, each contributes its own family.
function paletteFor(hex: string): string[] {
  const { r, g, b } = hexToRgb(hex);
  const tint = (t: number) =>
    `rgb(${Math.round(r + (255 - r) * t)}, ${Math.round(g + (255 - g) * t)}, ${Math.round(b + (255 - b) * t)})`;
  return [`rgb(${r}, ${g}, ${b})`, tint(0.28), tint(0.55), '#ffffff'];
}

export function fireConfetti(opts: {
  // Section accent colours (hex). Each is expanded into a soft family of tints.
  colors: string[];
  // Normalised viewport origin (0..1). Defaults to the upper-middle, roughly
  // where the Bloom sits, when the caller can't measure it.
  origin?: { x: number; y: number };
  count?: number;
  // The whole Bloom in full bloom at once: a bigger, longer, wider shower that
  // rains across the screen rather than a single tidy burst.
  grand?: boolean;
}): void {
  if (prefersReducedMotion() || typeof document === 'undefined') return;

  const grand = opts.grand ?? false;
  const maxLife = grand ? 2.6 : 1.7; // seconds each piece lives
  const fadeAt = grand ? 1.7 : 1.0; // seconds before it starts to fade out

  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const canvas = document.createElement('canvas');
  canvas.setAttribute('aria-hidden', 'true');
  canvas.style.cssText =
    'position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:80;';
  document.body.appendChild(canvas);
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    canvas.remove();
    return;
  }

  const W = window.innerWidth;
  const H = window.innerHeight;
  canvas.width = W * dpr;
  canvas.height = H * dpr;

  const ox = (opts.origin?.x ?? 0.5) * W;
  const oy = (opts.origin?.y ?? 0.36) * H;
  const palette = opts.colors.flatMap(paletteFor);
  const colors = palette.length ? palette : ['#ffffff'];
  const count = opts.count ?? (grand ? 170 : 80);

  const particles: Particle[] = Array.from({ length: count }, () => {
    // Fan outward and upward from the origin, like petals lifting off. The grand
    // shower starts spread across the width and launches harder, so it arcs over
    // the whole screen rather than blooming from a single point.
    const angle = Math.random() * Math.PI * 2;
    const speed = grand ? 5 + Math.random() * 8 : 3 + Math.random() * 6;
    return {
      x: grand ? ox + (Math.random() - 0.5) * W * 0.5 : ox,
      y: oy,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - (grand ? 5 + Math.random() * 5 : 3 + Math.random() * 3),
      rot: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.32,
      size: 5 + Math.random() * 5,
      color: colors[Math.floor(Math.random() * colors.length)],
      life: 0,
    };
  });

  let raf = 0;
  let last = performance.now();
  let removed = false;
  function cleanup() {
    if (removed) return;
    removed = true;
    cancelAnimationFrame(raf);
    canvas.remove();
  }

  function frame(t: number) {
    const dt = Math.min((t - last) / 1000, 0.05);
    last = t;
    const step = dt * 60; // normalise the per-frame velocities to ~60fps
    ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx!.clearRect(0, 0, W, H);

    let alive = false;
    for (const p of particles) {
      p.life += dt;
      if (p.life >= maxLife) continue;
      p.vx *= DRAG;
      p.vy = p.vy * DRAG + GRAVITY * step;
      p.x += p.vx * step;
      p.y += p.vy * step;
      p.rot += p.vr * step;

      const fade =
        p.life < fadeAt ? 1 : Math.max(0, 1 - (p.life - fadeAt) / (maxLife - fadeAt));
      if (fade <= 0) continue;
      alive = true;

      ctx!.save();
      ctx!.globalAlpha = fade;
      ctx!.translate(p.x, p.y);
      ctx!.rotate(p.rot);
      ctx!.fillStyle = p.color;
      // Little rounded-ish rectangles read as soft petals/paper, not hard dots.
      ctx!.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.62);
      ctx!.restore();
    }

    if (alive) raf = requestAnimationFrame(frame);
    else cleanup();
  }
  raf = requestAnimationFrame(frame);

  // Belt-and-braces: never leave a canvas behind if the tab was backgrounded
  // mid-run (rAF pauses) or anything else stalls the loop.
  window.setTimeout(cleanup, (maxLife + 1) * 1000);
}
