'use strict';
/*
 * Tai font ve may de app chay duoc khi KHONG co mang.
 *
 * Vi sao phai lay font "full" thay vi font chia subset:
 *   Google Fonts tra ve 2 kieu tuy theo User-Agent:
 *     - UA trinh duyet hien dai -> woff2 chia nhieu subset (latin, vietnamese...)
 *     - Khong co UA            -> 1 file duy nhat chua day du ky tu
 *
 *   Kieu chia subset gay loi hien thi: ky tu "e" thuong nam o subset latin,
 *   con "e^" (U+00EA) nam o subset vietnamese. Hai file co bang metrics hoi
 *   khac nhau, nen khi dung canh nhau trong cung mot tu se thay khe ho
 *   (vi du "Lời chúc đầu xuân" bi tach giua "e^" va "u").
 *
 *   Vi vay script nay CO TINH khong gui User-Agent de nhan 1 file font duy nhat.
 *   Doi lai file nang hon (khoang 100-200 KB moi font) nhung chu hien dung.
 *
 * Chay lai:  node scripts/fetch-fonts.js
 */

const fs = require('fs');
const path = require('path');

const FONTS_DIR = path.join(__dirname, '..', 'assets', 'fonts');
const CSS_URL =
  'https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@300;400;500;600;700' +
  '&family=Playfair+Display:ital,wght@0,500;0,600;1,500' +
  '&family=Dancing+Script:wght@600&display=swap';

function safeName(s) {
  return s.replace(/[^a-zA-Z0-9._-]/g, '-').replace(/-+/g, '-');
}

async function main() {
  fs.mkdirSync(FONTS_DIR, { recursive: true });

  console.log('Dang tai CSS tu Google Fonts (khong gui User-Agent -> font day du)...');
  const res = await fetch(CSS_URL);
  if (!res.ok) throw new Error(`Khong tai duoc CSS: HTTP ${res.status}`);
  const css = await res.text();

  const blocks = css.match(/@font-face\s*\{[^}]*\}/g) || [];
  console.log(`Tim thay ${blocks.length} khoi @font-face`);

  if (css.includes('unicode-range')) {
    console.log('CANH BAO: CSS van bi chia subset -> chu co the bi tach khe.');
  } else {
    console.log('Tot: CSS tra ve font day du, khong chia subset.');
  }

  let out = `/* Font duoc tai ve may boi scripts/fetch-fonts.js
   Font day du (khong chia subset) de dau tieng Viet hien dung.
   Chay offline, khong phu thuoc mang. */\n\n`;
  let downloaded = 0;
  let failed = 0;

  const seen = new Set();

  for (const block of blocks) {
    const family = (block.match(/font-family:\s*'([^']+)'/) || [])[1] || 'unknown';
    const weight = (block.match(/font-weight:\s*(\d+)/) || [])[1] || '400';
    const style = (block.match(/font-style:\s*(\w+)/) || [])[1] || 'normal';
    const url = (block.match(/url\((https:\/\/[^)]+)\)/) || [])[1];
    if (!url) continue;

    const extMatch = url.match(/\.([a-z0-9]+)(?:\?|$)/i);
    const fileExt = extMatch ? extMatch[1] : 'woff2';

    // format() phai dung ten chuan, neu khong trinh duyet se BO QUA font.
    //   .ttf -> truetype    .otf -> opentype    .woff -> woff    .woff2 -> woff2
    const FORMAT_NAME = {
      ttf: 'truetype',
      otf: 'opentype',
      woff: 'woff',
      woff2: 'woff2',
    };
    const fmt = FORMAT_NAME[fileExt.toLowerCase()] || fileExt;

    const fname = safeName(`${family}-${weight}-${style}.${fileExt}`);
    const fpath = path.join(FONTS_DIR, fname);

    if (seen.has(url)) continue;
    seen.add(url);

    if (!fs.existsSync(fpath)) {
      try {
        const fr = await fetch(url);
        if (!fr.ok) throw new Error(`HTTP ${fr.status}`);
        const buf = Buffer.from(await fr.arrayBuffer());
        fs.writeFileSync(fpath, buf);
        downloaded++;
        console.log(`  OK   ${fname} (${(buf.length / 1024).toFixed(1)} KB)`);
      } catch (err) {
        failed++;
        console.log(`  LOI  ${fname}: ${err.message}`);
        continue;
      }
    } else {
      console.log(`  CO   ${fname}`);
    }

    out += `@font-face {\n`;
    out += `  font-family: '${family}';\n`;
    out += `  font-style: ${style};\n`;
    out += `  font-weight: ${weight};\n`;
    out += `  font-display: swap;\n`;
    out += `  src: url('./${fname}') format('${fmt}');\n`;
    out += `}\n\n`;
  }

  fs.writeFileSync(path.join(FONTS_DIR, 'fonts.css'), out, 'utf8');

  console.log('');
  console.log(`Da tai ${downloaded} file moi, ${failed} loi`);

  // Kiem tra du 3 font can thiet
  const files = fs.readdirSync(FONTS_DIR).filter((f) => f !== 'fonts.css');
  const need = ['Be-Vietnam-Pro', 'Playfair-Display', 'Dancing-Script'];
  const missing = need.filter((n) => !files.some((f) => f.startsWith(n)));
  console.log(`Tong so file font: ${files.length}`);
  if (missing.length) {
    console.log('THIEU font: ' + missing.join(', '));
    process.exit(1);
  }

  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error('That bai:', err.message);
  process.exit(1);
});

