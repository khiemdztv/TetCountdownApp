'use strict';
/*
 * Kiem tra THAT chuc nang "tu khoi dong cung Windows".
 * Chay bang Electron de co API that:  electron scripts/test-autostart.js
 */

const { app } = require('electron');
const fs = require('fs');
const path = require('path');

const autostart = require('../src/autostart.js');

let fails = 0;
function check(label, cond, extra = '') {
  const mark = cond ? 'OK  ' : 'FAIL';
  if (!cond) fails++;
  console.log(`${mark} ${label}${extra ? '  -> ' + extra : ''}`);
}

app.whenReady().then(() => {
  const appData = app.getPath('appData');

  console.log('=== KIEM TRA TU KHOI DONG CUNG WINDOWS ===');
  console.log('Thu muc Startup :', autostart.startupDir(appData));
  console.log('File shortcut   :', autostart.shortcutPath(appData));
  console.log('');

  const lnk = autostart.shortcutPath(appData);
  const hadLnkBefore = fs.existsSync(lnk);
  console.log(`(Trang thai ban dau: shortcut ${hadLnkBefore ? 'DANG CO' : 'chua co'})`);
  console.log('');

  // ---------- 1. Don sach truoc khi thu ----------
  autostart.uninstall(appData);
  check('Sau khi go cai dat thi khong con shortcut', !fs.existsSync(lnk));
  check('isInstalled() tra ve false', autostart.isInstalled(appData) === false);

  // ---------- 2. Bat tu khoi dong ----------
  const res = autostart.install({
    appDataDir: appData,
    targetPath: process.execPath,
    args: '',
    workingDir: path.dirname(process.execPath),
    iconPath: path.join(__dirname, '..', 'assets', 'icon.ico'),
  });

  check('install() bao thanh cong', res.ok === true, JSON.stringify(res));
  check('File shortcut duoc tao that', fs.existsSync(lnk));
  check('isInstalled() tra ve true', autostart.isInstalled(appData) === true);

  // ---------- 3. Doc lai va xac minh noi dung ----------
  const info = autostart.readShortcut(appData);
  console.log('');
  console.log('Noi dung shortcut doc lai:');
  console.log('  TargetPath :', info.TargetPath);
  console.log('  WorkingDir :', info.WorkingDirectory);
  console.log('  Icon       :', info.IconLocation);
  console.log('  Mo ta      :', info.Description);
  console.log('');

  check('TargetPath dung file thuc thi', info.TargetPath === process.execPath);
  check(
    'WorkingDirectory dung',
    info.WorkingDirectory === path.dirname(process.execPath)
  );
  check('Co gan icon', !!info.IconLocation && info.IconLocation.length > 0);
  check('Icon tro toi file co that', fs.existsSync(info.IconLocation.replace(/,\d+$/, '')));

  // ---------- 4. Tat tu khoi dong ----------
  const un = autostart.uninstall(appData);
  check('uninstall() bao da go', un.ok === true && un.removed === true);
  check('File shortcut da bi xoa', !fs.existsSync(lnk));
  check('isInstalled() tro ve false', autostart.isInstalled(appData) === false);

  // ---------- 5. Tat lai lan nua khong loi ----------
  const un2 = autostart.uninstall(appData);
  check('Tat lai lan hai khong loi', un2.ok === true && un2.removed === false);

  console.log('');
  console.log(fails === 0 ? '=== TAT CA DEU DAT ===' : `=== CO ${fails} MUC KHONG DAT ===`);

  setTimeout(() => app.exit(fails === 0 ? 0 : 1), 150);
});
