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
const clone = o => JSON.parse(JSON.stringify(o));
export function createState(ui="UI_01") {
  return {
    version:1,ui:ui==="UI_02"?"UI_02":"UI_01",
    selected:{SOURCE:2,TRANSMISSION:4,WALL_COVER:0,SPACE_ENVIRONMENT:6},
    bypass:Object.fromEntries(GROUPS.map(k=>[k,false])),
    params:Object.fromEntries(CONTROLS.map(c=>[c.id,c.default])),
    activeGroup:"SOURCE"
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
  return true;
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
