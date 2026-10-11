'use strict';
/*
 * Chèn bộ bắt lỗi HIỆN LÊN MÀN HÌNH vào index.html của bản Neutralino.
 *
 * VÌ SAO: neutralinojs.log chỉ ghi những gì ta chủ động gọi qua NL.debug.log.
 * Nếu script lỗi trước khi NL sẵn sàng, log trống và không biết vì sao.
 * Neutralino lại ghim tiêu đề cửa sổ theo config, nên không dùng document.title
 * để báo lỗi được.
 *
 * Cách làm: vẽ một ô đỏ ngay trên trang để chụp ảnh là đọc được.
 *
 * Chạy: node scripts/inject-error-catcher.js
 * Gỡ:   node scripts/inject-error-catcher.js --remove
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const HTML = path.join(ROOT, 'native', 'resources', 'index.html');
const remove = process.argv.includes('--remove');

let html = fs.readFileSync(HTML, 'utf8');

// Bỏ bộ bắt lỗi cũ nếu có
html = html.replace(/<!-- ERR-CATCHER -->[\s\S]*?<!-- \/ERR-CATCHER -->\s*/g, '');

if (remove) {
  fs.writeFileSync(HTML, html, 'utf8');
  console.log('Da go bo bat loi khoi ' + path.relative(ROOT, HTML));
  process.exit(0);
}

const catcher = `<!-- ERR-CATCHER -->
    <script>
      (function () {
        var box = null;
        function show(tag, msg) {
          try {
            if (!box) {
              box = document.createElement('div');
              box.id = '__errcatcher';
              box.style.cssText =
                'position:fixed;left:0;right:0;top:0;z-index:99999;background:#c00;color:#fff;' +
                'font:12px/1.4 monospace;padding:8px 10px;white-space:pre-wrap;max-height:60%;overflow:auto';
              (document.body || document.documentElement).appendChild(box);
            }
            box.textContent += '[' + tag + '] ' + msg + '\\n';
          } catch (e) {}
        }
        window.__errcatcher = show;
        window.addEventListener('error', function (e) {
          var where = e.filename ? e.filename.split('/').pop() : '?';
          show('LOI', (e.message || 'unknown') + ' @' + where + ':' + (e.lineno || 0));
        });
        window.addEventListener('unhandledrejection', function (e) {
          var r = e.reason;
          show('PROMISE', (r && (r.message || r)) || 'unknown');
        });
        window.__marks = [];
        window.__mark = function (name) {
          window.__marks.push(name);
        };
        // Bao khi trang da san sang
        window.addEventListener('DOMContentLoaded', function () {
          show('MOC', window.__marks.join(' > ') || '(khong script nao chay)');
          show('NL', typeof window.Neutralino + ' / ' + typeof window.NL);
        });
      })();
    </script>
    <!-- /ERR-CATCHER -->
`;

// Chèn ngay dau <body> de thay ngay khi co loi
html = html.replace(/(<body[^>]*>\s*)/i, `$1${catcher}`);

fs.writeFileSync(HTML, html, 'utf8');

console.log('Da chen bo bat loi vao ' + path.relative(ROOT, HTML));
console.log('  Loi se hien o o do tren cung man hinh.');
