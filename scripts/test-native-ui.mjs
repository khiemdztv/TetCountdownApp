// Integration checks against the actual Neutralino WebView2, not a mock.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdir, writeFile, mkdtemp, readFile, unlink } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createServer } from 'node:net';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
const require = createRequire(new URL('../_build/package.json', import.meta.url));
const { chromium } = require('playwright-core');
let child;
let endpoint = process.argv[2];
if (!endpoint) {
  const port = await new Promise(resolve => {
    const server = createServer();
    server.listen(0, '127.0.0.1', () => { const port = server.address().port; server.close(() => resolve(port)); });
  });
  const profile = await mkdtemp(join(tmpdir(), 'tet-countdown-ui-'));
  endpoint = 'http://127.0.0.1:' + port;
  const configName = 'ui-test-' + port + '-' + Date.now() + '.config.json';
  const configPath = join(root, 'native', configName);
  const config = JSON.parse(await readFile(join(root, 'native', 'neutralino.config.json'), 'utf8'));
  config.modes.window.webviewArgs = (config.modes.window.webviewArgs || '') + ' --remote-debugging-port=' + port;
  await writeFile(configPath, JSON.stringify(config));
  child = spawn(join(root, 'native', 'TetCountdownApp.exe'), ['--config-file=/' + configName, '--window-hidden=true', '--window-skip-taskbar=true', '--url=/index.html?test=1', '--window-title=Tet-UI-Test'], {
    cwd: join(root, 'native'), windowsHide: true,
    env: { ...process.env, WEBVIEW2_USER_DATA_FOLDER: profile, WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS: '--remote-debugging-port=' + port },
    stdio: 'ignore'
  });
  for (let i = 0; i < 60; i++) {
    try { const response = await fetch(endpoint + '/json/version'); if (response.ok) break; } catch {}
    if (i === 59) { child.kill(); await unlink(configPath).catch(() => {}); throw new Error('Test WebView2 did not start'); }
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  await unlink(configPath);
}
const browser = await chromium.connectOverCDP(endpoint);
const context = browser.contexts()[0];
const page = context.pages()[0] || await context.waitForEvent('page');
await page.waitForURL(/127\.0\.0\.1/, { waitUntil: 'domcontentloaded' });
assert(page && new URL(page.url()).searchParams.has('test'), 'Use an isolated ?test=1 instance');
page.setDefaultTimeout(8000);
const errors = [];
page.on('pageerror', e => errors.push(e.message));
const out = root + 'verification/';
await mkdir(out, { recursive: true });
const report = { tabs: {}, games: {}, layouts: [], errors };
const wait = () => page.waitForTimeout(250);
const until = predicate => page.waitForFunction(predicate, null, { polling: 100 });
const tab = async name => { await page.locator('[data-tab="' + name + '"]').evaluate(el => el.click()); await wait(); };
const game = async i => { await page.locator('.game-toolbar [role="tab"]').nth(i).evaluate(el => el.click()); await wait(); };
try {
  await page.waitForTimeout(1800);
  report.viewport = await page.evaluate(() => [innerWidth, innerHeight, devicePixelRatio]);
  for (const name of ['countdown', 'calendar', 'wishes']) {
    await tab(name);
    report.tabs[name] = await page.evaluate(name => {
      const el = document.querySelector('[data-panel="' + name + '"]');
      return { height: el.clientHeight, content: el.scrollHeight, overflow: el.scrollHeight - el.clientHeight };
    }, name);
    assert.equal(report.tabs[name].overflow, 0, name + ' overflows');
  }
  console.log('Three main tabs: no overflow');
  await tab('games');
  // Observe real audio nodes and lifecycle without replacing the audio engine.
  await page.evaluate(() => {
    let seed = 0x1234;
    Math.random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
    window.__tetAudio = [];
    const Original = window.AudioContext;
    window.AudioContext = new Proxy(Original, { construct(target, args) {
      const ctx = new target(...args), gains = [], entry = { ctx, gains, oscillators: 0 };
      const createGain = ctx.createGain.bind(ctx), createOscillator = ctx.createOscillator.bind(ctx);
      ctx.createGain = () => { const gain = createGain(); gains.push(gain); return gain; };
      ctx.createOscillator = () => { entry.oscillators++; return createOscillator(); };
      window.__tetAudio.push(entry);
      return ctx;
    }});
    window.TetGames.mount(document.getElementById('games-mount'), { sound: true, motion: false, petals: false });
  });
  await game(0);
  await page.getByRole('button', { name: 'Đặt xu Bầu', exact: true }).evaluate(el => el.click());
  assert.match(await page.getByLabel('Số dư', { exact: true }).textContent(), /950/);
  await page.getByLabel('Hoàn tác đặt xu', { exact: true }).evaluate(el => el.click());
  assert.match(await page.getByLabel('Số dư', { exact: true }).textContent(), /1.000/);
  for (let i = 0; i < 3; i++) {
    await page.getByLabel('Đặt xu Bầu', { exact: true }).evaluate(el => el.click());
    await page.locator('.shake-button').evaluate(el => el.click());
    await until(() => document.querySelector('.bowl-stage.opened'));
  }
  report.games.bau = { rounds: await page.locator('.history-roll').count(), dice: await page.locator('.dice-row .game-die').count() };
  assert.equal(report.games.bau.rounds, 3);
  assert.equal(report.games.bau.dice, 3);
  await game(1);
  for (let i = 0; i < 3; i++) {
    await page.getByLabel('Đặt xu Tài', { exact: true }).evaluate(el => el.click());
    await page.locator('.sic-shake-button').evaluate(el => el.click());
    await until(() => document.querySelector('.sic-open'));
  }
  report.games.sic = { rounds: await page.locator('.sic-history b').count(), result: await page.locator('.sic-result').textContent() };
  assert.equal(report.games.sic.rounds, 3);
  await game(2);
  let played = 0, passed = 0;
  for (let i = 0; i < 3; i++) {
    await page.getByLabel('Gợi ý bài', { exact: true }).waitFor();
    await until(() => !document.querySelector('[aria-label="Gợi ý bài"]').disabled);
    await page.getByLabel('Gợi ý bài', { exact: true }).evaluate(el => el.click());
    const play = page.locator('.tien-game .gold-action');
    if (await play.isEnabled()) { await play.evaluate(el => el.click()); played++; }
    else {
      const skip = page.getByRole('button', { name: 'Bỏ lượt', exact: true });
      assert(await skip.isEnabled(), 'No valid Tiến Lên action');
      await skip.evaluate(el => el.click()); passed++;
    }
    await wait();
  }
  report.games.tien = { played, passed, remainingCards: await page.locator('.tien-hand .playing-card').count() };
  assert.equal(played + passed, 3);
  await game(3);
  for (let round = 0; round < 3; round++) {
    await page.locator('.xi-actions .gold-action').evaluate(el => el.click());
    for (let move = 0; move < 6; move++) {
      const hit = page.getByRole('button', { name: 'Rút bài', exact: true });
      if (await hit.count() === 0) break;
      const stand = page.getByRole('button', { name: 'Dằn', exact: true });
      if (await stand.isEnabled()) { await stand.evaluate(el => el.click()); break; }
      if (await hit.isEnabled()) await hit.evaluate(el => el.click());
      await wait();
    }
    await until(() => document.querySelector('.xi-actions .gold-action')?.textContent.includes('Ván mới'));
  }
  report.games.xi = { rounds: 3, result: await page.locator('.xi-table-center p').textContent() };
  await game(4);
  for (let round = 0; round < 2; round++) {
    for (let move = 0; move < 120; move++) {
      if (await page.getByLabel('Ván Poker mới', { exact: true }).isEnabled()) break;
      const call = page.locator('.poker-controls .card-actions button').nth(1);
      if (await call.isEnabled()) await call.evaluate(el => el.click());
      await page.waitForTimeout(100);
    }
    assert(await page.getByLabel('Ván Poker mới', { exact: true }).isEnabled(), 'Poker did not finish');
    if (round === 0) await page.getByLabel('Ván Poker mới', { exact: true }).evaluate(el => el.click());
  }
  report.games.poker = { rounds: 2, result: await page.locator('.poker-center p').textContent() };
  console.log('All five games: played multiple rounds/turns');
  await page.getByLabel('Bật nhạc nền', { exact: true }).evaluate(el => el.click());
  await page.waitForTimeout(700);
  report.audioOn = await page.evaluate(() => window.__tetAudio.map(a => ({ state: a.ctx.state, master: a.gains[0].gain.value, music: a.gains[1].gain.value, oscillators: a.oscillators })));
  assert(report.audioOn.some(a => a.state === 'running' && a.music > .2));
  await page.getByLabel('Tắt nhạc nền', { exact: true }).evaluate(el => el.click());
  await page.getByLabel('Tắt âm thanh trò chơi', { exact: true }).evaluate(el => el.click());
  await until(() => window.__tetAudio.every(a => a.gains[0].gain.value < .001 && a.gains[1].gain.value < .001));
  report.audioOff = await page.evaluate(() => window.__tetAudio.map(a => ({ master: a.gains[0].gain.value, music: a.gains[1].gain.value })));
  assert(report.audioOff.every(a => a.master < .001 && a.music < .001));
  await tab('countdown');
  report.audioClosed = await page.evaluate(() => window.__tetAudio.every(a => a.ctx.state === 'closed'));
  assert(report.audioClosed);
  for (let i = 0; i < 3; i++) { await tab('games'); await tab('calendar'); }
  await tab('games');
  assert.equal(await page.locator('.tet-games-tab').count(), 1);
  assert.equal(await page.evaluate(() => window.TetGames.lastError()), null);
  console.log('Audio gain, mute, close and remount: passed');
  // Resize the actual native window, including a short and a narrow viewport.
  const originalSize = await page.evaluate(() => Neutralino.window.getSize());
  try {
    for (const size of [[752,732], [752,600], [660,600]]) {
      await page.evaluate(async ([width,height]) => { const cur = await Neutralino.window.getSize(); const scale = cur.width / innerWidth; await Neutralino.window.setSize({ width: Math.round(width*scale), height: Math.round(height*scale) }); }, size);
      await page.waitForTimeout(350);
      await game(0);
      const layout = await page.evaluate(() => {
        const panel = document.querySelector('.games-view'), bounds = panel.getBoundingClientRect();
        return { viewport: [innerWidth,innerHeight], overflowY: getComputedStyle(panel).overflowY, scroll: panel.scrollHeight-panel.clientHeight, tiles: [...document.querySelectorAll('.bet-tile')].map(t => { const r=t.getBoundingClientRect(), a=t.querySelector('.symbol-art').getBoundingClientRect(); return [r.width,r.height,a.width,a.height]; }), documentScroll: document.documentElement.scrollHeight - innerHeight, images: [...document.querySelectorAll('.bau-cua img')].every(i => i.complete&&i.naturalWidth>0), bounds: [bounds.width,bounds.height] };
      });
      assert.equal(layout.tiles.length, 6);
      assert(layout.tiles.every(([w,h,aw,ah]) => w>50 && Math.abs(w-h)<1 && Math.abs(aw-ah)<1));
      assert(layout.images);
      assert.equal(layout.overflowY, 'auto');
      report.layouts.push(layout);
      for (let i=0;i<5;i++) {
        await game(i);
        const fit = await page.evaluate(() => { const host=document.querySelector('#games-mount'), surface=document.querySelector('.game-surface');return {host:host.clientHeight,surface:surface.scrollHeight,height:surface.clientHeight}; });
        assert(fit.surface <= fit.height+1, 'Game ' + i + ' clipped');
      }
      await game(0);
      }
  } finally { await page.evaluate(size => Neutralino.window.setSize(size), originalSize); }
  await tab('countdown');
  assert.deepEqual(errors, []);
  report.passed = true;
  console.log('Square artwork at three native window sizes: passed');
} catch (error) { report.passed = false; report.failure = error.stack; throw error; }
finally { await writeFile(out + 'native-ui.json', JSON.stringify(report,null,2)); await browser.close(); if (child) child.kill(); }
