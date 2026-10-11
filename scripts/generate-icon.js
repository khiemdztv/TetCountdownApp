'use strict';
/*
 * Ve icon ung dung bang toan hoc (khong can thu vien ngoai, khong tai mang).
 *  - assets/icon.ico : icon app + icon bo cai dat (nhieu kich thuoc)
 *  - assets/icon.png : ban PNG 256px
 *  - assets/tray.png / tray-64.png : icon khay he thong
 *
 * Nam 2027 la nam Dinh Mui (con De) -> bieu tuong la dau de.
 */

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const MASTER = 1024;

/* ---------------- Canvas RGBA (so thuc 0..1, alpha thang) ---------------- */

function newCanvas(n) {
  return { n, data: new Float64Array(n * n * 4) };
}

function blend(c, x, y, r, g, b, a) {
  if (a <= 0) return;
  if (x < 0 || y < 0 || x >= c.n || y >= c.n) return;
  const i = (y * c.n + x) * 4;
  const d = c.data;
  const da = d[i + 3];
  const oa = a + da * (1 - a);
  if (oa <= 0) {
    d[i] = d[i + 1] = d[i + 2] = d[i + 3] = 0;
    return;
  }
  d[i] = (r * a + d[i] * da * (1 - a)) / oa;
  d[i + 1] = (g * a + d[i + 1] * da * (1 - a)) / oa;
  d[i + 2] = (b * a + d[i + 2] * da * (1 - a)) / oa;
  d[i + 3] = oa;
}

const hex = (h) => [
  parseInt(h.slice(1, 3), 16) / 255,
  parseInt(h.slice(3, 5), 16) / 255,
  parseInt(h.slice(5, 7), 16) / 255,
];

function mix(a, b, t) {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

const clamp01 = (v) => Math.min(1, Math.max(0, v));

/* ---------------- Hinh hoc co ban ---------------- */

function inRoundRect(px, py, x, y, w, h, r) {
  if (px < x || py < y || px > x + w || py > y + h) return false;
  const rx = Math.min(r, w / 2);
  const ry = Math.min(r, h / 2);
  const cx = Math.min(Math.max(px, x + rx), x + w - rx);
  const cy = Math.min(Math.max(py, y + ry), y + h - ry);
  const dx = px - cx;
  const dy = py - cy;
  return dx * dx + dy * dy <= rx * ry;
}

function inEllipse(px, py, cx, cy, rx, ry, rot) {
  const c = Math.cos(-(rot || 0));
  const s = Math.sin(-(rot || 0));
  const dx = px - cx;
  const dy = py - cy;
  const x = dx * c - dy * s;
  const y = dx * s + dy * c;
  return (x * x) / (rx * rx) + (y * y) / (ry * ry) <= 1;
}

/**
 * Noi suy muot giua cac diem dieu khien (y, nua chieu rong).
 * Dung smoothstep de bien khong bi "gay khuc".
 */
function profileWidth(profile, y) {
  if (y <= profile[0][0]) return 0;
  const last = profile[profile.length - 1];
  if (y >= last[0]) return 0;

  for (let i = 0; i < profile.length - 1; i++) {
    const [y0, w0] = profile[i];
    const [y1, w1] = profile[i + 1];
    if (y >= y0 && y <= y1) {
      const t = (y - y0) / (y1 - y0);
      const s = t * t * (3 - 2 * t); // smoothstep
      return w0 + (w1 - w0) * s;
    }
  }
  return 0;
}

/* Ve hinh bang cach supersample 2x2 tai moi diem -> vien muot */
const SUB = 3;

function fillShape(c, bbox, test, colorFn) {
  const x0 = Math.max(0, Math.floor(bbox.x0));
  const y0 = Math.max(0, Math.floor(bbox.y0));
  const x1 = Math.min(c.n, Math.ceil(bbox.x1));
  const y1 = Math.min(c.n, Math.ceil(bbox.y1));

  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      let hits = 0;
      for (let sy = 0; sy < SUB; sy++) {
        for (let sx = 0; sx < SUB; sx++) {
          const px = x + (sx + 0.5) / SUB;
          const py = y + (sy + 0.5) / SUB;
          if (test(px, py)) hits++;
        }
      }
      if (hits === 0) continue;
      const cov = hits / (SUB * SUB);
      const col = colorFn(x + 0.5, y + 0.5);
      const a = col[3] === undefined ? 1 : col[3];
      blend(c, x, y, col[0], col[1], col[2], cov * a);
    }
  }
}

/* ---------------- Ve net cong co do day thay doi (dung cho sung de) ------- */

/** Chuan bi polyline: do dai tung doan + do dai tich luy. */
function prepPolyline(pts) {
  const segs = [];
  let total = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i];
    const b = pts[i + 1];
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    segs.push({ a, b, len, start: total });
    total += len;
  }
  return { segs, total };
}

/**
 * Ve mot net cong: tai moi diem, kiem tra khoang cach toi polyline
 * co nho hon ban kinh (ban kinh thay doi theo tham so t 0..1) khong.
 * @param radiusFn (t) => ban kinh
 */
function strokeCurve(c, pts, radiusFn, colorFn, extraPad = 2) {
  const { segs, total } = prepPolyline(pts);

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  let maxR = 0;
  for (let i = 0; i < pts.length; i++) {
    minX = Math.min(minX, pts[i].x);
    minY = Math.min(minY, pts[i].y);
    maxX = Math.max(maxX, pts[i].x);
    maxY = Math.max(maxY, pts[i].y);
    maxR = Math.max(maxR, radiusFn(i / (pts.length - 1)));
  }

  const bbox = {
    x0: minX - maxR - extraPad,
    y0: minY - maxR - extraPad,
    x1: maxX + maxR + extraPad,
    y1: maxY + maxR + extraPad,
  };

  fillShape(
    c,
    bbox,
    (px, py) => {
      let best = Infinity;
      for (const s of segs) {
        const dx = s.b.x - s.a.x;
        const dy = s.b.y - s.a.y;
        const L2 = dx * dx + dy * dy;
        let t = L2 === 0 ? 0 : ((px - s.a.x) * dx + (py - s.a.y) * dy) / L2;
        t = clamp01(t);
        const cx = s.a.x + t * dx;
        const cy = s.a.y + t * dy;
        const d = Math.hypot(px - cx, py - cy);
        const gt = total === 0 ? 0 : (s.start + t * s.len) / total;
        const margin = d - radiusFn(gt);
        if (margin < best) best = margin;
      }
      return best <= 0;
    },
    colorFn
  );
}

/* ---------------- Font 5x7 cho chu so ---------------- */

const GLYPH_W = 5;
const GLYPH_H = 7;
const DIGITS = {
  0: ['01110', '10001', '10011', '10101', '11001', '10001', '01110'],
  1: ['00100', '01100', '00100', '00100', '00100', '00100', '01110'],
  2: ['01110', '10001', '00001', '00010', '00100', '01000', '11111'],
  3: ['11111', '00010', '00100', '00010', '00001', '10001', '01110'],
  4: ['00010', '00110', '01010', '10010', '11111', '00010', '00010'],
  5: ['11111', '10000', '11110', '00001', '00001', '10001', '01110'],
  6: ['00110', '01000', '10000', '11110', '10001', '10001', '01110'],
  7: ['11111', '00001', '00010', '00100', '01000', '01000', '01000'],
  8: ['01110', '10001', '10001', '01110', '10001', '10001', '01110'],
  9: ['01110', '10001', '10001', '01111', '00001', '00010', '01100'],
};

/** Ve chu so voi font 5x7. Tra ve ham test de tai su dung. */
function digitTest(text, startX, startY, cell, gap) {
  const totalCols = text.length * GLYPH_W + (text.length - 1) * gap;
  return {
    totalCols,
    width: totalCols * cell,
    height: GLYPH_H * cell,
    test(px, py) {
      const gx = Math.floor((px - startX) / cell);
      const gy = Math.floor((py - startY) / cell);
      if (gx < 0 || gy < 0 || gy >= GLYPH_H || gx >= totalCols) return false;
      const di = Math.floor(gx / (GLYPH_W + gap));
      const ci = gx % (GLYPH_W + gap);
      if (ci >= GLYPH_W || di >= text.length) return false;
      return DIGITS[text[di]][gy][ci] === '1';
    },
  };
}

/* ---------------- Dau de (bieu tuong nam Mui) ---------------- */

/*
 * Ve dau de nhin thang: sung cong ra sau, tai hai ben, mat, mui, roi cam.
 * Tat ca toa do tinh theo (cx, cy) va he so scale.
 */

const CREAM_HI = hex('#FFF8E4');
const CREAM = hex('#F6E3BE');
const CREAM_MID = hex('#E6CB9C');
const CREAM_LO = hex('#C4A36B');
const CREAM_DEEP = hex('#A07F4C');
const HORN_HI = hex('#FFEDB4');
const HORN = hex('#EBBE4E');
const HORN_LO = hex('#A8720E');
const DARK = hex('#331004');
const PINK = hex('#DE8682');

/** Bang nua chieu rong cua dau de theo truc doc (don vi chuan, se nhan scale). */
const HEAD_PROFILE = [
  [-150, 52],
  [-134, 78],
  [-108, 96],
  [-62, 104],
  [-8, 103],
  [42, 95],
  [86, 79],
  [122, 60],
  [152, 38],
  [172, 0],
];

/**
 * Ve dau de.
 * @param cfg {cx, cy, scale, beard, detail}
 */
function drawGoat(c, cfg) {
  const { cx, cy, scale: S } = cfg;
  const X = (v) => cx + v * S;
  const Y = (v) => cy + v * S;

  /* ---- 1. Rau cam (ve truoc de nam duoi dau) ---- */
  if (cfg.beard !== false) {
    const beardProfile = [
      [160, 26],
      [186, 34],
      [214, 30],
      [238, 18],
      [254, 0],
    ];
    fillShape(
      c,
      { x0: X(-40), y0: Y(152), x1: X(40), y1: Y(260) },
      (px, py) => {
        const ly = (py - cy) / S;
        if (ly < 158 || ly > 254) return false;
        return Math.abs((px - cx) / S) <= profileWidth(beardProfile, ly);
      },
      (px, py) => {
        const t = clamp01((py - Y(158)) / (Y(254) - Y(158)));
        const col = mix(CREAM_MID, CREAM_DEEP, t * 0.9);
        return [col[0], col[1], col[2], 1];
      }
    );
  }

  /* ---- 2. Tai hai ben ---- */
  const earTilt = 0.46;
  for (const side of [-1, 1]) {
    const ex = X(side * 92);
    const ey = Y(-38);
    const rx = 60 * S;
    const ry = 29 * S;
    const rot = side * earTilt;

    fillShape(
      c,
      { x0: ex - rx - ry, y0: ey - rx - ry, x1: ex + rx + ry, y1: ey + rx + ry },
      (px, py) => inEllipse(px, py, ex, ey, rx, ry, rot),
      (px, py) => {
        const d = clamp01(Math.hypot(px - ex, py - ey) / (rx * 1.2));
        const col = mix(CREAM, CREAM_LO, d * 1.1);
        return [col[0], col[1], col[2], 1];
      }
    );

    // Long hong ben trong tai
    fillShape(
      c,
      { x0: ex - rx - ry, y0: ey - rx - ry, x1: ex + rx + ry, y1: ey + rx + ry },
      (px, py) => inEllipse(px, py, ex + side * 7 * S, ey, rx * 0.55, ry * 0.48, rot),
      () => [PINK[0], PINK[1], PINK[2], 0.72]
    );
  }

  /* ---- 3. Sung: cong len, vuon ra ngoai roi hoi cong vao (dac trung de) ---- */
  for (const side of [-1, 1]) {
    const base = [
      [44, -108],
      [88, -160],
      [128, -226],
      [156, -300],
      [168, -374],
      [160, -424],
    ];
    const pts = base.map(([x, y]) => ({ x: X(side * x), y: Y(y) }));

    const r0 = 48 * S;
    const r1 = 12 * S;
    strokeCurve(
      c,
      pts,
      (t) => r0 + (r1 - r0) * Math.pow(t, 0.55),
      (px, py) => {
        // Do dam ngang de sung co khoi
        const lx = ((px - cx) / S) * side;
        const shade = clamp01((lx - 26) / 165);
        let col = mix(HORN_HI, HORN, clamp01(shade * 1.7));
        col = mix(col, HORN_LO, clamp01((shade - 0.48) / 0.52) * 0.9);

        // Van ngan doc theo sung (de co vân sung that)
        const ly = (py - cy) / S;
        const ridge = Math.sin(ly * 0.08) * 0.5 + 0.5;
        col = mix(col, HORN_LO, ridge * 0.18);
        return [col[0], col[1], col[2], 1];
      }
    );
  }

  /* ---- 4. Dau ---- */
  fillShape(
    c,
    { x0: X(-140), y0: Y(-165), x1: X(140), y1: Y(190) },
    (px, py) => {
      const ly = (py - cy) / S;
      if (ly < -150 || ly > 172) return false;
      return Math.abs((px - cx) / S) <= profileWidth(HEAD_PROFILE, ly);
    },
    (px, py) => {
      const lx = (px - cx) / S;
      const ly = (py - cy) / S;
      // Anh sang tu tren trai
      const lightT = clamp01((-lx * 0.45 - ly * 0.85 + 100) / 210);
      let col = mix(CREAM_LO, CREAM_HI, lightT);
      // Bong vung mui
      if (ly > 80) col = mix(col, CREAM_MID, clamp01((ly - 80) / 95) * 0.55);
      // Toi dan o mep phai
      if (lx > 40) col = mix(col, CREAM_LO, clamp01((lx - 40) / 65) * 0.4);
      return [col[0], col[1], col[2], 1];
    }
  );

  /* ---- 5. Vet sang tren tran ---- */
  fillShape(
    c,
    { x0: X(-100), y0: Y(-145), x1: X(100), y1: Y(-10) },
    (px, py) =>
      inEllipse(px, py, X(-20), Y(-92), 66 * S, 44 * S, -0.22) &&
      Math.abs((px - cx) / S) <= profileWidth(HEAD_PROFILE, (py - cy) / S),
    () => [1, 1, 1, 0.38]
  );

  if (cfg.detail === false) return;

  /* ---- 6. Mat ---- */
  for (const side of [-1, 1]) {
    const exx = X(side * 48);
    const eyy = Y(-26);
    const erx = 22 * S;
    const ery = 25 * S;

    // Vien mat toi
    fillShape(
      c,
      { x0: exx - erx - 2, y0: eyy - ery - 2, x1: exx + erx + 2, y1: eyy + ery + 2 },
      (px, py) => inEllipse(px, py, exx, eyy, erx, ery, 0),
      () => [0.2, 0.06, 0.02, 1]
    );

    // Con nguoi ngang (dac trung de)
    fillShape(
      c,
      { x0: exx - erx - 2, y0: eyy - ery - 2, x1: exx + erx + 2, y1: eyy + ery + 2 },
      (px, py) => inEllipse(px, py, exx, eyy + 1 * S, erx * 0.6, ery * 0.4, 0),
      () => [DARK[0], DARK[1], DARK[2], 1]
    );

    // Dom sang
    fillShape(
      c,
      { x0: exx - erx - 2, y0: eyy - ery - 2, x1: exx + erx + 2, y1: eyy + ery + 2 },
      (px, py) => inEllipse(px, py, exx - 6 * S, eyy - 8 * S, 6 * S, 6 * S, 0),
      () => [1, 1, 1, 0.92]
    );
  }

  /* ---- 7. Mui ---- */
  fillShape(
    c,
    { x0: X(-50), y0: Y(56), x1: X(50), y1: Y(140) },
    (px, py) => inEllipse(px, py, X(0), Y(96), 44 * S, 40 * S, 0),
    (px, py) => {
      const t = clamp01((py - Y(56)) / (Y(140) - Y(56)));
      const col = mix(CREAM_MID, CREAM_LO, t * 0.7);
      return [col[0], col[1], col[2], 0.85];
    }
  );

  // Lỗ mui
  for (const side of [-1, 1]) {
    fillShape(
      c,
      { x0: X(side * 18 - 16), y0: Y(76), x1: X(side * 18 + 16), y1: Y(122) },
      (px, py) => inEllipse(px, py, X(side * 18), Y(96), 11 * S, 15 * S, side * 0.28),
      () => [DARK[0], DARK[1], DARK[2], 0.9]
    );
  }

  // Mieng
  fillShape(
    c,
    { x0: X(-32), y0: Y(118), x1: X(32), y1: Y(160) },
    (px, py) => {
      const ly = (py - Y(132)) / S;
      const lx = (px - cx) / S;
      if (Math.abs(lx) > 24) return false;
      const half = 24 * Math.sqrt(Math.max(0, 1 - (lx / 24) ** 2));
      return ly >= -3 && ly <= half * 0.55 + 3;
    },
    () => [0.32, 0.11, 0.05, 0.85]
  );
}

/* ---------------- Thiet ke icon app ---------------- */

function drawAppIcon(c) {
  const W = c.n;

  const RED_LIGHT = hex('#E8543A');
  const RED_MID = hex('#C4111F');
  const RED_DARK = hex('#70060E');
  const GOLD_LIGHT = hex('#FFF6D0');
  const GOLD_MID = hex('#F5C33C');
  const GOLD_DARK = hex('#B57915');

  const pad = W * 0.05;
  const boxX = pad;
  const boxY = pad;
  const boxW = W - pad * 2;
  const boxH = W - pad * 2;
  const radius = W * 0.215;

  // 1) Nen do gradient
  const cxg = W * 0.5;
  const cyg = W * 0.3;
  const maxR = W * 0.9;
  fillShape(
    c,
    { x0: boxX, y0: boxY, x1: boxX + boxW, y1: boxY + boxH },
    (px, py) => inRoundRect(px, py, boxX, boxY, boxW, boxH, radius),
    (px, py) => {
      const t = clamp01(Math.hypot(px - cxg, py - cyg) / maxR);
      const col = t < 0.5 ? mix(RED_LIGHT, RED_MID, t / 0.5) : mix(RED_MID, RED_DARK, (t - 0.5) / 0.5);
      return [col[0], col[1], col[2], 1];
    }
  );

  // 2) Anh sang vang mem phia tren
  fillShape(
    c,
    { x0: boxX, y0: boxY, x1: boxX + boxW, y1: boxY + boxH },
    (px, py) =>
      inRoundRect(px, py, boxX, boxY, boxW, boxH, radius) && py < boxY + boxH * 0.72,
    (px, py) => {
      const t = Math.max(0, 1 - Math.hypot(px - W * 0.44, py - W * 0.22) / (W * 0.6));
      return [1, 0.85, 0.55, Math.pow(t, 2.1) * 0.36];
    }
  );

  // 3) Vien vang trong
  const inset = W * 0.086;
  const ibX = boxX + inset;
  const ibY = boxY + inset;
  const ibW = boxW - inset * 2;
  const ibH = boxH - inset * 2;
  const ibR = radius - inset * 0.85;
  const borderW = W * 0.021;
  fillShape(
    c,
    { x0: ibX - 2, y0: ibY - 2, x1: ibX + ibW + 2, y1: ibY + ibH + 2 },
    (px, py) => {
      if (!inRoundRect(px, py, ibX, ibY, ibW, ibH, ibR)) return false;
      return !inRoundRect(
        px,
        py,
        ibX + borderW,
        ibY + borderW,
        ibW - borderW * 2,
        ibH - borderW * 2,
        Math.max(0, ibR - borderW)
      );
    },
    (px) => {
      const col = mix(GOLD_LIGHT, GOLD_DARK, clamp01((px - ibX) / ibW));
      return [col[0], col[1], col[2], 0.95];
    }
  );

  // 4) Dau de
  const goatCy = W * 0.5;
  const goatScale = W * 0.00076;

  // Quang sang vang phia sau dau de
  fillShape(
    c,
    { x0: W * 0.1, y0: W * 0.1, x1: W * 0.9, y1: W * 0.9 },
    (px, py) => inEllipse(px, py, W * 0.5, goatCy - W * 0.05, W * 0.33, W * 0.33, 0),
    (px, py) => {
      const d = Math.hypot(px - W * 0.5, py - (goatCy - W * 0.05)) / (W * 0.33);
      return [1, 0.86, 0.5, Math.pow(Math.max(0, 1 - d), 1.8) * 0.3];
    }
  );

  drawGoat(c, { cx: W * 0.5, cy: goatCy, scale: goatScale, beard: true, detail: true });

  // 5) Chu "2027" o day
  const text = '2027';
  const gap = 1;
  const totalCols = text.length * GLYPH_W + (text.length - 1) * gap;
  const usableW = W * 0.335;
  const cell = usableW / totalCols;
  const textW = totalCols * cell;
  const textH = GLYPH_H * cell;
  const startX = W * 0.5 - textW / 2;
  const startY = W * 0.848 - textH / 2;

  const dText = digitTest(text, startX, startY, cell, gap);
  const bbox = { x0: startX - 2, y0: startY - 2, x1: startX + textW + 2, y1: startY + textH + 2 };

  // Do bong
  const off = W * 0.007;
  fillShape(
    c,
    { x0: bbox.x0 + off, y0: bbox.y0 + off, x1: bbox.x1 + off, y1: bbox.y1 + off },
    (px, py) => dText.test(px - off, py - off),
    () => [0.2, 0.02, 0.03, 0.5]
  );

  // Chu vang
  fillShape(
    c,
    bbox,
    (px, py) => dText.test(px, py),
    (px, py) => {
      const t = clamp01((py - startY) / textH);
      const col = t < 0.45 ? mix(GOLD_LIGHT, GOLD_MID, t / 0.45) : mix(GOLD_MID, GOLD_DARK, (t - 0.45) / 0.55);
      return [col[0], col[1], col[2], 1];
    }
  );
}

/* ---------------- Thiet ke icon khay: dau de gon ---------------- */

function drawTrayIcon(c) {
  const W = c.n;
  const RED = hex('#B00E1C');
  const RED_DARK = hex('#6E0510');
  const GOLD = hex('#F7D774');

  // Nen tron do
  const R = W * 0.485;
  const cx = W / 2;
  const cy = W / 2;
  fillShape(
    c,
    { x0: cx - R - 2, y0: cy - R - 2, x1: cx + R + 2, y1: cy + R + 2 },
    (px, py) => Math.hypot(px - cx, py - cy) <= R,
    (px, py) => {
      const t = clamp01(Math.hypot(px - cx, py - cy) / R);
      const col = mix(RED, RED_DARK, t);
      return [col[0], col[1], col[2], 1];
    }
  );

  // Vien vang mong
  fillShape(
    c,
    { x0: cx - R - 2, y0: cy - R - 2, x1: cx + R + 2, y1: cy + R + 2 },
    (px, py) => {
      const d = Math.hypot(px - cx, py - cy);
      return d <= R && d >= R * 0.9;
    },
    () => [GOLD[0], GOLD[1], GOLD[2], 0.9]
  );

  // Dau de: phong to, bo chi tiet nho de doc duoc khi thu nho
  drawGoat(c, {
    cx: W * 0.5,
    cy: W * 0.585,
    scale: W * 0.00098,
    beard: true,
    detail: true,
  });
}

/* ---------------- Resample (loc hop) ---------------- */

function resample(c, size) {
  const out = new Float64Array(size * size * 4);
  const block = c.n / size;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;
      let cnt = 0;
      const y0 = Math.floor(y * block);
      const y1 = Math.max(y0 + 1, Math.floor((y + 1) * block));
      const x0 = Math.floor(x * block);
      const x1 = Math.max(x0 + 1, Math.floor((x + 1) * block));
      for (let sy = y0; sy < y1; sy++) {
        for (let sx = x0; sx < x1; sx++) {
          const i = (sy * c.n + sx) * 4;
          const sa = c.data[i + 3];
          r += c.data[i] * sa;
          g += c.data[i + 1] * sa;
          b += c.data[i + 2] * sa;
          a += sa;
          cnt++;
        }
      }
      const o = (y * size + x) * 4;
      if (a > 0) {
        out[o] = r / a;
        out[o + 1] = g / a;
        out[o + 2] = b / a;
      }
      out[o + 3] = a / cnt;
    }
  }
  return out;
}

/* ---------------- Ma hoa PNG ---------------- */

let crcTable = null;
function crc32(buf) {
  if (!crcTable) {
    crcTable = new Int32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      crcTable[n] = c;
    }
  }
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const t = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([t, data])), 0);
  return Buffer.concat([len, t, data, crc]);
}

function encodePng(rgba, size) {
  const raw = Buffer.alloc(size * (size * 4 + 1));
  let p = 0;
  for (let y = 0; y < size; y++) {
    raw[p++] = 0;
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      raw[p++] = Math.round(clamp01(rgba[i]) * 255);
      raw[p++] = Math.round(clamp01(rgba[i + 1]) * 255);
      raw[p++] = Math.round(clamp01(rgba[i + 2]) * 255);
      raw[p++] = Math.round(clamp01(rgba[i + 3]) * 255);
    }
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/* ---------------- Ma hoa ICO ---------------- */

function encodeIco(entries) {
  const count = entries.length;
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(count, 4);

  const dir = Buffer.alloc(16 * count);
  const blobs = [];
  let offset = 6 + 16 * count;

  entries.forEach((e, idx) => {
    const size = e.size;
    const rowBytes = size * 4;
    const andRow = Math.ceil(size / 32) * 4;
    const bmpHeader = Buffer.alloc(40);
    bmpHeader.writeUInt32LE(40, 0);
    bmpHeader.writeInt32LE(size, 4);
    bmpHeader.writeInt32LE(size * 2, 8);
    bmpHeader.writeUInt16LE(1, 12);
    bmpHeader.writeUInt16LE(32, 14);
    bmpHeader.writeUInt32LE(0, 16);
    bmpHeader.writeUInt32LE(rowBytes * size, 20);

    const xor = Buffer.alloc(rowBytes * size);
    for (let y = 0; y < size; y++) {
      const srcY = size - 1 - y;
      for (let x = 0; x < size; x++) {
        const si = (srcY * size + x) * 4;
        const o = y * rowBytes + x * 4;
        const a = e.rgba[si + 3];
        xor[o] = Math.round(clamp01(e.rgba[si + 2]) * a * 255);
        xor[o + 1] = Math.round(clamp01(e.rgba[si + 1]) * a * 255);
        xor[o + 2] = Math.round(clamp01(e.rgba[si]) * a * 255);
        xor[o + 3] = Math.round(a * 255);
      }
    }

    const and = Buffer.alloc(andRow * size);
    const blob = Buffer.concat([bmpHeader, xor, and]);
    blobs.push(blob);

    const o = 16 * idx;
    dir[o] = size >= 256 ? 0 : size;
    dir[o + 1] = size >= 256 ? 0 : size;
    dir[o + 2] = 0;
    dir[o + 3] = 0;
    dir.writeUInt16LE(1, o + 4);
    dir.writeUInt16LE(32, o + 6);
    dir.writeUInt32LE(blob.length, o + 8);
    dir.writeUInt32LE(offset, o + 12);
    offset += blob.length;
  });

  return Buffer.concat([header, dir, ...blobs]);
}

/* ---------------- Chay ---------------- */

const assetsDir = path.join(__dirname, '..', 'assets');
fs.mkdirSync(assetsDir, { recursive: true });

console.log('Dang ve icon con de (nam Dinh Mui 2027)...');

const appCanvas = newCanvas(MASTER);
drawAppIcon(appCanvas);

const icoSizes = [16, 24, 32, 48, 64, 128, 256];
fs.writeFileSync(
  path.join(assetsDir, 'icon.ico'),
  encodeIco(icoSizes.map((size) => ({ size, rgba: resample(appCanvas, size) })))
);
fs.writeFileSync(path.join(assetsDir, 'icon.png'), encodePng(resample(appCanvas, 256), 256));

const trayCanvas = newCanvas(MASTER);
drawTrayIcon(trayCanvas);
fs.writeFileSync(path.join(assetsDir, 'tray.png'), encodePng(resample(trayCanvas, 32), 32));
fs.writeFileSync(path.join(assetsDir, 'tray-64.png'), encodePng(resample(trayCanvas, 64), 64));

const kb = (f) => (fs.statSync(path.join(assetsDir, f)).size / 1024).toFixed(1);
console.log(`icon.ico (${kb('icon.ico')} KB) - 7 kich thuoc 16..256`);
console.log(`icon.png (${kb('icon.png')} KB) - 256px`);
console.log(`tray.png (${kb('tray.png')} KB) - 32px`);
console.log(`tray-64.png (${kb('tray-64.png')} KB) - 64px`);
