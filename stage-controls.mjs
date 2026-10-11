import {CARD_LAYOUT,cardBounds,screenshotMatches} from "./card-layout.mjs";
import {GROUPS,GROUP_LABELS,OPTIONS} from "./interaction-state.mjs";
// Screen-space controls use only previously public art and UI state, never DSP.
export function mountOnImageCards({frame,image,lab}) {
  const layer=document.createElement("div");
  layer.className="stage-hotspot-layer";
  layer.setAttribute("aria-label","Direct module card UI controls");
  frame.append(layer);
  let lastDimensionWarning="";
  function button(label,classname,action) {
    const b=document.createElement("button");
    b.type="button";b.className=classname;b.textContent=label;
    b.setAttribute("aria-label",label);b.addEventListener("click",e=>{e.stopPropagation();action();});
    return b;
  }
  function render() {
    layer.replaceChildren();
    const state=lab.getState(),ui=state.ui;
    if(!image.complete||!image.naturalWidth)return;
    if(!screenshotMatches(ui,image.naturalWidth,image.naturalHeight)) {
      layer.dataset.geometry="mismatch";
      const actual=String(image.naturalWidth)+"×"+String(image.naturalHeight);
      const expected=String(CARD_LAYOUT[ui].width)+"×"+String(CARD_LAYOUT[ui].height);
      const notice=document.createElement("p");notice.className="hotspot-dimension-warning";
      notice.textContent="Direct controls paused: image "+actual+" does not match approved "+expected+". Use Interaction Lab.";
      layer.append(notice);
      if(lastDimensionWarning!==ui+actual) {
        console.warn("SOURCERUNE UI geometry mismatch: expected "+expected+", actual "+actual);
        lastDimensionWarning=ui+actual;
      }
      return;
    }
    layer.dataset.geometry="confirmed";
    for(const group of GROUPS){
      const bounds=cardBounds(ui,group),index=state.selected[group],name=OPTIONS[group][index];
      const card=document.createElement("section");card.className="stage-card"+(state.bypass[group]?" is-bypassed":"");
      card.dataset.module=group;
      for(const key of ["left","top","width","height"])card.style[key]=bounds[key]+"%";
      const open=button("Edit "+GROUP_LABELS[group],"stage-card-open",()=>lab.openGroup(group));
      open.title="Click card to edit "+GROUP_LABELS[group];
      card.append(open);
      const tag=document.createElement("span");tag.className="stage-card-title";tag.textContent=GROUP_LABELS[group];card.append(tag);
      const src=lab.getArtwork(ui,group,index);
      if(src){
        const picture=document.createElement("img");
        picture.className="stage-card-picture";picture.src="./"+src;
        picture.alt="";picture.loading="lazy";picture.draggable=false;
        card.append(picture);
      }
      const info=document.createElement("span");info.className="stage-card-selected";info.textContent=name;card.append(info);
      const tools=document.createElement("div");tools.className="stage-card-tools";
      const prev=button("‹","stage-card-tool",()=>lab.perform({type:"select",group,index:index-1},"Previous "+GROUP_LABELS[group]));
      prev.setAttribute("aria-label","Previous "+GROUP_LABELS[group]+" model");
      const next=button("›","stage-card-tool",()=>lab.perform({type:"select",group,index:index+1},"Next "+GROUP_LABELS[group]));
      next.setAttribute("aria-label","Next "+GROUP_LABELS[group]+" model");
      const bypass=button(state.bypass[group]?"OFF":"BYP","stage-card-bypass",()=>lab.perform({type:"bypass",group},"Bypass "+GROUP_LABELS[group]));
      bypass.setAttribute("aria-pressed",String(state.bypass[group]));
      bypass.setAttribute("aria-label","Bypass "+GROUP_LABELS[group]);
      tools.append(prev,next,bypass);card.append(tools);layer.append(card);
    }
  }
  lab.subscribe(render);
  image.addEventListener("load",render);
  image.addEventListener("error",()=>layer.replaceChildren());
  render();
  return {render};
}
