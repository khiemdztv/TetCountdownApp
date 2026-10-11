import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdir, mkdtemp, writeFile, readFile, unlink } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createServer } from 'node:net';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
const require = createRequire(new URL('../_build/package.json', import.meta.url));
const { chromium } = require('playwright-core');
const key = 'daily-event-popup-test-date';
const report = { checks: [], errors: [] };
let session;
async function start() {
  const port = await new Promise(resolve => { const server = createServer(); server.listen(0, '127.0.0.1', () => { const port = server.address().port; server.close(() => resolve(port)); }); });
  const profile = await mkdtemp(join(tmpdir(), 'tet-event-popup-'));
  const endpoint = 'http://127.0.0.1:' + port;
  const configName = 'ui-test-' + port + '-' + Date.now() + '.config.json';
  const configPath = join(root, 'native', configName);
  const config = JSON.parse(await readFile(join(root, 'native', 'neutralino.config.json'), 'utf8'));
  config.modes.window.webviewArgs = (config.modes.window.webviewArgs || '') + ' --remote-debugging-port=' + port;
  await writeFile(configPath, JSON.stringify(config));
  const child = spawn(join(root, 'native', 'TetCountdown2027-win_x64.exe'), ['--config-file=/' + configName, '--window-hidden=true', '--window-skip-taskbar=true', '--url=/index.html?test=1', '--window-title=Tet-Popup-Test'], {
    cwd: join(root, 'native'), windowsHide: true, stdio: 'ignore',
    env: { ...process.env, WEBVIEW2_USER_DATA_FOLDER: profile, WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS: '--remote-debugging-port=' + port },
  });
  try {
    for (let i = 0; i < 60; i++) {
      try { if ((await fetch(endpoint + '/json/version')).ok) break; } catch {}
      if (i === 59) throw new Error('Test WebView2 did not start');
      await new Promise(resolve => setTimeout(resolve, 250));
    }
    const browser = await chromium.connectOverCDP(endpoint);
    const context = browser.contexts()[0];
    const page = context.pages()[0] || await context.waitForEvent('page');
    await page.waitForURL(/127\.0\.0\.1/, { waitUntil: 'domcontentloaded' });
    page.setDefaultTimeout(8000);
    page.on('pageerror', e => report.errors.push(e.message));
    await page.waitForFunction(() => window.DailyEventPopup, null, { polling: 100 });
    await page.evaluate(() => window.DailyEventPopup.ready);
    await unlink(configPath);
    return { browser, page, child };
  } catch (error) { child.kill(); await unlink(configPath).catch(() => {}); throw error; }
}
async function stop() { if (session) { await session.browser.close(); session.child.kill(); session = null; } }
const ready = () => session.page.evaluate(() => window.DailyEventPopup.ready);
const hidden = () => session.page.waitForFunction(() => document.getElementById('daily-event-popup').hidden, null, { polling: 50 });
const close = async () => { await session.page.locator('#daily-event-confirm').evaluate(el => el.click()); await hidden(); };
const date = async value => { await session.page.clock.setSystemTime(new Date(value)); await session.page.reload(); await session.page.waitForFunction(() => window.DailyEventPopup, null, { polling: 100 }); return ready(); };
try {
  session = await start();
  await session.page.evaluate(async key => { window.DailyEventPopup.close(); localStorage.removeItem('lastPopupDate'); await Neutralino.storage.setData(key, ''); }, key);
  await hidden();
  assert.equal(await date('2026-10-11T12:00:00+07:00'), false);
  assert.equal(await session.page.evaluate(() => localStorage.getItem('lastPopupDate')), null);
  report.checks.push('No event: hidden, no date stored');
  assert.equal(await date('2026-10-20T12:00:00+07:00'), true);
  assert.equal(await session.page.evaluate(() => localStorage.getItem('lastPopupDate')), '2026-10-20');
  assert.match(await session.page.locator('#daily-event-title').textContent(), /20\/10/);
  assert(await session.page.evaluate(() => document.querySelector('.workspace').inert));
  assert.equal(await session.page.evaluate(() => document.activeElement.id), 'daily-event-confirm');
  report.style = await session.page.evaluate(() => {
    const overlay = document.getElementById('daily-event-popup'), card = overlay.querySelector('.daily-event-card'), r = card.getBoundingClientRect(), cs = getComputedStyle(card);
    return { display: getComputedStyle(overlay).display, blur: getComputedStyle(overlay).backdropFilter, background: cs.backgroundImage, titleFont: getComputedStyle(document.getElementById('daily-event-title')).fontFamily, card: [r.width,r.height], fits: r.top>=0&&r.bottom<=innerHeight };
  });
  assert.equal(report.style.display, 'flex');
  assert.match(report.style.blur, /blur/);
  assert(report.style.fits);
  assert.equal(await session.page.evaluate(() => window.DailyEventPopup.check()), false);
  report.checks.push('Matching event: one popup, date saved immediately, premium CSS and focus');
  // Escape should close only the modal, never call the app tray shortcut.
  const escape = await session.page.evaluate(() => {
    let trayCalls = 0;
    const original = Neutralino.window.hide;
    Neutralino.window.hide = () => { trayCalls++; return Promise.resolve(); };
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    const closing = document.getElementById('daily-event-popup').classList.contains('is-closing');
    Neutralino.window.hide = original;
    return { trayCalls, closing };
  });
  assert.equal(escape.trayCalls, 0);
  assert(escape.closing);
  await hidden();
  assert.equal(await session.page.evaluate(() => document.querySelector('.workspace').inert), false);
  assert.equal(await date('2026-10-20T17:00:00+07:00'), false);
  report.checks.push('Escape fades out; background restored; same-day reload suppressed');
  const origin1 = new URL(session.page.url()).origin;
  await stop();
  session = await start();
  const origin2 = new URL(session.page.url()).origin;
  assert.notEqual(origin1, origin2);
  assert.equal(await date('2026-10-20T18:00:00+07:00'), false);
  assert.equal(await session.page.evaluate(() => localStorage.getItem('lastPopupDate')), '2026-10-20');
  report.origins = [origin1, origin2];
  report.checks.push('Actual app restart with new localhost port: still suppressed');
  assert.equal(await date('2026-11-20T12:00:00+07:00'), true);
  assert.match(await session.page.locator('#daily-event-title').textContent(), /20\/11/);
  await close();
  assert.equal(await date('2027-10-20T12:00:00+07:00'), true);
  assert.equal(await session.page.evaluate(() => localStorage.getItem('lastPopupDate')), '2027-10-20');
  await close();
  report.checks.push('Another event day and same MM-DD next year both show');
  assert.deepEqual(await session.page.evaluate(() => window.DailyEventPopup.dateInfo(new Date('2026-10-19T17:00:00Z'))), { monthDay:'10-20', fullDate:'2026-10-20' });
  report.checks.push('Vietnam midnight: MM-DD and YYYY-MM-DD correct');
  // Never interpret title/content as HTML.
  assert.equal(await session.page.evaluate(async () => {
    window.DailyEventPopup.specialEvents.push({ date:'10-21', title:'<img src=x onerror=alert(1)>', content:'<b>literal content</b>' });
    return window.DailyEventPopup.check(new Date('2027-10-21T12:00:00+07:00'));
  }), true);
  assert.equal(await session.page.locator('#daily-event-title img').count(), 0);
  assert.equal(await session.page.locator('#daily-event-content').textContent(), '<b>literal content</b>');
  await close();
  report.checks.push('Event text rendered safely');
  assert.deepEqual(report.errors, []);
  report.passed = true;
  console.log('Daily Event Popup: ' + report.checks.length + ' integration checks passed');
} catch (error) { report.passed = false; report.failure = error.stack; throw error; }
finally {
  if (session) await session.page.evaluate(key => Neutralino.storage.setData(key, ''), key).catch(() => {});
  await mkdir(join(root,'verification'), {recursive:true});
  await writeFile(join(root,'verification','daily-event-popup.json'), JSON.stringify(report,null,2));
  await stop();
}
