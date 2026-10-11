'use strict';
/*
 * Tìm chiều cao cửa sổ nhỏ nhất mà tab Lịch Tết vẫn hiện đủ 7/7 mốc.
 *
 * VÌ SAO CẦN: thiết kế gốc là cửa sổ 720x490, nhưng khi thêm tab Lịch Tết
 * với 2 cột thì 490px không đủ — đo được chỉ hiện 3/7 mốc (mất dữ liệu).
 * Cần biết con số thật thay vì đoán.
 *
 * Cách làm: lần lượt đặt chiều cao, chạy app, đọc kết quả đo từ log.
 *
 * Chạy: node scripts/tune-window-height.js
 */

const fs = require('fs');
const path = require('path');
const { spawn, execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const CONFIG = path.join(ROOT, 'native', 'neutralino.config.json');
const CSS = path.join(ROOT, 'src', 'styles.css');
const RENDERER = path.join(ROOT, 'src', 'renderer-native.js');
const LOG = path.join(ROOT, 'native', 'neutralinojs.log');
const EXE = path.join(ROOT, 'native', 'TetCountdown2027-win_x64.exe');

/** Đọc config, tự động bỏ BOM. */
function readConfig() {
  let raw = fs.readFileSync(CONFIG, 'utf8');
  if (raw.charCodeAt(0) === 0xfeff) raw = raw.slice(1);
  return JSON.parse(raw);
}

function writeConfig(cfg) {
  fs.writeFileSync(CONFIG, JSON.stringify(cfg, null, 2), 'utf8');
}

/**
 * Đặt chiều cao khung (CSS) và chiều cao thiết kế (JS).
 * @param {number} frameH  chiều cao .app-window trong CSS
 * @param {number} designH chiều cao DESIGN_H trong renderer
 */
function setHeight(frameH, designH) {
  // CSS
  let css = fs.readFileSync(CSS, 'utf8');
  css = css.replace(
    /height: min\(\d+px, calc\(100dvh - 32px\)\);/,
    `height: min(${frameH}px, calc(100dvh - 32px));`
  );
  fs.writeFileSync(CSS, css, 'utf8');

  // JS
  let js = fs.readFileSync(RENDERER, 'utf8');
  js = js.replace(/const DESIGN_H = \d+;/, `const DESIGN_H = ${designH};`);
  fs.writeFileSync(RENDERER, js, 'utf8');
}

/** Đồng bộ sang native rồi chạy app, trả về kết quả đo. */
function runAndMeasure() {
  // Phải chạy CẢ HAI: apply-calendar-layout ghép bố cục vào styles.css,
  // rồi sync-native mới chép sang native. Thiếu bước đầu thì bố cục cũ
  // vẫn nằm trong native và kết quả đo sẽ sai.
  execFileSync(process.execPath, [path.join(__dirname, 'apply-calendar-layout.js')], {
    cwd: ROOT,
    stdio: 'ignore',
  });
  execFileSync(process.execPath, [path.join(__dirname, 'sync-native.js')], {
    cwd: ROOT,
    stdio: 'ignore',
  });

  if (fs.existsSync(LOG)) fs.unlinkSync(LOG);

  const cfg = readConfig();
  cfg.url = '/index.html?measure=1';
  writeConfig(cfg);

  const child = spawn(EXE, [], { cwd: path.dirname(EXE), detached: true, stdio: 'ignore' });
  child.unref();

  // Chờ app khởi động và ghi log
  const deadline = Date.now() + 20000;
  while (Date.now() < deadline) {
    execFileSync(process.execPath, ['-e', 'setTimeout(()=>{},400)']);
    if (fs.existsSync(LOG)) {
      const text = fs.readFileSync(LOG, 'utf8');
      if (text.includes('moc hien duoc')) break;
    }
  }

  // Tắt app
  try {
    execFileSync('taskkill', ['/IM', 'TetCountdown2027-win_x64.exe', '/F'], { stdio: 'ignore' });
  } catch {
    /* có thể đã tắt */
  }

  const text = fs.existsSync(LOG) ? fs.readFileSync(LOG, 'utf8') : '';

  const grab = (re) => {
    const m = text.match(re);
    return m ? m[1] : null;
  };

  return {
    viewport: grab(/cua so CSS: (\d+x\d+)/),
    frame: grab(/khung app : (\d+x\d+)/),
    calPanel: grab(/calendar : panel (\d+)px/),
    moc: grab(/moc hien duoc: (\d+\/\d+)/),
    countdownOver: grab(/countdown: panel \d+px, noi dung \d+px, tran (\d+)px/),
    wishesOver: grab(/wishes\s*: panel \d+px, noi dung \d+px, tran (\d+)px/),
  };
}

// Các mức chiều cao cần thử (chiều cao khung CSS)
const HEIGHTS = [490, 510, 530, 550, 560, 580];

console.log('=== TIM CHIEU CAO TOI THIEU CHO TAB LICH TET ===\n');
console.log('khung  | cua so CSS | panel lich | moc hien | tran dem nguoc | tran loi chuc');
console.log('-------+------------+------------+----------+----------------+--------------');

const results = [];

for (const h of HEIGHTS) {
  const designH = h + 32; // + padding 16px mỗi bên của .workspace
  setHeight(h, designH);
  const r = runAndMeasure();
  results.push({ h, ...r });

  console.log(
    `${String(h).padStart(5)}px | ${String(r.viewport || '?').padEnd(10)} | ` +
      `${String(r.calPanel || '?').padStart(7)}px  | ${String(r.moc || '?').padStart(8)} | ` +
      `${String(r.countdownOver || '?').padStart(14)} | ${String(r.wishesOver || '?').padStart(12)}`
  );
}

// Chọn mức nhỏ nhất đạt 7/7
const good = results.filter((r) => r.moc === '7/7' && r.countdownOver === '0' && r.wishesOver === '0');

console.log('');
if (good.length) {
  const best = good[0];
  console.log(`=> Chieu cao nho nhat dat du: ${best.h}px (khung), cua so ${best.viewport}`);
  console.log(`   Dang ap dung lai muc nay.`);

  setHeight(best.h, best.h + 32);
  execFileSync(process.execPath, [path.join(__dirname, 'apply-calendar-layout.js')], {
    cwd: ROOT,
    stdio: 'ignore',
  });
  execFileSync(process.execPath, [path.join(__dirname, 'sync-native.js')], {
    cwd: ROOT,
    stdio: 'ignore',
  });

  const cfg = readConfig();
  cfg.url = '/';
  cfg.modes.window.width = best.h + 32 > 560 ? 752 : 752;
  cfg.modes.window.height = best.h + 32;
  writeConfig(cfg);

  console.log(`   Config: cua so ${cfg.modes.window.width}x${cfg.modes.window.height}`);
} else {
  console.log('=> Khong muc nao dat du 7/7. Can lam gon bo cuc them.');
  process.exit(1);
}
