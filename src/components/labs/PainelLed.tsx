import { useEffect, useRef } from 'react';

/**
 * Painel LED da Webtech Labs — o símbolo power desenhado em pontos.
 *
 * O círculo é o 0 (azul) e o traço é o 1 (amarelo): é daí que vem o nome do
 * podcast «Zeros e Uns» e é a assinatura visual do site. Este componente é o
 * mesmo painel do hero de podcast.html, traduzido para React sem mudar a
 * geometria (a do favicon.svg) nem as cores — o design system do Labs é o da
 * Webtech, ponto por ponto.
 *
 * Comportamento:
 *  - os pontos acendem do centro para fora ao entrar;
 *  - de vez em quando um bit apagado pisca (os dados a passar);
 *  - o cursor é uma lanterna que acende os pontos à volta;
 *  - com movimento reduzido fica parado, já aceso;
 *  - fora do ecrã para de desenhar.
 *
 * Grelha ÍMPAR de propósito: com N par o traço cai entre duas colunas e fica
 * mais fino do que o círculo.
 */
const Y = '#ffd60a';
const B = '#2e6bff';
const OFF = 'rgba(243,243,238,.085)';

const SYM = { cx: 50, cy: 56.93, r: 33, t: 4.75, gap: (34.1 * Math.PI) / 180, bx: 50, by1: 16, by2: 50 };
const EX = SYM.cx + Math.sin(SYM.gap) * SYM.r;
const EY = SYM.cy - Math.cos(SYM.gap) * SYM.r;

function dRing(u: number, v: number) {
  const dx = u - SYM.cx, dy = v - SYM.cy;
  if (Math.abs(Math.atan2(dx, -dy)) > SYM.gap) return Math.abs(Math.hypot(dx, dy) - SYM.r) - SYM.t;
  return Math.min(Math.hypot(u - EX, v - EY), Math.hypot(u - (2 * SYM.cx - EX), v - EY)) - SYM.t;
}
const dBar = (u: number, v: number) =>
  Math.hypot(u - SYM.bx, v - Math.max(SYM.by1, Math.min(SYM.by2, v))) - SYM.t;
const clamp = (n: number, a: number, b: number) => Math.min(b, Math.max(a, n));

interface Ponto { x: number; y: number; k: number; c: string; b: number; flash: number; fc: string; delay: number }

export function PainelLed({ n = 33, className }: { n?: number; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const led = ref.current;
    if (!led) return;
    const ctx = led.getContext('2d');
    if (!ctx) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const N = n % 2 ? n : n + 1;
    let W = 0, P = 0, dots: Ponto[] = [], t0 = 0, raf = 0, visible = true;
    let ptr: { x: number; y: number } | null = null;

    const layout = () => {
      const box = led.getBoundingClientRect();
      W = Math.max(200, Math.round(box.width));
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      led.width = W * dpr; led.height = W * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      P = W / N;
      const S = (W * 0.74) / 83.43; // altura do símbolo = 74% do painel
      const OX = W / 2 - 50 * S, OY = W / 2 - (11.25 + 83.43 / 2) * S;
      const pu = P / S;
      dots = [];
      for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
        const x = (i + 0.5) * P, y = (j + 0.5) * P, u = (x - OX) / S, v = (y - OY) / S;
        const kr = clamp(0.5 - dRing(u, v) / pu, 0, 1), kb = clamp(0.5 - dBar(u, v) / pu, 0, 1);
        const k = Math.max(kr, kb);
        const dist = Math.hypot(x - W / 2, y - W / 2) / (W * 0.7);
        dots.push({ x, y, k, c: kb > kr ? Y : B, b: reduced ? k : 0, flash: 0, fc: B, delay: dist * 900 + Math.random() * 350 });
      }
    };

    const frame = (now: number) => {
      if (!t0) t0 = now;
      const el = now - t0, r0 = P * 0.1, r1 = P * 0.37;
      if (!reduced && el > 1400 && Math.random() < 0.5) {
        const d = dots[Math.floor(Math.random() * dots.length)];
        if (d.k < 0.05) { d.flash = 1; d.fc = Math.random() < 0.8 ? B : Y; }
      }
      const off = new Path2D(), py = new Path2D(), pb = new Path2D();
      const pr = P * 2.6;
      for (const d of dots) {
        if (!reduced) d.b += ((el > d.delay ? d.k : 0) - d.b) * 0.14;
        d.flash *= 0.93;
        let b = d.b, c = d.c;
        const f = d.flash * 0.7;
        if (f > b) { b = f; c = d.fc; }
        if (ptr) {
          const q = 1 - Math.hypot(d.x - ptr.x, d.y - ptr.y) / pr;
          if (q > 0 && q * 0.9 > b) { b = q * 0.9; c = d.k > 0.05 ? d.c : B; }
        }
        const path = b < 0.06 ? off : c === Y ? py : pb;
        const r = b < 0.06 ? r0 : r0 + (r1 - r0) * b;
        path.moveTo(d.x + r, d.y);
        path.arc(d.x, d.y, r, 0, Math.PI * 2);
      }
      ctx.clearRect(0, 0, W, W);
      const g = ctx.createRadialGradient(W / 2, W / 2, 0, W / 2, W / 2, W * 0.55);
      g.addColorStop(0, 'rgba(46,107,255,.12)'); g.addColorStop(1, 'rgba(46,107,255,0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, W);
      ctx.fillStyle = OFF; ctx.fill(off);
      ctx.shadowBlur = P * 0.7;
      ctx.shadowColor = B; ctx.fillStyle = B; ctx.fill(pb);
      ctx.shadowColor = Y; ctx.fillStyle = Y; ctx.fill(py);
      ctx.shadowBlur = 0;
      if (!reduced && visible) raf = requestAnimationFrame(frame);
    };
    const start = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(frame); };

    layout(); start();
    const ro = new ResizeObserver(() => { layout(); if (reduced) start(); });
    ro.observe(led);
    const io = new IntersectionObserver(es => { visible = es[0].isIntersecting; if (visible && !reduced) start(); });
    io.observe(led);
    const onMove = (e: PointerEvent) => { const r = led.getBoundingClientRect(); ptr = { x: e.clientX - r.left, y: e.clientY - r.top }; };
    const onLeave = () => { ptr = null; };
    if (!reduced) {
      led.addEventListener('pointermove', onMove);
      led.addEventListener('pointerleave', onLeave);
    }
    return () => {
      cancelAnimationFrame(raf); ro.disconnect(); io.disconnect();
      led.removeEventListener('pointermove', onMove);
      led.removeEventListener('pointerleave', onLeave);
    };
  }, [n]);

  return <canvas ref={ref} className={className} style={{ width: '100%', aspectRatio: '1 / 1', display: 'block' }} aria-hidden="true" />;
}

export default PainelLed;
