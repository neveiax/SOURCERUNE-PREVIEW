// Confirmed public UI_01 / UI_02 macro panel outer bounds, UI-only.
export const MACRO_LAYOUT=Object.freeze({
  UI_01:{width:1499,height:807,panels:{
    MOTION:{x:10,y:586,w:269,h:216},
    BAD_SIGNAL:{x:287,y:586,w:178,h:216},
    CONDITION:{x:473,y:586,w:201,h:216},
    INTELLIGIBILITY:{x:682,y:586,w:201,h:216},
    AMBIENCE:{x:891,y:586,w:155,h:216},
    MIX:{x:1054,y:586,w:115,h:216}
  }},
  UI_02:{width:1672,height:941,panels:{
    BAD_SIGNAL:{x:13,y:751,w:337,h:172},
    CONDITION:{x:361,y:751,w:315,h:172},
    INTELLIGIBILITY:{x:687,y:751,w:297,h:172},
    MIX:{x:995,y:751,w:316,h:172}
  }}
});
export const MACRO_PARAMETER=Object.freeze({
  MOTION:"motion",BAD_SIGNAL:"badSignal",CONDITION:"condition",
  INTELLIGIBILITY:"intelligibility",AMBIENCE:"ambience",MIX:"mix"
});
export function macroBounds(ui,panel) {
  const frame=MACRO_LAYOUT[ui],b=frame?.panels[panel];
  if(!frame||!b)throw Error("Unknown UI macro panel");
  return{left:100*b.x/frame.width,top:100*b.y/frame.height,
    width:100*b.w/frame.width,height:100*b.h/frame.height};
}
