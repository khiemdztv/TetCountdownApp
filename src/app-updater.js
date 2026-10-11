/* Cập nhật bản Neutralino từ GitHub Releases, không tải lại thư mục nhạc. */
(() => {
  'use strict';
  const REPO = 'khiemdztv/TetCountdownApp';
  const API_URL = 'https://api.github.com/repos/' + REPO + '/releases/latest';
  const PAGE_URL = 'https://github.com/' + REPO + '/releases/latest';
  const MAX_BYTES = 32 * 1024 * 1024;
  let api, status, checkButton, installButton, progress, manifest = null;
  let busy = false, initialized = false;
  const currentVersion = () => window.NL_APPVERSION || '1.0.0';
  function compareVersions(a, b) {
    const parse = value => {
      if (!/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(value)) throw new Error('Phiên bản không hợp lệ.');
      const numbers = value.split('.').map(Number);
      if (!numbers.every(Number.isSafeInteger)) throw new Error('Phiên bản không hợp lệ.');
      return numbers;
    };
    const x = parse(a), y = parse(b);
    for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i] > y[i] ? 1 : -1;
    return 0;
  }
  function trustedAsset(url, version, filename) {
    const expected = 'https://github.com/' + REPO + '/releases/download/v' + version + '/' + filename;
    return url === expected;
  }
  function validateManifest(value, release) {
    if (value.applicationId !== window.NL_APPID || value.protocol !== 1) throw new Error('Gói cập nhật không phù hợp với app.');
    compareVersions(value.version, currentVersion());
    if (release.tag_name !== 'v' + value.version || release.prerelease || release.draft) throw new Error('Phiên bản phát hành không hợp lệ.');
    if (!trustedAsset(value.resourcesURL, value.version, 'resources.neu')) throw new Error('Địa chỉ cập nhật không hợp lệ.');
    if (!release.assets.some(asset => asset.name === 'resources.neu' && asset.browser_download_url === value.resourcesURL && asset.size === value.size)) throw new Error('Không tìm thấy gói cập nhật.');
    if (!Number.isSafeInteger(value.size) || value.size <= 16 || value.size > MAX_BYTES || !/^[a-f0-9]{64}$/.test(value.sha256)) throw new Error('Thông tin xác minh cập nhật không hợp lệ.');
    if (compareVersions(window.NL_VERSION, value.minimumRuntimeVersion) < 0) throw new Error('Bản này cần bộ app mới. Vui lòng tải từ trang GitHub.');
    return value;
  }
  function setStatus(message) { if (status) status.textContent = message; }
  function render() {
    checkButton.disabled = busy;
    installButton.disabled = busy;
    installButton.hidden = !manifest;
    installButton.textContent = window.NL_RESMODE === 'bundle' ? 'Cập nhật và mở lại' : 'Tải bản mới';
  }
  async function getJSON(url) {
    const response = await api.net.get(url, { allowRedirects: true, timeout: 15, headers: { 'User-Agent': 'TetCountdownApp-Updater', Accept: 'application/vnd.github+json' } });
    if (response.status === 404) return null;
    if (response.status !== 200) throw new Error('Không kết nối được máy chủ cập nhật.');
    if (response.body.length > 256 * 1024) throw new Error('Phản hồi cập nhật quá lớn.');
    return JSON.parse(response.body);
  }
  async function check({ silent = false } = {}) {
    if (busy || !initialized) return false;
    busy = true;
    manifest = null;
    setStatus('Đang kiểm tra phiên bản mới…');
    render();
    try {
      const release = await getJSON(API_URL);
      if (!release) { setStatus('Chưa có phiên bản phát hành trên GitHub.'); return false; }
      const version = String(release.tag_name || '').replace(/^v/, '');
      if (compareVersions(version, currentVersion()) <= 0) { setStatus('Bạn đang dùng phiên bản mới nhất: v' + currentVersion()); return false; }
      const asset = release.assets.find(item => item.name === 'update-manifest.json');
      if (!asset || !trustedAsset(asset.browser_download_url, version, 'update-manifest.json')) throw new Error('Bản mới chưa có gói cập nhật trực tiếp.');
      const value = await getJSON(asset.browser_download_url);
      if (!value) throw new Error('Chưa tải được thông tin bản mới.');
      manifest = validateManifest(value, release);
      setStatus('Có bản v' + manifest.version + ' · ' + (manifest.size / 1048576).toFixed(1) + ' MB. App sẽ tự mở lại sau cập nhật.');
      if (silent && typeof showToast === 'function') showToast('Có phiên bản mới v' + manifest.version + '. Mở Cài đặt để cập nhật.', 5000);
      return true;
    } catch (error) {
      console.warn('[TetUpdates]', error);
      setStatus(error.message || 'Không kiểm tra được cập nhật. Bạn có thể thử lại sau.');
      return false;
    } finally { busy = false; render(); }
  }
  const quote = value => {
    if (/["\r\n]/.test(value)) throw new Error('Đường dẫn cập nhật không hợp lệ.');
    return '"' + value + '"';
  };
  async function install() {
    if (busy || !manifest) return false;
    if (window.NL_RESMODE !== 'bundle') { await api.os.open(PAGE_URL); return false; }
    busy = true;
    render();
    const dir = window.NL_PATH + '/.update';
    const requestFile = dir + '/request.json';
    let poll;
    try {
      setStatus('Đang tải bản mới. Bạn vẫn có thể sử dụng app…');
      progress.hidden = false;
      progress.value = 0;
      try { await api.filesystem.createDirectory(dir); } catch (error) {
        // Existing update directory is expected after the first launch.
        const existing = await api.filesystem.getStats(dir);
        if (!existing.isDirectory) throw error;
      }
      const helper = await api.resources.readFile('/resources/update-helper.ps1');
      const helperPath = dir + '/helper.ps1';
      await api.filesystem.writeFile(helperPath, helper);
      const request = { appDir: window.NL_PATH, processId: window.NL_PID, version: manifest.version, url: manifest.resourcesURL, size: manifest.size, sha256: manifest.sha256 };
      // Only isolated developer tests pass restart arguments; normal releases do not.
      if (new URLSearchParams(location.search).has('test')) { request.testing = true; request.restartArgs = window.NL_ARGS.slice(1); }
      await api.filesystem.writeFile(requestFile, JSON.stringify(request));
      const baseCommand = 'powershell -NoProfile -NonInteractive -WindowStyle Hidden -ExecutionPolicy Bypass -File ' + quote(helperPath) + ' -RequestFile ' + quote(requestFile);
      poll = setInterval(async () => {
        try { const file = await api.filesystem.getStats(dir + '/resources.next.neu'); progress.value = Math.min(95, Math.floor(file.size / manifest.size * 95)); } catch {}
      }, 700);
      const result = await api.os.execCommand(baseCommand + ' -Action Download');
      clearInterval(poll);
      if (result.exitCode !== 0) throw new Error('Tải hoặc xác minh bản cập nhật thất bại. Bản hiện tại vẫn được giữ nguyên.');
      const verified = JSON.parse(result.stdOut.trim());
      if (!verified.verified || verified.size !== manifest.size) throw new Error('Không xác minh được bản cập nhật.');
      progress.value = 100;
      setStatus('Đã tải xong. Đang mở lại app…');
      // Detached helper waits for this exact process to exit, then replaces the
      // bundle atomically. It restores the previous bundle if startup fails.
      const child = await api.os.execCommand(baseCommand + ' -Action Apply', { background: true });
      if (!child.pid) throw new Error('Không khởi động được bộ cập nhật.');
      await api.app.exit();
      return true;
    } catch (error) {
      clearInterval(poll);
      progress.hidden = true;
      setStatus(error.message || 'Chưa cài được cập nhật. Vui lòng thử lại.');
      console.warn('[TetUpdates]', error);
      busy = false;
      render();
      return false;
    }
  }
  async function markReady() {
    if (window.NL_RESMODE !== 'bundle') return;
    try {
      const dir = window.NL_PATH + '/.update';
      try { await api.filesystem.createDirectory(dir); } catch (error) {
        // Existing update directory is expected after the first launch.
        const existing = await api.filesystem.getStats(dir);
        if (!existing.isDirectory) throw error;
      }
      await api.filesystem.writeFile(dir + '/ready.json', JSON.stringify({ version: currentVersion() }));
      const previous = JSON.parse((await api.filesystem.readFile(dir + '/result.json')).replace(/^\uFEFF/, ''));
      if (previous.status === 'rolled-back') setStatus('Bản mới gặp lỗi. App đã khôi phục phiên bản trước.');
    } catch { /* Chưa từng cập nhật. */ }
  }
  async function init() {
    if (initialized || !window.Neutralino) return;
    api = window.Neutralino;
    status = document.getElementById('update-status');
    checkButton = document.getElementById('btn-check-update');
    installButton = document.getElementById('btn-install-update');
    progress = document.getElementById('update-progress');
    if (!status || !checkButton || !installButton || !progress) return;
    initialized = true;
    document.getElementById('update-version').textContent = 'v' + currentVersion();
    checkButton.addEventListener('click', () => check());
    installButton.addEventListener('click', install);
    render();
    await markReady();
    if (new URLSearchParams(location.search).has('test')) return;
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date());
    try {
      if (await api.storage.getData('tet-update-last-check') === today) return;
    } catch { /* Lần đầu. */ }
    // The check is asynchronous and does not delay music or drawing the app.
    check({ silent: true }).then(() => api.storage.setData('tet-update-last-check', today)).catch(console.warn);
  }
  window.TetUpdates = { init, check, install, compareVersions, validateManifest, getState: () => ({ busy, available: manifest && manifest.version, currentVersion: currentVersion() }) };
})();
