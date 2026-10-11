import { createRequire } from 'node:module';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url), ResEdit = require('resedit');
const root = fileURLToPath(new URL('../', import.meta.url));
export async function brandNative({input=join(root,'native','TetCountdown2027-win_x64.exe'),output=join(root,'native','TetCountdownApp.exe'),version}={}) {
  if(resolve(input) === resolve(output)) throw new Error('Keep the original runtime as a separate source file');
  version ||= JSON.parse(await readFile(join(root,'package.json'),'utf8')).version;
  const exe = ResEdit.NtExecutable.from(await readFile(input));
  const resources = ResEdit.NtExecutableResource.from(exe);
  const icons = ResEdit.Data.IconFile.from(await readFile(join(root,'assets','icon.ico')));
  const groups = ResEdit.Resource.IconGroupEntry.fromEntries(resources.entries);
  for(const group of groups.length ? groups : [{id:1,lang:1033}]) {
    ResEdit.Resource.IconGroupEntry.replaceIconsForResource(resources.entries,group.id,group.lang,icons.icons.map(item=>item.data));
  }
  const versions = ResEdit.Resource.VersionInfo.fromEntries(resources.entries);
  for(const info of versions.length ? versions : [ResEdit.Resource.VersionInfo.createEmpty()]) {
    const languages = info.getAllLanguagesForStringValues();
    for(const language of languages.length ? languages : [{lang:1033,codepage:1200}]) {
      info.setFileVersion(version+'.0',language.lang); info.setProductVersion(version+'.0',language.lang);
      info.setStringValues(language,{FileDescription:'TetCountdownApp',ProductName:'TetCountdownApp',InternalName:'TetCountdownApp',OriginalFilename:'TetCountdownApp.exe'});
    }
    info.outputToResourceEntries(resources.entries);
  }
  resources.outputResource(exe);
  await writeFile(output,Buffer.from(exe.generate()));
  return output;
}
if(process.argv[1] && resolve(process.argv[1])===fileURLToPath(import.meta.url)) console.log(await brandNative());
