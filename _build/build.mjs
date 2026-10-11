/*
 * Build gói trò chơi dân gian thành bundle nhúng vào app Neutralino.
 *
 * VÌ SAO CẦN: gói gốc là React + TypeScript nhiều file, còn app đích chỉ nạp
 * được .js thường qua thẻ <script>. esbuild gộp React + component + luật chơi
 * vào MỘT file, và nhúng luôn ảnh (assets) dưới dạng data URI để không phải
 * quản lý đường dẫn ảnh riêng.
 *
 * Cũng gộp luôn 2 file CSS:
 *   - games.css      : theme gốc của gói (tự đóng gói trong .tet-games-theme)
 *   - games-extra.css: CSS bù cho các class Tailwind mà app JS thuần không có
 *
 * Chạy: node _build/build.mjs
 */

import { build } from 'esbuild';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');
const OUT_DIR = join(ROOT, 'native', 'resources', 'games');

mkdirSync(OUT_DIR, { recursive: true });

// ---- 1. Gộp JS ----
await build({
  entryPoints: [join(HERE, 'src', 'entry.tsx')],
  bundle: true,
  format: 'iife',
  target: 'chrome110',
  loader: { '.png': 'dataurl', '.jpg': 'dataurl' },
  define: { 'process.env.NODE_ENV': '"production"' },
  /*
   * QUAN TRỌNG: phải dùng jsx: 'automatic'.
   *
   * Gói gốc viết JSX kiểu cũ, esbuild mặc định biên dịch thành
   * React.createElement(...) nhưng KHÔNG tự thêm import React, nên bundle
   * chạy ra lỗi "React is not defined" (đã gặp và kiểm chứng).
   * Chế độ automatic sinh import từ 'react/jsx-runtime' nên không cần biến React.
   */
  jsx: 'automatic',
  minify: true,
  outfile: join(OUT_DIR, 'tet-games.js'),
  logLevel: 'info',
});

// ---- 2. Gộp CSS ----
const base = readFileSync(join(HERE, 'src', 'games.css'), 'utf8');
const extra = readFileSync(join(HERE, 'src', 'games-extra.css'), 'utf8');
writeFileSync(join(OUT_DIR, 'games.css'), base + '\n\n' + extra, 'utf8');

const kb = (p) => Math.round(readFileSync(p).length / 1024);
console.log('');
console.log('Da build vao native/resources/games/');
console.log('  tet-games.js  ' + kb(join(OUT_DIR, 'tet-games.js')) + ' KB');
console.log('  games.css     ' + kb(join(OUT_DIR, 'games.css')) + ' KB');
