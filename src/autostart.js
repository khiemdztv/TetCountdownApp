'use strict';
/*
 * Quan ly "tu khoi dong cung Windows" bang shortcut trong thu muc Startup.
 * Tach rieng de kiem tra duoc doc lap va de bao tri.
 */

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const SHORTCUT_NAME = 'Tet Countdown 2027.lnk';

/** Thu muc Startup cua Windows: ...\\Start Menu\\Programs\\Startup */
function startupDir(appDataDir) {
  return path.join(appDataDir, 'Microsoft', 'Windows', 'Start Menu', 'Programs', 'Startup');
}

function shortcutPath(appDataDir) {
  return path.join(startupDir(appDataDir), SHORTCUT_NAME);
}

function isInstalled(appDataDir) {
  if (process.platform !== 'win32') return false;
  return fs.existsSync(shortcutPath(appDataDir));
}

/** Bao ve chuoi khi nhung vao lenh PowerShell (nhay don -> nhan doi). */
function q(s) {
  return String(s).replace(/'/g, "''");
}

/**
 * Tao shortcut trong Startup.
 * @param {object} o
 * @param {string} o.appDataDir  thu muc AppData\\Roaming
 * @param {string} o.targetPath  file .exe cua app
 * @param {string} [o.args]      tham so dong lenh (che do dev)
 * @param {string} o.workingDir  thu muc lam viec
 * @param {string} [o.iconPath]  file .ico
 */
function install({ appDataDir, targetPath, args, workingDir, iconPath }) {
  if (process.platform !== 'win32') {
    return { ok: false, reason: 'unsupported-platform' };
  }

  const lnk = shortcutPath(appDataDir);
  fs.mkdirSync(path.dirname(lnk), { recursive: true });

  const hasIcon = iconPath && fs.existsSync(iconPath);

  const script = [
    "$ErrorActionPreference = 'Stop'",
    '$ws = New-Object -ComObject WScript.Shell',
    `$s = $ws.CreateShortcut('${q(lnk)}')`,
    `$s.TargetPath = '${q(targetPath)}'`,
    args ? `$s.Arguments = '${q(args)}'` : '',
    `$s.WorkingDirectory = '${q(workingDir)}'`,
    "$s.Description = 'Dem nguoc Tet Nguyen Dan 2027'",
    hasIcon ? `$s.IconLocation = '${q(iconPath)},0'` : '',
    '$s.Save()',
  ]
    .filter(Boolean)
    .join('; ');

  execFileSync(
    'powershell.exe',
    ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', script],
    { windowsHide: true, stdio: 'ignore' }
  );

  return { ok: true, path: lnk, exists: fs.existsSync(lnk) };
}

/** Xoa shortcut khoi Startup. */
function uninstall(appDataDir) {
  if (process.platform !== 'win32') {
    return { ok: false, reason: 'unsupported-platform' };
  }
  const lnk = shortcutPath(appDataDir);
  if (fs.existsSync(lnk)) {
    fs.unlinkSync(lnk);
    return { ok: true, removed: true, path: lnk };
  }
  return { ok: true, removed: false, path: lnk };
}

/** Doc lai noi dung shortcut de xac minh (dung cho kiem tra). */
function readShortcut(appDataDir) {
  const lnk = shortcutPath(appDataDir);
  if (!fs.existsSync(lnk)) return null;

  const script = [
    '$ws = New-Object -ComObject WScript.Shell',
    `$s = $ws.CreateShortcut('${q(lnk)}')`,
    '[pscustomobject]@{ TargetPath = $s.TargetPath; Arguments = $s.Arguments;',
    'WorkingDirectory = $s.WorkingDirectory; IconLocation = $s.IconLocation;',
    'Description = $s.Description } | ConvertTo-Json -Compress',
  ].join('; ');

  const out = execFileSync(
    'powershell.exe',
    ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', script],
    { encoding: 'utf8', windowsHide: true }
  ).trim();

  return JSON.parse(out);
}

module.exports = {
  SHORTCUT_NAME,
  startupDir,
  shortcutPath,
  isInstalled,
  install,
  uninstall,
  readShortcut,
};
