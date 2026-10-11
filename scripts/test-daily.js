'use strict';
/*
 * Kiem tra tinh nang "loi chuc moi ngay":
 *   1. Cung ngay + cung nonce -> cung ket qua (on dinh trong ngay)
 *   2. Sang ngay moi -> loi chuc doi
 *   3. Dip dac biet quanh Tet duoc nhan dung
 *   4. Noi dung theo dip lay tu dung kho
 */

const { tetDate, convertSolar2Lunar } = require('../src/lunar.js');
const { WISHES, POEMS, OCCASIONS } = require('../src/wishes-data.js');

/* Sao chep dung logic trong main.js de kiem tra doc lap */
function hashSeed(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}
function pickFrom(arr, seed) {
  if (!arr || !arr.length) return null;
  return arr[seed % arr.length];
}

function occasionFor(date) {
  const [ld, lm] = convertSolar2Lunar(date.getDate(), date.getMonth() + 1, date.getFullYear(), 7);
  const tet = tetDate(2027);
  const dayMs = 86400000;
  const diff = Math.round(
    (new Date(date.getFullYear(), date.getMonth(), date.getDate()) -
      new Date(tet.getFullYear(), tet.getMonth(), tet.getDate())) /
      dayMs
  );
  if (lm === 12 && ld === 23) return 'ong-tao';
  if (diff === -1) return 'tat-nien';
  if (lm === 1 && ld === 1) return date.getHours() < 6 ? 'giao-thua' : 'mung-1';
  if (lm === 1 && ld === 2) return 'mung-2';
  if (lm === 1 && ld === 3) return 'mung-3';
  if (lm === 1 && ld === 4) return 'tien-ong-ba';
  if (lm === 1 && ld === 15) return 'ram';
  if (lm === 1 && ld >= 5 && ld <= 10) return 'dau-xuan';
  return null;
}

/** Mo phong ham get-daily trong main.js */
function daily(date, nonce = 0) {
  const occasion = occasionFor(date);
  const dayKey = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
  const seed = hashSeed(dayKey) + nonce * 7919;
  const pool = occasion ? OCCASIONS[occasion] : null;
  const useOccasionPool = !!pool && nonce % 4 !== 3;
  const wishPool = useOccasionPool ? pool.wishes : WISHES;
  const poemPool = useOccasionPool && pool.poems.length ? pool.poems : POEMS;
  const wish = pickFrom(wishPool, seed);
  const poem = pickFrom(poemPool, seed * 31 + 17);
  return {
    occasion,
    label: pool ? pool.label : '',
    wish: typeof wish === 'string' ? wish : wish.text,
    poem: poem.lines,
    wishFromOccasion: useOccasionPool || !pool ? null : false,
  };
}

let fails = 0;
const check = (label, ok, extra = '') => {
  if (!ok) fails++;
  console.log(`${ok ? 'OK  ' : 'FAIL'} ${label}${extra ? '  -> ' + extra : ''}`);
};

const pad = (n) => String(n).padStart(2, '0');

console.log('=== 1. On dinh trong cung mot ngay ===');
const d1 = new Date(2026, 9, 9, 14, 0, 0);
const runs = [];
for (let i = 0; i < 8; i++) runs.push(daily(d1).wish);
check('Goi 8 lan trong cung ngay, cung nonce -> 1 ket qua', new Set(runs).size === 1);
console.log('     noi dung:', runs[0].slice(0, 60));

// nonce khac -> phai khac
const variants = new Set();
for (let n = 0; n < 12; n++) variants.add(daily(d1, n).wish);
check('Bam "loi chuc khac" 12 lan -> nhieu cau khac nhau', variants.size >= 8, `${variants.size}/12 cau khac nhau`);

console.log('');
console.log('=== 2. Sang ngay moi thi doi loi chuc ===');
const days = [];
for (let i = 0; i < 30; i++) {
  const d = new Date(2026, 9, 1 + i, 12, 0, 0);
  days.push(daily(d).wish);
}
const uniqDays = new Set(days).size;
check('30 ngay lien tiep cho nhieu cau khac nhau', uniqDays >= 20, `${uniqDays}/30 ngay khac nhau`);
check('Khong phai moi ngay deu giong nhau', uniqDays > 1);

console.log('');
console.log('=== 3. Dip dac biet quanh Tet 2027 (06/02/2027) ===');
const expected = [
  ['30/01/2027', 'ong-tao'], // 23 thang Chap am lich
  ['05/02/2027', 'tat-nien'],
  ['06/02/2027', 'mung-1'],
  ['07/02/2027', 'mung-2'],
  ['08/02/2027', 'mung-3'],
  ['09/02/2027', 'tien-ong-ba'],
  ['20/02/2027', 'ram'],
];
for (const [ds, want] of expected) {
  const [dd, mm, yy] = ds.split('/').map(Number);
  const got = occasionFor(new Date(yy, mm - 1, dd, 12, 0, 0));
  check(`${ds} -> ${want}`, got === want, got ? `nhan duoc: ${got}` : 'khong nhan duoc dip');
}

// Giao thua: mung 1 luc 3 gio sang
const giaoThua = occasionFor(new Date(2027, 1, 6, 3, 0, 0));
check('06/02/2027 luc 3h sang -> giao-thua', giaoThua === 'giao-thua', `nhan duoc: ${giaoThua}`);

console.log('');
console.log('=== 4. Noi dung theo dip lay dung kho ===');
const occasionDates = {
  'ong-tao': new Date(2027, 0, 30, 12, 0, 0), // 23 thang Chap am lich
  'giao-thua': new Date(2027, 1, 6, 3, 0, 0),
  'mung-1': new Date(2027, 1, 6, 12, 0, 0),
  'ram': new Date(2027, 1, 20, 12, 0, 0),
};
for (const key of Object.keys(occasionDates)) {
  const o = OCCASIONS[key];
  // nonce 0,1,2 phai lay tu kho cua dip; nonce 3 lay tu kho chung
  let allFromOccasion = true;
  for (const n of [0, 1, 2]) {
    const d = daily(occasionDates[key], n);
    if (!o.wishes.includes(d.wish)) allFromOccasion = false;
  }
  check(`${key}: 3 loi chuc dau lay tu kho cua dip`, allFromOccasion);

  const d = daily(occasionDates[key], 0);
  check(`${key}: tho lay tu kho cua dip`, o.poems.some((p) => p.lines.join('|') === d.poem.join('|')));
  console.log(`     nhan: ${d.label}`);
  console.log(`     chuc: ${d.wish.slice(0, 58)}`);
  console.log(`     tho : ${d.poem[0]}`);
}

console.log('');
console.log('=== 5. Ngay thuong khong gan dip ===');
const normal = daily(new Date(2026, 9, 9, 12, 0, 0));
check('Ngay 09/10/2026 khong phai dip dac biet', normal.occasion === null, `nhan duoc: ${normal.occasion}`);

console.log('');
console.log('=== 6. Phan bo: moi cau chuc deu co co hoi xuat hien ===');
const seen = new Set();
for (let i = 0; i < 4000; i++) {
  const d = new Date(2026, 0, 1 + (i % 365), 12, 0, 0);
  seen.add(daily(d).wish);
}
check('Tren 4000 ngay khac nhau, so cau chuc duoc dung', seen.size > 60, `${seen.size} cau khac nhau duoc dung`);

console.log('');
console.log(fails === 0 ? '=== TAT CA DEU DAT ===' : `=== CO ${fails} MUC KHONG DAT ===`);
process.exit(fails === 0 ? 0 : 1);
