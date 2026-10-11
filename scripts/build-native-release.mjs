import { createRequire } from 'node:module';
import { readFile, writeFile, mkdir, cp, copyFile, stat, mkdtemp } from 'node:fs/promises';
import { createWriteStream } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const asar = require('@electron/asar');
const archiver = require('archiver');
const root = fileURLToPath(new URL('../', import.meta.url));
const arg = name => { const i = process.argv.indexOf(name); return i < 0 ? null : process.argv[i + 1]; };
export async function buildRelease({ version, output, includeMusic = true } = {}) {
  const pkg = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
  version ||= pkg.version;
  if (!/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(version)) throw new Error('Release requires a stable X.Y.Z version');
  output = resolve(output || join(root, 'dist', 'release', 'v' + version));
  await mkdir(output, { recursive: true });
  const staging = await mkdtemp(join(tmpdir(), 'tet-release-'));
  const resourcesDir = join(staging, 'resources');
  await cp(join(root, 'native', 'resources'), resourcesDir, { recursive: true, filter: path => !path.replaceAll('\\', '/').includes('/resources/music') });
  const config = JSON.parse(await readFile(join(root, 'native', 'neutralino.config.json'), 'utf8'));
  config.version = version;
  config.url = '/';
  // Bundle contains its configuration, so a resource update also changes version.
  await writeFile(join(staging, 'neutralino.config.json'), JSON.stringify(config, null, 2));
  const bundle = join(output, 'resources.neu');
  await asar.createPackage(staging, bundle);
  const files = asar.listPackage(bundle);
  if (!files.includes('\\resources\\index.html') && !files.includes('/resources/index.html')) throw new Error('Missing bundled index.html');
  if (files.some(file => /[\\/]music[\\/]/.test(file))) throw new Error('Music must not be inside the update bundle');
  const portable = join(output, 'TetCountdown2027');
  await mkdir(portable, { recursive: true });
  await copyFile(join(root, 'native', 'TetCountdown2027-win_x64.exe'), join(portable, 'TetCountdown2027-win_x64.exe'));
  await copyFile(bundle, join(portable, 'resources.neu'));
  await copyFile(join(root, 'LICENSE'), join(portable, 'LICENSE.txt'));
  await cp(join(root, 'vendor'), join(portable, 'licenses'), { recursive: true, filter: path => !path.endsWith('neutralino.js') });
  await cp(join(root, 'assets', 'fonts', 'licenses'), join(portable, 'licenses', 'fonts'), { recursive: true });
  if (includeMusic) await cp(join(root, 'assets', 'music'), join(portable, 'music'), { recursive: true });
  const guide = 'TẾT COUNTDOWN 2027 — v' + version + '\r\n\r\nGiải nén toàn bộ ZIP vào thư mục riêng, rồi mở TetCountdown2027-win_x64.exe.\r\nKhông di chuyển riêng file exe. Nhạc nằm trong thư mục music.\r\nCài đặt > Kiểm tra cập nhật để nhận bản mới mà không tải lại nhạc.\r\nThoát hẳn app bằng menu khay hệ thống > Thoát.\r\n\r\nSource: https://github.com/khiemdztv/TetCountdownApp\r\n';
  await writeFile(join(portable, 'HUONG-DAN.txt'), guide, 'utf8');
  const archiveName = 'TetCountdown2027-Windows-x64.zip';
  const archivePath = join(output, archiveName);
  await new Promise((done, fail) => {
    const stream = createWriteStream(archivePath);
    const archive = archiver('zip', { zlib: { level: 9 } });
    stream.on('close', done); stream.on('error', fail); archive.on('error', fail);
    archive.pipe(stream); archive.directory(portable, 'TetCountdown2027'); archive.finalize();
  });
  const hash = file => readFile(file).then(bytes => createHash('sha256').update(bytes).digest('hex'));
  const manifest = { applicationId: config.applicationId, protocol: 1, version, minimumRuntimeVersion: config.cli.binaryVersion,
    resourcesURL: 'https://github.com/khiemdztv/TetCountdownApp/releases/download/v' + version + '/resources.neu',
    size: (await stat(bundle)).size, sha256: await hash(bundle) };
  if (manifest.size > 32 * 1024 * 1024) throw new Error('Resource update exceeds the app updater limit (32 MiB)');
  await writeFile(join(output, 'update-manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  await writeFile(join(output, 'SHA256SUMS.txt'), manifest.sha256 + '  resources.neu\n' + await hash(archivePath) + '  ' + archiveName + '\n');
  return { output, portable, bundle, archivePath, manifest, archiveBytes: (await stat(archivePath)).size };
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  console.log(JSON.stringify(await buildRelease({ version: arg('--version'), output: arg('--output'), includeMusic: !process.argv.includes('--no-music') }), null, 2));
}
