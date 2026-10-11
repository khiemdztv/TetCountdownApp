import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFile, writeFile, mkdir, mkdtemp, copyFile, cp } from 'node:fs/promises';
import { spawn, execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import sharp from 'sharp';
const root = fileURLToPath(new URL('../',import.meta.url));
const require = createRequire(import.meta.url), R=require('resedit'), asar=require('@electron/asar');
const work = await mkdtemp(join(tmpdir(),'tet-brand-test-'));
const version=JSON.parse(await readFile(join(root,'package.json'),'utf8')).version;
const source=join(root,'dist','release','v'+version,'TetCountdownApp');
const app=join(work,'app');
await cp(source,app,{recursive:true});
const dir=join(work,'bundle');
asar.extractAll(join(app,'resources.neu'),dir);
const cfg=JSON.parse(await readFile(join(dir,'neutralino.config.json'),'utf8'));
cfg.url='/index.html?test=1';cfg.modes.window.hidden=true;cfg.modes.window.skipTaskbar=true;
await writeFile(join(dir,'neutralino.config.json'),JSON.stringify(cfg));
await asar.createPackage(dir,join(app,'resources.neu'));
const exe=join(app,'TetCountdownApp.exe');
const resource=R.NtExecutableResource.from(R.NtExecutable.from(await readFile(exe)));
const expected=R.Data.IconFile.from(await readFile(join(root,'assets','icon.ico')));
for(const group of R.Resource.IconGroupEntry.fromEntries(resource.entries)){
 const actual=group.getIconItemsFromEntries(resource.entries);
 assert.equal(actual.length,7);
 actual.forEach((icon,i)=>assert.deepEqual(Buffer.from(icon.bin),Buffer.from(expected.icons[i].data.bin)));
}
const info=R.Resource.VersionInfo.fromEntries(resource.entries)[0];
assert.equal(info.getStringValues(info.getAllLanguagesForStringValues()[0]).FileDescription,'TetCountdownApp');
const out=join(root,'verification');await mkdir(out,{recursive:true});
const child=spawn(exe,[],{cwd:app,windowsHide:true,stdio:'ignore',env:{...process.env,WEBVIEW2_USER_DATA_FOLDER:join(work,'profile')}});
try {
 let result;
 for(let attempt=0;attempt<60;attempt++){
  await new Promise(r=>setTimeout(r,250));
  try {
   if(!JSON.parse(await readFile(join(app,'.update','ready.json'),'utf8')).version)continue;
   result=JSON.parse(execFileSync('powershell',['-NoProfile','-NonInteractive','-File',join(root,'scripts','inspect-native-branding.ps1'),'-AppProcessId',String(child.pid),'-OutputDirectory',out],{encoding:'utf8',windowsHide:true}));
   break;
  }catch{}
 }
 assert(result,'Native window did not finish booting');
 assert.equal(result.executable,'TetCountdownApp.exe');assert.equal(result.description,'TetCountdownApp');assert.equal(result.product,'TetCountdownApp');
 const actual=await sharp(join(out,'window-icon-big.png')).ensureAlpha().raw().toBuffer();
 const expectedPixels=await sharp(join(root,'assets','icon.png')).ensureAlpha().raw().toBuffer();
 let difference=0;
 for(let i=0;i<actual.length;i++)difference+=Math.abs(actual[i]-expectedPixels[i]);
 assert(difference/actual.length<2,'Native icon pixels differ from chibi artwork');
 const report={passed:true,...result,embeddedSizes:[16,24,32,48,64,128,256],averagePixelDifference:difference/actual.length};
 await writeFile(join(out,'native-branding.json'),JSON.stringify(report,null,2));
 console.log(JSON.stringify(report,null,2));
}finally{child.kill();}
