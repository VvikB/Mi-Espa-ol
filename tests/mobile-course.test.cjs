const test=require('node:test');
const assert=require('node:assert/strict');
const learning=require('../mobile/learning.js');
const core=require('../src/adaptive/core.js');
const bridge=require('../src/adaptive/bridge.js');
const {COURSE}=learning;
const root=()=>({miAdaptive7:{schema:1,events:[],availableMinutes:15,createdAt:1}});
test('real R6 material complete in native bundle',()=>{
 assert.equal(COURSE.lessons.length,6);
 assert.equal(COURSE.words.length,483);
 assert.equal(COURSE.atlas.length,16);
 assert.equal(COURSE.atlas.reduce((n,a)=>n+a.tables.length,0),73);
 assert.equal(COURSE.lessons.reduce((n,l)=>n+l.tasks.length,0),120);
 for(const l of COURSE.lessons){
  assert.ok(l.explanations.length>=3);
  assert.ok(l.dialogue.length>0);
  assert.equal(l.lexicon.length,10);
  assert.ok(l.tasks.some(t=>t.control));
  assert.ok(l.tasks.some(t=>t.type==='listening'));
 }
});
test('task identities are unique and contain no missing expected answers',()=>{
 const ids=COURSE.lessons.flatMap(l=>l.tasks.map(t=>t.id));
 assert.equal(new Set(ids).size,ids.length);
 for(const task of COURSE.lessons.flatMap(l=>l.tasks)){
  if(['input','reading','listening'].includes(task.type)){
   assert.ok(typeof task.expected==='string'&&task.expected.length>0,task.id);
   if(task.options?.length)assert.ok(task.options.includes(task.expected),task.id);
  }
 }
});
test('lesson start and resume do not mutate previous state',()=>{
 const state=root(),start=learning.begin(state,'A1-01');
 assert.equal(state.miMobileCourse7,undefined);
 assert.equal(learning.read(start).active.step,0);
 assert.deepEqual(learning.read(learning.begin(start,'A1-01')).active,learning.read(start).active);
});
test('accent sensitive answers and no false objective speech score',()=>{
 const l=COURSE.lessons[0],t=l.tasks.find(x=>x.type==='input'&&!x.stage);
 assert.equal(learning.assess(t,t.expected).ok,true);
 assert.equal(learning.assess(t,'incorrect').ok,false);
 const speech=l.tasks.find(x=>x.type==='speaking');
 const result=learning.assess(speech,'dije la frase',{selfAssessed:true});
 assert.equal(result.objective,false);
});
test('listening counts only if heard and transcript hidden',()=>{
 const task=COURSE.lessons[0].tasks.find(x=>x.type==='listening');
 assert.equal(learning.assess(task,task.expected,{heard:false,transcript:false}).objective,false);
 assert.equal(learning.assess(task,task.expected,{heard:true,transcript:true}).objective,false);
 assert.equal(learning.assess(task,task.expected,{heard:true,transcript:false}).objective,true);
});
test('task advances and repeat rewrites last score safely',()=>{
 let st=learning.begin(root(),'A1-01');
 const l=COURSE.lessons[0];
 for(let i=0;i<l.tasks.length;i++){
  const t=l.tasks[i],result=t.stage?learning.assess(t,''):t.type==='writing'||t.type==='speaking'?learning.assess(t,'mi trabajo',{selfAssessed:true}):learning.assess(t,t.expected||'',{heard:true});
  st=learning.advance(st,result);
 }
 assert.equal(learning.read(st).active,null);
 assert.equal(learning.lessonProgress(st,'A1-01').completed,true);
 assert.equal(learning.lessonProgress(st,'A1-01').done,20);
 st=learning.begin(st,'A1-01');
 st=learning.advance(st,learning.assess(l.tasks[0],''));
 assert.equal(learning.read(st).results[l.tasks[0].id].attempts,2);
});
test('card reviews preserve progress and never silently certify mastery',()=>{
 const a=root(),b=learning.updateCard(a,0,false),c=learning.updateCard(b,0,true);
 assert.equal(learning.read(c).cardReviews[0].steps,1);
 assert.equal(a.miMobileCourse7,undefined);
 assert.equal(bridge.read(c).events.length,0);
});

test('a graded mistake enters targeted review without changing the previous course',()=>{
 let st=learning.begin(root(),'A1-01');
 const l=COURSE.lessons[0],t=l.tasks.find(x=>x.type==='input');
 for(const task of l.tasks){
  const evaluation=task.id===t.id?learning.assess(task,'WRONG'):
   task.stage?learning.assess(task,''):
   ['writing','speaking'].includes(task.type)?learning.assess(task,'self',{selfAssessed:true}):
   learning.assess(task,task.expected||'',{heard:true});
  st=learning.advance(st,evaluation);
 }
 const due=learning.reviewQueue(st,Date.now()+11*60000);
 assert.ok(due.some(x=>x.id===t.id));
 const previous=st;
 st=learning.recordReview(st,t.id,t.expected);
 assert.equal(learning.read(previous).results[t.id].ok,false);
 assert.equal(learning.read(st).results[t.id].ok,false); // full lesson score remains unchanged
 assert.equal(learning.read(st).taskReviews[t.id].lastCorrect,true);
 assert.equal(learning.read(st).taskReviews[t.id].needsWork,false);
 assert.equal(learning.read(st).active,null);
 assert.equal(learning.lessonProgress(st,'A1-01').completed,true);
});
test('unsupported audio cannot be awarded targeted written review score',()=>{
 const state=root(),t=COURSE.lessons[0].tasks.find(x=>x.type==='listening');
 assert.throws(()=>learning.recordReview(state,t.id,t.expected));
});
