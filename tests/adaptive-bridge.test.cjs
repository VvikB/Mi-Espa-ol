const {test}=require('node:test');
const assert=require('node:assert/strict');
const core=require('../src/adaptive/core.js');
const bridge=require('../src/adaptive/bridge.js');

test('legacy progress and session retained after R7 entry',()=>{
 const progress={miJourney3:{schema:1,events:[{id:'historical'}],active:{id:'working',drafts:{q:'hola'}}},answers:{x:{correct:true}}};
 const next=bridge.add(progress,{id:'new',day:'2026-11-22',skill:'vocabulary',minutes:6,words:20},core);
 assert.deepEqual(next.miJourney3,progress.miJourney3);
 assert.deepEqual(next.answers,progress.answers);
 assert.equal(progress.miAdaptive7,undefined);
 assert.equal(bridge.read(next).events[0].words,20);
});
test('plan allows zero time and due reviews use stable lesson ids',()=>{
 const x={miJourney3:{lessonReviews:{'A1-01':{next:Date.parse('2026-11-20T12:00:00Z')},'A1-02':{next:Date.parse('2026-11-30T12:00:00Z')}}}};
 const due=bridge.dueFromReviews(x,'2026-11-22');
 assert.deepEqual(due.map(r=>r.id),['A1-01']);
 assert.equal(core.dailyPlan({day:'2026-11-22',availableMinutes:0,due}).assignments.length,0);
});
test('reject corrupt R7 namespace instead of silently resetting',()=>{
 assert.throws(()=>bridge.read({miAdaptive7:{schema:9,events:[],availableMinutes:15}}));
});
test('changing available minutes preserves other namespaces',()=>{
 const old={miJourney3:{active:{id:'session'}}};
 const updated=bridge.setMinutes(old,25);
 assert.equal(updated.miJourney3.active.id,'session');
 assert.equal(bridge.read(updated).availableMinutes,25);
 assert.equal(old.miAdaptive7,undefined);
});
