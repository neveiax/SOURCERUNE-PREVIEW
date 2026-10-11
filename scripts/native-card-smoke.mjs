import assert from "node:assert/strict";
import {createState,GROUPS,OPTIONS} from "../interaction-state.mjs";
import {describeNativeCard} from "../stage-controls.mjs";
for(const ui of ["UI_01","UI_02"]) {
  const state=createState(ui);
  state.activeGroup="SOURCE";
  for(const group of GROUPS) {
    const view=describeNativeCard(state,group,(u,g,i)=>"assets/library/"+u+"/"+g+"/"+i+".png");
    assert.equal(view.group,group);
    assert.equal(view.options.length,OPTIONS[group].length);
    assert.equal(view.name,OPTIONS[group][view.index]);
    assert.equal(view.active,group==="SOURCE");
    assert.equal(view.showBypass,ui==="UI_01");
    assert(view.artwork.includes(ui+"/"+group));
    assert(view.bounds.width>0&&view.bounds.height>0);
  }
}
const off=createState();
off.bypass.SOURCE=true;
assert.equal(describeNativeCard(off,"SOURCE").bypass,true);
assert.throws(()=>describeNativeCard(createState(),"UNKNOWN"));
console.log("PASS: 8 native HTML card UI descriptors, visible controls and shared state");
