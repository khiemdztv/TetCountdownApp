'use strict';
/*
 * Do chieu rong tien (advance width) cua tung ky tu trong cac font,
 * de tim font nao render tieng Viet bi lech khoang cach.
 *
 * Hien tuong: "Lời chúc đầu xuân" hien thanh "Lời chúc đầ u xuân"
 * => co the mot so glyph co advance width sai.
 *
 * Chay bang Electron:  electron scripts/measure-fonts.js
 */

const { app, BrowserWindow } = require('electron');
const path = require('path');

const TESTS = [
  // [nhan, chuoi]
  ['a thuong', 'a'],
  ['a mu', 'â'],
  ['a mu + huyen', 'ầ'],
  ['a mu + sac', 'ấ'],
  ['e mu', 'ê'],
  ['e mu + huyen', 'ề'],
  ['o mu', 'ô'],
  ['o mu + sac', 'ố'],
  ['a thuong + huyen', 'ầ'],
  ['d gach', 'đ'],
  ['D gach', 'Đ'],
  ['tu co dau', 'đầu'],
  ['tu khong dau', 'dau'],
  ['cau mau', 'Lời chúc đầu xuân'],
  ['cau mau 2', 'Tháng Giêng, trăng sáng vằng vặc'],
];

const FONTS = [
  ['Be Vietnam Pro', 'Be Vietnam Pro'],
  ['Playfair Display', 'Playfair Display'],
  ['Dancing Script', 'Dancing Script'],
];

app.whenReady().then(async () => {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    show: false,
    webPreferences: { contextIsolation: true, nodeIntegration: false },
  });

  const fontsCss = path
    .join(__dirname, '..', 'assets', 'fonts', 'fonts.css')
    .replace(/\\/g, '/');

  await win.loadURL(
    'data:text/html,' +
      encodeURIComponent(
        `<!DOCTYPE html><html><head><link rel="stylesheet" href="file:///${fontsCss}"></head><body></body></html>`
      )
  );

  // Cho font nap xong
  await win.webContents.executeJavaScript(`
    document.fonts.ready.then(() => true)
  `);
  await new Promise((r) => setTimeout(r, 1200));

  const result = await win.webContents.executeJavaScript(`
    (function () {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const out = [];
      const tests = ${JSON.stringify(TESTS)};
      const fonts = ${JSON.stringify(FONTS)};

      for (const [fname, ffamily] of fonts) {
        for (const [label, str] of tests) {
          // Do voi font dang xet
          ctx.font = '40px "' + ffamily + '"';
          const w = ctx.measureText(str).width;

          // Do voi font du phong (chi de so sanh tuong doi)
          ctx.font = '40px serif';
          const wSerif = ctx.measureText(str).width;

          out.push({
            font: fname,
            label,
            str,
            width: Math.round(w * 100) / 100,
            perChar: Math.round((w / [...str].length) * 100) / 100,
            serif: Math.round(wSerif * 100) / 100
          });
        }
      }
      return JSON.stringify(out);
    })()
  `);

  const rows = JSON.parse(result);

  // In bang theo tung font
  const byFont = {};
  for (const r of rows) {
    (byFont[r.font] = byFont[r.font] || []).push(r);
  }

  for (const [font, list] of Object.entries(byFont)) {
    console.log('\\n=== ' + font + ' ===');
    console.log('Ky tu'.padEnd(22) + 'Rong'.padStart(9) + 'Moi ky tu'.padStart(12));
    for (const r of list) {
      console.log(
        r.label.padEnd(22) +
          String(r.width).padStart(9) +
          String(r.perChar).padStart(12)
      );
    }
  }

  // Phan tich: so sanh "a mu + huyen" voi "a thuong"
  console.log('\\n=== PHAN TICH ===');
  for (const font of Object.keys(byFont)) {
    const list = byFont[font];
    const get = (l) => (list.find((r) => r.label === l) || {}).width || 0;
    const a = get('a thuong');
    const am = get('a mu');
    const amh = get('a mu + huyen');
    const ac = get('a thuong + huyen');
    console.log(
      font +
        ':  a=' + a + '  a^=' + am + '  a^+huyen=' + amh + '  a+huyen=' + ac +
        '  => chenh lech a^ vs a = ' + (Math.round((am - a) * 100) / 100)
    );
  }

  console.log('\\nXONG');
  setTimeout(() => app.exit(0), 300);
});
