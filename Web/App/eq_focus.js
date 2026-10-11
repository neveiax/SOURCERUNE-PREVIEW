import {sizeEqMarkers} from "./eq_graph.js";
// UI-only EQ Focus panel: MOVE the existing bound SVG, never clone an active
// filter, create an AudioContext, change state IDs, or touch C++ DSP.
let current=null;
const ids=["hpf","b1","b2","b3","lpf"];
const label={hpf:"HPF",b1:"BAND 1",b2:"BAND 2",b3:"BAND 3",lpf:"LPF"};
const clamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));
const freq=f=>f>=1000?(f/1000).toFixed(f%1000?2:1)+" kHz":f+" Hz";
const gain=v=>(v>=0?"+":"")+Number(v).toFixed(1)+" dB";
const knobKey=(id,kind)=>id==="hpf"||id==="lpf"?id:id+(kind==="freq"?"Freq":kind==="gain"?"Gain":"Q");
const knobKinds=id=>id==="hpf"||id==="lpf"?["freq"]:["freq","gain","q"];
const knobHTML=(id,kind)=>{
  const key=knobKey(id,kind),valueId=id+"-"+kind;
  const caption=kind==="freq"?"FREQ":kind==="gain"?"GAIN":"Q";
  return '<button type="button" class="sr-eq-focus-knob" data-eq-focus-control="'+key+'"'
    +' aria-label="'+label[id]+' '+caption+'" title="Drag vertically, Shift for fine, wheel for one step">'
    +'<span class="sr-eq-knob-dial" aria-hidden="true"><i></i></span>'
    +'<span class="sr-eq-knob-caption">'+caption+'</span>'
    +'<span class="sr-eq-knob-value" data-eq-focus-value="'+valueId+'"></span></button>';
};
const bandHTML=id=>
  '<div class="sr-eq-focus-band" data-eq-focus-band="'+id+'">'
  +'<button type="button" class="sr-eq-band-head" data-eq-focus-select="'+id
  +'" aria-label="Select '+label[id]+' node"><i></i><strong>'+label[id]+'</strong></button>'
  +'<span class="sr-eq-band-type">'+(id==="hpf"||id==="lpf"?"12 dB/OCT · FIXED":"PEAK · FIXED")+'</span>'
  +'<div class="sr-eq-band-knobs">'+knobKinds(id).map(k=>knobHTML(id,k)).join("")+'</div></div>';

function bounds(){
  const r=document.querySelector(".app")?.getBoundingClientRect();
  if(!r)return {left:0,top:0,width:innerWidth,height:innerHeight};
  return {left:r.left,top:r.top,width:r.width,height:r.height};
}
function reposition(preserve=true){
  if(!current)return;
  const o=current.overlay,b=bounds(),scale=Math.min(b.width/(current.getState().ui==="UI_02"?1672:1499),
    b.height/(current.getState().ui==="UI_02"?941:807));
  o.style.left=b.left+"px";o.style.top=b.top+"px";
  o.style.width=b.width+"px";o.style.height=b.height+"px";
  const pw=Math.max(290,Math.min(900*scale,b.width*.90));
  const ph=Math.max(230,Math.min(500*scale,b.height*.90));
  current.dialog.style.width=pw+"px";current.dialog.style.height=ph+"px";
  const pos=current.position;
  const x=preserve&&pos?pos.x:(b.width-pw)/2;
  const y=preserve&&pos?pos.y:(b.height-ph)/2;
  current.position={x:clamp(x,4,Math.max(4,b.width-pw-4)),y:clamp(y,4,Math.max(4,b.height-ph-4))};
  current.dialog.style.left=current.position.x+"px";current.dialog.style.top=current.position.y+"px";
  requestAnimationFrame(()=>{if(current)sizeEqMarkers(current.svg);});
}
export function eqFocusIsOpen(){return Boolean(current);}
export function repositionEqFocus(){reposition();}
export function syncEqFocus(){
  if(!current)return;
  const s=current.getState(),p=s.params,root=current.dialog;
  for(const id of ids){
    const f=id==="hpf"?p.hpf:id==="lpf"?p.lpf:p["b"+id.slice(1)+"Freq"];
    const e=root.querySelector('[data-eq-focus-value="'+id+'-freq"]');
    if(e)e.textContent=(id==="hpf"&&f<=20?"OFF":freq(f));
    if(id.startsWith("b")){
      root.querySelector('[data-eq-focus-value="'+id+'-gain"]').textContent=gain(p[id+"Gain"]);
      root.querySelector('[data-eq-focus-value="'+id+'-q"]').textContent=Number(p[id+"Q"]).toFixed(2);
    }
    for(const kind of knobKinds(id)){
      const key=knobKey(id,kind),def=current.getControl(key),value=Number(p[key]);
      const button=root.querySelector('[data-eq-focus-control="'+key+'"]');
      if(button){
        const pct=100*(value-Number(def.min))/(Number(def.max)-Number(def.min));
        button.style.setProperty("--dial-angle",(Math.max(0,Math.min(100,pct))*2.7).toFixed(2)+"deg");
        button.setAttribute("role","slider");
        button.setAttribute("aria-valuemin",String(def.min));
        button.setAttribute("aria-valuemax",String(def.max));
        button.setAttribute("aria-valuenow",String(value));
        button.setAttribute("aria-valuetext",key.endsWith("Gain")?gain(value):
          key.endsWith("Q")?Number(value).toFixed(2):freq(value));
      }
    }
  }
  const power=root.querySelector("[data-eq-focus-power]");
  if(power){const enabled=!s.bypass.EQ_TONE;power.classList.toggle("active",enabled);
    power.setAttribute("aria-pressed",String(enabled));power.textContent=enabled?"EQ ON":"EQ OFF";}
}
export function markMiniEqInert(){
  if(!current)return;
  const small=document.querySelector(".macro-eq .macro-eq-svg");
  if(small){
    small.dataset.eqFocusGhost="1";small.setAttribute("aria-hidden","true");
    small.setAttribute("focusable","false");small.inert=true;
    small.style.pointerEvents="none";
  }
}
export function closeEqFocus(){
  if(!current)return;
  const c=current;
  current=null;
  c.docListener&&document.removeEventListener("keydown",c.docListener);
  c.resizeListener&&window.removeEventListener("resize",c.resizeListener);
  if(c.onDismiss)c.onDismiss();
  const card=document.querySelector(".macro-eq");
  if(card){
    card.querySelectorAll(".macro-eq-svg").forEach(g=>g.remove());
    const foot=card.querySelector(".macro-eq-foot");
    if(foot)card.insertBefore(c.svg,foot);
    else card.appendChild(c.svg);
  }
  c.overlay.remove();
  sizeEqMarkers(c.svg); // exact compact marker size on immediate close
  const restore=document.querySelector("[data-eq-zoom-in]");
  if(restore)restore.focus({preventScroll:true});
}
export function openEqFocus({getState,onPower,onDismiss,getControl,onChange,snapshot,commit}){
  if(current)return;
  const small=document.querySelector(".macro-eq .macro-eq-svg");
  if(!small)return;
  const parent=small.parentElement,ghost=small.cloneNode(true);
  ghost.dataset.eqFocusGhost="1";ghost.setAttribute("aria-hidden","true");ghost.inert=true;
  ghost.style.pointerEvents="none";
  parent.insertBefore(ghost,small);
  // A ghost has its own live response but NEVER accepts pointer input.
  // Its duplicate SVG gradient IDs are resolved to unique inactive copies.
  const sourceDefs=small.querySelectorAll("linearGradient");
  ghost.querySelectorAll("linearGradient").forEach((g,i)=>{
    const original=sourceDefs[i]?.id;
    if(!original)return;
    const next=original+"-preview";
    g.id=next;
    ghost.querySelectorAll('[stroke="url(#'+original+')"],[fill="url(#'+original+')"]').forEach(el=>{
      if(el.getAttribute("stroke")==="url(#"+original+")")el.setAttribute("stroke","url(#"+next+")");
      if(el.getAttribute("fill")==="url(#"+original+")")el.setAttribute("fill","url(#"+next+")");
    });
  });
  const overlay=document.createElement("div");
  overlay.id="eqFocusOverlay";
  overlay.className="sr-eq-focus-overlay";
  overlay.setAttribute("data-eq-focus-overlay","");
  overlay.innerHTML=
    '<section class="sr-eq-focus" id="eqFocusDialog" role="dialog" aria-modal="true" aria-label="Expanded EQ editor">'
    +'<header class="sr-eq-focus-head" data-eq-focus-drag>'
    +'<div class="sr-eq-focus-title" tabindex="-1"><strong>EQ / TONE</strong><small>FREQUENCY RESPONSE · ±24 dB</small></div>'
    +'<div class="sr-eq-focus-actions"><button type="button" data-eq-focus-power aria-label="EQ Power"></button>'
    +'<button type="button" data-eq-focus-zoom-out title="Zoom out" aria-label="Zoom out EQ">↙</button>'
    +'<button type="button" data-eq-focus-close title="Close" aria-label="Close expanded EQ">×</button></div></header>'
    +'<div class="sr-eq-focus-main"><div class="sr-eq-focus-y">'
    +'<span style="top:16%">+24</span><span style="top:33%">+12</span><span style="top:50%">0</span>'
    +'<span style="top:67%">−12</span><span style="top:84%">−24</span></div>'
    +'<div class="sr-eq-focus-plot"><div class="sr-eq-focus-graph-host" data-eq-focus-graph></div>'
    +'<div class="sr-eq-focus-x"><span>20</span><span>100</span><span>1k</span><span>10k</span><span>20k Hz</span></div></div></div>'
    +'<div class="sr-eq-focus-readouts">'+ids.map(bandHTML).join("")+'</div>'
    +'<footer class="sr-eq-focus-foot"><span>DRAG: FREQUENCY / GAIN · WHEEL ON BAND: Q · SHIFT: FINE</span>'
    +'<span>HPF · 3 BANDS · LPF</span></footer>'
    +'</section>';
  document.body.append(overlay);
  const dialog=overlay.querySelector(".sr-eq-focus");
  dialog.querySelector("[data-eq-focus-graph]").append(small);
  current={svg:small,overlay,dialog,getState,onPower,onDismiss,getControl,onChange,snapshot,commit,position:null,docListener:null,resizeListener:null};
  const c=current;
  reposition(false);sizeEqMarkers(c.svg);syncEqFocus();
  requestAnimationFrame(()=>{if(current===c)sizeEqMarkers(c.svg);});
  // No second graph listener; all mouse, keyboard, hover and undo stay bound
  // to the SAME SVG and EQ state as the original mini graph.
  dialog.querySelectorAll("[data-eq-focus-select]").forEach(button=>{
    button.onclick=()=>{
      const dot=c.svg.querySelector('[data-eq-node="'+button.dataset.eqFocusSelect+'"]');
      dot?.focus({preventScroll:true});
    };
  });
  // Real live parameter dials, not decorative/unsupported filter choices.
  // The same state and undo transactions drive the SVG/Advanced/Worklet.
  dialog.querySelectorAll("[data-eq-focus-control]").forEach(button=>{
    const key=button.dataset.eqFocusControl,def=getControl(key);
    const lo=Number(def.min),hi=Number(def.max),step=Number(def.step)||1;
    const read=()=>Number(getState().params[key]);
    const clampStep=v=>Number(Math.max(lo,Math.min(hi,
      lo+Math.round((Math.max(lo,Math.min(hi,v))-lo)/step)*step)).toFixed(6));
    const write=v=>{const next=clampStep(v);if(next===read())return false;onChange(key,next);return true;};
    let gesture=null,accum=0;
    const applyWheel=(dy,shift)=>{
      if(!Number.isFinite(dy)||dy===0)return;
      accum+=dy;
      if(Math.abs(accum)<12/1.3)return;
      const dir=accum<0?1:-1;accum=0;
      const before=snapshot();
      if(write(read()+dir*step))commit(before);
    };
    button.addEventListener("pointerdown",e=>{
      if(e.button!==0)return;
      e.stopPropagation();e.preventDefault();
      gesture={id:e.pointerId,start:e.clientY,last:e.clientY,value:read(),
        before:snapshot(),moved:false};
      button.setPointerCapture(e.pointerId);
      button.focus({preventScroll:true});
    });
    button.addEventListener("pointermove",e=>{
      if(!gesture||e.pointerId!==gesture.id)return;
      const d=gesture.start-e.clientY;
      if(Math.abs(d)>2)gesture.moved=true;
      if(!gesture.moved)return;
      e.preventDefault();
      const factor=e.shiftKey?.2:1;
      const val=key.endsWith("Freq")||key==="hpf"||key==="lpf"?
        gesture.value*Math.exp(d*.0125*factor):
        key.endsWith("Q")?gesture.value*Math.exp(d*.015*factor):
        gesture.value+d*.075*factor;
      write(val);
    });
    const finish=e=>{
      if(!gesture||e.pointerId!==gesture.id)return;
      e.stopPropagation();
      const g=gesture;gesture=null;
      if(button.hasPointerCapture(e.pointerId))button.releasePointerCapture(e.pointerId);
      if(g.moved){commit(g.before);}
      else{
        const id=key==="hpf"||key==="lpf"?key:key.slice(0,2);
        c.svg.querySelector('[data-eq-node="'+id+'"]')?.focus({preventScroll:true});
      }
    };
    button.addEventListener("pointerup",finish);
    button.addEventListener("pointercancel",finish);
    button.addEventListener("wheel",e=>{
      if(e.ctrlKey)return;e.preventDefault();e.stopPropagation();
      applyWheel(e.deltaMode===1?e.deltaY*16:e.deltaMode===2?e.deltaY*120:e.deltaY,e.shiftKey);
    },{passive:false});
    button.addEventListener("dblclick",e=>{
      e.preventDefault();e.stopPropagation();const before=snapshot();
      if(write(Number(def.default)))commit(before);
    });
    // Keyboard button activation opens the same VVChain-style numeric popup;
    // Arrow/Home/End continue adjusting the real parameter in place.
    button.addEventListener("click",e=>{
      if(e.detail!==0)return;
      const id=key==="hpf"||key==="lpf"?key:key.slice(0,2);
      c.svg.querySelector('[data-eq-node="'+id+'"]')?.focus({preventScroll:true});
    });
    button.addEventListener("keydown",e=>{
      const direction=["ArrowUp","ArrowRight"].includes(e.key)?1:
        ["ArrowDown","ArrowLeft"].includes(e.key)?-1:0;
      if(!direction&&e.key!=="Home"&&e.key!=="End")return;
      e.preventDefault();e.stopPropagation();const before=snapshot();
      const value=e.key==="Home"?lo:e.key==="End"?hi:read()+direction*step;
      if(write(value))commit(before);
    });
  });
  for(const type of ["close","zoom-out"])dialog.querySelector("[data-eq-focus-"+type+"]").onclick=e=>{
    e.stopPropagation();closeEqFocus();
  };
  dialog.querySelector("[data-eq-focus-power]").onclick=e=>{e.stopPropagation();onPower();syncEqFocus();};
  overlay.addEventListener("pointerdown",e=>{if(e.target===overlay)closeEqFocus();});
  c.docListener=e=>{
    if(!current||e.key!=="Escape"||e.defaultPrevented)return;
    // The existing numeric input consumes Escape first to cancel its edit.
    if(e.target.closest?.(".sr-eq-float"))return;
    e.preventDefault();e.stopPropagation();closeEqFocus();
  };
  document.addEventListener("keydown",c.docListener);
  c.resizeListener=()=>requestAnimationFrame(()=>{if(current===c)reposition();});
  window.addEventListener("resize",c.resizeListener,{passive:true});
  let move=null;
  const header=dialog.querySelector("[data-eq-focus-drag]");
  header.addEventListener("pointerdown",e=>{
    if(e.button!==0||e.target.closest("button"))return;
    move={id:e.pointerId,x:e.clientX,y:e.clientY,left:c.position.x,top:c.position.y};
    header.setPointerCapture(e.pointerId);e.preventDefault();
  });
  header.addEventListener("pointermove",e=>{
    if(!move||e.pointerId!==move.id||current!==c)return;
    const b=bounds(),w=dialog.offsetWidth,h=dialog.offsetHeight;
    c.position={x:clamp(move.left+e.clientX-move.x,4,Math.max(4,b.width-w-4)),
      y:clamp(move.top+e.clientY-move.y,4,Math.max(4,b.height-h-4))};
    dialog.style.left=c.position.x+"px";dialog.style.top=c.position.y+"px";
  });
  const end=e=>{if(move&&e.pointerId===move.id){move=null;if(header.hasPointerCapture(e.pointerId))header.releasePointerCapture(e.pointerId);}};
  header.addEventListener("pointerup",end);
  header.addEventListener("pointercancel",end);
  dialog.querySelector(".sr-eq-focus-title").focus({preventScroll:true});
}
