'use strict';
const { tetDate, canChi, zodiac } = require('../src/lunar.js');

const known = {
  2020: '2020-01-25',
  2021: '2021-02-12',
  2022: '2022-02-01',
  2023: '2023-01-22',
  2024: '2024-02-10',
  2025: '2025-01-29',
  2026: '2026-02-17',
};

let fails = 0;
console.log('Nam | Tinh ra    | Mong doi   | Can Chi      | Khop');
console.log('----+------------+------------+--------------+-----');
for (const y of Object.keys(known).map(Number)) {
  const d = tetDate(y);
  const got = d
    ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    : 'null';
  const ok = got === known[y];
  if (!ok) fails++;
  console.log(
    `${y} | ${got} | ${known[y]} | ${canChi(y).padEnd(12)} | ${ok ? 'OK' : 'SAI'}`
  );
}

console.log('');
for (const y of [2027, 2028, 2029, 2030]) {
  const d = tetDate(y);
  const s = d
    ? `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
    : 'null';
  console.log(`Tet ${y}: ${s}  -  ${canChi(y)} (${zodiac(y)})`);
}

console.log('');
console.log(fails === 0 ? 'TAT CA NAM DA BIET DEU KHOP' : `CO ${fails} NAM SAI`);
process.exit(fails === 0 ? 0 : 1);
