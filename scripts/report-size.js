'use strict';
/*
 * Báo cáo dung lượng hai bản dựng, để theo dõi mục tiêu dưới 50 MB.
 *
 * Chạy: npm run size   (hoặc node scripts/report-size.js)
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const TARGET_MB = 50;

/** Tính tổng dung lượng một thư mục (đệ quy). */
function dirSize(dir) {
  if (!fs.existsSync(dir)) return 0;
  let total = 0;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) total += dirSize(p);
    else total += fs.statSync(p).size;
  }
  return total;
}

/** Liệt kê các mục lớn nhất trong thư mục. */
function biggest(dir, n = 10) {
  const rows = [];
  const walk = (d) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else rows.push({ p: path.relative(dir, p), size: fs.statSync(p).size });
    }
  };
  if (!fs.existsSync(dir)) return [];
  walk(dir);
  rows.sort((a, b) => b.size - a.size);
  return rows.slice(0, n);
}

const mb = (bytes) => (bytes / 1048576).toFixed(1);
const kb = (bytes) => (bytes / 1024).toFixed(0);

console.log('=== DUNG LUONG BAN NEUTRALINO (ban chinh) ===\n');

const native = path.join(ROOT, 'native');
const nativeSize = dirSize(native);

if (nativeSize === 0) {
  console.log('  Chua co thu muc native/');
} else {
  console.log(`  Tong: ${mb(nativeSize)} MB`);
  console.log('');
  console.log('  Cac muc lon nhat:');
  for (const r of biggest(native, 12)) {
    console.log(`    ${String(mb(r.size)).padStart(6)} MB  ${r.p}`);
  }
  console.log('');
  console.log(
    nativeSize / 1048576 <= TARGET_MB
      ? `  DAT muc tieu duoi ${TARGET_MB} MB`
      : `  VUOT muc tieu ${TARGET_MB} MB`
  );
}

console.log('\n=== BAN ELECTRON (de tham chieu) ===\n');

const dist = path.join(ROOT, 'dist');
if (!fs.existsSync(dist)) {
  console.log('  Chua dong goi (chay npm run dist neu can)');
} else {
  for (const f of fs.readdirSync(dist).filter((n) => n.endsWith('.exe') || n.endsWith('.zip'))) {
    const p = path.join(dist, f);
    if (fs.statSync(p).isFile()) {
      console.log(`  ${String(mb(fs.statSync(p).size)).padStart(6)} MB  ${f}`);
    }
  }
}

console.log('\n=== THANH PHAN NANG NHAT ===\n');
for (const item of [
  ['Nhac Opus 48kbps', path.join(native, 'resources', 'music', 'tet-mix.opus')],
  ['Nhan Neutralino', path.join(native, 'TetCountdown2027-win_x64.exe')],
  ['Anh linh vat', path.join(native, 'resources', 'img', 'tet-goat.jpg')],
  ['Font (9 file)', path.join(native, 'resources', 'fonts')],
  ['Thu vien client', path.join(native, 'resources', 'js', 'neutralino.js')],
]) {
  const [label, p] = item;
  if (!fs.existsSync(p)) continue;
  const size = fs.statSync(p).isDirectory() ? dirSize(p) : fs.statSync(p).size;
  console.log(`  ${String(mb(size)).padStart(6)} MB  ${label}${size < 1048576 ? ` (${kb(size)} KB)` : ''}`);
}
