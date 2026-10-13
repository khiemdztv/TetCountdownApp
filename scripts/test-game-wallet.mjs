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

const KEY='tet-game-wallet-v1';
const walletFile=join(app,'.storage',KEY+'.neustorage');
const click=async selector=>{await page.locator(selector).evaluate(el=>el.click());await pause(100);};
const coins=()=>page.evaluate(()=>TetGames.wallet.getSnapshot().balance);
async function showGame(i) {
 await click('[data-tab="games"]');
 await page.waitForSelector('.game-toolbar');
 await page.evaluate(()=>TetGames.mount(document.getElementById('games-mount'),{sound:false,motion:false,petals:false}));
 await page.locator('.game-toolbar [role="tab"]').nth(i).evaluate(el=>el.click());await pause(200);
 assert.equal(Number((await page.locator('[data-wallet-balance]').textContent()).replace(/\D/g,'')),await coins());
}
async function launch() {
 child=spawn(join(app,'TetCountdownApp.exe'),['--window-hidden=true','--window-skip-taskbar=true','--url=/index.html?test=1'],{cwd:app,windowsHide:true,stdio:'ignore',env:{...process.env,WEBVIEW2_USER_DATA_FOLDER:join(work,'profile')}});
 currentPid=child.pid;await connect('1.0.4');
 await page.waitForFunction(()=>TetGames.wallet.getSnapshot().ready);
}
async function stopOwn() {
 if(page) {await page.evaluate(()=>TetGames.wallet.flush());await Promise.race([page.evaluate(()=>Neutralino.app.exit()).catch(()=>{}),pause(1500)]);}
 if(browser)await Promise.race([browser.close().catch(()=>{}),pause(1500)]);
 if(child&&child.exitCode===null)child.kill();browser=null;page=null;
}
try {
 await mkdir(join(app,'.storage'),{recursive:true});
 await copyFile(join(root,'native','TetCountdownApp.exe'),join(app,'TetCountdownApp.exe'));
 await cp(join(root,'assets','music'),join(app,'music'),{recursive:true});
 const old=await bundle('1.0.4');await copyFile(old.path,join(app,'resources.neu'));
 const card=(rank,suit=0)=>({id:rank*4+suit,rank,suit});
 await writeFile(walletFile,JSON.stringify({schema:1,balance:1000,rewardAt:Date.now(),holds:{},rounds:{tien:{state:{hands:[[card(3)],[card(4)],[card(5)],[card(6)]],player:0,pile:[],leader:0,passed:[],first:false,winner:null,white:null,log:'Near-win fixture'},rewardPaid:false}}}));
 await launch();assert.equal(await coins(),1000);
 await showGame(0);await click('[aria-label="Đặt xu Bầu"]');assert.equal(await coins(),950);
 await showGame(1);assert.equal(await coins(),1000);
 report.checks.push('Unrolled dice stakes are refunded on game switch; every game shows the shared balance');
 await showGame(0);await click('[aria-label="Đặt xu Bầu"]');await click('[aria-label="Hoàn tác đặt xu"]');assert.equal(await coins(),1000);
 await page.evaluate(()=>{window.originalRandom=crypto.getRandomValues.bind(crypto);crypto.getRandomValues=arr=>{arr.fill(0);return arr;};});
 await click('[aria-label="Đặt xu Bầu"]');
 await page.locator('.shake-button').evaluate(el=>el.click());
 await showGame(1);assert.equal(await coins(),1150);
 await showGame(0);assert.equal(await coins(),1150);
 await showGame(1);await click('[aria-label="Đặt xu Tài"]');await click('.sic-shake-button');
 await page.waitForSelector('.sic-open');assert.equal(await coins(),1100);
 await page.evaluate(()=>{crypto.getRandomValues=window.originalRandom;Math.random=()=>.999;});
 report.checks.push('Bầu Cua payout survives leaving during animation; Tài Xỉu losses debit the same wallet once');
 await showGame(2);await click('.tien-hand .playing-card');await click('.tien-game .gold-action');
 assert.equal(await coins(),1250);await showGame(0);await showGame(2);assert.equal(await coins(),1250);
 report.checks.push('Tiến Lên win credits 150 Xu once; remounting the won hand grants nothing extra');
 await showGame(3);await click('.xi-actions .gold-action');
 assert.equal(await coins(),1200);
 assert.equal(await page.locator('.xi-player-hand .playing-card').count(),2);
 await showGame(4);
 await page.waitForFunction(()=>!document.querySelector('.poker-controls .card-actions button:nth-child(2)').disabled);
 await click('.poker-controls .card-actions button:nth-child(2)');
 assert.equal(await coins(),1180);
 await page.waitForFunction(()=>!document.querySelector('.poker-controls .card-actions button:first-child').disabled);
 await click('.poker-controls .card-actions button:first-child');
 await showGame(0);assert.equal(await coins(),1180);
 report.checks.push('Xì Dách stake and Poker call debit the same wallet; unfinished card hands persist');
 const firstOrigin=new URL(page.url()).origin;
 await stopOwn();
 const saved=JSON.parse(await readFile(walletFile,'utf8'));
 assert.equal(saved.balance,1180);assert.equal(saved.rounds.xi.phase,'play');assert.equal(saved.rounds.tien.rewardPaid,true);
 saved.rewardAt-=2*5*60*60*1000;await writeFile(walletFile,JSON.stringify(saved));
 await launch();assert.equal(await coins(),3180);
 report.origins=[firstOrigin,new URL(page.url()).origin];
 await showGame(2);assert.equal(await coins(),3180);
 await showGame(3);assert.equal(await coins(),3180);
 assert.equal(await page.locator('.xi-player-hand .playing-card').count(),2);
 for(let i=0;i<3;i++){await page.getByRole('button',{name:'Rút bài',exact:true}).evaluate(el=>el.click());await pause(100);}
 await page.waitForFunction(()=>document.querySelector('.xi-actions .gold-action')?.textContent.includes('Ván mới'));
 assert.equal(await coins(),3280);
 await showGame(4);assert.equal(await coins(),3280);
 await showGame(0);assert.equal(await coins(),3280);
 report.checks.push('Actual native restart/origin change retains coins and card hands; 10 offline hours grant exactly 2000 Xu');
 await stopOwn();await launch();assert.equal(await coins(),3280);
 report.checks.push('Second restart does not repeat offline rewards or winning-hand payouts');
 assert.deepEqual(report.errors,[]);report.passed=true;console.log(JSON.stringify(report,null,2));
} catch(error) {report.passed=false;report.failure=error.stack;throw error;}
finally {
 if(page)await stopOwn().catch(()=>{});
 if(child&&child.exitCode===null)child.kill();
 await writeFile(join(root,'verification','game-wallet.json'),JSON.stringify(report,null,2));
}
