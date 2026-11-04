/* Reconstructed, newly authored scenes: NOT the lost stage 10 original artwork. */
const MI11_SCENES={
 kitchen:{title:'Кухня и еда',items:[['el pan','хлеб'],['la manzana','яблоко'],['el agua','вода'],['el plato','тарелка'],['la taza','чашка'],['el queso','сыр'],['el tomate','помидор'],['la cuchara','ложка']]},
 clothing:{title:'Одежда',items:[['la camisa','рубашка'],['los pantalones','брюки'],['los zapatos','туфли'],['el vestido','платье'],['el sombrero','шляпа'],['la chaqueta','куртка'],['la falda','юбка'],['los calcetines','носки']]}
};
for(const [k,v] of Object.entries(MI11_SCENES)) VISUAL_DATA[k]=v.items;
const mi11OldVisualSVG=visualSVG;
function mi11SvgSpot(word,i,x,y,art){const safe=JSON.stringify(word).replace(/"/g,'&quot;');return `<g role="button" tabindex="0" aria-label="${esc(word)}" onclick="chooseVisual(${safe})" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();chooseVisual(${safe})}" style="cursor:pointer"><g>${art}</g><circle cx="${x}" cy="${y}" r="15" fill="#ffffff" stroke="#176e83" stroke-width="2.7"/><text x="${x}" y="${y+5}" text-anchor="middle" font-size="14" font-weight="700" fill="#164b63">${i+1}</text></g>`}
function mi11SceneSVG(kind){const kitchen=kind==='kitchen';let arts;
if(kitchen){arts=[
[85,150,`<path d="M35 145Q35 90 86 90Q138 90 138 145Q132 177 85 178Q40 178 35 145Z" fill="#d79552" stroke="#9b612f" stroke-width="3"/><path d="M48 121Q83 90 120 122" fill="none" stroke="#f4d399" stroke-width="6"/>`],
[205,146,`<circle cx="204" cy="140" r="39" fill="#dc4c4b"/><path d="M204 106Q211 85 228 94" stroke="#408a5d" stroke-width="7" fill="none"/>`],
[335,146,`<path d="M305 95H365L355 184H315Z" fill="#b5e2ed" stroke="#539ab2" stroke-width="4"/><path d="M315 147H355L350 178H320Z" fill="#67c6e8"/>`],
[458,140,`<ellipse cx="458" cy="147" rx="55" ry="26" fill="#fff" stroke="#7eafbd" stroke-width="8"/><ellipse cx="458" cy="147" rx="31" ry="13" fill="#f8e1b9"/>`],
[91,324,`<path d="M46 288H132V340Q132 369 91 369Q49 369 49 340Z" fill="#eee2ce" stroke="#896752" stroke-width="5"/><path d="M131 297Q165 284 164 314Q164 339 131 335" fill="none" stroke="#896752" stroke-width="7"/>`],
[217,327,`<path d="M170 360L216 281L271 360Z" fill="#f6d87e" stroke="#c99b38" stroke-width="4"/><circle cx="220" cy="336" r="5" fill="#a97939"/>`],
[343,325,`<circle cx="343" cy="319" r="42" fill="#d9564c"/><path d="M337 282L344 272L356 283" fill="none" stroke="#438453" stroke-width="7"/>`],
[464,322,`<ellipse cx="471" cy="300" rx="20" ry="37" fill="#b8c9d7"/><path d="M471 334L460 383" stroke="#718899" stroke-width="11" stroke-linecap="round"/>`]
];}else{arts=[
[85,155,`<path d="M44 103L64 84H105L126 103L147 139L115 159L104 140V221H63V140L53 160L23 139Z" fill="#83b7da" stroke="#356f96" stroke-width="4"/>`],
[215,156,`<path d="M175 83H255L249 226H222L215 148L207 226H177Z" fill="#5c6f9f" stroke="#3c4b6c" stroke-width="4"/>`],
[352,170,`<path d="M307 187Q329 163 348 182L366 199Q380 210 400 210V225H311Q301 218 307 187Z" fill="#b47c54" stroke="#775337" stroke-width="4"/>`],
[475,145,`<path d="M458 81H487L497 111L524 188L506 204H437L420 188L446 111Z" fill="#e4a3a7" stroke="#a65e67" stroke-width="4"/><path d="M454 111H492" stroke="#fff1e9" stroke-width="5"/>`],
[84,337,`<ellipse cx="86" cy="303" rx="47" ry="15" fill="#d6a75d"/><path d="M60 302V264Q84 243 110 264V302" fill="#e3bb76" stroke="#a57541" stroke-width="4"/><path d="M32 304H140" stroke="#ae773a" stroke-width="7"/>`],
[220,330,`<path d="M178 272L199 252H240L262 272L280 321L249 333L238 308V388H198V308L187 333L155 321Z" fill="#75a894" stroke="#3a7568" stroke-width="4"/>`],
[355,331,`<path d="M329 275H381L403 390H308Z" fill="#b3a0d9" stroke="#7765a5" stroke-width="4"/><path d="M330 295H381" stroke="#e7dcf9" stroke-width="5"/>`],
[476,324,`<path d="M451 268H480V330Q480 351 498 363L494 386H447V364Q454 352 451 330Z" fill="#f2e2c9" stroke="#ba9e75" stroke-width="4"/>`]
]}
let items=VISUAL_DATA[kind];return `<svg viewBox="0 0 560 440" role="group" aria-label="${kitchen?'Кухня и продукты':'Одежда'}" xmlns="http://www.w3.org/2000/svg"><rect x="0" y="0" width="560" height="440" rx="20" fill="${kitchen?'#fff4e7':'#f0f2fc'}"/><path d="M16 235H544" stroke="${kitchen?'#dcb999':'#d1d5e7'}" stroke-width="3"/><path d="M280 24V414" stroke="${kitchen?'#e9ceb7':'#dde0f0'}" stroke-width="2"/>${arts.map((a,i)=>mi11SvgSpot(items[i][0],i,a[0],a[1],a[2])).join('')}</svg>`}
visualSVG=function(){return MI11_SCENES[visualMode]?mi11SceneSVG(visualMode):mi11OldVisualSVG()};
let mi11VisualMode='study',mi11VisualDirection='esru',mi11VisualAnswer=null,mi11VisualQuestion=0;
function mi11SaveSceneAttempt(ok){if(!state.miVisual11||typeof state.miVisual11!=='object'||Array.isArray(state.miVisual11))state.miVisual11={};let key=visualMode;let rec=state.miVisual11[key]||{attempts:0,correct:0};state.miVisual11[key]={attempts:rec.attempts+1,correct:rec.correct+(ok?1:0),lastAt:new Date().toISOString(),mode:mi11VisualDirection};save()}
function mi11ChooseDirection(dir){mi11VisualDirection=dir;mi11VisualQuestion=0;mi11VisualAnswer=null;render()}
function mi11StartPractice(){mi11VisualMode='quiz';mi11VisualQuestion=0;mi11VisualAnswer=null;render()}
function mi11NextQuestion(){mi11VisualQuestion++;mi11VisualAnswer=null;render()}
function mi11Answer(index){if(mi11VisualAnswer!==null)return;let items=VISUAL_DATA[visualMode], q=mi11VisualQuestion%items.length;mi11VisualAnswer=index;mi11SaveSceneAttempt(index===q);render()}
function mi11QuizHTML(){let data=VISUAL_DATA[visualMode],q=mi11VisualQuestion%data.length,word=data[q],direction=mi11VisualDirection;const others=data.map((_,i)=>i).filter(i=>i!==q);let choices=[q,...others.slice((mi11VisualQuestion*3)%others.length).concat(others).slice(0,3)];const shift=(mi11VisualQuestion*5+2)%4;choices=choices.slice(shift).concat(choices.slice(0,shift));let prompt=direction==='esru'?word[0]:word[1];return `<section class="panel mi11-quiz"><h3>Тренировка · ${esc(MI11_SCENES[visualMode]?.title||visualMode)}</h3><div class="row"><button class="${direction==='esru'?'active':''}" onclick="mi11ChooseDirection('esru')">Испанский → русский</button><button class="${direction==='rues'?'active':''}" onclick="mi11ChooseDirection('rues')">Русский → испанский</button></div><p class="muted">Вопрос ${mi11VisualQuestion+1} · 4 варианта</p><h3>${esc(prompt)}</h3><div class="grid">${choices.map(i=>`<button ${mi11VisualAnswer!==null?'disabled':''} onclick="mi11Answer(${i})">${esc(direction==='esru'?data[i][1]:data[i][0])}</button>`).join('')}</div>${mi11VisualAnswer===null?'':`<p role="status" class="${mi11VisualAnswer===q?'mi11-ok':'warning'}">${mi11VisualAnswer===q?'Верно!':'Неверно.'} ${esc(word[0])} — ${esc(word[1])}</p><button data-speech="${esc(word[0])}">🔊 Произношение</button><button class="primary" onclick="mi11NextQuestion()">Следующий вопрос</button>`}<p><button onclick="mi11VisualMode='study';render()">Вернуться к рисунку</button></p></section>`}
const mi11OriginalVisualHTML=visualHTML;
visualHTML=function(){let root=mi11OriginalVisualHTML();let extras=`<button class="${visualMode==='kitchen'?'active':''}" onclick="visualMode='kitchen';visualChosen=null;mi11VisualMode='study';render()">Кухня и еда</button><button class="${visualMode==='clothing'?'active':''}" onclick="visualMode='clothing';visualChosen=null;mi11VisualMode='study';render()">Одежда</button>`;root=root.replace('</div><div class="visual-scene">',extras+'</div><div class="visual-scene">');if(MI11_SCENES[visualMode]){root=root.replace('</div><div class="visual-scene">','</div><div class="visual-scene">');let stat=state.miVisual11?.[visualMode]||{attempts:0,correct:0};root=root.replace('</section>',`<section class="mi11-visual-actions"><button class="primary" onclick="mi11StartPractice()">Проверить знания</button><span class="muted">Попыток: ${stat.attempts}, верно: ${stat.correct}</span></section></section>`)}return mi11VisualMode==='quiz'&&MI11_SCENES[visualMode]?mi11QuizHTML():root};
// Explicitly reset quiz when navigating to an original scene, avoiding stale quiz displays.
const mi11PreviousSetLib=setLib;
setLib=function(x){mi11VisualMode='study';mi11PreviousSetLib(x)};


