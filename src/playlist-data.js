'use strict';
/*
 * Kho nhạc Tết — 3 album, tổng 42 bài.
 *
 * Mỗi album là MỘT file mix liền mạch, nên mỗi bài được đánh dấu bằng mốc
 * thời gian bắt đầu (giây, tính từ đầu file).
 *
 * Mốc thời gian do `scripts/detect-tracks.js` dò tự động bằng cách tìm
 * khoảng lặng giữa các bài (ffmpeg silencedetect).
 *
 * ĐÂY LÀ NGUỒN DỮ LIỆU DUY NHẤT: cả tiến trình chính (chọn bài ngẫu nhiên)
 * lẫn giao diện (hiển thị, chuyển bài) đều đọc từ đây.
 */

/* ------------------------------------------------------------------ */
/* Album 1: Tuyển tập nhạc Tết Bùi Công Nam (23 bài)                   */
/* ------------------------------------------------------------------ */

/* prettier-ignore */
const BUI_CONG_NAM = [
  { title: 'Năm Qua Đã Làm Gì',                     start: 0 },
  { title: 'Tết Này Con Sẽ Về',                     start: 238 },
  { title: 'Về Nhà Là Có Tết',                      start: 433 },
  { title: 'Cái Tết Giàu',                          start: 583 },
  { title: 'Tết Ổn Rồi',                            start: 814 },
  { title: 'Dấu Chân Đầu Tiên',                     start: 1072 },
  { title: 'Tết Nhà Là Tết Nhất',                   start: 1271 },
  { title: 'Ở Đâu Có Điểm Tựa, Ở Đó Có Tết',        start: 1482 },
  { title: 'Chúc Tết Bình An',                      start: 1711 },
  { title: 'Tự Giác Đi',                            start: 1885 },
  { title: 'Tự Nhiên Cái Tết',                      start: 2070 },
  { title: 'Về Chưa Con',                           start: 2258 },
  { title: 'Năm Qua Đã Làm Gì (Acoustic)',          start: 2459 },
  { title: 'Tết Vỗ Về',                             start: 2596 },
  { title: 'Tết Đỉnh Nóc',                          start: 2849 },
  { title: 'Điều Đơn Giản Quý Giá',                 start: 3086 },
  { title: 'Về Nhà Là Có Tết 2',                    start: 3297 },
  { title: 'Tết Nhà Là Vô Giá',                     start: 3487 },
  { title: 'Tết Mới Khởi Sắc',                      start: 3654 },
  { title: 'Tết Phiền Vẫn Iu',                      start: 3809 },
  { title: 'Kiên Trì Là Dì Thành Công',             start: 3954 },
  { title: 'Tết Này Con Lớn Rồi',                   start: 4190 },
  { title: 'Về Nhà Là Khỏe',                        start: 4388 },
];

/* ------------------------------------------------------------------ */
/* Album 2: Nhạc Xuân Chill 2027 (18 bài)                              */
/* Mốc dò tự động ở ngưỡng -25dB, khớp đúng 18 bài.                     */
/* ------------------------------------------------------------------ */

/* prettier-ignore */
const XUAN_CHILL = [
  { title: 'Ngày Xuân Long Phụng Sum Vầy',          start: 0 },
  { title: 'Tết Là Tết',                            start: 242 },
  { title: 'Chuyện Cũ Bỏ Qua',                      start: 502 },
  { title: 'Ngày Tết Quê Em',                       start: 773 },
  { title: 'Mùa Xuân Ơi',                           start: 1019 },
  { title: 'Tết Bình An',                           start: 1251 },
  { title: 'Ước Nguyện Đầu Xuân',                   start: 1509 },
  { title: 'Happy New Year',                        start: 1726 },
  { title: 'Đoản Xuân Ca',                          start: 1928 },
  { title: 'Phố Xuân',                              start: 2147 },
  { title: 'Lắng Nghe Mùa Xuân Về',                 start: 2351 },
  { title: 'Xuân Phát Tài',                         start: 2588 },
  { title: 'Chúc Tết',                              start: 2790 },
  { title: 'Hoa Cỏ Mùa Xuân',                       start: 3012 },
  { title: 'Thì Thầm Mùa Xuân',                     start: 3246 },
  { title: 'Tết Nguyên Đán',                        start: 3547 },
  { title: 'Nàng Xuân',                             start: 3810 },
  { title: 'Như Hoa Mùa Xuân',                      start: 4063 },
];

/* ------------------------------------------------------------------ */
/* Album 3: Playlist Nhạc Tết (7 bài)                                  */
/*                                                                     */
/* File này crossfade liền mạch nên chỉ dò được 7 mốc ở ngưỡng -20dB.  */
/* Cố tình KHÔNG chia đều cho đủ 9 tên, vì mốc sai sẽ làm bài bị cắt    */
/* giữa chừng — nghe khó chịu hơn là ít bài mà trọn vẹn.               */
/* ------------------------------------------------------------------ */

/* prettier-ignore */
const TET_PLAYLIST = [
  { title: 'Tết Đong Đầy',                          start: 0 },
  { title: 'Tết Đi Lên Cùng Nhau',                  start: 595 },
  { title: 'Tết Này Con Sẽ Về',                     start: 794 },
  { title: 'Đi Về Nhà',                             start: 868 },
  { title: 'Gieo Quẻ',                              start: 1100 },
  { title: 'Làm Gì Phải Hốt',                       start: 1186 },
  { title: 'Năm Qua Đã Làm Gì',                     start: 1716 },
];

/* ------------------------------------------------------------------ */
/* Gộp thành danh sách album                                           */
/* ------------------------------------------------------------------ */

const ALBUMS = [
  {
    id: 'bui-cong-nam',
    name: 'Tuyển tập Bùi Công Nam',
    file: 'tet-mix.opus',
    songs: BUI_CONG_NAM,
  },
  {
    id: 'xuan-chill',
    name: 'Nhạc Xuân Chill 2027',
    file: 'xuan-chill.opus',
    songs: XUAN_CHILL,
  },
  {
    id: 'tet-playlist',
    name: 'Playlist Nhạc Tết',
    file: 'tet-playlist.opus',
    songs: TET_PLAYLIST,
  },
];

/**
 * Danh sách phẳng tất cả bài, mỗi bài có kèm album.
 * Tiện cho việc chọn ngẫu nhiên và chuyển bài xuyên album.
 */
const SONGS = [];
for (const album of ALBUMS) {
  for (const s of album.songs) {
    SONGS.push({ ...s, albumId: album.id, albumName: album.name, file: album.file });
  }
}

module.exports = { ALBUMS, SONGS, BUI_CONG_NAM, XUAN_CHILL, TET_PLAYLIST };
