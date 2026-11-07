/* R6 quality review: task-specific evidence in the existing Journey journal. */
const LessonAssessment=(()=>{
  const DAY=86400000,intervals=[0,1,3,7,14,30];
  const store=()=>state.miJourney3;
  const graded=t=>!t.stage&&!t.extension&&['input','reading','listening'].includes(t.type);
  function signature(t,version=2){return 'r6q'+version+':'+mi11Hash(StateStore.canonical({id:t.id,prompt:t.prompt,text:t.text||'',expected:t.expected,alternatives:[...(t.alternatives||[])].sort(),options:[...(t.options||[])].sort(),strictPunctuation:!!t.strictPunctuation,skill:t.skill}));}
  function matches(t,value){const normalize=t.strictPunctuation?normal:s=>normal(s).replace(/[¿¡!?.,;:]/g,'').replace(/\s+/g,' ').trim();return [t.expected,...(t.alternatives||[])].some(v=>normalize(v)===normalize(value));}
  function shuffle(tasks,seed){let n=[...seed].reduce((a,c)=>(Math.imul(a,31)+c.charCodeAt(0))>>>0,17);for(const t of tasks)for(let i=(t.options||[]).length-1;i>0;i--){n=(Math.imul(n,1664525)+1013904223)>>>0;const j=n%(i+1);[t.options[i],t.options[j]]=[t.options[j],t.options[i]];}return tasks;}
  function record(t,event,version){
    if(version!==2||!event||event.performed===false||!['input','reading','listening'].includes(t.type))return;
    const j=store();j.taskReviews=j.taskReviews||{};const old=j.taskReviews[t.id]||{},sig=signature(t),same=old.signature===sig,now=Date.now(),success=event.ok===true&&!event.hintUsed&&!event.transcriptUsed;
    const early=same&&Number.isFinite(old.next)&&old.next>now,steps=success?(early?old.steps||0:Math.min((same?old.steps||0:0)+1,5)):0;
    const next=success?(early?old.next:now+intervals[Math.max(1,steps)]*DAY):now+600000;
    j.taskReviews[t.id]={...old,signature:sig,assessmentVersion:2,steps,next,attempts:(old.attempts||0)+1,correct:(old.correct||0)+(success?1:0),last:now,lastCorrect:success,lastAnswer:event.answer,hintUsed:!!event.hintUsed,transcriptUsed:!!event.transcriptUsed,needsWork:!success,earlyReview:early,sessionId:event.sessionId,eventId:event.id};
  }
  function evaluate(l){const records=store()?.taskReviews||{},good=t=>{const r=records[t.id];return r&&r.signature===signature(t)&&r.lastCorrect&&!r.hintUsed&&!r.transcriptUsed;};const controls=l.tasks.filter(t=>t.control&&!t.extension),comprehension=l.tasks.filter(t=>graded(t)&&['reading','listening'].includes(t.type));return {controlCorrect:controls.filter(good).length,controlTotal:controls.length,controlPassed:controls.every(good),comprehensionCorrect:comprehension.filter(good).length,comprehensionTotal:comprehension.length,comprehensionPassed:comprehension.every(good)};}
  function candidates(l){const records=store()?.taskReviews||{},now=Date.now();return l.tasks.filter(t=>!t.stage&&['input','reading','listening'].includes(t.type)&&records[t.id]&&(records[t.id].needsWork||records[t.id].signature!==signature(t)||records[t.id].next<=now));}
  function queueHTML(l){const records=store()?.taskReviews||{},tasks=candidates(l);return '<section class="lesson"><h3>Повторение по результатам</h3>'+(tasks.length?'<p>Заданий для работы: '+tasks.length+'. Ошибки и повторы привязаны к конкретным ответам.</p>'+tasks.map(t=>{const r=records[t.id];return '<details><summary>'+esc(t.prompt)+'</summary><p>Последний ответ: '+esc(r.lastAnswer||'—')+'</p><p>'+(r.needsWork?'Нужно исправить или проверить без помощи.':'Пришёл срок повторения или обновился материал.')+'</p><p>Назначено: '+new Date(r.next).toLocaleString('ru-RU')+'</p></details>';}).join('')+'<button data-lesson-review="'+l.id+'">Работа над ошибками / повторить</button>':'<p>Нет ошибок и повторов, требующих работы сейчас. Будущие интервалы сохранены; непроверенный материал не считается освоенным.</p>')+futureHTML(l)+'</section>';}
  function futureHTML(l){const records=store()?.taskReviews||{},now=Date.now(),future=l.tasks.filter(t=>records[t.id]?.next>now).sort((a,b)=>records[a.id].next-records[b.id].next)[0];return future?'<p class="muted">Ближайший повтор задания: '+esc(future.prompt)+' · '+new Date(records[future.id].next).toLocaleString('ru-RU')+'</p>':'';}
  function finish(l,a){
    const j=store(),s=j.lastSummary;if((a.assessmentVersion||1)!==2){Object.assign(s,{lessonId:l.id,assessmentVersion:1,currentAssessment:false,controlPassed:false});return;}
    j.lessonReviews=j.lessonReviews||{};const old=j.lessonReviews[l.id]||{},evaluation=evaluate(l),full=!a.reviewOnly,currentCycle=full||(old.assessmentVersion===2&&!!old.cycleCompletedAt),passed=currentCycle&&evaluation.controlPassed&&evaluation.comprehensionPassed,now=Date.now();
    const early=old.assessmentVersion===2&&old.passed&&old.next>now,steps=passed?(early?old.steps||1:Math.min((old.assessmentVersion===2?old.steps||0:0)+1,5)):0;
    const reviewed={...old,...evaluation,assessmentVersion:2,cycleCompletedAt:full?now:old.cycleCompletedAt||null,passed,steps,next:passed?(early?old.next:now+intervals[Math.max(1,steps)]*DAY):now+DAY,at:now};
    if(old.assessmentVersion!==2&&Object.keys(old).length&&!old.priorAssessment)reviewed.priorAssessment=StateStore.clean(old);
    j.lessonReviews[l.id]=reviewed;Object.assign(s,{...evaluation,lessonId:l.id,assessmentVersion:2,currentAssessment:true,controlPassed:passed,reviewOnly:!!a.reviewOnly});
  }
  return {signature,matches,shuffle,record,evaluate,candidates,queueHTML,finish,graded};
})();
