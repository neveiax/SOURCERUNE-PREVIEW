import {MACRO_LAYOUT,MACRO_PARAMETER,macroBounds} from "./macro-layout.mjs";
import {CARD_LAYOUT,screenshotMatches} from "./card-layout.mjs";
import {CONTROLS,validateState} from "./interaction-state.mjs";

// Independent UI-only controls, no audio and no private DSP/EQ calculations.
export function macroView(state,panel) {
  if(!validateState(state)||!MACRO_LAYOUT[state.ui]?.panels[panel])throw Error("Unknown UI-only macro");
  const control=CONTROLS.find(x=>x.id===MACRO_PARAMETER[panel]);
  if(!control)throw Error("Missing public UI control");
  const value=state.params[control.id];
  return {panel,ui:state.ui,id:control.id,label:control.label,unit:control.unit,
    value,min:control.min,max:control.max,step:control.step,bounds:macroBounds(state.ui,panel)};
}
const make=(tag,classname,label)=>{
  const el=document.createElement(tag);
  el.className=classname;if(label!=null)el.textContent=label;
  return el;
};
export function mountMacroPanels({frame,image,lab}){
  const root=make("div","macro-overlay");
  root.setAttribute("aria-label","UI-only interactive macro panels");
  frame.append(root);
  let currentUi="",widgets=new Map();
  function create(view){
    const panel=make("section","native-macro-panel");
    panel.dataset.macro=view.panel;panel.dataset.ui=view.ui;
    panel.setAttribute("aria-label",view.label+" UI state control");
    const title=make("span","native-macro-heading",view.panel.replaceAll("_"," "));
    const dial=make("div","native-macro-face");
    dial.setAttribute("aria-hidden","true");
    const readout=make("output","native-macro-value");
    dial.append(readout);
    const name=make("span","native-macro-control-label",view.label);
    const range=make("input","native-macro-range");
    range.type="range";range.min=String(view.min);range.max=String(view.max);
    range.step=String(view.step);
    range.setAttribute("aria-label",view.label+" UI-only amount");
    function preview(){
      const n=Number(range.value),p=(n-view.min)/(view.max-view.min);
      dial.style.setProperty("--level",Math.round(p*100)+"%");
      readout.value=String(n)+view.unit;
      range.style.setProperty("--level",Math.round(p*100)+"%");
    }
    range.addEventListener("input",preview);
    range.addEventListener("change",()=>{
      lab.perform({type:"param",id:view.id,value:Number(range.value)},
        view.label+" UI amount changed");
    });
    panel.append(title,dial,name,range);
    const w={panel,range,preview};
    widgets.set(view.panel,w);
    return w;
  }
  function render(){
    const state=lab.getState();
    if(!image.complete||!image.naturalWidth||
       !screenshotMatches(state.ui,image.naturalWidth,image.naturalHeight)){
      root.replaceChildren();widgets.clear();currentUi="";return;
    }
    root.dataset.geometry="confirmed";
    if(currentUi!==state.ui){
      root.replaceChildren();widgets.clear();currentUi=state.ui;
      for(const key of Object.keys(MACRO_LAYOUT[state.ui].panels)){
        create(macroView(state,key));
      }
      for(const w of widgets.values())root.append(w.panel);
    }
    for(const panel of Object.keys(MACRO_LAYOUT[state.ui].panels)){
      const model=macroView(state,panel),w=widgets.get(panel);
      for(const key of ["left","top","width","height"])
        w.panel.style[key]=model.bounds[key]+"%";
      w.range.value=String(model.value);
      w.preview();
    }
  }
  lab.subscribe(render);
  image.addEventListener("load",render);
  image.addEventListener("error",()=>{root.replaceChildren();widgets.clear();currentUi=""});
  render();
  return{render};
}
