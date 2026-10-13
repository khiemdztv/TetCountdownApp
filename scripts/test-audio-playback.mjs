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

async function sample(analyserName,ms=1200) {
 return session.page.evaluate(async({analyserName,ms})=>{
  const analyser=window[analyserName],data=new Float32Array(analyser.fftSize);
  let peak=0,sum=0,count=0,clipped=0;
  const end=performance.now()+ms;
  while(performance.now()<end){
    analyser.getFloatTimeDomainData(data);
    for(const x of data){peak=Math.max(peak,Math.abs(x));sum+=x*x;count++;if(Math.abs(x)>=1)clipped++;}
    await new Promise(r=>setTimeout(r,16));
  }
  return {peak,rms:Math.sqrt(sum/count),clipped,count};
 },{analyserName,ms});
}
try {
 session=await start();const page=session.page;
 await page.waitForFunction(()=>Music.el?.readyState>=2&&document.getElementById('app-version').textContent);
 await page.evaluate(async()=>{
  const ctx=new AudioContext(),source=ctx.createMediaElementSource(Music.el),analyser=ctx.createAnalyser(),mute=ctx.createGain();
  analyser.fftSize=4096;mute.gain.value=0;
  source.connect(analyser);analyser.connect(mute);mute.connect(ctx.destination);
  window.musicAnalyser=analyser;window.musicProbe=ctx;await ctx.resume();Music.setVolume(1);
 });
 const songs=await page.evaluate(()=>Music.songs.map((s,index)=>({...s,index})));
 report.samples=[];
 for(const albumId of [...new Set(songs.map(s=>s.albumId))]) {
   const album=songs.filter(s=>s.albumId===albumId);
   for(const song of [album[0],album[Math.floor(album.length/2)],album.at(-1)]) {
    await page.evaluate(i=>Music.playFrom(i,{autoplay:false}),song.index);
    await page.waitForFunction(file=>Music.el.src.includes(file)&&Music.el.readyState>=2,song.file);
    const time=song.start+Math.min(20,(song.end-song.start)/2);
    await page.evaluate(time=>{Music.el.currentTime=time;Music.resume();},time);
    await page.waitForFunction(time=>!Music.el.seeking&&Math.abs(Music.el.currentTime-time)<4,time);
    const signal=await sample('musicAnalyser');
    assert(signal.rms>.001,'No audible decoded signal: '+song.title);
    assert.equal(signal.clipped,0,'Clipping in rendered music: '+song.title);
    report.samples.push({title:song.title,albumId,volume:await page.evaluate(()=>Music.el.volume),...signal});
   }
 }
 // Sample the actual game output bus at maximum game volume; mute only the
 // hardware sink so this test does not play sound in the user's workspace.
 await page.evaluate(()=>{
   const Original=window.AudioContext;
   window.AudioContext=new Proxy(Original,{construct(Target,args){
    const ctx=new Target(...args),analyser=ctx.createAnalyser(),mute=ctx.createGain();
    analyser.fftSize=4096;mute.gain.value=0;analyser.connect(mute);mute.connect(ctx.destination);
    const createGain=ctx.createGain.bind(ctx);
    ctx.createGain=()=>{
      const gain=createGain(),connect=gain.connect.bind(gain);
      gain.connect=(destination,...rest)=>connect(destination===ctx.destination?analyser:destination,...rest);
      return gain;
    };
    window.gameAnalyser=analyser;return ctx;
   }});
   document.querySelector('[data-tab="games"]').click();
   TetGames.mount(document.getElementById('games-mount'),{sound:true,motion:true,petals:false});
 });
 await page.waitForSelector('.game-toolbar');
 await page.getByLabel('Âm lượng trò chơi',{exact:true}).focus();
 await page.keyboard.press('End');
 assert.equal(await page.getByLabel('Âm lượng trò chơi',{exact:true}).inputValue(),'100');
 await page.getByLabel('Bật nhạc nền',{exact:true}).evaluate(el=>el.click());
 await page.locator('.game-toolbar [role="tab"]').first().evaluate(el=>el.click());
 await page.getByLabel('Đặt xu Bầu',{exact:true}).evaluate(el=>el.click());
 await page.locator('.shake-button').evaluate(el=>el.click());
 report.gameOutput=await sample('gameAnalyser',1800);
 assert(report.gameOutput.rms>.001);assert.equal(report.gameOutput.clipped,0);
 report.checks.push('Nine actual WebView2 playback excerpts: non-silent PCM and no clipping at 100% user volume');
 report.checks.push('Actual game effects and background melody at maximum game volume: non-silent PCM and no clipping');
 assert.deepEqual(report.errors,[]);report.passed=true;console.log(JSON.stringify(report,null,2));
} catch(error){report.passed=false;report.failure=error.stack;throw error;}
finally {
 await mkdir(join(root,'verification'),{recursive:true});
 await writeFile(join(root,'verification','audio-playback.json'),JSON.stringify(report,null,2));
 await stop();
}
