'use strict';
/*
 * Cập nhật README: thêm mục nút đổi đơn vị hiển thị.
 *
 * Dùng Node (không dùng PowerShell) vì PowerShell 5.1 đọc/ghi ANSI
 * sẽ làm vỡ chữ tiếng Việt.
 *
 * Chạy: node scripts/update-readme-unit-switch.js
 */

const fs = require('fs');
const path = require('path');

const README = path.join(__dirname, '..', 'README.md');

let t = fs.readFileSync(README, 'utf8');

if (t.includes('Đổi đơn vị hiển thị')) {
  console.log('README da co muc nay, bo qua');
  process.exit(0);
}

const SECTION = `## Đổi đơn vị hiển thị

Dưới dãy ô đếm ngược có hàng nút nhỏ: **Tất cả · Ngày · Giờ · Phút · Giây**.

- **Tất cả** (mặc định): hiện đủ 4 ô Ngày / Giờ / Phút / Giây.
- **Ngày / Giờ / Phút / Giây**: chỉ hiện **một ô** với **tổng số đơn vị** còn lại
  (ví dụ chọn "Giây" sẽ thấy \\\`10220906\\\` — tổng số giây, không chia nhỏ).

Khi chỉ hiện một đơn vị, phần tiêu đề phía trên tự thu gọn để nhường chỗ cho ô số
to hơn, và ô được canh giữa.

Lựa chọn được **ghi nhớ**, mở lại app vẫn giữ nguyên.

Phím tắt **\\\`U\\\`** để xoay vòng nhanh giữa các đơn vị.

## Phím tắt`;

// Chèn trước mục "Phím tắt"
if (!t.includes('## Phím tắt')) {
  console.error('Khong tim thay muc "## Phím tắt"');
  process.exit(1);
}

t = t.replace('## Phím tắt', SECTION);

// Bổ sung phím U vào bảng phím tắt
t = t.replace(
  '| `N` | Đổi lời chúc khác |',
  '| `N` | Đổi lời chúc khác |\n| `U` | Xoay vòng đơn vị hiển thị |'
);

fs.writeFileSync(README, t, 'utf8');

console.log('Da cap nhat README');
console.log('  Co muc doi don vi:', t.includes('Đổi đơn vị hiển thị') ? 'co' : 'KHONG');
console.log('  Co phim U       :', t.includes('| `U` |') ? 'co' : 'KHONG');

const MOJI = ['Ã¡', 'Ã¢', 'Ãª', 'Ã´', 'Ä‘', 'Æ°', 'áº', 'á»'];
let moji = 0;
for (const m of MOJI) moji += t.split(m).length - 1;
console.log('  Ma hoa:', moji > 3 ? 'VO MA ' + moji : 'sach');
