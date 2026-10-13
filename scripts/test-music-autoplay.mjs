import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdir, mkdtemp, writeFile, readFile, unlink, cp, copyFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createServer } from 'node:net';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
const require = createRequire(new URL('../_build/package.json', import.meta.url));
const { chromium } = require('playwright-core');
const report = { checks: [], errors: [] };
let session;
async function start() {
  const port = await new Promise(resolve => { const server = createServer(); server.listen(0, '127.0.0.1', () => { const port = server.address().port; server.close(() => resolve(port)); }); });
  const profile = await mkdtemp(join(tmpdir(), 'tet-music-autoplay-'));
  const endpoint = 'http://127.0.0.1:' + port;
  const configName = 'ui-test-' + port + '-' + Date.now() + '.config.json';
  const appDir=join(profile,'app');
  await mkdir(appDir,{recursive:true});
  await cp(join(root,'native','resources'),join(appDir,'resources'),{recursive:true});
  await copyFile(join(root,'native','TetCountdownApp.exe'),join(appDir,'TetCountdownApp.exe'));
  const configPath = join(appDir, configName);
  const config = JSON.parse(await readFile(join(root, 'native', 'neutralino.config.json'), 'utf8'));
  config.modes.window.webviewArgs = (config.modes.window.webviewArgs || '') + ' --remote-debugging-port=' + port;
  await writeFile(configPath, JSON.stringify(config));
  const child = spawn(join(appDir, 'TetCountdownApp.exe'), ['--config-file=/' + configName, '--window-hidden=true', '--window-skip-taskbar=true', '--url=/index.html?test=1', '--window-title=Tet-Music-Test'], {
    cwd: appDir, windowsHide: true, stdio: 'ignore',
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
    await unlink(configPath);
    return { browser, page, child };
  } catch (error) { child.kill(); await unlink(configPath).catch(() => {}); throw error; }
}
async function stop() { if (session) { await session.browser.close(); session.child.kill(); session = null; } }
// Runtime.evaluate with userGesture=false prevents the test itself from
// granting autoplay permission. The first playing event records activation.
async function readState(cdp) {
  const result = await cdp.send('Runtime.evaluate', {
    expression: `typeof Music !== 'undefined' && Music.el ? ({
      paused: Music.el.paused, muted: Music.el.muted, volume: Music.el.volume, userVolume: Music.volume, gain: Music.song?.playbackGain,
      time: Music.el.currentTime, firstPlayback: Music.firstPlayback,
      loaded: Music.el.readyState, name: document.getElementById('music-name').textContent,
      hint: !!document.getElementById('play-hint'),
      toast: document.getElementById('toast-text').textContent,
      booted: !!document.getElementById('app-version').textContent,
      credit: document.getElementById('powered-by')?.textContent,
      creditRect: (()=>{const rect=s=>{const r=document.querySelector(s).getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom};};return {credit:rect('#powered-by'),version:rect('#app-version'),status:rect('.statusbar'),footer:rect('.app-credit'),viewportHeight:innerHeight};})()
    }) : null`,
    returnByValue: true, userGesture: false,
  });
  return result.result.value;
}
try {
  report.launches = [];
  for (let i = 0; i < 2; i++) {
    const started = Date.now();
    session = await start();
    const cdp = await session.page.context().newCDPSession(session.page);
    let state;
    for (let tries = 0; tries < 80; tries++) {
      state = await readState(cdp);
      if (state?.firstPlayback && state.booted) break;
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    assert(state?.firstPlayback, 'Music did not start without input');
    assert.equal(state.paused, false);
    assert.equal(state.muted, false);
    assert(state.volume > 0);
    assert(Math.abs(state.volume-state.userVolume*state.gain)<1e-6);
    assert.equal(state.firstPlayback.userActivated, false, 'Test input unlocked autoplay');
    assert.equal(state.hint, false);
    assert.equal(state.credit,'Powered by khiemdztv');
    assert(state.creditRect.credit.right < state.creditRect.version.left);
    assert(state.creditRect.credit.left - state.creditRect.footer.left < 20);
    assert(state.creditRect.footer.right - state.creditRect.version.right < 20);
    assert(state.creditRect.status.bottom <= state.creditRect.footer.top + 1);
    assert(state.creditRect.footer.bottom <= state.creditRect.viewportHeight);
    assert.equal(state.toast, '');
    await session.page.waitForFunction(()=>!Music.el.seeking&&Music.el.readyState>=3&&!Music.el.paused);
    const settled=await readState(cdp);
    await session.page.waitForFunction(time=>Music.el.currentTime>time+.2,settled.time);
    const progressed=await readState(cdp);
    report.launches.push({ ...state, launchMilliseconds: Date.now() - started, progressed: progressed.time });
    // Pause intentionally: no delayed startup retry should override the user.
    await cdp.send('Runtime.evaluate', { expression: "document.getElementById('btn-play').click()", userGesture: false });
    await new Promise(resolve => setTimeout(resolve, 700));
    assert.equal((await readState(cdp)).paused, true);
    await cdp.send('Runtime.evaluate', { expression: "document.getElementById('btn-play').click()", userGesture: false });
    await new Promise(resolve => setTimeout(resolve, 300));
    assert.equal((await readState(cdp)).paused, false);
    await session.page.evaluate(()=>document.activeElement?.blur());
    await session.page.keyboard.press('Space');
    assert.equal((await readState(cdp)).paused,true);
    await session.page.evaluate(()=>window.dispatchEvent(new KeyboardEvent('keydown',{code:'Space',key:' ',repeat:true,cancelable:true})));
    assert.equal((await readState(cdp)).paused,true,'Holding Space toggled repeatedly');
    await session.page.locator('#btn-play').focus();
    await session.page.keyboard.press('Space');
    await new Promise(r=>setTimeout(r,100));
    assert.equal((await readState(cdp)).paused,false,'Focused play button toggled twice');
    await session.page.locator('#music-volume').focus().catch(()=>{});
    await session.page.evaluate(()=>{const input=document.createElement('textarea');input.id='shortcut-test-input';document.body.append(input);input.focus();});
    await session.page.keyboard.press('Space');
    assert.equal((await readState(cdp)).paused,false,'Typing Space interrupted music');
    await session.page.evaluate(()=>document.getElementById('shortcut-test-input').remove());
    report.checks.push('Space pauses/resumes once per press; ignores key repeat and text entry');
    await stop();
  }
  report.checks.push('Two fresh WebView2 profiles: audible autoplay with no user activation');
  report.checks.push('Actual playback clock advances; no music prompt or hint');
  report.checks.push('Pause stays paused; resume still works');
  assert.deepEqual(report.errors, []);
  report.passed = true;
  console.log(JSON.stringify(report, null, 2));
} catch (error) { report.passed = false; report.failure = error.stack; throw error; }
finally {
  await mkdir(join(root, 'verification'), { recursive: true });
  await writeFile(join(root, 'verification', 'music-autoplay.json'), JSON.stringify(report, null, 2));
  await stop();
}
