import assert from "node:assert/strict";
import {CARD_LAYOUT,cardBounds,screenshotMatches} from "../card-layout.mjs";
import {GROUPS} from "../interaction-state.mjs";
for(const ui of ["UI_01","UI_02"]) {
  const {width,height,cards}=CARD_LAYOUT[ui];
  assert.deepEqual(Object.keys(cards),GROUPS);
  assert(screenshotMatches(ui,width,height));
  assert(!screenshotMatches(ui,width+1,height));
  for(const group of GROUPS) {
    const a=cards[group],b=cardBounds(ui,group);
    assert(a.x>=0&&a.y>=0&&a.w>0&&a.h>0&&a.x+a.w<=width&&a.y+a.h<=height);
    assert(b.left>=0&&b.top>=0&&b.width>0&&b.height>0&&b.left+b.width<=100.0001&&b.top+b.height<=100.0001);
    for(const other of GROUPS)if(other!==group) {
      const c=cards[other];
      const intersection=Math.max(0,Math.min(a.x+a.w,c.x+c.w)-Math.max(a.x,c.x))
        *Math.max(0,Math.min(a.y+a.h,c.y+c.h)-Math.max(a.y,c.y));
      assert.equal(intersection,0,ui+" "+group+" overlaps "+other);
    }
  }
}
assert.throws(()=>cardBounds("UI_03","SOURCE"));
console.log("PASS: 8 confirmed-layout UI card hit regions, normalized bounds and non-overlap");
