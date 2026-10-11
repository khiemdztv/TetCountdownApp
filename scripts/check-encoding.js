'use strict';
/*
 * Kiem tra file nao bi vo ma (mojibake) va file nao con chu Viet dung.
 *
 * Hien tuong: file duoc luu UTF-8 nhung bi doc/dich nham qua ANSI (Windows-1252),
 * nen "Tết" thanh "Táº¿t". Khi trinh duyet doc UTF-8 dung thi khong sao,
 * nhung neu file THUC SU chua byte mojibake thi hien sai.
 *
 * Chay: node scripts/check-encoding.js <thu-muc>
 */

const fs = require('fs');
const path = require('path');

const root = process.argv[2] || path.join(__dirname, '..', 'native');
const EXTS = ['.html', '.css', '.js', '.json'];
const SKIP = ['neutralino.js', 'node_modules'];

/** Chuoi dac trung cua mojibake (UTF-8 bi doc nham thanh Latin-1) */
const MOJIBAKE = ['Ã¡', 'Ã¢', 'Ãª', 'Ã´', 'Ä‘', 'Æ°', 'áº', 'á»', 'Ã ', 'á»‡', 'áº¿'];

/*
 * Các file CÔNG CỤ tự chứa danh sách mẫu mojibake làm DỮ LIỆU để phát hiện lỗi,
 * nên chúng luôn bị báo "vỡ mã hoá" một cách sai. Bỏ qua để tránh dương tính giả.
 */
const SKIP_FILES = [
  'check-encoding.js',
  'sync-native.js',
  'fix-native-html.js',
  'fix-native-csp.js',
  'add-games-tab-css.js',
  'add-play-hint-css.js',
  'add-play-hint.js',
  'add-unit-switch-css.js',
  'apply-calendar-layout.js',
  'enlarge-typography.js',
  'update-readme-albums.js',
  'update-readme-autoplay.js',
  'update-readme-games.js',
  'update-readme-unit-switch.js',
];

/** Ky tu tieng Viet dung */
const VN_RE = /[àáâãèéêìíòóôõùúýăđĩũơưạảấầẩẫậắằẳẵặẹẻẽếềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹ]/g;

const rows = [];

function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (SKIP.some((s) => p.includes(s))) continue;
    if (SKIP_FILES.includes(e.name)) continue;
    if (e.isDirectory()) walk(p);
    else if (EXTS.includes(path.extname(e.name).toLowerCase())) check(p);
  }
}

function check(file) {
  const buf = fs.readFileSync(file);

  // Kiem tra BOM
  const hasBom = buf.length >= 3 && buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf;

  // Doc nhu UTF-8
  const asUtf8 = buf.toString('utf8');

  // Neu file chua byte khong hop le UTF-8, Buffer se thay bang U+FFFD
  const invalidUtf8 = (asUtf8.match(/\uFFFD/g) || []).length;

  let moji = 0;
  for (const m of MOJIBAKE) {
    moji += asUtf8.split(m).length - 1;
  }

  const vn = (asUtf8.match(VN_RE) || []).length;

  let verdict = 'OK';
  if (invalidUtf8 > 0) verdict = 'LOI UTF-8';
  else if (moji > 3) verdict = 'VO MA';

  rows.push({
    file: path.relative(root, file),
    verdict,
    bom: hasBom,
    moji,
    vn,
    invalid: invalidUtf8,
    size: buf.length,
  });
}

walk(root);

rows.sort((a, b) => b.moji - a.moji);

console.log('=== KIEM TRA MA HOA KY TU ===\n');
console.log(
  'File'.padEnd(24) +
    'Ket luan'.padEnd(12) +
    'BOM'.padEnd(6) +
    'Mojibake'.padEnd(10) +
    'ChuViet'.padEnd(9) +
    'LoiUTF8'
);
console.log('-'.repeat(72));

let bad = 0;
for (const r of rows) {
  if (r.verdict !== 'OK') bad++;
  console.log(
    r.file.padEnd(24) +
      r.verdict.padEnd(12) +
      (r.bom ? 'co' : '-').padEnd(6) +
      String(r.moji).padEnd(10) +
      String(r.vn).padEnd(9) +
      String(r.invalid)
  );
}

console.log('');
console.log(bad === 0 ? '=== TAT CA FILE DEU DUNG MA HOA ===' : `=== CO ${bad} FILE CO VAN DE ===`);
process.exit(bad === 0 ? 0 : 1);
