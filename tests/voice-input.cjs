const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const fs = require('fs');
const path = require('path');
const http = require('http');
const assert = require('assert/strict');
const root = path.resolve(__dirname, '..');
const fixture = path.join(__dirname, 'voice-russian.wav');
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript','.mjs':'text/javascript','.wasm':'application/wasm','.json':'application/json','.onnx':'application/octet-stream','.wav':'audio/wav'};
(async()=>{
 const server=http.createServer((req,res)=>{
  const pathname=decodeURIComponent(new URL(req.url,'http://local').pathname);
  const file=pathname==='/test.wav'?fixture:path.join(root,pathname==='/'?'index.html':pathname);
  if(!file.startsWith(root) && pathname!='/test.wav'){res.writeHead(403);res.end();return;}
  if(!fs.existsSync(file)){res.writeHead(404);res.end();return;}
  res.setHeader('Content-Type',types[path.extname(file)]||'application/octet-stream');
  res.setHeader('Content-Length',fs.statSync(file).size);
  fs.createReadStream(file).pipe(res);
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({headless:true,channel:process.env.VOICE_TEST_CHANNEL || undefined,args:['--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream','--use-file-for-fake-audio-capture='+fixture]});
 try{
  const context=await browser.newContext({permissions:['microphone']});
  const page=await context.newPage();
  const errors=[];const requests=[];
  page.on('pageerror',e=>{errors.push(e.message);console.log('PAGE ERROR',e.message);});
  page.on('console',m=>{if(m.type()==='warning'||m.type()==='error')console.log('BROWSER',m.text());});
  page.on('response',r=>{if(r.status()>=400) console.log('HTTP',r.status(),r.url());});
  page.on('request',r=>requests.push(r.url()));
  await page.addInitScript(()=>{
    window.voiceDownloadProgress=[];
    const NativeWorker=window.Worker;
    window.Worker=class extends NativeWorker {
      constructor(...args){
        super(...args);
        this.addEventListener('message',({data})=>{
          if(data.type==='progress')voiceDownloadProgress.push(data.progress);
        });
      }
    };
  });
  await page.goto('http://127.0.0.1:'+server.address().port);
  await page.evaluate(()=>setLang('ru'));
  console.log('Recording real Russian audio via fake microphone...');
  await page.locator('#context').fill('Начало.');
  await page.locator('#voice-context').click();
  await page.waitForFunction(()=>voiceSession?.phase==='recording');
  await page.waitForTimeout(9000);
  await page.locator('#voice-context').click();
  console.log('Waiting for real WASM recognition...');
  await page.waitForFunction(()=>!voiceSession,{},{timeout:180000});
  const text=await page.locator('#context').inputValue();
  const status=await page.locator('#voice-status-context').innerText();
  console.log('TRANSCRIPT:',text); console.log('STATUS:',status);
  assert.match(text,/Начало\./);
  assert.match(text.toLowerCase(),/сайт/);
  assert.match(text.toLowerCase(),/проект/);
  assert.equal(status,'Текст добавлен.');
  assert.equal(await page.evaluate(()=>localStorage.getItem('pb_context')),text);
  assert.equal(await page.locator('#voice-context').getAttribute('aria-pressed'),'false');
  assert.equal(await page.evaluate(()=>voiceEngine.loaded),true);
  const progress=await page.evaluate(()=>voiceDownloadProgress);
  assert.ok(progress.length>0,'Model download must report progress');
  assert.ok(progress.every((value,index)=>value>=0&&value<=99&&(index===0||value>=progress[index-1])),'Overall download percentage must never go backwards');
  assert.equal(await page.locator('#voice-progress-context').isVisible(),false);
  assert.equal(requests.some(url=>!url.startsWith('http://127.0.0.1:')),false,'Speech must not need third-party requests');
  await page.evaluate(()=>undo());
  assert.equal(await page.locator('#context').inputValue(),'Начало.');
  console.log('Real Russian recording passed; checking state changes...');
  await page.locator('#voice-task').click();
  await page.waitForFunction(()=>voiceSession?.phase==='recording');
  const trackStopped=await page.evaluate(()=>{window.oldStream=voiceSession.stream;clearAll();return oldStream.getTracks().every(t=>t.readyState==='ended');});
  assert.equal(trackStopped,true);
  await page.waitForTimeout(500);
  assert.equal(await page.locator('#task').inputValue(),'');
  await page.locator('#voice-format').click();
  await page.waitForFunction(()=>voiceSession?.phase==='recording');
  await page.locator('#voice-limits').click();
  await page.waitForFunction(()=>voiceSession?.id==='limits'&&voiceSession.phase==='recording');
  await page.evaluate(()=>setLang('en'));
  assert.equal(await page.evaluate(()=>voiceSession),null);
  // A hidden tab stops capture but keeps the recorded speech for processing.
  await page.locator('#voice-task').click();
  await page.waitForFunction(()=>voiceSession?.phase==='recording');
  await page.waitForTimeout(1500);
  await page.evaluate(()=>{
    Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});
    document.dispatchEvent(new Event('visibilitychange'));
  });
  assert.equal(await page.evaluate(()=>voiceSession?.phase),'processing');
  assert.equal(await page.locator('#voice-progress-task').isVisible(),true);
  await page.evaluate(()=>document.dispatchEvent(new Event('visibilitychange')));
  assert.equal(await page.evaluate(()=>voiceSession?.phase),'processing');
  await page.evaluate(()=>{delete document.hidden;cancelVoice();});
  // A late permission grant must release the microphone after the form is cleared.
  await page.evaluate(()=>{
   window.originalGetUserMedia=navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
   navigator.mediaDevices.getUserMedia=()=>new Promise(resolve=>window.grantMicrophone=resolve);
  });
  await page.locator('#voice-task').click();
  await page.evaluate(async()=>{
   clearAll();
   const stream=await originalGetUserMedia({audio:true});
   window.lateStream=stream;
   grantMicrophone(stream);
  });
  await page.waitForFunction(()=>lateStream.getTracks().every(t=>t.readyState==='ended'));
  await page.evaluate(()=>{navigator.mediaDevices.getUserMedia=()=>Promise.reject(new DOMException('denied','NotAllowedError'));});
  await page.locator('#voice-task').click();
  await page.waitForFunction(()=>!voiceSession);
  assert.match(await page.locator('#voice-status-task').innerText(),/Allow microphone/);
  // Test a worker load failure and retry without leaving the microphone active.
  await page.evaluate(()=>{
   resetVoiceEngine();
   navigator.mediaDevices.getUserMedia=originalGetUserMedia;
   window.OriginalWorker=window.Worker;
   window.Worker=class {
    postMessage(){setTimeout(()=>this.onerror?.(new Error('test download error')),30);}
    terminate(){}
   };
  });
  await page.locator('#voice-task').click();
  await page.waitForFunction(()=>!voiceSession);
  assert.match(await page.locator('#voice-status-task').innerText(),/Could not load/);
  await page.evaluate(()=>{window.Worker=OriginalWorker;});
  await page.locator('#voice-output').click();
  await page.waitForFunction(()=>voiceSession?.phase==='recording');
  await page.waitForTimeout(1000);
  await page.locator('#voice-output').click();
  await page.waitForFunction(()=>voiceSession?.phase==='processing');
  await page.locator('#voice-output').click();
  assert.equal(await page.evaluate(()=>voiceSession),null);
  await page.waitForTimeout(500);
  assert.equal(await page.locator('#output').inputValue(),'');
  await page.evaluate(()=>{
   for(const id of FIELDS)voiceStatus(id,'');
   setLang('ru');
  });
  for(const lang of ['en','ru','kk','es','zh','pt']){
   await page.evaluate(lang=>setLang(lang),lang);
   assert.doesNotMatch(await page.locator('#voice-task').innerText(),/voice_/);
  }
  await page.evaluate(()=>setLang('ru'));
  await page.setViewportSize({width:375,height:812});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  // Layout assertion above checks that narrow screens stay within the viewport.
  assert.deepEqual(errors,[]);
  console.log('PASS: actual Russian mic capture → MediaRecorder → audio decoding → self-hosted WASM Whisper → field, local storage, undo; no external requests; stopped tracks; clear; switch; languages; mobile layout.');
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exit(1)});
