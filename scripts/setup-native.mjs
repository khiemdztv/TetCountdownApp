import { mkdir, readFile, writeFile, copyFile, cp, access, mkdtemp } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
const root = fileURLToPath(new URL('../', import.meta.url));
const require = createRequire(import.meta.url), extract = require('extract-zip');
const native = join(root, 'native'), res = join(native, 'resources');
for (const name of ['js', 'icons', 'fonts', 'img', 'music']) await mkdir(join(res,name), {recursive:true});
const exe = join(native,'TetCountdown2027-win_x64.exe');
try { await access(exe); }
catch {
  const url = 'https://github.com/neutralinojs/neutralinojs/releases/download/v6.10.0/neutralinojs-v6.10.0.zip';
  const response = await fetch(url);
  if (!response.ok) throw new Error('Runtime download failed: ' + response.status);
  const bytes = Buffer.from(await response.arrayBuffer());
  const digest = createHash('sha256').update(bytes).digest('hex');
  if (digest !== 'e633f480737f229f582d8ec6165a52d789340950aef062560702122389f08329') throw new Error('Runtime SHA256 mismatch');
  const temp = await mkdtemp(join(tmpdir(),'tet-runtime-'));
  const zip = join(temp,'runtime.zip');
  await writeFile(zip,bytes);
  await extract(zip,{dir:temp});
  await copyFile(join(temp,'neutralino-win_x64.exe'),exe);
}
await copyFile(join(root,'vendor','neutralino.js'),join(res,'js','neutralino.js'));
await copyFile(join(root,'assets','icon.png'),join(res,'icons','appIcon.png'));
await copyFile(join(root,'assets','tray-64.png'),join(res,'icons','trayIcon.png'));
for (const name of ['fonts','img','music']) await cp(join(root,'assets',name),join(res,name),{recursive:true});
console.log('Native runtime and assets ready. Run npm run sync && npm run build:games.');
