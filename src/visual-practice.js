/* Mi Español • Stage 11 continuing work. Applies to archived recovery candidate only.
 * No fabricated or imported Stage10 educational records.
 */
const mi11FullSceneLabels={body:'Человек',house:'Дом',street:'Улица',feel:'Эмоции',kitchen:'Кухня и еда',clothing:'Одежда'};
// Preserve the previous illustration rendering for the existing four scenes.
const mi11BeforeAllSceneHTML=visualHTML;
visualHTML=function(){
  // The new practice implementation is available for all six scenes; previously only two.
  if(mi11VisualMode==='quiz') return mi11QuizHTML();
  let html=mi11BeforeAllSceneHTML();
  if(!MI11_SCENES[visualMode]){
    let stats=(state.miVisual11&&state.miVisual11[visualMode])||{attempts:0,correct:0};
    html=html.replace('</section>',`<div class="mi11-visual-actions"><button class="primary" onclick="mi11StartPractice()">Проверить знания</button><span class="muted">Попыток: ${Number(stats.attempts)||0}, верно: ${Number(stats.correct)||0}</span></div></section>`);
  }
  return html;
};
// Avoid a stale question when returning from quiz or changing a scene by clicking its tab.
const mi11PriorSelectVisual=visualHTML;
// Make lesson structure and recovery limitations visible within the existing Settings panel.
const mi11PreviousSettingsHTML=settingsHTML;
function mi11Stage11Inventory(){
 const atlas=Array.isArray(DB.atlas)?DB.atlas:[];
 const tables=atlas.reduce((n,section)=>n+(Array.isArray(section[1])?section[1].length:0),0);
 const scenes=Object.keys(VISUAL_DATA||{});
 return {vocab:DB.vocab.length,quiz:DB.quiz.length,sections:atlas.length,tables,scenes:scenes.length,sceneItems:scenes.reduce((n,k)=>n+VISUAL_DATA[k].length,0),weeks:DB.weeks.length};
}
settingsHTML=function(){
  const data=mi11Stage11Inventory();
  const gaps=[['Словарь',data.vocab,459],['Письменные упражнения',data.quiz,58],['Визуальные сцены',data.scenes,6],['Таблицы грамматики',data.tables,85]];
  const rows=gaps.map(([label,actual,target])=>`<tr><td>${esc(label)}</td><td>${actual}</td><td>${target}</td><td>${actual>=target?'По числу достигнуто':'Недостаёт '+(target-actual)}</td></tr>`).join('');
  const panel=`<section class="panel mi11-evidence"><h3>Контроль восстановления учебных данных</h3><p class="warning">Рабочий кандидат построен из архивной HTML-версии. Цифры из отчёта №10 служат только целями сверки; совпадение количества не доказывает идентичность содержания.</p><div style="overflow-x:auto"><table><thead><tr><th>Раздел</th><th>В файле</th><th>№10</th><th>Статус</th></tr></thead><tbody>${rows}</tbody></table></div><p class="muted">Исходник №10 не найден; проход №11 НЕ закрыт. Не импортируйте учебные материалы из непроверенных источников как оригиналы.</p></section>`;
  return mi11PreviousSettingsHTML()+panel;
};
// A new practice starts in ES→RU; avoid silently inheriting the previous scene's direction.
const mi11OldStartPractice=mi11StartPractice;
mi11StartPractice=function(){mi11VisualDirection='esru';mi11OldStartPractice()};


