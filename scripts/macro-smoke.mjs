import assert from "node:assert/strict";
import {MACRO_LAYOUT,MACRO_PARAMETER,macroBounds} from "../macro-layout.mjs";
import {macroView} from "../macro-controls.mjs";
import {createState,apply,CONTROLS} from "../interaction-state.mjs";
const allowed=new Set(CONTROLS.map(x=>x.id));
let count=0;
for(const ui of ["UI_01","UI_02"]){
  const state=createState(ui),frame=MACRO_LAYOUT[ui];
  for(const [key,b] of Object.entries(frame.panels)){
    const macro=macroView(state,key),box=macroBounds(ui,key);
    assert(allowed.has(MACRO_PARAMETER[key]));
    assert.equal(macro.value,state.params[macro.id]);
    assert(b.x>=0&&b.y>=0&&b.w>0&&b.h>0&&b.x+b.w<=frame.width&&b.y+b.h<=frame.height);
    assert(box.left>=0&&box.top>=0&&box.width>0&&box.height>0);
    assert.equal(apply(state,{type:"param",id:macro.id,value:40}).params[macro.id],40);
    for(const [other,c] of Object.entries(frame.panels)){
      if(key===other)continue;
      const overlap=Math.max(0,Math.min(b.x+b.w,c.x+c.w)-Math.max(b.x,c.x))
        *Math.max(0,Math.min(b.y+b.h,c.y+c.h)-Math.max(b.y,c.y));
      assert.equal(overlap,0);
    }
    count++;
  }
}
assert.equal(count,10);
assert.throws(()=>macroView(createState(),"EQ_TONE"));
assert.throws(()=>macroBounds("UI_03","MIX"));
console.log("PASS: ten public UI-only native macro panels across both approved layouts");
