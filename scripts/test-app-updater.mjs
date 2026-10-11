import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFile, writeFile, mkdir, cp, copyFile, mkdtemp, stat } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createServer as netServer } from 'node:net';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
const require = createRequire(import.meta.url), asar = require('@electron/asar');
const { chromium } = createRequire(new URL('../_build/package.json', import.meta.url))('playwright-core');
const pause = ms => new Promise(r => setTimeout(r, ms));
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const report = { checks: [], errors: [] };
const work = await mkdtemp(join(tmpdir(), 'tet-update-test-'));
const app = join(work, 'app');
const port = await new Promise(r => { const s = netServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => r(p)); }); });
const endpoint = 'http://127.0.0.1:' + port;
let browser, page, child, currentPid, server, serving;
const repoURL = 'https://github.com/khiemdztv/TetCountdownApp/releases/download/';
async function bundle(version, broken = false) {
  const stage = join(work, 'stage-' + version);
  await cp(join(root, 'native', 'resources'), join(stage, 'resources'), { recursive: true, filter: p => !p.replaceAll('\\', '/').includes('/resources/music') });
  const cfg = JSON.parse(await readFile(join(root, 'native', 'neutralino.config.json'), 'utf8'));
  cfg.version = version;
  cfg.modes.window.webviewArgs += ' --remote-debugging-port=' + port;
  if (broken) await writeFile(join(stage, 'resources', 'index.html'), '<!doctype html><title>Broken fixture</title><p>Boot failed</p>');
  await writeFile(join(stage, 'neutralino.config.json'), JSON.stringify(cfg));
  const path = join(work, 'resources-' + version + '.neu');
  await asar.createPackage(stage, path);
  return { path, bytes: await readFile(path) };
}
async function connect(version) {
  for (let i = 0; i < 160; i++) {
    try {
      browser = await chromium.connectOverCDP(endpoint, { timeout: 1500 });
      page = browser.contexts()[0].pages().find(p => /127\.0\.0\.1/.test(p.url()));
      if (page) {
        page.setDefaultTimeout(10000);
        await page.waitForFunction(v => window.TetUpdates?.getState().currentVersion === v && document.getElementById('app-version').textContent, version, { timeout: 1500 });
        currentPid = await page.evaluate(() => window.NL_PID);
        page.on('pageerror', e => report.errors.push(e.message));
        return;
      }
      await browser.close(); browser = null;
    } catch { if (browser) await browser.close().catch(() => {}); browser = null; }
    await pause(300);
  }
  throw new Error('Bundled app did not boot v' + version);
}
async function fixtures(version, bytes, sha = hash(bytes)) {
  const manifest = { applicationId: 'com.tetcountdown.app2027', protocol: 1, version, minimumRuntimeVersion: '6.10.0', resourcesURL: repoURL + 'v' + version + '/resources.neu', size: bytes.length, sha256: sha };
  const release = { tag_name: 'v' + version, draft: false, prerelease: false, assets: [
    { name: 'resources.neu', browser_download_url: manifest.resourcesURL, size: manifest.size },
    { name: 'update-manifest.json', browser_download_url: repoURL + 'v' + version + '/update-manifest.json' }
  ] };
  serving = bytes;
  await page.evaluate(({manifest,release,localURL}) => {
    Neutralino.net.get = async url => ({ status: 200, body: JSON.stringify(url.includes('api.github.com') ? release : manifest) });
    if (!window.realExec) {
      window.realExec = Neutralino.os.execCommand.bind(Neutralino.os);
      Neutralino.os.execCommand = async (command, options) => {
        if (command.endsWith('-Action Download')) {
          const file = NL_PATH + '/.update/request.json';
          const request = JSON.parse(await Neutralino.filesystem.readFile(file));
          request.url = window.fixtureURL;
          await Neutralino.filesystem.writeFile(file, JSON.stringify(request));
        }
        return window.realExec(command, options);
      };
    }
    window.fixtureURL = localURL;
  }, { manifest, release, localURL: 'http://127.0.0.1:' + server.address().port + '/resources.neu' });
  assert.equal(await page.evaluate(() => TetUpdates.check()), true);
  return { manifest, release };
}
async function installedResult(status) {
  for (let i = 0; i < 150; i++) {
    try { const result = JSON.parse((await readFile(join(app, '.update', 'result.json'), 'utf8')).replace(/^\uFEFF/, '')); if (result.status === status) return result; } catch {}
    await pause(300);
  }
  throw new Error('No updater result: ' + status);
}
try {
  await mkdir(app, { recursive: true });
  await copyFile(join(root, 'native', 'TetCountdownApp.exe'), join(app, 'TetCountdownApp.exe'));
  await cp(join(root, 'assets', 'music'), join(app, 'music'), { recursive: true });
  const musicBefore = await Promise.all(['tet-mix.opus','tet-playlist.opus','xuan-chill.opus'].map(async name => hash(await readFile(join(app, 'music', name)))));
  const old = await bundle('1.0.0'), next = await bundle('1.0.1'), broken = await bundle('1.0.2', true);
  await copyFile(old.path, join(app, 'resources.neu'));
  child = spawn(join(app, 'TetCountdownApp.exe'), ['--window-hidden=true','--window-skip-taskbar=true','--url=/index.html?test=1'], {
    cwd: app, windowsHide: true, stdio: 'ignore', env: { ...process.env, WEBVIEW2_USER_DATA_FOLDER: join(work, 'profile') }
  });
  currentPid = child.pid;
  await connect('1.0.0');
  assert.equal(await page.evaluate(() => NL_RESMODE), 'bundle');
  await page.waitForFunction(() => typeof Music !== 'undefined' && Music.el?.readyState >= 2);
  assert.equal(await page.evaluate(() => Music.el.paused), false);
  report.checks.push('Portable ASAR bundle boots; external music mounts and plays');
  await page.evaluate(async () => {
    await Neutralino.storage.setData('update-test-sentinel', 'preserved');
    await Neutralino.storage.setData('tet-last-popup-date', '2026-10-20');
    Neutralino.net.get = async () => ({status:404,body:''});
  });
  assert.equal(await page.evaluate(() => TetUpdates.check()), false);
  assert.match(await page.locator('#update-status').textContent(), /Chưa có/);
  report.checks.push('Empty GitHub Releases handled');
  server = createServer((req,res) => { res.writeHead(200, {'Content-Length': serving.length}); res.end(serving); });
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const fixture = await fixtures('1.0.1', next.bytes, '0'.repeat(64));
  const validations = await page.evaluate(({manifest,release}) => {
    const checks = [
      ['applicationId','wrong'],['protocol',2],['size',40*1024*1024],['sha256','bad'],
      ['resourcesURL','https://example.com/resources.neu'],['minimumRuntimeVersion','99.0.0']
    ].map(([key,value]) => { try { TetUpdates.validateManifest({...manifest,[key]:value},release); return false; } catch { return true; } });
    return { checks, comparison:TetUpdates.compareVersions('1.10.0','1.2.0') };
  }, fixture);
  assert(validations.checks.every(Boolean)); assert.equal(validations.comparison,1);
  assert.equal(await page.evaluate(() => TetUpdates.install()), false);
  assert.equal(hash(await readFile(join(app, 'resources.neu'))), hash(old.bytes));
  assert.equal(await page.evaluate(() => Neutralino.storage.getData('update-test-sentinel')), 'preserved');
  report.checks.push('Invalid manifests rejected; SHA256 failure leaves installed bundle intact');
  await fixtures('1.0.1', next.bytes);
  await page.evaluate(() => { document.getElementById('btn-install-update').click(); });
  await installedResult('installed');
  await browser.close().catch(() => {}); browser = null;
  await connect('1.0.1');
  assert.equal(await page.evaluate(() => Neutralino.storage.getData('update-test-sentinel')), 'preserved');
  assert.equal(await page.evaluate(() => Neutralino.storage.getData('tet-last-popup-date')), '2026-10-20');
  assert.equal(hash(await readFile(join(app, 'resources.neu'))), hash(next.bytes));
  const musicAfter = await Promise.all(['tet-mix.opus','tet-playlist.opus','xuan-chill.opus'].map(async name => hash(await readFile(join(app, 'music', name)))));
  assert.deepEqual(musicAfter,musicBefore);
  report.checks.push('Real download, atomic install and restart to v1.0.1; storage and all music preserved');
  await fixtures('1.0.2', broken.bytes);
  await page.evaluate(() => { document.getElementById('btn-install-update').click(); });
  await installedResult('rolled-back');
  await browser.close().catch(() => {}); browser = null;
  await connect('1.0.1');
  assert.equal(hash(await readFile(join(app, 'resources.neu'))), hash(next.bytes));
  assert.equal(await page.evaluate(() => Neutralino.storage.getData('update-test-sentinel')), 'preserved');
  report.checks.push('Broken startup rolls back and relaunches previous version');
  assert.deepEqual(report.errors, []);
  report.passed = true;
  console.log(JSON.stringify(report,null,2));
} catch (e) { report.passed = false; report.failure = e.stack; throw e; }
finally {
  if (page) await page.evaluate(() => Neutralino.app.exit()).catch(() => {});
  if (browser) await browser.close().catch(() => {});
  if (currentPid) { try { process.kill(currentPid); } catch {} }
  if (child && child.exitCode === null) child.kill();
  if (server) server.close();
  await mkdir(join(root, 'verification'), { recursive:true });
  await writeFile(join(root, 'verification', 'app-updater.json'), JSON.stringify(report,null,2));
}
