/* R3: restored rows/examples are read from DB; no new historical material is invented. */
const SchemeUI = (() => {
  const titles=['Ser','Estar','Tener','Ir','Preguntas','El tiempo','El lugar','Habilidades'];
  const positions=Object.create(null),feedback=Object.create(null);
  let sourceContext='';
  function rowSpeech(i,row) {
    if(i<4)return String(row[0]).split(' / ')[0]+' '+row[1];
    return String(row[0]).replace(/\s*\/\s*/g,', ');
  }
  function allSpeech(i) {
    const s=DB.schemes[i],rows=s.rows||s.forms||[];
    return [titles[i],...rows.map(r=>rowSpeech(i,r)),...(s.examples||[]).map(x=>Array.isArray(x)?x[0]:x)].filter(x=>!/[А-Яа-яЁё]/.test(x)).join('. ');
  }
  function task(i) {
    return CATALOG.schemeExercises.filter(x=>x.legacyScheme===i)[positions[i]||0]||null;
  }
  function normalize(value) {
    return normal(value).replace(/[¿¡!?.,;:]/g,'').replace(/\s+/g,' ').trim();
  }
  function audio(text,label='🔊',cls='') {
    return '<button type="button" class="'+cls+'" data-speech="'+esc(text)+'" aria-label="Произнести: '+esc(text)+'">'+esc(label)+'</button>';
  }
  function html(i) {
    const s=DB.schemes[i],rows=s.rows||s.forms||[],t=task(i),q=t?DB.schemes[i].quiz[t.legacyIndex]:null,f=t?feedback[t.id]:null;
    return '<section class="panel scheme-panel"><label for="scheme-choice">Речевая схема</label><select id="scheme-choice" class="field">'+
    DB.schemes.map((s,j)=>'<option value="'+j+'" '+(j===i?'selected':'')+'>'+esc(s.name)+'</option>').join('')+
    '</select><h3>'+esc(s.name)+'</h3><p>'+esc(s.rule)+'</p><div class="row">'+audio(allSpeech(i),'🔊 Слушать всю схему','primary')+
    '<button type="button" data-audio-stop>■ Стоп</button><button type="button" data-scheme-source="'+i+'">Открыть конспекты</button></div>'+
    '<p class="muted">Испанский озвучивается отдельно от перевода. Можно слушать каждую форму и пример.</p>'+
    '<div class="tablewrap"><table class="scheme-forms"><thead><tr><th>'+(i<4?'Лицо':'Испанский')+'</th><th>'+(i<4?'Форма':'Русский')+'</th><th>Звук</th></tr></thead><tbody>'+
    rows.map(r=>'<tr><td>'+esc(r[0])+'</td><td>'+esc(r[1])+'</td><td>'+audio(rowSpeech(i,r))+'</td></tr>').join('')+'</tbody></table></div>'+
    '<h3>Примеры</h3><div class="scheme-examples">'+(s.examples||[]).map(x=>{const es=Array.isArray(x)?x[0]:x,ru=Array.isArray(x)?x[1]:'';return '<div class="lesson"><div class="row between"><b lang="es">'+esc(es)+'</b>'+audio(es,'🔊 Слушать')+'</div><div class="muted">'+esc(ru)+'</div></div>';}).join('')+'</div>'+
    (q?'<section class="lesson scheme-practice"><h3>Вспомните без подсказки</h3><p>'+esc(q[0])+'</p><label for="scheme-answer">Воспроизведите испанскую фразу из схемы</label><input class="field" id="scheme-answer" lang="es" autocomplete="off" autocapitalize="off" spellcheck="false"><div class="row">'+
    'áéíóúüñ¿¡'.split('').map(c=>'<button type="button" data-accent="'+c+'" data-input="scheme-answer">'+c+'</button>').join('')+'</div><div class="row">'+
    '<button type="button" class="primary" data-scheme-check '+(f?.checked?'disabled':'')+'>Проверить</button><button type="button" data-scheme-hint>Подсказка</button><button type="button" data-scheme-next>Следующее задание</button></div>'+
    (f?'<div class="answer '+(f.ok&&!f.hint?'success':'')+'" role="status">'+esc(f.message)+'<p lang="es">'+esc(q[1])+'</p>'+audio(q[1],'🔊 Эталон')+'</div>':'')+
    '<p class="muted">Сверяем с эталоном схемы. Другие естественные формулировки могут быть верными; это тренировка конкретной фразы, а не оценка свободной речи. Акценты учитываются.</p></section>':'')+
    '<section class="lesson"><h3>Скажите о себе</h3><p>Произнесите три собственные фразы по конструкции, затем сохраните одну. Это самостоятельная речевая практика.</p><textarea id="schemeOwn" class="field" rows="3" lang="es" placeholder="Mi frase…">'+esc(state.session['scheme-'+i]||'')+'</textarea><button type="button" data-scheme-save>Сохранить мою фразу</button><div id="scheme-save-status" role="status"></div></section></section>';
  }
  function check() {
    const t=task(schemeIndex);if(!t||feedback[t.id]?.checked)return;
    const value=$('scheme-answer').value.trim();if(!value){$('scheme-answer').focus();return;}
    const expected=DB.schemes[schemeIndex].quiz[t.legacyIndex][1],hint=!!feedback[t.id]?.hint,ok=normalize(value)===normalize(expected);
    state.miSchemePractice=state.miSchemePractice||{};
    const previous=state.miSchemePractice[t.id]||{n:0,attempts:0,correct:0},n=ok&&!hint?Math.min(previous.n+1,5):0;
    state.miSchemePractice[t.id]={n,due:Date.now()+(ok&&!hint?[0,1,3,7,14,30][n]*86400000:60000),last:Date.now(),attempts:previous.attempts+1,correct:previous.correct+(ok&&!hint?1:0),lastCorrect:ok,hintUsed:hint,answer:value};
    feedback[t.id]={ok,hint,checked:true,message:ok?(hint?'Фраза совпадает после подсказки. Самостоятельное вспоминание не засчитано.':'Верно! Фраза вспомнилась без подсказки.'):'Сравните с эталоном. Проверьте форму и ударения.'};
    save();render();
  }
  function hint() {const t=task(schemeIndex);if(!t||feedback[t.id]?.checked)return;feedback[t.id]={hint:true,ok:false,message:'Эталон открыт. Попытка будет отмечена как выполненная с подсказкой.'};render();}
  function next() {positions[schemeIndex]=((positions[schemeIndex]||0)+1)%CATALOG.schemeExercises.filter(x=>x.legacyScheme===schemeIndex).length;const t=task(schemeIndex);if(t)delete feedback[t.id];render();}
  function sources(i) {sourceContext=DB.schemes[i].name;srcGroup='notes';srcIndex=0;setLib('originals');}
  function saveNote() {const value=$('schemeOwn').value.trim();if(!value){$('scheme-save-status').textContent='Сначала напишите свою фразу.';return;}state.session['scheme-'+schemeIndex]=value;$('scheme-save-status').textContent=save()?'Фраза сохранена.':'Фраза пока не сохранена в браузере.';}
  function sourceNotice(){return sourceContext&&srcGroup==='notes'?'<p class="warning">Связь схемы «'+esc(sourceContext)+'» с конкретной страницей ещё не подтверждена. Выберите страницу вручную; автоматической подстановки неверного источника нет.</p>':'';}
  return {render:html,allSpeech,rowSpeech,check,hint,next,sources,saveNote,sourceNotice};
})();
schemesHTML=function(){return SchemeUI.render(schemeIndex);};
const sourcesBeforeR3=sourcesHTML;
sourcesHTML=function(){return SchemeUI.sourceNotice()+sourcesBeforeR3();};
document.addEventListener('change',e=>{if(e.target.id==='scheme-choice'){schemeIndex=Number(e.target.value);render();}});
document.addEventListener('click',e=>{
  const b=e.target.closest('button');if(!b)return;
  if(b.hasAttribute('data-scheme-check'))SchemeUI.check();
  if(b.hasAttribute('data-scheme-hint'))SchemeUI.hint();
  if(b.hasAttribute('data-scheme-next'))SchemeUI.next();
  if(b.hasAttribute('data-scheme-save'))SchemeUI.saveNote();
  if(b.hasAttribute('data-scheme-source'))SchemeUI.sources(Number(b.dataset.schemeSource));
  if(b.hasAttribute('data-audio-stop'))AudioService.cancel();
  if(b.hasAttribute('data-accent')){const input=$(b.dataset.input);if(input){input.setRangeText(b.dataset.accent,input.selectionStart,input.selectionEnd,'end');input.dispatchEvent(new Event('input',{bubbles:true}));input.focus();}}
});
document.addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target.id==='scheme-answer'){e.preventDefault();SchemeUI.check();}});
