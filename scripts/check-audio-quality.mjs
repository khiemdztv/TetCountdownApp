import { spawn } from 'node:child_process';
import { readFile, writeFile, mkdir, readdir, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
const index=process.argv.indexOf('--ffmpeg');
const bin=index>=0?process.argv[index+1]:'ffmpeg';
const report={albums:[],sources:[],errors:[]};
async function run(args) {
 return new Promise((resolve,reject)=>{
  const child=spawn(bin,args,{windowsHide:true,stdio:['ignore','ignore','pipe']});let output='';
  child.stderr.on('data',chunk=>{output+=chunk.toString();});child.on('error',reject);
  child.on('exit',code=>{if(code!==0)reject(new Error(output.slice(-3000)));else resolve(output);});
 });
}
try {
 await mkdir(join(root,'verification'),{recursive:true});
 for(const name of ['tet-mix.opus','xuan-chill.opus','tet-playlist.opus']){
  console.log('Checking entire album: '+name);
  const audioPath=join(root,'assets','music',name),logPath=join(root,'verification',name+'.audio.log');
  const reusable=process.argv.includes('--reuse')&&(await stat(logPath).catch(()=>({mtimeMs:0}))).mtimeMs>=(await stat(audioPath)).mtimeMs;
  const log=reusable?await readFile(logPath,'utf8'):await run(['-hide_banner','-nostats','-i',audioPath,'-af','ebur128=peak=true:framelog=verbose','-f','null','-']);
  const end=log.slice(log.lastIndexOf('Summary:'));
  const metrics={file:name,stream:log.match(/Audio: [^\r\n]+/)?.[0],bitrateKbps:Number(log.match(/bitrate:\s*(\d+) kb\/s/)?.[1]),integratedLUFS:Number(end.match(/I:\s*(-?[\d.]+) LUFS/)?.[1]),loudnessRange:Number(end.match(/LRA:\s*([\d.]+) LU/)?.[1]),truePeakDb:Number(end.match(/Peak:\s*(-?[\d.]+) dBFS/)?.[1]),decodeErrors:/Error while decoding|Invalid data|corrupt|Packet corrupt/i.test(log)};
  if(metrics.decodeErrors||!Number.isFinite(metrics.integratedLUFS))throw new Error('Invalid decoded album: '+name);
  const gains={'tet-mix.opus':0.3589,'xuan-chill.opus':0.2786,'tet-playlist.opus':0.3090};
  metrics.playbackGain=gains[name];metrics.playbackTruePeakDb=metrics.truePeakDb+20*Math.log10(gains[name]);metrics.playbackLUFS=metrics.integratedLUFS+20*Math.log10(gains[name]);
  if(metrics.playbackTruePeakDb>-2)throw new Error('Playback headroom too small: '+name);
  report.albums.push(metrics);await writeFile(join(root,'verification',name+'.audio.log'),log);
  console.log(JSON.stringify(metrics));
 }
 for(const name of (await readdir(root)).filter(name=>name.endsWith('.mp3'))){
  const log=await run(['-hide_banner','-nostats','-i',join(root,name),'-t','0.01','-vn','-f','null','-']);
  report.sources.push({file:name,stream:log.match(/Audio: [^\r\n]+/)?.[0],bitrateKbps:Number(log.match(/bitrate:\s*(\d+) kb\/s/)?.[1])});
 }
 report.passed=true;console.log(JSON.stringify(report,null,2));
} catch(error){report.passed=false;report.failure=error.stack;throw error;}
finally {await mkdir(join(root,'verification'),{recursive:true});await writeFile(join(root,'verification','audio-quality.json'),JSON.stringify(report,null,2));}
