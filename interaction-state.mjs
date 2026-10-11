// UI-only public interaction state. This module contains no audio/DSP code.
export const OPTIONS = Object.freeze({
  SOURCE: ["Smartphone Earpiece","Smartphone Bottom Speaker","Smartphone Speakerphone","Feature Phone","Cordless Home Phone","Office Desk Phone"],
  TRANSMISSION: ["Direct Clean","Narrowband Clean","PSTN Landline","Noisy Analog Line","GSM Stable","GSM Weak"],
  WALL_COVER: ["None / Open","T-Shirt Cloth","Thin Blanket","Thick Blanket","Pillow","Bedsheet"],
  SPACE_ENVIRONMENT: ["Vocal Booth","Bedroom","Bathroom","Kitchen","Living Room","Small Office","Busy City Street"]
});
export const GROUP_LABELS = Object.freeze({
  SOURCE: "SOURCE",
  TRANSMISSION: "TRANSMISSION",
  WALL_COVER: "WALL / COVER",
  SPACE_ENVIRONMENT: "SPACE / ENVIRONMENT"
});
// These are existing public UI parameter labels and UI display ranges, NOT DSP models.
export const CONTROLS = Object.freeze([
  {id:"motion",label:"MOTION POSITION",min:0,max:100,step:1,default:50,unit:"%"},
  {id:"badSignal",label:"BAD SIGNAL",min:0,max:100,step:1,default:20,unit:"%"},
  {id:"condition",label:"CONDITION",min:0,max:100,step:1,default:20,unit:"%"},
  {id:"intelligibility",label:"INTELLIGIBILITY",min:0,max:100,step:1,default:70,unit:"%"},
  {id:"ambience",label:"AMBIENCE",min:0,max:100,step:1,default:35,unit:"%"},
  {id:"mix",label:"MIX",min:0,max:100,step:1,default:100,unit:"%"}
]);
export const GROUPS = Object.freeze(Object.keys(OPTIONS));
// Exact already-public UI control names, ranges and defaults; no DSP model.
export const MOTION_MODES=Object.freeze(["STATIC","APPROACH","PASS_BY","LEAVE","MANUAL"]);
export const AMBIENCE_TYPES=Object.freeze(["ROOM_TONE","OFFICE_HVAC","TRAFFIC","CROWD","WIND","RAIN","ELECTRICAL","VEHICLE","PUBLIC_SPACE","RADIO_STATIC"]);
export const DETAIL_CONTROLS=Object.freeze([
  {id:"startDistance",min:0,max:1000,step:.1,default:80,unit:"m"},
  {id:"closestDistance",min:0,max:1000,step:.1,default:3,unit:"m"},
  {id:"endDistance",min:0,max:1000,step:.1,default:120,unit:"m"},
  {id:"speed",min:0,max:300,step:1,default:60,unit:"km/h"},
  {id:"doppler",min:0,max:100,step:1,default:70,unit:"%"},
  {id:"width",min:0,max:100,step:1,default:40,unit:"%"},
  {id:"perspective",min:0,max:100,step:1,default:50,unit:"%"},
  {id:"ambienceLevel",min:-60,max:0,step:.5,default:-18,unit:"dB"},
  {id:"ambienceDuck",min:0,max:100,step:1,default:45,unit:"%"}
]);
export const EXTRA_BYPASS=Object.freeze(["MOTION","AMBIENCE"]);
const clone = o => JSON.parse(JSON.stringify(o));
export function createState(ui="UI_01") {
  return {
    version:1,ui:ui==="UI_02"?"UI_02":"UI_01",
    selected:{SOURCE:2,TRANSMISSION:4,WALL_COVER:0,SPACE_ENVIRONMENT:6},
    bypass:Object.fromEntries(GROUPS.map(k=>[k,false])),
    params:Object.fromEntries(CONTROLS.map(c=>[c.id,c.default])),
    activeGroup:"SOURCE",
    detail:Object.fromEntries(DETAIL_CONTROLS.map(c=>[c.id,c.default])),
    mode:{MOTION:"PASS_BY",AMBIENCE:"TRAFFIC"},
    extraBypass:{MOTION:false,AMBIENCE:false},
    ambienceSeed:1
  };
}
export function validateState(input) {
  if (!input || typeof input!=="object" || input.version!==1 || !["UI_01","UI_02"].includes(input.ui)) return false;
  if (!GROUPS.includes(input.activeGroup)||!input.selected||!input.bypass||!input.params) return false;
  for (const group of GROUPS) {
    const n=input.selected[group];
    if (!Number.isInteger(n)||n<0||n>=OPTIONS[group].length||typeof input.bypass[group]!=="boolean") return false;
  }
  for(const c of CONTROLS) {
    const v=input.params[c.id];
    if (typeof v!=="number"||!Number.isFinite(v)||v<c.min||v>c.max) return false;
  }
  if(!input.detail||!input.mode||!input.extraBypass)return false;
  for(const c of DETAIL_CONTROLS) {
    const v=input.detail[c.id];
    if(typeof v!=="number"||!Number.isFinite(v)||v<c.min||v>c.max)return false;
  }
  if(!MOTION_MODES.includes(input.mode.MOTION)||!AMBIENCE_TYPES.includes(input.mode.AMBIENCE))return false;
  if(EXTRA_BYPASS.some(group=>typeof input.extraBypass[group]!=="boolean"))return false;
  if(!Number.isSafeInteger(input.ambienceSeed)||input.ambienceSeed<1||input.ambienceSeed>999999)return false;
  return true;
}
// Keep legacy v1 browser storage from earlier Preview releases without losing
// previous user selections. Invalid/untrusted values fall back to defaults.
export function upgradeState(input,ui="UI_01"){
  const base=createState(ui);
  if(!input||input.version!==1||!["UI_01","UI_02"].includes(ui))return base;
  const copy={
    ...base,
    selected:{...base.selected,...input.selected},
    bypass:{...base.bypass,...input.bypass},
    params:{...base.params,...input.params},
    activeGroup:input.activeGroup,
    detail:{...base.detail,...input.detail},
    mode:{...base.mode,...input.mode},
    extraBypass:{...base.extraBypass,...input.extraBypass},
    ambienceSeed:input.ambienceSeed??base.ambienceSeed
  };
  return validateState(copy)?copy:base;
}
export function apply(state, action) {
  if (!validateState(state)||!action||typeof action!=="object") throw Error("Invalid UI preview state");
  const next=clone(state);
  const group=action.group;
  switch(action.type) {
    case "ui":
      if(!["UI_01","UI_02"].includes(action.ui)) throw Error("Invalid UI");
      next.ui=action.ui; break;
    case "group":
      if(!GROUPS.includes(group)) throw Error("Invalid group");
      next.activeGroup=group; break;
    case "select":
      if(!GROUPS.includes(group)||!Number.isInteger(action.index)) throw Error("Invalid selection");
      next.selected[group]=((action.index%OPTIONS[group].length)+OPTIONS[group].length)%OPTIONS[group].length;
      break;
    case "bypass":
      if(!GROUPS.includes(group)) throw Error("Invalid bypass");
      next.bypass[group]=!next.bypass[group]; break;
    case "param": {
      const control=CONTROLS.find(x=>x.id===action.id),value=Number(action.value);
      if(!control||!Number.isFinite(value)) throw Error("Invalid parameter");
      next.params[action.id]=Math.min(control.max,Math.max(control.min,Math.round(value/control.step)*control.step));
      break;
    }
    case "detail": {
      const c=DETAIL_CONTROLS.find(c=>c.id===action.id),value=Number(action.value);
      if(!c||!Number.isFinite(value))throw Error("Invalid UI detail control");
      const clamped=Math.min(c.max,Math.max(c.min,value));
      next.detail[c.id]=Math.round(clamped/c.step)*c.step;
      next.detail[c.id]=Number(next.detail[c.id].toFixed(3));
      break;
    }
    case "mode": {
      const options=action.group==="MOTION"?MOTION_MODES:action.group==="AMBIENCE"?AMBIENCE_TYPES:null;
      if(!options||!options.includes(action.value))throw Error("Invalid UI-only mode");
      next.mode[action.group]=action.value;break;
    }
    case "auxBypass":
      if(!EXTRA_BYPASS.includes(action.group))throw Error("Invalid UI-only bypass");
      next.extraBypass[action.group]=!next.extraBypass[action.group];break;
    case "newSeed":
      next.ambienceSeed=next.ambienceSeed===999999?1:next.ambienceSeed+1;break;
    case "reset": return createState(next.ui);
    default: throw Error("Invalid action");
  }
  if(!validateState(next))throw Error("Invalid resulting state");
  return next;
}
export function makeHistory(initial=createState()) {
  if(!validateState(initial))throw Error("Invalid initial state");
  return {present:clone(initial),past:[],future:[]};
}
export function dispatch(history,action) {
  const next=apply(history.present,action);
  if(JSON.stringify(next)===JSON.stringify(history.present))return history;
  return {present:next,past:[...history.past.slice(-39),clone(history.present)],future:[]};
}
export function undo(history) {
  if(!history.past.length)return history;
  return {present:history.past.at(-1),past:history.past.slice(0,-1),future:[clone(history.present),...history.future]};
}
export function redo(history) {
  if(!history.future.length)return history;
  return {present:history.future[0],past:[...history.past.slice(-39),clone(history.present)],future:history.future.slice(1)};
}
