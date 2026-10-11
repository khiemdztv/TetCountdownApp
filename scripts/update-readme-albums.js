'use strict';
/*
 * Cập nhật README: thay mục "Tuyển tập nhạc" bằng mô tả 3 album.
 *
 * Dùng Node (không dùng PowerShell) vì PowerShell 5.1 đọc/ghi ANSI
 * sẽ làm vỡ chữ tiếng Việt.
 *
 * Chạy: node scripts/update-readme-albums.js
 */

const fs = require('fs');
const path = require('path');

const README = path.join(__dirname, '..', 'README.md');

let t = fs.readFileSync(README, 'utf8');
const before = t;

const START = '## Tuyển tập nhạc';
const END = '## Lời chúc mỗi ngày';
const s = t.indexOf(START);
const e = t.indexOf(END);

const moi = `## Kho nhạc — 3 album, 48 bài

App gồm **3 album**, mỗi album là một file mix liền mạch nên mỗi bài được đánh
dấu bằng mốc thời gian bắt đầu (xem \`src/playlist-data.js\`).

| Album | Số bài | Thời lượng | File |
|---|---:|---|---|
| Tuyển tập Bùi Công Nam | 23 | 76 phút | \`tet-mix.opus\` |
| Nhạc Xuân Chill 2027 | 18 | 72 phút | \`xuan-chill.opus\` |
| Playlist Nhạc Tết | 7 | 29 phút | \`tet-playlist.opus\` |

### Cách chọn bài

- **Mở app:** chọn **ngẫu nhiên một bài trong cả 48 bài** (cả 3 album).
- **Bấm ▶▶ / ◀◀:** đi tuần tự **trong cùng album**; hết album thì sang album kế.
- **Bật ⤨ (ngẫu nhiên):** nhảy ngẫu nhiên giữa **cả 3 album**.
- **Danh sách phát:** nhóm theo album, có tiêu đề từng album.

App tự đổi file khi chuyển sang bài khác album.

### Dò mốc thời gian tự động

Mốc từng bài do \`scripts/detect-tracks.js\` dò bằng cách tìm khoảng lặng
(ffmpeg silencedetect):

\`\`\`powershell
node scripts/detect-tracks.js "duong-dan-file.mp3" -25dB
\`\`\`

Ngưỡng khác nhau cho kết quả khác nhau: **-25dB** tách đúng 18/18 bài cho album
Xuân Chill, nhưng album Playlist crossfade liền mạch nên chỉ tách được 7 mốc.
**Cố tình không chia đều cho đủ tên** — mốc sai sẽ làm bài bị cắt giữa chừng,
nghe khó chịu hơn là ít bài mà trọn vẹn.

### Muốn đổi nhạc

Thay file trong \`assets/music/\` rồi chạy lại \`scripts/detect-tracks.js\` để lấy
mốc mới, cập nhật \`src/playlist-data.js\`.

`;

if (s >= 0 && e > s) {
  t = t.slice(0, s) + moi + t.slice(e);
  fs.writeFileSync(README, t, 'utf8');
  console.log('Da cap nhat muc kho nhac');
} else {
  console.log('Khong tim thay moc can thay (co the da cap nhat roi)');
}

// Kiểm tra
const check = fs.readFileSync(README, 'utf8');
console.log('');
console.log('Co "3 album":', check.includes('3 album') ? 'co' : 'KHONG');
console.log('Co "48 bài" :', check.includes('48 bài') ? 'co' : 'KHONG');
console.log('Da doi    :', check !== before ? 'co' : 'khong');

const MOJI = ['Ã¡', 'Ã¢', 'Ãª', 'Ã´', 'Ä‘', 'Æ°', 'áº', 'á»'];
let moji = 0;
for (const m of MOJI) moji += check.split(m).length - 1;
console.log('Ma hoa:', moji > 3 ? 'VO MA ' + moji : 'sach');
