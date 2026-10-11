'use strict';
/*
 * Dò mốc thời gian từng bài trong file mix liền mạch.
 *
 * Cách làm: dùng ffmpeg silencedetect để tìm khoảng lặng. Mix EDM thường
 * crossfade nên không phải bài nào cũng có khoảng lặng — script in ra
 * tất cả mốc tìm được để người dùng đối chiếu với danh sách bài.
 *
 * Chạy: node scripts/detect-tracks.js "<duong-dan-file>" [nguong-dB]
 */

const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const FFMPEG = 'D:\\_ff\\ffmpeg.exe';
const file = process.argv[2];
const noise = process.argv[3] || '-32dB';

if (!file) {
  console.error('Thieu duong dan file. Vi du:');
  console.error('  node scripts/detect-tracks.js "D:\\nhac.mp3"');
  process.exit(1);
}
if (!fs.existsSync(file)) {
  console.error('Khong thay file: ' + file);
  process.exit(1);
}
if (!fs.existsSync(FFMPEG)) {
  console.error('Khong thay ffmpeg tai ' + FFMPEG);
  process.exit(1);
}

const mmss = (s) => {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toFixed(1).padStart(4, '0')}`;
};

/**
 * Chạy ffmpeg và lấy toàn bộ thông tin.
 *
 * ffmpeg ghi thông tin ra stderr và trả mã khác 0 khi chỉ phân tích
 * (-f null), nên không thể dùng execFileSync bắt stderr trực tiếp.
 * Cách chắc chắn: chuyển hướng stderr ra file tạm rồi đọc lại.
 */
function runFfmpeg(args) {
  const tmp = path.join(require('os').tmpdir(), `ff-${Date.now()}.txt`);
  const fd = fs.openSync(tmp, 'w');
  try {
    // Cho ffmpeg ghi thang stderr vao file qua file descriptor cua Node.
    // Khong dung "2>" cua cmd vi de bi loi khi duong dan co dau tieng Viet.
    execFileSync(FFMPEG, args, { stdio: ['ignore', 'ignore', fd] });
  } catch {
    /* ffmpeg tra ma khac 0 khi chi phan tich (-f null) la binh thuong */
  } finally {
    fs.closeSync(fd);
  }
  const text = fs.existsSync(tmp) ? fs.readFileSync(tmp, 'utf8') : '';
  try {
    fs.unlinkSync(tmp);
  } catch {
    /* bỏ qua */
  }
  return text;
}

console.log('File  : ' + path.basename(file));
console.log('Nguong: ' + noise);
console.log('Dang do...\n');

const out = runFfmpeg(['-i', file, '-af', `silencedetect=noise=${noise}:d=0.6`, '-f', 'null', '-']);

// Lay thoi luong
const durMatch = out.match(/Duration:\s*(\d+):(\d+):([\d.]+)/);
const duration = durMatch
  ? Number(durMatch[1]) * 3600 + Number(durMatch[2]) * 60 + Number(durMatch[3])
  : 0;

// Lay cac moc ket thuc khoang lang (do la luc bai moi bat dau)
const ends = [];
const starts = [];
for (const line of out.split('\n')) {
  let m = line.match(/silence_start:\s*([\d.]+)/);
  if (m) starts.push(Number(m[1]));
  m = line.match(/silence_end:\s*([\d.]+)/);
  if (m) ends.push(Number(m[1]));
}

console.log(`Thoi luong: ${mmss(duration)} (${duration.toFixed(1)}s)`);
console.log(`So khoang lang: ${starts.length}\n`);

if (!ends.length) {
  console.log('Khong tim thay khoang lang nao. File co the crossfade lien tuc.');
  console.log('Thu nguong khac, vi du: -26dB hoac -38dB');
  process.exit(0);
}

console.log('Moc bat dau bai (sau moi khoang lang):');
console.log('   #   giay      mm:ss');
console.log('----+---------+---------');
// Bai 1 luon bat dau o 0
console.log('   1' + String(0).padStart(10) + '  ' + mmss(0).padStart(8));
ends.forEach((t, i) => {
  console.log(
    String(i + 2).padStart(4) + String(t.toFixed(1)).padStart(10) + '  ' + mmss(t).padStart(8)
  );
});

console.log('\nDang mang de dan vao src/playlist-data.js:');
const starts2 = [0, ...ends.map((t) => Math.round(t))];
console.log('[' + starts2.join(', ') + ']');
