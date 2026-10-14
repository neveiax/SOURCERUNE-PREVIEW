// V1.0.021 — Web-only UI interaction. No audio processor or new parameter IDs.
const clamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));
const finite=(v,fallback=0)=>Number.isFinite(Number(v))?Number(v):fallback;
const fields=["startDistance","closestDistance","endDistance"];
function weights(p){
  const t=clamp(finite(p.motion,50)/100,0,1);
  switch(p.motionMode){
    case "STATIC":return {startDistance:1};
    case "APPROACH":return {startDistance:1-t,closestDistance:t};
    case "LEAVE":return {closestDistance:1-t,endDistance:t};
    case "PASS_BY":return t<=.5?
      {startDistance:1-2*t,closestDistance:2*t}:
      {closestDistance:2-2*t,endDistance:2*t-1};
    default:return {startDistance:1-t,endDistance:t};
  }
}
export function currentSceneDistance(p){
  const w=weights(p);
  return Object.entries(w).reduce((sum,[id,weight])=>sum+clamp(finite(p[id]),0,1000)*weight,0);
}
export function setCurrentSceneDistance(p,requested){
  const target=clamp(finite(requested,currentSceneDistance(p)),0,1000);
  const w=weights(p),active=fields.filter(id=>(w[id]||0)>0);
  // Radially translate the active path anchors. Redistribute any remainder
  // when an anchor hits the public schema's 0..1000 m boundary.
  const candidate=shift=>active.reduce((sum,id)=>
    sum+w[id]*clamp(finite(p[id])+shift,0,1000),0);
  let low=-1000,high=1000;
  for(let i=0;i<38;i++){
    const mid=(low+high)/2;
    if(candidate(mid)<target)low=mid;
    else high=mid;
  }
  const shift=(low+high)/2;
  let changed=false;
  for(const id of active){
    const value=Number(clamp(Math.round((finite(p[id])+shift)*10)/10,0,1000).toFixed(1));
    if(value!==Number(p[id])){p[id]=value;changed=true;}
  }
  return changed;
}
function svgX(svg,event){
  try{
    const matrix=svg.getScreenCTM();
    if(!matrix)return null;
    const point=svg.createSVGPoint();
    point.x=event.clientX;point.y=event.clientY;
    return point.matrixTransform(matrix.inverse()).x;
  }catch{return null;}
}
export function bindSceneDirectControls({getState,getDistance,setMotion,setDistance,snapshot,finish,revert}){
  const svg=document.getElementById("sceneSvg"),
        dial=document.getElementById("currentDistanceControl"),
        value=document.getElementById("distanceText"),
        source=document.getElementById("sourceNode"),
        listener=document.getElementById("listenerNode");
  if(!svg||!source||!value||!dial)return;
  const apply=(kind,next)=>kind==="motion"?setMotion(next):setDistance(next);
  const save=(kind,next)=>{const before=snapshot();if(apply(kind,next))finish(before);};
  let drag=null;
  const pointerValue=e=>{
    if(!drag)return null;
    if(drag.kind==="motion"){
      const x=svgX(svg,e);
      return x===null?null:clamp(Math.round((x-110)/790*100),0,100);
    }
    return clamp(drag.startDistance+(drag.startY-e.clientY)*(e.shiftKey?.1:.5),0,1000);
  };
  function begin(e,element,kind){
    if(e.button!==0||drag)return;
    e.preventDefault();e.stopPropagation();
    drag={element,kind,pointerId:e.pointerId,before:snapshot(),
          startDistance:getDistance(),startY:e.clientY};
    element.setPointerCapture(e.pointerId);
    element.classList.add("scene-adjusting");
    if(kind==="motion")source.focus({preventScroll:true});
    else (element===dial?dial:value).focus({preventScroll:true});
    const next=pointerValue(e);
    if(next!==null)apply(kind,next);
  }
  function move(e,element){
    if(!drag||drag.element!==element||drag.pointerId!==e.pointerId)return;
    e.preventDefault();
    const next=pointerValue(e);
    if(next!==null)apply(drag.kind,next);
  }
  function end(e,element){
    if(!drag||drag.element!==element||drag.pointerId!==e.pointerId)return;
    const original=drag.before,cancelled=e.type==="pointercancel";
    element.classList.remove("scene-adjusting");
    if(element.hasPointerCapture(e.pointerId))element.releasePointerCapture(e.pointerId);
    drag=null;
    if(cancelled)revert(original);
    else finish(original);
  }
  svg.addEventListener("pointerdown",e=>{
    const target=e.target,closest=target?.closest?.bind(target);
    if(!closest)return;
    if(closest("#sourceNode")||closest("#motionPathHit"))begin(e,svg,"motion");
    else if(closest("#distanceCallout")||closest("#distanceText"))begin(e,svg,"distance");
  });
  svg.addEventListener("pointermove",e=>move(e,svg));
  svg.addEventListener("pointerup",e=>end(e,svg));
  svg.addEventListener("pointercancel",e=>end(e,svg));
  dial.addEventListener("pointerdown",e=>{
    if(getState().ui==="UI_02")begin(e,dial,"distance");
  });
  dial.addEventListener("pointermove",e=>move(e,dial));
  dial.addEventListener("pointerup",e=>end(e,dial));
  dial.addEventListener("pointercancel",e=>end(e,dial));
  listener?.addEventListener("click",()=>{
    (getState().ui==="UI_02"?dial:value).focus({preventScroll:true});
  });
  const keyInput=(event,kind)=>{
    const current=kind==="motion"?finite(getState().params.motion):getDistance();
    const step=kind==="motion"?1:(event.shiftKey?.1:1);
    const max=kind==="motion"?100:1000;
    let next=null;
    if(event.key==="ArrowRight"||event.key==="ArrowUp")next=current+step;
    else if(event.key==="ArrowLeft"||event.key==="ArrowDown")next=current-step;
    else if(event.key==="PageUp")next=current+10*step;
    else if(event.key==="PageDown")next=current-10*step;
    else if(event.key==="Home")next=0;
    else if(event.key==="End")next=max;
    if(next===null)return;
    event.preventDefault();event.stopPropagation();
    save(kind,clamp(next,0,max));
  };
  source.addEventListener("keydown",e=>keyInput(e,"motion"));
  for(const target of [value,dial]){
    target.addEventListener("keydown",e=>keyInput(e,"distance"));
    target.addEventListener("wheel",e=>{
      if(e.ctrlKey||!e.deltaY)return;
      e.preventDefault();e.stopPropagation();
      const step=e.shiftKey?.1:1;
      save("distance",getDistance()+(e.deltaY<0?step:-step));
    },{passive:false});
  }
}