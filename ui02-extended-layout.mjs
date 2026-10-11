// Public UI_02 REF-confirmed outer bounds only; internal arrangement APPROX.
export const UI02_EXTENDED=Object.freeze({
  width:1672,height:941,panels:{
    MOTION:{x:356,y:444,w:972,h:283},
    AMBIENCE:{x:1337,y:380,w:322,h:350}
  }
});
export function extendedBounds(group){
  const box=UI02_EXTENDED.panels[group];
  if(!box)throw Error("Unsupported public UI_02 panel");
  return {left:box.x/UI02_EXTENDED.width*100,top:box.y/UI02_EXTENDED.height*100,
    width:box.w/UI02_EXTENDED.width*100,height:box.h/UI02_EXTENDED.height*100};
}
