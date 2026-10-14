// SOURCERUNE UI_01 Scene REF convergence. UI-only: no DSP or parameter-ID changes.
const clamp=(v,low,high)=>Math.max(low,Math.min(high,v));
const $=sel=>document.querySelector(sel);
let cachedCurve="";
let cachedScenePath="";
let cachedRuler="";
function number(value,fallback){const n=Number(value);return Number.isFinite(n)?n:fallback}
export function sceneViewBox(zoom){
  const z=clamp(number(zoom,1),1,1.75),width=1000/z,height=192/z;
  return [Math.round((1000-width)/2*100)/100,Math.round((192-height)/2*100)/100+140,
    Math.round(width*100)/100,Math.round(height*100)/100].join(" ");
}
export function syncSceneZoom(state){
  if(state?.ui!=="UI_01")return;
  const z=clamp(number(state.sceneZoom,1),1,1.75);
  const out=$("#sceneZoomReadout");
  if(out)out.textContent=Math.round(z*100)+"%";
  const svg=$("#sceneSvg");
  if(svg&&svg.getAttribute("viewBox")!==sceneViewBox(z))svg.setAttribute("viewBox",sceneViewBox(z));
}
function sceneDistanceAt(p,t){
  const a=number(p.startDistance,80),c=number(p.closestDistance,3),e=number(p.endDistance,120);
  const mode=p.motionMode;
  if(mode==="STATIC")return a;
  if(mode==="APPROACH")return a+(c-a)*t;
  if(mode==="LEAVE")return c+(e-c)*t;
  if(mode==="PASS_BY")return t<=.5?a+(c-a)*t*2:c+(e-c)*(t-.5)*2;
  return a+(e-a)*t;
}
export function syncSceneGuide(state){
  if(state?.ui!=="UI_01")return;
  const p=state.params,position=clamp(number(p.motion,0)/100,0,1);
  const maximum=Math.max(10,number(p.startDistance,80),number(p.closestDistance,3),number(p.endDistance,120));
  const at=t=>({x:110+790*t,y:190+clamp(sceneDistanceAt(p,t)/maximum,0,1)*105});
  const sig=[p.startDistance,p.closestDistance,p.endDistance,p.motionMode].join("/");
  if(sig!==cachedCurve||$("#motionPath")?.getAttribute("d")!==cachedScenePath){
    const pts=Array.from({length:49},(_,i)=>at(i/48));
    const d=pts.map((pt,i)=>(i?"L":"M")+pt.x.toFixed(2)+" "+pt.y.toFixed(2)).join(" ");
    $("#motionPath")?.setAttribute("d",d);
    cachedScenePath=d;
    for(const [id,t] of [["sceneStartMarker",0],["sceneClosestMarker",.5],["sceneEndMarker",1]]){
      const el=$("#"+id),point=at(t);
      if(el){el.setAttribute("x",(point.x-14).toFixed(2));el.setAttribute("y",(point.y-14).toFixed(2));}
    }
    const axis=$("#sceneFarScale");if(axis)axis.textContent=maximum.toFixed(0)+" m";
    cachedCurve=sig;
  }
  const point=at(position),listenerY=250;
  $("#sourceNode")?.setAttribute("transform","translate("+point.x.toFixed(2)+" "+point.y.toFixed(2)+")");
  const car=$("#motionCarGlyph");
  if(car){car.setAttribute("x",(point.x-28).toFixed(2));car.setAttribute("y",(point.y-60).toFixed(2));}
  const label=$("#sourceLabel");
  if(label){label.textContent="SOURCE";label.setAttribute("x",clamp(point.x-111,145,820).toFixed(2));label.setAttribute("y",clamp(point.y-28,164,270).toFixed(2));}
  const line=$("#distanceLine");
  if(line){line.setAttribute("x1",point.x.toFixed(2));line.setAttribute("y1",point.y.toFixed(2));line.setAttribute("y2",String(listenerY));}
  const cx=(point.x+500)/2+(Math.abs(point.x-500)<140?105:0),cy=(point.y+listenerY)/2-9;
  const bed=$("#distanceCallout");
  if(bed){bed.setAttribute("x",(cx-40).toFixed(2));bed.setAttribute("y",(cy-31).toFixed(2));}
  const value=$("#distanceText");
  if(value){value.setAttribute("x",cx.toFixed(2));value.setAttribute("y",cy.toFixed(2));}
}
function clock(sec){
  const n=Math.max(0,Math.round(sec)),m=Math.floor(n/60),s=n%60;
  return String(m)+":"+String(s).padStart(2,"0");
}
export function syncSceneTime(state,audio){
  if(state?.ui!=="UI_01")return;
  const duration=number(audio.duration,0),real=duration>0&&Number.isFinite(duration);
  const labels=real?Array.from({length:5},(_,i)=>clock(duration*i/4)):["0%","25%","50%","75%","100%"];
  const signature=labels.join("|");
  if(signature!==cachedRuler){
    document.querySelectorAll(".scene-time-ruler [data-scene-time]").forEach((n,i)=>n.textContent=labels[i]);
    cachedRuler=signature;
  }
  const ratio=real?clamp(number(audio.currentTime,0)/duration,0,1):clamp(number(state.params.motion,0)/100,0,1);
  const strip=$(".scene-waveform-strip");
  if(strip)strip.style.setProperty("--scene-playhead",(ratio*100).toFixed(3)+"%");
  if(strip)strip.title=real?"Seek audio: "+clock(audio.currentTime)+" / "+clock(duration):"Motion progress (no audio loaded)";
}
export function bindSceneView({getState,setZoom,audio}){
  document.querySelectorAll("[data-scene-zoom]").forEach(button=>{
    button.addEventListener("click",()=>{
      if(getState()?.ui!=="UI_01")return;
      const zoom=number(getState().sceneZoom,1),action=button.dataset.sceneZoom;
      const next=action==="reset"?1:clamp(zoom+(action==="in"?.25:-.25),1,1.75);
      if(next!==zoom)setZoom(next);
    });
  });
  const strip=$(".scene-waveform-strip");
  if(!strip)return;
  let pointer=null;
  function seek(e){
    if(getState()?.ui!=="UI_01")return;
    const duration=number(audio.duration,0);
    if(!(duration>0&&Number.isFinite(duration)))return;
    const box=strip.getBoundingClientRect();
    audio.currentTime=clamp((e.clientX-box.left)/Math.max(1,box.width),0,1)*duration;
  }
  strip.addEventListener("pointerdown",e=>{
    if(e.button!==0||getState()?.ui!=="UI_01")return;
    if(!(number(audio.duration,0)>0))return;
    pointer=e.pointerId;
    strip.setPointerCapture(pointer);
    seek(e);
  });
  strip.addEventListener("pointermove",e=>{if(pointer===e.pointerId)seek(e);});
  const end=e=>{if(pointer!==e.pointerId)return;pointer=null;};
  strip.addEventListener("pointerup",end);
  strip.addEventListener("pointercancel",end);
}
