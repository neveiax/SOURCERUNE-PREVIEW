import {mountInteractionLab} from "./interaction-lab.mjs";
import {mountOnImageCards} from "./stage-controls.mjs";
import {mountMacroPanels} from "./macro-controls.mjs";
const variants = {
  UI_01: {image:"./assets/UI_01.png",label:"UI_01",alt:"SOURCERUNE UI_01 visual reference"},
  UI_02: {image:"./assets/UI_02.png",label:"UI_02",alt:"SOURCERUNE UI_02 visual reference"}
};
const $ = id => document.getElementById(id);
let active = new URLSearchParams(location.search).get("ui") === "UI_02" ? "UI_02" : "UI_01";
let zoom = 1;
let interactionLab = null;
let stageControls = null;
const image=$("previewImage"), stage=$("stage"), frame=$("previewFrame");
function render() {
  const variant=variants[active];
  document.querySelectorAll("[data-ui]").forEach(btn => btn.setAttribute("aria-pressed",String(btn.dataset.ui===active)));
  image.hidden=false;
  image.src=variant.image;
  image.alt=variant.alt;
  $("viewTitle").textContent=variant.label;
  $("pictureLabel").textContent=variant.label+" · visual-only reference";
  $("openImage").href=variant.image;
  $("imageError").hidden=true;
  frame.style.width=(zoom*100)+"%";
  image.style.width="100%";
  $("zoomValue").textContent=Math.round(zoom*100)+"%";
  const address=new URL(location.href);
  address.searchParams.set("ui",active);
  history.replaceState(null,"",address);
}
function select(next){if(!(next in variants))return;active=next;zoom=1;render();interactionLab?.setUi(next);stage.scrollTo(0,0);}
function setZoom(next){zoom=Math.max(.5,Math.min(3,Math.round(next*10)/10));render();}
document.querySelectorAll("[data-ui]").forEach(btn=>btn.addEventListener("click",()=>select(btn.dataset.ui)));
$("zoomIn").addEventListener("click",()=>setZoom(zoom+.25));
$("zoomOut").addEventListener("click",()=>setZoom(zoom-.25));
$("zoomFit").addEventListener("click",()=>setZoom(1));
window.addEventListener("keydown",event=>{if(event.altKey||event.ctrlKey||event.metaKey)return;if(event.key==="ArrowLeft")select("UI_01");if(event.key==="ArrowRight")select("UI_02");});
image.addEventListener("error",()=>{image.hidden=true;$("imageError").hidden=false;});
render();
interactionLab=mountInteractionLab({getUi:()=>active,onUi:select});
stageControls=mountOnImageCards({frame,image,lab:interactionLab});
mountMacroPanels({frame,image,lab:interactionLab});
