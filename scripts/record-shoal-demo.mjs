// Record uninterrupted native interactions, then trim the black pre-roll exactly.
import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
const run = promisify(execFile);
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const output=path.join(root,'output/shoal-demo');
const qa=path.join(output,'qa-natural');
await fs.mkdir(qa,{recursive:true});
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE ? pathToFileURL(path.resolve(process.env.PLAYWRIGHT_MODULE)).href : 'playwright').catch(() => { throw new Error('Install Playwright or set PLAYWRIGHT_MODULE to its absolute index.mjs path. Set CHROMIUM_PATH for an existing browser.'); });
const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH ? {executablePath:process.env.CHROMIUM_PATH} : {})});
const context=await browser.newContext({viewport:{width:1920,height:1080},recordVideo:{dir:path.join(qa,'capture'),size:{width:1920,height:1080}}});
const page=await context.newPage();
const errors=[],snapshots=[];
page.on('pageerror',e=>errors.push(e.message));
await page.addInitScript(()=>{
  if(window.parent!==window)return;
  document.addEventListener('DOMContentLoaded',()=>{
    const mask=document.createElement('div');mask.id='recording-preroll';
    Object.assign(mask.style,{position:'fixed',inset:'0',background:'#000',zIndex:'2147483647'});
    document.documentElement.appendChild(mask);
  });
});
const entry=pathToFileURL(path.join(output,'shoal-bell-demo.html')).href+'?record=1';
let raw;
try{
  await page.goto(entry,{waitUntil:'load',timeout:60000});
  await page.waitForFunction(()=>window.shoalDemo?.ready,undefined,{timeout:60000});
  await page.mouse.move(1919,1079);
  await page.waitForTimeout(800);
  await page.evaluate(()=>{document.getElementById('recording-preroll')?.remove();window.shoalDemo.play();});
  for(const time of [2,20,40,52,62,64.7,81.5,93.5,104.5,110.8,115,119.5]){
    await page.waitForFunction(t=>window.shoalDemo.getTime()>=t,time,{timeout:60000});
    const frame=page.frames().find(f=>f.parentFrame());
    const text=await frame.locator('body').innerText();
    snapshots.push({time,text});
    await page.screenshot({path:path.join(qa,`frame-${time}.png`)});
    console.log(`Recorded ${time.toFixed(1)} / 120 seconds`);
  }
  await page.waitForFunction(()=>window.shoalDemo.getTime()>=120,undefined,{timeout:10000});
  await page.waitForTimeout(350);
  const video=page.video();await context.close();raw=await video.path();
}finally{await browser.close();}
if(errors.length)throw new Error(`Browser errors: ${errors.join('; ')}`);
const scan=await run('ffmpeg',['-hide_banner','-i',raw,'-t','15','-vf','blackdetect=d=0.2:pix_th=0.02','-an','-f','null','-'],{maxBuffer:4*1024*1024});
const match=scan.stderr.match(/black_start:[\d.]+ black_end:([\d.]+)/);
if(!match)throw new Error('Could not identify the black pre-roll; refusing an imprecise trim.');
const offset=Number(match[1]);
const staged=path.join(output,'shoal-bell-demo.next.mp4');
await run('ffmpeg',['-y','-hide_banner','-loglevel','error','-ss',String(offset),'-i',raw,'-vf','fps=30,tpad=stop_mode=clone:stop_duration=1,format=yuv420p','-t','120','-c:v','libx264','-preset','fast','-crf','18','-movflags','+faststart','-an',staged],{maxBuffer:4*1024*1024});
const probe=JSON.parse((await run('ffprobe',['-v','error','-show_entries','format=duration:stream=codec_name,codec_type,width,height,r_frame_rate','-of','json',staged])).stdout);
const video=probe.streams.find(s=>s.codec_type==='video');
if(Math.abs(Number(probe.format.duration)-120)>.05||video.width!==1920||video.height!==1080||video.r_frame_rate!=='30/1')throw new Error('Encoded movie did not meet duration/dimension/frame-rate contract.');
await fs.rename(staged,path.join(output,'shoal-bell-demo.mp4'));
await fs.writeFile(path.join(qa,'export-report.json'),JSON.stringify({offset,probe,errors,snapshots},null,2));
for(const [label,time] of [['first',0],['last',119.9]])await run('ffmpeg',['-y','-v','error','-ss',String(time),'-i',path.join(output,'shoal-bell-demo.mp4'),'-frames:v','1',path.join(qa,`video-${label}.png`)]);
const zip=path.join(output,'shoal-demo-current.next.zip');
await fs.rm(zip,{force:true});
await run('zip',['-j','-q',zip,path.join(output,'shoal-bell-demo.mp4'),path.join(output,'shoal-bell-demo.html'),path.join(output,'README.txt')]);
await fs.rename(zip,path.join(output,'shoal-demo-current.zip'));
const downloads=path.join(root,'public/demo-downloads');await fs.mkdir(downloads,{recursive:true});
for(const name of ['shoal-bell-demo.mp4','shoal-demo-current.zip']){
  const temporary=path.join(downloads,name+'.next');await fs.copyFile(path.join(output,name),temporary);await fs.rename(temporary,path.join(downloads,name));
}
console.log('Verified: 120s, 1920×1080, 30fps. Updated MP4, replay ZIP, and player downloads.');
