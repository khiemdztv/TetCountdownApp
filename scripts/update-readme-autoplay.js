'use strict';
/*
 * Cập nhật README: thay mục "phải bấm một lần để bật nhạc" bằng mục mô tả
 * cách app tự phát nhạc, và ghi chú việc đã gỡ các nút cửa sổ giả.
 *
 * Dùng Node (không dùng PowerShell) vì PowerShell 5.1 đọc/ghi ANSI
 * sẽ làm vỡ chữ tiếng Việt.
 *
 * Chạy: node scripts/update-readme-autoplay.js
 */

const fs = require('fs');
const path = require('path');

const README = path.join(__dirname, '..', 'README.md');

let t = fs.readFileSync(README, 'utf8');
const before = t;

// ---------- 1. Thay mục "Vì sao phải bấm" ----------
const START = '## Vì sao phải bấm một lần để bật nhạc';
const END = '## Tuyển tập nhạc';
const s = t.indexOf(START);
const e = t.indexOf(END);

if (s >= 0 && e > s) {
  const moi = `## Nhạc tự phát khi mở app

App **tự phát nhạc ngay khi khởi động**, không cần bấm gì.

### Chuyện đằng sau

WebView2 (nền của Neutralino) chặn tự phát âm thanh cho tới khi có thao tác của
người dùng — lỗi \`NotAllowedError\`. Đã thử và **không hiệu lực**:

- \`modes.window.webviewArgs\` trong config — Neutralino từ chối, app không khởi động.
- Biến \`WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS\` — WebView2 không đọc.
- Registry policy \`AdditionalBrowserArguments\` — không đọc.
- Đặt \`audio.muted = true\` lúc đầu — vẫn bị chặn.

**Cách giải quyết:** Windows coi thao tác sinh bằng \`keybd_event\`/\`SendInput\` là input
**thật** của người dùng. App nhờ PowerShell gửi một phím vô hại (**F24** — hầu như
không ứng dụng nào dùng) vào cửa sổ đang focus; Chromium cấp quyền và nhạc phát.

An toàn vì:

- Chỉ gửi **một lần** mỗi lần chạy (cờ \`_autoTried\`).
- Chỉ gửi khi cửa sổ app **đang thật sự được focus** — nếu không, phím sẽ bay sang
  ứng dụng khác nên app chủ động bỏ qua.
- App tự gọi \`window.show()\` + \`window.focus()\` trước, nên lúc tự khởi động cùng
  Windows vẫn phát được.
- Phím F24 không ứng dụng nào xử lý, không gõ vào ô nhập liệu nào.

Nếu vì lý do nào đó vẫn bị chặn, app tự chuyển sang phương án dự phòng: nút phát
nhấp nháy kèm chữ "Bấm ▶ để bật nhạc", và nhạc phát ngay khi bạn bấm bất kỳ chỗ nào.

`;
  t = t.slice(0, s) + moi + t.slice(e);
  console.log('Da thay muc nhac tu phat');
} else {
  console.log('Khong tim thay muc "Vi sao phai bam" (co the da thay roi)');
}

// ---------- 2. Ghi chú đã gỡ nút cửa sổ giả ----------
const NOTE = `## Về thanh tiêu đề

Bản gốc do Lovable tạo có **nút cửa sổ giả** (– ⛶ ✕) vì nó mô phỏng một cửa sổ
bên trong trang web. Bản Neutralino là **cửa sổ thật**, đã có nút của Windows,
nên các nút giả đó đã được gỡ bỏ (trong \`index.html\`, \`renderer-native.js\`
và \`styles.css\`).

Thanh tiêu đề bên trong app vẫn giữ lại phần nhãn hiệu
"✿ Tết 2027 — Đếm ngược ngày đoàn viên" cho đẹp.

## Chạy khi phát triển`;

t = t.replace('## Chạy khi phát triển', NOTE);

if (t !== before) {
  fs.writeFileSync(README, t, 'utf8');
  console.log('Da cap nhat README');
} else {
  console.log('README khong doi');
}

// ---------- Kiểm tra ----------
const check = fs.readFileSync(README, 'utf8');
console.log('');
console.log('Con nhac "phai bam mot lan":', check.includes('phải bấm một lần') ? 'CO' : 'khong');
console.log('Co muc "Nhac tu phat"      :', check.includes('Nhạc tự phát khi mở app') ? 'co' : 'KHONG');
console.log('Co muc "thanh tieu de"     :', check.includes('Về thanh tiêu đề') ? 'co' : 'KHONG');

const MOJI = ['Ã¡', 'Ã¢', 'Ãª', 'Ã´', 'Ä‘', 'Æ°', 'áº', 'á»'];
let moji = 0;
for (const m of MOJI) moji += check.split(m).length - 1;
console.log('Ma hoa:', moji > 3 ? 'VO MA ' + moji : 'sach');
