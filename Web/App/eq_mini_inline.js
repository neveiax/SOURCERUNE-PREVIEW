// Compact EQ values in the SAME existing card, never an overlay.
// Selected mini graph node determines the live FREQ / GAIN / Q fields.
// No new DSP, state keys, or additional AudioWorklet instances.
const sections=["hpf","b1","b2","b3","lpf"];
const name={hpf:"HPF",b1:"BAND 1",b2:"BAND 2",b3:"BAND 3",lpf:"LPF"};
let selected="b2",context=null;
const key=(id,k)=>id==="hpf"||id==="lpf"?id:id+(k==="freq"?"Freq":k==="gain"?"Gain":"Q");
const clamp=(v,min,max)=>Math.min(max,Math.max(min,v));
const format=(kind,v)=>kind==="freq"?
  (v>=1000?Number((v/1000).toFixed(3))+" kHz":Number(v.toFixed(2))+" Hz"):
  kind==="gain"?(v>=0?"+":"")+Number(v.toFixed(2))+" dB":Number(v.toFixed(2)).toString();
const parse=(kind,value)=>{
  const m=String(value).replace(/,/g,"").match(/[-+]?(?:\d+\.?\d*|\.\d+)/);
  if(!m)return NaN;
  let n=Number(m[0]);
  if(kind==="freq"&&/k(?:hz)?\b/i.test(value))n*=1000;
  return n;
};
export function eqMiniInlineMarkup(){
  return '<div class="eq-mini-inline" data-eq-mini-inline aria-label="Selected EQ band values">'
    +'<span class="eq-mini-selected" data-eq-mini-selected>BAND 2</span>'
    +['freq','gain','q'].map(k=>
      '<label class="eq-mini-field" data-eq-mini-field="'+k+'"><span>'+k.toUpperCase()+'</span>'
      +'<input type="text" spellcheck="false" inputmode="decimal" '
      +'data-eq-mini-value="'+k+'" aria-label="Selected EQ '+k+'" '
      +'title="Scroll for one step; drag up or down; Shift for fine; click and type"></label>').join('')
    +'</div>';
}
export function currentEqMiniSelection(){return selected;}
export function syncEqMiniInline(){
  const root=document.querySelector("[data-eq-mini-inline]");
  if(!root||!context)return;
  root.querySelector("[data-eq-mini-selected]").textContent=name[selected];
  root.dataset.eqMiniSelected=selected;
  for(const kind of ["freq","gain","q"]){
    const cut=selected==="hpf"||selected==="lpf",disabled=cut&&kind!=="freq";
    const el=root.querySelector('[data-eq-mini-value="'+kind+'"]'),wrapper=el.closest(".eq-mini-field");
    wrapper.classList.toggle("inactive",disabled);
    el.disabled=disabled;
    const keyName=key(selected,kind);
    if(disabled){el.value="—";continue;}
    if(el!==document.activeElement&&!el.hasAttribute("data-eq-edit-drag"))
      el.value=format(kind,Number(context.state().params[keyName]));
    el.title=(name[selected]+" "+kind+" · wheel / drag vertically / type");
  }
}
export function selectEqMiniInline(id){
  if(!sections.includes(id))return;
  if(id===selected){syncEqMiniInline();return;}
  const prev=document.querySelector("[data-eq-mini-inline] input:focus");
  if(prev)prev.blur();
  selected=id;syncEqMiniInline();
  for(const dot of document.querySelectorAll(".macro-eq-svg [data-eq-node]"))
    dot.classList.toggle("eq-mini-current",dot.dataset.eqNode===id);
}
export function bindEqMiniInline(bridge){
  context=bridge;
  const root=document.querySelector("[data-eq-mini-inline]");
  if(!root)return;
  const quant=(keyName,v)=>{
    const d=bridge.findControl(keyName);
    if(!d||!Number.isFinite(v))return null;
    const lo=Number(d.min),hi=Number(d.max),step=Number(d.step)||1;
    return Number(clamp(lo+Math.round((clamp(v,lo,hi)-lo)/step)*step,lo,hi).toFixed(6));
  };
  const apply=(kind,v)=>{
    const keyName=key(selected,kind),next=quant(keyName,v);
    if(next===null||next===Number(bridge.state().params[keyName]))return false;
    bridge.state().params[keyName]=next;
    bridge.changed(keyName,next);
    syncEqMiniInline();
    return true;
  };
  const commit=before=>{
    if(JSON.stringify(before.params)!==JSON.stringify(bridge.state().params))
      bridge.commit(before);
  };
  for(const input of root.querySelectorAll("[data-eq-mini-value]")){
    const kind=input.dataset.eqMiniValue;
    let pointer=null,accum=0;
    input.addEventListener("wheel",e=>{
      if(input.disabled||e.ctrlKey)return;
      e.preventDefault();e.stopPropagation();
      const delta=e.deltaMode===1?e.deltaY*16:e.deltaMode===2?e.deltaY*120:e.deltaY;
      if(!Number.isFinite(delta))return;
      accum+=delta;
      if(Math.abs(accum)<12/1.3)return;
      const dir=accum<0?1:-1;accum=0;
      const k=key(selected,kind),step=Number(bridge.findControl(k).step)||1;
      const before=bridge.snapshot();
      if(apply(kind,Number(bridge.state().params[k])+dir*step))commit(before);
    },{passive:false});
    input.addEventListener("pointerdown",e=>{
      if(e.button!==0||input.disabled)return;
      e.preventDefault();e.stopPropagation();
      const k=key(selected,kind);
      pointer={id:e.pointerId,band:selected,key:k,y:e.clientY,start:Number(bridge.state().params[k]),
        before:bridge.snapshot(),moved:false};
      input.setAttribute("data-eq-edit-drag","");
      input.setPointerCapture(e.pointerId);
    });
    input.addEventListener("pointermove",e=>{
      if(!pointer||pointer.id!==e.pointerId)return;
      const dy=pointer.y-e.clientY;
      if(Math.abs(dy)>3)pointer.moved=true;
      if(!pointer.moved)return;
      e.preventDefault();e.stopPropagation();
      const factor=e.shiftKey?.2:1,base=pointer.start;
      const raw=kind==="freq"?base*Math.exp(dy*.0125*factor):
        kind==="gain"?base+dy*.075*factor:base*Math.exp(dy*.015*factor);
      apply(kind,raw);
      // Avoid overwriting the active dragged field until pointer release.
      input.value=format(kind,Number(bridge.state().params[pointer.key]));
    });
    const finish=e=>{
      if(!pointer||pointer.id!==e.pointerId)return;
      e.stopPropagation();
      const p=pointer;pointer=null;
      input.removeAttribute("data-eq-edit-drag");
      if(input.hasPointerCapture(e.pointerId))input.releasePointerCapture(e.pointerId);
      if(p.moved)commit(p.before);
      else {input.focus({preventScroll:true});input.select();}
      syncEqMiniInline();
    };
    input.addEventListener("pointerup",finish);
    input.addEventListener("pointercancel",finish);
    input.addEventListener("keydown",e=>{
      if(e.key==="Enter"){e.preventDefault();input.blur();}
      else if(e.key==="Escape"){e.preventDefault();input.dataset.cancelEdit="1";input.blur();}
      else if(["ArrowUp","ArrowDown"].includes(e.key)){
        e.preventDefault();const before=bridge.snapshot(),k=key(selected,kind);
        const step=Number(bridge.findControl(k).step)||1;
        if(apply(kind,Number(bridge.state().params[k])+(e.key==="ArrowUp"?step:-step)))
          commit(before);
      }
    });
    input.addEventListener("blur",()=>{
      if(input.dataset.cancelEdit){delete input.dataset.cancelEdit;syncEqMiniInline();return;}
      const before=bridge.snapshot(),val=parse(kind,input.value);
      if(apply(kind,val))commit(before);
      syncEqMiniInline();
    });
    input.addEventListener("click",e=>e.stopPropagation());
    input.addEventListener("dblclick",e=>e.stopPropagation());
  }
  syncEqMiniInline();
}
