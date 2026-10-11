'use strict';
/* =====================================================================
   Tết 2027 — Đếm ngược Tết Đinh Mùi
   BẢN NEUTRALINO: mọi thứ chạy trong WebView, không có tiến trình Node riêng.

   Khác bản Electron (src/renderer.js):
     window.tetAPI.* (IPC)  ->  Neutralino.os / filesystem / storage / window
     lịch âm (IPC)          ->  tính tại chỗ bằng window.TetLunar
     tự khởi động (Node)    ->  Neutralino.os.execCommand (PowerShell)
     tray menu (Electron)   ->  Neutralino.os.setTray + sự kiện trayMenuItemClicked

   LƯU Ý QUAN TRỌNG: NL.init() trả về void, KHÔNG phải Promise.
   Phải chờ sự kiện 'ready' thay vì await, nếu không app sẽ đứng im.
   ===================================================================== */

/* ------------------------------ Tiện ích ------------------------------ */

const $ = (id) => document.getElementById(id);
const pad = (n, len = 2) => String(Math.max(0, Math.floor(n))).padStart(len, '0');
const rand = (a, b) => a + Math.random() * (b - a);
const clamp01 = (v) => Math.min(1, Math.max(0, v));

let NL = null;

/** Ghi log ra neutralinojs.log để soi lỗi khi không mở được DevTools. */
function logStep(msg) {
  try {
    if (NL && NL.debug && NL.debug.log) NL.debug.log('TET: ' + msg);
  } catch {
    /* bỏ qua */
  }
  try {
    console.log('TET: ' + msg);
  } catch {
    /* bỏ qua */
  }
}

function showToast(msg, ms = 3000) {
  const t = $('toast');
  if (!t) return;
  $('toast-text').textContent = msg;
  t.hidden = false;
  requestAnimationFrame(() => t.classList.add('show'));
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => {
    t.classList.remove('show');
    setTimeout(() => {
      t.hidden = true;
    }, 320);
  }, ms);
}

const fmtDate = (d) => `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;

function fmtClock(sec) {
  const s = Math.max(0, Math.floor(sec || 0));
  return `${Math.floor(s / 60)}:${pad(s % 60)}`;
}

/**
 * Băm FNV-1a — chọn lời chúc ổn định theo ngày.
 * Phải GIỐNG HỆT bản trong main.js của Electron để nội dung không đổi.
 */
function hashSeed(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

const pickFrom = (arr, seed) => (arr && arr.length ? arr[seed % arr.length] : null);

/* ------------------------------ Trạng thái ------------------------------ */

const TET_YEAR = 2027;
let TET = null;
let PREV_TET = null;
let CAN_CHI = 'Đinh Mùi';
let ZODIAC = 'Mùi';

let settings = { autoStart: true, fireworks: true, blossoms: true, motion: true, unit: 'all' };
let tetMarks = [];

const FX = { celebrating: false, reduced: false };

/* ------------------------------ Cài đặt ------------------------------ */

const Store = {
  KEY: 'tet-settings-2027',

  async load() {
    try {
      // storage.getData trả về chuỗi rỗng nếu chưa có
      const raw = await NL.storage.getData(this.KEY);
      if (raw) settings = { ...settings, ...JSON.parse(raw) };
    } catch {
      /* chưa có -> dùng mặc định */
    }
    return settings;
  },

  async save() {
    try {
      await NL.storage.setData(
        this.KEY,
        JSON.stringify({
          autoStart: !!settings.autoStart,
          fireworks: !!settings.fireworks,
          blossoms: !!settings.blossoms,
          motion: !!settings.motion,
          unit: unitMode,
        })
      );
    } catch (err) {
      console.error('Không lưu được cài đặt:', err);
    }
  },
};

/* ------------------------------ Hoa rơi ------------------------------ */

const Blossoms = {
  canvas: null,
  ctx: null,
  items: [],
  w: 0,
  h: 0,
  dpr: 1,

  init() {
    this.canvas = $('petals');
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');
    this.resize();
    this.spawn();
    window.addEventListener('resize', () => this.resize());
  },

  resize() {
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    this.w = window.innerWidth;
    this.h = window.innerHeight;
    this.canvas.width = Math.floor(this.w * this.dpr);
    this.canvas.height = Math.floor(this.h * this.dpr);
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  },

  count() {
    return Math.max(12, Math.min(40, Math.round((this.w * this.h) / 34000)));
  },

  spawn() {
    const n = this.count();
    this.items = [];
    for (let i = 0; i < n; i++) this.items.push(this.make(true, i < n * 0.6));
  },

  make(spreadY, forceMai) {
    const isMai = forceMai !== undefined ? forceMai : Math.random() < 0.6;
    const size = isMai ? rand(6, 13) : rand(7, 15);
    return {
      isMai,
      x: rand(-30, this.w + 30),
      y: spreadY ? rand(-this.h, this.h) : rand(-120, -15),
      size,
      vy: rand(13, 36) * (size / 11),
      swayAmp: rand(14, 46),
      swaySpeed: rand(0.3, 0.9),
      swayPhase: rand(0, Math.PI * 2),
      rot: rand(0, Math.PI * 2),
      rotSpeed: rand(-0.7, 0.7),
      hue: isMai ? rand(41, 52) : rand(336, 351),
      sat: isMai ? rand(76, 96) : rand(60, 84),
      light: isMai ? rand(60, 80) : rand(68, 84),
      alpha: rand(0.5, 0.95),
    };
  },

  update(dt, t) {
    if (!this.ctx) return;
    if (!settings.blossoms || !settings.motion) {
      this.ctx.clearRect(0, 0, this.w, this.h);
      return;
    }
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.w, this.h);

    for (const p of this.items) {
      p.y += p.vy * dt;
      p.rot += p.rotSpeed * dt;
      const sway = Math.sin(t * p.swaySpeed + p.swayPhase) * p.swayAmp;
      const squash = 0.55 + 0.45 * Math.abs(Math.cos(t * p.swaySpeed * 0.8 + p.swayPhase));

      if (p.y - p.size > this.h + 25) Object.assign(p, this.make(false, p.isMai));
      this.draw(ctx, p.x + sway, p.y, p.size, p.rot, p, squash);
    }
  },

  draw(ctx, x, y, r, rot, p, squash) {
    const petals = 5;
    const pr = r * 0.62;

    ctx.save();
    ctx.globalAlpha = p.alpha;
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.scale(squash, 1);

    for (let i = 0; i < petals; i++) {
      const ang = (i / petals) * Math.PI * 2 - Math.PI / 2;
      const px = Math.cos(ang) * r * 0.52;
      const py = Math.sin(ang) * r * 0.52;

      const g = ctx.createRadialGradient(px - pr * 0.3, py - pr * 0.3, 0, px, py, pr);
      g.addColorStop(0, `hsla(${p.hue + 6}, ${p.sat}%, ${Math.min(97, p.light + 18)}%, 1)`);
      g.addColorStop(0.55, `hsl(${p.hue}, ${p.sat}%, ${p.light}%)`);
      g.addColorStop(1, `hsl(${p.hue - 6}, ${Math.min(100, p.sat + 4)}%, ${p.light - 24}%)`);

      ctx.beginPath();
      ctx.ellipse(px, py, pr, pr * (p.isMai ? 0.82 : 0.92), ang, 0, Math.PI * 2);
      ctx.fillStyle = g;
      ctx.fill();
    }

    ctx.beginPath();
    ctx.arc(0, 0, r * 0.24, 0, Math.PI * 2);
    const cg = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 0.24);
    if (p.isMai) {
      cg.addColorStop(0, '#e8672a');
      cg.addColorStop(1, '#a8360c');
    } else {
      cg.addColorStop(0, '#fff0b4');
      cg.addColorStop(1, '#e8b62c');
    }
    ctx.fillStyle = cg;
    ctx.fill();

    ctx.restore();
  },
};

/* ------------------------------ Pháo hoa ------------------------------ */

const Fireworks = {
  canvas: null,
  ctx: null,
  w: 0,
  h: 0,
  dpr: 1,
  rockets: [],
  particles: [],
  nextLaunch: 0,

  init() {
    this.canvas = $('fireworks');
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');
    this.resize();
    window.addEventListener('resize', () => this.resize());
    this.nextLaunch = performance.now() + 1200;
  },

  resize() {
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    this.w = window.innerWidth;
    this.h = window.innerHeight;
    this.canvas.width = Math.floor(this.w * this.dpr);
    this.canvas.height = Math.floor(this.h * this.dpr);
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  },

  palette() {
    const hues = [45, 42, 8, 20, 350, 320, 55, 30];
    return {
      hue: hues[(Math.random() * hues.length) | 0] + rand(-6, 6),
      sat: rand(85, 100),
      light: rand(58, 76),
    };
  },

  launch(x, targetY) {
    this.rockets.push({
      x: x ?? rand(this.w * 0.12, this.w * 0.88),
      y: this.h + 8,
      vy: -rand(0.42, 0.6) * this.h,
      targetY: targetY ?? rand(this.h * 0.12, this.h * 0.42),
      col: this.palette(),
    });
  },

  explode(x, y, col, scale = 1) {
    const count = Math.round(rand(80, 130) * scale);
    const speedBase = rand(110, 205) * scale;
    const pattern = Math.random();

    for (let i = 0; i < count; i++) {
      let ang;
      let spd;
      if (pattern < 0.42) {
        ang = (i / count) * Math.PI * 2 + rand(-0.05, 0.05);
        spd = speedBase * rand(0.72, 1.05);
      } else if (pattern < 0.72) {
        ang = (i / count) * Math.PI * 2;
        spd = speedBase * rand(0.94, 1.02);
      } else {
        ang = rand(0, Math.PI * 2);
        spd = speedBase * Math.pow(Math.random(), 0.42) * 1.15;
      }

      this.particles.push({
        x,
        y,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd,
        life: 1,
        decay: rand(0.34, 0.6),
        hue: col.hue + rand(-14, 14),
        sat: col.sat,
        light: col.light + rand(-8, 12),
        size: rand(1.6, 3.1) * scale,
        twinkle: Math.random() < 0.32,
      });
    }

    this.particles.push({
      flash: true,
      x,
      y,
      life: 1,
      decay: 3.6,
      size: 85 * scale,
      hue: col.hue,
      sat: col.sat,
    });
  },

  update(dt, now) {
    if (!this.ctx) return;
    if (!settings.fireworks || !settings.motion) {
      this.ctx.clearRect(0, 0, this.w, this.h);
      this.rockets.length = 0;
      this.particles.length = 0;
      return;
    }

    if (now >= this.nextLaunch) {
      const burst = FX.celebrating ? 3 : 1;
      for (let i = 0; i < burst; i++) {
        setTimeout(() => {
          if (settings.fireworks && settings.motion) this.launch();
        }, i * 170);
      }
      this.nextLaunch = now + (FX.celebrating ? rand(320, 700) : rand(1300, 2900));
    }

    const ctx = this.ctx;
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillStyle = 'rgba(0, 0, 0, 0.13)';
    ctx.fillRect(0, 0, this.w, this.h);
    ctx.globalCompositeOperation = 'lighter';

    for (let i = this.rockets.length - 1; i >= 0; i--) {
      const r = this.rockets[i];
      r.y += r.vy * dt;
      r.vy += 260 * dt;

      ctx.beginPath();
      ctx.moveTo(r.x, r.y);
      ctx.lineTo(r.x, r.y + 16);
      ctx.strokeStyle = `hsla(${r.col.hue}, 100%, 82%, 0.85)`;
      ctx.lineWidth = 2.2;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(r.x, r.y, 2.3, 0, Math.PI * 2);
      ctx.fillStyle = '#fff6d8';
      ctx.fill();

      if (r.y <= r.targetY || r.vy >= 0) {
        this.explode(r.x, r.y, r.col, 1);
        this.rockets.splice(i, 1);
      }
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= p.decay * dt;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }

      if (p.flash) {
        const rr = p.size * (1.6 - p.life * 0.6);
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, rr);
        g.addColorStop(0, `hsla(${p.hue}, ${p.sat}%, 88%, ${p.life * 0.5})`);
        g.addColorStop(1, 'transparent');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(p.x, p.y, rr, 0, Math.PI * 2);
        ctx.fill();
        continue;
      }

      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 92 * dt;
      p.vx *= 1 - 0.62 * dt;
      p.vy *= 1 - 0.62 * dt;

      const a = Math.max(0, p.life) * (p.twinkle ? 0.55 + 0.45 * Math.sin(p.life * 42) : 1);
      const r = p.size * (0.4 + p.life * 0.75);

      ctx.beginPath();
      ctx.arc(p.x, p.y, Math.max(0.3, r), 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${p.hue}, ${p.sat}%, ${p.light}%, ${a})`;
      ctx.fill();

      if (r > 1.6) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, r * 2.6, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${p.hue}, ${p.sat}%, ${p.light}%, ${a * 0.14})`;
        ctx.fill();
      }
    }

    ctx.globalCompositeOperation = 'source-over';
  },
};

/* ------------------------------ Đèn lồng ------------------------------ */

function buildLanterns() {
  const host = $('lanterns');
  if (!host) return;
  host.innerHTML = '';

  const specs = [
    { left: '62%', drop: 26, swing: 5.0, delay: '0s' },
    { left: '70%', drop: 44, swing: 6.0, delay: '-2s' },
    { left: '78%', drop: 24, swing: 5.4, delay: '-1s' },
  ];

  for (const s of specs) {
    const el = document.createElement('div');
    el.className = 'lantern';
    el.style.left = s.left;
    el.style.setProperty('--drop', `${s.drop}px`);
    el.style.setProperty('--swing', `${s.swing}s`);
    el.style.setProperty('--swing-delay', s.delay);

    const str = document.createElement('div');
    str.className = 'lantern-string';
    const body = document.createElement('div');
    body.className = 'lantern-body';
    const tas = document.createElement('div');
    tas.className = 'lantern-tassel';

    el.append(str, body, tas);
    host.appendChild(el);
  }
}

/* ------------------------------ Nhạc ------------------------------ */

/*
 * Kho nhạc gồm NHIỀU ALBUM, mỗi album là một file mix liền mạch.
 * Danh sách phẳng `songs` có kèm `file` và `albumId` của từng bài, nên khi
 * chuyển bài khác album thì phải đổi cả nguồn phát (src).
 */

const Music = {
  el: null,
  songs: [],
  current: 0,
  seeking: false,
  volume: 0.65,
  shuffle: false,
  listOpen: false,

  get song() {
    return this.songs[this.current] || null;
  },

  /** Các bài trong cùng album với bài đang phát. */
  sameAlbum(i = this.current) {
    const s = this.songs[i];
    if (!s) return [];
    return this.songs
      .map((x, idx) => ({ x, idx }))
      .filter((o) => o.x.albumId === s.albumId)
      .map((o) => o.idx);
  },

  /**
   * Thời điểm kết thúc bài i.
   * Chỉ tính bài kế tiếp TRONG CÙNG ALBUM, vì mỗi album là một file riêng.
   */
  endOf(i) {
    const s = this.songs[i];
    if (!s) return Infinity;

    if (Number.isFinite(s.end) && s.end > s.start) return s.end;

    const same = this.sameAlbum(i);
    const pos = same.indexOf(i);

    // Còn bài sau trong album -> kết thúc ở mốc bắt đầu bài đó
    if (pos >= 0 && pos + 1 < same.length) {
      return this.songs[same[pos + 1]].start;
    }

    // Bài cuối album -> kết thúc ở hết file
    if (this.el && this.el.src.includes(s.file) && isFinite(this.el.duration) && this.el.duration > 0) {
      return this.el.duration;
    }
    return Infinity;
  },

  lengthOf(i) {
    const s = this.songs[i];
    if (!s) return 0;
    const end = this.endOf(i);
    return Number.isFinite(end) ? Math.max(0, end - s.start) : 0;
  },

  /** Đang phát đúng file của bài này chưa? */
  isLoaded(i = this.current) {
    const s = this.songs[i];
    if (!s || !this.el) return false;
    return decodeURIComponent(this.el.src).includes(s.file);
  },

  async init() {
    this.songs = Array.isArray(window.TET_SONGS) ? window.TET_SONGS : [];
    if (!this.songs.length) {
      $('music-name').textContent = 'Không có danh sách nhạc';
      return;
    }

    this.el = new Audio();
    this.el.preload = 'auto';
    this.el.volume = this.volume;
    // WebView2 đã cho phép autoplay trong neutralino.config.json.
    this.el.muted = false;

    this.buildPlaylist();
    this.wire();

    this.el.addEventListener('loadedmetadata', () => this.refresh());
    this.el.addEventListener('timeupdate', () => this.onTime());
    this.el.addEventListener('ended', () => this.next());
    this.el.addEventListener('play', () => {
      this.reflect(true);
    });
    this.el.addEventListener('playing', () => {
      this.firstPlayback = { milliseconds: Math.round(performance.now()), userActivated: navigator.userActivation.hasBeenActive };
      logStep('nhac bat dau sau ' + this.firstPlayback.milliseconds + 'ms, thao tac = ' + this.firstPlayback.userActivated);
    }, { once: true });
    this.el.addEventListener('pause', () => this.reflect(false));
    this.el.addEventListener('error', () => {
      $('music-name').textContent = 'Không phát được file nhạc';
      logStep('loi file nhac: ' + (this.el.error ? this.el.error.code : '?'));
    });

    // Chọn NGẪU NHIÊN một bài trong toàn bộ kho (cả 3 album)
    this.current = Math.floor(Math.random() * this.songs.length);
    const s = this.songs[this.current];
    logStep(`chon bai ngau nhien: #${this.current} "${s.title}" (album ${s.albumId})`);

    this.playFrom(this.current, { autoplay: true });
  },

  /** Dựng danh sách phát, nhóm theo album và có tiêu đề từng album. */
  buildPlaylist() {
    const host = $('playlist-items');
    host.innerHTML = '';

    const albums = Array.isArray(window.TET_ALBUMS) ? window.TET_ALBUMS : [];
    const totalAlbums = albums.length || 1;
    $('playlist-count').textContent = `${this.songs.length} bài · ${totalAlbums} album`;

    // Nhóm chỉ số bài theo album, giữ đúng thứ tự trong danh sách phẳng
    const groups = new Map();
    this.songs.forEach((s, i) => {
      if (!groups.has(s.albumId)) groups.set(s.albumId, { name: s.albumName, items: [] });
      groups.get(s.albumId).items.push(i);
    });

    for (const [albumId, g] of groups) {
      // Tiêu đề album
      const head = document.createElement('li');
      head.className = 'pl-album';
      head.textContent = g.name;
      host.appendChild(head);

      g.items.forEach((i, posInAlbum) => {
        const s = this.songs[i];

        const li = document.createElement('li');
        li.className = 'playlist-item';
        li.dataset.index = String(i);
        li.dataset.album = albumId;

        const num = document.createElement('span');
        num.className = 'pl-item-num';
        num.textContent = String(posInAlbum + 1);

        const bars = document.createElement('span');
        bars.className = 'pl-item-bars';
        bars.innerHTML = '<i></i><i></i><i></i>';

        const title = document.createElement('span');
        title.className = 'pl-item-title';
        title.textContent = s.title;

        const time = document.createElement('span');
        time.className = 'pl-item-time';
        time.textContent = fmtClock(this.lengthOf(i));

        li.append(num, bars, title, time);
        li.addEventListener('click', () => {
          this.playFrom(i);
          showToast(`♪ ${s.title}`, 2200);
        });
        host.appendChild(li);
      });
    }

    this.markActive();
  },

  markActive() {
    document.querySelectorAll('.playlist-item').forEach((li) => {
      li.classList.toggle('active', Number(li.dataset.index) === this.current);
    });
    const active = document.querySelector('.playlist-item.active');
    if (active && this.listOpen) active.scrollIntoView({ block: 'nearest' });
  },

  /**
   * Phát từ đầu bài i.
   * Nếu bài này thuộc album khác với file đang phát thì đổi nguồn (src) trước.
   */
  playFrom(i, { autoplay = true } = {}) {
    const n = this.songs.length;
    if (!n || !this.el) return;

    this.current = ((i % n) + n) % n;
    const s = this.songs[this.current];

    const setTime = () => {
      try {
        this.el.currentTime = s.start;
      } catch {
        /* file chưa sẵn sàng, loadedmetadata sẽ gọi lại refresh */
      }
      this.refresh();
    };

    if (!this.isLoaded(this.current)) {
      // Khác album -> đổi nguồn rồi mới đặt vị trí
      this.el.src = 'music/' + s.file;
      logStep('doi album -> ' + s.file);
      this.el.addEventListener('loadedmetadata', setTime, { once: true });
    } else {
      setTime();
    }

    $('music-name').textContent = s.title;
    this.updateSub();

    this.markActive();
    if (autoplay) this.resume();
  },

  /** Cập nhật dòng phụ: số bài, tên album. */
  updateSub() {
    const s = this.song;
    if (!s) return;
    const same = this.sameAlbum();
    const pos = same.indexOf(this.current) + 1;
    const sub = $('music-sub');
    if (sub) {
      sub.textContent = `${s.albumName} · Bài ${pos}/${same.length}`;
    }
  },

  resume() {
    if (!this.el) return;
    // Phát ngay, không có timer, phím giả hay thông báo yêu cầu bấm.
    const promise = this.el.play();
    if (promise && promise.catch) {
      promise.catch(err => logStep('loi phat nhac: ' + (err && err.name ? err.name : err)));
    }
  },

  toggle() {
    if (!this.el) return;
    if (this.el.paused) this.resume();
    else this.el.pause();
  },

  /**
   * Chọn bài kế tiếp.
   * Bình thường: đi tuần tự TRONG CÙNG ALBUM; hết album thì sang album kế.
   * Bật ⤨ (ngẫu nhiên): chọn ngẫu nhiên trong TOÀN BỘ kho (cả 3 album).
   */
  pickNext() {
    const n = this.songs.length;
    if (n <= 1) return this.current;

    if (this.shuffle) {
      let k;
      do {
        k = Math.floor(Math.random() * n);
      } while (k === this.current);
      return k;
    }

    // Đi tuần tự: ưu tiên bài kế trong album; hết thì sang album kế tiếp
    const same = this.sameAlbum();
    const pos = same.indexOf(this.current);
    if (pos >= 0 && pos + 1 < same.length) return same[pos + 1];

    // Hết album -> tìm bài đầu của album kế tiếp trong danh sách phẳng
    return (this.current + 1) % n;
  },

  /** Bài trước: lùi tuần tự trong album, hết thì lùi về album trước. */
  pickPrev() {
    const n = this.songs.length;
    if (n <= 1) return this.current;

    const same = this.sameAlbum();
    const pos = same.indexOf(this.current);
    if (pos > 0) return same[pos - 1];
    return (this.current - 1 + n) % n;
  },

  next() {
    if (!this.songs.length) return;
    this.playFrom(this.pickNext());
    if (this.song) showToast(`♪ ${this.song.title}`, 2200);
  },

  prev() {
    if (!this.songs.length) return;
    const start = this.song ? this.song.start : 0;
    if (this.el && this.el.currentTime - start > 5) {
      this.el.currentTime = start;
      this.refresh();
      return;
    }
    this.playFrom(this.pickPrev());
    if (this.song) showToast(`♪ ${this.song.title}`, 2200);
  },

  onTime() {
    if (!this.el || this.seeking) return;
    const end = this.endOf(this.current);
    if (isFinite(end) && this.el.currentTime >= end - 0.25) {
      this.next();
      return;
    }
    if (this.el.duration && this.el.currentTime >= this.el.duration - 0.3) {
      this.next();
      return;
    }
    this.refresh();
  },

  refresh() {
    if (!this.el || !this.song) return;
    const start = this.song.start;
    const end = this.endOf(this.current);
    const span = isFinite(end) ? Math.max(1, end - start) : Math.max(1, this.el.duration - start);
    const pos = clamp01((this.el.currentTime - start) / span);

    if (!this.seeking) {
      $('mp-fill').style.width = `${(pos * 100).toFixed(2)}%`;
      $('mp-knob').style.left = `${(pos * 100).toFixed(2)}%`;
    }
  },

  reflect(playing) {
    $('play-ico').textContent = playing ? '❚❚' : '▶';
    $('album-art').classList.toggle('playing', playing);
    $('sound-bars').classList.toggle('playing', playing);
    updateTray();
  },

  seekFraction(f) {
    if (!this.el || !this.song) return;
    const start = this.song.start;
    const end = this.endOf(this.current);
    const span = isFinite(end) ? end - start : this.el.duration - start;
    this.el.currentTime = start + span * clamp01(f);
    this.refresh();
  },

  setVolume(v) {
    this.volume = clamp01(v);
    if (this.el) this.el.volume = this.volume;
    const pct = Math.round(this.volume * 100);
    if ($('sp-volume')) $('sp-volume').value = String(pct);
    if ($('sp-vol-val')) $('sp-vol-val').textContent = `${pct}%`;
  },

  openList(v) {
    this.listOpen = v === undefined ? !this.listOpen : v;
    $('playlist').hidden = !this.listOpen;
    $('btn-list').classList.toggle('on', this.listOpen);
    if (this.listOpen) this.markActive();
  },

  toggleShuffle() {
    this.shuffle = !this.shuffle;
    $('btn-shuffle').classList.toggle('on', this.shuffle);
    showToast(this.shuffle ? 'Phát ngẫu nhiên: Bật' : 'Phát ngẫu nhiên: Tắt');
  },

  wire() {
    $('btn-play').addEventListener('click', () => this.toggle());
    $('btn-next').addEventListener('click', () => this.next());
    $('btn-prev').addEventListener('click', () => this.prev());
    $('btn-shuffle').addEventListener('click', () => this.toggleShuffle());
    $('btn-list').addEventListener('click', () => this.openList());
    $('btn-playlist-close').addEventListener('click', () => this.openList(false));

    const bar = $('music-progress');
    let dragging = false;
    const frac = (e) => {
      const r = bar.getBoundingClientRect();
      return clamp01((e.clientX - r.left) / r.width);
    };
    const move = (e) => {
      if (!dragging) return;
      const f = frac(e);
      $('mp-fill').style.width = `${(f * 100).toFixed(2)}%`;
      $('mp-knob').style.left = `${(f * 100).toFixed(2)}%`;
    };
    const up = (e) => {
      if (!dragging) return;
      dragging = false;
      this.seeking = false;
      bar.classList.remove('dragging');
      this.seekFraction(frac(e));
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    bar.addEventListener('pointerdown', (e) => {
      dragging = true;
      this.seeking = true;
      bar.classList.add('dragging');
      move(e);
      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', up);
    });

    $('album-art').addEventListener(
      'wheel',
      (e) => {
        e.preventDefault();
        this.setVolume(this.volume - Math.sign(e.deltaY) * 0.05);
      },
      { passive: false }
    );

    this.setVolume(this.volume);
  },
};

/* ------------------------------ Lời chúc mỗi ngày ------------------------------ */

const Wishes = {
  nonce: 0,
  data: null,

  /** Chọn lời chúc + thơ theo ngày (ổn định trong ngày). Giống hệt bản Electron. */
  compute(nonce = 0) {
    const now = new Date();
    const { WISHES, POEMS, OCCASIONS } = window.TET_WISHES_DATA;
    const occasion = window.TetLunar.occasionFor(now, TET_YEAR);

    const dayKey = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
    const seed = hashSeed(dayKey) + nonce * 7919;

    const pool = occasion ? OCCASIONS[occasion] : null;
    // Vào dịp đặc biệt: 3 lần đầu lấy kho của dịp, lần 4 lấy kho chung
    const useOccasionPool = !!pool && nonce % 4 !== 3;

    const wishPool = useOccasionPool ? pool.wishes : WISHES;
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
    };
  },

  load(nonce = 0) {
    this.nonce = nonce;
    const d = this.compute(nonce);
    this.data = d;
    this.render(d);

    const card = $('wish-card');
    card.classList.remove('swap');
    void card.offsetWidth;
    card.classList.add('swap');
  },

  render(d) {
    $('wish-text').textContent = d.wish || '';

    const host = $('wish-poem');
    host.innerHTML = '';
    if (d.poem && d.poem.length) {
      for (const line of d.poem) {
        const sp = document.createElement('span');
        sp.textContent = line;
        host.appendChild(sp);
      }
      if (d.poemSource) {
        const src = document.createElement('span');
        src.className = 'poem-source';
        src.textContent = `— ${d.poemSource} —`;
        host.appendChild(src);
      }
    }

    $('wish-occ').textContent = d.occasionLabel || 'Ngày thường';

    const badge = $('occ-badge');
    if (d.occasionLabel) {
      badge.textContent = d.occasionLabel;
      badge.hidden = false;
    } else {
      badge.hidden = true;
    }

    if (d.isSpecial && d.wish) $('hero-sub').textContent = d.wish;
  },

  asText() {
    const d = this.data;
    if (!d) return '';
    let t = d.wish || '';
    if (d.poem && d.poem.length) t += '\n\n' + d.poem.join('\n');
    if (d.poemSource) t += `\n(${d.poemSource})`;
    return t;
  },
};

/* ------------------------------ Đếm ngược ------------------------------ */

let prevVals = { days: null, hours: null, minutes: null, seconds: null };
let celebrated = false;

/*
 * Đơn vị đang hiển thị:
 *   'all'     -> đủ 4 ô Ngày / Giờ / Phút / Giây (mặc định)
 *   'days'    -> chỉ 1 ô, tổng số NGÀY còn lại
 *   'hours'   -> chỉ 1 ô, tổng số GIỜ còn lại
 *   'minutes' -> chỉ 1 ô, tổng số PHÚT còn lại
 *   'seconds' -> chỉ 1 ô, tổng số GIÂY còn lại
 *
 * Khi chọn 1 đơn vị thì hiện TỔNG (không chia nhỏ), vì mục đích là để nhìn
 * nhanh một con số duy nhất.
 */
let unitMode = 'all';

const UNIT_LABEL = { days: 'NGÀY', hours: 'GIỜ', minutes: 'PHÚT', seconds: 'GIÂY' };
const UNIT_SECONDS = { days: 86400, hours: 3600, minutes: 60, seconds: 1 };

function tickTile(id) {
  const tile = $(id).closest('.time-tile');
  if (!tile || tile.hidden) return;
  tile.classList.remove('tick');
  void tile.offsetWidth;
  tile.classList.add('tick');
}

/** Áp chế độ đơn vị: ẩn/hiện các ô và cập nhật nút. */
function applyUnitMode(mode) {
  unitMode = mode;

  const grid = document.querySelector('.countdown-grid');
  const hero = document.querySelector('.hero');
  const single = mode !== 'all';

  grid.classList.toggle('single', single);
  // Thêm class cho .hero để CSS thu gọn phần tiêu đề, nhường chỗ cho ô to
  if (hero) hero.classList.toggle('single-unit', single);

  for (const k of ['days', 'hours', 'minutes', 'seconds']) {
    const tile = $(k).closest('.time-tile');
    if (tile) tile.hidden = single && k !== mode;
    const label = tile ? tile.querySelector('.time-label') : null;
    if (label) label.textContent = UNIT_LABEL[k];
  }

  document.querySelectorAll('.unit-btn').forEach((b) => {
    b.classList.toggle('active', b.dataset.unit === mode);
  });

  // Xoá ký ức giá trị cũ để ô được vẽ lại ngay
  prevVals = { days: null, hours: null, minutes: null, seconds: null };
  updateCountdown();
}

function updateCountdown() {
  const now = new Date();
  const remain = Math.max(0, TET.getTime() - now.getTime());

  if (remain <= 0 && !celebrated) onTetReached();
  else if (remain > 0) celebrated = false;

  const total = Math.floor(remain / 1000);

  let vals;
  if (unitMode === 'all') {
    vals = {
      days: pad(Math.floor(total / 86400)),
      hours: pad(Math.floor((total % 86400) / 3600)),
      minutes: pad(Math.floor((total % 3600) / 60)),
      seconds: pad(total % 60),
    };
  } else {
    // Một đơn vị: hiện TỔNG số đơn vị còn lại (không chia nhỏ)
    const v = Math.floor(total / UNIT_SECONDS[unitMode]);
    vals = { days: '0', hours: '00', minutes: '00', seconds: '00' };
    // Ngày là số lớn nên để nguyên; các đơn vị khác đệm 2 chữ số
    vals[unitMode] = unitMode === 'days' ? String(v) : pad(v);
  }
  for (const k of ['days', 'hours', 'minutes', 'seconds']) {
    if (prevVals[k] !== vals[k]) {
      $(k).textContent = vals[k];
      prevVals[k] = vals[k];
      if (k !== 'hours') tickTile(k);
    }
  }

  const from = PREV_TET.getTime();
  const to = TET.getTime();
  const t = clamp01((now.getTime() - from) / (to - from));
  $('journey-fill').style.width = `${(t * 100).toFixed(2)}%`;
  $('journey-track').style.setProperty('--progress', `${(t * 100).toFixed(2)}%`);
  $('j-percent').textContent = `${(t * 100).toFixed(1)}%`;

  const thu = ['Chủ nhật', 'Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy'][
    now.getDay()
  ];
  $('today-date').textContent = `${thu}, ${fmtDate(now)}`;
  $('today-time').textContent = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

  const dayKey = now.toDateString();
  if (updateCountdown._day && updateCountdown._day !== dayKey) {
    updateCountdown._day = dayKey;
    Wishes.load(0);
    buildCalendar();
    buildCalDaysList();
    showToast('Ngày mới — lời chúc mới', 3600);
  }
  updateCountdown._day = dayKey;
}

function onTetReached() {
  celebrated = true;
  FX.celebrating = true;
  $('status-left').textContent = 'Chúc mừng năm mới — Tết đã đến!';
  showToast('Chúc mừng năm mới! Tết Đinh Mùi đã đến', 9000);
}

/* ------------------------------ Lịch Tết ------------------------------ */

let calMonth = null;

function lunarOf(d, m, y) {
  const [ld, lm, ly, leap] = window.TetLunar.convertSolar2Lunar(d, m, y, window.TetLunar.TZ_VN);
  return { day: ld, month: lm, year: ly, leap };
}

function buildCalendar() {
  if (!calMonth) calMonth = { year: TET.getFullYear(), month: TET.getMonth() };

  const { year, month } = calMonth;
  const grid = $('calendar-grid');
  grid.innerHTML = '';
  $('cal-title').textContent = `Tháng ${month + 1} · ${year}`;

  for (const d of ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN']) {
    const h = document.createElement('div');
    h.className = 'cal-head';
    h.textContent = d;
    grid.appendChild(h);
  }

  const first = new Date(year, month, 1);
  const lead = (first.getDay() + 6) % 7;
  for (let i = 0; i < lead; i++) {
    const b = document.createElement('div');
    b.className = 'calendar-cell blank';
    grid.appendChild(b);
  }

  const markMap = new Map();
  for (const m of tetMarks) {
    const d = m.date;
    markMap.set(`${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`, m);
  }

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();

  for (let day = 1; day <= daysInMonth; day++) {
    const cell = document.createElement('div');
    cell.className = 'calendar-cell';

    const num = document.createElement('span');
    num.textContent = String(day);
    cell.appendChild(num);

    const lunar = lunarOf(day, month + 1, year);
    if (lunar) {
      const ln = document.createElement('span');
      ln.className = 'lunar-num';
      ln.textContent = lunar.day === 1 ? `${lunar.month}/1` : String(lunar.day);
      cell.appendChild(ln);

      if (lunar.day === 1 && lunar.month === 1) {
        cell.classList.add('m1');
        const tag = document.createElement('span');
        tag.className = 'cell-tag';
        tag.textContent = 'Mùng 1 Tết';
        cell.appendChild(tag);
      }
    }

    const mark = markMap.get(`${year}-${month + 1}-${day}`);
    if (mark && !cell.classList.contains('m1')) {
      cell.classList.add('occ');
      if (mark.short) {
        const tag = document.createElement('span');
        tag.className = 'cell-tag';
        tag.textContent = mark.short;
        cell.appendChild(tag);
      }
    }

    if (day === today.getDate() && month === today.getMonth() && year === today.getFullYear()) {
      cell.classList.add('today');
    }

    grid.appendChild(cell);
  }
}

function buildCalDaysList() {
  const host = $('cal-days-list');
  host.innerHTML = '';
  const todayKey = new Date().toDateString();

  for (const m of tetMarks) {
    const row = document.createElement('div');
    row.className = 'cd-item';
    if (m.date.toDateString() === todayKey) row.classList.add('today');

    const date = document.createElement('span');
    date.className = 'cd-date';
    date.textContent = fmtDate(m.date);

    const name = document.createElement('span');
    name.className = 'cd-name';
    name.textContent = m.label;

    // Ngày âm lịch là cột riêng (1 dòng) để danh sách không bị cao
    const lunar = document.createElement('span');
    lunar.className = 'cd-lunar';
    lunar.textContent = m.lunar || '';

    row.append(date, name, lunar);
    host.appendChild(row);
  }

  updateMilestone();
}

/**
 * Thẻ "mốc Tết kế tiếp": đếm ngược tới mốc gần nhất chưa qua.
 * Nếu đã qua hết mốc của năm nay thì đếm tới Tết năm sau.
 */
function updateMilestone() {
  const host = $('milestone-next');
  if (!host) return;

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  let next = tetMarks.find((m) => m.date >= todayStart);
  let label;
  let lunar = '';

  if (next) {
    label = next.label;
    lunar = next.lunar || '';
  } else {
    const nextTet = window.TetLunar.tetDate(TET_YEAR + 1);
    if (!nextTet) {
      host.textContent = '';
      return;
    }
    next = { date: nextTet, label: `Tết ${window.TetLunar.canChi(TET_YEAR + 1)}` };
    lunar = 'Mùng 1 tháng Giêng';
  }

  const days = Math.round((next.date - todayStart) / 86400000);
  const isToday = days === 0;

  host.innerHTML =
    `<b>Mốc kế tiếp</b> ` +
    `<span class="ms-big">${isToday ? 'Hôm nay!' : `${days} ngày nữa`}</span>` +
    `<span class="ms-sub">${label} · ${fmtDate(next.date)}${lunar ? ` · ${lunar}` : ''}</span>`;
}

/* ------------------------------ Vòng lặp vẽ ------------------------------ */

let lastT = performance.now();
let tSec = 0;

function frame(now) {
  const dt = Math.min(0.05, (now - lastT) / 1000);
  lastT = now;
  tSec += dt;

  if (!FX.reduced) {
    Blossoms.update(dt, tSec);
    Fireworks.update(dt, now);
  }

  requestAnimationFrame(frame);
}

/* ------------------------------ Tab & cài đặt ------------------------------ */

function switchTab(name) {
  document.querySelectorAll('.nav-tab[data-tab]').forEach((b) => {
    b.classList.toggle('active', b.dataset.tab === name);
  });
  document.querySelectorAll('.tab-panel').forEach((p) => {
    p.hidden = p.dataset.panel !== name;
  });
  if (name !== 'countdown') Music.openList(false);

  // Gắn/bỏ tab trò chơi theo nhu cầu:
  // bundle React khá nặng nên chỉ dựng khi người dùng thật sự mở tab.
  if (name === 'games') mountGames();
  else unmountGames();
}

/* ------------------------------ Trò chơi dân gian ------------------------------ */

/*
 * Gói trò chơi là bundle React (games/tet-games.js) tự gắn vào window.TetGames.
 * Chỉ gọi mount/unmount khi mở/đóng tab để tiết kiệm bộ nhớ.
 */
let gamesMounted = false;

function mountGames() {
  const host = $('games-mount');
  if (!host || gamesMounted) return;

  if (!window.TetGames) {
    const loading = $('games-loading');
    if (loading) loading.textContent = 'Không nạp được trò chơi (thiếu bundle).';
    logStep('loi: khong thay window.TetGames');
    return;
  }

  try {
    window.TetGames.mount(host, {
      sound: true,
      motion: settings.motion !== false,
      petals: settings.blossoms !== false,
    });
    gamesMounted = true;

    // Chờ React render xong rồi kiểm tra: nếu host rỗng nghĩa là có lỗi
    setTimeout(() => {
      if (!gamesMounted) return;
      const loading = $('games-loading');
      const coGi = host.children.length > 0;

      if (!coGi) {
        // Lấy lỗi thật từ bundle (nếu có) để báo rõ thay vì im lặng
        let msg = 'Trò chơi không hiển thị được.';
        try {
          const e = window.TetGames.lastError && window.TetGames.lastError();
          if (e) msg += '\n\n' + String(e).slice(0, 400);
        } catch {
          /* bỏ qua */
        }
        if (loading) {
          loading.hidden = false;
          loading.textContent = msg;
        }
        logStep('CANH BAO: host rong sau khi mount. ' + msg.replace(/\n/g, ' | '));
      } else {
        if (loading) loading.hidden = true;
        logStep('tro choi render OK, so con = ' + host.children.length);
      }
    }, 900);
  } catch (err) {
    const loading = $('games-loading');
    if (loading) loading.textContent = 'Lỗi khi mở trò chơi: ' + err.message;
    logStep('loi gan tro choi: ' + err.message);
  }
}

function unmountGames() {
  if (!gamesMounted || !window.TetGames) return;
  const host = $('games-mount');
  if (!host) return;
  try {
    window.TetGames.unmount(host);
  } catch {
    /* bỏ qua */
  }
  gamesMounted = false;
}

function reflectSettings() {
  const map = [
    ['sw-petals', settings.blossoms],
    ['sw2-petals', settings.blossoms],
    ['sw-fireworks', settings.fireworks],
    ['sw2-fireworks', settings.fireworks],
    ['sw-motion', settings.motion],
    ['sw2-motion', settings.motion],
    ['sw-autostart', settings.autoStart],
    ['sw2-autostart', settings.autoStart],
  ];
  for (const [id, val] of map) {
    const el = $(id);
    if (el) el.checked = !!val;
  }
}

async function pushSetting(patch) {
  settings = { ...settings, ...patch };
  reflectSettings();
  await Store.save();
  await updateTray();
}

/* ------------------------------ Tự khởi động Windows ------------------------------ */

const STARTUP_NAME = 'Tet Countdown 2027.lnk';

/** Đặt/gỡ tự khởi động bằng shortcut trong thư mục Startup (qua PowerShell). */
async function applyAutoStart(enabled) {
  // LƯU Ý: KHÔNG dùng (Get-Process -Id $PID).Path vì đó là tiến trình PowerShell,
  // không phải app. Phải truyền đường dẫn exe của app từ JavaScript sang.
  const exePath = (await getAppExePath()).replace(/'/g, "''");
  const workDir = exePath.replace(/\\[^\\]+$/, '').replace(/'/g, "''");

  const ps = [
    "$ErrorActionPreference='Stop'",
    "$startup=[Environment]::GetFolderPath('Startup')",
    `$lnk=Join-Path $startup '${STARTUP_NAME}'`,
    enabled
      ? [
          '$ws=New-Object -ComObject WScript.Shell',
          '$s=$ws.CreateShortcut($lnk)',
          `$s.TargetPath='${exePath}'`,
          `$s.WorkingDirectory='${workDir}'`,
          "$s.Description='Dem nguoc Tet Nguyen Dan 2027'",
          '$s.Save()',
        ].join('; ')
      : 'if(Test-Path $lnk){Remove-Item $lnk -Force}',
  ].join('; ');

  return runPowerShell(ps, 'autostart');
}

/**
 * Lấy đường dẫn file .exe đang chạy.
 *
 * Neutralino không có API trực tiếp, nên dùng os.execCommand chạy PowerShell
 * để hỏi đường dẫn tiến trình cha (chính là app), vì PowerShell là tiến trình con.
 */
async function getAppExePath() {
  if (getAppExePath._cached) return getAppExePath._cached;

  // Cách 1: hỏi tiến trình cha của tiến trình PowerShell hiện tại
  const ps =
    "$p=Get-CimInstance Win32_Process -Filter \"ProcessId=$PID\"; " +
    '$parent=Get-CimInstance Win32_Process -Filter "ProcessId=$($p.ParentProcessId)"; ' +
    '$parent.ExecutablePath';

  try {
    const res = await runPowerShellRaw(ps);
    const out = String((res && res.stdOut) || '').trim();
    if (out && /\.exe$/i.test(out) && !/powershell|cmd\.exe/i.test(out)) {
      getAppExePath._cached = out;
      logStep('duong dan exe: ' + out);
      return out;
    }
  } catch {
    /* thử cách khác */
  }

  // Cách 2: dò theo tiến trình đang chạy có tên file app
  const ps2 =
    "Get-Process | Where-Object { $_.Path -and $_.ProcessName -like 'TetCountdown*' } | " +
    'Select-Object -First 1 -ExpandProperty Path';

  try {
    const res = await runPowerShellRaw(ps2);
    const out = String((res && res.stdOut) || '').trim();
    if (out && /\.exe$/i.test(out)) {
      getAppExePath._cached = out;
      logStep('duong dan exe (cach 2): ' + out);
      return out;
    }
  } catch {
    /* bỏ qua */
  }

  logStep('KHONG tim duoc duong dan exe');
  return '';
}

/** Chạy PowerShell với script cho sẵn (ghi ra file tạm rồi chạy). */
async function runPowerShellRaw(psScript) {
  const tmpDir = await NL.os.getPath('temp');
  const tmpFile = await NL.filesystem.getJoinedPath(tmpDir, `tet-ps-${Date.now()}.ps1`);
  await NL.filesystem.writeFile(tmpFile, psScript);
  try {
    return await NL.os.execCommand(
      `powershell -NoProfile -NonInteractive -ExecutionPolicy Bypass -File "${tmpFile}"`
    );
  } finally {
    try {
      await NL.filesystem.remove(tmpFile);
    } catch {
      /* bỏ qua */
    }
  }
}

/** Chạy PowerShell và ghi log nếu lỗi. */
async function runPowerShell(psScript, tag) {
  try {
    const res = await runPowerShellRaw(psScript);
    if (res && res.exitCode !== 0) {
      logStep(`${tag} loi: ` + String(res.stdErr || '').slice(0, 200));
      return false;
    }
    return true;
  } catch (err) {
    logStep(`${tag} loi: ` + err.message);
    return false;
  }
}

/** Kiểm tra shortcut tự khởi động có tồn tại không. */
async function isAutoStartInstalled() {
  const ps = `$startup=[Environment]::GetFolderPath('Startup'); $lnk=Join-Path $startup '${STARTUP_NAME}'; if(Test-Path $lnk){'YES'}else{'NO'}`;
  try {
    const res = await runPowerShellRaw(ps);
    return String((res && res.stdOut) || '').includes('YES');
  } catch {
    return false;
  }
}

/* ------------------------------ Khay hệ thống ------------------------------ */

/** Cập nhật menu khay theo trạng thái hiện tại. */
async function updateTray() {
  try {
    await NL.os.setTray({
      icon: '/resources/icons/trayIcon.png',
      menuItems: [
        { id: 'show', text: 'Mở đếm ngược' },
        { id: 'sep1', text: '-' },
        { id: 'trayPlay', text: Music.el && !Music.el.paused ? 'Tạm dừng nhạc' : 'Phát nhạc' },
        { id: 'trayNext', text: 'Bài kế tiếp' },
        { id: 'sep2', text: '-' },
        { id: 'autostart', text: 'Tự khởi động cùng Windows', isChecked: !!settings.autoStart },
        { id: 'sep3', text: '-' },
        { id: 'quit', text: 'Thoát' },
      ],
    });
  } catch (err) {
    logStep('loi tray: ' + err.message);
  }
}

function wireTrayEvents() {
  NL.events.on('trayMenuItemClicked', async (ev) => {
    const id = ev.detail && ev.detail.id;
    if (id === 'show') {
      await NL.window.show();
      await NL.window.focus();
    } else if (id === 'trayPlay') {
      Music.toggle();
    } else if (id === 'trayNext') {
      Music.next();
    } else if (id === 'autostart') {
      const next = !settings.autoStart;
      await pushSetting({ autoStart: next });
      await applyAutoStart(next);
      showToast(next ? 'Đã bật tự mở cùng Windows' : 'Đã tắt tự mở cùng Windows');
    } else if (id === 'quit') {
      await NL.app.exit();
    }
  });

  // Đóng cửa sổ = ẩn xuống khay (app vẫn chạy, nhạc vẫn phát)
  NL.events.on('windowClose', async () => {
    await NL.window.hide();
  });
}

/* ------------------------------ Nút & phím ------------------------------ */

async function toggleFullscreen() {
  try {
    const isFull = await NL.window.isFullScreen();
    if (isFull) await NL.window.exitFullScreen();
    else await NL.window.setFullScreen();
  } catch (err) {
    logStep('loi fullscreen: ' + err.message);
  }
}

function wireButtons() {
  // Cua so la that -> dung nut cua Windows, khong con nut gia tren thanh tieu de.
  // Chi giu nut phong to trong vung anh.
  $('btn-expand').addEventListener('click', toggleFullscreen);

  document.querySelectorAll('.nav-tab[data-tab]').forEach((b) => {
    b.addEventListener('click', () => switchTab(b.dataset.tab));
  });

  $('cal-prev').addEventListener('click', () => {
    calMonth.month--;
    if (calMonth.month < 0) {
      calMonth.month = 11;
      calMonth.year--;
    }
    buildCalendar();
  });
  $('cal-next').addEventListener('click', () => {
    calMonth.month++;
    if (calMonth.month > 11) {
      calMonth.month = 0;
      calMonth.year++;
    }
    buildCalendar();
  });
  $('cal-today').addEventListener('click', () => {
    const n = new Date();
    calMonth = { year: n.getFullYear(), month: n.getMonth() };
    buildCalendar();
  });

  $('btn-wish-next').addEventListener('click', () => {
    Wishes.load(Wishes.nonce + 1);
    showToast('Lời chúc khác', 1800);
  });
  $('btn-wish-copy').addEventListener('click', async () => {
    try {
      await NL.clipboard.writeText(Wishes.asText());
      showToast('Đã sao chép lời chúc');
    } catch {
      showToast('Không sao chép được');
    }
  });
  $('hero-sub').addEventListener('click', () => switchTab('wishes'));

  $('btn-share').addEventListener('click', async () => {
    try {
      await NL.clipboard.writeText(Wishes.asText());
      showToast('Đã sao chép lời chúc hôm nay');
    } catch {
      showToast('Không sao chép được');
    }
  });

  // Đổi đơn vị hiển thị (Tất cả / Ngày / Giờ / Phút / Giây)
  document.querySelectorAll('.unit-btn').forEach((b) => {
    b.addEventListener('click', () => {
      applyUnitMode(b.dataset.unit);
      Store.save();
    });
  });

  window.addEventListener('keydown', (e) => {
    const tag = e.target && e.target.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;

    if (e.key === 'Escape') {
      if (!$('settings-popover').hidden) $('settings-popover').hidden = true;
      else if (Music.listOpen) Music.openList(false);
      else NL.window.hide();
    }
    if (e.code === 'Space') {
      e.preventDefault();
      Fireworks.launch();
    }
    if (e.key === 'ArrowRight') Music.next();
    if (e.key === 'ArrowLeft') Music.prev();
    if (e.key.toLowerCase() === 'p') Music.toggle();
    if (e.key.toLowerCase() === 'n') Wishes.load(Wishes.nonce + 1);

    // U: xoay vòng đơn vị hiển thị (Tất cả -> Ngày -> Giờ -> Phút -> Giây)
    if (e.key.toLowerCase() === 'u') {
      const order = ['all', 'days', 'hours', 'minutes', 'seconds'];
      const next = order[(order.indexOf(unitMode) + 1) % order.length];
      applyUnitMode(next);
      Store.save();
      showToast(`Hiển thị: ${next === 'all' ? 'Tất cả' : UNIT_LABEL[next].toLowerCase()}`, 1800);
    }

    if (e.key === '1') switchTab('countdown');
    if (e.key === '2') switchTab('calendar');
    if (e.key === '3') switchTab('wishes');
  });

  window.addEventListener('dblclick', (e) => {
    if (!settings.fireworks || !settings.motion) return;
    Fireworks.explode(e.clientX, e.clientY, Fireworks.palette(), 1.1);
  });

  window.addEventListener('pointerdown', (e) => {
    if (!Music.listOpen) return;
    const pl = $('playlist');
    if (pl.contains(e.target) || $('btn-list').contains(e.target)) return;
    Music.openList(false);
  });
}

function wireSettings() {
  $('sw-petals').addEventListener('change', (e) => pushSetting({ blossoms: e.target.checked }));
  $('sw-fireworks').addEventListener('change', (e) => pushSetting({ fireworks: e.target.checked }));
  $('sw-motion').addEventListener('change', (e) => pushSetting({ motion: e.target.checked }));
  $('sw-autostart').addEventListener('change', async (e) => {
    await pushSetting({ autoStart: e.target.checked });
    await applyAutoStart(e.target.checked);
    showToast(
      e.target.checked
        ? 'Đã bật: app tự mở mỗi khi khởi động Windows'
        : 'Đã tắt tự mở cùng Windows'
    );
  });

  $('sw2-petals').addEventListener('change', (e) => pushSetting({ blossoms: e.target.checked }));
  $('sw2-fireworks').addEventListener('change', (e) => pushSetting({ fireworks: e.target.checked }));
  $('sw2-motion').addEventListener('change', (e) => pushSetting({ motion: e.target.checked }));
  $('sw2-autostart').addEventListener('change', async (e) => {
    await pushSetting({ autoStart: e.target.checked });
    await applyAutoStart(e.target.checked);
  });

  $('sp-volume').addEventListener('input', (e) => Music.setVolume(Number(e.target.value) / 100));

  $('btn-open-music-folder').addEventListener('click', () => {
    showToast('Nhạc nằm trong thư mục resources/music của app', 4000);
  });

  $('btn-settings').addEventListener('click', () => {
    $('settings-popover').hidden = false;
  });
  $('btn-settings-close').addEventListener('click', () => {
    $('settings-popover').hidden = true;
  });
  $('settings-popover').addEventListener('click', (e) => {
    if (e.target === $('settings-popover')) $('settings-popover').hidden = true;
  });
}

/* ------------------------------ Kích thước cửa sổ ------------------------------ */

/*
 * Thiết kế cần vùng nội dung 752x732 CSS pixel.
 *
 * Neutralino đặt kích thước cửa sổ theo PIXEL VẬT LÝ, còn CSS pixel phụ thuộc
 * tỉ lệ hiển thị (Windows scaling). Ví dụ màn hình 125%: cửa sổ 752 px vật lý
 * chỉ còn 752 / 1.25 = 602 CSS pixel -> thiếu chỗ, giao diện bị tràn.
 * Nên phải đo tỉ lệ thật rồi nhân lại cho đủ.
 */

const DESIGN_W = 752;
const DESIGN_H = 732;

async function fitWindowToDesign() {
  try {
    let scale = window.devicePixelRatio || 1;

    try {
      const size = await NL.window.getSize();
      if (size && size.width && window.innerWidth) {
        const measured = size.width / window.innerWidth;
        if (measured > 0.5 && measured < 4) scale = measured;
      }
    } catch {
      /* dùng devicePixelRatio */
    }

    let targetW = Math.round(DESIGN_W * scale);
    let targetH = Math.round(DESIGN_H * scale);

    try {
      const displays = await NL.computer.getDisplays();
      const primary = (displays && displays[0]) || null;
      if (primary && primary.resolution) {
        targetW = Math.min(targetW, Math.round(primary.resolution.width * 0.96));
        targetH = Math.min(targetH, Math.round(primary.resolution.height * 0.94));
      }
    } catch {
      /* giữ nguyên */
    }

    const cur = await NL.window.getSize();
    const curW = cur ? cur.width : 0;
    const curH = cur ? cur.height : 0;

    if (Math.abs(curW - targetW) > 4 || Math.abs(curH - targetH) > 4) {
      await NL.window.setSize({ width: targetW, height: targetH });
      await NL.window.center();
      logStep(`cua so ${curW}x${curH} -> ${targetW}x${targetH} (ti le ${scale.toFixed(3)})`);
    }
  } catch (err) {
    logStep('loi chinh cua so: ' + err.message);
  }
}

/* ------------------------------ Đo bố cục (khi phát triển) ------------------------------ */

/**
 * Đo xem mỗi tab có bị tràn (phải cuộn hoặc bị cắt) không.
 * Kết quả ghi vào neutralinojs.log để soi từ ngoài.
 *
 * Gọi bằng cách thêm ?measure=1 vào url trong neutralino.config.json.
 */
/**
 * Đo danh sách phát: số album, số bài, bài đang phát.
 * Gọi bằng ?measure=2.
 */
function measurePlaylist() {
  Music.openList(true);

  const albums = document.querySelectorAll('.pl-album');
  const items = document.querySelectorAll('.playlist-item');
  const active = document.querySelector('.playlist-item.active');
  const cur = Music.song;

  logStep('DS tong bai: ' + Music.songs.length);
  logStep('DS so album: ' + albums.length);
  albums.forEach((a) => logStep('DS album: ' + a.textContent));
  logStep('DS so muc: ' + items.length);
  logStep('DS dang phat: ' + (cur ? `${cur.title} | ${cur.albumName}` : 'khong'));
  logStep(
    'DS muc active: ' +
      (active ? active.querySelector('.pl-item-title').textContent : 'khong')
  );
  logStep('DS dong phu: ' + ($('music-sub') ? $('music-sub').textContent : ''));
  logStep('DS ten bai: ' + ($('music-name') ? $('music-name').textContent : ''));
  logStep('DS dang phat nhac: ' + (Music.el && !Music.el.paused));
}

/**
 * Đo tính năng đổi đơn vị: thử từng chế độ và ghi kết quả.
 * Gọi bằng ?measure=3.
 */
function measureUnitSwitch() {
  const modes = ['all', 'days', 'hours', 'minutes', 'seconds'];
  const lines = [];

  for (const m of modes) {
    applyUnitMode(m);

    // Cho layout ổn định rồi mới đo
    void document.body.offsetWidth;

    const all = ['days', 'hours', 'minutes', 'seconds'];
    const visible = all.filter((k) => {
      const t = $(k).closest('.time-tile');
      return t && !t.hidden;
    });

    const grid = document.querySelector('.countdown-grid');
    const gridBox = grid.getBoundingClientRect();

    // Đo ô đang hiện: bề rộng ô, bề rộng chữ, có bị tràn không
    const tile = $(visible[0]).closest('.time-tile');
    const valEl = $(visible[0]);
    const tileBox = tile.getBoundingClientRect();
    const valBox = valEl.getBoundingClientRect();

    // Ô có nằm giữa vùng nội dung không?
    const content = document.querySelector('.countdown-content');
    const contBox = content.getBoundingClientRect();
    const tileCenter = tileBox.left + tileBox.width / 2;
    const contCenter = contBox.left + contBox.width / 2;
    const lech = Math.round(tileCenter - contCenter);

    lines.push(
      `${m.padEnd(8)}: o=${Math.round(tileBox.width)}px ` +
        `chu=${Math.round(valBox.width)}px ` +
        `tran=${valBox.width > tileBox.width - 4 ? 'CO' : 'khong'} ` +
        `lechTam=${lech}px ` +
        `luoi=${Math.round(gridBox.width)}px ` +
        `giaTri="${valEl.textContent}"`
    );
  }

  applyUnitMode('all');
  for (const l of lines) logStep('DV ' + l);
}

/**
 * Đo tab trò chơi: bundle có nạp không, đã gắn chưa, có mấy game.
 * Gọi bằng ?measure=4.
 */
async function measureGames() {
  const settle = () => new Promise((resolve) => setTimeout(resolve, 600));
  const box = (selector) => {
    const el = document.querySelector(selector);
    if (!el) return selector + '=khong co';
    const r = el.getBoundingClientRect();
    return selector + '=' + Math.round(r.width) + 'x' + Math.round(r.height);
  };
  logStep('GM co window.TetGames: ' + typeof window.TetGames);
  switchTab('games');
  await settle();
  for (const [i, name] of ['bau', 'sic', 'tien', 'xi', 'poker'].entries()) {
    const button = document.querySelectorAll('.game-toolbar [role="tab"]')[i];
    if (!button) { logStep('GM thieu tab: ' + name); continue; }
    button.click();
    await settle();
    const surface = document.querySelector('.game-surface');
    logStep('GM tab ' + name + ': ' + (surface ? surface.textContent.replace(/\s+/g, ' ').slice(0, 70) : 'khong co'));
  }
  document.querySelector('.game-toolbar [role="tab"]').click();
  await settle();
  logStep('GM ' + ['.games-view', '#games-mount', '.tet-games-tab', '.folk-games', '.game-surface', '.bau-cua', '.bau-main', '.bet-grid', '.bet-tile', '.bet-tile > .symbol-art'].map(box).join(' | '));
  const tiles = [...document.querySelectorAll('.bet-tile')];
  const square = tiles.length === 6 && tiles.every((tile) => {
    const t = tile.getBoundingClientRect();
    const a = tile.querySelector('.symbol-art').getBoundingClientRect();
    return t.width > 0 && Math.abs(t.width - t.height) <= 1 && Math.abs(a.width - a.height) <= 1;
  });
  logStep('GM 6 o vuong: ' + square);
}

function measureLayout() {
  const tabs = ['countdown', 'calendar', 'wishes'];
  const lines = [];

  lines.push(`cua so CSS: ${window.innerWidth}x${window.innerHeight}`);
  lines.push(`khung app : ${Math.round($('app-window').getBoundingClientRect().width)}x${Math.round($('app-window').getBoundingClientRect().height)}`);

  for (const t of tabs) {
    switchTab(t);

    const panel = document.querySelector(`.tab-panel[data-panel='${t}']`);
    const cs = getComputedStyle(panel);
    const over = panel.scrollHeight - panel.clientHeight;

    // Đếm phần tử bị cắt trong các vùng cuộn
    const lists = panel.querySelectorAll('.cd-list, .wc-poem, .playlist-items');
    let clipped = 0;
    for (const el of lists) {
      if (el.scrollHeight > el.clientHeight + 1) clipped++;
    }

    lines.push(
      `${t.padEnd(9)}: panel ${panel.clientHeight}px, noi dung ${panel.scrollHeight}px, ` +
        `tran ${over}px, overflow ${cs.overflowY}, vung bi cat ${clipped}`
    );

    // Đếm mốc lịch hiện được (chỉ có ý nghĩa với tab lịch)
    if (t === 'calendar') {
      const host = $('cal-days-list');
      const hostBox = host.getBoundingClientRect();
      let visible = 0;
      for (const item of host.children) {
        const b = item.getBoundingClientRect();
        if (b.bottom <= hostBox.bottom + 1) visible++;
      }
      lines.push(`          moc hien duoc: ${visible}/${host.children.length}`);
    }
  }

  switchTab('countdown');

  for (const l of lines) logStep('DO ' + l);
}

/* ------------------------------ Khởi động ------------------------------ */

function renderTitle() {
  const host = $('title-reveal');
  host.innerHTML = '';
  [...'Tết Nguyên Đán'].forEach((ch, i) => {
    const sp = document.createElement('span');
    sp.textContent = ch === ' ' ? '\u00a0' : ch;
    sp.style.animationDelay = `${i * 0.055}s`;
    host.appendChild(sp);
  });
}

async function boot() {
  FX.reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  NL = window.Neutralino || window.NL;
  if (!NL) {
    logStep('KHONG nap duoc thu vien Neutralino');
    showToast('Không nạp được thư viện Neutralino');
    return;
  }
  logStep('co thu vien Neutralino');

  // NL.init() trả về void (không phải Promise) -> phải chờ sự kiện 'ready'
  const ready = new Promise((resolve) => {
    let done = false;
    const finish = (why) => {
      if (done) return;
      done = true;
      logStep('san sang (' + why + ')');
      resolve();
    };
    try {
      NL.events.on('ready', () => finish('su kien ready'));
    } catch {
      /* bỏ qua */
    }
    // Dự phòng nếu sự kiện 'ready' đã xảy ra trước khi kịp đăng ký
    setTimeout(() => finish('het thoi gian cho'), 2000);
  });

  NL.init();
  await ready;

  // Bản phát hành giữ nhạc ngoài gói cập nhật. Bản phát triển dùng resources/music.
  if (window.NL_RESMODE === 'bundle') {
    try { await NL.server.mount('/music', window.NL_PATH + '/music'); }
    catch (error) { logStep('loi gan thu muc nhac: ' + error.message); }
  }

  // Khởi động nhạc trước các bước chỉnh cửa sổ, đọc cài đặt và Startup.
  await Music.init();

  // Reapply branding after WebView2 initialization (also updates older runtimes).
  await NL.window.setTitle('TetCountdownApp');
  await NL.window.setIcon('/resources/icons/appIcon.png');

  await fitWindowToDesign();

  renderTitle();
  buildLanterns();
  logStep('ve tieu de + den long xong');

  TET = window.TetLunar.tetDate(TET_YEAR);
  PREV_TET = window.TetLunar.tetDate(TET_YEAR - 1) || new Date(TET.getFullYear() - 1, 0, 1);
  CAN_CHI = window.TetLunar.canChi(TET_YEAR);
  ZODIAC = window.TetLunar.zodiac(TET_YEAR);
  tetMarks = window.TetLunar.tetMarks(TET_YEAR);
  logStep(`lich am xong: Tet ${fmtDate(TET)}, ${tetMarks.length} moc`);

  $('year-title').textContent = `${CAN_CHI} ${TET_YEAR}`;
  $('year-title').dataset.text = `${CAN_CHI} ${TET_YEAR}`;
  const thuTet = ['Chủ nhật', 'Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy'][
    TET.getDay()
  ];
  $('lunar-date').textContent = `Mùng 1 Tết · ${thuTet}, ${fmtDate(TET)}`;
  $('j-from').textContent = `Tết ${window.TetLunar.canChi(TET_YEAR - 1)} ${TET_YEAR - 1}`;
  $('j-to').textContent = `Tết ${CAN_CHI} ${TET_YEAR}`;

  await Store.load();
  reflectSettings();

  // Áp lại đơn vị hiển thị đã lưu (mặc định 'all')
  // Khi phát triển: cho phép ép đơn vị qua ?unit=hours (tiện kiểm tra)
  const wantUnit = new URLSearchParams(location.search).get('unit');
  const validUnit = ['all', 'days', 'hours', 'minutes', 'seconds'];
  const startUnit = validUnit.includes(wantUnit)
    ? wantUnit
    : validUnit.includes(settings.unit)
      ? settings.unit
      : 'all';
  applyUnitMode(startUnit);
  logStep('nap cai dat xong, don vi = ' + unitMode);

  // Lần chạy đầu: tự bật khởi động cùng Windows nếu chưa có shortcut
  try {
    if (!new URLSearchParams(location.search).has('test') && settings.autoStart && !(await isAutoStartInstalled())) {
      await applyAutoStart(true);
      logStep('da dat tu khoi dong');
    }
  } catch (err) {
    logStep('loi tu khoi dong: ' + err.message);
  }

  buildCalendar();
  buildCalDaysList();
  logStep('ve lich xong');

  Wishes.load(0);
  logStep('loi chuc xong');

  logStep('nhac xong, dang phat = ' + (Music.el ? !Music.el.paused : 'khong co'));

  wireButtons();
  wireSettings();
  if (!new URLSearchParams(location.search).has('test')) {
    wireTrayEvents();
    await updateTray();
  }
  logStep('khay xong');

  Blossoms.init();
  Fireworks.init();

  $('app-version').textContent = 'v' + (window.NL_APPVERSION || '1.0.0') + ' · ' + ZODIAC;
  if (window.TetUpdates) window.TetUpdates.init().catch(error => logStep('loi cap nhat: ' + error.message));

  // Khi phát triển: cho phép mở thẳng một tab qua ?tab=calendar (tiện kiểm tra)
  const params = new URLSearchParams(location.search);
  const wantTab = params.get('tab');
  if (wantTab && ['countdown', 'calendar', 'wishes'].includes(wantTab)) {
    switchTab(wantTab);
    logStep('mo tab theo tham so: ' + wantTab);
  }

  // Khi phát triển: đo bố cục (?measure=1) hoặc danh sách phát (?measure=2)
  const mv = params.get('measure');
  if (mv === '2') setTimeout(measurePlaylist, 1200);
  else if (mv === '3') setTimeout(measureUnitSwitch, 1200);
  else if (mv === '4') setTimeout(measureGames, 1200);
  else if (mv) setTimeout(measureLayout, 900);

  if (Date.now() >= TET.getTime()) onTetReached();

  updateCountdown();
  setInterval(updateCountdown, 250);

  setTimeout(() => Fireworks.launch(), 1200);
  setTimeout(() => Fireworks.launch(), 2100);
  setTimeout(() => Fireworks.launch(), 3000);

  requestAnimationFrame(frame);
  logStep('KHONG DONG XONG');
}

window.addEventListener('DOMContentLoaded', () => {
  boot().catch((err) => {
    logStep('LOI KHOI DONG: ' + (err && err.message ? err.message : err));
    showToast('Có lỗi khi khởi động giao diện');
  });
});
