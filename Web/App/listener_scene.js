// Scene listener coordinate model. UI geometry is a schematic projection, not
// measured acoustics or a substitute for the shared Native/Web DSP.
const clamp=(n,min,max)=>Math.min(max,Math.max(min,n));
const num=(n,fallback=0)=>Number.isFinite(Number(n))?Number(n):fallback;
export const LISTENER_DEFAULT=Object.freeze({x:0,z:0});
export const LISTENER_RANGE=Object.freeze({x:100,z:35});

export function normalizeListener(raw){
  return {
    x:Math.round(clamp(num(raw?.x),-LISTENER_RANGE.x,LISTENER_RANGE.x)*10)/10,
    z:Math.round(clamp(num(raw?.z),-LISTENER_RANGE.z,LISTENER_RANGE.z)*10)/10
  };
}
// World positions are stored in metres and shared between both layouts.
// The view is a presentation projection, NOT a 1:1 stage photograph.
export function listenerScreenPoint(raw,ui){
  const p=normalizeListener(raw);
  return {x:500+p.x*3,y:(ui==="UI_01"?250:270)-p.z*2};
}
export function listenerFromScreenPoint(x,y,ui){
  const baseY=ui==="UI_01"?250:270;
  return normalizeListener({x:(num(x,500)-500)/3,z:(baseY-num(y,baseY))/2});
}
// Approximate virtual emitter bearing from the existing motion progress.
// Nominal radial distance comes from the existing Start/Closest/End anchors.
// At the default listener position the distance is exactly the old value.
export function listenerSceneMetrics(raw,nominalDistance,progress,mode){
  const listener=normalizeListener(raw),r=clamp(num(nominalDistance,0),0,1000);
  const t=clamp(num(progress,0),0,1);
  const angle=(mode==="PASS_BY"||mode==="MANUAL")?(t-.5)*Math.PI*0.8:0;
  const sourceX=r*Math.sin(angle),sourceZ=r*Math.cos(angle);
  const dx=sourceX-listener.x,dz=sourceZ-listener.z;
  const rawDistance=Math.hypot(dx,dz);
  const bearing=Math.atan2(dx,dz)*180/Math.PI;
  return {
    distance:Math.round(rawDistance*10)/10,
    bearing:Math.round(bearing*10)/10,
    pan:clamp(rawDistance>1e-6?dx/rawDistance:0,-1,1),
    sourceX,sourceZ,
    listener
  };
}

// Solve for the old radial anchor when a user edits actual listener-relative
// distance. Returns null for unreachable geometry; does not silently change
// the listener position or unrelated host parameter IDs.
export function nominalForListenerDistance(raw,desired,progress,mode,previous){
  const listener=normalizeListener(raw);
  const target=clamp(num(desired,0),0,1100);
  const t=clamp(num(progress,0),0,1);
  const angle=(mode==="PASS_BY"||mode==="MANUAL")?(t-.5)*Math.PI*0.8:0;
  const ux=Math.sin(angle),uz=Math.cos(angle);
  const along=listener.x*ux+listener.z*uz;
  const perpendicular=Math.max(0,listener.x*listener.x+listener.z*listener.z-along*along);
  const discriminant=target*target-perpendicular;
  if(discriminant<-1e-7)return null;
  const root=Math.sqrt(Math.max(0,discriminant));
  const candidates=[along+root,along-root].filter(r=>r>=0&&r<=1000);
  if(!candidates.length)return null;
  candidates.sort((a,b)=>Math.abs(a-num(previous))-Math.abs(b-num(previous)));
  return Math.round(candidates[0]*10)/10;
}
