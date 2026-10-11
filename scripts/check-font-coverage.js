'use strict';
/*
 * Kiem tra file font co chua ky tu tieng Viet khong, bang cach doc bang cmap.
 * Dung de kiem chung chat luong font tai ve, khong phu thuoc thu vien ngoai.
 *
 * Chay: node scripts/check-font-coverage.js
 */

const fs = require('fs');
const path = require('path');

/** Doc bang cmap cua font (ho tro dinh dang 4 va 12). */
function readCmap(buf) {
  const numTables = buf.readUInt16BE(4);
  let cmapOff = 0;
  for (let i = 0; i < numTables; i++) {
    const rec = 12 + i * 16;
    const tag = buf.toString('ascii', rec, rec + 4);
    if (tag === 'cmap') {
      cmapOff = buf.readUInt32BE(rec + 8);
      break;
    }
  }
  if (!cmapOff) return null;

  const nSub = buf.readUInt16BE(cmapOff + 2);
  const codepoints = new Set();

  for (let i = 0; i < nSub; i++) {
    const off = cmapOff + 4 + i * 8;
    const platformId = buf.readUInt16BE(off);
    const encodingId = buf.readUInt16BE(off + 2);
    const subOff = cmapOff + buf.readUInt32BE(off + 4);
    const format = buf.readUInt16BE(subOff);

    // Uu tien: (3,1) BMP, (3,10) full, (0,x) unicode
    const isUnicode = platformId === 0 || (platformId === 3 && (encodingId === 1 || encodingId === 10));
    if (!isUnicode) continue;

    if (format === 4) {
      const segX2 = buf.readUInt16BE(subOff + 6);
      const seg = segX2 / 2;
      const endO = subOff + 14;
      const startO = endO + segX2 + 2;
      const deltaO = startO + segX2;
      const rangeO = deltaO + segX2;

      for (let s = 0; s < seg; s++) {
        const end = buf.readUInt16BE(endO + s * 2);
        const start = buf.readUInt16BE(startO + s * 2);
        if (start === 0xffff) continue;
        for (let c = start; c <= end && c !== 0xffff; c++) {
          const rangeOffset = buf.readUInt16BE(rangeO + s * 2);
          let gid;
          if (rangeOffset === 0) {
            gid = (c + buf.readInt16BE(deltaO + s * 2)) & 0xffff;
          } else {
            const gi = rangeO + s * 2 + rangeOffset + (c - start) * 2;
            if (gi + 1 >= buf.length) continue;
            gid = buf.readUInt16BE(gi);
            if (gid !== 0) gid = (gid + buf.readInt16BE(deltaO + s * 2)) & 0xffff;
          }
          if (gid !== 0) codepoints.add(c);
        }
      }
    } else if (format === 12) {
      const nGroups = buf.readUInt32BE(subOff + 12);
      for (let g = 0; g < nGroups; g++) {
        const go = subOff + 16 + g * 12;
        const start = buf.readUInt32BE(go);
        const end = buf.readUInt32BE(go + 4);
        for (let c = start; c <= end; c++) codepoints.add(c);
      }
    }
  }
  return codepoints;
}

/** Cac ky tu tieng Viet quan trong can co */
const VN_TESTS = {
  'ế (U+1EBF)': 0x1ebf,
  'ầ (U+1EA7)': 0x1ea7,
  'ờ (U+1EDD)': 0x1edd,
  'Đ (U+0110)': 0x0110,
  'ê (U+00EA)': 0x00ea,
  'á (U+00E1)': 0x00e1,
  'ạ (U+1EA1)': 0x1ea1,
  'ậ (U+1EAD)': 0x1ead,
  'A (U+0041)': 0x0041,
  'a (U+0061)': 0x0061,
};

const FONTS_DIR = path.join(__dirname, '..', 'assets', 'fonts');

console.log('=== KIEM TRA DO PHU KY TU TIENG VIET CUA FONT ===\n');

const files = fs
  .readdirSync(FONTS_DIR)
  .filter((f) => /\.(ttf|otf|woff2?)$/i.test(f));

if (!files.length) {
  console.log('Khong tim thay file font nao trong assets/fonts');
  process.exit(1);
}

let allGood = true;

for (const f of files) {
  const buf = fs.readFileSync(path.join(FONTS_DIR, f));

  // woff2 la dinh dang nen, khong doc truc tiep duoc cmap
  if (/\.woff2?$/i.test(f)) {
    console.log(`${f}\n  (woff2 - khong doc duoc cmap truc tiep, bo qua)\n`);
    continue;
  }

  const cps = readCmap(buf);
  if (!cps) {
    console.log(`${f}\n  KHONG DOC DUOC cmap\n`);
    allGood = false;
    continue;
  }

  const missing = [];
  for (const [name, cp] of Object.entries(VN_TESTS)) {
    if (!cps.has(cp)) missing.push(name);
  }

  const status = missing.length === 0 ? 'DU' : `THIEU ${missing.length}`;
  console.log(`${f}`);
  console.log(`  Tong so ky tu : ${cps.size}`);
  console.log(`  Tieng Viet    : ${status}`);
  if (missing.length) {
    console.log(`  Thieu         : ${missing.join(', ')}`);
    allGood = false;
  }
  console.log('');
}

console.log(allGood ? '=== TAT CA FONT DEU DU KY TU TIENG VIET ===' : '=== CO FONT THIEU KY TU ===');
process.exit(allGood ? 0 : 1);
