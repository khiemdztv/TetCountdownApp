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
const report = { checks: [], errors: [] };
let session;
async function start() {
  const port = await new Promise(resolve => { const server = createServer(); server.listen(0, '127.0.0.1', () => { const port = server.address().port; server.close(() => resolve(port)); }); });
  const profile = await mkdtemp(join(tmpdir(), 'tet-music-autoplay-'));
  const endpoint = 'http://127.0.0.1:' + port;
  const configName = 'ui-test-' + port + '-' + Date.now() + '.config.json';
  const configPath = join(root, 'native', configName);
  const config = JSON.parse(await readFile(join(root, 'native', 'neutralino.config.json'), 'utf8'));
  config.modes.window.webviewArgs = (config.modes.window.webviewArgs || '') + ' --remote-debugging-port=' + port;
  await writeFile(configPath, JSON.stringify(config));
  const child = spawn(join(root, 'native', 'TetCountdownApp.exe'), ['--config-file=/' + configName, '--window-hidden=true', '--window-skip-taskbar=true', '--url=/index.html?test=1', '--window-title=Tet-Music-Test'], {
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
    await unlink(configPath);
    return { browser, page, child };
  } catch (error) { child.kill(); await unlink(configPath).catch(() => {}); throw error; }
}
async function stop() { if (session) { await session.browser.close(); session.child.kill(); session = null; } }

try {
  session = await start();
  const page = session.page;
  await page.waitForFunction(() => typeof Music !== 'undefined' && Music.el?.readyState >= 2 && document.getElementById('app-version').textContent);
  await page.evaluate(() => { Music.el.pause(); Music.el.volume = 0; Music.shuffle = false; });
  const playlist = await page.evaluate(() => Music.songs.map((s,i) => ({...s,index:i,length:Music.lengthOf(i),display:document.querySelector('.playlist-item[data-index="'+i+'"] .pl-item-time').textContent})));
  const album = playlist.filter(s => s.albumId === 'tet-playlist');
  assert.equal(playlist.length,50);
  assert.equal(album.length,9);
  assert.deepEqual(album.map(s=>s.display),['3:10','3:32','3:13','3:16','2:03','2:45','3:43','3:10','4:28']);
  report.playlist = album;
  for(const song of album) {
    await page.locator('.playlist-item[data-index="'+song.index+'"]').evaluate(el=>el.click());
    await page.waitForFunction(({index,start})=>Music.current===index && Music.el.readyState>=2 && Math.abs(Music.el.currentTime-start)<3,{index:song.index,start:song.start});
    await page.evaluate(()=>Music.el.pause());
    const position = await page.evaluate(()=>Music.el.currentTime);
    assert(Math.abs(position-song.start)<3,'Wrong song seek: '+song.title);
  }
  // Metadata of another album must never change the final track's label.
  report.albumEnds=[];
  for(const last of playlist.filter((s,i)=>i===playlist.length-1 || playlist[i+1].albumId!==s.albumId)) {
    await page.evaluate(index=>{Music.el.pause();Music.playFrom(index,{autoplay:false});},last.index);
    await page.waitForFunction(file=>Music.el.src.includes(file)&&Music.el.readyState>=2,last.file);
    const metadata=await page.evaluate(index=>({duration:Music.el.duration,end:Music.endOf(index),length:Music.lengthOf(index),labels:[...document.querySelectorAll('.pl-item-time')].map(el=>el.textContent)}),last.index);
    assert(Math.abs(metadata.duration-metadata.end)<.03,'Album duration disagrees with audio metadata');
    assert.deepEqual(metadata.labels,playlist.map(s=>s.display),'Track lengths changed after loading another album');
    report.albumEnds.push({title:last.title,...metadata,labels:undefined});
  }
  await page.evaluate(index=>{Music.playFrom(index,{autoplay:false});},album.at(-1).index);
  await page.waitForFunction(()=>Music.el.src.includes('tet-playlist.opus')&&Music.el.readyState>=2);
  await page.evaluate(()=>Music.seekFraction(.8));
  const seek=await page.evaluate(()=>({time:Music.el.currentTime,start:Music.song.start,length:Music.lengthOf(Music.current)}));
  assert(Math.abs(seek.time-(seek.start+.8*seek.length))<.1);
  await page.evaluate(()=>{Music.el.currentTime=Music.el.duration-.7;Music.resume();});
  await page.waitForFunction(()=>Music.song.albumId==='bui-cong-nam'&&Music.sameAlbum().indexOf(Music.current)===0);
  report.checks.push('Nine songs seek to their own starts; displayed lengths checked');
  report.checks.push('All three album endings match real audio metadata; labels remain stable across albums');
  report.checks.push('Seeking and automatic transition from final track to next album work');
  assert.deepEqual(report.errors,[]);
  report.passed=true;
  console.log(JSON.stringify(report,null,2));
} catch(error) { report.passed=false;report.failure=error.stack;throw error; }
finally {
  await mkdir(join(root,'verification'),{recursive:true});
  await writeFile(join(root,'verification','music-playlist.json'),JSON.stringify(report,null,2));
  await stop();
}
