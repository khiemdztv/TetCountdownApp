'use strict';
/*
 * Đồng bộ các file dùng chung từ src/ sang native/resources/ cho bản Neutralino.
 *
 * VÌ SAO CẦN SCRIPT NÀY:
 *   Bản Electron dùng CommonJS (module.exports) và đường dẫn ../assets/...
 *   Bản Neutralino chạy trong WebView nên cần:
 *     - module.exports  ->  window.TET_xxx   (không có `module` trong trình duyệt)
 *     - ../assets/...   ->  ...              (assets đã gom vào resources/)
 *
 *   Không dùng PowerShell để làm việc này: PowerShell 5.1 đọc/ghi ANSI
 *   sẽ làm vỡ chữ tiếng Việt (đã từng xảy ra).
 *
 * Chạy: node scripts/sync-native.js
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SRC = path.join(ROOT, 'src');
const RES = path.join(ROOT, 'native', 'resources');

/** Thay thế module.exports bằng biến toàn cục */
const DATA_CONVERSIONS = [
  {
    file: 'playlist-data.js',
    from: /module\.exports\s*=\s*\{\s*ALBUMS,\s*SONGS,[^}]*\};/,
    to: 'window.TET_ALBUMS = ALBUMS; window.TET_SONGS = SONGS;',
    expect: 'window.TET_ALBUMS',
  },
  {
    file: 'wishes-data.js',
    from: /module\.exports\s*=\s*\{\s*WISHES,\s*POEMS,\s*OCCASIONS\s*\};/,
    to: 'window.TET_WISHES_DATA = { WISHES, POEMS, OCCASIONS };',
    expect: 'window.TET_WISHES_DATA',
  },
];

/** File copy nguyên byte (đã là dạng trình duyệt) */
const PLAIN_COPY = ['styles.css', 'index.html', 'daily-event-popup.css', 'daily-event-popup.js', 'app-updater.css', 'app-updater.js', 'update-helper.ps1', 'update-check.ps1'];

/**
 * File đổi tên khi copy.
 *
 * QUAN TRỌNG: renderer.js và lunar.js có HAI bản khác nhau:
 *   - src/lunar.js          (CommonJS, cho Electron)
 *   - src/lunar-browser.js  (gắn window.TetLunar, cho Neutralino)
 *   - src/renderer.js       (dùng window.tetAPI qua IPC, cho Electron)
 *   - src/renderer-native.js(dùng Neutralino.os/window/storage, cho Neutralino)
 *
 * Tuyệt đối không copy src/renderer.js đè lên bản native — đã từng xảy ra
 * và làm app Neutralino hỏng.
 */
const RENAME_COPY = [
  { from: 'lunar-browser.js', to: 'lunar.js' },
  { from: 'renderer-native.js', to: 'renderer.js' },
];

/** Kiểm tra mojibake */
const MOJIBAKE = ['Ã¡', 'Ã¢', 'Ãª', 'Ã´', 'Ä‘', 'Æ°', 'áº', 'á»'];

function countMojibake(s) {
  let n = 0;
  for (const m of MOJIBAKE) n += s.split(m).length - 1;
  return n;
}

let fails = 0;

console.log('=== DONG BO src/ -> native/resources/ ===\n');

// 1. Chuyển dữ liệu
for (const c of DATA_CONVERSIONS) {
  const srcPath = path.join(SRC, c.file);
  const dstPath = path.join(RES, c.file);

  if (!fs.existsSync(srcPath)) {
    console.log(`  LOI  ${c.file}: khong thay file nguon`);
    fails++;
    continue;
  }

  let text = fs.readFileSync(srcPath, 'utf8');

  if (!c.from.test(text)) {
    console.log(`  LOI  ${c.file}: khong khop mau module.exports`);
    fails++;
    continue;
  }

  text = text.replace(c.from, c.to);
  fs.writeFileSync(dstPath, text, 'utf8');

  const ok = text.includes(c.expect);
  const moji = countMojibake(text);
  if (!ok || moji > 3) fails++;

  console.log(
    `  ${ok && moji <= 3 ? 'OK  ' : 'LOI '} ${c.file.padEnd(20)} -> ${c.expect}${moji > 3 ? ' | VO MA ' + moji : ''}`
  );
}

// 2. Copy nguyên file
for (const f of PLAIN_COPY) {
  const srcPath = path.join(SRC, f);
  const dstPath = path.join(RES, f);

  if (!fs.existsSync(srcPath)) {
    console.log(`  LOI  ${f}: khong thay file nguon`);
    fails++;
    continue;
  }

  const text = fs.readFileSync(srcPath, 'utf8');
  const moji = countMojibake(text);
  fs.writeFileSync(dstPath, text, 'utf8');

  if (moji > 3) fails++;
  console.log(`  ${moji <= 3 ? 'OK  ' : 'LOI '} ${f.padEnd(20)} copy nguyen${moji > 3 ? ' | VO MA ' + moji : ''}`);
}

// 2b. Copy có đổi tên (bản trình duyệt của lunar.js)
for (const r of RENAME_COPY) {
  const srcPath = path.join(SRC, r.from);
  const dstPath = path.join(RES, r.to);

  if (!fs.existsSync(srcPath)) {
    console.log(`  LOI  ${r.from}: khong thay file nguon`);
    fails++;
    continue;
  }

  const text = fs.readFileSync(srcPath, 'utf8');
  const moji = countMojibake(text);
  fs.writeFileSync(dstPath, text, 'utf8');

  if (moji > 3) fails++;
  console.log(`  ${moji <= 3 ? 'OK  ' : 'LOI '} ${r.from.padEnd(20)} -> ${r.to}${moji > 3 ? ' | VO MA ' + moji : ''}`);
}

// 3. Sửa đường dẫn trong index.html bản native
const htmlPath = path.join(RES, 'index.html');
let html = fs.readFileSync(htmlPath, 'utf8');
const before = html;
html = html.replace('../assets/icon.png', 'icons/appIcon.png');

html = html.replace(/\.\.\/assets\/fonts\//g, 'fonts/');
html = html.replace(/\.\.\/assets\/img\//g, 'img/');
html = html.replace(/\.\.\/assets\/music\//g, 'music/');

// Cho phép inline script (Neutralino chèn token qua thẻ inline)
html = html.replace(
  /content="default-src 'none';[^"]*"/,
  "content=\"default-src 'none'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; media-src 'self' data:; font-src 'self'; connect-src 'self'\""
);

// Bảo đảm đủ bộ script, đúng thứ tự.
// LƯU Ý: phải có cả games/tet-games.js, nếu không tab Trò chơi sẽ trắng
// vì thiếu bundle React.
html = html.replace(
  /\s*<script src="(js\/neutralino|lunar|playlist-data|wishes-data|games\/tet-games|renderer|daily-event-popup|app-updater)\.js"><\/script>/g,
  ''
);
html = html.replace(
  /\s*<\/body>/,
  '\n    <!-- Thư viện Neutralino phải nạp trước tiên -->' +
    '\n    <script src="js/neutralino.js"></script>' +
    '\n    <script src="lunar.js"></script>' +
    '\n    <script src="playlist-data.js"></script>' +
    '\n    <script src="wishes-data.js"></script>' +
    '\n    <!-- Gói trò chơi dân gian (React đã gộp sẵn trong bundle) -->' +
    '\n    <script src="games/tet-games.js"></script>' +
    '\n    <script src="renderer.js"></script>' +
    '\n    <script src="daily-event-popup.js"></script>' +
    '\n    <script src="app-updater.js"></script>\n  </body>'
);

// Bảo đảm có link CSS của gói trò chơi
if (!html.includes('games/games.css')) {
  html = html.replace(
    /(<link rel="stylesheet" href="styles\.css" \/>)/,
    '$1\n    <!-- CSS riêng của gói trò chơi (tự đóng gói trong .tet-games-theme) -->\n    <link rel="stylesheet" href="games/games.css" />'
  );
}

fs.writeFileSync(htmlPath, html, 'utf8');

const stalePaths = (html.match(/\.\.\/assets\//g) || []).length;
const hasInline = /script-src[^;]*'unsafe-inline'/.test(html);
const htmlMoji = countMojibake(html);
if (stalePaths || !hasInline || htmlMoji > 3) fails++;

console.log('');
console.log(`  ${!stalePaths && hasInline && htmlMoji <= 3 ? 'OK  ' : 'LOI '} index.html           duong dan cu=${stalePaths}, inline=${hasInline ? 'co' : 'khong'}`);

// 4. Kiểm tra cuối: chạy thử các file trong môi trường giả lập trình duyệt
console.log('\n=== KIEM TRA TRONG MOI TRUONG GIA LAP TRINH DUYET ===\n');

const vm = require('vm');
for (const f of ['lunar.js', 'playlist-data.js', 'wishes-data.js']) {
  const code = fs.readFileSync(path.join(RES, f), 'utf8');
  const sandbox = { window: {}, console: { log() {}, error() {} } };
  try {
    vm.createContext(sandbox);
    vm.runInContext(code, sandbox, { filename: f });
    const keys = Object.keys(sandbox.window);
    console.log(`  OK   ${f.padEnd(20)} -> ${keys.join(', ') || '(khong co gi)'}`);
    if (!keys.length) fails++;
  } catch (e) {
    console.log(`  LOI  ${f.padEnd(20)} -> ${e.message}`);
    fails++;
  }
}

// Kiểm tra dữ liệu dùng được
const sandbox = { window: {}, console: { log() {}, error() {} } };
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(RES, 'playlist-data.js'), 'utf8'), sandbox);
vm.runInContext(fs.readFileSync(path.join(RES, 'wishes-data.js'), 'utf8'), sandbox);

const songs = sandbox.window.TET_SONGS;
const wd = sandbox.window.TET_WISHES_DATA;

console.log('');
console.log(`  Bai nhac      : ${songs ? songs.length : 'KHONG CO'}`);
console.log(`  Loi chuc      : ${wd ? wd.WISHES.length : 'KHONG CO'}`);
console.log(`  Tho           : ${wd ? wd.POEMS.length : 'KHONG CO'}`);
console.log(`  Dip dac biet  : ${wd ? Object.keys(wd.OCCASIONS).length : 'KHONG CO'}`);

if (!songs || !wd) fails++;

console.log('');
console.log(fails === 0 ? '=== DONG BO THANH CONG ===' : `=== CO ${fails} LOI ===`);
process.exit(fails === 0 ? 0 : 1);
