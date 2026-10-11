'use strict';
/*
 * Thêm CSS cho nút đổi đơn vị hiển thị (Tất cả / Ngày / Giờ / Phút / Giây).
 *
 * Dùng Node (không dùng PowerShell) vì PowerShell 5.1 đọc/ghi ANSI
 * sẽ làm vỡ chữ tiếng Việt.
 *
 * Chạy: node scripts/add-unit-switch-css.js [--remove]
 */

const fs = require('fs');
const path = require('path');

const CSS = path.join(__dirname, '..', 'src', 'styles.css');
const remove = process.argv.includes('--remove');

let css = fs.readFileSync(CSS, 'utf8');

// Gỡ khối cũ nếu có
css = css.replace(/\/\* UNIT-SWITCH \*\/[\s\S]*?\/\* \/UNIT-SWITCH \*\/\s*\n?/g, '');

if (!remove) {
  const block = `/* UNIT-SWITCH */
/* Nút đổi đơn vị hiển thị: Tất cả / Ngày / Giờ / Phút / Giây */
.unit-switch {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  margin: 7px auto 0;
  padding: 3px;
  border-radius: 999px;
  background: rgba(30, 8, 7, 0.55);
  border: 1px solid rgba(232, 193, 112, 0.24);
  width: fit-content;
}

.unit-btn {
  padding: 3px 10px;
  font-family: inherit;
  font-size: 9px;
  font-weight: 600;
  letter-spacing: 0.4px;
  color: rgba(255, 236, 186, 0.7);
  background: transparent;
  border: 0;
  border-radius: 999px;
  cursor: pointer;
  transition: background 0.16s ease, color 0.16s ease, transform 0.14s ease;
}

.unit-btn:hover {
  color: var(--gold-200);
  background: rgba(232, 193, 112, 0.14);
}

.unit-btn.active {
  color: var(--primary-foreground);
  background: linear-gradient(180deg, #ffe9a8, #dcae54);
  box-shadow: 0 0 12px rgba(232, 193, 112, 0.5);
}

.unit-btn:focus-visible {
  outline: 2px solid var(--gold-300);
  outline-offset: 2px;
}

/*
 * Khi chỉ hiện MỘT đơn vị.
 *
 * LỖI TỪNG GẶP: lưới vẫn giữ 4 cột nên ô chỉ rộng 1/4 và số bị cắt
 * ("118" hiện thành "11"). Phải đổi hẳn thành 1 cột.
 */
.countdown-grid.single {
  /* 1 cột, không phải 4 -> ô đủ rộng cho số dài */
  grid-template-columns: minmax(0, 1fr);
  width: auto;
  min-width: 0;
  gap: 0;
  /* Canh giữa khối ô trong vùng nội dung */
  justify-content: center;
  margin: 10px auto 0;
}

.countdown-grid.single .time-tile {
  min-width: 0;
  width: auto;
  /* Đủ chỗ cho 8 chữ số (10.221.525) */
  padding: 10px clamp(20px, 5vw, 44px) 9px;
}

.countdown-grid.single .time-value {
  font-size: clamp(28px, 4.4vw, 42px);
  letter-spacing: 1px;
  white-space: nowrap;
}

.countdown-grid.single .time-label {
  font-size: 8.5px;
  letter-spacing: 3px;
  margin-top: 4px;
}

/* Chế độ 1 đơn vị làm nội dung cao hơn -> thu gọn phần trên cho vừa */
.hero.single-unit .year-title {
  font-size: clamp(26px, 3.4vw, 34px);
}

.hero.single-unit h1.title-reveal {
  font-size: clamp(20px, 2.6vw, 26px);
}

.hero.single-unit .hero-sub {
  margin: 3px 0 4px;
}

.hero.single-unit .ornament {
  margin: 0 0 2px;
}

/* Dòng "Mùng 1 Tết" cần thoáng, không sát viền */
.lunar-date {
  margin-top: 10px;
  padding: 0 6px;
}

.hero.single-unit .lunar-date {
  margin-top: 9px;
}
/* /UNIT-SWITCH */

`;

  const anchor = '/* ==================== HIEU UNG ==================== */';
  if (!css.includes(anchor)) {
    console.error('Khong tim thay moc: ' + anchor);
    process.exit(1);
  }
  css = css.replace(anchor, block + anchor);
}

fs.writeFileSync(CSS, css, 'utf8');

console.log(`Da ${remove ? 'go' : 'them'} CSS nut doi don vi`);
console.log('  Co .unit-switch: ' + (css.includes('.unit-switch {') ? 'co' : 'khong'));
console.log('  Co .single     : ' + (css.includes('.countdown-grid.single') ? 'co' : 'khong'));

const MOJI = ['Ã¡', 'Ã¢', 'Ãª', 'Ã´', 'Ä‘', 'Æ°', 'áº', 'á»'];
let moji = 0;
for (const m of MOJI) moji += css.split(m).length - 1;
console.log('  Ma hoa: ' + (moji > 3 ? 'VO MA ' + moji : 'sach'));

process.exit(moji > 3 ? 1 : 0);
