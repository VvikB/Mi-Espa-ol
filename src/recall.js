/* Stage 11: separate active-recall lane, no fabricated Stage10 material. */
const MI11_RECALL_KEY='miRecall11';
let mi11RecallIndex=-1,mi11RecallRevealed=false,mi11RecallDirection='esru';
function mi11RecallRecords(){return Array.isArray(DB.vocab)?DB.vocab.filter(w=>w&&typeof w.es==='string'&&w.es.trim()&&typeof w.ru==='string'&&w.ru.trim()):[]}
function mi11RecallId(w){return 'term:'+encodeURIComponent(w.es.normalize('NFC').trim().toLocaleLowerCase('es'))+'|'+encodeURIComponent(w.ru.normalize('NFC').trim().toLocaleLowerCase('ru'))}
function mi11RecallStats(){let raw=state[MI11_RECALL_KEY];if(!raw||typeof raw!=='object'||Array.isArray(raw))return {};return raw}
function mi11RecallDue(){let now=Date.now(),s=mi11RecallStats();return mi11RecallRecords().map((w,i)=>({w,i,r:s[mi11RecallId(w)]})).filter(({r})=>!r||!Number.isFinite(r.next)||r.next<=now)}
function mi11RecallChoose(){
 let due=mi11RecallDue();
 if(!due.length){mi11RecallIndex=-1;mi11RecallRevealed=false;return}
 due.sort((a,b)=>(a.r?0:1)-(b.r?0:1)||(a.r?.next||0)-(b.r?.next||0)||a.i-b.i);
 mi11RecallIndex=due[0].i;mi11RecallRevealed=false;
}
function mi11RecallBegin(){mi11RecallDirection='esru';mi11RecallChoose();render()}
function mi11RecallReveal(){mi11RecallRevealed=true;render()}
function mi11RecallRate(ok){if(mi11RecallIndex<0||!mi11RecallRevealed)return;let records=mi11RecallRecords();if(!records[mi11RecallIndex])return;
 let all=mi11RecallStats(),key=mi11RecallId(records[mi11RecallIndex]),prev=all[key]||{},steps=Number.isInteger(prev.steps)&&prev.steps>=0?prev.steps:0,nextSteps=ok?Math.min(steps+1,5):0;
 let day=[0,1,3,7,14,30][nextSteps],now=Date.now();
 all[key]={steps:nextSteps,next:now+(ok?Math.max(1,day)*86400000:60000),last:now,attempts:(Number(prev.attempts)||0)+1,correct:(Number(prev.correct)||0)+(ok?1:0)};
 state[MI11_RECALL_KEY]=all;save();mi11RecallChoose();render();
}
function mi11RecallDirectionToggle(){mi11RecallDirection=mi11RecallDirection==='esru'?'rues':'esru';mi11RecallRevealed=false;render()}
function mi11RecallHTML(){let all=mi11RecallRecords(),due=mi11RecallDue(),s=mi11RecallStats(),studied=Object.keys(s).filter(k=>k.startsWith('term:')).length;
 let header=`<section class="panel mi11-recall"><h3>Активное вспоминание</h3><p class="muted">Отдельная тренировка по ${all.length} реально имеющимся словарным записям. Не заменяет утраченные материалы версии №10.</p><p>Изучено: ${studied} · К повторению: ${due.length}</p>`;
 if(mi11RecallIndex<0||!all[mi11RecallIndex])return header+`<button onclick="mi11RecallBegin()">${due.length?'Начать повторение':'Проверить очередь'}</button><p class="muted">${due.length?'Начните с самых ранних слов.':'Сейчас все карточки отложены до следующего повторения.'}</p></section>`;
 let w=all[mi11RecallIndex],prompt=mi11RecallDirection==='esru'?w.es:w.ru,answer=mi11RecallDirection==='esru'?w.ru:w.es;
 return header+`<p><button onclick="mi11RecallDirectionToggle()">${mi11RecallDirection==='esru'?'ES → RU':'RU → ES'} · сменить направление</button></p><div class="mi11-recall-card"><div class="mi11-recall-prompt">${esc(prompt)}</div>${mi11RecallRevealed?`<p class="mi11-recall-answer">${esc(answer)}</p><p class="muted">${esc(w.ex||'')}</p><button data-speech="${esc(w.es)}">Озвучить испанский</button>`:`<button class="primary" onclick="mi11RecallReveal()">Показать ответ</button>`}</div>${mi11RecallRevealed?`<p>Удалось вспомнить?</p><div class="mi11-recall-actions"><button onclick="mi11RecallRate(false)">Повторить позже</button><button class="primary" onclick="mi11RecallRate(true)">Вспомнил(а)</button></div>`:''}</section>`;
}
const mi11PreviousWordsHTML=wordsHTML;
wordsHTML=function(){let p=mi11PreviousWordsHTML();return p+mi11RecallHTML()};

