'use strict';
/*
 * GHI CHU: File nay khong con duoc dung.
 *
 * Truoc day app co tieng chuong thong bao khi khoi dong (chime.wav), nhung
 * theo yeu cau nguoi dung thi chi giu nhac Tet. Vi vay:
 *   - assets/chime.wav da bi xoa
 *   - lenh "npm run assets" chi con chay generate-icon.js
 *
 * Giu lai file nay de tham khao cach tong hop am thanh bang toan hoc
 * (chuong voi hoa am khong nguyen tren thang ngu am), phong khi sau nay
 * muon them lai mot am bao nhe.
 *
 * Neu muon dung lai: chay "node scripts/generate-audio.js" roi them
 * assets/chime.wav vao phan "files" trong package.json.
 */

const fs = require('fs');
const path = require('path');

// Khong tao file nua, tru khi duoc yeu cau ro rang
if (!process.env.TET_BUILD_CHIME) {
  console.log('Bo qua: chuong thong bao khong con duoc dung.');
  console.log('Dat TET_BUILD_CHIME=1 neu that su muon tao lai assets/chime.wav.');
  process.exit(0);
}

const SR = 44100;
const DURATION = 4.2; // giay
const N = Math.floor(SR * DURATION);

const out = new Float64Array(N);

/* Them mot tieng chuong voi cac hoa am khong nguyen (inharmonic) dac trung chuong that */
function addBell(startSec, freq, amp, decay, pan = 0) {
  const start = Math.floor(startSec * SR);
  // Ti le hoa am cua chuong/chieng (khong nguyen -> nghe kim loai, ngan vang)
  const partials = [
    { r: 1.0, a: 1.0, d: 1.0 },
    { r: 2.01, a: 0.55, d: 1.4 },
    { r: 2.98, a: 0.34, d: 1.9 },
    { r: 4.07, a: 0.20, d: 2.5 },
    { r: 5.43, a: 0.12, d: 3.2 },
    { r: 6.79, a: 0.07, d: 4.0 },
  ];

  for (const p of partials) {
    const f = freq * p.r;
    if (f > SR / 2 - 1000) continue;
    const len = Math.min(N - start, Math.floor(SR * (DURATION - startSec)));
    for (let i = 0; i < len; i++) {
      const t = i / SR;
      // Bao hinh tan cong nhanh, tat dan theo ham mu
      const attack = Math.min(1, t / 0.004);
      const env = attack * Math.exp(-t / (decay * p.d));
      out[start + i] += amp * p.a * env * Math.sin(2 * Math.PI * f * t);
    }
  }

  // Tieng "kim" ngan luc go
  const strikeLen = Math.min(N - start, Math.floor(SR * 0.06));
  for (let i = 0; i < strikeLen; i++) {
    const t = i / SR;
    const env = Math.exp(-t / 0.012);
    out[start + i] += amp * 0.22 * env * (Math.random() * 2 - 1);
  }
}

/* Them tieng "lung linh" cao, nhe */
function addSparkle(startSec, freq, amp) {
  const start = Math.floor(startSec * SR);
  const len = Math.min(N - start, Math.floor(SR * 0.9));
  for (let i = 0; i < len; i++) {
    const t = i / SR;
    const env = Math.min(1, t / 0.003) * Math.exp(-t / 0.28);
    out[start + i] += amp * env * Math.sin(2 * Math.PI * freq * t);
  }
}

// Thang ngu am (pentatonic) - nghe vui, mang am huong dan toc
const C5 = 523.25;
const notes = {
  C5: C5,
  D5: 587.33,
  E5: 659.25,
  G5: 783.99,
  A5: 880.0,
  C6: 1046.5,
  D6: 1174.66,
  E6: 1318.51,
};

// Cau chuong di len: C5 - E5 - G5 - C6, roi vang xa
addBell(0.0, notes.C5, 0.32, 1.5);
addBell(0.22, notes.E5, 0.30, 1.6);
addBell(0.44, notes.G5, 0.28, 1.8);
addBell(0.66, notes.C6, 0.34, 2.4);
addBell(1.05, notes.G5, 0.20, 2.0);
addBell(1.25, notes.E5, 0.16, 2.0);
addBell(1.45, notes.C6, 0.18, 2.6);

// Lop am nen trong treo (drone) tao khong khi trang trong
addBell(0.0, notes.C5 / 2, 0.10, 3.0);
addBell(0.0, notes.G5 / 4, 0.07, 3.4);

// Tia lung linh
addSparkle(0.68, notes.E6, 0.07);
addSparkle(0.78, notes.D6, 0.06);
addSparkle(1.48, notes.C6 * 2, 0.05);
addSparkle(1.60, notes.D6 * 2, 0.04);

/* Chuan hoa + fade out cuoi */
let peak = 0;
for (let i = 0; i < N; i++) {
  const abs = Math.abs(out[i]);
  if (abs > peak) peak = abs;
}
const gain = peak > 0 ? 0.85 / peak : 1;

const fadeStart = Math.floor(SR * (DURATION - 0.35));
const pcm = Buffer.alloc(N * 2);
for (let i = 0; i < N; i++) {
  let v = out[i] * gain;
  // Fade out muot o cuoi de khong bi "tach"
  if (i > fadeStart) {
    v *= (N - i) / (N - fadeStart);
  }
  v = Math.max(-1, Math.min(1, v));
  pcm.writeInt16LE(Math.round(v * 32767), i * 2);
}

/* Ghi header WAV 16-bit mono */
function wavHeader(dataLen) {
  const h = Buffer.alloc(44);
  h.write('RIFF', 0);
  h.writeUInt32LE(36 + dataLen, 4);
  h.write('WAVE', 8);
  h.write('fmt ', 12);
  h.writeUInt32LE(16, 16);
  h.writeUInt16LE(1, 20); // PCM
  h.writeUInt16LE(1, 22); // mono
  h.writeUInt32LE(SR, 24);
  h.writeUInt32LE(SR * 2, 28); // byte rate
  h.writeUInt16LE(2, 32); // block align
  h.writeUInt16LE(16, 34); // bits
  h.write('data', 36);
  h.writeUInt32LE(dataLen, 40);
  return h;
}

const assetsDir = path.join(__dirname, '..', 'assets');
fs.mkdirSync(assetsDir, { recursive: true });

const target = path.join(assetsDir, 'chime.wav');
fs.writeFileSync(target, Buffer.concat([wavHeader(pcm.length), pcm]));

const kb = (fs.statSync(target).size / 1024).toFixed(1);
console.log(`Da tao ${target} (${kb} KB, ${DURATION}s, ${SR} Hz mono)`);
