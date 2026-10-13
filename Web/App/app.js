import {createSceneNode, parametersFromState, hpfFromState, eq3FromState, audioSupportNote} from "./audio/engine.js";
import {eqGraph,miniEqSvg as renderThreeBandEq,updateEqPlot,sizeEqMarkers} from "./eq_graph.js";
import {updateEqAnalyzer,createSpectrumDisplayTrace} from "./eq_analyzer_v1.js";
import {attachEqInteractions,dismissEqFloat} from "./eq_interactions.js";
import {eqMiniInlineMarkup,bindEqMiniInline,syncEqMiniInline,selectEqMiniInline} from "./eq_mini_inline.js";
import {openEqFocus,eqFocusIsOpen,markMiniEqInert,syncEqFocus,repositionEqFocus} from "./eq_focus.js";
import {sceneViewBox,syncSceneZoom,syncSceneGuide,syncSceneTime,bindSceneView} from "./scene_view_ref_stage1.js";
import {ambienceRefMarkup,bindAmbienceRef,paintAmbienceOutput,intelligibilityRefMarkup,mixRefMarkup,syncMixRef} from "./ui01_bottom_ref.js";
const $=(q,r=document)=>r.querySelector(q),$$=(q,r=document)=>[...r.querySelectorAll(q)];
const TYPES=["SOURCE","TRANSMISSION","WALL_COVER","SPACE_ENVIRONMENT"],LABEL={SOURCE:"SOURCE",TRANSMISSION:"TRANSMISSION",WALL_COVER:"WALL / COVER",SPACE_ENVIRONMENT:"SPACE / ENVIRONMENT",SCENE_PRESET_HERO:"SCENE PRESET HERO"};
const DEFSEL={SOURCE:"SRC_003_Smartphone_Speakerphone",TRANSMISSION:"TRN_005_GSM_Stable",WALL_COVER:"CVR_001_None_Open",SPACE_ENVIRONMENT:"SPC_022_Busy_City_Street"};
let schema,catalog,scenePresets={},byId,state,userPresets={},undo=[],redo=[],browserType="SOURCE",stateClipboard=null,browserReturnFocus=null,browserReturnType=null;
let sceneNode,audioSetup,audioUrl,audioName="",audioLoadGeneration=0,publicDspRelease=null;
let audioCtx,media,inAn,outAn,inGain,outGain,publicTone,peakIn=-Infinity,peakOut=-Infinity,meterMode="PEAK";
const audio=$("#audioElement");
const copy=v=>JSON.parse(JSON.stringify(v)),db=v=>v<=1e-7?-Infinity:20*Math.log10(v),fmt=v=>isFinite(v)?v.toFixed(1):"−∞",gain=v=>Math.pow(10,v/20),pretty=v=>String(v).replaceAll("_"," ");

function mountAdvancedDialog(){
  const drawer=$(".advanced-drawer");
  if(!drawer)return;
  const backdrop=document.createElement("div");
  backdrop.id="advancedBackdrop";
  backdrop.setAttribute("aria-label","Close detailed controls");
  backdrop.addEventListener("pointerdown",e=>{
    if(e.target===backdrop)closeAdvanced();
  });
  drawer.setAttribute("role","dialog");
  drawer.setAttribute("aria-modal","true");
  drawer.setAttribute("aria-labelledby","advancedTitle");
  // Outside the transformed, overflow-clipped plugin shell: natural dialog size.
  document.body.append(backdrop,drawer);
}
function mountWebTransport(){
  const dock=document.createElement("section");dock.id="webAudioTransport";dock.setAttribute("aria-label","Web audio audition");
  const row=document.createElement("div");row.className="audio-controls";dock.append(row);
  for(const q of [".top-actions>.file-btn","#playBtn","#stopBtn",".loop-toggle","#globalBypass",".top-actions>.segmented","#stateStatus"]){const element=$(q);if(element)row.append(element);}
  dock.append($(".build-status"));document.body.append(dock);
}
function fitRuntimeShell(){const ui2=state?.ui==="UI_02",rw=ui2?1672:1499,rh=ui2?941:807,vw=Math.max(1,window.innerWidth),vh=Math.max(1,window.innerHeight-78),s=Math.min(vw/rw,vh/rh),app=$(".app");if(!app)return;app.style.width=rw+"px";app.style.height=rh+"px";app.style.transform="none";app.style.zoom=String(s)}
function applySceneViewportProfile(){
  const svg=$("#sceneSvg");if(!svg)return;
  const ui1=state?.ui==="UI_01";
  svg.setAttribute("viewBox",ui1?sceneViewBox(state?.sceneZoom||1):"0 0 1000 420");
  svg.setAttribute("preserveAspectRatio","xMidYMid meet");
  const listener=$("#listenerNode");
  if(listener)listener.setAttribute("transform",ui1?"translate(500 250)":"translate(500 270)");
  const path=$("#motionPath");
  if(path&&!ui1)path.setAttribute("d","M110 325 C340 250 650 250 900 325");
}
function newState(){const p={};for(const g of Object.values(schema.groups))for(const c of g.controls)p[c.id]=c.default;return{ui:"UI_01",view:"3D",sceneZoom:1,tab:"spectrum",advanced:"MOTION",params:p,selection:{...DEFSEL},bypass:Object.fromEntries(Object.entries(schema.groups).filter(([,g])=>g.bypass).map(([k])=>[k,false])),sync:true,seed:48151623,markers:{start:null,closest:null,end:null},globalBypass:false,preset:null,snapshots:{A:null,B:null,C:null,D:null},generatorOn:false}}
function migrateLegacyEq(s){
  const base=newState(),next=Object.assign(base,copy(s));
  next.params=Object.assign({},base.params,s?.params||{});
  for(const k of ["b4Freq","b4Gain","b4Q"])delete next.params[k];
  return next;
}
function core(){const s=copy(state);delete s.snapshots;return s}function mark(t){$("#stateStatus").textContent=t}function push(){undo.push(core());if(undo.length>80)undo.shift();redo=[];hist()}function mut(fn){push();fn();mark("MODIFIED");refresh()}function hist(){$("#undoBtn").disabled=!undo.length;$("#redoBtn").disabled=!redo.length;const p=$("#pasteStateBtn");if(p)p.disabled=!stateClipboard}
function copyState(){stateClipboard=core();mark("STATE COPIED");hist()}
function pasteState(){if(!stateClipboard)return;push();const keep={ui:state.ui,view:state.view,snapshots:state.snapshots};state=migrateLegacyEq(stateClipboard);state.ui=keep.ui;state.view=keep.view;state.snapshots=keep.snapshots;mark("STATE PASTED");refresh()}
function toggleSceneFullscreen(){const el=$(".scene-panel");if(!document.fullscreenElement)el?.requestFullscreen?.();else document.exitFullscreen?.()}
function syncFullscreenState(){const b=$("#sceneFullscreenBtn");if(b)b.classList.toggle("active",document.fullscreenElement===$(".scene-panel"))}
function restore(s){const snaps=state.snapshots;state=migrateLegacyEq(s);state.snapshots=snaps;refresh()}
function assetUrl(x){return "../../Assets/UI/"+(state.ui==="UI_01"?x.ui01:x.ui02)}
function selected(t){return byId.get(state.selection[t])}
async function init(){[schema,{items:catalog},{presets:scenePresets}]=await Promise.all([fetch("./data/ui_controls.json").then(r=>r.json()),fetch("./data/catalog.json").then(r=>r.json()),fetch("./data/scene_presets_v1.json").then(r=>r.json())]);byId=new Map(catalog.map(x=>[x.id,x]));state=newState();const requestedUi=new URLSearchParams(location.search).get("ui");if(requestedUi==="UI_01"||requestedUi==="UI_02")state.ui=requestedUi;try{userPresets=JSON.parse(localStorage.getItem("sourcerune.userPresets.v1")||"{}")}catch{}mountWebTransport();mountAdvancedDialog();renderPreset();renderNav();bind();refresh();hist();animate();if(new URLSearchParams(location.search).has("test"))$("#diagnosticBar").classList.remove("hidden")}
function refresh(){document.body.classList.toggle("ui-01",state.ui==="UI_01");document.body.classList.toggle("ui-02",state.ui==="UI_02");applySceneViewportProfile();$$("[data-ui]").forEach(b=>b.classList.toggle("active",b.dataset.ui===state.ui));$$("[data-global-ui]").forEach(b=>b.classList.toggle("active",b.dataset.globalUi===state.ui));$$("[data-view]").forEach(b=>b.classList.toggle("active",b.dataset.view===state.view));$$("[data-tab]").forEach(b=>b.classList.toggle("active",b.dataset.tab===state.tab));$$(".tab-content").forEach(el=>el.classList.toggle("active",el.dataset.content===state.tab));$$("[data-motion-mode]").forEach(b=>b.classList.toggle("active",b.dataset.motionMode===state.params.motionMode));const presetSelector=$("#presetSelect");if(presetSelector)presetSelector.value=state.preset||"";const presetHero=state.preset?.startsWith("factory:")?byId.get(state.preset.slice(8)):null;const savedPreset=state.preset?.startsWith("user:")?userPresets[state.preset.slice(5)]:null;$("#sceneTitle").textContent=(presetHero&&scenePresets[presetHero.id]?.name)||presetHero?.name||savedPreset?.name||"Scene View";$("#syncToggle").checked=state.sync;$("#globalBypass").classList.toggle("active",state.globalBypass);$("#seedReadout").textContent=state.seed;$("#syncReadout").textContent=state.sync?"WEB TIMELINE":"MANUAL";const sp=selected("SPACE_ENVIRONMENT"),hero=state.preset?.startsWith("factory:")?byId.get(state.preset.slice(8)):null,sceneArt=hero&&!String(hero.status||"").includes("art-required")?hero:sp;if(sceneArt){$(".scene-panel")?.style.setProperty("--ui02-scene-bg",`url("${assetUrl(sceneArt)}")`)}renderModules();renderMacros();refreshMiniEq();renderFlow();renderAdvanced();renderMarkers();updateScene();updateGains();updateCurves();fitRuntimeShell();repositionEqFocus();requestAnimationFrame(()=>{if(window.auditReferenceGeometry){const a=window.auditReferenceGeometry();window.__geometryAudit=a;document.body.dataset.geometryOk=a.ok?"1":"0";document.body.dataset.geometryUi=a.ui||"";document.body.dataset.geometryFailures=(a.failures||[]).join(",")}})}
function renderPreset(){const fac=catalog?.filter(x=>x.type==="SCENE_PRESET_HERO")||[],usr=Object.entries(userPresets);$("#presetSelect").innerHTML='<option value="">— Select scene preset —</option><optgroup label="Factory scene visuals">'+fac.map(x=>`<option value="factory:${x.id}">${x.name}</option>`).join("")+'</optgroup>'+(usr.length?'<optgroup label="User presets">'+usr.map(([k,v])=>`<option value="user:${k}">${v.name}</option>`).join("")+'</optgroup>':"");if(state?.preset)$("#presetSelect").value=state.preset}
function cycleAsset(t,dir){const list=catalog.filter(x=>x.type===t),cur=state.selection[t],i=Math.max(0,list.findIndex(x=>x.id===cur)),n=(i+dir+list.length)%list.length;mut(()=>state.selection[t]=list[n].id)}
let advancedReturnFocus=null;
function openAdvanced(section){
  advancedReturnFocus=document.activeElement;
  state.advanced=section;
  renderAdvanced();
  renderMacros();
  document.body.classList.add("advanced-open");
  $("#advancedCloseBtn")?.focus({preventScroll:true});
}
function closeAdvanced(){
  if(!document.body.classList.contains("advanced-open"))return;
  document.body.classList.remove("advanced-open");
  if(advancedReturnFocus?.isConnected&&typeof advancedReturnFocus.focus==="function")
    advancedReturnFocus.focus({preventScroll:true});
  advancedReturnFocus=null;
}
function renderModules(){$("#moduleRail").innerHTML=TYPES.map(t=>{const x=selected(t),bp=state.bypass[t],hero=state.preset?.startsWith("factory:")?byId.get(state.preset.slice(8)):null,art=state.ui==="UI_02"&&t==="SOURCE"&&hero&&!String(hero.status||"").includes("art-required")?hero:x;return`<article class="module-card ${bp?"bypassed":""}" data-type="${t}" tabindex="0" aria-label="Open ${LABEL[t]} asset library"><div class="module-art"><img src="${assetUrl(art)}" alt="" onerror="this.closest('.module-card').classList.add('missing');this.remove()"></div><button class="module-cycle module-cycle-prev" data-cycle="${t}" data-dir="-1" aria-label="Previous ${LABEL[t]}"></button><button class="module-cycle module-cycle-next" data-cycle="${t}" data-dir="1" aria-label="Next ${LABEL[t]}"></button><div class="module-actions"><button type="button" data-byp="${t}" class="${bp?"active":""}" aria-pressed="${bp?"true":"false"}" aria-label="Bypass ${LABEL[t]}">BYP</button><button type="button" data-edit="${t}" aria-label="Edit ${LABEL[t]}">EDIT</button></div><div class="module-meta"><span>${LABEL[t]}</span><strong>${x.name}</strong></div></article>`}).join("");$$(".module-card").forEach(e=>{e.onclick=x=>{if(!x.target.closest("button"))openBrowser(e.dataset.type,e)};e.onkeydown=x=>{if(x.target!==e||!(x.key==="Enter"||x.key===" "))return;x.preventDefault();openBrowser(e.dataset.type,e)}});$$("[data-cycle]").forEach(b=>b.onclick=e=>{e.stopPropagation();cycleAsset(b.dataset.cycle,+b.dataset.dir)});$$("[data-byp]").forEach(b=>b.onclick=()=>mut(()=>state.bypass[b.dataset.byp]=!state.bypass[b.dataset.byp]));$$("[data-edit]").forEach(b=>b.onclick=()=>openAdvanced(b.dataset.edit));$("#sourceLabel").textContent=selected("SOURCE").name.toUpperCase()}
const MAC=[["MOTION","motion","%","MOTION"],["BAD SIGNAL","badSignal","%","TRANSMISSION"],["CONDITION","condition","%","CONDITION"],["INTELLIGIBILITY","intelligibility","%","INTELLIGIBILITY"],["AMBIENCE","ambience","%","AMBIENCE"],["MIX","mix","%","MIX"],["ADVANCED EQ / TONE","finalTone","","EQ_TONE"]];
function macroPct(id){const c=findControl(id),v=+state.params[id];return Math.max(0,Math.min(100,(v-c.min)/(c.max-c.min)*100))}
function macroKnob(id,label,unit="",klass=""){const c=findControl(id),v=state.params[id],pct=macroPct(id),angle=-135+pct*2.7;return`<div class="macro-knob ${klass}" data-value="${v}${unit}" style="--pct:${pct};--angle:${angle}deg"><div class="macro-knob-face"><strong class="macro-knob-value">${v}${unit}</strong></div><span class="macro-knob-label">${label}</span><input class="macro-knob-range" data-macro="${id}" type="range" min="${c.min}" max="${c.max}" step="${c.step}" value="${v}" aria-label="${label}" aria-valuetext="${v}${c.unit||""}" title="Drag vertically, scroll, arrow keys, Shift for fine drag, double click to reset"></div>`}
function macroSelect(id,klass=""){const c=findControl(id);return`<select class="macro-select ${klass}" data-macro-selectbox="${id}">${c.options.map(o=>`<option value="${o}" ${state.params[id]===o?"selected":""}>${pretty(o)}</option>`).join("")}</select>`}
function modeButtons(id,vals,labels={}){return`<div class="macro-mode-row">${vals.map(v=>`<button type="button" data-macro-select="${id}" data-value="${v}" aria-pressed="${state.params[id]===v?"true":"false"}" class="${state.params[id]===v?"active":""}">${labels[v]||pretty(v)}</button>`).join("")}</div>`}
function hpfEqPath(){
  const hz=Number(state.params.hpf);
  if(state.bypass.EQ_TONE||hz<=20)return "M0 50H100";
  const lx=f=>Math.log10(Math.max(20,f)/20)/3*100;
  const y=Math.min(95,50+Math.max(0,Math.log2(hz/20))*12);
  return "M0 "+y.toFixed(1)+" L"+lx(hz).toFixed(1)+" 50 H100";
}
function miniEqSvg(){return renderThreeBandEq(state,audioCtx?.sampleRate||48000)}
function syncHpfUi(){
  const input=$("[data-eq-hpf]");
  if(input){
    input.value=String(state.params.hpf);
    const out=$("[data-eq-hpf-value]");
    if(out)out.textContent=state.params.hpf<=20?"OFF":state.params.hpf+" Hz";
  }
  const path=$("[data-eq-hpf-path]");
  if(path)path.setAttribute("d",eqGraph(state,audioCtx?.sampleRate||48000).path);
  const marker=$("[data-eq-hpf-marker]");
  if(marker)marker.setAttribute("cx",(Math.log10(Math.max(20,state.params.hpf)/20)/3*100).toFixed(1));
  refreshMiniEq();
}
function bindEqHpf(){
  const el=$("[data-eq-hpf]");
  if(!el)return;
  let before=null;
  const apply=raw=>{
    const def=findControl("hpf");
    const hz=Math.max(def.min,Math.min(def.max,Math.round(Number(raw))));
    if(!Number.isFinite(hz)||hz===state.params.hpf)return;
    state.params.hpf=hz;
    syncHpfUi();
    updateGains();
    const detail=$('[data-param="hpf"]');
    if(detail){detail.value=String(hz);const value=detail.closest(".adv-control")?.querySelector(".value");
      if(value)value.textContent=hz+" Hz";}
  };
  el.addEventListener("pointerdown",e=>{if(e.button===0)before=core();});
  el.addEventListener("keydown",()=>{if(!before)before=core();});
  el.addEventListener("input",e=>apply(e.target.value));
  el.addEventListener("change",e=>{
    apply(e.target.value);
    if(before)finishMacroKnobChange(before,"hpf");
    before=null;
  });
  el.addEventListener("wheel",e=>{
    if(e.ctrlKey||e.deltaY===0)return;
    e.preventDefault();e.stopPropagation();
    const old=core();apply(Number(state.params.hpf)+(e.deltaY<0?1:-1));
    finishMacroKnobChange(old,"hpf");
  },{passive:false});
  el.addEventListener("dblclick",e=>{
    e.preventDefault();e.stopPropagation();
    const old=core();apply(20);finishMacroKnobChange(old,"hpf");
  });
}

// UI_01's four reference checkboxes re-use the existing numeric controls.
// Zero means inactive; when checked again, restore the previous positive
// intensity (or the published schema default/minimum). No new DSP ID.
const lastUi01SignalIntensity=Object.create(null);
function ui01SignalDetail(){
  const rows=[["noiseStatic","Static"],["dropout","Dropout"],["interference","Interference"],["bitrateArtifacts","Low Bitrate"]];
  if(state.ui!=="UI_01")return rows.map(([id,label])=>`<span>${label} ${state.params[id]}%</span>`).join("");
  return `<div class="macro-signal-toggles">${rows.map(([id,label])=>{
    const amount=Number(state.params[id])||0;
    return `<label class="macro-signal-toggle" title="${label}: ${amount}% (set amount in Advanced)">
      <input type="checkbox" data-signal-checkbox="${id}" aria-label="${label} signal, ${amount}%" ${amount>0?"checked":""}>
      <span>${label}</span></label>`;
  }).join("")}</div>`;
}
function bindUi01SignalCheckboxes(){
  $$("[data-signal-checkbox]").forEach(box=>box.onchange=()=>{
    const id=box.dataset.signalCheckbox,previous=Number(state.params[id])||0,def=findControl(id);
    if(!def || def.type!=="range")return;
    let next;
    if(box.checked){
      next=Number(lastUi01SignalIntensity[id]??def.default??0);
      next=Math.max(Number(def.min),Math.min(Number(def.max),next));
      if(next<=0)next=Math.max(Number(def.step)||1,1);
    }else{
      if(previous>0)lastUi01SignalIntensity[id]=previous;
      next=0;
    }
    if(next!==previous)mut(()=>{state.params[id]=next});
    else renderMacros();
    $("[data-signal-checkbox='"+id+"']")?.focus({preventScroll:true});
  });
}
// UI_01 CONDITION: preserve the existing two 0–100 parameters and share
// Advanced/Undo history. No new IDs, audio algorithm, or UI_02 layout change.
const lastUi01ConditionIntensity=Object.create(null);
function ui01ConditionDetail(){
  const rows=[["rattle","Rattle"],["wowFlutter","Wow/Flutter"]];
  if(state.ui!=="UI_01")return rows.map(([id,label])=>`<span>${label} ${state.params[id]}%</span>`).join("");
  return `<div class="macro-condition-toggles">${rows.map(([id,label])=>{
    const amount=Number(state.params[id])||0;
    return `<label class="macro-condition-toggle" title="${label}: ${amount}% (set amount in Advanced)">
      <input type="checkbox" data-condition-checkbox="${id}" aria-label="${label} condition, ${amount}%" ${amount>0?"checked":""}>
      <span>${label}</span></label>`;
  }).join("")}</div>`;
}
function bindUi01ConditionCheckboxes(){
  $$("[data-condition-checkbox]").forEach(box=>box.onchange=()=>{
    const id=box.dataset.conditionCheckbox,previous=Number(state.params[id])||0,def=findControl(id);
    if(!def||def.type!=="range")return;
    let next;
    if(box.checked){
      next=Number(lastUi01ConditionIntensity[id]??def.default??0);
      next=Math.max(Number(def.min),Math.min(Number(def.max),next));
      if(next<=0)next=Math.max(Number(def.step)||1,1);
    }else{
      if(previous>0)lastUi01ConditionIntensity[id]=previous;
      next=0;
    }
    if(next!==previous)mut(()=>{state.params[id]=next});
    else renderMacros();
    $("[data-condition-checkbox='"+id+"']")?.focus({preventScroll:true});
  });
}

/* A single numeric state is shared by the macro face, Advanced drawer, scene
   readouts and the AudioWorklet. The existing schema defines all limits/steps. */
function syncMacroKnob(id){
  const def=findControl(id),value=state.params[id];
  const input=$('[data-macro="'+id+'"]');
  if(input){
    input.value=String(value);
    input.setAttribute("aria-valuenow",String(value));
    input.setAttribute("aria-valuetext",String(value)+(def.unit||""));
    const knob=input.closest(".macro-knob");
    if(knob){
      const pct=macroPct(id),display=String(value)+(def.unit||"");
      knob.style.setProperty("--pct",pct);
      knob.style.setProperty("--angle",(-135+pct*2.7)+"deg");
      knob.dataset.value=display;
      const label=knob.querySelector(".macro-knob-value");
      if(label)label.textContent=display;
    }
  }
  const advanced=$('[data-param="'+id+'"]');
  if(advanced){
    advanced.value=String(value);
    const readout=advanced.closest(".adv-control")?.querySelector(".value");
    if(readout)readout.textContent=String(value)+(def.unit?" "+def.unit:"");
  }
  updateScene();
  updateGains();
  updateCurves();
}
function setMacroKnob(id,raw){
  const def=findControl(id),number=Number(raw);
  if(!def||!Number.isFinite(number))return false;
  const next=motionKnobValue(def,number);
  if(next===state.params[id])return false;
  state.params[id]=next;
  syncMacroKnob(id);
  if(id==="mix")syncMixRef(state);
  return true;
}
function finishMacroKnobChange(before,id){
  if(!before||before.params[id]===state.params[id])return;
  undo.push(before);
  if(undo.length>80)undo.shift();
  redo=[];
  hist();
  mark("MODIFIED");
}
function commitMacroKnob(id,raw){
  const before=core();
  if(setMacroKnob(id,raw))finishMacroKnobChange(before,id);
}
function bindMacroKnobs(){
  $$("[data-macro]").forEach(input=>{
    const id=input.dataset.macro,def=findControl(id);
    if(!def)return;
    let pointer=null,startY=0,startValue=0,before=null;
    const face=input.closest(".macro-knob");
    input.addEventListener("pointerdown",e=>{
      if(e.button!==0)return;
      before=core();
      // UI_02's exposed Ambience track must remain a horizontal range.
      if(state.ui==="UI_02"&&id==="ambience")return;
      e.preventDefault();
      e.stopPropagation();
      pointer=e.pointerId;
      startY=e.clientY;
      startValue=Number(state.params[id]);
      input.focus({preventScroll:true});
      face?.classList.add("adjusting");
      input.setPointerCapture(e.pointerId);
    });
    input.addEventListener("pointermove",e=>{
      if(pointer!==e.pointerId)return;
      e.preventDefault();
      const factor=(Number(def.max)-Number(def.min))/180*(e.shiftKey?.2:1);
      setMacroKnob(id,startValue+(startY-e.clientY)*factor);
    });
    const finish=e=>{
      if(pointer!==e.pointerId)return;
      pointer=null;
      face?.classList.remove("adjusting");
      if(input.hasPointerCapture(e.pointerId))input.releasePointerCapture(e.pointerId);
      finishMacroKnobChange(before,id);
      before=null;
    };
    input.addEventListener("pointerup",finish);
    input.addEventListener("pointercancel",finish);
    // Keep native slider input/change for the exposed UI_02 Ambience
    // track and for programmatic / assistive input, without double commits.
    input.addEventListener("input",()=>{
      if(pointer===null)setMacroKnob(id,input.value);
    });
    input.addEventListener("change",()=>{
      if(pointer!==null||!before)return;
      finishMacroKnobChange(before,id);
      before=null;
    });
    input.addEventListener("wheel",e=>{
      if(e.ctrlKey||e.deltaY===0)return;
      e.preventDefault();
      e.stopPropagation();
      const step=Number(def.step)||1;
      commitMacroKnob(id,Number(state.params[id])+(e.deltaY<0?step:-step));
    },{passive:false});
    input.addEventListener("keydown",e=>{
      const step=Number(def.step)||1,value=Number(state.params[id]);
      let next=null;
      if(e.key==="ArrowUp"||e.key==="ArrowRight")next=value+step;
      else if(e.key==="ArrowDown"||e.key==="ArrowLeft")next=value-step;
      else if(e.key==="PageUp")next=value+step*10;
      else if(e.key==="PageDown")next=value-step*10;
      else if(e.key==="Home")next=Number(def.min);
      else if(e.key==="End")next=Number(def.max);
      if(next===null)return;
      e.preventDefault();
      e.stopPropagation();
      commitMacroKnob(id,next);
    });
    input.addEventListener("dblclick",e=>{
      e.preventDefault();
      e.stopPropagation();
      commitMacroKnob(id,Number(def.default));
    });
  });
}
function renderMacros(){const d=distance().toFixed(1);$("#macroStrip").innerHTML=
`<div class="macro macro-motion ${state.advanced==="MOTION"?"selected":""}" data-open="MOTION"><h3>MOTION</h3><div class="motion-knob-row"><div class="macro-knob macro-knob-readonly" style="--pct:${Math.max(0,Math.min(100,d/100*100))}"><div class="macro-knob-face"><strong class="macro-knob-value">${d}m</strong></div><span class="macro-knob-label">DISTANCE</span></div>${macroKnob("speed","SPEED","", "compact")}${macroKnob("doppler","DOPPLER","%","compact")}${macroKnob("width","WIDTH","%","compact")}</div>${modeButtons("motionMode",["APPROACH","PASS_BY","LEAVE"])}</div>`+
`<div class="macro macro-badsignal ${state.advanced==="TRANSMISSION"?"selected":""}" data-open="TRANSMISSION"><h3>BAD SIGNAL</h3><div class="macro-two-col">${macroKnob("badSignal","AMOUNT","%")}<div class="macro-side"><span class="macro-device-name">${selected("TRANSMISSION").name}</span>${ui01SignalDetail()}</div></div></div>`+
`<div class="macro macro-condition ${state.advanced==="CONDITION"?"selected":""}" data-open="CONDITION"><h3>CONDITION</h3><div class="macro-two-col">${macroKnob("condition","AMOUNT","%")}<div class="macro-side">${macroSelect("conditionMode")}${ui01ConditionDetail()}</div></div></div>`+
`<div class="macro macro-intelligibility ${state.advanced==="INTELLIGIBILITY"?"selected":""}" data-open="INTELLIGIBILITY"><h3>INTELLIGIBILITY</h3>${macroKnob("intelligibility","AMOUNT","%","centered")}${modeButtons("intelligibilityMode",["NATURAL","DIALOGUE","AGGRESSIVE"],{NATURAL:"Natural",DIALOGUE:"More Clear",AGGRESSIVE:"Muffled"})}${intelligibilityRefMarkup(state)}</div>`+
`<div class="macro macro-ambience ${state.advanced==="AMBIENCE"?"selected":""}" data-open="AMBIENCE"><h3>AMBIENCE</h3>${macroSelect("ambienceType")}<div class="ambience-preview"><img src="${assetUrl(selected("SPACE_ENVIRONMENT"))}" alt=""></div>${macroKnob("ambience","AMOUNT","%","centered")}<div class="macro-wave" aria-hidden="true"></div>${ambienceRefMarkup(state)}</div>`+
`<div class="macro macro-mix ${state.advanced==="MIX"?"selected":""}" data-open="MIX"><h3>MIX</h3>${macroKnob("mix","WET","%","large centered")}${mixRefMarkup(state)}</div>`+
`<div class="macro macro-eq ${state.advanced==="EQ_TONE"?"selected":""}" data-open="EQ_TONE"><div class="macro-eq-head"><h3>EQ / TONE (ADVANCED)</h3><button type="button" data-eq-zoom-in class="macro-eq-zoom-in" aria-label="Zoom in EQ editor" title="Zoom In · expand EQ">⤢</button><button type="button" class="macro-eq-power ${state.bypass.EQ_TONE?"":"active"}" data-eq-power aria-label="EQ / TONE power" aria-pressed="${!state.bypass.EQ_TONE}">${state.bypass.EQ_TONE?"OFF":"ON"}</button></div>${miniEqSvg()}<div class="macro-eq-foot"><div class="eq-cut-indicators" aria-label="HPF and LPF are draggable in graph"><span>HPF <strong data-eq-readout="hpf">${state.params.hpf<=20?"OFF":state.params.hpf+" Hz"}</strong></span><span class="eq-cut-caption">DRAG EQ POINTS</span><span>LPF <strong data-eq-readout="lpf">${state.params.lpf>=20000?"OFF":(state.params.lpf/1000).toFixed(1)+" kHz"}</strong></span></div>${eqMiniInlineMarkup()}</div></div>`;
$$("[data-open]").forEach(e=>e.onclick=x=>{if(x.target.closest(".macro-knob,input,button,select,[role=slider]"))return;openAdvanced(e.dataset.open)});
bindMacroKnobs();if(eqFocusIsOpen())markMiniEqInert();else bindMiniEq();bindMiniEqInline();
$$("[data-macro-select]").forEach(b=>b.onclick=()=>mut(()=>state.params[b.dataset.macroSelect]=b.dataset.value));
$$("[data-macro-selectbox]").forEach(s=>s.onchange=()=>mut(()=>state.params[s.dataset.macroSelectbox]=s.value));bindUi01SignalCheckboxes();bindUi01ConditionCheckboxes();bindAmbienceRef({getState:()=>state,findControl,mut});$$("[data-eq-power]").forEach(b=>b.onclick=()=>mut(()=>{state.bypass.EQ_TONE=!state.bypass.EQ_TONE}));
  $$("[data-eq-zoom-in]").forEach(b=>b.onclick=e=>{
    e.preventDefault();e.stopPropagation();dismissEqFloat();
    openEqFocus({getState:()=>state,onDismiss:dismissEqFloat,
      onPower:()=>mut(()=>{state.bypass.EQ_TONE=!state.bypass.EQ_TONE}),
      getControl:findControl,snapshot:()=>core(),
      onChange:(key,value)=>{
        state.params[key]=value;refreshMiniEq();
        const input=$('[data-param="'+key+'"]');
        if(input){
          input.value=String(value);
          const label=input.closest(".adv-control")?.querySelector(".value"),def=findControl(key);
          if(label)label.textContent=value+(def.unit?" "+def.unit:"");
        }
        updateGains();
      },
      commit:before=>{
        if(!before||JSON.stringify(before.params)===JSON.stringify(state.params))return;
        undo.push(before);if(undo.length>80)undo.shift();
        redo=[];hist();mark("MODIFIED");
      }
    });
  });
}
function refreshMiniEq(){
  // Update the original interactive graph (which may be moved to Focus) and
  // its inert compact preview with ONE calculated response, not two DSPs.
  const svgs=$$(".macro-eq-svg");if(!svgs.length)return;
  const plot=eqGraph(state,audioCtx?.sampleRate||48000);
  for(const svg of svgs)updateEqPlot(svg,plot);
  const h=$('[data-eq-readout="hpf"]'),l=$('[data-eq-readout="lpf"]');
  if(h)h.textContent=state.params.hpf<=20?"OFF":state.params.hpf+" Hz";
  if(l)l.textContent=state.params.lpf>=20000?"OFF":(state.params.lpf/1000).toFixed(1)+" kHz";
  syncEqFocus();
  syncEqMiniInline();
}
function bindMiniEqInline(){
  bindEqMiniInline({
    state:()=>state,findControl,snapshot:()=>core(),
    changed:(k,v)=>{refreshMiniEq();const adv=$(`[data-param="${k}"]`);
      if(adv){adv.value=String(v);const val=adv.closest(".adv-control")?.querySelector(".value");if(val){const def=findControl(k);val.textContent=v+" "+(def.unit||"");}}
      updateGains();},
    commit:before=>{if(JSON.stringify(before.params)===JSON.stringify(state.params))return;
      undo.push(before);if(undo.length>80)undo.shift();redo=[];hist();mark("MODIFIED");}
  });
}
function bindMiniEq(){
  const svg=$(".macro-eq-svg");if(!svg)return;
  sizeEqMarkers(svg);
  attachEqInteractions({
    svg,
    getState:()=>state,
    findControl,
    select:selectEqMiniInline,
    snapshot:()=>core(),
    changed:(key,value)=>{
      refreshMiniEq();
      // Mini HPF/LPF nodes are the ONLY compact controls; Advanced remains synced.
      // Never remount the interactive SVG during a gesture.
      const adv=$('[data-param="'+key+'"]');
      if(adv){
        adv.value=String(value);
        const v=adv.closest(".adv-control")?.querySelector(".value"),def=findControl(key);
        if(v)v.textContent=value+(def.unit?" "+def.unit:"");
      }
      updateGains();
    },
    commit:before=>{
      if(!before||JSON.stringify(before.params)===JSON.stringify(state.params))return;
      undo.push(before);if(undo.length>80)undo.shift();
      redo=[];hist();mark("MODIFIED");
    }
  });
}
function findControl(id){for(const g of Object.values(schema.groups)){const c=g.controls.find(x=>x.id===id);if(c)return c}}
function renderFlow(){const implemented=new Set(["SOURCE","TRANSMISSION"]);const n=[["INPUT"],["TRANSMISSION","TRANSMISSION"],["SOURCE","SOURCE"],["CONDITION","CONDITION"],["COVER","WALL_COVER"],["DISTANCE / MOTION","MOTION"],["SPACE","SPACE_ENVIRONMENT"],["AMBIENCE","AMBIENCE"],["INTELLIGIBILITY","INTELLIGIBILITY"],["TONE","EQ_TONE"],["MIX / OUTPUT"]];$("#signalFlow").innerHTML=n.map(([x,k],i)=>`<span class="flow-node ${k&&state.bypass[k]?"bypassed":""} ${k&&state.advanced===k?"selected":""}">${x}${k&&!implemented.has(k)?" (PENDING)":""}</span>${i<n.length-1?'<span class="flow-arrow">→</span>':""}`).join("")}
function renderNav(){$("#advancedNav").innerHTML=Object.entries(schema.groups).map(([k,g])=>`<button data-adv="${k}">${g.label}</button>`).join("");$$("[data-adv]").forEach(b=>b.onclick=()=>{state.advanced=b.dataset.adv;renderAdvanced();renderMacros()})}
function control(c){if(c.type==="select")return`<div class="adv-control"><label>${c.label}</label><select data-param="${c.id}">${c.options.map(o=>`<option value="${o}" ${state.params[c.id]===o?"selected":""}>${pretty(o)}</option>`).join("")}</select></div>`;if(c.type==="number")return`<div class="adv-control"><label>${c.label}</label><div class="value">${c.unit||""}</div><input data-param="${c.id}" type="number" min="${c.min}" max="${c.max}" step="${c.step}" value="${state.params[c.id]}"></div>`;return`<div class="adv-control"><label>${c.label}</label><div class="value">${state.params[c.id]} ${c.unit||""}</div><input data-param="${c.id}" type="range" min="${c.min}" max="${c.max}" step="${c.step}" value="${state.params[c.id]}"></div>`}
function renderAdvanced(){const k=state.advanced,g=schema.groups[k];
  // Compact when the module has few controls, grow only for dense Advanced
  // sections. Never change the actual parameter range/state or UI geometry.
  const total=g.controls.length+(g.assetType?1:0)+(g.special?1:0);
  const drawer=$(".advanced-drawer");
  if(drawer){
    drawer.style.setProperty("--advanced-width",(total<=2?470:total<=5?600:total<=9?750:940)+"px");
    drawer.style.setProperty("--advanced-cols",String(total<=2?2:total<=6?3:4));
    drawer.dataset.section=k;
    drawer.dataset.controlCount=String(total);
  }$(".advanced-drawer")?.classList.toggle("bypassed",!!state.bypass[k]);$$("[data-adv]").forEach(b=>b.classList.toggle("active",b.dataset.adv===k));$("#advancedTitle").textContent=g.label;let extra="";if(g.assetType)extra=`<div class="adv-control wide"><label>MODEL / TYPE</label><div class="value">${selected(g.assetType).name}</div><button data-library="${g.assetType}">SELECT FROM LIBRARY</button></div>`;if(g.special==="motion")extra+=`<div class="adv-control wide"><label>TIMELINE</label><div class="adv-buttons"><button data-set-marker="start">SET START</button><button data-set-marker="closest">SET CLOSEST</button><button data-set-marker="end">SET END</button><button id="advSync">${state.sync?"SYNC ON":"SYNC OFF"}</button></div></div>`;if(g.special==="seed")extra+=`<div class="adv-control wide"><label>DETERMINISTIC SEED</label><div class="adv-buttons"><input id="seedInput" type="number" value="${state.seed}"><button id="applySeed">APPLY</button><button id="newSeed">NEW SEED</button></div></div>`;if(g.special==="generator")extra+=`<div class="adv-control"><label>GENERATOR STATE</label><button id="generatorToggle" class="${state.generatorOn?"active":""}">${state.generatorOn?"ON":"OFF"}</button></div>`;const bp=g.bypass?`<button id="advBypass" class="${state.bypass[k]?"active":""}">${state.bypass[k]?"BYPASSED":"ACTIVE"}</button>`:"";$("#advancedBody").innerHTML=`<div class="adv-top"><div class="adv-summary">${g.assetType?selected(g.assetType).name:g.label}</div><div>${bp}</div></div><div class="adv-grid">${g.controls.map(control).join("")}${extra}</div><div class="state-note">${audioSupportNote(state,!!sceneNode?.port,publicDspRelease)}。目前僅 SRC_002 具備物理聲學候選；其他 SOURCE／TRANSMISSION 多數僅簡化頻寬，COVER／SPACE 等尚無完整 DSP，並非 250 款全部可試聽。</div>`;bindAdvanced()}
function bindAdvanced(){$$("[data-library]").forEach(b=>b.onclick=()=>openBrowser(b.dataset.library,b));$$("[data-param]").forEach(c=>{c.onpointerdown=()=>c.dataset.before=JSON.stringify(core());const apply=e=>{const id=e.target.dataset.param,def=findControl(id);state.params[id]=def.type==="select"?e.target.value:+e.target.value;updateScene();updateGains();updateCurves();refreshMiniEq();const v=e.target.closest(".adv-control")?.querySelector(".value");if(v&&def.type==="range")v.textContent=state.params[id]+" "+(def.unit||"")};c.oninput=apply;c.onchange=e=>{apply(e);if(e.target.dataset.before){undo.push(JSON.parse(e.target.dataset.before));redo=[];hist()}mark("MODIFIED");renderMacros()}});const bp=$("#advBypass");if(bp)bp.onclick=()=>mut(()=>state.bypass[state.advanced]=!state.bypass[state.advanced]);$$("[data-set-marker]").forEach(b=>b.onclick=()=>setMarker(b.dataset.setMarker));const sy=$("#advSync");if(sy)sy.onclick=()=>mut(()=>state.sync=!state.sync);const ap=$("#applySeed");if(ap)ap.onclick=()=>mut(()=>state.seed=Math.max(0,Math.floor(+$("#seedInput").value||0)));const ns=$("#newSeed");if(ns)ns.onclick=()=>mut(()=>state.seed=(Math.imul(state.seed||1,1664525)+1013904223)>>>0);const gt=$("#generatorToggle");if(gt)gt.onclick=()=>mut(()=>state.generatorOn=!state.generatorOn)}
// UI_02 Motion deck reuses the already-defined shared parameters; no new DSP state.
// Drag commits one history entry on release. Wheel/keyboard commit single value steps.
function motionKnobValue(def,raw){
  const min=Number(def.min),max=Number(def.max),step=Number(def.step)||1;
  return Math.max(min,Math.min(max,Number((min+Math.round((raw-min)/step)*step).toFixed(6))));
}
function bindMotionKnobs(){
  $$("[data-motion-adjust]").forEach(node=>{
    const id=node.dataset.motionAdjust,def=findControl(id);
    if(!def)return;
    let pointer=null,startY=0,startValue=0,original=null;
    const applyValue=raw=>{
      const value=motionKnobValue(def,raw);
      if(value===state.params[id])return false;
      state.params[id]=value;
      updateScene();
      return true;
    };
    const commitValue=raw=>{
      const value=motionKnobValue(def,raw);
      if(value===state.params[id])return;
      mut(()=>state.params[id]=value);
    };
    node.addEventListener("pointerdown",e=>{
      if(state.ui!=="UI_02"||e.button!==0)return;
      e.preventDefault();
      pointer=e.pointerId;
      startY=e.clientY;
      startValue=state.params[id];
      original=core();
      node.focus({preventScroll:true});
      node.classList.add("adjusting");
      node.setPointerCapture(e.pointerId);
    });
    node.addEventListener("pointermove",e=>{
      if(pointer!==e.pointerId)return;
      applyValue(startValue+(startY-e.clientY)*Number(def.step||1));
    });
    const finish=e=>{
      if(pointer!==e.pointerId)return;
      pointer=null;
      node.classList.remove("adjusting");
      if(node.hasPointerCapture(e.pointerId))node.releasePointerCapture(e.pointerId);
      if(state.params[id]!==startValue){
        undo.push(original);
        if(undo.length>80)undo.shift();
        redo=[];
        hist();
        mark("MODIFIED");
        renderMacros();
        renderAdvanced();
      }
      original=null;
    };
    node.addEventListener("pointerup",finish);
    node.addEventListener("pointercancel",finish);
    node.addEventListener("wheel",e=>{
      if(state.ui!=="UI_02"||e.ctrlKey||e.deltaY===0)return;
      e.preventDefault();
      commitValue(state.params[id]+(e.deltaY<0?1:-1)*Number(def.step||1));
    },{passive:false});
    node.addEventListener("keydown",e=>{
      if(state.ui!=="UI_02")return;
      const step=Number(def.step)||1;
      let value=null;
      if(e.key==="ArrowUp"||e.key==="ArrowRight")value=state.params[id]+step;
      else if(e.key==="ArrowDown"||e.key==="ArrowLeft")value=state.params[id]-step;
      else if(e.key==="PageUp")value=state.params[id]+10*step;
      else if(e.key==="PageDown")value=state.params[id]-10*step;
      else if(e.key==="Home")value=Number(def.min);
      else if(e.key==="End")value=Number(def.max);
      if(value===null)return;
      e.preventDefault();
      commitValue(value);
    });
  });
}
function bind(){bindMotionKnobs();bindSpectrumView();bindSceneView({getState:()=>state,setZoom:zoom=>mut(()=>state.sceneZoom=zoom),audio});const advancedCloseBtn=$("#advancedCloseBtn");if(advancedCloseBtn)advancedCloseBtn.onclick=closeAdvanced;document.addEventListener("keydown",e=>{if(e.key==="Escape"&&document.body.classList.contains("advanced-open")&&$("#assetBrowser")?.classList.contains("hidden")){e.preventDefault();closeAdvanced()}});$$("[data-ui]").forEach(b=>b.onclick=()=>mut(()=>state.ui=b.dataset.ui));$$("[data-view]").forEach(b=>b.onclick=()=>mut(()=>state.view=b.dataset.view));$$("[data-motion-mode]").forEach(b=>b.onclick=()=>mut(()=>state.params.motionMode=b.dataset.motionMode));$$("[data-tab]").forEach(b=>b.onclick=()=>{state.tab=b.dataset.tab;$$("[data-tab]").forEach(x=>x.classList.toggle("active",x===b));$$(".tab-content").forEach(x=>x.classList.toggle("active",x.dataset.content===state.tab))});$("#syncToggle").onchange=e=>mut(()=>state.sync=e.target.checked);$$("[data-set-marker]").forEach(b=>b.onclick=()=>setMarker(b.dataset.setMarker));document.addEventListener("keydown",onBrowserKeydown);$("#browserClose").onclick=closeBrowser;$("#assetBrowser").onclick=e=>{if(e.target.id==="assetBrowser")closeBrowser()};$("#assetSearch").oninput=renderBrowserList;$("#categorySelect").onchange=renderBrowserList;$("#presetSelect").onchange=loadPreset;$("#presetPrevBtn").onclick=()=>stepPreset(-1);$("#presetNextBtn").onclick=()=>stepPreset(1);$("#savePresetBtn").onclick=savePreset;$("#presetVisualsBtn").onclick=()=>openBrowser("SCENE_PRESET_HERO");$("#importStateBtn").onclick=()=>$("#stateImportFile").click();$("#exportStateBtn").onclick=exportState;$("#stateImportFile").onchange=importState;$("#undoBtn").onclick=doUndo;$("#redoBtn").onclick=doRedo;$("#copyStateBtn").onclick=copyState;$("#pasteStateBtn").onclick=pasteState;$("#sceneFullscreenBtn").onclick=toggleSceneFullscreen;const settings=$("#settingsBtn"),tools=$("#globalToolsPopover");if(settings)settings.onclick=e=>{e.stopPropagation();document.body.classList.toggle("global-tools-open")};if(tools)tools.onclick=e=>e.stopPropagation();document.addEventListener("click",()=>document.body.classList.remove("global-tools-open"));$$("[data-global-ui]").forEach(b=>b.onclick=()=>mut(()=>state.ui=b.dataset.globalUi));$$("[data-global-action]").forEach(b=>b.onclick=()=>{const a=b.dataset.globalAction;if(a==="undo")doUndo();else if(a==="redo")doRedo();else if(a==="save")savePreset();else if(a==="import")$("#stateImportFile").click();else if(a==="export")exportState();else if(a==="bypass")mut(()=>state.globalBypass=!state.globalBypass)});const mdm=$("#motionDeckMode");if(mdm)mdm.onchange=e=>mut(()=>state.params.motionMode=e.target.value);document.addEventListener("fullscreenchange",syncFullscreenState);$("#globalBypass").onclick=()=>mut(()=>state.globalBypass=!state.globalBypass);$("#audioFile").onchange=loadAudio;$("#playBtn").onclick=play;$("#stopBtn").onclick=stop;$("#loopToggle").onchange=e=>audio.loop=e.target.checked;$("#seekSlider").oninput=e=>{if(audio.duration)audio.currentTime=+e.target.value/1000*audio.duration};const peakBtn=$("#meterPeakBtn"),rmsBtn=$("#meterRmsBtn");if(peakBtn)peakBtn.onclick=()=>{meterMode="PEAK";peakBtn.classList.add("active");rmsBtn?.classList.remove("active")};if(rmsBtn)rmsBtn.onclick=()=>{meterMode="RMS";rmsBtn.classList.add("active");peakBtn?.classList.remove("active")};$("#resetPeakBtn").onclick=()=>{peakIn=peakOut=-Infinity;mark("PEAK RESET")};$$("[data-snapshot]").forEach(b=>b.onclick=()=>snapshot(b.dataset.snapshot,b))}
function doUndo(){if(!undo.length)return;redo.push(core());restore(undo.pop());hist();mark("UNDO")}function doRedo(){if(!redo.length)return;undo.push(core());restore(redo.pop());hist();mark("REDO")}
function applyFactoryPreset(heroId,pushHistory=true){const cfg=scenePresets[heroId],hero=byId.get(heroId);if(!cfg){if(hero)$("#sceneTitle").textContent=hero.name;return}if(pushHistory)push();const keep={ui:state.ui,view:state.view,snapshots:state.snapshots};const ns=newState();ns.ui=keep.ui;ns.view=keep.view;ns.snapshots=keep.snapshots;Object.assign(ns.selection,cfg.selection||{});Object.assign(ns.params,cfg.params||{});for(const k of ["b4Freq","b4Gain","b4Q"])delete ns.params[k];Object.assign(ns.bypass,cfg.bypass||{});ns.preset="factory:"+heroId;state=ns;$("#sceneTitle").textContent=cfg.name||hero?.name||"Scene View";mark("FACTORY PRESET LOADED");refresh();renderPreset()}function stepPreset(delta){const sel=$("#presetSelect"),opts=[...sel.options].filter(o=>o.value);if(!opts.length)return;let i=opts.findIndex(o=>o.value===sel.value);if(i<0)i=delta>0?-1:0;i=(i+delta+opts.length)%opts.length;sel.value=opts[i].value;loadPreset({target:sel})}
function loadPreset(e){const v=e.target.value;if(!v)return;if(v.startsWith("factory:"))applyFactoryPreset(v.slice(8),true);else{push();const p=userPresets[v.slice(5)];if(p){const snaps=state.snapshots;state=migrateLegacyEq(p.state);state.snapshots=snaps;state.preset=v}mark("PRESET LOADED");refresh()}}
function savePreset(){const name=prompt("Preset name");if(!name)return;const k=Date.now().toString(36);userPresets[k]={name,state:core()};localStorage.setItem("sourcerune.userPresets.v1",JSON.stringify(userPresets));state.preset="user:"+k;renderPreset();refresh();mark("PRESET SAVED")}
function exportState(){const b=new Blob([JSON.stringify({product:"SOURCERUNE",schema:1,state:core()},null,2)],{type:"application/json"}),u=URL.createObjectURL(b),a=document.createElement("a");a.href=u;a.download="SOURCERUNE_State.json";a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);mark("STATE EXPORTED")}
function importState(e){const f=e.target.files?.[0];if(!f)return;const r=new FileReader();r.onload=()=>{try{const p=JSON.parse(r.result);if(p.product!=="SOURCERUNE"||!p.state)throw Error("Invalid state");push();restore(p.state);mark("STATE IMPORTED")}catch(x){alert("State import failed: "+x.message)}e.target.value=""};r.readAsText(f)}
function snapshot(s,b){if(!state.snapshots[s])state.snapshots[s]=core();else{push();const keep=state.snapshots;state=migrateLegacyEq(keep[s]);state.snapshots=keep;refresh()}$$("[data-snapshot]").forEach(x=>x.classList.toggle("active",x===b));mark("SNAPSHOT "+s)}
function openBrowser(t,opener=null){
  browserReturnFocus=(opener||document.activeElement) instanceof HTMLElement?(opener||document.activeElement):null;
  browserReturnType=t;
  browserType=t;
  $("#browserTitle").textContent=LABEL[t];
  const cats=[...new Set(catalog.filter(x=>x.type===t).map(x=>x.category))];
  $("#categorySelect").innerHTML='<option value="">All categories</option>'+cats.map(x=>`<option>${x}</option>`).join("");
  $("#assetSearch").value="";
  $("#assetBrowser").classList.remove("hidden");
  renderBrowserList();
  $("#assetSearch").focus({preventScroll:true});
}
function closeBrowser(){
  const modal=$("#assetBrowser");
  if(modal.classList.contains("hidden"))return;
  modal.classList.add("hidden");
  const opener=browserReturnFocus;
  browserReturnFocus=null;
  // The module cards are rebuilt by refresh() on selection; restore to the replacement card.
  const target=opener?.isConnected?opener:(browserReturnType?document.querySelector('.module-card[data-type="'+browserReturnType+'"]'):null);
  browserReturnType=null;
  if(target){
    const temporary=!target.matches("button,input,select,textarea,a[href],[tabindex]");
    if(temporary)target.tabIndex=-1;
    target.focus({preventScroll:true});
    // Keep tabindex=-1: removing it immediately can blur a non-native-focusable card.
  }
}
function onBrowserKeydown(e){
  const modal=$("#assetBrowser");
  if(modal.classList.contains("hidden"))return;
  if(e.key==="Escape"){
    e.preventDefault();
    e.stopPropagation();
    closeBrowser();
    return;
  }
  if(e.key!=="Tab")return;
  const targets=$$('button:not([disabled]),input:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])',modal).filter(x=>x.getClientRects().length>0);
  if(!targets.length)return;
  const at=targets.indexOf(document.activeElement);
  if(e.shiftKey&&at<=0){e.preventDefault();targets[targets.length-1].focus();}
  else if(!e.shiftKey&&(at<0||at===targets.length-1)){e.preventDefault();targets[0].focus();}
}
function renderBrowserList(focusId=null){
  const q=$("#assetSearch").value.trim().toLowerCase(),c=$("#categorySelect").value;
  const items=catalog.filter(i=>i.type===browserType&&(!c||i.category===c)&&(!q||i.name.toLowerCase().includes(q)||i.id.toLowerCase().includes(q)));
  const activeId=browserType==="SCENE_PRESET_HERO"&&state.preset?.startsWith("factory:")?state.preset.slice(8):state.selection[browserType];
  const currentFocus=focusId||(document.activeElement?.classList.contains("asset-item")?document.activeElement.dataset.id:null);
  const list=$("#assetList");
  list.innerHTML=items.length?items.map(i=>`<button type="button" class="asset-item ${activeId===i.id?"active":""}" data-id="${i.id}" aria-pressed="${activeId===i.id}"><span>${i.category}</span><strong>${i.name}</strong></button>`).join(""):'<div class="asset-empty" role="status" aria-live="polite"><strong>No assets found</strong><span>Try another search or category.</span></div>';
  $$(".asset-item",list).forEach(b=>{
    const item=()=>byId.get(b.dataset.id);
    b.onmouseenter=()=>preview(item());
    b.onfocus=()=>preview(item());
    b.onkeydown=e=>{
      if(!["ArrowUp","ArrowDown","ArrowLeft","ArrowRight"].includes(e.key))return;
      e.preventDefault();
      const buttons=$$(".asset-item",list),at=buttons.indexOf(b),step=(e.key==="ArrowDown"||e.key==="ArrowRight")?1:-1;
      buttons[(at+step+buttons.length)%buttons.length]?.focus();
    };
    b.onclick=()=>{
      if(browserType==="SCENE_PRESET_HERO")applyFactoryPreset(b.dataset.id,true);
      else mut(()=>state.selection[browserType]=b.dataset.id);
      renderBrowserList(b.dataset.id);
    };
  });
  const focusTarget=currentFocus?$$(".asset-item",list).find(b=>b.dataset.id===currentFocus):null;
  if(focusTarget)focusTarget.focus({preventScroll:true});
  const current=items.find(i=>i.id===activeId)||items[0];
  if(current)preview(current);
  else{
    $("#assetPreview").classList.remove("selected");
    $("#assetPreview").innerHTML='<div class="preview-empty" role="status">No matching preview</div>';
  }
}
function preview(x){
  if(!x)return;
  const activeId=browserType==="SCENE_PRESET_HERO"&&state.preset?.startsWith("factory:")?state.preset.slice(8):state.selection[browserType];
  const panel=$("#assetPreview");
  panel.classList.toggle("selected",activeId===x.id);
  panel.innerHTML=`<div class="preview-art"><img src="${assetUrl(x)}" alt=""></div><div class="preview-title">${x.name}</div><div class="preview-id">${x.id}</div>`;
  const img=$(".preview-art img",panel);
  img?.addEventListener("error",()=>{
    const frame=img.closest(".preview-art");
    if(!frame)return;
    img.remove();
    frame.classList.add("image-unavailable");
    const message=document.createElement("span");
    message.className="preview-fallback";
    message.setAttribute("role","status");
    message.textContent="Preview unavailable";
    frame.append(message);
  },{once:true});
}
function setMarker(k){mut(()=>state.markers[k]=audio.currentTime||0)}function renderMarkers(){const f=v=>v==null?"—":v.toFixed(2)+"s";$("#markerStatus").textContent="START "+f(state.markers.start)+" · CLOSEST "+f(state.markers.closest)+" · END "+f(state.markers.end)}
function distance(){const p=state.params.motion/100,a=state.params.startDistance,c=state.params.closestDistance,e=state.params.endDistance,m=state.params.motionMode;if(m==="STATIC")return a;if(m==="APPROACH")return a+(c-a)*p;if(m==="LEAVE")return c+(e-c)*p;if(m==="PASS_BY")return p<=.5?a+(c-a)*p*2:c+(e-c)*(p-.5)*2;return a+(e-a)*p}
function updateScene(){const p=state.params.motion/100,ui1=state?.ui==="UI_01",x=110+790*p,y=(ui1?300:325)-55*Math.sin(Math.PI*p),listenerY=ui1?250:270,d=distance();$("#sourceNode").setAttribute("transform",`translate(${x} ${y})`);const mg=$("#motionCarGlyph");if(mg){mg.setAttribute("x",x-28);mg.setAttribute("y",y-62)}$("#distanceLine").setAttribute("x1",x);$("#distanceLine").setAttribute("y1",y);$("#distanceLine").setAttribute("y2",listenerY);const cx=(x+500)/2,cy=(y+listenerY)/2-10;const dc=$("#distanceCallout");if(dc){dc.setAttribute("x",cx-40);dc.setAttribute("y",cy-31)}$("#distanceText").setAttribute("x",cx);$("#distanceText").setAttribute("y",cy);$("#distanceText").textContent=d.toFixed(1)+" m";$("#sourceLabel").setAttribute("y",ui1?Math.min(y+27,326):346);$("#motionMode").textContent=pretty(state.params.motionMode);const mdm=$("#motionDeckMode");if(mdm)mdm.value=state.params.motionMode;const mp=$("#motionDeckPath");if(mp){const mode=state.params.motionMode,pct=state.params.motion/100;const path=mode==="APPROACH"?"M12 18 C70 20 165 45 288 82":mode==="LEAVE"?"M12 82 C135 45 230 20 288 18":mode==="STATIC"?"M12 52 L288 52":"M12 82 C85 80 105 18 150 18 C195 18 215 80 288 82";mp.setAttribute("d",path);const dot=$("#motionDeckCurrent");if(dot){const dx=12+276*pct,dy=mode==="APPROACH"?18+64*Math.pow(pct,1.35):mode==="LEAVE"?82-64*Math.pow(pct,.72):mode==="STATIC"?52:82-64*Math.sin(Math.PI*pct);dot.setAttribute("cx",dx);dot.setAttribute("cy",dy)}}$("#startDistance").textContent=state.params.startDistance.toFixed(1)+" m";$("#closestDistance").textContent=state.params.closestDistance.toFixed(1)+" m";$("#endDistance").textContent=state.params.endDistance.toFixed(1)+" m";$("#currentDistance").textContent=d.toFixed(1)+" m";$("#speedReadout").textContent=state.params.speed+" km/h";$("#dopplerReadout").textContent=state.params.doppler+"%";$("#widthReadout").textContent=state.params.width+"%";for(const id of ["speed","doppler","width"]){const el=document.querySelector('[data-motion-adjust="'+id+'"]'),v=String(state.params[id]);if(el&&el.getAttribute("aria-valuenow")!==v){el.setAttribute("aria-valuenow",v);el.setAttribute("aria-valuetext",v+(id==="speed"?" km/h":"%"))}}$("#perspectiveReadout").textContent=state.params.perspective+"%";const mr=$(".motion-readouts>div"),angleFor=id=>-135+macroPct(id)*2.7;if(mr[4]){const dp=Math.max(0,Math.min(100,d/100));mr[4].style.setProperty("--distance-angle",(-135+dp*270)+"deg")}for(const [idx,id] of [[5,"speed"],[6,"doppler"],[7,"width"]])if(mr[idx])mr[idx].style.setProperty("--angle",angleFor(id)+"deg");const md=$(".macro-motion .macro-knob-readonly");if(md){const pct=Math.max(0,Math.min(100,d));md.style.setProperty("--pct",pct);md.style.setProperty("--angle",(-135+pct*2.7)+"deg");const mv=md.querySelector(".macro-knob-value");if(mv)mv.textContent=d.toFixed(1)+"m"}$("#sceneBuildings").setAttribute("opacity",state.view==="TOP"?".28":".9");if(ui1){syncSceneZoom(state);syncSceneGuide(state)}}
function updateCurves(){for(const [id,k] of [["directCurve","direct"],["earlyCurve","early"],["tailCurve","tail"]])$("#"+id).style.opacity=.2+.8*state.params[k]/100}
async function setupAudio(){
  if(sceneNode)return;
  if(audioSetup)return audioSetup;
  audioSetup=(async()=>{
    if(!audioCtx){
      audioCtx=new(window.AudioContext||window.webkitAudioContext)();
      media=audioCtx.createMediaElementSource(audio);
      inAn=audioCtx.createAnalyser();outAn=audioCtx.createAnalyser();
      inAn.fftSize=outAn.fftSize=2048;
      media.connect(inAn);
    }
    // Only a reviewed artifact manifest accompanied by three REAL compiled
    // C++ WASM modules activates public PhysicalDriver. A missing manifest
    // leaves the previously approved and audible WebAudio EQ intact.
    // Published WASM can be downloaded/reverse-engineered by anyone.
    const manifestResponse=await fetch("./audio/public-dsp-manifest.json",{cache:"no-store"}).catch(()=>null);
    const published=manifestResponse?.ok ? await manifestResponse.json() : null;
    if(published?.published===true && published?.sourceCandidateSha && published?.models?.includes("SRC_002")) {
      // Fail visibly if binary is missing/corrupt: never pretend EQ is the
      // private physical DSP when the release manifest claims otherwise.
      sceneNode=await createSceneNode(audioCtx,state,published);
      publicDspRelease=published;
      sceneNode.onprocessorerror=()=>{audio.pause();mark("REAL DSP ERROR — 請重新整理");};
      publicTone=null;
      inAn.connect(sceneNode);
      sceneNode.connect(outAn);outAn.connect(audioCtx.destination);
      $("#blockReadout").textContent=`PUBLIC C++ / WASM ${published.models.length} SOURCE MODELS READY`;
    } else {
      // Existing safe public WebAudio EQ remains a usable fallback until
      // the reviewed compiled release is actually published.
      sceneNode=audioCtx.createGain();sceneNode.gain.value=1;inGain=sceneNode;
      outGain=audioCtx.createGain();
      const createFilter=type=>{const node=audioCtx.createBiquadFilter();node.type=type;return node;};
      const hpf=createFilter("highpass"),lpf=createFilter("lowpass");
      hpf.Q.value=Math.SQRT1_2;lpf.Q.value=Math.SQRT1_2;
      const bells=[createFilter("peaking"),createFilter("peaking"),createFilter("peaking")];
      const dry=audioCtx.createGain(),wet=audioCtx.createGain();
      publicTone={hpf,lpf,bells,dry,wet};
      inAn.connect(sceneNode);
      sceneNode.connect(dry);dry.connect(outGain);
      let tail=sceneNode;
      for(const node of [hpf,...bells,lpf]){tail.connect(node);tail=node;}
      tail.connect(wet);wet.connect(outGain);
      outGain.connect(outAn);outAn.connect(audioCtx.destination);
      $("#blockReadout").textContent="WEB AUDIO EQ / PRIVATE MODELS NOT YET PUBLISHED";
    }
    $("#sampleRateReadout").textContent=audioCtx.sampleRate+" Hz";
    updateGains();
  })();
  try{await audioSetup;}finally{audioSetup=null;}
}
// Public Web Audio API biquad DSP only: not the private SOURCE C++ DSP.
function updatePublicTone(){
  if(!publicTone||!audioCtx)return;
  const now=audioCtx.currentTime,p=state.params||{},eq=publicTone,nyquist=audioCtx.sampleRate/2;
  const limit=(v,lo,hi)=>Math.min(hi,Math.max(lo,Number.isFinite(Number(v))?Number(v):lo));
  const set=(param,value)=>param.setTargetAtTime(value,now,.012);
  const bypassAll=!!state.globalBypass;
  set(sceneNode.gain,Math.pow(10,(bypassAll?0:limit(p.inputGain,-24,24))/20));
  set(outGain.gain,Math.pow(10,(bypassAll?0:limit(p.outputGain,-24,24))/20));
  set(eq.hpf.frequency,limit(p.hpf,20,Math.min(1000,nyquist*.95)));
  set(eq.lpf.frequency,limit(p.lpf,1000,Math.min(20000,nyquist*.95)));
  for(let i=1;i<=3;i++){
    const node=eq.bells[i-1];
    set(node.frequency,limit(p['b'+i+'Freq'],20,nyquist*.95));
    set(node.Q,limit(p['b'+i+'Q'],.1,12));
    set(node.gain,limit(p['b'+i+'Gain'],-18,18));
  }
  const active=Number(p.hpf)>20||Number(p.lpf)<20000||[1,2,3].some(i=>Math.abs(Number(p['b'+i+'Gain'])||0)>0.0001);
  const bypass=bypassAll||!!state.bypass?.EQ_TONE;
  const wet=active&&!bypass?limit(p.mix,0,100)/100:0;
  set(eq.dry.gain,1-wet);set(eq.wet.gain,wet);
  const el=document.querySelector('#blockReadout');
  if(el)el.textContent=bypass?'BYPASS / INPUT':active&&wet>0?'WEB AUDIO EQ / LIVE':'DRY / EQ IDLE';
}
function updateGains(){
  if(publicTone)updatePublicTone();
  else if(sceneNode?.port)sceneNode.port.postMessage({type:"parameters",values:parametersFromState(state),hpf:hpfFromState(state),eq3:eq3FromState(state)});
  const label=$("#buildLabel");
  if(label){label.textContent="WEB TEST · "+(audioName?audioName+" · ":"")+audioSupportNote(state,!!sceneNode?.port,publicDspRelease);label.title=label.textContent;}
}
async function loadAudio(e){
  const f=e.target.files?.[0];if(!f)return;
  const generation=++audioLoadGeneration;
  stop();
  try{
    await setupAudio();
    if(generation!==audioLoadGeneration)return;
    if(audioUrl)URL.revokeObjectURL(audioUrl);
    audioUrl=URL.createObjectURL(f);audioName=f.name;audio.src=audioUrl;audio.load();
    updateGains();mark(sceneNode?.port?"AUDIO LOADED · SHARED C++ DSP READY · PLAY":"AUDIO LOADED · PUBLIC EQ READY · PLAY");
  }catch(error){mark(String(error.message||error));}
}
async function play(){
  try{
    if(!audio.src){mark("請先 LOAD AUDIO");return;}
    if(!audio.paused){audio.pause();return;}
    await setupAudio();await audioCtx.resume();await audio.play();
    mark(sceneNode?.port?(publicDspRelease?.models?.length===17?"PUBLIC C++/WASM LIVE · 17 SOURCE RESEARCH MODELS":"PUBLIC C++/WASM DSP LIVE · SRC_002 PHYSICAL MODEL"):"PUBLIC WEB EQ LIVE · PRIVATE SOURCE / SPACE PENDING");
  }catch(error){mark(String(error.message||error));}
}
function stop(){audio.pause();if(audio.readyState)audio.currentTime=0;sceneNode?.port?.postMessage({type:"reset"});}
for(const event of ["play","pause","ended"])audio.addEventListener(event,()=>$("#playBtn").textContent=audio.paused?"PLAY":"PAUSE");
audio.addEventListener("error",()=>mark("音檔無法播放，請使用 WAV／瀏覽器支援的格式"));
audio.addEventListener("seeked",()=>sceneNode?.port?.postMessage({type:"reset"}));
function stats(a){if(!a)return{peak:-Infinity,rms:-Infinity,pct:0};const d=new Uint8Array(a.fftSize);a.getByteTimeDomainData(d);let p=0,s=0;for(const x of d){const v=(x-128)/128;p=Math.max(p,Math.abs(v));s+=v*v}p=db(p);const r=db(Math.sqrt(s/d.length));return{peak:p,rms:r,pct:Math.max(0,Math.min(100,(p+60)/60*100))}}
function meters(){const i=stats(inAn),o=stats(outAn);peakIn=Math.max(peakIn,i.peak);peakOut=Math.max(peakOut,o.peak);const im=$("#inMeter"),om=$("#outMeter"),ui2=state?.ui==="UI_02",pct=v=>Math.max(0,Math.min(100,(v+60)/60*100)),iv=meterMode==="RMS"?i.rms:i.peak,ov=meterMode==="RMS"?o.rms:o.peak,ip=meterMode==="RMS"?pct(i.rms):i.pct,op=meterMode==="RMS"?pct(o.rms):o.pct;if(ui2){im.style.width=ip+"%";om.style.width=op+"%";im.style.height="100%";om.style.height="100%"}else{im.style.height=ip+"%";om.style.height=op+"%";im.style.width="";om.style.width=""}$("#peakInValue").textContent=fmt(iv);$("#peakOutValue").textContent=fmt(ov);$("#rmsInValue").textContent=fmt(i.rms);$("#rmsOutValue").textContent=fmt(o.rms)}
let spectrumBins=null;
let spectrumPreBins=null;
const spectrumView={source:"POST",rta:true,smooth:true};
const spectrumMainPre=createSpectrumDisplayTrace();
const spectrumMainPost=createSpectrumDisplayTrace();
function bindSpectrumView(){
  const sync=()=>{
    document.querySelectorAll("[data-spectrum-source]").forEach(b=>{const active=b.dataset.spectrumSource===spectrumView.source;b.classList.toggle("active",active);b.setAttribute("aria-pressed",String(active))});
    const rta=$("[data-spectrum-rta]"),smoothing=$("[data-spectrum-smoothing]");
    if(rta){rta.classList.toggle("active",spectrumView.rta);rta.setAttribute("aria-pressed",String(spectrumView.rta))}
    if(smoothing){smoothing.classList.toggle("active",spectrumView.smooth);smoothing.setAttribute("aria-pressed",String(spectrumView.smooth));smoothing.textContent=spectrumView.smooth?"1/3":"RAW"}
  };
  document.querySelectorAll("[data-spectrum-source]").forEach(b=>b.addEventListener("click",()=>{spectrumView.source=b.dataset.spectrumSource;sync()}));
  $("[data-spectrum-rta]")?.addEventListener("click",()=>{spectrumView.rta=!spectrumView.rta;sync()});
  $("[data-spectrum-smoothing]")?.addEventListener("click",()=>{spectrumView.smooth=!spectrumView.smooth;spectrumMainPre.reset();spectrumMainPost.reset();sync()});
  sync();
}
function spectrum(){
  const c=$("#spectrumCanvas"),x=c.getContext("2d"),w=c.width,h=c.height;
  x.clearRect(0,0,w,h);x.fillStyle="#081015";x.fillRect(0,0,w,h);
  const left=38,right=10,top=8,bottom=22,pw=w-left-right,ph=h-top-bottom;
  const lx=f=>left+Math.log10(f/20)/Math.log10(20000/20)*pw;
  x.lineWidth=1;x.font="10px ui-monospace,Consolas,monospace";x.textBaseline="middle";
  for(const dbv of [0,-12,-24,-36,-48,-60]){
    const yy=top+(-dbv/60)*ph;
    x.strokeStyle=dbv===0?"#31434d":"#1b2a31";
    x.beginPath();x.moveTo(left,yy);x.lineTo(w-right,yy);x.stroke();
    x.fillStyle="#71858e";x.textAlign="right";x.fillText(String(dbv),left-6,yy);
  }
  for(const f of [20,50,100,200,500,1000,2000,5000,10000,20000]){
    const xx=lx(f);
    x.strokeStyle="#1b2a31";x.beginPath();x.moveTo(xx,top);x.lineTo(xx,top+ph);x.stroke();
    x.fillStyle="#71858e";x.textAlign="center";
    x.fillText(f>=1000?(f/1000)+"k":String(f),xx,h-9);
  }
  if(!outAn)return;
  // The EQ mini/focus analyser always receives POST data, regardless of
  // which *visualisation* the user chooses here. No audio routing changes.
  if(!spectrumBins||spectrumBins.length!==outAn.frequencyBinCount)
    spectrumBins=new Float32Array(outAn.frequencyBinCount);
  outAn.getFloatFrequencyData(spectrumBins);
  updateEqAnalyzer(spectrumBins,audioCtx?.sampleRate||48000,performance.now(),!audio.paused&&!document.hidden);
  if(!spectrumView.rta)return;
  if(inAn){
    if(!spectrumPreBins||spectrumPreBins.length!==inAn.frequencyBinCount)
      spectrumPreBins=new Float32Array(inAn.frequencyBinCount);
    inAn.getFloatFrequencyData(spectrumPreBins);
  }
  const now=performance.now(),sr=audioCtx?.sampleRate||48000;
  const opts={octaveWidth:spectrumView.smooth?1/3:1/24,
    frequencySmoothing:spectrumView.smooth};
  const pre=spectrumPreBins?spectrumMainPre.update(spectrumPreBins,sr,now,true,opts):null;
  const post=spectrumMainPost.update(spectrumBins,sr,now,true,opts);
  const primary=spectrumView.source==="PRE"?pre:post;
  const other=spectrumView.source==="PRE"?post:pre;
  // Draw exactly the same 129-point shape-preserving cubic spline as mini EQ;
  // the dB scale remains the REF main graph's -60..0 dB range.
  const drawTrace=(levels,color,alpha,lineWidth,fill)=>{
    if(!levels)return;
    const count=levels.length,dx=pw/(count-1);
    const ys=new Float32Array(count),slopes=new Float32Array(count-1);
    const tangents=new Float32Array(count);
    for(let i=0;i<count;i++)ys[i]=top+(Math.max(0,Math.min(60,-levels[i]))/60)*ph;
    for(let i=0;i<count-1;i++)slopes[i]=(ys[i+1]-ys[i])/dx;
    tangents[0]=slopes[0];tangents[count-1]=slopes[count-2];
    for(let i=1;i<count-1;i++){
      const a=slopes[i-1],b=slopes[i];
      tangents[i]=a*b<=0?0:2*a*b/(a+b);
    }
    x.save();x.globalAlpha=alpha;x.lineJoin="round";
    const linePath=new Path2D();linePath.moveTo(left,ys[0]);
    for(let i=0;i<count-1;i++){
      const x0=left+i*dx,dy=dx/3;
      linePath.bezierCurveTo(x0+dy,Math.max(top,Math.min(top+ph,ys[i]+tangents[i]*dy)),
        x0+dx-dy,Math.max(top,Math.min(top+ph,ys[i+1]-tangents[i+1]*dy)),
        x0+dx,ys[i+1]);
    }
    if(fill){
      const fillPath=new Path2D(linePath);
      fillPath.lineTo(left+pw,top+ph);fillPath.lineTo(left,top+ph);fillPath.closePath();
      const grad=x.createLinearGradient(0,top,0,top+ph);
      grad.addColorStop(0,"rgba(93,199,225,.16)");
      grad.addColorStop(1,"rgba(93,199,225,.005)");
      x.fillStyle=grad;x.fill(fillPath);
    }
    x.strokeStyle=color;x.lineWidth=lineWidth;x.stroke(linePath);x.restore();
  };
  // Actual secondary analyser; no reference/template shape is synthesized.
  drawTrace(other,"#c5dce5",.38,1,false);
  drawTrace(primary,"#66cce9",1,1.6,true);
}
function waveform(){const c=$("#sceneWaveformCanvas");if(!c)return;const x=c.getContext("2d"),w=c.width,h=c.height;x.clearRect(0,0,w,h);x.strokeStyle="#315564";x.lineWidth=1;x.beginPath();x.moveTo(0,h/2);x.lineTo(w,h/2);x.stroke();if(!inAn)return;const d=new Uint8Array(inAn.fftSize);inAn.getByteTimeDomainData(d);x.strokeStyle="#5cc9ee";x.lineWidth=1.5;x.beginPath();for(let a=0;a<w;a++){const n=Math.floor(a/w*(d.length-1)),yy=d[n]/255*h;a?x.lineTo(a,yy):x.moveTo(a,yy)}x.stroke()}
function time(){const t=audio.currentTime||0,m=Math.floor(t/60),s=Math.floor(t%60),ms=Math.floor(t%1*1000);$("#transportTime").textContent=`${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}.${String(ms).padStart(3,"0")}`;if(audio.duration)$("#seekSlider").value=Math.round(t/audio.duration*1000);syncSceneTime(state,audio)}
function animate(){requestAnimationFrame(animate);time();spectrum();waveform();meters();paintAmbienceOutput(outAn,!audio.paused,performance.now());updateScene()}
init().catch(e=>{console.error(e);$("#buildLabel").textContent="WEB TEST · INIT ERROR";mark("INIT ERROR")});
window.addEventListener("resize",fitRuntimeShell,{passive:true});
