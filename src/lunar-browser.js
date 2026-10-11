'use strict';
/*
 * Âm lịch Việt Nam — thuật toán Hồ Ngọc Đức (đại học Leipzig).
 * Tính theo múi giờ Việt Nam (UTC+7) nên ngày Tết khớp lịch Việt Nam.
 *
 * BẢN TRÌNH DUYỆT (dùng cho Neutralino):
 *   Gắn vào window.TetLunar thay vì module.exports, vì trong WebView
 *   không có `module`. Bản CommonJS cho Electron nằm ở src/lunar.js.
 *
 * Hai bản phải cho KẾT QUẢ GIỐNG NHAU — kiểm tra bằng:
 *   node scripts/test-lunar.js        (bản CommonJS)
 *   node scripts/test-lunar-browser.js (bản trình duyệt)
 */

(function (global) {
  const PI = Math.PI;

  function jdFromDate(dd, mm, yy) {
    const a = Math.floor((14 - mm) / 12);
    const y = yy + 4800 - a;
    const m = mm + 12 * a - 3;
    let jd =
      dd +
      Math.floor((153 * m + 2) / 5) +
      365 * y +
      Math.floor(y / 4) -
      Math.floor(y / 100) +
      Math.floor(y / 400) -
      32045;
    if (jd < 2299161) {
      jd = dd + Math.floor((153 * m + 2) / 5) + 365 * y + Math.floor(y / 4) - 32083;
    }
    return jd;
  }

  function jdToDate(jd) {
    let a, b, c, d, e, m, day, month, year;
    if (jd > 2299160) {
      a = jd + 32044;
      b = Math.floor((4 * a + 3) / 146097);
      c = a - Math.floor((b * 146097) / 4);
    } else {
      b = 0;
      c = jd + 32082;
    }
    d = Math.floor((4 * c + 3) / 1461);
    e = c - Math.floor((1461 * d) / 4);
    m = Math.floor((5 * e + 2) / 153);
    day = e - Math.floor((153 * m + 2) / 5) + 1;
    month = m + 3 - 12 * Math.floor(m / 10);
    year = b * 100 + d - 4800 + Math.floor(m / 10);
    return [day, month, year];
  }

  function NewMoon(k) {
    const T = k / 1236.85;
    const T2 = T * T;
    const T3 = T2 * T;
    const dr = PI / 180;

    let Jd1 = 2415020.75933 + 29.53058868 * k + 0.0001178 * T2 - 0.000000155 * T3;
    Jd1 = Jd1 + 0.00033 * Math.sin((166.56 + 132.87 * T - 0.009173 * T2) * dr);

    const M = 359.2242 + 29.10535608 * k - 0.0000333 * T2 - 0.00000347 * T3;
    const Mpr = 306.0253 + 385.81691806 * k + 0.0107306 * T2 + 0.00001236 * T3;
    const F = 21.2964 + 390.67050646 * k - 0.0016528 * T2 - 0.00000239 * T3;

    let C1 = (0.1734 - 0.000393 * T) * Math.sin(M * dr) + 0.0021 * Math.sin(2 * dr * M);
    C1 = C1 - 0.4068 * Math.sin(Mpr * dr) + 0.0161 * Math.sin(dr * 2 * Mpr);
    C1 = C1 - 0.0004 * Math.sin(dr * 3 * Mpr);
    C1 = C1 + 0.0104 * Math.sin(dr * 2 * F) - 0.0051 * Math.sin(dr * (M + Mpr));
    C1 = C1 - 0.0074 * Math.sin(dr * (M - Mpr)) + 0.0004 * Math.sin(dr * (2 * F + M));
    C1 = C1 - 0.0004 * Math.sin(dr * (2 * F - M)) - 0.0006 * Math.sin(dr * (2 * F + Mpr));
    C1 = C1 + 0.0010 * Math.sin(dr * (2 * F - Mpr)) + 0.0005 * Math.sin(dr * (2 * Mpr + M));

    let deltat;
    if (T < -11) {
      deltat = 0.001 + 0.000839 * T + 0.0002261 * T2 - 0.00000845 * T3 - 0.000000081 * T * T3;
    } else {
      deltat = -0.000278 + 0.000265 * T + 0.000262 * T2;
    }

    return Jd1 + C1 - deltat;
  }

  function SunLongitude(jdn) {
    const T = (jdn - 2451545.0) / 36525;
    const T2 = T * T;
    const dr = PI / 180;
    const M = 357.5291 + 35999.0503 * T - 0.0001559 * T2 - 0.00000048 * T * T2;
    const L0 = 280.46645 + 36000.76983 * T + 0.0003032 * T2;

    let DL = (1.9146 - 0.004817 * T - 0.000014 * T2) * Math.sin(dr * M);
    DL = DL + (0.019993 - 0.000101 * T) * Math.sin(dr * 2 * M) + 0.00029 * Math.sin(dr * 3 * M);

    let L = (L0 + DL) * dr;
    L = L - PI * 2 * Math.floor(L / (PI * 2));
    return L;
  }

  function getSunLongitude(dayNumber, timeZone) {
    return Math.floor((SunLongitude(dayNumber - 0.5 - timeZone / 24) / PI) * 6);
  }

  function getNewMoonDay(k, timeZone) {
    return Math.floor(NewMoon(k) + 0.5 + timeZone / 24);
  }

  function getLunarMonth11(yy, timeZone) {
    const off = jdFromDate(31, 12, yy) - 2415021;
    const k = Math.floor(off / 29.530588853);
    let nm = getNewMoonDay(k, timeZone);
    const sunLong = getSunLongitude(nm, timeZone);
    if (sunLong >= 9) nm = getNewMoonDay(k - 1, timeZone);
    return nm;
  }

  function getLeapMonthOffset(a11, timeZone) {
    const k = Math.floor((a11 - 2415021.076998695) / 29.530588853 + 0.5);
    let last = 0;
    let i = 1;
    let arc = getSunLongitude(getNewMoonDay(k + i, timeZone), timeZone);
    do {
      last = arc;
      i++;
      arc = getSunLongitude(getNewMoonDay(k + i, timeZone), timeZone);
    } while (arc !== last && i < 14);
    return i - 1;
  }

  function convertSolar2Lunar(dd, mm, yy, timeZone) {
    const dayNumber = jdFromDate(dd, mm, yy);
    const k = Math.floor((dayNumber - 2415021.076998695) / 29.530588853);
    let monthStart = getNewMoonDay(k + 1, timeZone);
    if (monthStart > dayNumber) monthStart = getNewMoonDay(k, timeZone);

    let a11 = getLunarMonth11(yy, timeZone);
    let b11 = a11;
    let lunarYear;

    if (a11 >= monthStart) {
      lunarYear = yy;
      a11 = getLunarMonth11(yy - 1, timeZone);
    } else {
      lunarYear = yy + 1;
      b11 = getLunarMonth11(yy + 1, timeZone);
    }

    const lunarDay = dayNumber - monthStart + 1;
    const diff = Math.floor((monthStart - a11) / 29);
    let lunarLeap = 0;
    let lunarMonth = diff + 11;

    if (b11 - a11 > 365) {
      const leapMonthDiff = getLeapMonthOffset(a11, timeZone);
      if (diff >= leapMonthDiff) {
        lunarMonth = diff + 10;
        if (diff === leapMonthDiff) lunarLeap = 1;
      }
    }

    if (lunarMonth > 12) lunarMonth -= 12;
    if (lunarMonth >= 11 && diff < 4) lunarYear -= 1;

    return [lunarDay, lunarMonth, lunarYear, lunarLeap];
  }

  /** Múi giờ Việt Nam */
  const TZ_VN = 7;

  /** Tìm ngày mồng 1 tháng Giêng (Tết) của năm âm lịch `year`. */
  function tetDate(year) {
    for (let d = 1; d <= 70; d++) {
      const jd = jdFromDate(1, 1, year) + d;
      const [dd, mm, yy] = jdToDate(jd);
      const [ld, lm, ly, leap] = convertSolar2Lunar(dd, mm, yy, TZ_VN);
      if (ld === 1 && lm === 1 && ly === year && leap === 0) {
        return new Date(yy, mm - 1, dd, 0, 0, 0, 0);
      }
    }
    return null;
  }

  const CAN = ['Giáp', 'Ất', 'Bính', 'Đinh', 'Mậu', 'Kỷ', 'Canh', 'Tân', 'Nhâm', 'Quý'];
  const CHI = ['Tý', 'Sửu', 'Dần', 'Mão', 'Thìn', 'Tỵ', 'Ngọ', 'Mùi', 'Thân', 'Dậu', 'Tuất', 'Hợi'];

  /** Can Chi của năm âm lịch, ví dụ 2027 -> "Đinh Mùi". */
  function canChi(year) {
    return `${CAN[(year + 6) % 10]} ${CHI[(year + 8) % 12]}`;
  }

  /** Con giáp (linh vật) của năm âm lịch. */
  function zodiac(year) {
    return CHI[(year + 8) % 12];
  }

  /**
   * Tìm ngày dương lịch ứng với (tháng âm, ngày âm) gần một mốc.
   * Duyệt ±`span` ngày quanh `baseDate`.
   */
  function findLunarDay(baseDate, lunarMonth, lunarDay, span) {
    for (let off = -span; off <= span; off++) {
      const d = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate() + off);
      const [ld, lm, , leap] = convertSolar2Lunar(
        d.getDate(),
        d.getMonth() + 1,
        d.getFullYear(),
        TZ_VN
      );
      if (ld === lunarDay && lm === lunarMonth && !leap) return d;
    }
    return null;
  }

  /**
   * Các mốc lễ Tết quanh năm `tetYear`, tính theo âm lịch.
   * Trả về [{ date, label, short, lunar }] đã sắp xếp theo ngày.
   */
  function tetMarks(tetYear) {
    const tet = tetDate(tetYear);
    if (!tet) return [];
    const marks = [];
    const day = 86400000;

    // Ông Công Ông Táo: 23 tháng Chạp
    const ongTao = findLunarDay(new Date(tet.getTime() - 7 * day), 12, 23, 12);
    if (ongTao) {
      marks.push({
        date: ongTao,
        label: 'Ông Công Ông Táo',
        short: 'Ông Táo',
        lunar: '23 tháng Chạp',
      });
    }

    // Tất niên: ngày cuối năm âm lịch
    marks.push({
      date: new Date(tet.getTime() - day),
      label: 'Tất niên',
      short: 'Tất niên',
      lunar: '29 tháng Chạp',
    });

    // Mùng 1 đến mùng 4
    const days = [
      ['Mùng 1 Tết', 'Mùng 1', 'Mùng 1 tháng Giêng'],
      ['Mùng 2 Tết', 'Mùng 2', 'Mùng 2 tháng Giêng'],
      ['Mùng 3 Tết', 'Mùng 3', 'Mùng 3 tháng Giêng'],
      ['Lễ tạ, tiễn ông bà', 'Lễ tạ', 'Mùng 4 tháng Giêng'],
    ];
    days.forEach(([label, short, lunar], i) => {
      marks.push({ date: new Date(tet.getTime() + i * day), label, short, lunar });
    });

    // Rằm tháng Giêng
    const ram = findLunarDay(new Date(tet.getTime() + 14 * day), 1, 15, 10);
    if (ram) {
      marks.push({ date: ram, label: 'Rằm tháng Giêng', short: 'Rằm', lunar: '15 tháng Giêng' });
    }

    marks.sort((a, b) => a.date - b.date);
    return marks;
  }

  /**
   * Dịp đặc biệt của một ngày (dùng cho lời chúc).
   * Trả về khoá dịp hoặc null.
   */
  function occasionFor(date, tetYear) {
    const tet = tetDate(tetYear);
    if (!tet) return null;

    const [ld, lm] = convertSolar2Lunar(
      date.getDate(),
      date.getMonth() + 1,
      date.getFullYear(),
      TZ_VN
    );

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

  global.TetLunar = {
    TZ_VN,
    jdFromDate,
    jdToDate,
    convertSolar2Lunar,
    tetDate,
    canChi,
    zodiac,
    tetMarks,
    occasionFor,
  };
})(typeof window !== 'undefined' ? window : globalThis);
