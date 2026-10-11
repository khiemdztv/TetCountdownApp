'use strict';
/*
 * Thêm CSS cho tab Trò chơi dân gian vào styles.css.
 *
 * Dùng Node (không dùng PowerShell) vì PowerShell 5.1 đọc/ghi ANSI
 * sẽ làm vỡ chữ tiếng Việt.
 *
 * Chạy: node scripts/add-games-tab-css.js [--remove]
 */

const fs = require('fs');
const path = require('path');

const CSS = path.join(__dirname, '..', 'src', 'styles.css');
const remove = process.argv.includes('--remove');

let css = fs.readFileSync(CSS, 'utf8');

// Gỡ khối cũ nếu có
css = css.replace(/\/\* GAMES-TAB \*\/[\s\S]*?\/\* \/GAMES-TAB \*\/\s*\n?/g, '');

if (!remove) {
  const block = `/* GAMES-TAB */
/* Tab Trò chơi dân gian: gói React tự đóng gói trong .tet-games-theme,
   ở đây chỉ lo phần khung chứa và trạng thái đang tải. */
.games-view {
  /* Gói trò chơi cần đủ chỗ cho bàn chơi + thanh công cụ */
  padding: 8px 12px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

#games-mount {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

/* Gói trò chơi khai báo max-width 720px, canh giữa cho cân */
#games-mount > * {
  margin: 0 auto;
  width: 100%;
}

.games-loading {
  display: grid;
  place-items: center;
  flex: 1;
  font-size: 12px;
  color: var(--muted-foreground);
}

/*
 * Trong app, khung nội dung thấp hơn 390px mặc định của gói, nên cho
 * .tet-games-tab co giãn theo chiều cao thật thay vì cố định.
 */
.tet-games-tab {
  height: 100%;
  min-height: 0;
}
/* /GAMES-TAB */

`;

  const anchor = '/* ==================== HIEU UNG ==================== */';
  if (!css.includes(anchor)) {
    console.error('Khong tim thay moc: ' + anchor);
    process.exit(1);
  }
  css = css.replace(anchor, block + anchor);
}

fs.writeFileSync(CSS, css, 'utf8');

console.log(`Da ${remove ? 'go' : 'them'} CSS tab tro choi`);
console.log('  Co .games-view: ' + (css.includes('.games-view {') ? 'co' : 'khong'));

const MOJI = ['Ã¡', 'Ã¢', 'Ãª', 'Ã´', 'Ä‘', 'Æ°', 'áº', 'á»'];
let moji = 0;
for (const m of MOJI) moji += css.split(m).length - 1;
console.log('  Ma hoa: ' + (moji > 3 ? 'VO MA ' + moji : 'sach'));

process.exit(moji > 3 ? 1 : 0);
