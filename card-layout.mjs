// Public display geometry only. Confirmed outer card bounds from approved SOURCERUNE REF.
// Private DSP, filtering and all audio functionality are intentionally absent.
export const CARD_LAYOUT = Object.freeze({
  UI_01: {width:1499,height:807,cards:{
    SOURCE:{x:10,y:58,w:313,h:136},
    TRANSMISSION:{x:10,y:201,w:313,h:132},
    WALL_COVER:{x:10,y:340,w:313,h:132},
    SPACE_ENVIRONMENT:{x:10,y:478,w:313,h:97}
  }},
  UI_02: {width:1672,height:941,cards:{
    SOURCE:{x:13,y:86,w:334,h:213},
    TRANSMISSION:{x:13,y:308,w:334,h:166},
    WALL_COVER:{x:13,y:483,w:334,h:247},
    SPACE_ENVIRONMENT:{x:1337,y:86,w:322,h:285}
  }}
});
export function cardBounds(ui,group) {
  const frame=CARD_LAYOUT[ui],card=frame?.cards[group];
  if (!frame||!card)throw Error("Unknown public UI card");
  return {
    left:card.x/frame.width*100,
    top:card.y/frame.height*100,
    width:card.w/frame.width*100,
    height:card.h/frame.height*100
  };
}
export function screenshotMatches(ui,actualWidth,actualHeight) {
  const frame=CARD_LAYOUT[ui];
  return !!frame&&actualWidth===frame.width&&actualHeight===frame.height;
}
