'use strict';
/*
 * Đổi CSS gợi ý bật nhạc: thay nút lớn giữa màn hình (che nội dung) bằng
 * hiệu ứng nhấp nháy trên chính nút phát nhạc.
 *
 * Chạy: node scripts/add-play-hint-css.js
 */

const fs = require('fs');
const path = require('path');

const CSS = path.join(__dirname, '..', 'src', 'styles.css');

let css = fs.readFileSync(CSS, 'utf8');

// Gỡ mọi khối PLAY-HINT cũ
css = css.replace(/\/\* PLAY-HINT \*\/[\s\S]*?\/\* \/PLAY-HINT \*\/\s*\n?/g, '');

const block = `/* PLAY-HINT */
/* WebView2 (nền của Neutralino) chặn tự phát nhạc cho tới khi người dùng có
   thao tác đầu tiên — lỗi NotAllowedError. Neutralino không có tuỳ chọn
   autoplay và biến WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS không được đọc
   (đã kiểm chứng: --force-device-scale-factor không có tác dụng).
   Nên phải nhắc người dùng bấm nút phát một lần. */
.mc-btn.play.needs-gesture {
  animation: need-gesture 1.25s ease-in-out infinite;
}

@keyframes need-gesture {
  0%,
  100% {
    box-shadow: 0 0 14px rgba(232, 193, 112, 0.45);
    transform: scale(1);
  }
  50% {
    box-shadow: 0 0 26px rgba(255, 236, 170, 1), 0 0 44px rgba(232, 193, 112, 0.7);
    transform: scale(1.12);
  }
}

/* Tôn trọng người dùng tắt hiệu ứng chuyển động */
@media (prefers-reduced-motion: reduce) {
  .mc-btn.play.needs-gesture {
    animation: none;
    box-shadow: 0 0 22px rgba(255, 236, 170, 0.9);
  }
}
/* /PLAY-HINT */

`;

const anchor = '/* ==================== HIEU UNG ==================== */';
if (!css.includes(anchor)) {
  console.error('Khong tim thay moc: ' + anchor);
  process.exit(1);
}
css = css.replace(anchor, block + anchor);

fs.writeFileSync(CSS, css, 'utf8');

console.log('Da cap nhat CSS goi y bat nhac');
console.log('  Co .needs-gesture: ' + (css.includes('needs-gesture') ? 'co' : 'khong'));

const MOJI = ['Ã¡', 'Ã¢', 'Ãª', 'Ã´', 'Ä‘', 'Æ°', 'áº', 'á»'];
let moji = 0;
for (const m of MOJI) moji += css.split(m).length - 1;
console.log('  Ma hoa: ' + (moji > 3 ? 'VO MA ' + moji : 'sach'));

process.exit(moji > 3 ? 1 : 0);
