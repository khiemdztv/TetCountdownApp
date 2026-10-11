'use strict';
/*
 * Thêm phần tử gợi ý "bấm để bật nhạc" vào index.html.
 *
 * VÌ SAO CẦN: WebView2 (nền của Neutralino) chặn tự phát nhạc cho tới khi
 * người dùng có thao tác đầu tiên — lỗi NotAllowedError. Neutralino không
 * có tuỳ chọn autoplay và biến WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS không
 * được đọc (đã kiểm chứng: --force-device-scale-factor không có tác dụng).
 *
 * Nên phải báo cho người dùng biết chỉ cần bấm một lần.
 *
 * Chạy: node scripts/add-play-hint.js [--remove]
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const HTML = path.join(ROOT, 'src', 'index.html');
const remove = process.argv.includes('--remove');

let html = fs.readFileSync(HTML, 'utf8');

// Bỏ gợi ý cũ nếu có
html = html.replace(/\s*<!-- PLAY-HINT -->[\s\S]*?<!-- \/PLAY-HINT -->/g, '');

if (!remove) {
  const hint = `    <!-- PLAY-HINT -->
    <button class="play-hint" id="play-hint" type="button" hidden>
      <span class="ph-ico">♪</span>
      <span class="ph-txt">Bấm vào đây để bật nhạc Tết</span>
    </button>
    <!-- /PLAY-HINT -->`;

  // Chèn ngay trước thẻ đóng </body>
  html = html.replace(/(\s*<script src="renderer)/, `\n${hint}$1`);
}

fs.writeFileSync(HTML, html, 'utf8');

console.log(`Da ${remove ? 'go' : 'them'} goi y bat nhac trong ` + path.relative(ROOT, HTML));

const has = html.includes('id="play-hint"');
console.log('  Co #play-hint: ' + (has ? 'co' : 'khong'));

// Kiem tra mojibake
const MOJI = ['Ã¡', 'Ã¢', 'Ãª', 'Ã´', 'Ä‘', 'Æ°', 'áº', 'á»'];
let moji = 0;
for (const m of MOJI) moji += html.split(m).length - 1;
console.log('  Ma hoa: ' + (moji > 3 ? 'VO MA ' + moji : 'sach'));

process.exit(moji > 3 ? 1 : 0);
