'use strict';
/*
 * Sửa dòng khai báo VN_RE trong check-encoding.js bị hỏng mã hoá.
 *
 * Dùng Node (không dùng công cụ edit) vì chính ký tự cần thay là ký tự hỏng,
 * dễ bị hỏng thêm nếu đi qua lớp xử lý chuỗi khác.
 *
 * Chạy: node scripts/fix-vnre.js
 */

const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, 'check-encoding.js');

let t = fs.readFileSync(FILE, 'utf8');

// Xây ký tự tiếng Việt từ mã code point để tránh mọi vấn đề mã hoá
const VN_CHARS =
  '\u00e0\u00e1\u00e2\u00e3\u00e8\u00e9\u00ea\u00ec\u00ed\u00f2\u00f3\u00f4\u00f5\u00f9\u00fa\u00fd' +
  '\u0103\u0111\u0129\u0169\u01a1\u01b0\u1ea1\u1ea3\u1ea5\u1ea7\u1ea9\u1eab\u1ead\u1eaf\u1eb1\u1eb3' +
  '\u1eb5\u1eb7\u1eb9\u1ebb\u1ebd\u1ebf\u1ec1\u1ec3\u1ec5\u1ec7\u1ec9\u1ecb\u1ecd\u1ecf\u1ed1\u1ed3' +
  '\u1ed5\u1ed7\u1ed9\u1edb\u1edd\u1edf\u1ee1\u1ee3\u1ee5\u1ee7\u1ee9\u1eeb\u1eed\u1eef\u1ef1\u1ef3' +
  '\u1ef5\u1ef7\u1ef9';

const NEW_LINE = `const VN_RE = /[${VN_CHARS}]/g;`;

const lines = t.split('\n');
let fixed = 0;

for (let i = 0; i < lines.length; i++) {
  if (lines[i].startsWith('const VN_RE')) {
    if (lines[i] !== NEW_LINE) {
      lines[i] = NEW_LINE;
      fixed++;
    }
    break;
  }
}

t = lines.join('\n');
fs.writeFileSync(FILE, t, 'utf8');

console.log('Da sua VN_RE trong check-encoding.js');
console.log('  So dong sua: ' + fixed);
console.log('  Ky tu tieng Viet: ' + [...VN_CHARS].length);

// Kiểm tra file không còn ký tự hỏng
const check = fs.readFileSync(FILE, 'utf8');
const bad = (check.match(/\uFFFD/g) || []).length;
console.log('  Ky tu hong con lai: ' + bad);

process.exit(bad > 0 ? 1 : 0);
