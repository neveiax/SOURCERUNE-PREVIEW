// SOURCERUNE UI gesture layer, adapted from VVChain UI_A interaction semantics.
// This module NEVER designs filters, alters DSP, alters parameter IDs, or owns audio.
// The graph and the small floating readout are shared by UI_01 and UI_02.
let floatBox=null, active=null, popupDrag=null, wheelTarget=null, wheelAccum=0, hideTimer=null, boundWindow=false;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const NODES=["hpf","b1","b2","b3","lpf"];
const labels={hpf:"HPF",lpf:"LPF",b1:"BAND 1",b2:"BAND 2",b3:"BAND 3"};
const keyFor=(id,kind)=>id==="hpf"||id==="lpf"?id:"b"+id.slice(1)+(kind==="gain"?"Gain":kind==="q"?"Q":"Freq");
const kindFor=id=>id==="hpf"||id==="lpf"?["freq"]:["freq","gain","q"];
const parseNumber=(text,kind)=>{
  const s=String(text).trim().toLowerCase().replaceAll(",","");
  const found=s.match(/[-+]?(?:\d+(?:\.\d*)?|\.\d+)/);
  if(!found)return NaN;
  const n=Number(found[0]);
  return kind==="freq"&&/(?:khz|k\b)/.test(s)?n*1000:n;
};
function formatted(kind,value){
  if(kind==="freq")return value>=1000?Number((value/1000).toFixed(3))+" kHz":Number(value.toFixed(3))+" Hz";
  return kind==="gain"?(value>=0?"+":"")+Number(value.toFixed(2))+" dB":Number(value.toFixed(3)).toString();
}
function ensureBox(){
  if(floatBox?.isConnected)return floatBox;
  floatBox=document.createElement("div");
  floatBox.className="sr-eq-float";
  floatBox.hidden=true;
  floatBox.setAttribute("role","group");
  floatBox.setAttribute("aria-label","EQ node value editor");
  document.body.appendChild(floatBox);
  return floatBox;
}
function cancelHide(){if(hideTimer!==null){clearTimeout(hideTimer);hideTimer=null;}}
function hide(){cancelHide();if(popupDrag||floatBox?.contains(document.activeElement))return;active=null;if(floatBox)floatBox.hidden=true;}
function nearBox(x,y,anchor){
  if(!floatBox||floatBox.hidden)return false;
  const r=floatBox.getBoundingClientRect(),nearestX=clamp(x,r.left,r.right),nearestY=clamp(y,r.top,r.bottom);
  if(x>=r.left-12&&x<=r.right+12&&y>=r.top-10&&y<=r.bottom+10)return true;
  if(!anchor)return false;
  if(Math.hypot(x-anchor.x,y-anchor.y)<=18)return true;
  const px=clamp(anchor.x,r.left+8,r.right-8);
  const py=clamp(anchor.y,r.top,r.bottom);
  const dx=px-anchor.x,dy=py-anchor.y,len2=dx*dx+dy*dy;
  if(len2<.1)return false;
  const k=clamp(((x-anchor.x)*dx+(y-anchor.y)*dy)/len2,0,1);
  return Math.hypot(x-anchor.x-k*dx,y-anchor.y-k*dy)<=26;
}
function delayHide(ctx){
  cancelHide();
  hideTimer=setTimeout(()=>{
    hideTimer=null;
    if(!active||popupDrag||floatBox?.contains(document.activeElement))return;
    if(!nearBox(ctx.lastX,ctx.lastY,active.anchor))hide();
  },260);
}
// Dismiss a node editor when swapping the mini/focused presentation.
export function dismissEqFloat(){
  cancelHide();
  if(popupDrag){
    const drag=popupDrag;popupDrag=null;
    if(drag.input?.hasPointerCapture?.(drag.pointer))drag.input.releasePointerCapture(drag.pointer);
    active?.ctx?.commit?.(drag.before);
  }
  if(floatBox?.contains(document.activeElement))document.activeElement.blur();
  active=null;if(floatBox)floatBox.hidden=true;
}
export function attachEqInteractions(ctx){
  const svg=ctx.svg;
  if(!svg)return;
  const box=ensureBox();cancelHide();
  // Mini EQ = direct five-point editor only. Numeric popup belongs ONLY to Focus.
  const allowPopup=()=>Boolean(svg.closest(".sr-eq-focus"));
  if(active&&active.ctx!==ctx){active=null;box.hidden=true;}
  const state=()=>ctx.getState();
  const def=k=>ctx.findControl(k);
  const snap=(key,raw)=>{
    const d=def(key);if(!d||!Number.isFinite(raw))return null;
    const lo=Number(d.min),hi=Number(d.max),step=Number(d.step)||1;
    return Number(clamp(lo+Math.round((clamp(raw,lo,hi)-lo)/step)*step,lo,hi).toFixed(6));
  };
  const get=(id,kind)=>Number(state().params[keyFor(id,kind)]);
  const apply=(id,kind,raw)=>{
    const key=keyFor(id,kind),v=snap(key,raw);
    if(v===null||v===state().params[key])return false;
    state().params[key]=v;
    ctx.changed(key,v);
    return true;
  };
  const committed=before=>{
    if(!before||JSON.stringify(before.params)===JSON.stringify(state().params))return false;
    ctx.commit(before);
    return true;
  };
  const circle=id=>svg.querySelector('[data-eq-node="'+id+'"]');
  const anchorFor=id=>{
    const dot=circle(id);if(!dot)return null;
    const r=dot.getBoundingClientRect();
    return {x:r.left+r.width/2,y:r.top+r.height/2};
  };
  const place=id=>{
    if(box.hidden)return;
    const a=anchorFor(id);if(!a)return;
    const w=box.offsetWidth,h=box.offsetHeight,margin=8;
    let x=clamp(a.x-w/2,margin,Math.max(margin,window.innerWidth-w-margin));
    let y=a.y-h-18;
    if(y<margin)y=a.y+18;
    y=clamp(y,margin,Math.max(margin,window.innerHeight-h-margin));
    box.style.left=x+"px";box.style.top=y+"px";
    if(active)active.anchor=a;
  };
  const syncRows=()=>{
    if(!active||box.hidden)return;
    for(const kind of kindFor(active.id)){
      const input=box.querySelector('[data-eq-float-value="'+kind+'"]');
      if(input&&document.activeElement!==input&&!(popupDrag?.input===input)){
        input.value=formatted(kind,get(active.id,kind));
        input.setAttribute("aria-valuenow",String(get(active.id,kind)));
      }
    }
  };
  const open=(id,{rebuild=false}={})=>{
    if(!NODES.includes(id))return;
    if(!allowPopup()){
      if(active?.ctx===ctx)dismissEqFloat();
      return;
    }
    cancelHide();
    if(active?.ctx===ctx&&active.id===id&&!box.hidden&&!rebuild){syncRows();place(id);return;}
    // A new hovered node should not steal an editor while text entry is active.
    if(box.contains(document.activeElement)&&active?.id!==id)return;
    active={ctx,id,anchor:null};
    box.innerHTML='<div class="sr-eq-float-head"><strong>'+labels[id]+'</strong><button type="button" data-eq-float-close aria-label="Close EQ values">×</button></div>'
      +kindFor(id).map(kind=>'<label class="sr-eq-float-row"><span>'+({freq:"FREQ",gain:"GAIN",q:"Q"}[kind])+'</span>'
        +'<input type="text" spellcheck="false" inputmode="decimal" data-eq-float-value="'+kind+'" aria-label="'+labels[id]+' '+kind+'" value="'
        +formatted(kind,get(id,kind))+'"/></label>').join("");
    box.hidden=false;
    place(id);
  };
  const last={lastX:-9999,lastY:-9999};
  const releaseDrag=e=>{
    if(!popupDrag||e.pointerId!==popupDrag.pointer)return;
    e.preventDefault();e.stopPropagation();
    const d=popupDrag;popupDrag=null;
    if(d.input.hasPointerCapture?.(e.pointerId))d.input.releasePointerCapture(e.pointerId);
    if(d.moved){
      d.input.value=formatted(d.kind,get(d.id,d.kind));
      committed(d.before);
      // Returning from a numeric drag keeps the floating editor alive.
      last.lastX=e.clientX;last.lastY=e.clientY;
      cancelHide();
    }else{
      d.input.focus({preventScroll:true});d.input.select();
    }
  };
  box.onpointerdown=e=>{
    e.stopPropagation();
    if(e.target.closest('[data-eq-float-close]')){
      e.preventDefault();
      if(document.activeElement instanceof HTMLElement)document.activeElement.blur();
      hide();return;
    }
    const input=e.target.closest('[data-eq-float-value]');
    if(!input||!active)return;
    e.preventDefault();
    popupDrag={pointer:e.pointerId,id:active.id,kind:input.dataset.eqFloatValue,
      input,startY:e.clientY,lastY:e.clientY,moved:false,before:ctx.snapshot()};
    input.setPointerCapture(e.pointerId);
  };
  box.onpointermove=e=>{
    last.lastX=e.clientX;last.lastY=e.clientY;
    if(!popupDrag||popupDrag.pointer!==e.pointerId)return;
    const d=popupDrag;
    if(!d.moved&&Math.abs(e.clientY-d.startY)<3)return;
    d.moved=true;
    const px=d.lastY-e.clientY;d.lastY=e.clientY;
    if(!px)return;
    const old=get(d.id,d.kind);
    const fine=e.shiftKey;
    const next=d.kind==="freq"?old*Math.exp(px*(fine?.0025:.0125)):
      d.kind==="gain"?old+px*(fine?.015:.075):old*Math.exp(px*(fine?.003:.015));
    if(apply(d.id,d.kind,next)){d.input.value=formatted(d.kind,get(d.id,d.kind));place(d.id);}
  };
  box.onpointerup=releaseDrag;
  box.onpointercancel=e=>{
    if(!popupDrag||popupDrag.pointer!==e.pointerId)return;
    const d=popupDrag;popupDrag=null;committed(d.before);syncRows();
  };
  box.onwheel=e=>{
    const input=e.target.closest('[data-eq-float-value]');
    if(!input||!active||document.activeElement===input)return;
    e.preventDefault();e.stopPropagation();
    if(wheelTarget!==input){wheelTarget=input;wheelAccum=0;}
    const dy=e.deltaMode===1?e.deltaY*16:e.deltaMode===2?e.deltaY*120:e.deltaY;
    if(!Number.isFinite(dy))return;
    wheelAccum+=dy;
    if(Math.abs(wheelAccum)<12/1.3)return;
    const dir=wheelAccum<0?1:-1;wheelAccum=0;
    const kind=input.dataset.eqFloatValue;
    const step=kind==="freq"?1:kind==="gain"?.1:.01;
    const before=ctx.snapshot();
    if(apply(active.id,kind,get(active.id,kind)+dir*step)){committed(before);syncRows();place(active.id);}
  };
  // Commit explicitly on Enter; blur alone is not a reliable completion
  // signal after a synthetic select()/keyboard gesture in all Chromium hosts.
  const commitTyped=input=>{
    if(!active||!input)return;
    const kind=input.dataset.eqFloatValue,raw=parseNumber(input.value,kind);
    const before=ctx.snapshot();
    if(apply(active.id,kind,raw))committed(before);
    input.value=formatted(kind,get(active.id,kind));
  };
  box.onkeydown=e=>{
    const input=e.target.closest('[data-eq-float-value]');
    if(!input)return;
    if(e.key==="Enter"){
      e.preventDefault();e.stopPropagation();
      commitTyped(input);input.blur();
    }else if(e.key==="Escape"){
      e.preventDefault();e.stopPropagation();
      input.dataset.cancelEdit="1";
      input.value=formatted(input.dataset.eqFloatValue,get(active.id,input.dataset.eqFloatValue));
      input.blur();
    }
  };
  box.onfocusin=e=>{
    if(e.target.closest('[data-eq-float-value]'))cancelHide();
  };
  box.onfocusout=e=>{
    const input=e.target.closest('[data-eq-float-value]');
    if(!input||!active)return;
    if(input.dataset.cancelEdit==="1"){delete input.dataset.cancelEdit;return;}
    commitTyped(input);
  };
  box.onpointerenter=()=>cancelHide();
  box.onpointerleave=e=>{last.lastX=e.clientX;last.lastY=e.clientY;delayHide(last);};
  box.onclick=e=>e.stopPropagation();
  if(!boundWindow){
    boundWindow=true;
    document.addEventListener("pointermove",e=>{
      if(!active||popupDrag||box.hidden)return;
      const context=active.ctx;
      if(context?.svg?.contains(e.target)||box.contains(e.target))return;
      last.lastX=e.clientX;last.lastY=e.clientY;
      if(nearBox(e.clientX,e.clientY,active.anchor))cancelHide();
      else delayHide(last);
    });
    document.addEventListener("pointerdown",e=>{
      if(box.hidden||box.contains(e.target)||active?.ctx?.svg?.contains(e.target))return;
      if(document.activeElement instanceof HTMLElement)document.activeElement.blur();
      hide();
    });
    window.addEventListener("resize",()=>{if(active?.ctx?.svg?.isConnected&&active.ctx.reposition)active.ctx.reposition();});
  }
  ctx.reposition=()=>{if(active?.ctx===ctx)place(active.id);};
  let drag=null;
  svg.addEventListener("click",e=>e.stopPropagation());
  svg.addEventListener("contextmenu",e=>{
    if(e.target.closest('[data-eq-node]'))e.preventDefault();
  });
  svg.addEventListener("focusin",e=>{
    const dot=e.target.closest?.('[data-eq-node]');
    if(dot&&!popupDrag){ctx.select?.(dot.dataset.eqNode);open(dot.dataset.eqNode);}
  });
  svg.addEventListener("pointerover",e=>{
    const dot=e.target.closest('[data-eq-node]');
    if(dot&&!drag&&!popupDrag){open(dot.dataset.eqNode);last.lastX=e.clientX;last.lastY=e.clientY;}
  });
  svg.addEventListener("pointerout",e=>{
    if(!e.target.closest('[data-eq-node]')||drag)return;
    last.lastX=e.clientX;last.lastY=e.clientY;delayHide(last);
  });
  svg.addEventListener("pointerdown",e=>{
    const dot=e.target.closest('[data-eq-node]');
    if(!dot||e.button!==0)return;
    e.preventDefault();e.stopPropagation();
    const id=dot.dataset.eqNode;
    ctx.select?.(id);
    drag={id,pointer:e.pointerId,startX:e.clientX,startY:e.clientY,
      freq:get(id,"freq"),gain:id.startsWith("b")?get(id,"gain"):0,
      before:ctx.snapshot(),changed:false};
    svg.setPointerCapture(e.pointerId);
    dot.focus({preventScroll:true});open(id);
  });
  svg.addEventListener("pointermove",e=>{
    if(!drag||e.pointerId!==drag.pointer)return;
    e.preventDefault();e.stopPropagation();
    const r=svg.getBoundingClientRect(),fine=e.shiftKey?.1:1;
    const hz=drag.freq*Math.pow(1000,(e.clientX-drag.startX)/Math.max(1,r.width)*fine);
    let changed=apply(drag.id,"freq",hz);
    if(drag.id.startsWith("b")){
      const gain=drag.gain+(drag.startY-e.clientY)/Math.max(1,r.height)*36*fine;
      changed=apply(drag.id,"gain",gain)||changed;
    }
    drag.changed=drag.changed||changed;
    if(active?.id===drag.id){syncRows();place(drag.id);}
  });
  const finish=e=>{
    if(!drag||e.pointerId!==drag.pointer)return;
    e.stopPropagation();
    const d=drag;drag=null;
    if(svg.hasPointerCapture(e.pointerId))svg.releasePointerCapture(e.pointerId);
    if(d.changed){committed(d.before);syncRows();place(d.id);}
  };
  svg.addEventListener("pointerup",finish);
  svg.addEventListener("pointercancel",finish);
  let nodeWheelTarget=null,nodeWheelAccum=0;
  svg.addEventListener("wheel",e=>{
    const dot=e.target.closest('[data-eq-node]');if(!dot)return;
    if(e.ctrlKey)return;
    e.preventDefault();e.stopPropagation();
    const id=dot.dataset.eqNode;
    ctx.select?.(id);
    if(nodeWheelTarget!==id){nodeWheelTarget=id;nodeWheelAccum=0;}
    const dy=e.deltaMode===1?e.deltaY*16:e.deltaMode===2?e.deltaY*120:e.deltaY;
    nodeWheelAccum+=dy;
    if(Math.abs(nodeWheelAccum)<12/1.3)return;
    const delta=nodeWheelAccum;nodeWheelAccum=0;
    const before=ctx.snapshot();
    if(id.startsWith("b")){
      // VVChain: wheel on graph POINT adjusts Q, not Gain.
      const q=get(id,"q");
      apply(id,"q",q*Math.exp(clamp(delta/100,-1,1)*(e.shiftKey?.0075:.075)));
    }else{
      apply(id,"freq",get(id,"freq")+(delta<0?1:-1));
    }
    committed(before);open(id);syncRows();
  },{passive:false});
  // Pointer capture can retarget click/dblclick from circle to the SVG
  // itself. Always use actual screen-space coordinates for a 2-click gesture;
  // never reset a section by double-clicking unrelated blank graph space.
  const doubleClickNode=e=>{
    const direct=e.target.closest?.('[data-eq-node]');
    if(direct)return direct.dataset.eqNode;
    let nearest=null,distance=14;
    for(const id of NODES){
      const a=anchorFor(id);if(!a)continue;
      const d=Math.hypot(e.clientX-a.x,e.clientY-a.y);
      if(d<distance){distance=d;nearest=id;}
    }
    return nearest;
  };
  const resetDouble=e=>{
    const id=doubleClickNode(e);if(!id)return;
    e.preventDefault();e.stopPropagation();
    const before=ctx.snapshot();
    // Exactly VVChain's Bell semantics: Gain zero, Freq and Q unchanged.
    const d=def(keyFor(id,"freq"));
    if(id.startsWith("b"))apply(id,"gain",0);
    else apply(id,"freq",Number(d.default));
    committed(before);open(id);syncRows();
  };
  // Puppeteer/host can send click(detail=2) with dblclick on the SVG
  // itself following pointer-capture release. Both paths are idempotent.
  svg.addEventListener("click",e=>{if(e.detail>=2)resetDouble(e);});
  svg.addEventListener("dblclick",resetDouble);
  svg.addEventListener("keydown",e=>{
    const dot=e.target.closest('[data-eq-node]');if(!dot)return;
    const id=dot.dataset.eqNode,kind=id.startsWith("b")?"gain":"freq";
    const key=keyFor(id,kind),d=def(key);
    let step=Number(d.step)||1;
    if(e.shiftKey)step=Math.max(step/10,kind==="gain"?.01:1);
    const direction=["ArrowUp","ArrowRight"].includes(e.key)?1:
      ["ArrowDown","ArrowLeft"].includes(e.key)?-1:0;
    if(!direction)return;
    e.preventDefault();e.stopPropagation();
    const before=ctx.snapshot();apply(id,kind,get(id,kind)+direction*step);committed(before);open(id);
  });
}
