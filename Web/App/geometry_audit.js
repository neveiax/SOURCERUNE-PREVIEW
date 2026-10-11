/* SOURCERUNE runtime geometry self-audit.
   Visual/debug only. No DSP/state/preset semantics. */
function auditReferenceGeometry(){
  const ui2=document.body.classList.contains("ui-02");
  const app=document.querySelector(".app");
  const ws=document.querySelector(".workspace");
  const center=document.querySelector(".center");
  const scene=document.querySelector(".scene-panel");
  const macro=document.querySelector(".macro-strip");
  const topbar=document.querySelector(".topbar");
  if(!app||!ws||!center||!scene||!macro||!topbar)return {ok:false,reason:"missing-root"};

  const scale=parseFloat((app.style.transform.match(/scale\(([^)]+)\)/)||[])[1]||"1")||1;
  const appRect=app.getBoundingClientRect();
  const box=e=>{const r=e.getBoundingClientRect();return {
    w:r.width/scale,h:r.height/scale,
    x:(r.x-appRect.x)/scale,y:(r.y-appRect.y)/scale
  }};
  const near=(a,b,t=1)=>Math.abs(a-b)<=t;
  // CONFIRMED action rectangles must reject a full pixel of drift.
  // Small subpixel tolerance only accommodates CSS transform rounding.
  const lockedPixel=(a,b)=>Math.abs(a-b)<0.25;
  const fail=checks=>Object.entries(checks).filter(([,v])=>!v).map(([k])=>k);

  if(!ui2){
    const cards=Object.fromEntries([...document.querySelectorAll(".module-card")].map(e=>[e.dataset.type,box(e)]));
    const ana=document.querySelector(".analysis-panel");
    const rail=document.querySelector(".module-rail");
    const meter=document.querySelector(".meter-rail");
    const panelHead=document.querySelector(".scene-panel .panel-head");
    const sceneSvg=document.querySelector("#sceneSvg");
    const tabs=document.querySelector(".analysis-panel .tabs");
    const meterSlots=[...document.querySelectorAll(".meter-slot")];
    const meterMode=document.querySelector(".meter-mode-toggle");
    const gear=document.querySelector("#settingsBtn");
    const macros=Object.fromEntries([...document.querySelectorAll("#macroStrip .macro")].map(e=>[e.dataset.open,box(e)]));
    // UI_01 runtime-size contract (not a claim of fine REF pixel confirmation).
    // Measure the rendered knob face, rather than trusting the CSS variable.
    const motionKnobFaces=[...document.querySelectorAll(".macro-motion .macro-knob-face")];
    const macroKnobFaces=Object.fromEntries([
      ["badSignal",".macro-badsignal"],
      ["condition",".macro-condition"],
      ["intelligibility",".macro-intelligibility"],
      ["ambience",".macro-ambience"],
      ["mix",".macro-mix"]
    ].map(([id,selector])=>[id,document.querySelector(selector+" .macro-knob-face")]));
    const faceDiameter=(e,n)=>!!e&&near(box(e).w,n,0.25)&&near(box(e).h,n,0.25);
    const cardPart=(type,sel)=>document.querySelector(`.module-card[data-type="${type}"] ${sel}`);
    const art=Object.fromEntries(["SOURCE","TRANSMISSION","WALL_COVER","SPACE_ENVIRONMENT"].map(t=>[t,cardPart(t,".module-art")]));
    const edit=Object.fromEntries(["SOURCE","TRANSMISSION","WALL_COVER","SPACE_ENVIRONMENT"].map(t=>[t,cardPart(t,"[data-edit]")]));
    const arrow=Object.fromEntries(["SOURCE","TRANSMISSION","WALL_COVER","SPACE_ENVIRONMENT"].map(t=>[t,cardPart(t,".module-cycle-next")]));
    const checks={
      appW:near(box(app).w,1499), appH:near(box(app).h,807),
      topH:near(box(topbar).h,58),
      wsH:near(box(ws).h,528),
      sceneH:near(box(scene).h,262),
      sceneRect:near(box(scene).x,333)&&near(box(scene).y,58)&&near(box(scene).w,967)&&near(box(scene).h,262),
      sceneHeadH:panelHead?near(box(panelHead).h,34):false,
      sceneGraphH:sceneSvg?near(box(sceneSvg).h,186):false,
      sceneViewBox:sceneSvg?sceneSvg.getAttribute("viewBox")==="0 140 1000 192":false,
      analysisH:ana?near(box(ana).h,247):false,
      analysisRect:ana?near(box(ana).x,333)&&near(box(ana).y,328)&&near(box(ana).w,967)&&near(box(ana).h,247):false,
      analysisTabsH:tabs?near(box(tabs).h,37):false,
      meterH:meter?near(box(meter).h,376):false,
      meterRect:meter?near(box(meter).x,1310)&&near(box(meter).y,58)&&near(box(meter).w,179)&&near(box(meter).h,376):false,
      moduleRailH:rail?near(box(rail).h,520):false,
      meterSlots:meterSlots.length===2&&meterSlots.every(el=>near(box(el).w,20)&&near(box(el).h,178)),
      meterMode:meterMode?near(box(meterMode).y,331)&&near(box(meterMode).h,30):false,
      // A late CSS cascade must not silently change the established UI_01
      // runtime knob sizes. Fine REF positions remain APPROX in the spec.
      motionKnobFaces55:motionKnobFaces.length===4&&faceDiameter(motionKnobFaces[0],55)&&motionKnobFaces.slice(1).every(e=>faceDiameter(e,43)),
      badSignalKnob68:faceDiameter(macroKnobFaces.badSignal,68),
      conditionKnob68:faceDiameter(macroKnobFaces.condition,68),
      intelligibilityKnob68:faceDiameter(macroKnobFaces.intelligibility,68),
      ambienceKnob68:faceDiameter(macroKnobFaces.ambience,68),
      mixKnob82:faceDiameter(macroKnobFaces.mix,82),
      macroStripH:near(box(macro).h,221),
      macroStripRect:near(box(macro).x,0)&&near(box(macro).y,586)&&near(box(macro).w,1499)&&near(box(macro).h,221),
      gear:gear?near(box(gear).w,38)&&near(box(gear).h,38)&&near(box(gear).y,9)&&near(box(gear).x,1451):false,

      // The four UI_01 card outer rectangles are REF-confirmed. Validate
      // all four edges rather than only heights/Y, and reject 1px drift.
      sourceCard:cards.SOURCE?["x","y","w","h"].every((k,i)=>lockedPixel(cards.SOURCE[k],[10,58,313,136][i])):false,
      transmissionCard:cards.TRANSMISSION?["x","y","w","h"].every((k,i)=>lockedPixel(cards.TRANSMISSION[k],[10,201,313,132][i])):false,
      wallCard:cards.WALL_COVER?["x","y","w","h"].every((k,i)=>lockedPixel(cards.WALL_COVER[k],[10,340,313,132][i])):false,
      spaceCard:cards.SPACE_ENVIRONMENT?["x","y","w","h"].every((k,i)=>lockedPixel(cards.SPACE_ENVIRONMENT[k],[10,478,313,97][i])):false,

      sourceArt:art.SOURCE?near(box(art.SOURCE).x,19)&&near(box(art.SOURCE).y,115)&&near(box(art.SOURCE).w,239)&&near(box(art.SOURCE).h,72):false,
      transmissionArt:art.TRANSMISSION?near(box(art.TRANSMISSION).x,19)&&near(box(art.TRANSMISSION).y,257)&&near(box(art.TRANSMISSION).w,239)&&near(box(art.TRANSMISSION).h,70):false,
      wallArt:art.WALL_COVER?near(box(art.WALL_COVER).x,19)&&near(box(art.WALL_COVER).y,397)&&near(box(art.WALL_COVER).w,239)&&near(box(art.WALL_COVER).h,69):false,
      spaceArt:art.SPACE_ENVIRONMENT?near(box(art.SPACE_ENVIRONMENT).x,19)&&near(box(art.SPACE_ENVIRONMENT).y,533)&&near(box(art.SPACE_ENVIRONMENT).w,239)&&near(box(art.SPACE_ENVIRONMENT).h,35):false,

      sourceEdit:edit.SOURCE?lockedPixel(box(edit.SOURCE).x,270)&&lockedPixel(box(edit.SOURCE).y,72)&&lockedPixel(box(edit.SOURCE).w,48)&&lockedPixel(box(edit.SOURCE).h,34):false,
      transmissionEdit:edit.TRANSMISSION?lockedPixel(box(edit.TRANSMISSION).x,270)&&lockedPixel(box(edit.TRANSMISSION).y,213)&&lockedPixel(box(edit.TRANSMISSION).w,48)&&lockedPixel(box(edit.TRANSMISSION).h,34):false,
      wallEdit:edit.WALL_COVER?lockedPixel(box(edit.WALL_COVER).x,270)&&lockedPixel(box(edit.WALL_COVER).y,353)&&lockedPixel(box(edit.WALL_COVER).w,48)&&lockedPixel(box(edit.WALL_COVER).h,34):false,
      spaceEdit:edit.SPACE_ENVIRONMENT?lockedPixel(box(edit.SPACE_ENVIRONMENT).x,270)&&lockedPixel(box(edit.SPACE_ENVIRONMENT).y,489)&&lockedPixel(box(edit.SPACE_ENVIRONMENT).w,48)&&lockedPixel(box(edit.SPACE_ENVIRONMENT).h,34):false,

      sourceArrow:arrow.SOURCE?lockedPixel(box(arrow.SOURCE).x,269)&&lockedPixel(box(arrow.SOURCE).y,115)&&lockedPixel(box(arrow.SOURCE).w,49)&&lockedPixel(box(arrow.SOURCE).h,72):false,
      transmissionArrow:arrow.TRANSMISSION?lockedPixel(box(arrow.TRANSMISSION).x,269)&&lockedPixel(box(arrow.TRANSMISSION).y,257)&&lockedPixel(box(arrow.TRANSMISSION).w,49)&&lockedPixel(box(arrow.TRANSMISSION).h,70):false,
      wallArrow:arrow.WALL_COVER?lockedPixel(box(arrow.WALL_COVER).x,269)&&lockedPixel(box(arrow.WALL_COVER).y,397)&&lockedPixel(box(arrow.WALL_COVER).w,49)&&lockedPixel(box(arrow.WALL_COVER).h,70):false,
      spaceArrow:arrow.SPACE_ENVIRONMENT?lockedPixel(box(arrow.SPACE_ENVIRONMENT).x,269)&&lockedPixel(box(arrow.SPACE_ENVIRONMENT).y,532)&&lockedPixel(box(arrow.SPACE_ENVIRONMENT).w,49)&&lockedPixel(box(arrow.SPACE_ENVIRONMENT).h,36):false,

      centerX:near(box(center).x,333),
      meterX:meter?near(box(meter).x,1310):false,

      macroMotion:macros.MOTION?near(macros.MOTION.x,10)&&near(macros.MOTION.y,586)&&near(macros.MOTION.w,269)&&near(macros.MOTION.h,216):false,
      macroTransmission:macros.TRANSMISSION?near(macros.TRANSMISSION.x,287)&&near(macros.TRANSMISSION.y,586)&&near(macros.TRANSMISSION.w,178)&&near(macros.TRANSMISSION.h,216):false,
      macroCondition:macros.CONDITION?near(macros.CONDITION.x,473)&&near(macros.CONDITION.y,586)&&near(macros.CONDITION.w,201)&&near(macros.CONDITION.h,216):false,
      macroIntelligibility:macros.INTELLIGIBILITY?near(macros.INTELLIGIBILITY.x,682)&&near(macros.INTELLIGIBILITY.y,586)&&near(macros.INTELLIGIBILITY.w,201)&&near(macros.INTELLIGIBILITY.h,216):false,
      macroAmbience:macros.AMBIENCE?near(macros.AMBIENCE.x,891)&&near(macros.AMBIENCE.y,586)&&near(macros.AMBIENCE.w,155)&&near(macros.AMBIENCE.h,216):false,
      macroMix:macros.MIX?near(macros.MIX.x,1054)&&near(macros.MIX.y,586)&&near(macros.MIX.w,115)&&near(macros.MIX.h,216):false,
      macroEq:macros.EQ_TONE?near(macros.EQ_TONE.x,1177)&&near(macros.EQ_TONE.y,586)&&near(macros.EQ_TONE.w,312)&&near(macros.EQ_TONE.h,216):false
    };
    const measurements={
      scene:box(scene),
      analysis:ana?box(ana):null,
      meter:meter?box(meter):null,
      moduleRail:rail?box(rail):null,
      cards,
      art:Object.fromEntries(Object.entries(art).map(([k,e])=>[k,e?box(e):null])),
      edit:Object.fromEntries(Object.entries(edit).map(([k,e])=>[k,e?box(e):null])),
      arrow:Object.fromEntries(Object.entries(arrow).map(([k,e])=>[k,e?box(e):null])),
      knobFaces:{
        motion:motionKnobFaces.map(box),
        ...Object.fromEntries(Object.entries(macroKnobFaces).map(([k,e])=>[k,e?box(e):null]))
      },
      macros
    };
    return {ui:"UI_01",ok:Object.values(checks).every(Boolean),checks,failures:fail(checks),measurements};
  }

  const cards=Object.fromEntries([...document.querySelectorAll(".module-card")].map(e=>[e.dataset.type,box(e)]));
  const meter=document.querySelector(".meter-rail");
  const sceneSvg=document.querySelector("#sceneSvg");
  const motionDeck=document.querySelector(".motion-readouts");
  const meterSlots=[...document.querySelectorAll(".meter-slot")];
  const gear=document.querySelector("#settingsBtn");
  const prev=document.querySelector("#presetPrevBtn");
  const next=document.querySelector("#presetNextBtn");
  const folder=document.querySelector("#presetVisualsBtn");
  const motionAdjustIds=["speed","doppler","width"];
  const motionAdjust=Object.fromEntries(motionAdjustIds.map(id=>[id,document.querySelector('[data-motion-adjust="'+id+'"]')]));
  // These are live CSS-bound independent PNG components, not REF crops.
  // Guard the computed asset and its configured native face size so a later
  // stylesheet cannot silently remove the knob image while retaining its box.
  const imageBinding=(el,asset,size)=>{
    if(!el)return false;
    const css=getComputedStyle(el);
    return css.backgroundImage.includes(asset)&&css.backgroundSize.includes(size+"px "+size+"px");
  };
  const bottomKnob=document.querySelector(".macro-badsignal .macro-knob-face");
  const conditionKnob=document.querySelector(".macro-condition .macro-knob-face");
  const intelligibilityKnob=document.querySelector(".macro-intelligibility .macro-knob-face");
  const mixKnob=document.querySelector(".macro-mix .macro-knob-face");
  const macros=Object.fromEntries([...document.querySelectorAll("#macroStrip .macro")].map(e=>[e.dataset.open,box(e)]));
  const checks={
    appW:near(box(app).w,1672), appH:near(box(app).h,941),
    topH:near(box(topbar).h,78),
    wsH:near(box(ws).h,653),
    workspaceRect:near(box(ws).x,0)&&near(box(ws).y,78)&&near(box(ws).w,1672)&&near(box(ws).h,653),
    scenePanelH:near(box(scene).h,641),
    scenePanelRect:near(box(scene).x,356)&&near(box(scene).y,86)&&near(box(scene).w,972)&&near(box(scene).h,641),
    sceneVisualH:sceneSvg?near(box(sceneSvg).h,358):false,
    sceneVisualRect:sceneSvg?near(box(sceneSvg).x,356)&&near(box(sceneSvg).y,86)&&near(box(sceneSvg).w,972)&&near(box(sceneSvg).h,358):false,
    sceneViewBox:sceneSvg?sceneSvg.getAttribute("viewBox")==="0 0 1000 420":false,
    motionDeckH:motionDeck?near(box(motionDeck).h,283):false,
    motionDeckRect:motionDeck?near(box(motionDeck).x,356)&&near(box(motionDeck).y,444)&&near(box(motionDeck).w,972)&&near(box(motionDeck).h,283):false,

    sourceCard:cards.SOURCE?near(cards.SOURCE.w,334)&&near(cards.SOURCE.h,213)&&near(cards.SOURCE.x,13)&&near(cards.SOURCE.y,86):false,
    transmissionCard:cards.TRANSMISSION?near(cards.TRANSMISSION.w,334)&&near(cards.TRANSMISSION.h,166)&&near(cards.TRANSMISSION.x,13)&&near(cards.TRANSMISSION.y,308):false,
    wallCard:cards.WALL_COVER?near(cards.WALL_COVER.w,334)&&near(cards.WALL_COVER.h,247)&&near(cards.WALL_COVER.x,13)&&near(cards.WALL_COVER.y,483):false,
    spaceCard:cards.SPACE_ENVIRONMENT?near(cards.SPACE_ENVIRONMENT.w,322)&&near(cards.SPACE_ENVIRONMENT.h,285)&&near(cards.SPACE_ENVIRONMENT.x,1337)&&near(cards.SPACE_ENVIRONMENT.y,86):false,

    centerX:near(box(center).x,356),
    centerWidth:near(box(center).w,972),
    meter:meter?near(box(meter).w,440)&&near(box(meter).h,62)&&near(box(meter).x,1160)&&near(box(meter).y,8):false,
    meterSlots:meterSlots.length===2&&meterSlots.every(el=>near(box(el).w,150)&&near(box(el).h,15)),
    macroStripH:near(box(macro).h,210),
    macroStripRect:near(box(macro).x,0)&&near(box(macro).y,731)&&near(box(macro).w,1672)&&near(box(macro).h,210),
    gear:gear?near(box(gear).w,38)&&near(box(gear).h,38)&&near(box(gear).y,18)&&near(box(gear).x,1624):false,
    presetPrev:prev?near(box(prev).w,42)&&near(box(prev).h,42):false,
    presetNext:next?near(box(next).w,42)&&near(box(next).h,42):false,
    presetFolder:folder?near(box(folder).w,44)&&near(box(folder).h,42):false,
    motionAdjustKnobs:motionAdjustIds.every(id=>{const el=motionAdjust[id];return el&&el.getAttribute("role")==="slider"&&el.tabIndex===0&&el.getAttribute("aria-label")}), 
    motionAdjustGeometry:motionAdjustIds.every(id=>{const el=motionAdjust[id];return el&&near(box(el).w,86)&&near(box(el).h,76)}),
    motionDialAsset300:motionDeck?imageBinding(motionDeck,"RT_KNOB_L_BASE.png",300):false,
    motionSmallKnobAssets54:motionAdjustIds.every(id=>imageBinding(motionAdjust[id],"RT_KNOB_S_BASE.png",54)),
    motionAdjustReadouts:motionAdjustIds.every(id=>{const el=motionAdjust[id],readout=document.getElementById(id+"Readout");if(!el||!readout)return false;const value=el.getAttribute("aria-valuenow");return value!==null&&Number.isFinite(Number(value))&&readout.textContent===value+(id==="speed"?" km/h":"%")}),
    bottomKnob76:bottomKnob?near(box(bottomKnob).w,76)&&near(box(bottomKnob).h,76):false,
    conditionKnob76:conditionKnob?near(box(conditionKnob).w,76)&&near(box(conditionKnob).h,76):false,
    intelligibilityKnob76:intelligibilityKnob?near(box(intelligibilityKnob).w,76)&&near(box(intelligibilityKnob).h,76):false,
    mixKnob76:mixKnob?near(box(mixKnob).w,76)&&near(box(mixKnob).h,76):false,

    bottomTransmission:macros.TRANSMISSION?near(macros.TRANSMISSION.w,337)&&near(macros.TRANSMISSION.h,172)&&near(macros.TRANSMISSION.x,13)&&near(macros.TRANSMISSION.y,751):false,
    bottomCondition:macros.CONDITION?near(macros.CONDITION.w,315)&&near(macros.CONDITION.h,172)&&near(macros.CONDITION.x,361)&&near(macros.CONDITION.y,751):false,
    bottomIntelligibility:macros.INTELLIGIBILITY?near(macros.INTELLIGIBILITY.w,297)&&near(macros.INTELLIGIBILITY.h,172)&&near(macros.INTELLIGIBILITY.x,687)&&near(macros.INTELLIGIBILITY.y,751):false,
    bottomMix:macros.MIX?near(macros.MIX.w,316)&&near(macros.MIX.h,172)&&near(macros.MIX.x,995)&&near(macros.MIX.y,751):false,
    bottomEq:macros.EQ_TONE?near(macros.EQ_TONE.w,337)&&near(macros.EQ_TONE.h,172)&&near(macros.EQ_TONE.x,1322)&&near(macros.EQ_TONE.y,751):false,

    ambience:macros.AMBIENCE?near(macros.AMBIENCE.w,322)&&near(macros.AMBIENCE.h,350)&&near(macros.AMBIENCE.x,1337)&&near(macros.AMBIENCE.y,380):false
  };
  const measurements={
    workspace:box(ws),
    center:box(center),
    scene:box(scene),
    sceneSvg:sceneSvg?box(sceneSvg):null,
    motionDeck:motionDeck?box(motionDeck):null,
    meter:meter?box(meter):null,
    cards,
    macros,
    bottomKnob:bottomKnob?box(bottomKnob):null,
    motionAdjust:Object.fromEntries(motionAdjustIds.map(id=>[id,motionAdjust[id]?box(motionAdjust[id]):null])),
    motionKnobAssetBindings:{
      dial:motionDeck?{image:getComputedStyle(motionDeck).backgroundImage,size:getComputedStyle(motionDeck).backgroundSize}:null,
      small:Object.fromEntries(motionAdjustIds.map(id=>[id,motionAdjust[id]?{
        image:getComputedStyle(motionAdjust[id]).backgroundImage,
        size:getComputedStyle(motionAdjust[id]).backgroundSize
      }:null]))
    },
    mixKnob:mixKnob?box(mixKnob):null
  };
  return {ui:"UI_02",ok:Object.values(checks).every(Boolean),checks,failures:fail(checks),measurements};
}
window.auditReferenceGeometry=auditReferenceGeometry;
