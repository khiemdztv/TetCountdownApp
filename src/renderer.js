'use strict';
/* =====================================================================
   Tết 2027 — Đếm ngược Tết Đinh Mùi
   Logic giao diện cho thiết kế cửa sổ desktop

   Gồm: đếm ngược, lịch Tết (âm + dương), lời chúc mỗi ngày,
         hiệu ứng nền (hoa rơi + pháo hoa + đèn lồng), trình phát nhạc.
   ===================================================================== */

/* ------------------------------ Tiện ích ------------------------------ */

const $ = (id) => document.getElementById(id);
const pad = (n, len = 2) => String(Math.max(0, Math.floor(n))).padStart(len, '0');
const rand = (a, b) => a + Math.random() * (b - a);
const clamp01 = (v) => Math.min(1, Math.max(0, v));

function showToast(msg, ms = 3000) {
  const t = $('toast');
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

function fmtClock(sec) {
  const s = Math.max(0, Math.floor(sec || 0));
  return `${Math.floor(s / 60)}:${pad(s % 60)}`;
}

/** Dinh dang ngay kieu Viet Nam: 06/02/2027 */
function fmtDate(d) {
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}

/* ------------------------------ Trạng thái ------------------------------ */

let TET = null;
let PREV_TET = null;
let CAN_CHI = 'Đinh Mùi';
let ZODIAC = 'Mùi';
let TET_YEAR = 2027;

let settings = { autoStart: true, fireworks: true, blossoms: true, motion: true };

/** Mốc Tết để tô lịch: khoá 'YYYY-M-D' -> nhãn */
let tetMarks = new Map();

const FX = { celebrating: false, reduced: false };

/* ------------------------------ Hoa rơi ------------------------------ */

/*
 * Hoa mai (vàng) và hoa đào (hồng) rơi trên nền toàn màn hình.
 */

const Blossoms = {
  canvas: null,
  ctx: null,
  items: [],
  w: 0,
  h: 0,
  dpr: 1,

  init() {
    this.canvas = $('petals');
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
    const on = settings.blossoms && settings.motion;
    if (!on) {
      this.ctx.clearRect(0, 0, this.w, this.h);
      return;
    }

    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.w, this.h);

    for (const p of this.items) {
      p.y += p.vy * dt;
      p.rot += p.rotSpeed * dt;
      const sway = Math.sin(t * p.swaySpeed + p.swayPhase) * p.swayAmp;
      // Co lại theo trục ngang để giống cánh hoa thật đang lật
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

    // Nhị hoa
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
    const on = settings.fireworks && settings.motion;
    if (!on) {
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

    // Vệt mờ nhẹ để pháo hoa rực rỡ
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillStyle = 'rgba(0, 0, 0, 0.13)';
    ctx.fillRect(0, 0, this.w, this.h);

    // Cộng sáng
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

  // Đặt ở nửa phải để không che chữ
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
 * File là mix liền mạch 23 bài, mỗi bài có mốc thời gian bắt đầu.
 *   - Mở app: chọn NGẪU NHIÊN một bài.
 *   - Sau đó phát tuần tự; hết danh sách quay lại đầu.
 */

const Music = {
  el: null,
  info: null,
  songs: [],
  current: 0,
  seeking: false,
  volume: 0.65,
  shuffle: false,
  listOpen: false,

  get song() {
    return this.songs[this.current] || null;
  },

  endOf(i) {
    const s = this.songs[i];
    if (s && Number.isFinite(s.end) && s.end > s.start) return s.end;
    if (i + 1 < this.songs.length) return this.songs[i + 1].start;
    if (this.el && isFinite(this.el.duration) && this.el.duration > 0) return this.el.duration;
    return Infinity;
  },

  lengthOf(i) {
    const end = this.endOf(i);
    return isFinite(end) ? Math.max(0, end - this.songs[i].start) : 0;
  },

  async init() {
    this.el = new Audio();
    this.el.preload = 'metadata';
    this.applyVolume();

    this.info = await window.tetAPI.getMusic();
    this.songs = Array.isArray(this.info.songs) ? this.info.songs : [];

    if (!this.info.exists || !this.songs.length) {
      $('music-name').textContent = 'Không tìm thấy file nhạc Tết';
      $('music-sub').textContent = 'Đặt tet-mix.mp3 vào assets/music';
      return;
    }

    this.el.src = this.info.url;
    this.current = this.info.startIndex || 0;

    this.buildPlaylist();
    this.wire();

    this.el.addEventListener('loadedmetadata', () => this.refresh());
    this.el.addEventListener('timeupdate', () => this.onTime());
    this.el.addEventListener('ended', () => this.next());
    this.el.addEventListener('play', () => this.reflect(true));
    this.el.addEventListener('pause', () => this.reflect(false));
    this.el.addEventListener('error', () => {
      $('music-name').textContent = 'Không phát được file nhạc';
    });

    // Phát bài ngẫu nhiên ngay khi mở app
    this.playFrom(this.current, { autoplay: true });
  },

  buildPlaylist() {
    const host = $('playlist-items');
    host.innerHTML = '';
    $('playlist-count').textContent = `${this.songs.length} bài`;

    this.songs.forEach((s, i) => {
      const li = document.createElement('li');
      li.className = 'playlist-item';
      li.dataset.index = String(i);

      const num = document.createElement('span');
      num.className = 'pl-item-num';
      num.textContent = String(i + 1);

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

    this.markActive();
  },

  markActive() {
    document.querySelectorAll('.playlist-item').forEach((li) => {
      li.classList.toggle('active', Number(li.dataset.index) === this.current);
    });
    const active = document.querySelector('.playlist-item.active');
    if (active && this.listOpen) active.scrollIntoView({ block: 'nearest' });
  },

  playFrom(i, { autoplay = true } = {}) {
    const n = this.songs.length;
    if (!n || !this.el) return;

    this.current = ((i % n) + n) % n;
    this.applyVolume();
    this.el.currentTime = this.songs[this.current].start;

    $('music-name').textContent = this.songs[this.current].title;
    $('music-sub').textContent = `Bài ${this.current + 1}/${n} · ${this.info.fileName || ''}`;
    document.title = `Tết 2027 — ${this.songs[this.current].title}`;

    this.markActive();
    if (autoplay) this.resume();
    this.refresh();
  },

  resume() {
    const p = this.el && this.el.play();
    if (p && p.catch) p.catch(() => {});
  },

  toggle() {
    if (!this.el || !this.info || !this.info.exists) return;
    if (this.el.paused) this.resume();
    else this.el.pause();
  },

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
    return (this.current + 1) % n;
  },

  next() {
    if (!this.songs.length) return;
    this.playFrom(this.pickNext());
    if (this.song) showToast(`♪ ${this.song.title}`, 2200);
  },

  prev() {
    if (!this.songs.length) return;
    // Đang phát qua 5 giây thì về đầu bài, ngược lại lùi bài
    const start = this.song ? this.song.start : 0;
    if (this.el && this.el.currentTime - start > 5) {
      this.el.currentTime = start;
      this.refresh();
      return;
    }
    this.playFrom(this.current - 1);
    if (this.song) showToast(`♪ ${this.song.title}`, 2200);
  },

  onTime() {
    if (!this.el || this.seeking) return;
    const end = this.endOf(this.current);
    if (isFinite(end) && this.el.currentTime >= end - 0.25) {
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
  },

  seekFraction(f) {
    if (!this.el || !this.song) return;
    const start = this.song.start;
    const end = this.endOf(this.current);
    const span = isFinite(end) ? end - start : this.el.duration - start;
    this.el.currentTime = start + span * clamp01(f);
    this.refresh();
  },

  applyVolume() {
    const gain = this.songs[this.current]?.playbackGain ?? 1;
    if (this.el) this.el.volume = this.volume * clamp01(gain);
  },

  setVolume(v) {
    this.volume = clamp01(v);
    this.applyVolume();
    const pct = Math.round(this.volume * 100);
    const fill = $('mp-fill');
    void fill;
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

    // Kéo thanh tiến trình
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

    // Lăn chuột trên ảnh bìa để chỉnh âm lượng
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

/* ------------------------------ Lời chúc ------------------------------ */

const Wishes = {
  nonce: 0,
  data: null,

  async load(nonce = 0) {
    this.nonce = nonce;
    try {
      const d = await window.tetAPI.getDaily(nonce);
      this.data = d;
      this.render(d);
      const card = $('wish-card');
      card.classList.remove('swap');
      void card.offsetWidth;
      card.classList.add('swap');
    } catch (err) {
      console.error('Không lấy được lời chúc:', err);
      $('wish-text').textContent = 'Chúc mừng năm mới — an khang thịnh vượng!';
    }
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

    // Nhãn dịp: hiện ở tab lời chúc và ở badge màn hình đếm ngược
    const occ = $('wish-occ');
    occ.textContent = d.occasionLabel || 'Ngày thường';

    const badge = $('occ-badge');
    if (d.occasionLabel) {
      badge.textContent = d.occasionLabel;
      badge.hidden = false;
    } else {
      badge.hidden = true;
    }

    // Nếu là dịp đặc biệt thì đổi câu phụ ở trang chính
    if (d.isSpecial && d.wish) $('hero-sub').textContent = d.wish;
  },

  /** Nội dung để sao chép */
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

function tickTile(id) {
  const tile = $(id).closest('.time-tile');
  if (!tile) return;
  tile.classList.remove('tick');
  void tile.offsetWidth;
  tile.classList.add('tick');
}

function updateCountdown() {
  const now = new Date();
  const remain = Math.max(0, TET.getTime() - now.getTime());

  if (remain <= 0 && !celebrated) onTetReached();
  else if (remain > 0) celebrated = false;

  const total = Math.floor(remain / 1000);
  const vals = {
    days: pad(Math.floor(total / 86400)),
    hours: pad(Math.floor((total % 86400) / 3600)),
    minutes: pad(Math.floor((total % 3600) / 60)),
    seconds: pad(total % 60),
  };

  for (const k of ['days', 'hours', 'minutes', 'seconds']) {
    if (prevVals[k] !== vals[k]) {
      $(k).textContent = vals[k];
      prevVals[k] = vals[k];
      if (k !== 'hours') tickTile(k);
    }
  }

  // Tiến độ năm
  const from = PREV_TET.getTime();
  const to = TET.getTime();
  const t = clamp01((now.getTime() - from) / (to - from));
  $('journey-fill').style.width = `${(t * 100).toFixed(2)}%`;
  $('journey-track').style.setProperty('--progress', `${(t * 100).toFixed(2)}%`);
  $('j-percent').textContent = `${(t * 100).toFixed(1)}%`;

  // Ngày giờ hiện tại
  const thu = ['Chủ nhật', 'Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy'][
    now.getDay()
  ];
  $('today-date').textContent = `${thu}, ${fmtDate(now)}`;
  $('today-time').textContent = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

  // Sang ngày mới thì đổi lời chúc
  const dayKey = now.toDateString();
  if (updateCountdown._day && updateCountdown._day !== dayKey) {
    updateCountdown._day = dayKey;
    Wishes.load(0);
    buildCalendar();
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

let calMonth = null; // {year, month} (month 0-11)

/** Tìm mùng 1 Tết của một năm âm lịch (hỏi tiến trình chính). */
async function loadTetMarks() {
  const marks = await window.tetAPI.getTetMarks();
  tetMarks = new Map();
  for (const m of marks) {
    const d = new Date(m.iso);
    tetMarks.set(`${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`, m);
  }
}

function buildCalendar() {
  if (!calMonth) {
    const t = TET;
    calMonth = { year: t.getFullYear(), month: t.getMonth() };
  }

  const { year, month } = calMonth;
  const grid = $('calendar-grid');
  grid.innerHTML = '';

  $('cal-title').textContent = `Tháng ${month + 1} · ${year}`;

  // Thứ trong tuần (tuần bắt đầu thứ Hai)
  for (const d of ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN']) {
    const h = document.createElement('div');
    h.className = 'cal-head';
    h.textContent = d;
    grid.appendChild(h);
  }

  const first = new Date(year, month, 1);
  // getDay(): 0=CN. Đổi sang tuần bắt đầu thứ Hai
  const lead = (first.getDay() + 6) % 7;
  for (let i = 0; i < lead; i++) {
    const b = document.createElement('div');
    b.className = 'calendar-cell blank';
    grid.appendChild(b);
  }

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();

  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day);
    const cell = document.createElement('div');
    cell.className = 'calendar-cell';

    const num = document.createElement('span');
    num.textContent = String(day);
    cell.appendChild(num);

    // Ngày âm lịch (số nhỏ góc phải)
    const lunar = window.tetAPI.lunarOf(day, month + 1, year);
    if (lunar) {
      const ln = document.createElement('span');
      ln.className = 'lunar-num';
      ln.textContent = lunar.day === 1 ? `${lunar.month}/1` : String(lunar.day);
      cell.appendChild(ln);

      // Mùng 1 Tết
      if (lunar.day === 1 && lunar.month === 1) {
        cell.classList.add('m1');
        const tag = document.createElement('span');
        tag.className = 'cell-tag';
        tag.textContent = 'Mùng 1 Tết';
        cell.appendChild(tag);
      }
    }

    // Mốc lễ Tết
    const key = `${year}-${month + 1}-${day}`;
    const mark = tetMarks.get(key);
    if (mark && !cell.classList.contains('m1')) {
      cell.classList.add('occ');
      if (mark.short) {
        const tag = document.createElement('span');
        tag.className = 'cell-tag';
        tag.textContent = mark.short;
        cell.appendChild(tag);
      }
    }

    if (
      day === today.getDate() &&
      month === today.getMonth() &&
      year === today.getFullYear()
    ) {
      cell.classList.add('today');
    }

    grid.appendChild(cell);
  }
}

function buildCalDaysList() {
  const host = $('cal-days-list');
  host.innerHTML = '';

  const todayKey = new Date().toDateString();

  for (const [, m] of tetMarks) {
    const d = new Date(m.iso);
    const row = document.createElement('div');
    row.className = 'cd-item';
    if (d.toDateString() === todayKey) row.classList.add('today');

    const date = document.createElement('span');
    date.className = 'cd-date';
    date.textContent = fmtDate(d);

    const name = document.createElement('span');
    name.className = 'cd-name';
    name.textContent = m.label;

    const lunar = document.createElement('span');
    lunar.className = 'cd-lunar';
    lunar.textContent = m.lunar || '';

    row.append(date, name, lunar);
    host.appendChild(row);
  }
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
  // Đổi tab thì đóng bảng nhạc cho gọn
  if (name !== 'countdown') Music.openList(false);
}

/** Gắn giá trị cài đặt vào các công tắc (cả ở khối dưới và trong bảng cài đặt) */
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
  try {
    const merged = await window.tetAPI.setSettings(patch);
    settings = { ...settings, ...merged };
    reflectSettings();
  } catch (err) {
    showToast('Không lưu được cài đặt');
    console.error(err);
  }
}

function wireSettings() {
  // Công tắc ở khối "Không khí ngày Tết"
  $('sw-petals').addEventListener('change', (e) => pushSetting({ blossoms: e.target.checked }));
  $('sw-fireworks').addEventListener('change', (e) => pushSetting({ fireworks: e.target.checked }));
  $('sw-motion').addEventListener('change', (e) => pushSetting({ motion: e.target.checked }));
  $('sw-autostart').addEventListener('change', (e) => {
    pushSetting({ autoStart: e.target.checked });
    showToast(
      e.target.checked
        ? 'Đã bật: app tự mở mỗi khi khởi động Windows'
        : 'Đã tắt tự mở cùng Windows'
    );
  });

  // Công tắc trong bảng cài đặt
  $('sw2-petals').addEventListener('change', (e) => pushSetting({ blossoms: e.target.checked }));
  $('sw2-fireworks').addEventListener('change', (e) => pushSetting({ fireworks: e.target.checked }));
  $('sw2-motion').addEventListener('change', (e) => pushSetting({ motion: e.target.checked }));
  $('sw2-autostart').addEventListener('change', (e) => pushSetting({ autoStart: e.target.checked }));

  $('sp-volume').addEventListener('input', (e) => Music.setVolume(Number(e.target.value) / 100));

  $('btn-open-music-folder').addEventListener('click', () => window.tetAPI.openMusicFolder());

  // Mở/đóng bảng cài đặt
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

/* ------------------------------ Nút & phím ------------------------------ */

async function toggleFullscreen() {
  if (document.fullscreenElement) await document.exitFullscreen().catch(() => {});
  else await document.documentElement.requestFullscreen().catch(() => {});
}

function wireButtons() {
  // Thanh tiêu đề
  $('btn-min').addEventListener('click', () => window.tetAPI.minimizeToTray());
  $('btn-close').addEventListener('click', () => window.tetAPI.minimizeToTray());
  $('btn-full').addEventListener('click', toggleFullscreen);
  $('btn-expand').addEventListener('click', toggleFullscreen);

  // Tab
  document.querySelectorAll('.nav-tab[data-tab]').forEach((b) => {
    b.addEventListener('click', () => switchTab(b.dataset.tab));
  });

  // Lịch
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

  // Lời chúc
  $('btn-wish-next').addEventListener('click', () => {
    Wishes.load(Wishes.nonce + 1);
    showToast('Lời chúc khác', 1800);
  });
  $('btn-wish-copy').addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(Wishes.asText());
      showToast('Đã sao chép lời chúc');
    } catch {
      showToast('Không sao chép được');
    }
  });
  $('hero-sub').addEventListener('click', () => switchTab('wishes'));

  // Sao chép nhanh ở trang chính
  $('btn-share').addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(Wishes.asText());
      showToast('Đã sao chép lời chúc hôm nay');
    } catch {
      showToast('Không sao chép được');
    }
  });

  // Phím tắt
  window.addEventListener('keydown', (e) => {
    const tag = e.target && e.target.tagName;
    if (e.defaultPrevented || e.isComposing || e.ctrlKey || e.altKey || e.metaKey || tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || e.target?.isContentEditable) return;

    if (e.key === 'Escape') {
      if (!$('settings-popover').hidden) {
        $('settings-popover').hidden = true;
      } else if (Music.listOpen) {
        Music.openList(false);
      } else {
        window.tetAPI.minimizeToTray();
      }
    }
    if (e.code === 'Space') {
      e.preventDefault();
      if (!e.repeat) Music.toggle();
      return;
    }
    if (e.key === 'ArrowRight') Music.next();
    if (e.key === 'ArrowLeft') Music.prev();
    if (e.key.toLowerCase() === 'p') Music.toggle();
    if (e.key.toLowerCase() === 'n') Wishes.load(Wishes.nonce + 1);
    // 1/2/3 để chuyển tab
    if (e.key === '1') switchTab('countdown');
    if (e.key === '2') switchTab('calendar');
    if (e.key === '3') switchTab('wishes');
  });

  // Nháy đúp: nổ pháo hoa tại con trỏ
  window.addEventListener('dblclick', (e) => {
    if (!settings.fireworks || !settings.motion) return;
    Fireworks.explode(e.clientX, e.clientY, Fireworks.palette(), 1.1);
  });

  // Bấm ra ngoài bảng nhạc thì đóng
  window.addEventListener('pointerdown', (e) => {
    if (!Music.listOpen) return;
    const pl = $('playlist');
    if (pl.contains(e.target) || $('btn-list').contains(e.target)) return;
    Music.openList(false);
  });
}

/* ------------------------------ Khởi động ------------------------------ */

function renderTitle() {
  const host = $('title-reveal');
  host.innerHTML = '';
  const text = 'Tết Nguyên Đán';
  [...text].forEach((ch, i) => {
    const sp = document.createElement('span');
    sp.textContent = ch === ' ' ? '\u00a0' : ch;
    sp.style.animationDelay = `${i * 0.055}s`;
    host.appendChild(sp);
  });
}

async function boot() {
  FX.reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  renderTitle();
  buildLanterns();

  const info = await window.tetAPI.getTetInfo();
  TET = new Date(info.iso);
  TET_YEAR = info.year;
  CAN_CHI = info.canChi;
  ZODIAC = info.zodiac;
  PREV_TET = info.prevIso ? new Date(info.prevIso) : new Date(TET.getFullYear() - 1, 0, 1);

  $('year-title').textContent = `${CAN_CHI} ${TET_YEAR}`;
  $('year-title').dataset.text = `${CAN_CHI} ${TET_YEAR}`;
  $('lunar-date').textContent = `Mùng 1 Tết · ${['Chủ nhật', 'Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy'][TET.getDay()]}, ${fmtDate(TET)}`;
  $('j-from').textContent = `Tết ${info.prevCanChi} ${TET_YEAR - 1}`;
  $('j-to').textContent = `Tết ${CAN_CHI} ${TET_YEAR}`;

  const loaded = await window.tetAPI.getSettings();
  settings = { ...settings, ...loaded };
  reflectSettings();

  // Mốc Tết + lịch
  await loadTetMarks();
  await window.tetAPI.prepareLunar();
  buildCalendar();
  buildCalDaysList();

  // Lời chúc hôm nay
  await Wishes.load(0);

  // Nhạc
  await Music.init();

  wireButtons();
  wireSettings();

  window.tetAPI.onSettingsChanged((s) => {
    settings = { ...settings, ...s };
    reflectSettings();
  });

  Blossoms.init();
  Fireworks.init();

  $('app-version').textContent = `v${loaded.version}`;

  if (Date.now() >= TET.getTime()) onTetReached();

  updateCountdown();
  setInterval(updateCountdown, 250);

  // Pháo hoa chào mừng khi mở app
  setTimeout(() => Fireworks.launch(), 1200);
  setTimeout(() => Fireworks.launch(), 2100);
  setTimeout(() => Fireworks.launch(), 3000);

  requestAnimationFrame(frame);
}

window.addEventListener('DOMContentLoaded', () => {
  boot().catch((err) => {
    console.error('Lỗi khởi động:', err);
    showToast('Có lỗi khi khởi động giao diện');
  });
});
