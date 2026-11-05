/* R3: explicit source-preserving registry and normative route map. */
const ContentIndex = (() => {
  const map=new Map();
  for(const kind of ['words','exercises','schemes','tables','images','schemeExercises'])
    for(const record of CATALOG[kind])map.set(record.id,{kind,record});
  function get(id){
    const item=map.get(id);if(!item)throw Error('Неизвестный учебный ID');
    const r=item.record;
    const value=({words:()=>DB.vocab[r.legacyIndex],exercises:()=>DB.quiz[r.legacyIndex],schemes:()=>DB.schemes[r.legacyIndex],tables:()=>DB.atlas[r.section][1][r.table],images:()=>DB.images[r.legacyIndex],schemeExercises:()=>DB.schemes[r.legacyScheme].quiz[r.legacyIndex]})[item.kind]();
    return {...item,value};
  }
  function open(id) {
    const item=get(id),r=item.record;
    if(typeof Journey!=='undefined')Journey.leave();
    if(item.kind==='tables'){section=r.section;table=r.table;studyHide=false;setLib('tables');}
    if(item.kind==='schemes'){schemeIndex=r.legacyIndex;setLib('schemes');}
    if(item.kind==='exercises'){quizIndex=r.legacyIndex;quizShown=false;navTo('practice');}
    if(item.kind==='images'){srcGroup=item.value.group;srcIndex=DB.images.filter(x=>x.group===srcGroup).findIndex(x=>x.id===item.value.id);setLib('originals');}
  }
  return {get,open};
})();
const RouteUI = (() => {
  const legacyToNew=[1,3,5,6,2,7,10,9,10,11,11,12];
  function selection(){
    const old=state.miRoute3||{};
    return {week:Number.isInteger(old.week)&&old.week>=1&&old.week<=12?old.week:(legacyToNew[state.week-1]||1),day:Number.isInteger(old.day)&&old.day>=1&&old.day<=7?old.day:1,minutes:[10,20,30].includes(old.minutes)?old.minutes:20};
  }
  function route(){return ROUTE_DATA.routes[selection().week-1];}
  function set(key,value){
    const limits={week:[1,12],day:[1,7],minutes:[10,30]};
    if(!limits[key]||!Number.isInteger(value)||value<limits[key][0]||value>limits[key][1]||(key==='minutes'&&![10,20,30].includes(value)))return;
    state.miRoute3={...selection(),[key]:value,schema:1,legacyWeek:state.miRoute3?.legacyWeek||state.week};
    save();render();
  }
  function options(){return ROUTE_DATA.routes.map(r=>'<option value="'+r.week+'" '+(selection().week===r.week?'selected':'')+'>'+r.week+'. '+esc(r.title)+'</option>').join('');}
  function materials(r){
    return '<div class="row">'+r.tableIds.map(id=>{const t=ContentIndex.get(id);return '<button type="button" data-open-content="'+id+'">'+esc(t.value[0])+'</button>';}).join('')+
      r.schemeIds.map(id=>'<button type="button" data-open-content="'+id+'">'+esc(ContentIndex.get(id).value.name)+'</button>').join('')+'</div>';
  }
  function today(){
    const s=selection(),r=route(),day=r.dayPlans[s.day-1],active=state.miJourney3?.active;
    return '<h2>Сегодня</h2><section class="panel"><label for="route-week">12-недельный маршрут</label><select id="route-week" class="field">'+options()+'</select><div class="row between"><h3>'+esc(r.title)+'</h3><span class="pill">'+esc(r.level)+'</span></div><p>'+esc(r.goal)+'</p>'+
    '<div class="row"><label>День <select id="route-day">'+r.dayPlans.map(d=>'<option value="'+d.day+'" '+(d.day===s.day?'selected':'')+'>'+d.day+'. '+esc(d.focus)+'</option>').join('')+'</select></label><label>Время <select id="route-minutes">'+[10,20,30].map(m=>'<option value="'+m+'" '+(m===s.minutes?'selected':'')+'>'+m+' минут</option>').join('')+'</select></label></div><p>'+esc(day.goal)+'</p><div class="row"><button class="primary" type="button" data-journey-start>'+(active?'Продолжить занятие':'Начать занятие')+'</button><button type="button" data-journey-diagnostic>Проверить основу</button></div>'+
    (active?'<p class="muted">Есть незавершённое занятие: '+esc(active.title)+'. Его ответы и место сохранены.</p>':'')+
    '<details><summary>Материалы и полнота темы</summary>'+materials(r)+'<p>Письменных заданий в архиве для этой темы: '+r.exerciseIds.length+'.</p><ul>'+r.contentGaps.map(g=>'<li>'+esc(g)+'</li>').join('')+'</ul><p class="muted">Это связанный технический маршрут на сохранённых материалах, а не принятый полный курс A1–B2.</p></details></section>'+
    '<section class="panel"><h3>Практика из ваших конспектов</h3><p>Формы, примеры и '+CATALOG.schemeExercises.length+' сохранённых заданий речевых схем теперь доступны с озвучкой и самостоятельным вводом.</p><button type="button" data-open-content="'+CATALOG.schemes[2].id+'">TENER: формы и примеры</button></section>'+
    '<section class="panel"><h3>Быстрые переходы</h3><div class="row"><button onclick="navTo(\'words\');showWordCard()">Слова и повторение</button><button onclick="setLib(\'tables\')">Грамматика</button><button onclick="setLib(\'originals\')">Оригиналы</button><button onclick="setLib(\'visual\')">Визуальные сцены</button></div></section>';
  }
  function progress(){
    const events=state.miJourney3?.events||[],skills=[['vocabulary','Слова'],['grammar','Грамматика'],['reading','Чтение'],['listening','Аудирование'],['writing','Письмо'],['speaking','Речь']];
    return '<section class="panel"><h3>Практика по навыкам</h3>'+skills.map(([id,label])=>{const e=events.filter(x=>x.skill===id&&x.performed);return '<div class="row between"><b>'+label+'</b><span>'+e.length+' выполненных действий'+(id==='speaking'||id==='writing'?' · самопроверка':'')+'</span></div>';}).join('')+'<p class="muted">Выполненное действие не означает владение уровнем CEFR. Просмотр материала не считается ответом.</p></section>'+
      '<section class="panel"><h3>Маршрут · 12 недель</h3>'+ROUTE_DATA.routes.map(r=>'<div class="week"><div class="row between"><b>Неделя '+r.week+' · '+esc(r.title)+'</b><span class="pill">'+esc(r.level)+'</span></div><p>'+esc(r.goal)+'</p><button type="button" data-route-week="'+r.week+'">Выбрать неделю</button><span class="muted"> Планов: 7 · завершено '+r.dayPlans.filter(d=>state.miJourney3?.completedDays?.[d.id]).length+'</span></div>').join('')+'</section>';
  }
  return {selection,route,set,today,progress,materials};
})();
todayHTML=RouteUI.today;
weeklySection=function(){const id=RouteUI.route().tableIds[0];return id?ContentIndex.get(id).record.section:null;};
weeklyQuizzes=function(){return RouteUI.route().exerciseIds.map(id=>ContentIndex.get(id).record.legacyIndex);};
startToday=function(){const id=RouteUI.route().tableIds[0];if(id)ContentIndex.open(id);else{navTo('today');alert('Для темы ещё нет подходящей цифровой таблицы. Доступные материалы перечислены в плане.');}};
startWeeklyQuiz=function(){const id=RouteUI.route().exerciseIds[0];if(id)ContentIndex.open(id);else startToday();};
const progressBeforeR3=progressHTML;
progressHTML=function(){return progressBeforeR3().replace(/<section class="panel"><h3>Маршрут · 12 недель<\/h3>[\s\S]*?<\/section>/,'')+RouteUI.progress();};
document.addEventListener('change',e=>{
  if(e.target.id==='route-week')RouteUI.set('week',Number(e.target.value));
  if(e.target.id==='route-day')RouteUI.set('day',Number(e.target.value));
  if(e.target.id==='route-minutes')RouteUI.set('minutes',Number(e.target.value));
});
document.addEventListener('click',e=>{
  const b=e.target.closest('button');if(!b)return;
  if(b.dataset.openContent)ContentIndex.open(b.dataset.openContent);
  if(b.dataset.routeWeek){RouteUI.set('week',Number(b.dataset.routeWeek));navTo('today');}
});
