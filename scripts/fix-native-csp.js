'use strict';
/*
 * Chỉnh CSP và các chi tiết trong index.html cho bản Neutralino.
 *
 * VÌ SAO CẦN: Neutralino chèn token xác thực bằng một thẻ <script> INLINE
 * (tính năng injectGlobals). CSP gốc của bản Electron là:
 *     script-src 'self'
 * chỉ cho phép script từ file, nên thẻ inline đó bị chặn -> mất NL_TOKEN
 * -> lỗi "NE_CL_IVCTOKEN: cannot connect using NL_TOKEN".
 *
 * Cách sửa: cho phép 'unsafe-inline' cho script và style.
 * Chấp nhận được vì app chạy hoàn toàn cục bộ, không nạp nội dung từ mạng
 * (default-src 'none' vẫn chặn mọi nguồn ngoài).
 *
 * Đồng thời thêm favicon để hết lỗi log.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const HTML = path.join(ROOT, 'native', 'resources', 'index.html');
const RES = path.join(ROOT, 'native', 'resources');

let html = fs.readFileSync(HTML, 'utf8');
const before = html;

// 1. CSP: cho phép inline script/style (Neutralino cần để chèn token)
const NEW_CSP =
  "default-src 'none'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; " +
  "img-src 'self' data:; media-src 'self' data:; font-src 'self'; connect-src 'self'";

html = html.replace(
  /content="default-src 'none';[^"]*"/,
  `content="${NEW_CSP}"`
);

// 2. Thêm favicon (lấy từ icon app) để hết cảnh báo trong log
if (!/rel="icon"/.test(html)) {
  html = html.replace(
    /<link rel="stylesheet" href="fonts\/fonts.css" \/>/,
    '<link rel="icon" href="icons/appIcon.png" />\n    <link rel="stylesheet" href="fonts/fonts.css" />'
  );
}

fs.writeFileSync(HTML, html, 'utf8');

console.log('Da chinh ' + path.relative(ROOT, HTML));
console.log('  Thay doi: ' + (html === before ? 'KHONG' : 'co'));
console.log('');

const cspLine = (html.match(/<meta[\s\S]*?http-equiv="Content-Security-Policy"[\s\S]*?\/>/) || [''])[0];
console.log('CSP moi:');
console.log('  ' + cspLine.replace(/\s+/g, ' ').trim());
console.log('');

const hasInline = /script-src[^;]*'unsafe-inline'/.test(html);
console.log(hasInline ? 'Cho phep inline script: CO (dung)' : 'Cho phep inline script: KHONG (se loi token)');

// Kiem tra mojibake
const MOJI = ['Ã¡', 'Ã¢', 'Ãª', 'Ã´', 'Ä‘', 'Æ°', 'áº', 'á»'];
let moji = 0;
for (const m of MOJI) moji += html.split(m).length - 1;
console.log('Ma hoa: ' + (moji > 3 ? 'VO MA ' + moji : 'sach'));

process.exit(hasInline && moji <= 3 ? 0 : 1);
