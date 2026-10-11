import {OPTIONS,GROUPS,GROUP_LABELS,CONTROLS,createState,validateState,upgradeState,makeHistory,dispatch,undo,redo} from "./interaction-state.mjs";

const STORAGE_KEY="sourcerune.public.ui.preview.v1";
const escapeHTML=s=>String(s).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;");
const byId=id=>document.getElementById(id);
function fromStorage(ui) {
  try {
    const item=JSON.parse(localStorage.getItem(STORAGE_KEY)||"null");
    if(item?.version===1)return upgradeState(item,ui);
  } catch {}
  return createState(ui);
}
export function mountInteractionLab({getUi,onUi}) {
  let history=makeHistory(fromStorage(getUi()));
  const panel=byId("interactionLab"),main=document.querySelector("main"),toggle=byId("interactionToggle");
  let opened=false;
  const approvedArt=new Map();
  const subscribers=new Set();
  const notify=()=>{for(const fn of subscribers)fn();};
  const persist=()=>{try{localStorage.setItem(STORAGE_KEY,JSON.stringify(history.present));}catch{}};
  const status=message=>{const x=byId("labStatus");if(x)x.textContent=message};
  const exec=(action,label)=>{
    history=dispatch(history,action);
    persist();render();status(label);notify();
  };
  const render=()=>{
    const state=history.present;
    const names=GROUPS.map(group=>{
      const options=OPTIONS[group],idx=state.selected[group],selected=options[idx],bypassed=state.bypass[group];
      const art=approvedArt.get(state.ui+":"+group+":"+idx);
      const artMarkup=art?'<div class="lab-module-art"><img loading="lazy" src="./'+escapeHTML(art)+'" alt="'+escapeHTML(selected)+' visual asset"></div>':'<div class="lab-module-art missing">No approved public art loaded</div>';
      return '<div class="lab-module">'+
        '<div class="lab-module-heading"><strong>'+GROUP_LABELS[group]+'</strong><button type="button" data-bypass="'+group+'" aria-pressed="'+String(bypassed)+'" class="'+(bypassed?'is-bypassed':'')+'">'+(bypassed?'BYPASSED':'ACTIVE')+'</button></div>'+
        artMarkup+
        '<div class="lab-cycle"><button type="button" data-cycle="'+group+'" data-dir="-1" aria-label="Previous '+GROUP_LABELS[group]+'">‹</button>'+
        '<select data-choice="'+group+'" aria-label="'+GROUP_LABELS[group]+' visual selection">'+
        options.map((name,i)=>'<option value="'+i+'" '+(i===idx?'selected':'')+'>'+escapeHTML(name)+'</option>').join("")+
        '</select><button type="button" data-cycle="'+group+'" data-dir="1" aria-label="Next '+GROUP_LABELS[group]+'">›</button></div></div>';
    }).join("");
    const knobs=CONTROLS.map(control=>{
      const val=state.params[control.id],pct=(val-control.min)/(control.max-control.min)*100;
      return '<label class="lab-control"><span class="lab-control-head"><span>'+escapeHTML(control.label)+'</span><output data-readout="'+control.id+'">'+val+escapeHTML(control.unit)+'</output></span>'+
      '<input type="range" data-param="'+control.id+'" min="'+control.min+'" max="'+control.max+'" step="'+control.step+'" value="'+val+'" style="--fill:'+pct+'%" aria-label="'+escapeHTML(control.label)+'">'+
      '</label>';
    }).join("");
    panel.innerHTML=
      '<div class="lab-top"><div><span class="lab-eyebrow">UI STATE SANDBOX</span><h2>Interaction Lab</h2></div><button type="button" id="labClose" aria-label="Close interaction lab">×</button></div>'+
      '<p class="lab-disclaimer">Controls below are real, editable UI state only. The reference screenshot stays unchanged. No audio is processed.</p>'+
      '<div class="lab-tools"><button type="button" id="labUndo" '+(history.past.length?'':'disabled')+'>Undo</button><button type="button" id="labRedo" '+(history.future.length?'':'disabled')+'>Redo</button><button type="button" id="labReset">Reset</button><button type="button" id="labExport">Export JSON</button></div>'+
      '<h3 class="lab-section-title">MODULE SELECTION & BYPASS</h3>'+names+
      '<h3 class="lab-section-title">PUBLIC UI MACRO VALUES</h3><div class="lab-params">'+knobs+'</div>'+
      '<div class="lab-footer"><span>DISPLAY STATE · '+escapeHTML(state.ui)+'</span><span id="labStatus" aria-live="polite">UI-only mode, no DSP.</span></div>';
    const close=byId("labClose");
    close?.addEventListener("click",()=>setOpen(false));
    panel.querySelectorAll("[data-bypass]").forEach(button=>button.addEventListener("click",()=>exec({type:"bypass",group:button.dataset.bypass},"Module bypass changed")));
    panel.querySelectorAll("[data-cycle]").forEach(button=>button.addEventListener("click",()=>{
      const group=button.dataset.cycle;
      exec({type:"select",group,index:history.present.selected[group]+Number(button.dataset.dir)},"Visual selection changed");
    }));
    panel.querySelectorAll("[data-choice]").forEach(select=>select.addEventListener("change",()=>exec({type:"select",group:select.dataset.choice,index:Number(select.value)},"Visual selection changed")));
    panel.querySelectorAll("[data-param]").forEach(input=>{
      const control=CONTROLS.find(x=>x.id===input.dataset.param);
      input.addEventListener("input",()=>{
        const output=panel.querySelector('[data-readout="'+input.dataset.param+'"]');
        if(output)output.textContent=input.value+control.unit;
        input.style.setProperty("--fill",((Number(input.value)-control.min)/(control.max-control.min)*100)+"%");
      });
      input.addEventListener("change",()=>exec({type:"param",id:input.dataset.param,value:Number(input.value)},"Control value changed"));
    });
    byId("labUndo")?.addEventListener("click",()=>{history=undo(history);persist();render();status("Undo");notify();});
    byId("labRedo")?.addEventListener("click",()=>{history=redo(history);persist();render();status("Redo");notify();});
    byId("labReset")?.addEventListener("click",()=>exec({type:"reset"},"UI values reset"));
    byId("labExport")?.addEventListener("click",()=>{
      const data=new Blob([JSON.stringify({product:"SOURCERUNE",kind:"public-ui-preview-only",state:history.present},null,2)],{type:"application/json"});
      const url=URL.createObjectURL(data),link=document.createElement("a");
      link.href=url;link.download="SOURCERUNE_UI_Preview_State.json";link.click();
      setTimeout(()=>URL.revokeObjectURL(url),500);
      status("UI preview state exported");
    });
  };
  function setOpen(open) {
    opened=!!open;
    panel.hidden=!opened;
    main.classList.toggle("interaction-open",opened);
    toggle.setAttribute("aria-expanded",String(opened));
    toggle.setAttribute("aria-pressed",String(opened));
    toggle.textContent=opened?"Close UI controls":"Test UI controls";
    if(opened)render();
  }
  fetch("./assets/approved_ui_manifest.json", {cache:"force-cache"})
    .then(response=>{if(!response.ok)throw Error("Approved art manifest unavailable");return response.json()})
    .then(manifest=>{
      if(manifest.schema!==1||manifest.entries?.length!==50)throw Error("Invalid public art manifest");
      for(const entry of manifest.entries){
        if(!GROUPS.includes(entry.group)||!["UI_01","UI_02"].includes(entry.ui)||!Number.isInteger(entry.index)||!/^assets\/library\/UI_0[12]\/(SOURCE|TRANSMISSION|WALL_COVER|SPACE_ENVIRONMENT)\/[A-Za-z0-9_]+\.png$/.test(entry.output_path))throw Error("Unapproved art");
        approvedArt.set(entry.ui+":"+entry.group+":"+entry.index,entry.output_path);
      }
      if(opened){render();status("Approved module artwork loaded")}
      notify();
    })
    .catch(error=>{console.warn("UI-only artwork not available",error);if(opened)status("Artwork unavailable · state controls still work")});
  toggle.addEventListener("click",()=>setOpen(!opened));
  render();
  return {setUi(next) {
    if(history.present.ui!==next){
      history=dispatch(history,{type:"ui",ui:next});
      persist();
      if(opened)render();
      notify();
    }
  },
  getState(){return history.present;},
  getArtwork(ui,group,index){return approvedArt.get(ui+":"+group+":"+index)||null;},
  perform(action,label="UI updated"){exec(action,label);},
  subscribe(fn){subscribers.add(fn);return ()=>subscribers.delete(fn);},
  openGroup(group){
    setOpen(true);
    exec({type:"group",group},"Editing "+GROUP_LABELS[group]);
    const control=panel.querySelector('[data-choice="'+group+'"]');
    control?.focus();
    control?.scrollIntoView({block:"nearest"});
  },
  close(){setOpen(false)}};
}
