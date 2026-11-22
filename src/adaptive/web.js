/* R7 optional web study cockpit; no rewriting R6 views or session state. */
(function () {
  'use strict';
  if (typeof document === 'undefined' || typeof MiAdaptiveCore === 'undefined' ||
      typeof MiAdaptiveBridge === 'undefined' || typeof StateStore === 'undefined') return;
  const core=MiAdaptiveCore,bridge=MiAdaptiveBridge;
  const dateLocal=()=>{
    const now=new Date(),x=new Date(now.getTime()-now.getTimezoneOffset()*60000);
    return x.toISOString().slice(0,10);
  };
  const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const mount=document.createElement('aside');
  mount.id='mi-r7';mount.style.cssText='position:fixed;z-index:9999;right:12px;bottom:12px;max-width:min(420px,calc(100vw - 24px));font:15px system-ui,sans-serif;color:#18293c';
  // Imported data can be malformed: never overwrite them to "repair" automatically.
  let opened=false,notice='';
  const skillNames={vocabulary:'Слова',grammar:'Грамматика',reading:'Чтение',listening:'Аудирование',writing:'Письмо',speaking:'Разговор'};
  function snapshot() {return StateStore.loadProgress();}
  function persist(next) {StateStore.saveProgress(next); state=StateStore.loadProgress();}
  function render() {
    const day=dateLocal();
    if(!opened){mount.innerHTML='<button type="button" data-r7-toggle style="padding:13px 18px;border-radius:30px;background:#173b63;color:white;border:0;box-shadow:0 3px 16px #0003">📚 Мой день · R7</button>';return;}
    try {
      const progress=snapshot(),a=bridge.read(progress);
      const due=bridge.dueFromReviews(progress,day);
      const lessons=typeof LESSON_DATA!=='undefined'?LESSON_DATA:[];
      const nextLesson=lessons.find(l=>!progress.miJourney3?.lessonReviews?.[l.id]?.cycleCompletedAt)?.id||null;
      const plan=core.dailyPlan({day,availableMinutes:a.availableMinutes,due,nextLessonId:nextLesson});
      const report=core.weekSummary(a.events,day);
      const calendar=core.activityCalendar(a.events,day,28);
      const evidence=core.skillEvidence(a.events,day);
      const todayDue=Object.entries(progress.miJourney3?.taskReviews||{}).filter(([id,r])=>r&&typeof r.next==='number'&&r.next<=Date.now()&&(r.needsWork||r.steps>=0)).length;
      const rows=plan.assignments.map(x=>'<li>'+escape(x.id)+(x.kind==='review'?' · повторение':' · новый урок')+' ~'+x.estimatedMinutes+' мин</li>').join('');
      const lessonReviewButtons=(typeof LESSON_DATA!=='undefined'&&typeof LessonAssessment!=='undefined')
        ?LESSON_DATA.map(l=>({id:l.id,title:l.title,pending:LessonAssessment.candidates(l).length}))
          .filter(l=>l.pending>0).map(l=>'<button type="button" data-r7-lesson="'+escape(l.id)+'" style="display:block;width:100%;text-align:left;margin:6px 0;padding:9px;border-radius:9px;border:1px solid #bcd0e5;background:#eef5fc;color:#163a60">'+escape(l.title)+' · '+l.pending+' заданий</button>').join('')
        :'';

      mount.innerHTML='<div role="region" aria-label="Mi Español R7" style="background:#fff;border:1px solid #cbd5e1;border-radius:17px;box-shadow:0 10px 35px #0004;padding:16px;max-height:80vh;overflow:auto">'+
        '<div style="display:flex;justify-content:space-between;align-items:center;gap:12px"><b>Mi Español · Мой день</b><button type="button" data-r7-toggle aria-label="Закрыть">✕</button></div>'+
        '<p style="font-size:12px">R7 — экспериментальный адаптивный экран. Прежние уроки и результаты не изменяются.</p>'+
        '<label>Доступное время, минут <input aria-label="Доступные минуты" data-r7-minutes type="number" min="0" max="180" step="1" value="'+a.availableMinutes+'" style="max-width:75px"></label> <button type="button" data-r7-save-minutes>Сохранить</button>'+
        '<h3>Повторения на '+day+'</h3>'+(rows?'<ul>'+rows+'</ul>':'<p>Срок повторения уроков не наступил или данных ещё нет.</p>')+
        '<p>Отложенные повторения: '+plan.deferredReviews+'. Ничего не списывается за пропуск. Заданий для адресного повтора: '+todayDue+'.</p>'+
        (plan.assignments.some(x=>x.kind==='lesson')?'<button type="button" data-r7-new-lesson="'+escape(nextLesson)+'">Продолжить новый урок</button>':'')+ 
        (lessonReviewButtons?'<h3>Повторить конкретные задания</h3>'+lessonReviewButtons:'')+
        (todayDue?'<button type="button" data-r7-go-reviews>Посмотреть все результаты и ошибки</button>':'')+
        '<h3>Фактические занятия за 7 дней</h3>'+
        '<p>'+report.minutes+' мин · '+report.activeDays+' дней · '+report.wordsPracticed+' слов в практике · '+report.correct+'/'+report.attempted+' объективно проверенных ответов</p>'+
        '<p style="font-size:12px">Это статистика только новых записей R7, а не всех исторических занятий.</p>'+
        '<h3>Последние 28 дней</h3><div role="list" aria-label="Календарь занятий" style="display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:4px">'+calendar.map(x=>'<span role="listitem" title="'+escape(x.day)+' · '+x.minutes+' мин" aria-label="'+escape(x.day)+' · '+x.minutes+' минут" style="background:'+(x.minutes>0?'#d6eafc':'#f1f5f9')+';border:1px solid #cbd5e1;border-radius:7px;padding:6px 2px;text-align:center;font-size:11px">'+x.day.slice(8)+'</span>').join('')+'</div>'+ 
        '<h3>Навыки · последние 28 дней</h3>'+evidence.map(x=>'<div style="display:flex;justify-content:space-between;gap:8px;padding:4px 0"><span>'+escape(skillNames[x.id])+'</span><span>'+x.attempted+' проверок · '+x.minutes+' мин'+(x.recommendation==='repeat_errors'?' · повторить ошибки':'')+'</span></div>').join('')+
        '<h3>Оригинальная библиотека</h3><p>Все 16 исходных листов грамматики остаются без изменений и доступны в полноразмерной веб-библиотеке.</p><button type="button" data-r7-originals style="padding:10px;border:1px solid #cbd5e1;border-radius:9px;background:#e7f0f9;color:#173b63">Открыть оригиналы грамматики</button>'+ 
        '<h3>Записать реальное занятие</h3><form data-r7-form>'+
        '<label>Навык <select name="skill"><option value="vocabulary">Слова</option><option value="grammar">Грамматика</option><option value="reading">Чтение</option><option value="listening">Аудирование</option><option value="writing">Письмо</option><option value="speaking">Разговор</option></select></label>'+
        '<label> Минут <input name="minutes" type="number" min="0" max="180" step="1" value="10" required style="max-width:65px"></label>'+
        '<label> Слов в практике <input name="words" type="number" min="0" max="500" step="1" value="0" required style="max-width:65px"></label>'+
        '<p><button type="submit">Записать фактический результат</button></p></form>'+
        (notice?'<p role="status">'+escape(notice)+'</p>':'')+
        '<button type="button" data-r7-toggle>Вернуться к обучению</button></div>';
    }catch(err){
      mount.innerHTML='<div style="background:#fff;padding:16px;border:2px solid #b91c1c;border-radius:12px" role="alert">R7 не может прочитать данные: '+escape(err.message)+'. Прежний прогресс не изменён. <button data-r7-toggle>Закрыть</button></div>';
    }
  }
  document.body.appendChild(mount);
  mount.addEventListener('click',e=>{
    const b=e.target.closest('button');if(!b)return;
    if(b.hasAttribute('data-r7-toggle')){opened=!opened;notice='';render();return;}
    if(b.hasAttribute('data-r7-originals')){opened=false;render();if(typeof setLib==='function')setLib('originals');else notice='Оригиналы доступны в разделе Библиотека';return;}
    if(b.dataset.r7NewLesson&&typeof LessonUI!=='undefined'){opened=false;render();LessonUI.show(b.dataset.r7NewLesson);return;}
    if(b.dataset.r7Lesson&&typeof LessonUI!=='undefined') {opened=false;render();LessonUI.start(b.dataset.r7Lesson,true);return;}
    if(b.hasAttribute('data-r7-go-reviews')) {opened=false;render();if(typeof navTo==='function')navTo('progress');return;}
    if(b.hasAttribute('data-r7-save-minutes')) {
      try {const n=Number(mount.querySelector('[data-r7-minutes]').value);
        if(!Number.isInteger(n))throw Error('Укажите целое количество минут');
        persist(bridge.setMinutes(snapshot(),n));notice='План обновлён';}
      catch(err){notice=err.message;}render();
    }
  });
  mount.addEventListener('submit',e=>{
    if(!e.target.matches('[data-r7-form]'))return;e.preventDefault();
    try{
      const form=new FormData(e.target),minutes=Number(form.get('minutes')),words=Number(form.get('words'));
      if(!Number.isInteger(minutes)||minutes<0||minutes>180||!Number.isInteger(words)||words<0||words>500)throw Error('Проверьте минуты и количество слов');
      const id='r7-'+(globalThis.crypto?.randomUUID?.()||Date.now()+'-'+Math.random().toString(36).slice(2));
      const event={id,day:dateLocal(),skill:form.get('skill'),minutes,words,attempted:0,correct:0,objective:false};
      persist(bridge.add(snapshot(),event,core));notice='Занятие записано; знания не начислены без проверки';}
    catch(err){notice=err.message;}render();
  });
  document.addEventListener('mi-progress-imported',()=>{if(opened)render();});
  render();
})();
