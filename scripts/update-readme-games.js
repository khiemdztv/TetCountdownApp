'use strict';
/*
 * Cập nhật README: thêm mục tab Trò chơi dân gian.
 *
 * Dùng Node (không dùng PowerShell) vì PowerShell 5.1 đọc/ghi ANSI
 * sẽ làm vỡ chữ tiếng Việt.
 *
 * Chạy: node scripts/update-readme-games.js
 */

const fs = require('fs');
const path = require('path');

const README = path.join(__dirname, '..', 'README.md');

let t = fs.readFileSync(README, 'utf8');

if (t.includes('Trò chơi dân gian')) {
  console.log('README da co muc tro choi, bo qua');
  process.exit(0);
}

const SECTION = `## Trò chơi dân gian

Tab **Trò chơi** gồm 5 game, dùng **Xu ảo** chơi trong phiên, không có backend
và không đổi thành tiền thật:

| Game | Luật tóm tắt |
|---|---|
| **Bầu Cua Tôm Cá** | 6 linh vật, trúng 1/2/3 mặt trả 1/2/3 lần cược |
| **Tài Xỉu** | 3 xúc xắc; Xỉu 4–10, Tài 11–17; bộ ba cả hai cửa đều thua |
| **Tiến Lên Miền Nam** | 13 lá, 3 bích đi trước, 3 đôi thông chặt 2 |
| **Xì Dách** | A = 1/11; Xì Bàn > Xì Dách > Ngũ Linh > điểm; dằn từ 16 |
| **Poker** | Texas Hold'em 5 ghế, blinds 10/20, có side pot |

Mỗi game có nút **hướng dẫn chơi** riêng, và tab có nhạc nền + âm lượng riêng.

### Cách tích hợp

Gói gốc là **React + TypeScript** (nhiều file), còn app là **JS thuần**. Nên đã:

1. **Thay 2 file UI** — \`dialog.tsx\` và \`button.tsx\` — bằng bản nhẹ, bỏ
   \`@radix-ui\` và toàn bộ class Tailwind.
2. **Viết CSS bù** (\`_build/src/games-extra.css\`) cho những class Tailwind mà
   gói dùng (\`text-muted-foreground\`, \`font-display\`, \`h-4\`, \`sr-only\`…),
   vì app không có Tailwind.
3. **Build bundle** bằng esbuild: gộp React + component + luật chơi vào một file,
   nhúng luôn ảnh dưới dạng data URI.

\`\`\`powershell
cd _build
npm install          # lan dau
node build.mjs       # build lai khi sua game
\`\`\`

Kết quả ghi vào \`native/resources/games/\`:
- \`tet-games.js\` (~4 MB) — bundle React
- \`games.css\` (~54 KB) — theme gốc + CSS bù

### Lỗi đã gặp và cách sửa

**"React is not defined"** — bundle chạy nhưng React không render gì, chỉ hiện
dòng lỗi đỏ. Nguyên nhân: gói gốc viết JSX kiểu cũ, esbuild mặc định biên dịch
thành \`React.createElement(...)\` nhưng **không tự thêm import React**, nên
thiếu biến \`React\` lúc chạy.

Cách sửa: bật \`jsx: 'automatic'\` trong \`build.mjs\` để esbuild sinh import từ
\`react/jsx-runtime\`. Sau khi sửa, bundle không còn lần gọi \`React.createElement\`
nào và cả 5 game render đúng.

### Gắn vào app

\`renderer-native.js\` gọi \`window.TetGames.mount(phần tử)\` khi mở tab, và
\`unmount\` khi rời tab (bundle React khá nặng nên chỉ dựng khi cần).

Bundle có **ErrorBoundary**: nếu render lỗi, app hiện thông báo đỏ kèm lý do
thay vì để trắng tab.

## Đổi đơn vị hiển thị`;

t = t.replace('## Đổi đơn vị hiển thị', SECTION);

fs.writeFileSync(README, t, 'utf8');

console.log('Da cap nhat README');
console.log('  Co muc tro choi:', t.includes('Trò chơi dân gian') ? 'co' : 'KHONG');
console.log('  Co ghi loi React:', t.includes('React is not defined') ? 'co' : 'KHONG');

const MOJI = ['Ã¡', 'Ã¢', 'Ãª', 'Ã´', 'Ä‘', 'Æ°', 'áº', 'á»'];
let moji = 0;
for (const m of MOJI) moji += t.split(m).length - 1;
console.log('  Ma hoa:', moji > 3 ? 'VO MA ' + moji : 'sach');
