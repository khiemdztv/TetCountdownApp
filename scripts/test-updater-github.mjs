import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFile, writeFile, mkdir, cp, copyFile, mkdtemp, stat } from 'node:fs/promises';
import { spawn, spawnSync } from 'node:child_process';
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
async function installedResult(status) {
  for (let i = 0; i < 150; i++) {
    try { const result = JSON.parse((await readFile(join(app, '.update', 'result.json'), 'utf8')).replace(/^\uFEFF/, '')); if (result.status === status) return result; } catch {}
    await pause(300);
  }
  throw new Error('No updater result: ' + status);
}

try {
  await mkdir(app,{recursive:true});
  await copyFile(join(root,'native','TetCountdownApp.exe'),join(app,'TetCountdownApp.exe'));
  await cp(join(root,'assets','music'),join(app,'music'),{recursive:true});
  const old=await bundle('1.0.1');
  await copyFile(old.path,join(app,'resources.neu'));
  child=spawn(join(app,'TetCountdownApp.exe'),['--window-hidden=true','--window-skip-taskbar=true','--url=/index.html?test=1'],{cwd:app,windowsHide:true,stdio:'ignore',env:{...process.env,WEBVIEW2_USER_DATA_FOLDER:join(work,'profile')}});
  currentPid=child.pid;
  await connect('1.0.1');
  await page.evaluate(async()=>{await Neutralino.storage.setData('update-test-sentinel','preserved');});
  const connected=await page.evaluate(()=>TetUpdates.check());
  assert.equal(connected,true,await page.locator('#update-status').textContent());
  const state=await page.evaluate(()=>TetUpdates.getState());
  report.version=state.available;
  report.checks.push('Actual GitHub API and release manifest via unmocked native/Windows transport');
  const requestManifest=await page.evaluate(async()=>{
    const check=JSON.parse(await Neutralino.os.execCommand('powershell -NoProfile -NonInteractive -WindowStyle Hidden -ExecutionPolicy Bypass -File "'+NL_PATH+'/.update/check-helper.ps1" -Url "https://example.com/evil.json"').then(r=>JSON.stringify(r)));
    return check.exitCode;
  });
  assert.notEqual(requestManifest,0);
  report.checks.push('HTTP fallback rejects untrusted metadata URLs');
  await page.evaluate(()=>document.getElementById('btn-install-update').click());
  const result=await installedResult('installed');
  assert.equal(result.version,state.available);
  const installedConfig=JSON.parse(asar.extractFile(join(app,'resources.neu'),'neutralino.config.json').toString());
  assert.equal(installedConfig.version,state.available);
  assert.equal(JSON.parse(await readFile(join(app,'.update','ready.json'),'utf8')).version,state.available);
  const downloadRequest=JSON.parse(await readFile(join(app,'.update','request.json'),'utf8'));
  assert(downloadRequest.url.startsWith(repoURL));
  assert.equal(hash(await readFile(join(app,'resources.neu'))),downloadRequest.sha256);
  const storage=await readFile(join(app,'.storage','update-test-sentinel.neustorage'),'utf8');
  assert.equal(storage,'preserved');
  for (const name of ['tet-mix.opus','tet-playlist.opus','xuan-chill.opus']) assert.equal(hash(await readFile(join(app,'music',name))),hash(await readFile(join(root,'assets','music',name))));
  report.checks.push('Unmocked GitHub bundle download, SHA256, atomic install, restart/boot acknowledgment; settings/music preserved');
  report.passed=true;
  console.log(JSON.stringify(report,null,2));
} catch(error) {report.passed=false; report.failure=error.stack; throw error;}
finally {
  if(browser) await Promise.race([browser.close().catch(()=>{}),pause(2000)]);
  if(child&&child.exitCode===null) child.kill();
  const cleanup=join(work,'cleanup.ps1');
  await writeFile(cleanup,'param([string]$Exe)\nGet-Process | Where-Object { $_.Path -eq $Exe } | Stop-Process -Force');
  spawnSync('powershell',['-NoProfile','-NonInteractive','-WindowStyle','Hidden','-ExecutionPolicy','Bypass','-File',cleanup,'-Exe',join(app,'TetCountdownApp.exe')],{windowsHide:true});
  await writeFile(join(root,'verification','app-updater-github.json'),JSON.stringify(report,null,2));
}
