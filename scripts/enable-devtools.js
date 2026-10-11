'use strict';
/*
 * Bật DevTools và chế độ gỡ lỗi cho bản Neutralino.
 *
 * DevTools giúp xem lỗi JavaScript thật trong WebView — rất cần vì
 * neutralinojs.log chỉ ghi những gì ta chủ động gọi NL.debug.log,
 * không ghi lỗi runtime của trang.
 *
 * Chạy: node scripts/enable-devtools.js [on|off]
 */

const fs = require('fs');
const path = require('path');

const CFG = path.join(__dirname, '..', 'native', 'neutralino.config.json');
const mode = (process.argv[2] || 'on').toLowerCase();
const on = mode !== 'off';

// Doc file, tu dong bo BOM
let raw = fs.readFileSync(CFG, 'utf8');
if (raw.charCodeAt(0) === 0xfeff) raw = raw.slice(1);

const cfg = JSON.parse(raw);

cfg.logging = { enabled: true, writeToLogFile: true };

if (!cfg.modes || !cfg.modes.window) {
  console.error('Config thieu modes.window');
  process.exit(1);
}

// Neutralino: 'devtools' trong mode window se mo DevTools khi khoi dong
cfg.modes.window.devtools = on;

// Ghi lai KHONG BOM (Neutralino doc JSON, BOM gay loi parse)
fs.writeFileSync(CFG, JSON.stringify(cfg, null, 2), 'utf8');

console.log(`Da ${on ? 'BAT' : 'TAT'} DevTools`);
console.log('  modes.window.devtools =', cfg.modes.window.devtools);
console.log('  logging =', JSON.stringify(cfg.logging));

// Xac nhan doc lai duoc
const check = JSON.parse(fs.readFileSync(CFG, 'utf8'));
console.log('  Doc lai: OK, devtools =', check.modes.window.devtools);
