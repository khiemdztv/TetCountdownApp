'use strict';
/*
 * Ghep bo cuc moi cho tab Lich Tet / Loi chuc vao styles.css.
 *
 * Vi sao can script nay: PowerShell 5.1 mac dinh doc/ghi file theo ANSI,
 * nen neu dung Get-Content/Set-Content de cat ghep thi se lam vo chu tieng Viet.
 * Node doc/ghi UTF-8 dung, va cat theo dong nen an toan.
 *
 * Chay: node scripts/apply-calendar-layout.js
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SRC_CSS = path.join(ROOT, 'src', 'styles.css'); // nguồn chính (cần sửa)
const MID_CSS = path.join(ROOT, 'src', 'calendar-layout.css'); // phần bố cục mới
const DST_CSS = path.join(ROOT, 'native', 'resources', 'styles.css'); // bản sao cho Neutralino

const START = '/* ==================== TAB: LICH TET & LOI CHUC ==================== */';
const END = '/* ==================== TIEN DO NAM ==================== */';

/**
 * Ghép bố cục mới vào một file CSS.
 * Trả về số dòng kết quả.
 */
function applyTo(file) {
  const lines = fs.readFileSync(file, 'utf8').split('\n');

  const startIdx = lines.findIndex((l) => l.trim() === START);
  const endIdx = lines.findIndex((l) => l.trim() === END);

  if (startIdx < 0) throw new Error(`Khong tim thay dong bat dau phan LICH trong ${file}`);
  if (endIdx < 0) throw new Error(`Khong tim thay dong bat dau phan TIEN DO trong ${file}`);
  if (endIdx <= startIdx) throw new Error(`Thu tu phan khong dung trong ${file}`);

  const mid = fs.readFileSync(MID_CSS, 'utf8');

  const out = [
    ...lines.slice(0, startIdx), // truoc phan LICH
    ...mid.split('\n'), // bo cuc moi
    ...lines.slice(endIdx), // tu phan TIEN DO tro di
  ].join('\n');

  fs.writeFileSync(file, out, 'utf8');

  console.log(`  Da ghep ${path.relative(ROOT, file)}`);
  console.log(`    Bo cu: dong ${startIdx + 1}..${endIdx} (${endIdx - startIdx} dong) -> bo moi: ${mid.split('\n').length} dong, ket qua ${out.split('\n').length} dong`);

  return out;
}

function main() {
  if (!fs.existsSync(SRC_CSS)) throw new Error('Khong thay ' + SRC_CSS);
  if (!fs.existsSync(MID_CSS)) throw new Error('Khong thay ' + MID_CSS);

  console.log('Ap bo cuc lich 2 cot:\n');

  // 1. Sua nguon chinh
  const srcOut = applyTo(SRC_CSS);

  // 2. Chep sang ban native (neu thu muc da ton tai)
  let dstOut = srcOut;
  if (fs.existsSync(path.dirname(DST_CSS))) {
    fs.writeFileSync(DST_CSS, srcOut, 'utf8');
    dstOut = srcOut;
    console.log(`  Da chep sang ${path.relative(ROOT, DST_CSS)}`);
  } else {
    console.log('  (chua co native/resources, bo qua)');
  }

  // Kiem tra
  const has = (s) => (dstOut.includes(s) ? 'co' : 'KHONG');
  console.log('');
  console.log(`  .cal-wrap   : ${has('.cal-wrap')}`);
  console.log(`  .milestone  : ${has('.milestone')}`);
  console.log(`  .cal-days   : ${has('.cal-days {')} (nen la KHONG)`);

  const MOJI = ['Ã¡', 'Ã¢', 'Ãª', 'Ã´', 'Ä‘', 'Æ°', 'áº', 'á»'];
  let moji = 0;
  for (const m of MOJI) moji += dstOut.split(m).length - 1;
  console.log('');
  console.log(moji > 3 ? `CANH BAO: con ${moji} chuoi mojibake` : 'Ma hoa: sach');
  process.exit(moji > 3 ? 1 : 0);
}

main();
