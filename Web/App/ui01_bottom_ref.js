// UI-only REF controls. No new DSP route, public parameter or processing.
let rememberedDuck=45,lastWave=-Infinity;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export function ambienceRefMarkup(state){
  if(state.ui!=="UI_01")return "";
  const amount=Number(state.params.ambienceDuck)||0;
  return '<div class="sr-amb-ref-modes" aria-label="S/M routing not implemented">'
    +'<button disabled type="button" title="S mode needs approved routing and DSP">S</button>'
    +'<button disabled type="button" title="M mode needs approved routing and DSP">M</button></div>'
    +'<label class="sr-amb-ref-duck" title="Existing ambienceDuck state only; no unverified audio claim">'
    +'<input type="checkbox" data-ambience-duck '+(amount>0?'checked':'')+'>'
    +'<span>Duck</span><output>'+amount+'%</output></label>'
    +'<div class="sr-amb-live-out" title="Actual output waveform, not isolated ambience">'
    +'<span>OUT</span><canvas class="sr-amb-wave-canvas" width="132" height="28"></canvas></div>';
}
export function bindAmbienceRef({getState,findControl,mut}){
  const el=document.querySelector("body.ui-01 .sr-amb-ref-duck input");
  if(!el)return;
  el.addEventListener("change",()=>{
    const def=findControl("ambienceDuck"),current=Number(getState().params.ambienceDuck)||0;
    if(!def||def.type!=="range")return;
    if(current>0)rememberedDuck=current;
    const next=el.checked?clamp(rememberedDuck||Number(def.default)||45,def.min,def.max):0;
    if(current!==next)mut(()=>{getState().params.ambienceDuck=next});
  });
}
export function paintAmbienceOutput(analyser,playing,now){
  if(now-lastWave<46)return;lastWave=now;
  const canvas=document.querySelector("body.ui-01 .sr-amb-wave-canvas");
  if(!canvas)return;
  const g=canvas.getContext("2d"),w=canvas.width,h=canvas.height;
  g.clearRect(0,0,w,h);g.strokeStyle="rgba(98,174,201,.26)";g.lineWidth=1;
  g.beginPath();g.moveTo(0,h/2);g.lineTo(w,h/2);g.stroke();
  if(!playing||!analyser)return;
  const samples=new Uint8Array(analyser.fftSize);
  analyser.getByteTimeDomainData(samples);
  g.beginPath();g.strokeStyle="rgba(138,207,228,.88)";g.lineWidth=1;
  for(let x=0;x<w;x++){
    const i=Math.floor(x*(samples.length-1)/(w-1)),y=clamp(samples[i]/255*h,1,h-1);
    if(x)g.lineTo(x,y);else g.moveTo(0,y);
  }
  g.stroke();
}

export function intelligibilityRefMarkup(state){
  if(state.ui!=="UI_01")return "";
  // Presence/Dynamic are explicit REF affordances, NOT registered processing.
  // Disabled state prevents false parameter or audio processing promises.
  return '<div class="sr-intel-ref-options" aria-label="Presence and Dynamic DSP not connected">'
    +'<label title="Presence DSP and public parameter need approval">'
    +'<input type="checkbox" disabled aria-label="Presence not yet implemented"><span>Presence</span></label>'
    +'<label title="Dynamic DSP and public parameter need approval">'
    +'<input type="checkbox" disabled aria-label="Dynamic not yet implemented"><span>Dynamic</span></label></div>';
}

export function mixRefMarkup(state){
  if(state.ui!=="UI_01")return '<span class="macro-mix-mode">WET</span>';
  // mix is the existing real Original↔Full Scene parameter; no new DSP.
  const wet=clamp(Math.round(Number(state.params.mix)||0),0,100),dry=100-wet;
  return '<div class="sr-mix-live-ratio" aria-label="Live dry wet ratio">'
    +'<span>WET '+wet+'%</span><small>DRY '+dry+'%</small></div>'
    +'<button type="button" class="sr-mix-phase-pending" disabled'
    +' title="Ø phase inversion requires explicit approved DSP implementation"'
    +' aria-label="Phase inversion unavailable">Ø</button>';
}

export function syncMixRef(state){
  const el=document.querySelector("body.ui-01 .sr-mix-live-ratio");
  if(!el)return;
  const wet=clamp(Math.round(Number(state.params.mix)||0),0,100);
  const label=el.querySelector("span"),dry=el.querySelector("small");
  if(label)label.textContent="WET "+wet+"%";
  if(dry)dry.textContent="DRY "+(100-wet)+"%";
}
