/* Integrated learning, versioned state, and source-safe interactive forms. */
const WEEK_TOPICS=[0,1,2,3,4,5,6,7,8,9,10,11];
const DAY_MS=86400000;
function weeklySection(){return WEEK_TOPICS[Math.max(0,Math.min(11,(state.week||1)-1))]||0}
function weeklyQuizzes(){let idx=weeklySection(),name=DB.atlas[idx][0].toLowerCase();let found=DB.quiz.map((q,i)=>({q,i})).filter(({q})=>{let txt=[q.q,q.why,q.topic||''].join(' ').toLowerCase();let tags=([['pronunciación','ударен','букв'],['артик','род','числ'],['прилаг','сравнен'],['притяж'],['местоимен'],['указател'],['вопрос','неопредел'],['отрицател','возврат'],['времен','прошед','presente','imperfecto'],['глагол','pretérito','subjuntivo'],['ir','tener','hacer','poder'],['condicional','futuro']][idx]||[]);return tags.some(t=>txt.includes(t))||txt.includes(name)});return found.length?found.map(x=>x.i):[]}
function startToday(){section=weeklySection();table=0;studyHide=false;setLib('tables')}
function startWeeklyQuiz(){let idxs=weeklyQuizzes();if(!idxs.length){startToday();return}quizIndex=idxs[0];quizShown=false;navTo('practice')}
function dueWordIndices(){let now=Date.now(),arr=[];for(let i=0;i<DB.vocab.length;i++){let v=state.vocab[String(i)];if(v&&Number(v.due)<=now)arr.push(i)}return arr}
function chooseWord(){let due=dueWordIndices();if(due.length)return due[Math.floor(Math.random()*due.length)];let notSeen=[];for(let i=0;i<DB.vocab.length;i++)if(!state.vocab[String(i)])notSeen.push(i);if(notSeen.length)return notSeen[Math.floor(Math.random()*notSeen.length)];let min=Infinity,idx=0;DB.vocab.forEach((w,i)=>{let d=Number(state.vocab[String(i)]?.due||0);if(d<min){min=d;idx=i}});return idx}
showWordCard=function(){currentWord=chooseWord();reveal=false;updateWordCard()};
const oldRateWord=rateWord;
rateWord=function(ok){let w=DB.vocab[currentWord];if(!w)return;oldRateWord(ok)};
const originalToday=todayHTML;
todayHTML=function(){let base=originalToday(),week=weeklySection(),n=weeklyQuizzes().length;return base.replace('onclick="navTo(\'practice\')">Начать практику','onclick="startWeeklyQuiz()">Начать занятие недели').replace('onclick="navTo(\'progress\')">Мой маршрут','onclick="startToday()">Грамматика недели').replace('<section class="panel"><h3>25 минут для испанского</h3>',`<section class="panel"><h3>Ваши материалы на этой неделе</h3><p><b>${esc(DB.atlas[week][0])}</b> · ${n} связанных письменных заданий</p><div class="row"><button class="primary" onclick="startToday()">Изучить и тренировать формы</button><button onclick="startWeeklyQuiz()">${n?'Задания недели':'Таблицы темы'}</button><button onclick="navTo('words');showWordCard()">Повторить слова</button></div><p class="muted">Если для темы нет точных тестов, открывается её цифровая таблица — задания других тем не подставляются.</p></section><section class="panel"><h3>25 минут для испанского</h3>`)};
const originalWords=wordsHTML;
wordsHTML=function(){return originalWords().replace('Повторять слова','Карточка: повторение').replace('поиск · карточки · озвучка <button onclick="testSpeech()">🔊 Проверка звука</button>',`поиск · ${dueWordIndices().length} слов к повторению · озвучка`)};
// Explicit forms: only tables with a person column and an inflected form header. No prose/example rows hidden.
function tableIsConjugation(t){let h=t[1].map(x=>String(x).toLowerCase());let person=/лицо|persona|pronombre/.test(h[0]||'');let paradigms=/presente|futuro|imperfecto|indefinido|condicional|subjuntivo|imperativo|hablar|comer|vivir|tener|hacer|poder|venir|decir|poner|ir|ser|ver|salir|saber|форма|forma/.test(h.slice(1).join(' ')+' '+t[0].toLowerCase());return person&&paradigms}
function cellTaskId(section,table,ri,ci){return `gram:${section}:${table}:${ri}:${ci}`}
function verifyTableCell(id,expected,field){let v=field.value;if(!v.trim()){field.setCustomValidity('Сначала введите форму');field.reportValidity();field.setCustomValidity('');return}let ok=normal(v)===normal(expected);let prior=state.answers[id]||{n:0},n=ok?Math.min(5,prior.n+1):0;state.answers[id]={n,correct:ok,last:Date.now(),due:Date.now()+(ok?[0,1,3,7,14,30][n]:0)*DAY_MS};let td=field.closest('td');let feedback=td.querySelector('.cell-feedback');feedback.textContent=ok?'✓ Верно':`✗ Правильно: ${expected}`;feedback.className='cell-feedback '+(ok?'correct':'incorrect');field.disabled=true;save()}
function createTrainingTable(t){
 const canTrain=tableIsConjugation(t);
 return `<div class="tablewrap"><table><thead><tr>${t[1].map(v=>`<th>${esc(v)}</th>`).join('')}</tr></thead><tbody>${t[2].map((r,ri)=>`<tr>${r.map((v,ci)=>{
  if(!studyHide||!canTrain||ci===0||!String(v).trim())return `<td>${esc(v)}</td>`;
  return `<td><details><summary>Вспомнить форму</summary><div class="form-task" data-cell-id="${esc(cellTaskId(section,table,ri,ci))}" data-expected="${esc(v)}"><input aria-label="${esc(t[1][ci])}: ${esc(r[0])}" autocomplete="off" autocapitalize="off" spellcheck="false"><button type="button" data-form-action="check">Проверить</button><button type="button" data-form-action="reveal">Ответ</button><div class="cell-feedback" aria-live="polite"></div></div></details></td>`;
 }).join('')}</tr>`).join('')}</tbody></table></div>${canTrain?'<p class="muted">Тренируются только формы спряжений. Подсказка не засчитывается как самостоятельный ответ.</p>':'<p class="muted">В этой таблице нет размеченных форм спряжения; содержимое не скрывается.</p>'}`;
}
const oldTables=tablesHTML;
tablesHTML=function(){let out=oldTables();let sec=DB.atlas[section],t=sec[1][Math.min(table,sec[1].length-1)];let start=out.indexOf('<div class="tablewrap"><table>');if(start<0)return out;let end=out.indexOf('</section>',start);if(end<0)return out;return out.slice(0,start)+createTrainingTable(t)+out.slice(end)};
// Persist session status and ensure selection is explicit.
const oldCheckQuiz=checkQuiz;
checkQuiz=function(){oldCheckQuiz();if(quizShown){state.session.lastPractice=Date.now();state.session.week=state.week;save()}};
const oldImport=importProgress;
importProgress=async function(el){try{let j=JSON.parse(await el.files[0].text());if(j.format!=='mi-espanol-progress-1'||!j.state||typeof j.state!=='object'||Array.isArray(j.state))throw Error('Неверный формат');let s=j.state;if(!Number.isInteger(s.week)||s.week<1||s.week>12)throw Error('Недопустимая неделя');for(let x of ['answers','vocab','favorites','session'])if(s[x]!==undefined&&(typeof s[x]!=='object'||s[x]===null||Array.isArray(s[x])))throw Error('Повреждённые данные: '+x);state={...state,...s};save();render();alert('Прогресс восстановлен')}catch(e){alert('Ошибка импорта: '+e.message)}};

