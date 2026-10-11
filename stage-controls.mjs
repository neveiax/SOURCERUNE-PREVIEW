import {CARD_LAYOUT,cardBounds,screenshotMatches} from "./card-layout.mjs";
import {GROUPS,GROUP_LABELS,OPTIONS,validateState} from "./interaction-state.mjs";

// These are independent UI-only HTML controls. The approved screenshot remains
// a static backdrop outside the four opaque module cards; no audio/DSP is used.
export function describeNativeCard(state,group,getArtwork=()=>null) {
  if(!validateState(state)||!GROUPS.includes(group))throw Error("Invalid module card state");
  const ui=state.ui,index=state.selected[group];
  return {
    group,ui,index,name:OPTIONS[group][index],options:OPTIONS[group],
    label:GROUP_LABELS[group],bounds:cardBounds(ui,group),
    artwork:getArtwork(ui,group,index),
    bypass:state.bypass[group],showBypass:ui==="UI_01",
    active:state.activeGroup===group
  };
}
function element(type,className,text) {
  const n=document.createElement(type);
  if(className)n.className=className;
  if(text!=null)n.textContent=text;
  return n;
}
function button(className,text,title,action) {
  const b=element("button",className,text);
  b.type="button";b.setAttribute("aria-label",title);
  b.addEventListener("click",event=>{event.stopPropagation();action();});
  return b;
}
export function mountOnImageCards({frame,image,lab}) {
  const layer=element("div","stage-hotspot-layer");
  layer.setAttribute("aria-label","Direct UI module card controls");
  frame.append(layer);
  let lastDimensionWarning="";
  let previousUi=null;
  const cards=new Map();

  function createCard(group,ui) {
    const card=element("section","stage-card stage-card-native");
    card.dataset.module=group;
    card.dataset.ui=ui;
    card.setAttribute("aria-label",GROUP_LABELS[group]+" UI-only module");
    card.addEventListener("click",event=>{
      if(!event.target.closest("button,select"))lab.openGroup(group);
    });
    const header=element("div","native-card-header");
    const title=button("native-card-heading",GROUP_LABELS[group],"Open "+GROUP_LABELS[group]+" settings",()=>lab.openGroup(group));
    header.append(title);
    let bypass=null;
    if(ui==="UI_01") {
      bypass=button("native-card-bypass","ACTIVE","Toggle "+GROUP_LABELS[group]+" bypass",
        ()=>lab.perform({type:"bypass",group},"Toggle "+GROUP_LABELS[group]+" bypass"));
      header.append(bypass);
    }

    const content=element("div","native-card-body");
    const figure=element("div","native-card-art");
    const imageNode=element("img","native-card-image");
    imageNode.alt="";imageNode.loading="lazy";imageNode.draggable=false;
    const placeholder=element("span","native-card-placeholder","ART LOADING");
    figure.append(imageNode,placeholder);
    const selection=element("div","native-card-selection");
    const label=element("label","native-card-model-label","MODEL");
    const select=element("select","native-card-select");
    select.setAttribute("aria-label",GROUP_LABELS[group]+" model");
    for(const [i,name] of OPTIONS[group].entries()) {
      const option=element("option","",name);option.value=String(i);
      select.append(option);
    }
    select.addEventListener("change",()=>lab.perform(
      {type:"select",group,index:Number(select.value)},
      "Selected "+GROUP_LABELS[group]+" model"));
    selection.append(label,select);
    content.append(figure,selection);

    const actions=element("div","native-card-actions");
    const previous=button("native-card-arrow","‹","Previous "+GROUP_LABELS[group]+" model",
      ()=>lab.perform({type:"select",group,index:lab.getState().selected[group]-1},
        "Previous "+GROUP_LABELS[group]));
    const edit=button("native-card-edit","EDIT","Open "+GROUP_LABELS[group]+" editor",
      ()=>lab.openGroup(group));
    const next=button("native-card-arrow","›","Next "+GROUP_LABELS[group]+" model",
      ()=>lab.perform({type:"select",group,index:lab.getState().selected[group]+1},
        "Next "+GROUP_LABELS[group]));
    actions.append(previous,edit,next);
    card.append(header,content,actions);
    const entry={card,select,imageNode,placeholder,bypass};
    cards.set(group,entry);
    return entry;
  }
  function warn(ui) {
    layer.replaceChildren();
    cards.clear();previousUi=null;
    layer.dataset.geometry="mismatch";
    const actual=image.naturalWidth+"×"+image.naturalHeight;
    const expected=CARD_LAYOUT[ui].width+"×"+CARD_LAYOUT[ui].height;
    const note=element("p","hotspot-dimension-warning",
      "Module cards unavailable: preview image "+actual+
      " differs from approved "+expected+". Use Interaction Lab.");
    note.setAttribute("role","status");
    layer.append(note);
    if(lastDimensionWarning!==ui+actual) {
      console.warn("SOURCERUNE UI geometry mismatch; module controls not drawn");
      lastDimensionWarning=ui+actual;
    }
  }
  function render() {
    const state=lab.getState(),ui=state.ui;
    if(!image.complete||!image.naturalWidth){
      layer.replaceChildren();cards.clear();previousUi=null;return;
    }
    if(!screenshotMatches(ui,image.naturalWidth,image.naturalHeight)) {
      warn(ui);return;
    }
    layer.dataset.geometry="confirmed";
    if(previousUi!==ui||cards.size!==GROUPS.length) {
      layer.replaceChildren();cards.clear();previousUi=ui;
      for(const group of GROUPS) {
        const entry=createCard(group,ui);
        layer.append(entry.card);
      }
    }
    for(const group of GROUPS) {
      const view=describeNativeCard(state,group,lab.getArtwork);
      const {card,select,imageNode,placeholder,bypass}=cards.get(group);
      card.classList.toggle("is-bypassed",view.bypass);
      card.classList.toggle("is-active",view.active);
      card.dataset.status=view.bypass?"bypassed":"active";
      card.dataset.model=String(view.index);
      for(const key of ["left","top","width","height"])
        card.style[key]=view.bounds[key]+"%";
      if(select.value!==String(view.index))select.value=String(view.index);
      const path=view.artwork?"./"+view.artwork:"";
      if(imageNode.getAttribute("src")!==path) {
        if(path)imageNode.src=path;
        else imageNode.removeAttribute("src");
      }
      imageNode.hidden=!path;
      placeholder.hidden=!!path;
      if(bypass) {
        bypass.textContent=view.bypass?"BYPASSED":"ACTIVE";
        bypass.setAttribute("aria-pressed",String(view.bypass));
      }
    }
  }
  lab.subscribe(render);
  image.addEventListener("load",render);
  image.addEventListener("error",()=>{layer.replaceChildren();cards.clear();previousUi=null;});
  render();
  return {render};
}
