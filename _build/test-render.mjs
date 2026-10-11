/*
 * Kiểm tra bundle trò chơi trong Node để tìm lỗi render.
 *
 * VÌ SAO CẦN: trong app, TetGames.mount() chạy nhưng React không render ra gì
 * (host rỗng). Lỗi có thể bị nuốt trong WebView nên khó thấy. Chạy bundle
 * trong Node với DOM giả sẽ in ra lỗi thật.
 *
 * Chạy: node _build/test-render.mjs
 */

import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const BUNDLE = join(HERE, '..', 'native', 'resources', 'games', 'tet-games.js');

const code = readFileSync(BUNDLE, 'utf8');
console.log('Bundle: ' + Math.round(code.length / 1024) + ' KB');

// Tạo môi trường DOM tối thiểu để React chạy được
const elements = new Map();

function makeEl(tag = 'div') {
  const el = {
    tagName: tag.toUpperCase(),
    children: [],
    style: {},
    dataset: {},
    attributes: {},
    classList: {
      _s: new Set(),
      add(...c) { c.forEach((x) => this._s.add(x)); },
      remove(...c) { c.forEach((x) => this._s.delete(x)); },
      toggle(c, on) { on ? this._s.add(c) : this._s.delete(c); },
      contains(c) { return this._s.has(c); },
    },
    textContent: '',
    innerHTML: '',
    nodeType: 1,
    appendChild(c) { this.children.push(c); return c; },
    removeChild(c) {
      this.children = this.children.filter((x) => x !== c);
      return c;
    },
    insertBefore(c) { this.children.unshift(c); return c; },
    setAttribute(k, v) { this.attributes[k] = v; },
    getAttribute(k) { return this.attributes[k]; },
    removeAttribute(k) { delete this.attributes[k]; },
    addEventListener() {},
    removeEventListener() {},
    getBoundingClientRect() { return { top: 0, left: 0, width: 720, height: 390, bottom: 390, right: 720 }; },
    get firstChild() { return this.children[0] || null; },
    get nextSibling() { return null; },
    contains() { return false; },
    focus() {},
    querySelector() { return null; },
    querySelectorAll() { return []; },
  };
  return el;
}

const documentStub = {
  createElement: makeEl,
  createElementNS: (_ns, tag) => makeEl(tag),
  createTextNode: (t) => ({ nodeType: 3, textContent: t }),
  createComment: (t) => ({ nodeType: 8, textContent: t }),
  documentElement: makeEl('html'),
  body: makeEl('body'),
  head: makeEl('head'),
  getElementById: (id) => elements.get(id) || null,
  querySelector: () => null,
  querySelectorAll: () => [],
  addEventListener() {},
  removeEventListener() {},
  hasFocus: () => true,
  activeElement: null,
};

const windowStub = {
  document: documentStub,
  navigator: { userAgent: 'node' },
  location: { search: '', href: 'http://localhost/' },
  devicePixelRatio: 1,
  innerWidth: 720,
  innerHeight: 390,
  addEventListener() {},
  removeEventListener() {},
  matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }),
  requestAnimationFrame: (cb) => setTimeout(() => cb(Date.now()), 16),
  cancelAnimationFrame: clearTimeout,
  setTimeout,
  clearTimeout,
  setInterval,
  clearInterval,
  AudioContext: function () {
    return {
      createOscillator: () => ({ connect() {}, start() {}, stop() {}, frequency: { value: 0 }, type: '' }),
      createGain: () => ({ connect() {}, gain: { setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {} } }),
      destination: {},
      currentTime: 0,
      close() {},
      state: 'running',
    };
  },
  WeakMap,
  WeakSet,
};

// Bắt lỗi
let caught = null;
const origError = console.error;
console.error = (...a) => {
  if (!caught) caught = a.map(String).join(' ');
  origError('[console.error]', ...a);
};

try {
  const fn = new Function('window', 'document', 'navigator', 'self', 'globalThis', 'process', code);
  fn(windowStub, documentStub, windowStub.navigator, windowStub, windowStub, { env: { NODE_ENV: 'production' } });
  console.log('Nạp bundle: OK');
} catch (e) {
  console.log('NẠP BUNDLE LỖI: ' + e.message);
  console.log(e.stack.split('\n').slice(0, 8).join('\n'));
  process.exit(1);
}

if (typeof windowStub.TetGames !== 'object' || !windowStub.TetGames) {
  console.log('KHÔNG có window.TetGames');
  process.exit(1);
}
console.log('Có window.TetGames: OK');
console.log('Kiểu mount: ' + typeof windowStub.TetGames.mount);

// Thử mount
const host = makeEl('div');
try {
  windowStub.TetGames.mount(host);
  console.log('Gọi mount: OK (không ném lỗi)');
} catch (e) {
  console.log('MOUNT LỖI: ' + e.message);
  console.log(e.stack.split('\n').slice(0, 10).join('\n'));
  process.exit(1);
}

// Chờ React render
await new Promise((r) => setTimeout(r, 1200));

console.log('Số con của host sau khi mount: ' + host.children.length);
if (caught) {
  console.log('');
  console.log('=== LỖI BẮT ĐƯỢC TỪ console.error ===');
  console.log(caught.slice(0, 900));
}
