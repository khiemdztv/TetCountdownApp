'use strict';

const {
  app,
  BrowserWindow,
  Tray,
  Menu,
  ipcMain,
  shell,
  nativeImage,
} = require('electron');
const path = require('path');
const fs = require('fs');
const { pathToFileURL } = require('url');

const { tetDate, canChi, zodiac, convertSolar2Lunar } = require('./src/lunar.js');
const autostart = require('./src/autostart.js');
const { SONGS } = require('./src/playlist-data.js');
const { WISHES, POEMS, OCCASIONS } = require('./src/wishes-data.js');

const TET_YEAR = 2027;
const TET_DATE = tetDate(TET_YEAR);

/* ------------------------------------------------------------------ */
/* Tuy chon nguoi dung (luu trong userData)                            */
/* ------------------------------------------------------------------ */

const DEFAULTS = {
  autoStart: true, // tu khoi dong cung Windows (bat san tu lan dau)
  fireworks: true, // hieu ung phao hoa
  blossoms: true, // hoa mai + hoa dao roi
  motion: true, // hieu ung chuyen dong noi chung
};

let settings = { ...DEFAULTS };
let settingsPath = null;
let firstRun = false;

function loadSettings() {
  settingsPath = path.join(app.getPath('userData'), 'settings.json');
  try {
    const raw = fs.readFileSync(settingsPath, 'utf8');
    const saved = JSON.parse(raw);
    // Tuong thich voi ban cu: 'petals' doi ten thanh 'blossoms', bo 'sound'
    if (saved.petals !== undefined && saved.blossoms === undefined) {
      saved.blossoms = saved.petals;
    }
    settings = { ...DEFAULTS, ...saved };
    firstRun = false;
  } catch {
    // Chua co file cai dat -> day la lan chay dau tien
    settings = { ...DEFAULTS };
    firstRun = true;
  }
}

function saveSettings() {
  try {
    fs.mkdirSync(path.dirname(settingsPath), { recursive: true });
    // Chi ghi cac tuy chon that su con dung
    const clean = {
      autoStart: !!settings.autoStart,
      fireworks: !!settings.fireworks,
      blossoms: !!settings.blossoms,
      motion: !!settings.motion,
    };
    fs.writeFileSync(settingsPath, JSON.stringify(clean, null, 2), 'utf8');
  } catch (err) {
    console.error('Khong luu duoc cai dat:', err.message);
  }
}

/* ------------------------------------------------------------------ */
/* Dip dac biet theo am lich                                           */
/* ------------------------------------------------------------------ */

/**
 * Xac dinh dip dac biet cua mot ngay, dua tren am lich Viet Nam.
 * Tra ve null neu la ngay thuong.
 */
function occasionForSolar(date) {
  const [ld, lm, ly] = convertSolar2Lunar(
    date.getDate(),
    date.getMonth() + 1,
    date.getFullYear(),
    7
  );

  const tet = TET_DATE;
  const dayMs = 86400000;
  const diffDays = Math.round(
    (new Date(date.getFullYear(), date.getMonth(), date.getDate()) -
      new Date(tet.getFullYear(), tet.getMonth(), tet.getDate())) /
      dayMs
  );

  // 23 thang Chap: le Ong Cong Ong Tao
  if (lm === 12 && ld === 23) return 'ong-tao';

  // Ngay cuoi cung cua nam am lich: Tat nien
  if (diffDays === -1) return 'tat-nien';

  // Mung 1 Tet: nua dem va rang sang la giao thua, sau do la mung 1
  if (lm === 1 && ld === 1) {
    return date.getHours() < 6 ? 'giao-thua' : 'mung-1';
  }
  if (lm === 1 && ld === 2) return 'mung-2';
  if (lm === 1 && ld === 3) return 'mung-3';
  // Mung 4: le ta, tien ong ba
  if (lm === 1 && ld === 4) return 'tien-ong-ba';
  // Ram thang Gieng
  if (lm === 1 && ld === 15) return 'ram';
  // Muoi ngay dau xuan
  if (lm === 1 && ld >= 5 && ld <= 10) return 'dau-xuan';

  return null;
}

/* ------------------------------------------------------------------ */
/* Tu khoi dong cung Windows                                           */
/* ------------------------------------------------------------------ */

function applyAutoStart(enabled) {
  if (process.platform !== 'win32') return;

  try {
    if (!enabled) {
      autostart.uninstall(app.getPath('appData'));
      return;
    }

    // Khi da dong goi: chay file .exe. Khi chay dev: electron + thu muc du an.
    const result = autostart.install({
      appDataDir: app.getPath('appData'),
      targetPath: process.execPath,
      args: app.isPackaged ? '' : `"${app.getAppPath()}"`,
      workingDir: app.isPackaged ? path.dirname(process.execPath) : app.getAppPath(),
      iconPath: app.isPackaged
        ? path.join(process.resourcesPath, 'icon.ico')
        : path.join(app.getAppPath(), 'assets', 'icon.ico'),
    });

    if (!result.ok) {
      console.error('Khong dat duoc tu khoi dong:', result.reason);
    }
  } catch (err) {
    console.error('Khong dat duoc tu khoi dong:', err.message);
  }
}

function isAutoStartInstalled() {
  if (process.platform !== 'win32') return false;
  return autostart.isInstalled(app.getPath('appData'));
}

/* ------------------------------------------------------------------ */
/* Nhac Tet                                                            */
/* ------------------------------------------------------------------ */

let bootSongIndex = 0; // Bai hat duoc chon cho phien chay nay

/** Tim file nhac Tet: trong assets/music (ban dong goi hoac ban dev). */
function musicFilePath() {
  const candidates = [
    // Ban dong goi: resources/assets/music
    path.join(process.resourcesPath || '', 'assets', 'music', 'tet-mix.mp3'),
    // Ban dev: <du an>/assets/music
    path.join(__dirname, 'assets', 'music', 'tet-mix.mp3'),
  ];
  for (const c of candidates) {
    if (c && fs.existsSync(c)) return c;
  }
  return candidates[candidates.length - 1];
}

/** Chon ngau nhien bai hat bat dau cho phien chay nay. */
function pickBootSong(totalSongs) {
  bootSongIndex = Math.floor(Math.random() * Math.max(1, totalSongs));
  return bootSongIndex;
}

/** Bam mot chuoi thanh so nguyen (seed), dung cho viec chon ngau nhien on dinh. */
function hashSeed(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

/** Chon phan tu theo seed (on dinh, khong doi giua cac lan goi). */
function pickFrom(arr, seed) {
  if (!arr || !arr.length) return null;
  return arr[seed % arr.length];
}

/**
 * Cac moc le Tet quanh nam TET_YEAR, tinh theo am lich.
 * Moi muc: { iso, label, short, lunar }
 *   - iso   : ngay duong lich (ISO)
 *   - label : ten day du
 *   - short : nhan ngan de hien tren o lich
 *   - lunar : mo ta ngay am lich
 */
function tetMarks() {
  const marks = [];
  const tet = TET_DATE;
  const day = 86400000;

  // Ngay le Ong Cong Ong Tao: 23 thang Chap nam truoc
  const ongTao = findLunarDay(tet.getFullYear(), 12, 23, -60);
  if (ongTao) {
    marks.push({
      iso: ongTao.toISOString(),
      label: 'Ông Công Ông Táo',
      short: 'Ông Táo',
      lunar: '23 tháng Chạp',
    });
  }

  // Tat nien: ngay cuoi nam am lich
  const tatNien = new Date(tet.getTime() - day);
  marks.push({
    iso: tatNien.toISOString(),
    label: 'Tất niên',
    short: 'Tất niên',
    lunar: '29 tháng Chạp',
  });

  // Mung 1 den mung 4
  const tetDays = [
    ['Mùng 1 Tết', 'Mùng 1', 'Mùng 1 tháng Giêng'],
    ['Mùng 2 Tết', 'Mùng 2', 'Mùng 2 tháng Giêng'],
    ['Mùng 3 Tết', 'Mùng 3', 'Mùng 3 tháng Giêng'],
    ['Lễ tạ, tiễn ông bà', 'Lễ tạ', 'Mùng 4 tháng Giêng'],
  ];
  tetDays.forEach(([label, short, lunar], i) => {
    marks.push({
      iso: new Date(tet.getTime() + i * day).toISOString(),
      label,
      short,
      lunar,
    });
  });

  // Ram thang Gieng: 15 thang Gieng
  const ram = findLunarDay(tet.getFullYear(), 1, 15, 30);
  if (ram) {
    marks.push({
      iso: ram.toISOString(),
      label: 'Rằm tháng Giêng',
      short: 'Rằm',
      lunar: '15 tháng Giêng',
    });
  }

  // Sap xep theo ngay
  marks.sort((a, b) => new Date(a.iso) - new Date(b.iso));
  return marks;
}

/**
 * Tim ngay duong lich ung voi (thang am, ngay am) gan mot moc duong lich.
 * Duyet quanh `nearOffsetDays` ngay ke tu Tet de tim cho khop.
 */
function findLunarDay(lunarYear, lunarMonth, lunarDay, nearOffsetDays) {
  const base = new Date(TET_DATE.getTime() + nearOffsetDays * 86400000);
  for (let off = -40; off <= 40; off++) {
    const d = new Date(base.getTime() + off * 86400000);
    const [ld, lm, ly, leap] = convertSolar2Lunar(d.getDate(), d.getMonth() + 1, d.getFullYear(), 7);
    if (ld === lunarDay && lm === lunarMonth && ly === lunarYear && !leap) return d;
  }
  return null;
}

/* ------------------------------------------------------------------ */
/* Cua so                                                              */
/* ------------------------------------------------------------------ */

let mainWindow = null;
let tray = null;
let isQuitting = false;

function createWindow() {
  // Chi khi phat trien: cho phep dat kich thuoc cua so qua bien moi truong
  //
  // Thiet ke quy dinh khung app la 720x490, va .workspace co padding 16px
  // moi ben -> cua so can 752x522 de khung dat dung kich thuoc.
  // useContentSize: true de width/height tinh theo vung noi dung (khong tinh vien).
  let w = 752;
  let h = 522;
  if (!app.isPackaged && process.env.TET_WIN_SIZE) {
    const [sw, sh] = process.env.TET_WIN_SIZE.split(',').map(Number);
    if (sw > 0 && sh > 0) {
      w = sw;
      h = sh;
    }
  }

  mainWindow = new BrowserWindow({
    width: w,
    height: h,
    useContentSize: true,
    minWidth: 660,
    minHeight: 500,
    show: false,
    backgroundColor: '#2a0808',
    title: 'Đếm ngược Tết Nguyên Đán 2027',
    icon: path.join(__dirname, 'assets', 'icon.ico'),
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      backgroundThrottling: false,
      // Cho phep nhac tu phat khi mo app, khong doi nguoi dung bam
      autoplayPolicy: 'no-user-gesture-required',
    },
  });

  Menu.setApplicationMenu(null);
  mainWindow.loadFile(path.join(__dirname, 'src', 'index.html'));

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Che do chup anh tu dong de kiem tra giao dien (dung khi phat trien)
  if (process.env.TET_SHOT) {
    mainWindow.webContents.on('console-message', (_e, level, message, line, sourceId) => {
      console.log(`RENDERER[${level}] ${message} (${sourceId}:${line})`);
    });
    mainWindow.webContents.on('render-process-gone', (_e, details) => {
      console.log('RENDERER_GONE ' + JSON.stringify(details));
    });
    mainWindow.webContents.once('did-finish-load', () => {
      setTimeout(async () => {
        try {
          // Cho phep bam nut / chay JS truoc khi chup anh (dung khi phat trien)
          if (process.env.TET_SHOT_JS) {
            const r = await mainWindow.webContents.executeJavaScript(process.env.TET_SHOT_JS);
            console.log('SHOT_JS_RESULT ' + (typeof r === 'string' ? r : JSON.stringify(r)));
            await new Promise((res) => setTimeout(res, Number(process.env.TET_SHOT_WAIT || 1800)));
            if (process.env.TET_SHOT_JS2) {
              const r2 = await mainWindow.webContents.executeJavaScript(process.env.TET_SHOT_JS2);
              console.log('SHOT_JS2_RESULT ' + (typeof r2 === 'string' ? r2 : JSON.stringify(r2)));
            }
          }
          // Che do chup nhieu anh theo kich ban (dung khi phat trien)
          if (process.env.TET_SHOT_SERIES) {
            await captureSeries(process.env.TET_SHOT_SERIES);
          }
          const probe = await mainWindow.webContents.executeJavaScript(
            `JSON.stringify({
               days: document.getElementById('days')?.textContent,
               hours: document.getElementById('hours')?.textContent,
               minutes: document.getElementById('minutes')?.textContent,
               seconds: document.getElementById('seconds')?.textContent,
               canchi: document.getElementById('canchi')?.textContent,
               today: document.getElementById('today-text')?.textContent,
               percent: document.getElementById('progress-percent')?.textContent,
               lanterns: document.querySelectorAll('.lantern').length,
               lanternBodies: document.querySelectorAll('.lantern-body').length,
               lanternBodyBox: (() => { const b = document.querySelector('.lantern-body');
                 if (!b) return null; const r = b.getBoundingClientRect();
                 return Math.round(r.width) + 'x' + Math.round(r.height); })(),
               petalsCanvas: !!document.getElementById('petals'),
               fwCanvas: !!document.getElementById('fireworks'),
               fwParticles: (typeof Fireworks !== 'undefined') ? Fireworks.particles.length : -1,
               petalCount: (typeof Petals !== 'undefined') ? Petals.items.length : -1,
               soundReady: (typeof sound !== 'undefined') ? sound.ready : 'n/a',
               soundHasAudio: (typeof sound !== 'undefined') ? !!sound.audio : 'n/a',
               celebrateShown: !document.getElementById('celebrate')?.hidden,
               countdownShown: !document.getElementById('countdown')?.hidden,
               api: typeof window.tetAPI,
               version: document.getElementById('app-version')?.textContent
             })`
          );
          console.log('PROBE ' + probe);
          let rect;
          if (process.env.TET_SHOT_RECT) {
            const [x, y, w, h] = process.env.TET_SHOT_RECT.split(',').map(Number);
            rect = { x, y, width: w, height: h };
          }
          const img = await mainWindow.webContents.capturePage(rect);
          require('fs').writeFileSync(process.env.TET_SHOT, img.toPNG());
          console.log('SHOT_SAVED ' + process.env.TET_SHOT);
        } catch (err) {
          console.error('SHOT_FAIL ' + err.message);
        }
        setTimeout(() => {
          isQuitting = true;
          app.quit();
        }, 300);
      }, Number(process.env.TET_SHOT_DELAY || 4200));
    });
  }

  // Dong cua so = thu nho xuong khay he thong (app van dem nguoc)
  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Mo link ngoai bang trinh duyet, khong mo trong app
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//i.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
}

function showWindow() {
  if (!mainWindow) {
    createWindow();
    return;
  }
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.show();
  mainWindow.focus();
}

/* ------------------------------------------------------------------ */
/* Che do chup anh theo kich ban (chi dung khi phat trien)             */
/* ------------------------------------------------------------------ */

/**
 * Chup mot loat anh o nhieu trang thai giao dien khac nhau.
 * Dung de kiem tra giao dien bang mat ma khong phai ngoi bam tay.
 */
async function captureSeries(outDir) {
  const fsx = require('fs');
  const pathx = require('path');
  fsx.mkdirSync(outDir, { recursive: true });

  const cases = [
    { name: '01-trang-chinh', js: null, wait: 2600 },
    { name: '02-danh-sach-phat', js: "document.getElementById('btn-list').click()", wait: 1300 },
    { name: '03-loi-chuc-khac', js: "document.getElementById('btn-daily-next').click()", wait: 1300 },
    {
      name: '04-chuc-mung-nam-moi',
      js: `TET = new Date(Date.now() - 60000); celebrated = false; updateCountdown();
           JSON.stringify({ hien: !document.getElementById('celebrate').hidden })`,
      wait: 2600,
    },
    {
      name: '05-cua-so-nho',
      js: `celebrated = true; document.getElementById('celebrate').hidden = true;
           document.getElementById('countdown').hidden = false;
           document.getElementById('progress-wrap').hidden = false; null`,
      wait: 1600,
      size: [800, 580],
    },
    {
      name: '06-tam-dung-nhac',
      js: `document.getElementById('btn-play').click();
           JSON.stringify({ dang_phat: !Music.el.paused })`,
      wait: 1300,
    },
  ];

  for (const c of cases) {
    if (c.size) {
      mainWindow.setSize(c.size[0], c.size[1]);
      await new Promise((r) => setTimeout(r, 900));
    }

    let extra = '';
    if (c.js) {
      try {
        const r = await mainWindow.webContents.executeJavaScript(c.js);
        if (r) extra = ' | ' + String(r);
      } catch (err) {
        extra = ' | LOI: ' + err.message;
      }
    }

    await new Promise((r) => setTimeout(r, c.wait));

    const img = await mainWindow.webContents.capturePage();
    fsx.writeFileSync(pathx.join(outDir, `${c.name}.png`), img.toPNG());
    console.log(`CHUP ${c.name}${extra}`);
  }

  // Bao cao trang thai cuoi
  const state = await mainWindow.webContents.executeJavaScript(
    `JSON.stringify({
       bai: document.getElementById('pl-title').textContent,
       dang_phat: !Music.el.paused,
       so_bai: Music.songs.length,
       hoa_tong: Blossoms.items.length,
       hoa_dao: Blossoms.items.filter(x => !x.isMai).length,
       hoa_mai: Blossoms.items.filter(x => x.isMai).length,
       phao_hoa: Fireworks.particles.length,
       muc_trong_danh_sach: document.querySelectorAll('.playlist-item').length,
       so_dong_tho: document.querySelectorAll('#daily-poem span').length,
       loi_chuc: document.getElementById('daily-wish').textContent.slice(0, 50)
     })`
  );
  console.log('TRANG_THAI ' + state);
}

function createTray() {
  let icon = nativeImage.createFromPath(path.join(__dirname, 'assets', 'icon.ico'));
  if (icon.isEmpty()) {
    icon = nativeImage.createFromPath(path.join(__dirname, 'assets', 'tray.png'));
  }

  tray = new Tray(icon);
  tray.setToolTip('Đếm ngược Tết Nguyên Đán 2027');

  const rebuild = () => {
    tray.setContextMenu(
      Menu.buildFromTemplate([
        { label: 'Mở đếm ngược', click: showWindow },
        { type: 'separator' },
        {
          label: 'Tự khởi động cùng Windows',
          type: 'checkbox',
          checked: isAutoStartInstalled(),
          click: (item) => {
            settings.autoStart = item.checked;
            applyAutoStart(item.checked);
            saveSettings();
            if (mainWindow) mainWindow.webContents.send('settings-changed', settings);
          },
        },
        {
          label: 'Pháo hoa',
          type: 'checkbox',
          checked: settings.fireworks,
          click: (item) => {
            settings.fireworks = item.checked;
            saveSettings();
            if (mainWindow) mainWindow.webContents.send('settings-changed', settings);
          },
        },
        {
          label: 'Hoa mai, hoa đào rơi',
          type: 'checkbox',
          checked: settings.blossoms,
          click: (item) => {
            settings.blossoms = item.checked;
            saveSettings();
            if (mainWindow) mainWindow.webContents.send('settings-changed', settings);
          },
        },
        { type: 'separator' },
        {
          label: 'Thoát',
          click: () => {
            isQuitting = true;
            app.quit();
          },
        },
      ])
    );
  };

  rebuild();
  tray.on('double-click', showWindow);
  tray.on('click', showWindow);
  tray.rebuildMenu = rebuild;
}

/* ------------------------------------------------------------------ */
/* IPC                                                                 */
/* ------------------------------------------------------------------ */

function registerIpc() {
  ipcMain.handle('get-tet-info', () => {
    const prev = tetDate(TET_YEAR - 1);
    // Chi khi phat trien: cho phep gia lap ngay de kiem tra man hinh chuc mung.
    let iso = TET_DATE.toISOString();
    if (!app.isPackaged && process.env.TET_TEST_ISO) {
      iso = new Date(process.env.TET_TEST_ISO).toISOString();
    }
    return {
      year: TET_YEAR,
      iso,
      canChi: canChi(TET_YEAR),
      zodiac: zodiac(TET_YEAR),
      prevIso: prev ? prev.toISOString() : null,
      prevYear: TET_YEAR - 1,
      prevCanChi: canChi(TET_YEAR - 1),
      now: Date.now(),
    };
  });

  ipcMain.handle('get-settings', () => ({
    ...settings,
    autoStartInstalled: isAutoStartInstalled(),
    isPackaged: app.isPackaged,
    version: app.getVersion(),
  }));

  ipcMain.handle('set-settings', (_event, patch) => {
    const before = settings.autoStart;
    settings = { ...settings, ...patch };
    saveSettings();

    if (settings.autoStart !== before) {
      applyAutoStart(settings.autoStart);
    }

    if (tray && tray.rebuildMenu) tray.rebuildMenu();

    return { ...settings, autoStartInstalled: isAutoStartInstalled() };
  });

  // Loi chuc + tho cho mot ngay.
  // Cung mot ngay luon cho cung ket qua (seed theo ngay), nen mo lai app
  // trong ngay se thay dung noi dung cu; sang ngay moi se tu doi.
  // Tham so `nonce` khac di de lay loi chuc khac trong cung ngay.
  ipcMain.handle('get-daily', (_event, opts = {}) => {
    const now = new Date();
    const occasion = occasionForSolar(now);
    const nonce = Number(opts.nonce) || 0;

    // Seed theo ngay (va theo lan bam "loi chuc khac")
    const dayKey = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
    const seed = hashSeed(dayKey) + nonce * 7919;

    const pool = occasion ? OCCASIONS[occasion] : null;

    // Vao dip dac biet thi uu tien noi dung cua dip do:
    //   - 3 trong 4 lan dau lay tu kho cua dip (de dung khong khi ngay do)
    //   - lan thu 4 lay tu kho chung (de nguoi dung bam "loi chuc khac"
    //     van co nhieu lua chon moi)
    const useOccasionPool = !!pool && nonce % 4 !== 3;

    const wishPool = useOccasionPool
      ? pool.wishes
      : WISHES;
    const poemPool = useOccasionPool && pool.poems.length ? pool.poems : POEMS;

    const wish = pickFrom(wishPool, seed);
    const poem = pickFrom(poemPool, seed * 31 + 17);

    return {
      dateKey: dayKey,
      occasion,
      occasionLabel: pool ? pool.label : '',
      wish: typeof wish === 'string' ? wish : wish.text,
      poem: poem ? poem.lines : null,
      poemSource: poem ? poem.source || '' : '',
      isSpecial: !!occasion,
      tetYear: TET_YEAR,
      canChi: canChi(TET_YEAR),
      zodiac: zodiac(TET_YEAR),
    };
  });

  ipcMain.handle('open-startup-folder', () => {
    shell.showItemInFolder(autostart.shortcutPath(app.getPath('appData')));
    return true;
  });

  /**
   * Bang am lich cho mot khoang ngay, de giao dien ve lich.
   * Tra ve mang phang: {y,m,d, ld,lm,ly, leap}
   */
  ipcMain.handle('get-lunar-table', () => {
    const rows = [];
    // Tu dau nam truoc den cuoi nam sau de du cho viec lat lich
    for (let year = TET_YEAR - 1; year <= TET_YEAR + 1; year++) {
      const start = new Date(year, 0, 1);
      const end = new Date(year, 11, 31);
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const [ld, lm, ly, leap] = convertSolar2Lunar(
          d.getDate(),
          d.getMonth() + 1,
          d.getFullYear(),
          7
        );
        rows.push({
          y: d.getFullYear(),
          m: d.getMonth() + 1,
          d: d.getDate(),
          ld,
          lm,
          ly,
          leap,
        });
      }
    }
    return rows;
  });

  /** Cac moc le Tet quanh nam 2027, de to len lich. */
  ipcMain.handle('get-tet-marks', () => tetMarks());

  ipcMain.handle('minimize-to-tray', () => {
    if (mainWindow) mainWindow.hide();
    return true;
  });

  ipcMain.handle('quit-app', () => {
    isQuitting = true;
    app.quit();
  });

  // Nhac Tet: tra ve duong dan file + danh sach bai + bai bat dau.
  // Bai bat dau da duoc chon ngau nhien MOT LAN cho ca phien chay nay.
  ipcMain.handle('get-music', () => {
    const p = musicFilePath();
    const exists = !!p && fs.existsSync(p);
    return {
      exists,
      url: exists ? pathToFileURL(p).href : null,
      fileName: exists ? path.basename(p) : null,
      sizeMB: exists ? Math.round(fs.statSync(p).size / 1048576) : 0,
      songs: SONGS,
      startIndex: bootSongIndex,
    };
  });

  // Giao dien bao da phat xong mot bai -> ghi nho de thong ke (khong bat buoc)
  ipcMain.handle('music-ended', () => true);

  ipcMain.handle('open-music-folder', () => {
    const p = musicFilePath();
    if (p && fs.existsSync(p)) shell.showItemInFolder(p);
    return true;
  });
}

/* ------------------------------------------------------------------ */
/* Vong doi app                                                        */
/* ------------------------------------------------------------------ */

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', showWindow);

  app.whenReady().then(() => {
    // Cho phep tu phat am thanh/ nhac ngay khi mo app
    try {
      app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');
    } catch {
      /* bo qua */
    }

    loadSettings();

    // Chon ngau nhien bai hat bat dau cho phien chay nay
    pickBootSong(SONGS.length);

    // Tu khoi dong cung Windows:
    //  - Lan chay dau tien: tu bat luon (dung y nguoi dung: tai ve, mo mot lan,
    //    cac lan sau Windows tu mo app len)
    //  - Cac lan sau: giu dung lua chon da luu
    if (process.platform === 'win32') {
      const installed = isAutoStartInstalled();
      if (settings.autoStart && !installed) {
        applyAutoStart(true);
      } else if (!settings.autoStart && installed) {
        // Nguoi dung da tat truoc do -> ton trong lua chon, go shortcut con sot
        applyAutoStart(false);
      }
      if (firstRun) saveSettings();
    }

    registerIpc();
    createWindow();
    createTray();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
      else showWindow();
    });
  });

  app.on('before-quit', () => {
    isQuitting = true;
  });

  // App chay nen trong khay, khong thoat khi dong cua so
  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      // giu app chay o khay
    }
  });
}

module.exports = { TET_DATE, TET_YEAR };
