'use strict';
/*
 * Tăng cỡ chữ và độ nổi bật cho toàn giao diện.
 *
 * VÌ SAO CẦN: chữ trong app bị nhỏ (8-13px) nên khó đọc. Đồng thời vùng ảnh
 * (.hero) chỉ cao 226px trong khi nội dung cần ~292px, nên "XUÂN MỚI ĐANG VỀ"
 * và "Mùng 1 Tết" bị cắt mất. Phải tăng cỡ chữ ĐI KÈM tăng chiều cao cửa sổ,
 * nếu chỉ tăng chữ thì cắt càng nặng.
 *
 * Dùng Node (không dùng PowerShell) vì PowerShell 5.1 đọc/ghi ANSI
 * sẽ làm vỡ chữ tiếng Việt.
 *
 * Chạy: node scripts/enlarge-typography.js
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const CSS = path.join(ROOT, 'src', 'styles.css');
const RENDERER = path.join(ROOT, 'src', 'renderer-native.js');

/** [tìm, thay, mô tả] — mỗi mục thay ĐÚNG một lần */
const EDITS = [
  // ---- Chiều cao cửa sổ: đủ chỗ cho chữ to hơn ----
  [
    'height: min(522px, calc(100dvh - 32px));',
    'height: min(600px, calc(100dvh - 32px));',
    'chiều cao khung 522 -> 600',
  ],

  // ---- Vùng nội dung: cho phép giãn, không cắt ----
  [
    `.countdown-content {
  width: 61%;
  height: 100%;
  padding: 14px 22px;`,
    `.countdown-content {
  width: 61%;
  height: 100%;
  padding: 16px 22px;`,
    'padding vùng nội dung',
  ],

  // ---- Nhãn nhỏ phía trên ----
  [
    `.eyebrow {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 9px;
  font-size: 8px;
  letter-spacing: 3px;
  color: var(--primary);
}`,
    `.eyebrow {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 9px;
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 3px;
  color: var(--primary);
  text-shadow: 0 0 12px rgba(232, 193, 112, 0.5);
}`,
    'nhãn "XUÂN MỚI ĐANG VỀ" 8 -> 10px',
  ],

  // ---- Tiêu đề chính ----
  [
    `.title-reveal {
  font-family: var(--font-display);
  font-size: 26px;
  font-weight: 600;
  line-height: 1.2;
  margin: 7px 0 3px;
  letter-spacing: 0;
}`,
    `.title-reveal {
  font-family: var(--font-display);
  font-size: 32px;
  font-weight: 700;
  line-height: 1.22;
  margin: 9px 0 4px;
  letter-spacing: 0.5px;
}`,
    'tiêu đề "Tết Nguyên Đán" 26 -> 32px',
  ],

  // ---- Năm Can Chi ----
  [
    `.year-title {
  font-family: var(--font-display);
  font-size: 34px;`,
    `.year-title {
  font-family: var(--font-display);
  font-size: 42px;`,
    '"Đinh Mùi 2027" 34 -> 42px',
  ],

  // ---- Câu phụ ----
  [
    `.hero-sub {
  color: var(--foreground);
  opacity: 0.75;
  font-size: 13px;
  margin: 5px 0 6px;
}`,
    `.hero-sub {
  color: var(--foreground);
  opacity: 0.82;
  font-size: 15px;
  margin: 7px 0 8px;
  text-shadow: 0 1px 8px rgba(0, 0, 0, 0.6);
}`,
    'câu phụ 13 -> 15px',
  ],

  // ---- Số đếm ngược ----
  [
    `.time-value {
  font-size: 28px;`,
    `.time-value {
  font-size: 34px;`,
    'số đếm 28 -> 34px',
  ],

  // ---- Nhãn NGÀY/GIỜ/PHÚT/GIÂY ----
  [
    `.time-label {
  font-size: 8px;
  letter-spacing: 2px;
  color: var(--primary);
  margin-top: 5px;
}`,
    `.time-label {
  font-size: 9.5px;
  font-weight: 600;
  letter-spacing: 2px;
  color: var(--primary);
  margin-top: 6px;
}`,
    'nhãn đơn vị 8 -> 9.5px',
  ],

  // ---- Ô đếm: rộng và thoáng hơn ----
  [
    `.countdown-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
  width: 320px;`,
    `.countdown-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 9px;
  width: 360px;`,
    'lưới đếm 320 -> 360px',
  ],

  // ---- Dòng "Mùng 1 Tết" ----
  [
    `.lunar-date {
  margin: 9px 0 0;
  font-size: 9px;
  color: var(--primary);
  display: flex;
  gap: 5px;
  justify-content: center;
  align-items: center;
}`,
    `.lunar-date {
  margin: 11px 0 0;
  font-size: 11px;
  font-weight: 500;
  color: var(--primary);
  display: flex;
  gap: 6px;
  justify-content: center;
  align-items: center;
  text-shadow: 0 0 10px rgba(232, 193, 112, 0.45);
}`,
    '"Mùng 1 Tết" 9 -> 11px',
  ],

  // ---- Nút đổi đơn vị ----
  [
    `.unit-btn {
  padding: 3px 10px;
  font-family: inherit;
  font-size: 9px;`,
    `.unit-btn {
  padding: 4px 11px;
  font-family: inherit;
  font-size: 10px;`,
    'nút đơn vị 9 -> 10px',
  ],

  // ---- Thẻ mốc kế tiếp ----
  [
    `.milestone {
  margin-top: auto;
  padding: 6px 9px;
  border-radius: 6px;
  background: linear-gradient(180deg, rgba(232, 193, 112, 0.16), rgba(61, 21, 18, 0.5));
  border: 1px solid rgba(232, 193, 112, 0.4);
  font-size: 8.5px;`,
    `.milestone {
  margin-top: auto;
  padding: 7px 10px;
  border-radius: 6px;
  background: linear-gradient(180deg, rgba(232, 193, 112, 0.16), rgba(61, 21, 18, 0.5));
  border: 1px solid rgba(232, 193, 112, 0.4);
  font-size: 10px;`,
    'thẻ mốc kế tiếp 8.5 -> 10px',
  ],

  // ---- Mục trong danh sách mốc ----
  [
    `.cd-item .cd-name {
  min-width: 0;
  color: var(--foreground);
  font-size: 9.5px;`,
    `.cd-item .cd-name {
  min-width: 0;
  color: var(--foreground);
  font-size: 10.5px;`,
    'tên mốc 9.5 -> 10.5px',
  ],

  // ---- Số trong ô lịch ----
  [
    `.calendar-cell > span:first-child {
  grid-row: 2;
  align-self: center;
  font-size: 11px;
  line-height: 1;
}`,
    `.calendar-cell > span:first-child {
  grid-row: 2;
  align-self: center;
  font-size: 12.5px;
  font-weight: 500;
  line-height: 1;
}`,
    'số ngày trong lịch 11 -> 12.5px',
  ],

  // ---- Tên bài hát ----
  [
    `.music-name {
  font-size: 10px;
  font-weight: 500;
  margin-bottom: 3px;`,
    `.music-name {
  font-size: 11.5px;
  font-weight: 600;
  margin-bottom: 3px;`,
    'tên bài 10 -> 11.5px',
  ],

  // ---- Lời chúc ----
  [
    `.wc-wish {
  font-size: 12.5px;
  font-weight: 600;
  line-height: 1.45;`,
    `.wc-wish {
  font-size: 14.5px;
  font-weight: 600;
  line-height: 1.5;`,
    'lời chúc 12.5 -> 14.5px',
  ],
];

function patch(file, edits, label) {
  let text = fs.readFileSync(file, 'utf8');
  let ok = 0;
  let miss = 0;

  for (const [from, to, desc] of edits) {
    if (!text.includes(from)) {
      console.log(`  BO QUA  ${desc} (khong khop mau)`);
      miss++;
      continue;
    }
    // Chỉ thay lần xuất hiện ĐẦU TIÊN
    text = text.replace(from, to);
    console.log(`  OK      ${desc}`);
    ok++;
  }

  fs.writeFileSync(file, text, 'utf8');
  console.log(`\n${label}: ${ok} muc da sua, ${miss} muc khong khop`);
  return { ok, miss };
}

console.log('=== TĂNG CỠ CHỮ VÀ ĐỘ NỔI BẬT ===\n');
console.log('styles.css:');
const r = patch(CSS, EDITS, 'styles.css');

// ---- Cập nhật DESIGN_H trong renderer cho khớp chiều cao mới ----
console.log('\nrenderer-native.js:');
let js = fs.readFileSync(RENDERER, 'utf8');
const before = js;
js = js.replace(/const DESIGN_H = \d+;/, 'const DESIGN_H = 632;');
if (js !== before) console.log('  OK      DESIGN_H -> 632 (khung 600 + padding 32)');
else console.log('  BO QUA  DESIGN_H');

// ---- Cập nhật config Neutralino ----
const CFG = path.join(ROOT, 'native', 'neutralino.config.json');
let raw = fs.readFileSync(CFG, 'utf8');
if (raw.charCodeAt(0) === 0xfeff) raw = raw.slice(1);
const cfg = JSON.parse(raw);
cfg.modes.window.height = 632;
cfg.modes.window.minHeight = 560;
fs.writeFileSync(CFG, JSON.stringify(cfg, null, 2), 'utf8');
console.log(`  OK      config: cua so ${cfg.modes.window.width}x${cfg.modes.window.height}`);
fs.writeFileSync(RENDERER, js, 'utf8');

// ---- Kiểm tra mã hoá ----
const MOJI = ['Ã¡', 'Ã¢', 'Ãª', 'Ã´', 'Ä‘', 'Æ°', 'áº', 'á»'];
let moji = 0;
const check = fs.readFileSync(CSS, 'utf8');
for (const m of MOJI) moji += check.split(m).length - 1;
console.log('\nMa hoa styles.css: ' + (moji > 3 ? 'VO MA ' + moji : 'sach'));

process.exit(r.miss > 0 || moji > 3 ? 1 : 0);
