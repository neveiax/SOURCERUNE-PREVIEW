import {extendedBounds} from "./ui02-extended-layout.mjs";
import {screenshotMatches} from "./card-layout.mjs";
import {MOTION_MODES,AMBIENCE_TYPES,DETAIL_CONTROLS} from "./interaction-state.mjs";
// Browser UI state only; this module does not produce sound or audio data.
const el=(tag,cls,text)=>{
  const n=document.createElement(tag);n.className=cls||"";
  if(text!==undefined)n.textContent=text;return n;
};
export function mountUI02Extended({frame,image,lab}) {
  const root=el("div","ui02-extended-overlay");
  frame.append(root);
  let active=false;
  function buildSelect(options,title,handler) {
    const n=el("select","ui02-native-select");n.setAttribute("aria-label",title);
    for(const key of options){const o=el("option","",key.replaceAll("_"," "));o.value=key;n.append(o)}
    n.addEventListener("change",()=>handler(n.value));return n;
  }
  function slider(id,label,handler) {
    const d=DETAIL_CONTROLS.find(c=>c.id===id);
    const n=el("label","ui02-native-rangebox"),caption=el("span","ui02-native-label",label);
    const out=el("output","ui02-native-value"),r=el("input","ui02-native-range");
    r.type="range";r.min=String(d.min);r.max=String(d.max);r.step=String(d.step);
    r.setAttribute("aria-label",label+" UI value");
    const show=()=>{out.value=r.value+d.unit};
    r.addEventListener("input",show);
    r.addEventListener("change",()=>handler(Number(r.value)));
    n.append(caption,out,r);return{n,r,show};
  }
  function amount(id,label) {
    const n=el("label","ui02-native-rangebox"),caption=el("span","ui02-native-label",label);
    const out=el("output","ui02-native-value"),r=el("input","ui02-native-range");
    r.type="range";r.min="0";r.max="100";r.step="1";
    r.setAttribute("aria-label",label+" UI percent");
    r.addEventListener("input",()=>out.value=r.value+"%");
    r.addEventListener("change",()=>lab.perform({type:"param",id,value:Number(r.value)},label+" UI updated"));
    n.append(caption,out,r);return{n,r,show:()=>out.value=r.value+"%"};
  }
  function panel(name) {
    const box=el("section","ui02-native-panel");
    box.dataset.ui02=name;const head=el("header","ui02-native-head");
    head.append(el("strong","",name==="MOTION"?"MOTION / DISTANCE":"AMBIENCE"));
    const bypass=el("button","ui02-native-bypass","ACTIVE");bypass.type="button";
    bypass.setAttribute("aria-label","Toggle "+name+" UI-only bypass");
    bypass.addEventListener("click",()=>lab.perform({type:"auxBypass",group:name},name+" bypass changed"));
    head.append(bypass);box.append(head);
    const body=el("div","ui02-native-body");box.append(body);
    return{box,body,bypass};
  }
  const motion=panel("MOTION"),ambience=panel("AMBIENCE");
  const mode=buildSelect(MOTION_MODES,"Motion mode",value=>lab.perform({type:"mode",group:"MOTION",value},"Motion mode"));
  const position=amount("motion","POSITION");
  const track=el("div","ui02-motion-track"),marker=el("span","ui02-motion-marker");
  track.append(marker);track.setAttribute("aria-hidden","true");
  const motionFields=["startDistance","closestDistance","endDistance","speed","doppler","width","perspective"]
    .map(id=>({id,...slider(id,id.replace(/([A-Z])/g," $1").toUpperCase(),value=>
      lab.perform({type:"detail",id,value},id+" changed"))}));
  const motionTop=el("div","ui02-motion-top");
  motionTop.append(mode,track,position.n);
  const motionNumbers=el("div","ui02-motion-details");
  motionFields.forEach(x=>motionNumbers.append(x.n));
  motion.body.append(motionTop,motionNumbers);
  const ambType=buildSelect(AMBIENCE_TYPES,"Ambience type",value=>
    lab.perform({type:"mode",group:"AMBIENCE",value},"Ambience type"));
  const ambAmount=amount("ambience","AMOUNT");
  const ambFields=["ambienceLevel","ambienceDuck"].map(id=>({id,...slider(id,
    id==="ambienceLevel"?"LEVEL":"DUCK",value=>
      lab.perform({type:"detail",id,value},id+" changed"))}));
  const seed=el("output","ui02-seed-value");
  const seedBtn=el("button","ui02-seed-button","NEW SEED");seedBtn.type="button";
  seedBtn.addEventListener("click",()=>lab.perform({type:"newSeed"},"Seed UI updated"));
  ambience.body.append(ambType,ambAmount.n,...ambFields.map(x=>x.n),seed,seedBtn,
    el("small","ui02-native-note","UI STATE ONLY · NO AUDIO"));
  function show(){
    const state=lab.getState();
    if(state.ui!=="UI_02"||!image.complete||
       !screenshotMatches(state.ui,image.naturalWidth,image.naturalHeight)){
      root.replaceChildren();active=false;return;
    }
    if(!active){root.replaceChildren(motion.box,ambience.box);active=true}
    for(const [name,w] of [["MOTION",motion],["AMBIENCE",ambience]]){
      const bounds=extendedBounds(name);
      for(const prop of ["left","top","width","height"])w.box.style[prop]=bounds[prop]+"%";
      const on=state.extraBypass[name];
      w.box.classList.toggle("is-bypassed",on);
      w.bypass.textContent=on?"BYPASSED":"ACTIVE";
      w.bypass.setAttribute("aria-pressed",String(on));
    }
    mode.value=state.mode.MOTION;position.r.value=String(state.params.motion);position.show();
    marker.style.left=state.params.motion+"%";
    for(const w of motionFields){w.r.value=String(state.detail[w.id]);w.show()}
    ambType.value=state.mode.AMBIENCE;
    ambAmount.r.value=String(state.params.ambience);ambAmount.show();
    for(const w of ambFields){w.r.value=String(state.detail[w.id]);w.show()}
    seed.value="SEED "+state.ambienceSeed;
  }
  lab.subscribe(show);image.addEventListener("load",show);
  image.addEventListener("error",()=>{root.replaceChildren();active=false});
  show();return{render:show};
}
