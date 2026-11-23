const assert = require('node:assert/strict');
const test = require('node:test');
const core = require('../src/adaptive/core.js');

test('records actual work without imposing the planned quota', () => {
  const a = core.addEvent([], {id:'task-1', day:'2026-11-22', skill:'vocabulary', minutes:5, words:30, attempted:4, correct:3, objective:true});
  assert.equal(a[0].words,30);
  assert.equal(core.addEvent(a,a[0]).length,1); // idempotent journal
  assert.equal(core.weekSummary(a,'2026-11-22').wordsPracticed,30);
});
test('old journal is not mutated', () => {
  const old=Object.freeze([{id:'legacy',day:'2026-11-21',skill:'grammar',minutes:8,words:0,attempted:1,correct:0,objective:true}]);
  const next=core.addEvent(old,{id:'new',day:'2026-11-22',skill:'reading',minutes:3,attempted:1,correct:1,objective:true});
  assert.equal(old.length,1);assert.equal(next.length,2);
});
test('self-assessment does not inflate objectively scored language skill', () => {
  const events=core.addEvent([],{id:'speech',day:'2026-11-22',skill:'speaking',minutes:10,attempted:5,correct:5,selfAssessed:true});
  const report=core.weekSummary(events,'2026-11-22');
  assert.equal(report.correct,0);assert.equal(report.minutes,10);
});
test('review queue prioritizes due and skips future', () => {
  const plan=core.dailyPlan({day:'2026-11-22',availableMinutes:8,nextLessonId:'A1-07',due:[{id:'later',dueDay:'2026-11-24'},{id:'older',dueDay:'2026-11-20'},{id:'today',dueDay:'2026-11-22'}]});
  assert.deepEqual(plan.assignments.map(x=>x.id),['older','today']);
  assert.equal(plan.deferredReviews,0);
});
test('invalid events rejected', () => {
  assert.throws(()=>core.addEvent([],{id:'x',day:'invalid'}));
  assert.throws(()=>core.addEvent([],{id:'x',day:'2026-11-22',attempted:1,correct:2}));
});

test('28-day activity calendar includes empty days and counted actuals, not fictitious work',()=>{
 const records=core.addEvent([],{id:'c1',day:'2026-11-22',skill:'grammar',minutes:17,words:5,attempted:1,correct:0,objective:true});
 const calendar=core.activityCalendar(records,'2026-11-22',28);
 assert.equal(calendar.length,28);
 assert.equal(calendar[0].minutes,0);
 assert.equal(calendar[27].minutes,17);
 assert.equal(calendar[27].wordsPracticed,5);
 assert.equal(calendar.reduce((n,x)=>n+x.minutes,0),17);
});
test('skill advice is evidence-based and cannot treat speech self-assessment as scored success',()=>{
 let j=core.addEvent([],{id:'g1',day:'2026-11-22',skill:'grammar',attempted:6,correct:2,objective:true,minutes:12});
 j=core.addEvent(j,{id:'s1',day:'2026-11-22',skill:'speaking',attempted:6,correct:6,selfAssessed:true,minutes:10});
 const result=core.skillEvidence(j,'2026-11-22');
 assert.equal(result.find(x=>x.id==='grammar').recommendation,'repeat_errors');
 assert.equal(result.find(x=>x.id==='speaking').correct,0);
 assert.equal(result.find(x=>x.id==='speaking').selfAssessed,1);
});

test('day pulse counts actual work, not assigned work or self-assessed success',()=>{
 const day='2026-11-23';
 const journal=[
  {id:'a',day,skill:'vocabulary',minutes:5,words:30,attempted:0,correct:0,objective:false},
  {id:'b',day,skill:'speaking',minutes:25,words:0,attempted:4,correct:4,selfAssessed:true},
  {id:'c',day,skill:'reading',minutes:0,words:0,attempted:3,correct:2,objective:true},
  {id:'old',day:'2026-11-22',skill:'grammar',minutes:45,words:0}
 ];
 const source=JSON.stringify(journal);
 const pulse=core.dayProgress(journal,day,15);
 assert.equal(pulse.actualMinutes,30);
 assert.equal(pulse.wordsPracticed,30);
 assert.equal(pulse.attempted,3);
 assert.equal(pulse.correct,2);
 assert.equal(pulse.exceededSuggestion,true);
 assert.equal(pulse.remainingSuggestedMinutes,0);
 assert.equal(JSON.stringify(journal),source);
});
test('day pulse records a valid zero-minute day without fabricated credit',()=>{
 const pulse=core.dayProgress([],'2026-11-23',0);
 assert.equal(pulse.actualMinutes,0);
 assert.equal(pulse.activities,0);
 assert.equal(pulse.exceededSuggestion,false);
 assert.throws(()=>core.dayProgress([],'2026-11-23',181));
});
test('due planner skips oversized review but offers affordable later review',()=>{
 const plan=core.dailyPlan({day:'2026-11-23',availableMinutes:2,
 due:[{id:'big',dueDay:'2026-11-20',estimatedMinutes:5},
      {id:'small',dueDay:'2026-11-21',estimatedMinutes:2}],nextLessonId:'A1-01'});
 assert.deepEqual(plan.assignments.map(a=>a.id),['small']);
 assert.equal(plan.assignedMinutes,2);
 assert.equal(plan.deferredReviews,1);
});
test('due planner deduplicates repeated IDs and never overcommits time',()=>{
 const plan=core.dailyPlan({day:'2026-11-23',availableMinutes:10,
 due:[{id:'same',dueDay:'2026-11-20',estimatedMinutes:2},
      {id:'same',dueDay:'2026-11-21',estimatedMinutes:2}],nextLessonId:'A1-01'});
 assert.equal(plan.assignments.filter(a=>a.id==='same').length,1);
 assert.equal(plan.deferredReviews,0);
 assert.equal(plan.assignedMinutes,10);
 assert.equal(plan.assignments.reduce((n,a)=>n+a.estimatedMinutes,0),10);
});
