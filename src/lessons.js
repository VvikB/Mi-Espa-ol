/* R6 content view on the existing Journey session, event journal, backup and SRS. */
const LessonUI=(()=>{
  let selected=LESSON_DATA[0]?.id,translation=false,lessonVisible=!!Journey.active()?.lessonId;
  const leaveBeforeLessons=Journey.leave;Journey.leave=function(){lessonVisible=false;leaveBeforeLessons();};
  const lesson=id=>LESSON_DATA.find(l=>l.id===id),store=()=>state.miJourney3||(state.miJourney3={schema:1,events:[],completedDays:{},completedSessions:{},active:null});
  const speech=(text,label='🔊 Слушать')=>'<button type="button" data-speech="'+esc(text)+'">'+label+'</button>';
  const norm=s=>normal(s).replace(/[¿¡!?.,;:]/g,'').replace(/\s+/g,' ').trim();
  function show(id){selected=id;translation=false;Journey.leave();view='library';libMode='lessons';render();window.scrollTo(0,0);}
  function card(i){Journey.leave();navTo('words');currentWord=i;reveal=false;updateWordCard();$('cardPanel')?.scrollIntoView();}
  function list(){return '<section class="panel"><button data-lesson-library>Грамматика и прежняя библиотека</button><h2>Уроки A1</h2><p>Новые авторские материалы R6. Независимая методическая приёмка ожидается. Внутри урока место и ответы сохраняются.</p>'+LESSON_DATA.map(l=>{const r=store().lessonReviews?.[l.id];return '<div class="lesson"><h3>'+esc(l.id+' · '+l.title)+'</h3><p>'+esc(l.objective)+'</p><p class="muted">'+(r?(r.assessmentVersion===2?'Проверка целей: '+r.controlCorrect+'/'+r.controlTotal:'Результат прежней редакции — нужна обновлённая проверка')+'. Повторение '+new Date(r.next).toLocaleDateString('ru-RU'):'Контроль ещё не пройден')+'</p><button type="button" data-lesson-show="'+l.id+'">Открыть урок</button></div>';}).join('')+'</section>';}
  function support(l){return (l.scaffolding||[]).map(g=>'<details><summary>'+esc(g.title)+'</summary><p>'+esc(g.note)+'</p>'+g.entries.map(([es,ru])=>'<p><b lang="es">'+esc(es)+'</b> — '+esc(ru)+'</p>').join('')+'</details>').join('');}
  function overview(l){if(!l)return '';return '<section class="panel"><button data-lesson-list>Все уроки</button><h2>'+esc(l.id+' · '+l.title)+'</h2><p><b>После практики:</b> '+esc(l.objective)+'</p><p><b>Нужно заранее:</b> '+esc(l.prerequisites)+'</p><p><b>Ситуация:</b> '+esc(l.situation)+'</p><p>Около '+esc(l.estimatedMinutes)+' минут. Это ориентир, не таймер.</p><p class="muted">Соотнесение с CEFR A1 предварительное, не сертификация.</p><button class="primary" data-lesson-start="'+l.id+'">Начать / продолжить</button><p>Материалы для сверки:</p>'+l.tableRefs.map(id=>'<button data-open-content="'+id+'">'+esc(ContentIndex.get(id).value[0])+'</button>').join('')+l.originalMaterials.map(id=>'<button data-review-source="'+esc(id)+'">Оригинал '+esc(id)+'</button>').join('')+LessonAssessment.queueHTML(l)+'</section>';}
  function start(id,reviewOnly=false){const l=lesson(id);if(!l)return;lessonVisible=true;if(Journey.active()){Journey.start();return;}
    const tasks=reviewOnly?LessonAssessment.candidates(l):l.tasks;if(!tasks.length)return;
    const sid='lesson-'+(crypto.randomUUID?.()||Date.now()+'-'+Math.random().toString(16).slice(2));
    store().active={schema:1,id:sid,mode:'content',lessonId:id,assessmentVersion:2,reviewOnly,title:(reviewOnly?'Работа над ошибками: ':'')+l.id+' · '+l.title,minutes:l.estimatedMinutes,startedAt:Date.now(),step:0,tasks:LessonAssessment.shuffle(StateStore.clean(tasks),sid),results:{},drafts:{},playback:{},attempts:{}};
    store().lastSummary=null;save();Journey.start('content');
  }
  function study(l,t){
    if(t.stage==='explanation')return '<p>'+esc(l.situation)+'</p>'+l.explanations.map(g=>'<h3>'+esc(g.title)+'</h3><p>'+esc(g.text)+'</p>'+(g.referenceText?'<details><summary>Подробнее — справка, не обязательное заучивание</summary><p>'+esc(g.referenceText)+'</p></details>':'')).join('')+support(l)+(l.alphabet?'<details><summary>Все 27 букв: название и звук в слове различаются</summary>'+l.alphabet.map(([a,n])=>'<div class="row between"><span>'+esc(a+' — '+n)+'</span>'+speech(n)+'</div>').join('')+'</details>':'')+'<h3>Типичные ошибки</h3>'+l.typicalErrors.map(([e,f])=>'<p><b>'+esc(e)+'</b>: '+esc(f)+'</p>').join('');
    if(t.stage==='dialogue')return '<h3>Диалог</h3><p>Сначала поймите ситуацию, затем прочитайте реплики по ролям. Готовые выражения можно использовать до разбора всей грамматики.</p><button data-lesson-translation>Показать / скрыть перевод</button>'+l.dialogue.turns.map(x=>'<div class="lesson"><b>'+esc(x.speaker)+'</b><p lang="es">'+esc(x.es)+'</p>'+speech(x.es)+(translation?'<p>'+esc(x.ru)+'</p>':'')+'</div>').join('');
    return '<h3>Слова в ситуации</h3>'+l.lexicon.map(w=>'<div class="lesson"><b lang="es">'+esc(w.es)+'</b> — '+esc(w.ru)+'<p>'+esc(w.note)+(w.requiredForProduction?' · основная опора':' · узнавание / справка')+'</p>'+speech(w.es)+'<button data-lesson-card="'+w.wordIndex+'">Карточка и повторение</button></div>').join('');
  }
  function lessonHTML(){const a=Journey.active(),t=Journey.current(),l=lesson(a?.lessonId);if(!a||!l)return '';
    const r=a.results[t.id],d=a.drafts[t.id]||{},heard=!!a.playback[t.id];let body='<p class="journey-prompt">'+esc(t.prompt)+'</p>'+(t.extension?'<p class="muted">Дополнительное задание: не обязательно для основного результата. Можно пропустить.</p>':'');
    if(!!t.stage)body=study(l,t)+'<p class="muted">Изучение экрана не начисляет знание. Оно проверяется последующими заданиями.</p>';
    if(['input','choice','reading','listening'].includes(t.type)){
      if(['reading','listening'].includes(t.type))body+=support(l);
      if(t.type==='reading'&&l.reading.support)body+='<details><summary>Слова для понимания текста</summary>'+l.reading.support.map(s=>'<p>'+esc(s)+'</p>').join('')+'</details>';
      if(t.type==='reading'||(t.type==='listening'&&d.transcript))body+='<p class="lesson" lang="es">'+esc(t.text)+'</p>';
      if(t.type==='listening')body+=speech(t.text)+'<p class="muted">'+(heard?'Озвучка завершена.':'Ответ доступен после завершения озвучки. Голос устройства, не запись диктора.')+'</p><button data-lesson-transcript>Нет звука / перейти к чтению</button>'+(d.transcript?'<p class="warning">Текст открыт: это чтение, аудирование не засчитывается.</p>':'');
      if(t.options?.length)body+='<div class="journey-choices">'+t.options.map((v,i)=>'<button data-lesson-choice="'+i+'" '+(r||(t.type==='listening'&&!heard&&!d.transcript)?'disabled':'')+'>'+esc(v)+'</button>').join('')+'</div>';
      else body+='<label for="journey-answer">Ответ по-испански</label><input class="field" id="journey-answer" lang="es" autocomplete="off" autocapitalize="off" spellcheck="false" value="'+esc(d.text||'')+'" '+(r?'disabled':'')+'><div class="row">'+'áéíóúüñ¿¡'.split('').map(c=>'<button data-accent="'+c+'" data-input="journey-answer">'+c+'</button>').join('')+'</div><button class="primary" data-lesson-check '+(r?'disabled':'')+'>Проверить</button>';
      if(!t.control)body+='<button data-lesson-hint '+(r?'disabled':'')+'>Подсказка</button>';
      if(d.hint)body+='<p class="warning">Эталон: '+esc(t.expected)+'. Ответ с подсказкой не считается самостоятельным.</p>';
      if(r)body+='<div class="answer" role="status"><b>'+(r.ok?(r.hintUsed?'Совпало после подсказки':'Верно'):'Сравните с эталоном')+'</b><p>'+esc(t.expected)+'</p><p>'+esc(t.explanation)+'</p>'+(t.explanationRefs||[]).map(id=>{const v=ContentIndex.get(id).value;return '<details><summary>Правило / основание ответа</summary><p>'+esc(v.text||v.title||'')+'</p></details>';}).join('')+'</div>';
    }
    if(t.type==='writing'||t.type==='speaking')body+='<label for="journey-answer">'+(t.type==='writing'?'Ваш текст':'Заметка после устной практики (необязательно)')+'</label><textarea id="journey-answer" class="field" lang="es" rows="5" '+(r?'disabled':'')+'>'+esc(d.text||'')+'</textarea>'+t.rubric.map((x,i)=>'<label class="journey-rubric"><input type="checkbox" name="journey-rubric" value="'+i+'" '+(d.checks?.includes(i)?'checked':'')+' '+(r?'disabled':'')+'> '+esc(x)+'</label>').join('')+'<p class="muted">Честная самооценка. Свободный текст и произношение автоматически не проверяются.</p><button data-lesson-self '+(r?'disabled':'')+'>Сохранить выполненную работу</button><p id="lesson-message" role="status">'+(r?'Самостоятельная работа сохранена; объективная языковая оценка не выставлялась.':'')+'</p>';
    return '<h2>'+esc(l.id+' · '+l.title)+'</h2><section class="panel"><p>Шаг '+(a.step+1)+' из '+a.tasks.length+(t.control?' · контроль без подсказки':'')+'</p><progress max="'+a.tasks.length+'" value="'+a.step+'"></progress>'+body+'<div class="row"><button class="primary" data-lesson-next '+(!r&&!t.stage&&!t.extension?'disabled':'')+'>'+(a.step===a.tasks.length-1?'Завершить цикл':(t.extension&&!r?'Пропустить дополнительное':'Дальше'))+'</button><button data-lesson-show="'+l.id+'">Вернуться к уроку</button></div></section>';
  }
  function answer(value){const a=Journey.active(),t=Journey.current();if(!a||a.results[t.id]||!value.trim()||(t.type==='listening'&&!a.playback[t.id]&&!a.drafts[t.id]?.transcript))return;
    const d=a.drafts[t.id]||{},fallback=t.type==='listening'&&!!d.transcript;
    Journey.append({ok:LessonAssessment.matches(t,value),hintUsed:!!d.hint,answer:value,selfAssessed:false,skill:fallback?'reading':t.skill,transcriptUsed:fallback,audioEnded:!!a.playback[t.id]});
    LessonAssessment.record(t,a.results[t.id],a.assessmentVersion||1);save();render();}
  function next(){const a=Journey.active(),t=Journey.current();if(!a||a.mode!=='content')return;
    if((t.stage||t.extension)&&!a.results[t.id])Journey.append({ok:null,performed:false,selfAssessed:false,skill:t.stage?'reading':t.skill});
    if(!a.results[t.id])return;
    const last=a.step===a.tasks.length-1;Journey.next();if(last){LessonAssessment.finish(lesson(a.lessonId),a);save();render();}
  }
  function self(){const a=Journey.active(),t=Journey.current(),text=$('journey-answer')?.value.trim()||'',checks=[...document.querySelectorAll('[name=journey-rubric]:checked')].map(x=>Number(x.value));if(!a||!t)return;
    if(checks.length!==t.rubric.length||(t.type==='writing'&&text.split(/\s+/).filter(Boolean).length<t.minimumWords)){if($('lesson-message'))$('lesson-message').textContent='Сначала выполните задачу и отметьте критерии. Для письма нужно не менее '+(t.minimumWords||1)+' слов; количество не оценивает качество.';return;}
    Journey.append({ok:null,selfAssessed:true,answer:text,rubric:checks,skill:t.skill});
  }
  const oldLibrary=libraryHTML;libraryHTML=function(){return libMode==='lessons'?'<button data-lesson-list>Уроки A1</button>'+overview(lesson(selected)):libMode==='lesson-list'?list():'<button data-lesson-list>Уроки A1</button>'+oldLibrary();};
  const oldToday=todayHTML;todayHTML=function(){const matching=LESSON_DATA.filter(l=>l.week===RouteUI.selection().week);return '<section class="panel"><h2>Содержательные уроки A1</h2><p>Ситуации, объяснения, диалоги и самостоятельная практика.</p><button class="primary" data-lesson-list>Открыть уроки A1</button>'+matching.map(l=>'<button data-lesson-show="'+l.id+'">К теме недели: '+esc(l.title)+'</button>').join('')+'</section>'+oldToday();};
  const oldPractice=practiceHTML;practiceHTML=function(){const a=Journey.active();if(a?.mode==='content'&&lessonVisible)return lessonHTML();const s=store().lastSummary;if(!a&&s?.lessonId&&lessonVisible)return '<section class="panel"><h2>'+(s.reviewOnly?'Работа над ошибками завершена':'Цикл урока завершён')+'</h2><p>'+esc(s.title)+'</p>'+(s.currentAssessment?'<p>Контроль по целям: '+s.controlCorrect+' из '+s.controlTotal+'. Понимание: '+s.comprehensionCorrect+' из '+s.comprehensionTotal+'.</p><p>'+(s.controlPassed?'Ограниченная проверка выполнена без помощи. Сохраняйте интервалы повторения.':'Есть непроверенные пункты или ошибки. Откройте работу над ошибками.')+'</p>':'<p>Сохранён результат прежней редакции. Для обновлённой проверки начните урок заново; старые ответы не удалены.</p>')+'<p class="muted">Письмо и речь — самооценка. Это не подтверждение уровня CEFR.</p>'+LessonAssessment.queueHTML(lesson(s.lessonId))+'<button data-lesson-list>К урокам</button>'+(LESSON_DATA.some(l=>l.id===lesson(s.lessonId)?.nextLesson)?'<button data-lesson-show="'+lesson(s.lessonId).nextLesson+'">Следующий урок</button>':'<p class="muted">Продолжение A1 ещё готовится.</p>')+'</section>';return oldPractice();};
  AudioService.subscribe(e=>{const a=Journey.active(),t=Journey.current();if(lessonVisible&&a?.mode==='content'&&t?.type==='listening'&&e.text===t.text&&e.type==='ended'){a.playback[t.id]={endedAt:Date.now()};save();render();}});
  document.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;
    if((b.hasAttribute('data-journey-start')||b.hasAttribute('data-journey-diagnostic'))&&Journey.active()?.mode==='content'){lessonVisible=true;render();}
    if(b.hasAttribute('data-lesson-library')){Journey.leave();setLib('tables');}
    if(b.hasAttribute('data-lesson-list')){Journey.leave();view='library';libMode='lesson-list';render();}
    if(b.dataset.lessonShow)show(b.dataset.lessonShow);
    if(b.dataset.lessonStart)start(b.dataset.lessonStart);
    if(b.dataset.lessonReview)start(b.dataset.lessonReview,true);
    if(b.dataset.lessonCard)card(Number(b.dataset.lessonCard));
    if(b.hasAttribute('data-lesson-translation')){translation=!translation;render();}
    if(b.hasAttribute('data-lesson-check'))answer($('journey-answer')?.value||'');
    if(b.hasAttribute('data-lesson-choice'))answer(Journey.current().options[Number(b.dataset.lessonChoice)]);
    if(b.hasAttribute('data-lesson-hint')){const a=Journey.active(),t=Journey.current();if(!t.control){a.drafts[t.id]={...a.drafts[t.id],hint:true};save();render();}}
    if(b.hasAttribute('data-lesson-transcript')){const a=Journey.active(),t=Journey.current();a.drafts[t.id]={...a.drafts[t.id],transcript:true};save();render();}
    if(b.hasAttribute('data-lesson-self'))self();
    if(b.hasAttribute('data-lesson-next'))next();
  });
  document.addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target.id==='journey-answer'&&e.target.tagName==='INPUT'&&lessonVisible&&Journey.active()?.mode==='content'){e.preventDefault();e.stopImmediatePropagation();answer(e.target.value);}},true);
  return {show,start,list,render:lessonHTML,answer,next,lesson};
})();
RELEASE_INFO.version='R6 · содержательная проверка и исправления';
RELEASE_INFO.changes.unshift('Добавлены авторские уроки A1; независимая содержательная приёмка ожидается.');

const indexBeforeLessons=ContentIndex.get,openBeforeLessons=ContentIndex.open;
ContentIndex.get=function(id){const l=LESSON_DATA.find(l=>l.id===id||[...l.explanations,...l.lexicon,l.dialogue,l.reading,l.listening,...l.dialogue.turns,...l.tasks,...(l.scaffolding||[]),...(l.finalListening?[l.finalListening]:[])].some(e=>e.id===id));if(!l)return indexBeforeLessons(id);const value=l.id===id?l:[...l.explanations,...l.lexicon,l.dialogue,l.reading,l.listening,...l.dialogue.turns,...l.tasks,...(l.scaffolding||[]),...(l.finalListening?[l.finalListening]:[])].find(e=>e.id===id);return {kind:l.id===id?'lessons':'lessonElements',record:[...CATALOG.lessons,...CATALOG.lessonElements].find(r=>r.id===id),value};};
ContentIndex.open=function(id){const item=ContentIndex.get(id);if(['lessons','lessonElements'].includes(item.kind))LessonUI.show(item.record.lessonId);else openBeforeLessons(id);};

RELEASE_INFO.known=RELEASE_INFO.known.map(s=>s.replace('R3/R4/R5','R3/R4/R5/R6'));

RELEASE_INFO.known.push('Пользователь подтвердил запуск и работу исходного R6. Исправленная содержательная версия ещё не прошла новую пользовательскую проверку; отдельная проверка голоса, хранения и iOS не заявляется.');
RELEASE_INFO.known=RELEASE_INFO.known.filter(s=>!s.includes('Физическая проверка R3/R4/R5/R6'));

const progressBeforeR6Quality=progressHTML;
progressHTML=function(){return progressBeforeR6Quality()+'<section class="panel"><h3>Уроки R6: результаты и ошибки</h3>'+LESSON_DATA.map(l=>{const r=state.miJourney3?.lessonReviews?.[l.id],pending=LessonAssessment.candidates(l).length;return '<div class="lesson"><b>'+esc(l.id+' · '+l.title)+'</b><p>'+(r?.assessmentVersion===2?'Контроль по целям: '+r.controlCorrect+'/'+r.controlTotal+'. Понимание: '+r.comprehensionCorrect+'/'+r.comprehensionTotal+'.':r?'Сохранён результат прежней редакции.':'Обновлённая проверка ещё не выполнена.')+'</p><p>Ошибок / назначенных повторов сейчас: '+pending+'</p><button data-lesson-show="'+l.id+'">Результаты и работа над ошибками</button></div>';}).join('')+'</section>';};
