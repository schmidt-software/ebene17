/* ---------------------------------------------------------------
   EBENE 17 — Zeichenschicht
   Alles wird zur Laufzeit aus isometrischen Quadern gebaut.
   --------------------------------------------------------------- */
(function (F) {
'use strict';

const HW = F.TILE_W / 2, HH = F.TILE_H / 2;
const MAP = F.MAP;

/* ---------- Farbhelfer ---------- */
const _shadeCache = Object.create(null);
function shade(hex, k) {
  const key = hex + '|' + k;
  const hit = _shadeCache[key];
  if (hit) return hit;
  let r = parseInt(hex.substr(1, 2), 16), g = parseInt(hex.substr(3, 2), 16), b = parseInt(hex.substr(5, 2), 16);
  if (k >= 0) { r += (255 - r) * k; g += (255 - g) * k; b += (255 - b) * k; }
  else { r *= (1 + k); g *= (1 + k); b *= (1 + k); }
  const out = 'rgb(' + (r | 0) + ',' + (g | 0) + ',' + (b | 0) + ')';
  _shadeCache[key] = out;
  return out;
}
F.shade = shade;

/* ---------- Grundformen ---------- */
function poly(ctx, pts) {
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.closePath();
  ctx.fill();
}

/* Isometrische Raute (Bodenkachel) */
function diamond(ctx, x, y, color, inset) {
  const cx = (x - y) * HW, cy = (x + y) * HH;
  const w = HW - (inset || 0), h = HH - (inset || 0) / 2;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx + w, cy + h);
  ctx.lineTo(cx, cy + h * 2);
  ctx.lineTo(cx - w, cy + h);
  ctx.closePath();
  ctx.fill();
}
F.diamond = diamond;

/* Quader: x/y = Kachelkoordinate der oberen Ecke, h = Höhe in Pixeln */
function box(ctx, x, y, w, d, h, col, topCol) {
  const ax = (x - y) * HW,             ay = (x + y) * HH;
  const bx = (x + w - y) * HW,         by = (x + w + y) * HH;
  const cx = (x + w - y - d) * HW,     cy = (x + w + y + d) * HH;
  const dx = (x - y - d) * HW,         dy = (x + y + d) * HH;
  /* rechte Seite */
  ctx.fillStyle = shade(col, -0.28);
  poly(ctx, [[bx, by - h], [cx, cy - h], [cx, cy], [bx, by]]);
  /* linke Seite */
  ctx.fillStyle = shade(col, -0.48);
  poly(ctx, [[dx, dy - h], [cx, cy - h], [cx, cy], [dx, dy]]);
  /* Deckel */
  ctx.fillStyle = topCol || shade(col, 0.12);
  poly(ctx, [[ax, ay - h], [bx, by - h], [cx, cy - h], [dx, dy - h]]);
}
F.box = box;

/* Leuchtender Fleck (additiv) */
function glow(ctx, px, py, r, color, alpha) {
  const g = ctx.createRadialGradient(px, py, 0, px, py, r);
  g.addColorStop(0, color);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.globalAlpha = alpha === undefined ? 0.35 : alpha;
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(px, py, r, 0, 6.2832); ctx.fill();
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1;
}
F.glow = glow;

function ellipse(ctx, px, py, rx, ry, color) {
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.ellipse(px, py, rx, ry, 0, 0, 6.2832); ctx.fill();
}

/* ---------- Objekte ---------- */
/* Jedes Möbelstück kennt seine eigene kleine Animation. */
const DRAW = {

  wall: function (ctx, p) {
    box(ctx, p.x, p.y, p.w, p.d, p.h, p.col);
  },

  rack: function (ctx, p, t) {
    box(ctx, p.x, p.y, p.w, p.d, p.h, p.col);
    const fx = (p.x + p.w - p.y) * HW, fy = (p.x + p.w + p.y) * HH;
    for (let i = 0; i < p.leds; i++) {
      const on = ((Math.sin(t * (2 + i * 0.7) + p.ph + i) > 0.1) ? 1 : 0.15);
      ctx.globalAlpha = on;
      ctx.fillStyle = i % 3 === 0 ? '#ff7a6b' : p.accent;
      ctx.fillRect(fx - 9, fy - p.h + 6 + i * (p.h - 12) / p.leds, 5, 2.5);
      ctx.globalAlpha = 1;
    }
    if (Math.sin(t * 1.3 + p.ph) > 0.85) glow(ctx, fx - 6, fy - p.h * 0.5, 22, p.accent, 0.18);
  },

  lamp: function (ctx, p, t) {
    box(ctx, p.x, p.y, p.w, p.d, p.h, p.col);
    const cx = (p.x + p.w / 2 - p.y - p.d / 2) * HW;
    const cy = (p.x + p.w / 2 + p.y + p.d / 2) * HH - p.h;
    const fl = 0.85 + Math.sin(t * 3 + p.ph) * 0.15;
    ellipse(ctx, cx, cy - 3, 5, 5, p.glow);
    glow(ctx, cx, cy - 3, 60, p.glow, 0.22 * fl);
  },

  counter: function (ctx, p, t) {
    box(ctx, p.x, p.y, p.w, p.d, p.h, p.col);
    const ax = (p.x - p.y) * HW, ay = (p.x + p.y) * HH;
    ctx.fillStyle = shade(p.col, 0.3);
    poly(ctx, [[ax, ay - p.h], [ax + p.w * HW, ay + p.w * HH - p.h],
               [ax + p.w * HW - 6, ay + p.w * HH - p.h + 3], [ax - 6, ay - p.h + 3]]);
    for (let i = 0; i < p.w; i += 2) {
      const px = (p.x + i + 0.5 - p.y - 0.3) * HW, py = (p.x + i + 0.5 + p.y + 0.3) * HH - p.h;
      ctx.fillStyle = i % 4 === 0 ? p.accent : '#d9e2ec';
      ctx.fillRect(px - 3, py - 7, 6, 7);
      if (i % 4 === 0) {                       // Dampf
        const s = (t * 0.6 + i) % 1;
        ctx.globalAlpha = (1 - s) * 0.35;
        ellipse(ctx, px + Math.sin(t * 2 + i) * 3, py - 10 - s * 16, 3 + s * 4, 2 + s * 3, '#ffffff');
        ctx.globalAlpha = 1;
      }
    }
  },

  table: function (ctx, p) {
    box(ctx, p.x + 0.1, p.y + 0.1, p.w - 0.2, p.d - 0.2, p.h - 3, shade(p.col, -0.35));
    box(ctx, p.x, p.y, p.w, p.d, p.h, p.col);
  },

  chair: function (ctx, p) { box(ctx, p.x, p.y, p.w, p.d, p.h, p.col); },

  seat: function (ctx, p) {
    box(ctx, p.x, p.y, p.w, p.d, p.h, p.col);
    box(ctx, p.x, p.y + p.d - 0.18, p.w, 0.18, p.h + 14, shade(p.col, -0.1));
  },

  desk: function (ctx, p, t) {
    box(ctx, p.x, p.y, p.w, p.d, p.h, p.col);
    const mx = p.x + p.w * 0.55, my = p.y + p.d * 0.2;
    box(ctx, mx, my, 0.5, 0.12, 9, '#20262f');
    const sx = (mx + 0.5 - my) * HW, sy = (mx + 0.5 + my) * HH - p.h - 9;
    ctx.fillStyle = p.screen;
    ctx.globalAlpha = 0.55 + Math.sin(t * 6 + p.ph) * 0.12;
    poly(ctx, [[sx - 1, sy + 2], [sx - 15, sy + 9], [sx - 15, sy + 17], [sx - 1, sy + 10]]);
    ctx.globalAlpha = 1;
    glow(ctx, sx - 8, sy + 9, 26, p.screen, 0.16);
  },

  partition: function (ctx, p) { box(ctx, p.x, p.y, p.w, p.d, p.h, p.col); },

  tank: function (ctx, p, t) {
    box(ctx, p.x, p.y, p.w, p.d, 6, '#39434f');
    const cx = (p.x + p.w / 2 - p.y - p.d / 2) * HW;
    const cy = (p.x + p.w / 2 + p.y + p.d / 2) * HH;
    const w = 11, h = p.h - 8;
    ctx.fillStyle = 'rgba(140,190,220,.30)';
    ctx.fillRect(cx - w / 2, cy - 6 - h, w, h);
    const lvl = h * (0.55 + Math.sin(t * 1.4 + p.ph) * 0.05);
    ctx.fillStyle = p.glow; ctx.globalAlpha = 0.55;
    ctx.fillRect(cx - w / 2 + 1, cy - 6 - lvl, w - 2, lvl);
    ctx.globalAlpha = 1;
    for (let b = 0; b < 3; b++) {
      const s = (t * 0.5 + b * 0.33 + p.ph) % 1;
      ctx.globalAlpha = 0.5 * (1 - s);
      ellipse(ctx, cx - 2 + b * 2, cy - 8 - s * lvl, 1.4, 1.4, '#ffffff');
      ctx.globalAlpha = 1;
    }
    glow(ctx, cx, cy - 6 - h / 2, 30, p.glow, 0.2);
    ctx.fillStyle = '#48545f'; ctx.fillRect(cx - w / 2 - 1, cy - 7 - h, w + 2, 4);
  },

  machine: function (ctx, p, t) {
    box(ctx, p.x, p.y, p.w, p.d, p.h, p.col);
    const fx = (p.x + p.w - p.y - p.d / 2) * HW, fy = (p.x + p.w + p.y + p.d / 2) * HH - p.h * 0.55;
    if (p.fan) {                                   // rotierendes Lüfterrad
      ctx.save(); ctx.translate(fx - 7, fy + 4); ctx.scale(0.5, 1);
      ctx.rotate(t * 5 + p.ph);
      ctx.strokeStyle = shade(p.col, 0.35); ctx.lineWidth = 2.4;
      for (let i = 0; i < 3; i++) {
        ctx.beginPath(); ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(i * 2.09) * 8, Math.sin(i * 2.09) * 8); ctx.stroke();
      }
      ctx.restore();
    }
    ctx.fillStyle = p.accent;
    ctx.globalAlpha = Math.sin(t * 4 + p.ph) > 0 ? 0.95 : 0.25;
    ctx.fillRect(fx - 16, fy - 6, 4, 4);
    ctx.globalAlpha = 1;
  },

  conveyor: function (ctx, p, t) {
    box(ctx, p.x, p.y, p.w, p.d, p.h, p.col);
    const n = Math.floor(p.w);
    for (let i = 0; i < n; i++) {
      const off = (t * 0.9 + i) % n;
      const x = p.x + off, y = p.y + p.d / 2;
      const px = (x - y) * HW, py = (x + y) * HH - p.h;
      ctx.fillStyle = i % 3 === 0 ? p.accent : shade(p.col, 0.22);
      ctx.globalAlpha = 0.8;
      poly(ctx, [[px, py - 3], [px + 9, py + 1.5], [px, py + 6], [px - 9, py + 1.5]]);
      ctx.globalAlpha = 1;
      if (i % 3 === 0) box(ctx, x - 0.2, y - 0.2, 0.4, 0.4, 9, '#7a5a36');
    }
  },

  crate: function (ctx, p) {
    box(ctx, p.x, p.y, p.w, p.d, p.h, p.col);
    const bx = (p.x + p.w - p.y) * HW, by = (p.x + p.w + p.y) * HH;
    ctx.strokeStyle = shade(p.col, -0.55); ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(bx - 2, by - p.h + 4); ctx.lineTo(bx - 2 - p.d * HW + 4, by + p.d * HH - 4);
    ctx.stroke();
    ctx.fillStyle = p.accent; ctx.globalAlpha = 0.75;
    ctx.fillRect(bx - 14, by - p.h + 8, 8, 3);
    ctx.globalAlpha = 1;
  },

  barrel: function (ctx, p) {
    box(ctx, p.x + 0.08, p.y + 0.08, p.w - 0.16, p.d - 0.16, p.h, p.col);
    const cx = (p.x + p.w / 2 - p.y - p.d / 2) * HW, cy = (p.x + p.w / 2 + p.y + p.d / 2) * HH;
    ellipse(ctx, cx, cy - p.h, 10, 5, shade(p.col, 0.25));
    ctx.strokeStyle = shade(p.col, -0.5); ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(cx - 10, cy - p.h * 0.6); ctx.lineTo(cx + 10, cy - p.h * 0.6); ctx.stroke();
  },

  shelf: function (ctx, p) {
    box(ctx, p.x, p.y, p.w, p.d, p.h, p.col);
    const bx = (p.x + p.w - p.y) * HW, by = (p.x + p.w + p.y) * HH;
    let s = p.seed;
    const cols = ['#b8534a', '#c8a04a', '#4a7fb8', '#6ab85a', '#9a5ab8', '#c47a3a'];
    for (let row = 0; row < 3; row++) {
      let off = 0;
      while (off < 18) {
        s = (s * 1103515245 + 12345) & 0x7fffffff;
        const bw = 2 + (s % 3);
        ctx.fillStyle = cols[s % cols.length];
        ctx.fillRect(bx - 20 + off, by - p.h + 6 + row * 12, bw, 9);
        off += bw + 1;
      }
    }
  },

  locker: function (ctx, p) {
    box(ctx, p.x, p.y, p.w, p.d, p.h, p.col);
    const bx = (p.x + p.w - p.y) * HW, by = (p.x + p.w + p.y) * HH;
    ctx.strokeStyle = shade(p.col, -0.4); ctx.lineWidth = 1;
    for (let i = 1; i < 3; i++) {
      ctx.beginPath(); ctx.moveTo(bx - 16, by - p.h + i * 12); ctx.lineTo(bx - 2, by - p.h + i * 12 + 7); ctx.stroke();
    }
    ctx.fillStyle = p.accent; ctx.fillRect(bx - 7, by - p.h + 7, 2, 2);
  },

  rig: function (ctx, p, t) {
    box(ctx, p.x, p.y, p.w, p.d, 8, p.col);
    box(ctx, p.x + p.w * 0.3, p.y, 0.25, p.d, p.h, shade(p.col, -0.1));
    const cx = (p.x + p.w * 0.4 - p.y - p.d / 2) * HW, cy = (p.x + p.w * 0.4 + p.y + p.d / 2) * HH;
    const lift = Math.abs(Math.sin(t * 1.6 + p.ph)) * 10;
    ctx.fillStyle = p.accent;
    ctx.fillRect(cx - 12, cy - p.h - 2 + lift, 24, 3);
  },

  mat: function (ctx, p) {
    const ax = (p.x - p.y) * HW, ay = (p.x + p.y) * HH;
    ctx.fillStyle = p.col; ctx.globalAlpha = 0.85;
    poly(ctx, [[ax, ay], [ax + p.w * HW, ay + p.w * HH],
               [ax + (p.w - p.d) * HW, ay + (p.w + p.d) * HH], [ax - p.d * HW, ay + p.d * HH]]);
    ctx.globalAlpha = 1;
  },

  pad: function (ctx, p, t) {
    const ax = (p.x - p.y) * HW, ay = (p.x + p.y) * HH;
    ctx.fillStyle = p.col;
    poly(ctx, [[ax, ay], [ax + p.w * HW, ay + p.w * HH],
               [ax + (p.w - p.d) * HW, ay + (p.w + p.d) * HH], [ax - p.d * HW, ay + p.d * HH]]);
    ctx.strokeStyle = p.accent;
    ctx.globalAlpha = 0.35 + Math.sin(t * 2) * 0.2; ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(ax, ay); ctx.lineTo(ax + p.w * HW, ay + p.w * HH);
    ctx.lineTo(ax + (p.w - p.d) * HW, ay + (p.w + p.d) * HH);
    ctx.lineTo(ax - p.d * HW, ay + p.d * HH); ctx.closePath(); ctx.stroke();
    ctx.globalAlpha = 1;
  },

  rocket: function (ctx, p, t) {
    const cx = (p.x + p.w / 2 - p.y - p.d / 2) * HW;
    const cy = (p.x + p.w / 2 + p.y + p.d / 2) * HH;
    const w = 26, h = p.h;
    /* Rumpf */
    const g = ctx.createLinearGradient(cx - w, 0, cx + w, 0);
    g.addColorStop(0, shade(p.col, -0.45)); g.addColorStop(0.45, p.col); g.addColorStop(1, shade(p.col, -0.25));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(cx - w, cy); ctx.lineTo(cx - w, cy - h * 0.62);
    ctx.quadraticCurveTo(cx, cy - h * 1.02, cx + w, cy - h * 0.62);
    ctx.lineTo(cx + w, cy); ctx.closePath(); ctx.fill();
    /* Flossen */
    ctx.fillStyle = p.accent;
    poly(ctx, [[cx - w, cy - 6], [cx - w - 13, cy + 14], [cx - w, cy + 10]]);
    poly(ctx, [[cx + w, cy - 6], [cx + w + 13, cy + 14], [cx + w, cy + 10]]);
    ctx.fillRect(cx - w, cy - h * 0.40, w * 2, 6);
    /* Bullauge */
    ellipse(ctx, cx, cy - h * 0.62, 8, 8, '#1a2430');
    ellipse(ctx, cx, cy - h * 0.62, 6, 6, '#6ec7ff');
    glow(ctx, cx, cy - h * 0.62, 30, '#6ec7ff', 0.25);
    /* Fußkontakt */
    ellipse(ctx, cx, cy + 12, w + 6, 8, 'rgba(0,0,0,.35)');
    /* Warnlicht an der Spitze */
    const bl = Math.sin(t * 3) > 0.4;
    if (bl) { ellipse(ctx, cx, cy - h * 0.95, 3, 3, '#ff6b4a'); glow(ctx, cx, cy - h * 0.95, 26, '#ff6b4a', 0.35); }
  },

  bigscreen: function (ctx, p, t) {
    box(ctx, p.x, p.y, p.w, p.d, p.h, p.col);
    const ax = (p.x - p.y) * HW, ay = (p.x + p.y) * HH;
    const bx = (p.x + p.w - p.y) * HW, by = (p.x + p.w + p.y) * HH;
    const fl = 0.35 + Math.abs(Math.sin(t * 1.7)) * 0.4 + Math.sin(t * 11) * 0.06;
    ctx.globalAlpha = fl;
    ctx.fillStyle = p.accent;
    poly(ctx, [[ax + 3, ay - p.h + 6], [bx - 3, by - p.h + 6], [bx - 3, by - 8], [ax + 3, ay - 8]]);
    ctx.globalAlpha = 1;
    glow(ctx, (ax + bx) / 2, (ay + by) / 2 - p.h / 2, 130, p.accent, 0.13 * fl);
  },

  arcade: function (ctx, p, t) {
    box(ctx, p.x, p.y, p.w, p.d, p.h, p.col);
    const bx = (p.x + p.w - p.y) * HW, by = (p.x + p.w + p.y) * HH;
    ctx.fillStyle = p.accent;
    ctx.globalAlpha = 0.5 + Math.abs(Math.sin(t * 2.5 + p.ph)) * 0.5;
    ctx.fillRect(bx - 16, by - p.h + 7, 13, 9);
    ctx.globalAlpha = 1;
    ctx.fillStyle = shade(p.accent, 0.3);
    ctx.fillRect(bx - 16, by - p.h + 2, 13, 2.5);
    glow(ctx, bx - 10, by - p.h + 10, 34, p.accent, 0.2);
  },

  plant: function (ctx, p, t) {
    box(ctx, p.x + 0.15, p.y + 0.15, p.w - 0.3, p.d - 0.3, p.h * 0.5, p.col);
    const cx = (p.x + p.w / 2 - p.y - p.d / 2) * HW, cy = (p.x + p.w / 2 + p.y + p.d / 2) * HH - p.h * 0.5;
    const sw = Math.sin(t * 1.1 + p.ph) * 2;
    const leaf = p.leaf || '#5aa84e';
    for (let i = 0; i < 5; i++) {
      const a = i * 1.25 + p.ph;
      ctx.fillStyle = i % 2 ? shade(leaf, -0.15) : leaf;
      ctx.beginPath();
      ctx.ellipse(cx + Math.cos(a) * 6 + sw, cy - 6 - Math.abs(Math.sin(a)) * 6, 6, 3.4, a, 0, 6.2832);
      ctx.fill();
    }
  },

  tree: function (ctx, p, t) {
    box(ctx, p.x + 0.35, p.y + 0.35, 0.3, 0.3, p.h * 0.6, p.col);
    const cx = (p.x + 0.5 - p.y - 0.5) * HW, cy = (p.x + 0.5 + p.y + 0.5) * HH - p.h * 0.6;
    const sw = Math.sin(t * 0.9 + p.ph) * 2.5;
    ellipse(ctx, cx + sw, cy - 4, 17, 13, shade(p.leaf, -0.25));
    ellipse(ctx, cx - 5 + sw, cy - 12, 12, 10, p.leaf);
    ellipse(ctx, cx + 7 + sw, cy - 10, 10, 8, shade(p.leaf, 0.12));
  },

  lounger: function (ctx, p) {
    box(ctx, p.x, p.y, p.w, p.d, p.h, p.col);
    box(ctx, p.x + p.w * 0.7, p.y, p.w * 0.3, p.d, p.h + 10, shade(p.col, -0.05));
    const cx = (p.x + 0.4 - p.y - p.d / 2) * HW, cy = (p.x + 0.4 + p.y + p.d / 2) * HH;
    ctx.fillStyle = p.accent; ctx.fillRect(cx - 8, cy - p.h - 2, 16, 3);
  },

  ladder: function (ctx, p) {
    box(ctx, p.x, p.y, 0.12, 0.12, p.h, p.col);
    box(ctx, p.x + 0.4, p.y, 0.12, 0.12, p.h, p.col);
    const ax = (p.x - p.y) * HW, ay = (p.x + p.y) * HH;
    ctx.strokeStyle = p.col; ctx.lineWidth = 2;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(ax, ay - p.h + i * 5); ctx.lineTo(ax + 0.4 * HW, ay + 0.4 * HH - p.h + i * 5);
      ctx.stroke();
    }
  }
};

/* Fällt ein Objekt durchs Raster, wird es wenigstens als Kiste gezeichnet. */
F.drawProp = function (ctx, p, t) {
  (DRAW[p.kind] || DRAW.crate)(ctx, p, t);
};

/* ---------- Figuren ---------- */
const DIR_OFF = [[0, -1], [1, 0], [0, 1], [-1, 0]];

/* Figur. Alles frei aus Rechtecken und Ellipsen gebaut — Größe über a.scale. */
F.drawAgent = function (ctx, a, t, selected) {
  const px = (a.x - a.y) * HW, py = (a.x + a.y) * HH;
  const s = a.scale * 1.45;                       // Grundgröße der Figuren
  const walk = a.moving;
  const step = Math.sin(a.gait);
  const bob = walk ? Math.abs(step) * 1.9 * s : Math.sin(t * 1.5 + a.ph) * 0.6;
  const base = py - bob - (a.sitting ? 8 * s : 0);
  const front = (a.dir === 1 || a.dir === 2);     // Gesicht zur Kamera

  const legH = 9 * s, torsoH = 12 * s, torsoW = 9.5 * s;
  const headW = 8.6 * s, headH = 9 * s;
  const torsoTop = base - legH - torsoH;
  const headTop = torsoTop - headH + 1.2 * s;

  /* Schatten */
  ctx.globalAlpha = 0.32;
  ellipse(ctx, px, py + 1, 7.5 * s, 3.6 * s, '#000000');
  ctx.globalAlpha = 1;

  /* Auswahlring */
  if (selected) {
    ctx.strokeStyle = '#4cd7c0'; ctx.lineWidth = 1.6;
    ctx.setLineDash([5, 4]); ctx.lineDashOffset = -t * 10;
    ctx.beginPath(); ctx.ellipse(px, py + 1, 10 * s, 5 * s, 0, 0, 6.2832); ctx.stroke();
    ctx.setLineDash([]);
  }

  /* Beine und Schuhe */
  if (!a.sitting) {
    const sw = walk ? step * 2.6 * s : 0;
    ctx.fillStyle = a.pants;
    ctx.fillRect(px - 4.1 * s + sw * 0.35, base - legH, 3.4 * s, legH);
    ctx.fillRect(px + 0.7 * s - sw * 0.35, base - legH, 3.4 * s, legH);
    ctx.fillStyle = a.shoes;
    ctx.fillRect(px - 4.4 * s + sw * 0.35, base - 2.2 * s, 4 * s, 2.2 * s);
    ctx.fillRect(px + 0.5 * s - sw * 0.35, base - 2.2 * s, 4 * s, 2.2 * s);
  } else {
    ctx.fillStyle = a.pants;
    ctx.fillRect(px - 4.6 * s, base - legH * 0.6, 9.2 * s, legH * 0.6);
    ctx.fillStyle = a.shoes;
    ctx.fillRect(px - 4.4 * s, base - 2 * s, 3.6 * s, 2 * s);
    ctx.fillRect(px + 0.8 * s, base - 2 * s, 3.6 * s, 2 * s);
  }

  /* Rumpf */
  ctx.fillStyle = a.shirt;
  roundRect(ctx, px - torsoW / 2, torsoTop, torsoW, torsoH, 2.6 * s);
  ctx.fillStyle = shade(a.shirt, 0.16);           // Lichtseite
  ctx.fillRect(px + (front ? 0.4 * s : -torsoW / 2), torsoTop + 1.5 * s, torsoW / 2 - 0.4 * s, torsoH - 3 * s);
  ctx.fillStyle = shade(a.shirt, -0.32);          // Kragen
  ctx.fillRect(px - torsoW / 2, torsoTop, torsoW, 1.8 * s);
  ctx.fillStyle = shade(a.pants, -0.2);           // Gürtel
  ctx.fillRect(px - torsoW / 2, torsoTop + torsoH - 1.8 * s, torsoW, 1.8 * s);
  if (a.badge) {                                   // Namensschild
    ctx.fillStyle = a.badge;
    ctx.fillRect(px + (front ? 1.6 : -3.6) * s, torsoTop + 3.4 * s, 2 * s, 2 * s);
  }

  /* Arme und Hände */
  const swing = walk ? Math.sin(a.gait + 3.1416) * 2.2 * s : Math.sin(t * 1.2 + a.ph) * 0.7 * s;
  const armW = 2.7 * s, armH = 8 * s, armY = torsoTop + 1.6 * s;
  const lax = px - torsoW / 2 - armW + 0.4 * s, rax = px + torsoW / 2 - 0.4 * s;
  ctx.fillStyle = shade(a.shirt, -0.24);
  ctx.fillRect(lax, armY + swing, armW, armH);
  ctx.fillRect(rax, armY - swing, armW, armH);
  ctx.fillStyle = a.skin;
  ctx.fillRect(lax, armY + armH + swing, armW, 2.4 * s);
  ctx.fillRect(rax, armY + armH - swing, armW, 2.4 * s);

  /* Kopf */
  ctx.fillStyle = a.skin;
  roundRect(ctx, px - headW / 2, headTop, headW, headH, 3.2 * s);
  ctx.fillStyle = shade(a.skin, -0.22);           // Ohr auf der Schattenseite
  ctx.fillRect(px + (front ? -headW / 2 - 1.1 * s : headW / 2 - 0.4 * s), headTop + headH * 0.42, 1.5 * s, 2.4 * s);
  drawHair(ctx, a, px, headTop, headW, headH, s, front);

  /* Gesicht nur, wenn die Figur zur Kamera schaut */
  if (front) {
    const ey = headTop + headH * 0.46;
    const blink = ((t * 0.6 + a.ph * 2.7) % 5.2) < 0.13;
    ctx.fillStyle = '#141a22';
    if (blink) {
      ctx.fillRect(px - 2.7 * s, ey + 0.9 * s, 1.9 * s, 0.7 * s);
      ctx.fillRect(px + 0.8 * s, ey + 0.9 * s, 1.9 * s, 0.7 * s);
    } else {
      ctx.fillRect(px - 2.7 * s, ey, 1.7 * s, 2.1 * s);
      ctx.fillRect(px + 1 * s, ey, 1.7 * s, 2.1 * s);
    }
    ctx.globalAlpha = 0.5;
    ctx.fillRect(px - 1.2 * s, ey + 3.6 * s, 2.4 * s, 0.9 * s);
    ctx.globalAlpha = 1;
  }

  /* Mitgeführter Gegenstand */
  if (a.acc) drawAcc(ctx, a, px, torsoTop, torsoW, s, t, front, swing);

  /* Sprechblase */
  if (a.emote > 0) {
    const bw = 15 * s, bh = 11 * s, bx = px + 3 * s, by = headTop - bh - 5 * s;
    ctx.globalAlpha = Math.min(1, a.emote);
    ctx.fillStyle = '#eef3fb';
    roundRect(ctx, bx, by, bw, bh, 4 * s);
    ctx.beginPath();
    ctx.moveTo(bx + 3 * s, by + bh); ctx.lineTo(bx + 1.5 * s, by + bh + 4 * s); ctx.lineTo(bx + 8 * s, by + bh);
    ctx.fill();
    ctx.fillStyle = '#1b2330';
    ctx.font = 'bold ' + (8 * s).toFixed(1) + 'px ui-monospace, monospace';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(a.emoteSym, bx + bw / 2, by + bh / 2);
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    ctx.globalAlpha = 1;
  }
};

/* Frisuren — sechs Varianten, gezeichnet über den Kopf */
function drawHair(ctx, a, px, top, hw, hh, s, front) {
  const c = a.hairCol;
  ctx.fillStyle = c;
  switch (a.hair) {
    case 0:                                        // kurz
      roundRect(ctx, px - hw / 2 - 0.3 * s, top - 0.6 * s, hw + 0.6 * s, hh * 0.44, 3 * s);
      break;
    case 1:                                        // Bob
      roundRect(ctx, px - hw / 2 - 1.1 * s, top - 0.6 * s, hw + 2.2 * s, hh * 0.92, 3.4 * s);
      ctx.fillStyle = a.skin;
      roundRect(ctx, px - hw / 2 + 0.6 * s, top + hh * 0.36, hw - 1.2 * s, hh * 0.54, 2 * s);
      break;
    case 2:                                        // Zopf
      roundRect(ctx, px - hw / 2 - 0.3 * s, top - 0.6 * s, hw + 0.6 * s, hh * 0.44, 3 * s);
      ellipse(ctx, px + (front ? -1 : 1) * hw * 0.62, top + hh * 0.55, 2.4 * s, 3.6 * s, c);
      break;
    case 3:                                        // Mütze mit Schirm
      ctx.fillStyle = a.hat || c;
      roundRect(ctx, px - hw / 2 - 0.6 * s, top - 1.6 * s, hw + 1.2 * s, hh * 0.5, 2.6 * s);
      ctx.fillRect(px + (front ? 0 : -hw * 0.9), top + hh * 0.3, hw * 0.9, 1.4 * s);
      break;
    case 4:                                        // Dutt
      roundRect(ctx, px - hw / 2 - 0.3 * s, top - 0.6 * s, hw + 0.6 * s, hh * 0.42, 3 * s);
      ellipse(ctx, px, top - 1.8 * s, 2.8 * s, 2.4 * s, c);
      break;
    default:                                       // ohne
      ctx.globalAlpha = 0.35;
      roundRect(ctx, px - hw / 2 + 0.6 * s, top - 0.2 * s, hw - 1.2 * s, hh * 0.22, 2 * s);
      ctx.globalAlpha = 1;
  }
}

/* Was die Figur in der Hand hält */
function drawAcc(ctx, a, px, torsoTop, torsoW, s, t, front, swing) {
  const hx = px + (front ? torsoW / 2 + 0.6 * s : -torsoW / 2 - 3.2 * s);
  const hy = torsoTop + 9 * s - swing;
  switch (a.acc) {
    case 'cup':
      ctx.fillStyle = '#e9eef7';
      ctx.fillRect(hx, hy, 2.8 * s, 3.4 * s);
      ctx.fillStyle = '#b04a3a';
      ctx.fillRect(hx, hy, 2.8 * s, 1 * s);
      ctx.globalAlpha = 0.25 + Math.sin(t * 3 + a.ph) * 0.1;
      ellipse(ctx, hx + 1.4 * s, hy - 2.4 * s, 1.6 * s, 2.2 * s, '#ffffff');
      ctx.globalAlpha = 1;
      break;
    case 'clipboard':
      ctx.fillStyle = '#8a6a42';                                  /* Brett */
      ctx.fillRect(hx - 0.7 * s, hy - 1.2 * s, 4.6 * s, 6 * s);
      ctx.fillStyle = '#eef3fb';                                  /* Blatt */
      ctx.fillRect(hx - 0.2 * s, hy - 0.4 * s, 3.6 * s, 4.8 * s);
      ctx.fillStyle = '#9aa7b8';                                  /* Klammer */
      ctx.fillRect(hx - 0.1 * s, hy - 1 * s, 3.4 * s, 1.2 * s);
      ctx.globalAlpha = 0.45;                                     /* angedeutete Zeilen */
      ctx.fillStyle = '#41506b';
      ctx.fillRect(hx + 0.3 * s, hy + 1.1 * s, 2.4 * s, 0.5 * s);
      ctx.fillRect(hx + 0.3 * s, hy + 2.3 * s, 2.8 * s, 0.5 * s);
      ctx.fillRect(hx + 0.3 * s, hy + 3.5 * s, 1.8 * s, 0.5 * s);
      ctx.globalAlpha = 1;
      break;
    case 'box':
      ctx.fillStyle = '#8a6a42';
      ctx.fillRect(px - 4.6 * s, torsoTop + 5 * s, 9.2 * s, 6.4 * s);
      ctx.fillStyle = shade('#8a6a42', 0.22);
      ctx.fillRect(px - 4.6 * s, torsoTop + 5 * s, 9.2 * s, 1.4 * s);
      ctx.fillStyle = shade('#8a6a42', -0.35);
      ctx.fillRect(px - 0.6 * s, torsoTop + 5 * s, 1.2 * s, 6.4 * s);
      break;
    case 'tool':
      ctx.save();
      ctx.translate(hx + 1.4 * s, hy + 1.6 * s);
      ctx.rotate(front ? 0.5 : -0.5);
      ctx.fillStyle = '#b9c6d6';
      ctx.fillRect(-0.8 * s, -4.4 * s, 1.6 * s, 8 * s);
      ctx.fillRect(-2 * s, -5.4 * s, 4 * s, 2 * s);
      ctx.restore();
      break;
    case 'plant':
      ctx.fillStyle = '#8a5a3a';
      ctx.fillRect(hx - 0.4 * s, hy + 1 * s, 4 * s, 3.4 * s);
      ellipse(ctx, hx + 1.6 * s, hy, 2.6 * s, 2 * s, '#5fb356');
      break;
  }
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath(); ctx.fill();
}

/* Schwimmer: nur Kopf und Arme über der Wasserlinie */
F.drawSwimmer = function (ctx, s, t) {
  const px = (s.x - s.y) * HW, py = (s.x + s.y) * HH;
  const bob = Math.sin(t * 2.2 + s.a) * 1.6;
  ctx.globalAlpha = 0.5;
  ellipse(ctx, px, py + 2, 11 + Math.sin(t * 3 + s.a) * 2, 5, 'rgba(255,255,255,.28)');
  ctx.globalAlpha = 1;
  ellipse(ctx, px, py - 4 + bob, 4.5, 4.5, s.col);
  ctx.fillStyle = shade(s.col, -0.3);
  const sw = Math.sin(t * 4 + s.a) * 4;
  ctx.fillRect(px - 9, py - 3 + bob + sw * 0.3, 5, 2.2);
  ctx.fillRect(px + 4, py - 3 + bob - sw * 0.3, 5, 2.2);
};

/* Putzroboter: flache Scheibe mit Blinklicht */
F.drawBot = function (ctx, b, t) {
  const px = (b.x - b.y) * HW, py = (b.x + b.y) * HH;
  ctx.globalAlpha = 0.3; ellipse(ctx, px, py + 1, 10, 5, '#000'); ctx.globalAlpha = 1;
  ellipse(ctx, px, py - 4, 11, 6, '#3f4b5c');
  ellipse(ctx, px, py - 6, 11, 6, '#57667c');
  const on = Math.sin(t * 5 + b.ph) > 0;
  ellipse(ctx, px, py - 8, 2.4, 2.4, on ? '#4cd7c0' : '#28414a');
  if (on) glow(ctx, px, py - 8, 20, '#4cd7c0', 0.2);
};

/* ---------- Sternenhintergrund ---------- */
F.makeStars = function (n, rng) {
  const s = [];
  for (let i = 0; i < n; i++)
    s.push({ x: rng.next(), y: rng.next(), r: rng.f(0.4, 1.5), a: rng.f(0.15, 0.85), ph: rng.f(0, 6.28) });
  return s;
};

F.drawStars = function (ctx, stars, w, h, panX, panY, t) {
  ctx.fillStyle = '#05070d';
  ctx.fillRect(0, 0, w, h);
  const ox = (panX * 0.04) % w, oy = (panY * 0.04) % h;
  for (let i = 0; i < stars.length; i++) {
    const s = stars[i];
    let x = (s.x * w + ox) % w; if (x < 0) x += w;
    let y = (s.y * h + oy) % h; if (y < 0) y += h;
    ctx.globalAlpha = s.a * (0.6 + Math.sin(t * 1.5 + s.ph) * 0.4);
    ctx.fillStyle = '#cfe0ff';
    ctx.fillRect(x, y, s.r, s.r);
  }
  ctx.globalAlpha = 1;
};

F.DIR_OFF = DIR_OFF;

})(window.E17);
