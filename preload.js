'use strict';

const { contextBridge, ipcRenderer } = require('electron');

/** Bảng âm lịch do tiến trình chính gửi sang, để tra cứu đồng bộ ở giao diện. */
let lunarTable = new Map();

function lunarKey(d, m, y) {
  return `${y}-${m}-${d}`;
}

contextBridge.exposeInMainWorld('tetAPI', {
  getTetInfo: () => ipcRenderer.invoke('get-tet-info'),
  getDaily: (nonce) => ipcRenderer.invoke('get-daily', { nonce: nonce || 0 }),
  getSettings: () => ipcRenderer.invoke('get-settings'),
  setSettings: (patch) => ipcRenderer.invoke('set-settings', patch),
  getMusic: () => ipcRenderer.invoke('get-music'),
  getTetMarks: () => ipcRenderer.invoke('get-tet-marks'),
  openMusicFolder: () => ipcRenderer.invoke('open-music-folder'),
  minimizeToTray: () => ipcRenderer.invoke('minimize-to-tray'),
  quitApp: () => ipcRenderer.invoke('quit-app'),

  /**
   * Tra ngày âm lịch của một ngày dương lịch.
   * Bảng được nạp sẵn một lần qua prepareLunar(), nên hàm này chạy đồng bộ
   * (cần thiết vì giao diện vẽ lịch trong một vòng lặp).
   */
  prepareLunar: async () => {
    const rows = await ipcRenderer.invoke('get-lunar-table');
    lunarTable = new Map();
    for (const r of rows) lunarTable.set(lunarKey(r.d, r.m, r.y), r);
    return lunarTable.size;
  },

  lunarOf: (d, m, y) => {
    const r = lunarTable.get(lunarKey(d, m, y));
    return r ? { day: r.ld, month: r.lm, year: r.ly, leap: r.leap } : null;
  },

  onSettingsChanged: (cb) => {
    ipcRenderer.on('settings-changed', (_e, s) => cb(s));
  },
});
