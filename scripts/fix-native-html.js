'use strict';
/*
 * Sửa các đường dẫn tài nguyên trong index.html của bản Neutralino.
 *
 * Bản Electron dùng ../assets/... (thư mục assets bên ngoài src).
 * Bản Neutralino gom mọi thứ vào resources/, nên đường dẫn phải là:
 *   ../assets/fonts/fonts.css  ->  fonts/fonts.css
 *   ../assets/img/tet-goat.jpg ->  img/tet-goat.jpg
 *
 * Đồng thời chèn các thẻ <script> cần thiết nếu chưa có.
 *
 * Dùng Node (không dùng PowerShell) vì PowerShell 5.1 đọc/ghi ANSI
 * sẽ làm vỡ chữ tiếng Việt.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const HTML = path.join(ROOT, 'native', 'resources', 'index.html');

let html = fs.readFileSync(HTML, 'utf8');
const before = html;

// 1. Sửa đường dẫn tài nguyên
html = html.replace(/\.\.\/assets\/fonts\//g, 'fonts/');
html = html.replace(/\.\.\/assets\/img\//g, 'img/');
html = html.replace(/\.\.\/assets\/music\//g, 'music/');

// 2. Bỏ mọi thẻ script cũ để chèn lại theo đúng thứ tự
html = html.replace(/\s*<script src="(js\/neutralino|lunar|playlist-data|wishes-data|renderer)\.js"><\/script>/g, '');

// 3. Chèn bộ script đúng thứ tự trước </body>
const scripts = [
  '    <script src="js/neutralino.js"></script>',
  '    <script src="lunar.js"></script>',
  '    <script src="playlist-data.js"></script>',
  '    <script src="wishes-data.js"></script>',
  '    <script src="renderer.js"></script>',
].join('\n');

html = html.replace(/\s*<\/body>/, `\n${scripts}\n  </body>`);

fs.writeFileSync(HTML, html, 'utf8');

console.log('Da sua ' + path.relative(ROOT, HTML));
console.log('  Thay doi: ' + (html === before ? 'KHONG (khong khop mau nao)' : 'co'));
console.log('');

// Bao cao
const lines = html.split('\n');
console.log('Cac the tai nguyen:');
lines.forEach((l, i) => {
  if (/href="|src="/.test(l)) console.log('  dong ' + (i + 1) + ': ' + l.trim());
});

// Kiem tra mojibake
const MOJI = ['Ã¡', 'Ã¢', 'Ãª', 'Ã´', 'Ä‘', 'Æ°', 'áº', 'á»'];
let moji = 0;
for (const m of MOJI) moji += html.split(m).length - 1;
console.log('');
console.log(moji > 3 ? 'CANH BAO: vo ma ' + moji : 'Ma hoa: sach');

// Kiem tra con sot duong dan cu
const stale = (html.match(/\.\.\/assets\//g) || []).length;
console.log(stale === 0 ? 'Duong dan cu: da xoa het' : 'CANH BAO: con ' + stale + ' duong dan cu');
process.exit(moji > 3 || stale > 0 ? 1 : 0);
