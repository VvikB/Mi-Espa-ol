/* R3 technical learning engine on explicitly identified preserved material. */
const Journey = (() => {
  let visible=!!state.miJourney3?.active,legacyView=false,draftTimer=null;
  const norm=value=>normal(value).replace(/[¿¡!?.,;:]/g,'').replace(/\s+/g,' ').trim();
  const clone=value=>StateStore.clean(value);
  function store(){state.miJourney3=state.miJourney3||{schema:1,events:[],completedDays:{},completedSessions:{},active:null};return state.miJourney3;}
  function active(){const a=store().active;return a&&Array.isArray(a.tasks)&&Number.isInteger(a.step)&&a.step>=0&&a.tasks.length?a:null;}
  function current(){const a=active();return a?a.tasks[a.step]:null;}
  function choices(correct,seed){
    const variants=[correct,...DB.schemes.flatMap(s=>(s.examples||[]).map(x=>x[1])).filter(x=>x!==correct)];
    const unique=[...new Set(variants)].slice(0,4),shift=[...seed].reduce((n,c)=>n+c.charCodeAt(0),0)%unique.length;
    return unique.slice(shift).concat(unique.slice(0,shift));
  }
  function words(count){
    return CATALOG.words.map(w=>{const value=DB.vocab[w.legacyIndex],a=state.miRecall11?.[mi11RecallId(value)],b=state.vocab[String(w.legacyIndex)];
      const due=a?.next??b?.due;return {w,due,rank:due===undefined?1:due<=Date.now()?0:2};
    }).sort((a,b)=>a.rank-b.rank||(a.due||0)-(b.due||0)||a.w.legacyIndex-b.w.legacyIndex).slice(0,count);
  }
  function create(mode){
    const selected=RouteUI.selection(),route=RouteUI.route(),day=route.dayPlans[selected.day-1];
    const id='session-'+(crypto.randomUUID?crypto.randomUUID():Date.now()+'-'+Math.random().toString(16).slice(2)),tasks=[];
    const count=mode==='diagnostic'?1:selected.minutes/10;
    const push=t=>tasks.push({...t,id:id+'-task-'+tasks.length});
    for(const {w} of words(count)){const value=DB.vocab[w.legacyIndex];push({type:'input',skill:'vocabulary',contentId:w.id,prompt:value.ru,expected:value.es,explanation:value.ex,wordIndex:w.legacyIndex});}
    const grammatical=route.exerciseIds.map(id=>ContentIndex.get(id));
    const schemeTasks=CATALOG.schemeExercises.filter(x=>route.schemeIds.includes(x.schemeId));
    for(let i=0;i<count;i++){
      if(grammatical.length){const q=grammatical[i%grammatical.length];push({type:'input',skill:'grammar',contentId:q.record.id,prompt:q.value.q,expected:q.value.a,alternatives:q.value.alt||[],explanation:q.value.why});}
      else if(schemeTasks.length){const q=schemeTasks[i%schemeTasks.length],value=DB.schemes[q.legacyScheme].quiz[q.legacyIndex];push({type:'input',skill:'grammar',contentId:q.id,prompt:value[0],expected:value[1],explanation:'Эталон сохранён в речевой схеме. Другие естественные фразы требуют самостоятельной проверки.'});}
      else {
        const refs=route.tableIds.map(id=>ContentIndex.get(id)).filter(t=>tableIsConjugation(t.value));
        if(refs.length){const t=refs[i%refs.length],row=t.value[2][i%t.value[2].length];push({type:'input',skill:'grammar',contentId:t.record.id,prompt:t.value[0]+' · '+row[0]+' · '+t.value[1][1],expected:String(row[1]),explanation:'Форма из сохранённой таблицы: '+t.value[0]});}
        else if(i===0)push({type:'gap',skill:'grammar',contentId:route.id,prompt:'Для темы ещё нет проверяемого письменного задания. Оно отмечено в составе недостающего содержания.'});
      }
    }
    const examples=route.schemeIds.flatMap(id=>ContentIndex.get(id).value.examples.map((x,i)=>({id,position:i,es:x[0],ru:x[1]})));
    for(const [i,type] of ['reading','listening'].entries()){
      if(examples.length){const x=examples[(selected.day-1+i)%examples.length];push({type,skill:type,contentId:x.id,sourceItem:'examples/'+x.position,text:x.es,meaning:x.ru,options:choices(x.ru,id+type)});}
      else push({type:'gap',skill:type,contentId:route.id,prompt:'Для этой темы ещё нет проверенного текста с ключами. Пробел виден в плане; другие темы не подставляются автоматически.'});
    }
    push({type:'writing',skill:'writing',contentId:route.id,prompt:'Запишите 2–3 собственные фразы: '+route.goal+'. Используйте доступную конструкцию и проверьте смысл и формы.'});
    push({type:'speaking',skill:'speaking',contentId:route.id,prompt:'Скажите вслух несколько фраз по цели: '+route.goal+'. Сначала без чтения готового примера, затем оцените себя.'});
    return {schema:1,id,mode,title:(mode==='diagnostic'?'Проверка основы: ':'')+route.title,routeId:route.id,dayId:day.id,minutes:selected.minutes,startedAt:Date.now(),step:0,tasks,results:{},drafts:{},playback:{},attempts:{}};
  }
  function start(mode='lesson'){
    if(!active()){store().active=create(mode);store().lastSummary=null;save();}
    visible=true;legacyView=false;navTo('practice');
  }
  function diagnostic(){
    if(active()){visible=true;legacyView=false;navTo('practice');alert('Сначала завершите или продолжите сохранённое занятие. Его ответы не удалены.');return;}
    start('diagnostic');
  }
  function leave(){flushDraft();visible=false;legacyView=true;}
  function flushDraft(){clearTimeout(draftTimer);if(active())save();}
  function append(result){
    const a=active(),t=current();if(!a||!t||a.results[t.id])return;
    const attempt=a.attempts[t.id]||0;
    const event={id:a.id+':'+a.step+':'+attempt,sessionId:a.id,taskId:t.id,contentId:t.contentId,sourceItem:t.sourceItem||null,skill:result.skill||t.skill,at:Date.now(),performed:t.type!=='gap',...result};
    a.results[t.id]=event;store().events.push(event);
    if(t.skill==='vocabulary'&&t.wordIndex!==undefined&&!result.hintUsed){
      const w=DB.vocab[t.wordIndex],key=mi11RecallId(w),old=state.miRecall11?.[key]||{},steps=result.ok?Math.min((old.steps||0)+1,5):0;
      state.miRecall11=state.miRecall11||{};state.miRecall11[key]={steps,next:Date.now()+(result.ok?[0,1,3,7,14,30][steps]*86400000:60000),last:Date.now(),attempts:(old.attempts||0)+1,correct:(old.correct||0)+(result.ok?1:0)};
    }
    save();render();
  }
  function checkInput(){
    const a=active(),t=current(),value=$('journey-answer')?.value.trim();if(!a||!t||!value)return;
    const ok=[t.expected,...(t.alternatives||[])].some(x=>norm(x)===norm(value));
    append({ok,hintUsed:!!a.drafts[t.id]?.hint,answer:value,selfAssessed:false});
  }
  function choose(index){
    const a=active(),t=current();if(!a||!t||!['reading','listening'].includes(t.type)||!Number.isInteger(index)||index<0||index>=t.options.length)return;
    const fallback=!!a.drafts[t.id]?.transcript;
    if(t.type==='listening'&&!a.playback[t.id]&&!fallback)return;
    append({ok:t.options[index]===t.meaning,answer:t.options[index],selfAssessed:false,skill:t.type==='listening'&&fallback?'reading':t.skill,transcriptUsed:fallback,audioEnded:!!a.playback[t.id]});
  }
  function selfCheck(){
    const a=active(),t=current();if(!a||!t)return;
    const text=$('journey-answer')?.value.trim()||'',checks=[...document.querySelectorAll('[name=journey-rubric]:checked')].map(x=>Number(x.value));
    if(t.type==='writing'&&!text){$('journey-message').textContent='Сначала запишите свои фразы.';return;}
    if(t.type==='speaking'&&!checks.length){$('journey-message').textContent='Сначала выполните устную задачу и отметьте хотя бы один критерий.';return;}
    append({ok:null,selfAssessed:true,answer:text,rubric:checks,message:'Сохранена самостоятельная работа. Свободная речь и правильность текста автоматически не оцениваются.'});
  }
  function next(){
    const a=active(),t=current();if(!a||!t)return;
    if(t.type==='gap'&&!a.results[t.id])append({ok:null,selfAssessed:false,performed:false,message:'Контент отсутствует; результат навыка не начислен.'});
    if(!a.results[t.id])return;
    flushDraft();a.step++;
    if(a.step>=a.tasks.length){
      const events=store().events.filter(e=>e.sessionId===a.id),gaps=a.tasks.filter(t=>t.type==='gap').length;
      const summary={id:a.id,title:a.title,mode:a.mode,completedAt:Date.now(),performed:events.filter(e=>e.performed).length,correct:events.filter(e=>e.ok===true&&!e.hintUsed).length,checked:events.filter(e=>typeof e.ok==='boolean'&&!e.hintUsed).length,gaps,selfAssessed:events.filter(e=>e.selfAssessed).length};
      store().completedSessions[a.id]=summary;store().lastSummary=summary;
      if(a.mode==='lesson'&&!gaps)store().completedDays[a.dayId]={at:Date.now(),sessionId:a.id};
      store().active=null;
    }
    save();render();window.scrollTo(0,0);
  }
  function hint(){
    const a=active(),t=current();if(!a||!t)return;
    a.drafts[t.id]={...(a.drafts[t.id]||{}),hint:true};save();render();
  }
  function transcript(){
    const a=active(),t=current();if(!a||!t)return;
    a.drafts[t.id]={...(a.drafts[t.id]||{}),transcript:true};save();render();
  }
  function html(){
    const a=active();
    if(!a){const s=store().lastSummary;return '<h2>Практика</h2><section class="panel">'+(s?'<h3>Занятие завершено</h3><p>'+esc(s.title)+'</p><p>Самостоятельных верных ответов: '+s.correct+' из '+s.checked+'. Самопроверок: '+s.selfAssessed+'.</p>'+(s.gaps?'<p class="warning">Пропусков содержания: '+s.gaps+'. День не отмечен как полноценно завершённый.</p>':'<p>Пройден запланированный цикл. Это не подтверждение уровня CEFR.</p>'):'<p>Выберите занятие в разделе «Сегодня».</p>')+'<button type="button" data-journey-home>К плану</button></section>';}
    const t=current(),r=a.results[t.id],draft=a.drafts[t.id]||{},heard=!!a.playback[t.id];
    let body='';
    if(t.type==='input'){
      body='<h3>Вспомните без подсказки</h3><p class="journey-prompt">'+esc(t.prompt)+'</p><label for="journey-answer">Ответ по-испански</label><input id="journey-answer" class="field" autocomplete="off" autocapitalize="off" spellcheck="false" value="'+esc(draft.text||'')+'" '+(r?'disabled':'')+'><div class="row">'+
      'áéíóúüñ¿¡'.split('').map(c=>'<button type="button" data-accent="'+c+'" data-input="journey-answer">'+c+'</button>').join('')+'</div>'+
      '<div class="row"><button type="button" class="primary" data-journey-check '+(r?'disabled':'')+'>Проверить</button><button type="button" data-journey-hint '+(a.mode==='diagnostic'||r?'disabled':'')+'>Подсказка</button></div>'+
      (draft.hint?'<p class="warning">Ответ открыт: '+esc(t.expected)+'. Самостоятельное вспоминание не будет засчитано.</p>':'')+
      (r?'<div class="answer" role="status"><b>'+(r.ok?(r.hintUsed?'Совпало после подсказки':'Верно!'):'Сравните с эталоном')+'</b><p lang="es">'+esc(t.expected)+'</p><p>'+esc(t.explanation||'')+'</p>'+SchemeUIAudio(t.expected)+'</div>':'');
    }
    if(t.type==='reading'||t.type==='listening'){
      body='<h3>'+(t.type==='reading'?'Прочитайте и поймите':'Послушайте без текста')+'</h3>'+
      (t.type==='reading'||draft.transcript?'<p class="journey-prompt" lang="es">'+esc(t.text)+'</p>':'')+
      (t.type==='listening'?'<button type="button" data-speech="'+esc(t.text)+'">🔊 Слушать</button><p class="muted">'+(heard?'Воспроизведение завершено. Выберите смысл.':'Выбор ответа откроется после завершения озвучки или перехода к тексту.')+'</p><button type="button" data-journey-transcript>Перейти к чтению</button>':'')+
      (draft.transcript?'<p class="warning">Текст открыт. Результат учитывается как чтение.</p>':'')+'<p>Какой смысл передаёт фраза?</p><div class="journey-choices">'+t.options.map((x,i)=>'<button type="button" data-journey-choice="'+i+'" '+(r||(t.type==='listening'&&!heard&&!draft.transcript)?'disabled':'')+'>'+esc(x)+'</button>').join('')+'</div>'+
      (r?'<div class="answer" role="status">'+(r.ok?'Верно.':'Эталон: '+esc(t.meaning))+'</div>':'');
    }
    if(t.type==='writing'||t.type==='speaking'){
      const rubric=t.type==='writing'?['Проверил(а) формы и ударения','Передал(а) нужный смысл','Добавил(а) собственную деталь']:['Произнёс/произнесла свои фразы вслух','Сначала говорил(а) без чтения образца','Смог(ла) передать нужный смысл'];
      body='<h3>'+(t.type==='writing'?'Свои фразы':'Теперь скажите вслух')+'</h3><p>'+esc(t.prompt)+'</p><label for="journey-answer">'+(t.type==='writing'?'Ваш текст':'Заметка после устной практики — необязательно')+'</label><textarea id="journey-answer" class="field" rows="4" lang="es" '+(r?'disabled':'')+'>'+esc(draft.text||'')+'</textarea>'+
      rubric.map((x,i)=>'<label class="journey-rubric"><input name="journey-rubric" type="checkbox" value="'+i+'" '+((draft.checks||[]).includes(i)?'checked':'')+' '+(r?'disabled':'')+'> '+esc(x)+'</label>').join('')+
      '<p class="muted">Это самопроверка. Приложение не выставляет объективную оценку произношения или свободного текста.</p><button type="button" class="primary" data-journey-self '+(r?'disabled':'')+'>Сохранить выполненную работу</button><p id="journey-message" role="status">'+(r?esc(r.message):'')+'</p>';
    }
    if(t.type==='gap')body='<h3>Пробел учебного содержания</h3><p>'+esc(t.prompt)+'</p><p class="muted">Этот шаг не начисляет результат навыка. Технический план не заменяет готовый урок.</p>';
    return '<h2>Практика</h2><section class="panel"><div class="row between"><b>'+esc(a.title)+'</b><span class="pill">'+(a.step+1)+' / '+a.tasks.length+'</span></div><p class="muted">План: около '+a.minutes+' минут · место и ответы сохраняются</p><progress max="'+a.tasks.length+'" value="'+a.step+'" aria-label="Ход занятия"></progress>'+body+
      '<div class="row journey-footer"><button type="button" data-journey-next '+(!r&&t.type!=='gap'?'disabled':'')+'>'+(a.step===a.tasks.length-1?'Завершить занятие':'Дальше →')+'</button><button type="button" data-journey-home>Вернуться к плану</button></div></section>';
  }
  function SchemeUIAudio(text){return '<button type="button" data-speech="'+esc(text)+'">🔊 Эталон</button>';}
  function draftInput(){
    const a=active(),t=current();if(!a||!t||a.results[t.id])return;
    a.drafts[t.id]={...(a.drafts[t.id]||{}),text:$('journey-answer')?.value||'',checks:[...document.querySelectorAll('[name=journey-rubric]:checked')].map(x=>Number(x.value))};
    clearTimeout(draftTimer);draftTimer=setTimeout(()=>save(),250);
  }
  AudioService.subscribe(event=>{
    const a=active(),t=current();if(!visible||!a||t?.type!=='listening'||event.text!==t.text)return;
    if(event.type==='ended'){a.playback[t.id]={endedAt:Date.now()};save();render();}
  });
  const oldPractice=practiceHTML;
  practiceHTML=function(){return visible||(!legacyView&&active())?html():oldPractice();};
  document.addEventListener('click',e=>{
    const b=e.target.closest('button');if(!b)return;
    if(b.hasAttribute('data-journey-start'))start();
    if(b.hasAttribute('data-journey-diagnostic'))diagnostic();
    if(b.hasAttribute('data-journey-home')){flushDraft();visible=false;navTo('today');}
    if(b.hasAttribute('data-journey-check'))checkInput();
    if(b.hasAttribute('data-journey-hint'))hint();
    if(b.hasAttribute('data-journey-next'))next();
    if(b.hasAttribute('data-journey-self'))selfCheck();
    if(b.hasAttribute('data-journey-transcript'))transcript();
    if(b.hasAttribute('data-journey-choice'))choose(Number(b.dataset.journeyChoice));
  });
  document.addEventListener('input',e=>{if(e.target.id==='journey-answer')draftInput();});
  document.addEventListener('change',e=>{if(e.target.name==='journey-rubric')draftInput();});
  document.addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target.id==='journey-answer'&&e.target.tagName==='INPUT'){e.preventDefault();checkInput();}});
  document.addEventListener('mi-progress-imported',()=>{clearTimeout(draftTimer);legacyView=false;visible=!!active();});
  window.addEventListener('pagehide',()=>{if(active())flushDraft();});
  return {start,diagnostic,leave,active,current,render:html,checkInput,next};
})();
