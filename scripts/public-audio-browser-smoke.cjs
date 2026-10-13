// Requires puppeteer-core via NODE_PATH and preinstalled Chrome in Actions.
// Actually loads public UI, synthesized WAV, and C++/WASM AudioWorklet.
const puppeteer=require('puppeteer-core');
(async()=>{
  const browser=await puppeteer.launch({headless:true,executablePath:process.env.CHROME_PATH,
    args:['--no-sandbox','--disable-dev-shm-usage','--autoplay-policy=no-user-gesture-required']});
  try {
    const page=await browser.newPage();
    // Diagnostic-only wrappers preserve both original method calls, arguments,
    // return promises and acceptance criteria. No audio graph or DSP change.
    await page.evaluateOnNewDocument(()=>{
      const trace=[];
      Object.defineProperty(window,'__srAudioSmokeTrace',{value:trace});
      const AC=window.AudioContext||window.webkitAudioContext;
      if(AC?.prototype?.resume){
        const resume=AC.prototype.resume;
        AC.prototype.resume=function(...args){
          window.__srObservedContext=this;
          trace.push({step:'context.resume.call',state:this.state,t:performance.now()});
          const result=resume.apply(this,args);
          result.then(()=>trace.push({step:'context.resume.fulfilled',state:this.state,t:performance.now()}),
            err=>trace.push({step:'context.resume.rejected',error:String(err),state:this.state,t:performance.now()}));
          return result;
        };
      }
      const originalPlay=HTMLMediaElement.prototype.play;
      HTMLMediaElement.prototype.play=function(...args){
        trace.push({step:'media.play.call',paused:this.paused,t:performance.now()});
        const result=originalPlay.apply(this,args);
        if(result?.then)result.then(()=>trace.push({step:'media.play.fulfilled',paused:this.paused,t:performance.now()}),
          err=>trace.push({step:'media.play.rejected',error:String(err),t:performance.now()}));
        return result;
      };
      document.addEventListener('play',()=>trace.push({step:'media.play.event',t:performance.now()}),true);
      document.addEventListener('pause',()=>trace.push({step:'media.pause.event',t:performance.now()}),true);
    });
    const errors=[];
    page.on('pageerror',err=>errors.push(String(err)));
    await page.goto('http://127.0.0.1:4173/Web/App/?ui=UI_01',{waitUntil:'networkidle2'});
    await page.waitForSelector('#audioFile');
    await page.evaluate(()=>{
      const n=24000,b=new ArrayBuffer(44+2*n),v=new DataView(b);
      function chars(offset,s){for(let i=0;i<s.length;i++)v.setUint8(offset+i,s.charCodeAt(i))}
      chars(0,'RIFF');v.setUint32(4,36+2*n,true);chars(8,'WAVE');chars(12,'fmt ');
      v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,1,true);
      v.setUint32(24,48000,true);v.setUint32(28,96000,true);
      v.setUint16(32,2,true);v.setUint16(34,16,true);
      chars(36,'data');v.setUint32(40,n*2,true);
      for(let i=0;i<n;i++)v.setInt16(44+i*2,Math.round(6000*Math.sin(2*Math.PI*820*i/48000)),true);
      const file=new File([b],'public_src002_smoke.wav',{type:'audio/wav'});
      const dt=new DataTransfer();dt.items.add(file);
      const input=document.querySelector('#audioFile');input.files=dt.files;
      input.dispatchEvent(new Event('change',{bubbles:true}));
    });
    await page.waitForFunction(()=>document.querySelector('#blockReadout')?.textContent?.includes('PUBLIC C++'),{timeout:20000});
    // The 0.5-second fixture can end before the asynchronous browser assertion.
    // Loop this same test fixture; still require real AudioWorklet + time progression.
    await page.$eval('#audioElement',audio=>{audio.loop=true});
    const clickTarget=await page.$eval('#playBtn',button=>{
      const r=button.getBoundingClientRect(),x=r.x+r.width/2,y=r.y+r.height/2;
      const hit=document.elementFromPoint(x,y);
      return {rect:{x:r.x,y:r.y,w:r.width,h:r.height},visible:r.width>0&&r.height>0,
        centerHitsButton:hit===button||button.contains(hit),hitTag:hit?.tagName,hitId:hit?.id};
    });
    if(!clickTarget.visible||!clickTarget.centerHitsButton)
      throw Error('PLAY_BUTTON_HIT_TEST_FAILED '+JSON.stringify(clickTarget));
    // Also record actual document click delivery, not merely Puppeteer's click call.
    await page.evaluate(()=>document.addEventListener('click',event=>{
      if(event.target.closest?.('#playBtn'))window.__srAudioSmokeTrace?.push({step:'play.button.click.delivered',t:performance.now()});
    },true));
    await page.click('#playBtn');
    // Diagnostic checkpoint: on failure report actual media + app state, not a silent timeout.
    try {
      await page.waitForFunction(()=>!document.querySelector('#audioElement').paused,{timeout:10000});
    } catch (cause) {
      const details=await page.evaluate(()=>{
        const a=document.querySelector('#audioElement'),b=document.querySelector('#playBtn');
        return {paused:a?.paused,ended:a?.ended,currentTime:a?.currentTime,
          readyState:a?.readyState,networkState:a?.networkState,
          errorCode:a?.error?.code,duration:a?.duration,
          muted:a?.muted,volume:a?.volume,loop:a?.loop,
          button:b?.textContent,status:document.querySelector('#stateStatus')?.textContent,
          contextState:window.__srObservedContext?.state,
          contextTime:window.__srObservedContext?.currentTime,
          trace:window.__srAudioSmokeTrace?.slice(-35),
          build:document.querySelector('#buildLabel')?.textContent,
          block:document.querySelector('#blockReadout')?.textContent};
      });
      throw Error('REAL AUDIO PLAYBACK DIAGNOSTIC '+JSON.stringify({details,errors,cause:String(cause)}));
    }
    await new Promise(r=>setTimeout(r,250));
    const state=await page.evaluate(()=>({
      label:document.querySelector('#blockReadout')?.textContent,
      time:document.querySelector('#audioElement')?.currentTime,
      sampleRate:document.querySelector('#sampleRateReadout')?.textContent
    }));
    if(!(state.time>0)||!state.label.includes('PUBLIC C++')||errors.length)
      throw Error('FAIL REAL Chrome AudioWorklet '+JSON.stringify({state,errors}));
    console.log('PASS REAL Chrome SRC_002 AudioWorklet playback '+JSON.stringify(state));
  } finally {await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
