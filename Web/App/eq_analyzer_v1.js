// Visual-only spectrum overlay modeled after VVChain's logarithmic, smoothed
// analyzer presentation. Reuse SOURCERUNE's existing post-DSP AnalyserNode
// samples: NO AudioContext, additional FFT, audio node, timer, or DSP changes.
const POINTS=129;
const miniSpectrum=createSpectrumDisplayTrace();
let visible=false;
const clamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));
const yFor=db=>(98-clamp((db+90)/90,0,1)*77);
// Exactly the reference VVChain UI_A shape-preserving cubic trace,
// from chen2622113/VVChain docs/index.html drawEQ() (main 5767e459).
// Typed arrays persist between frames; no additional FFT, nodes, or DSP.
const curveY=new Float32Array(POINTS);
const curveSlopes=new Float32Array(POINTS-1);
const curveTangents=new Float32Array(POINTS);
function paint(graphs){
  const dx=100/(POINTS-1);
  for(let i=0;i<POINTS;i++)curveY[i]=yFor(miniSpectrum.trace[i]);
  for(let i=0;i<POINTS-1;i++)
    curveSlopes[i]=(curveY[i+1]-curveY[i])/dx;
  curveTangents[0]=curveSlopes[0];
  curveTangents[POINTS-1]=curveSlopes[POINTS-2];
  for(let i=1;i<POINTS-1;i++){
    const a=curveSlopes[i-1],b=curveSlopes[i];
    curveTangents[i]=a*b<=0?0:2*a*b/(a+b);
  }
  let line="M0 "+curveY[0].toFixed(3);
  for(let i=0;i<POINTS-1;i++){
    const x0=i*dx,x1=(i+1)*dx,dy=dx/3;
    const cp1=clamp(curveY[i]+curveTangents[i]*dy,0,100);
    const cp2=clamp(curveY[i+1]-curveTangents[i+1]*dy,0,100);
    line+=" C"+(x0+dy).toFixed(3)+" "+cp1.toFixed(3)+" "
      +(x1-dy).toFixed(3)+" "+cp2.toFixed(3)+" "
      +x1.toFixed(3)+" "+curveY[i+1].toFixed(3);
  }
  const fill=line+" L100 100 L0 100 Z";
  for(const svg of graphs){
    svg.querySelector(".macro-eq-analyzer-line")?.setAttribute("d",line);
    svg.querySelector(".macro-eq-analyzer-fill")?.setAttribute("d",fill);
  }
}

// One source of truth for SOURCERUNE's *visual* EQ and main Spectrum graphs.
// Exactly the existing mini-EQ 129-point VVChain-style sampling and attack/release,
// plus configurable visual octave width for main Spectrum's 1/3 / RAW button.
// NO second FFT, no audio node, no DSP/WASM changes and no fake audio level.
export function createSpectrumDisplayTrace(){
  const raw=new Float32Array(POINTS).fill(-90);
  const frequencySmooth=new Float32Array(POINTS).fill(-90);
  const trace=new Float32Array(POINTS).fill(-90);
  let power=new Float64Array(0),prefix=new Float64Array(0),lastFrame=-Infinity;
  const reset=()=>{trace.fill(-90);lastFrame=-Infinity;};
  const update=(bins,sampleRate=48000,now=0,enabled=true,options={})=>{
    if(!enabled||!bins?.length){reset();return null;}
    if(now-lastFrame<42)return trace;
    lastFrame=now;
    if(power.length!==bins.length){
      power=new Float64Array(bins.length);
      prefix=new Float64Array(bins.length+1);
      trace.fill(-90);
    }
    const binsPerHz=bins.length/(sampleRate*.5);
    prefix[0]=0;
    for(let b=0;b<bins.length;b++){
      const db=Number.isFinite(bins[b])?clamp(bins[b],-120,0):-120;
      power[b]=Math.pow(10,db/10);
      prefix[b+1]=prefix[b]+power[b];
    }
    const octaveWidth=options.octaveWidth??(1/24),half=octaveWidth/2;
    for(let i=0;i<POINTS;i++){
      const centre=20*Math.pow(1000,i/(POINTS-1));
      const lower=centre/Math.pow(2,half),upper=centre*Math.pow(2,half);
      const first=clamp(Math.floor(lower*binsPerHz),1,bins.length-1);
      const last=clamp(Math.ceil(upper*binsPerHz),first,bins.length-1);
      let meanPower;
      if(last<=first+1){
        const at=clamp(centre*binsPerHz,1,bins.length-1);
        const lo=Math.floor(at),hi=Math.min(lo+1,bins.length-1);
        meanPower=power[lo]*(1-(at-lo))+power[hi]*(at-lo);
      }else meanPower=(prefix[last+1]-prefix[first])/(last-first+1);
      const db=10*Math.log10(Math.max(1e-12,meanPower));
      // Same visual tilt as the mini EQ (display-only, no spectral DSP EQ).
      raw[i]=clamp(db+4.5*Math.log2(centre/1000),-90,0);
    }
    const smooth=options.frequencySmoothing!==false;
    const sample=i=>raw[clamp(i,0,POINTS-1)];
    for(let i=0;i<POINTS;i++){
      frequencySmooth[i]=smooth?
        (sample(i-3)+6*sample(i-2)+15*sample(i-1)+20*sample(i)+
        15*sample(i+1)+6*sample(i+2)+sample(i+3))/64:raw[i];
    }
    for(let i=0;i<POINTS;i++){
      const target=frequencySmooth[i],old=trace[i];
      trace[i]=old+(target>old?.70:.21)*(target-old);
    }
    return trace;
  };
  return {trace,update,reset};
}
export function updateEqAnalyzer(bins,sampleRate=48000,now=0,enabled=true){
  const graphs=document.querySelectorAll(".macro-eq-svg");
  if(!graphs.length)return;
  if(!enabled||!bins?.length){
    miniSpectrum.reset();
    if(visible){
      visible=false;
      for(const svg of graphs){
        svg.querySelector(".macro-eq-analyzer-line")?.setAttribute("d","");
        svg.querySelector(".macro-eq-analyzer-fill")?.setAttribute("d","");
      }
    }
    return;
  }
  // Mini EQ reuses the exact defaults that it used before this integration.
  const data=miniSpectrum.update(bins,sampleRate,now,true);
  if(!data)return;
  visible=true;
  paint(graphs);
}
