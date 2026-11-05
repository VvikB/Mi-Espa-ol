/* R5 editorial overlay. No localStorage migration and no renumbering of content. */
RELEASE_INFO.version='R5 · редакторская проверочная версия · 2026-11-05';
RELEASE_INFO.changes=['Проверены 73 цифровые таблицы по 16 страницам: различаются буквальные формы, адаптации и дополнения.','Вычитаны 483 словарные записи; новые примеры R5 помечены отдельно от источников.','Семь схем ведут к соответствующим конспектам; для восьмой источник не найден.','Исправления сохраняют прежние индексы и ключи повторения.'];
RELEASE_INFO.known=['Полный курс A1–B2 не завершён; 84 плана не равны полноценным урокам.','Редакторский проход помощника выполнен; независимая методическая приёмка ожидается.','Не весь текст 16 страниц оцифрован; пробелы перечислены в отчёте.','Физическая проверка R3/R4/R5 на iPhone/Safari остаётся неподтверждённой.'];
const R5Content=(()=>{
  let sourceContext=null;
  const meta=w=>REVIEW_DATA.words[DB.vocab.indexOf(w)];
  const indexMeta=i=>REVIEW_DATA.words[i];
  function openSource(id){const record=CATALOG.images.find(r=>DB.images[r.legacyIndex].id===id);if(record)ContentIndex.open(record.id);}
  function sourceButton(id){return '<button type="button" data-review-source="'+esc(id)+'">Оригинал '+esc(id)+'</button>';}
  function detail(i,includeExample=true){
    const m=indexMeta(i),w=DB.vocab[i];if(!m||!w)return '';
    let html='<p class="muted">'+esc(m.partOfSpeech)+' · '+(m.origin==='RECOVERED_PHOTO_R4'?'восстановлено из фотографии':'сохранено из исходного HTML')+'</p>';
    if(m.usageNotes.length)html+='<p>'+m.usageNotes.map(esc).join(' ')+'</p>';
    if(m.regionalStatus!=='NO_SPECIFIC_VARIANT_FLAGGED_NOT_EXHAUSTIVE')html+='<p class="muted">Региональные особенности: '+esc(m.usageNotes.join(' ')||'Употребление зависит от региона; единого варианта для всех стран нет.')+'</p>';
    if(includeExample&&m.example)html+='<div class="lesson"><b>Контекстный пример · создано в R5</b><p lang="es">'+esc(m.example.es)+'</p><p>'+esc(m.example.ru)+'</p><button type="button" data-speech="'+esc(m.example.es)+'">🔊 Пример</button><p class="muted">Уровень '+esc(m.example.level)+' — предварительная разметка.</p></div>';
    if(m.originalEs!==w.es||m.originalRu!==w.ru)html+='<p class="muted">До редакторской правки: '+esc(m.originalEs)+' — '+esc(m.originalRu)+'</p>';
    html+=m.imageIds.map(sourceButton).join('');
    return html;
  }
  function rows(items){return '<p class="muted">Найдено: '+items.length+'</p><div style="max-height:480px;overflow:auto">'+items.slice(0,250).map(w=>'<div class="lesson"><div class="row between"><div><b lang="es">'+esc(w.es)+'</b><div class="muted">'+esc(w.ru)+'</div></div><button type="button" aria-label="Произнести '+esc(w.es)+'" data-speech="'+esc(w.es)+'">🔊</button></div>'+(Number.isInteger(w.idx)?'<details><summary>Употребление и источник</summary>'+detail(w.idx)+'</details>':'')+'</div>').join('')+'</div>'+(items.length>250?'<p class="muted">Для остальных результатов уточните поиск.</p>':'');}
  function schemeSource(i){sourceContext=REVIEW_DATA.schemes[i];if(sourceContext.pageIds.length)openSource(sourceContext.pageIds[0]);else {srcGroup='notes';srcIndex=0;setLib('originals');}}
  function schemeNotice(){if(!sourceContext||srcGroup!=='notes')return '';return sourceContext.pageIds.length?'<p class="warning">Тематическое соответствие конспекту проверено в R5. Цифровые примеры не являются дословной транскрипцией страницы. Независимая методическая приёмка ожидается.</p>'+sourceContext.pageIds.map(sourceButton).join(''):'<p class="warning">Источник схемы умений не найден среди семи доступных конспектов. Открыта общая галерея; связь с выбранной страницей не подтверждена.</p>';}
  function tableNotice(){const m=REVIEW_DATA.tables.find(t=>t.section===section&&t.table===table);if(!m)return '';return '<section class="lesson"><b>Проверка материала R5</b><p>'+esc(m.sourceAnchor)+'</p><p class="muted">'+(m.relationship==='SOURCE_FORMS'?'Формы совпадают с источником':m.relationship.includes('NOT_LITERAL')?'Редакторское дополнение или уточнение; буквального соответствия нет':m.relationship.includes('PARTIAL')?'Частичное соответствие; есть адаптация или дополнительные формы':'Материал источника адаптирован: примеры, группировка или пояснения могут отличаться')+' · '+(m.correctionIds.length?'внесены редакторские исправления':'без правки значений')+'. Это проверка имеющейся таблицы; полного покрытия страницы и независимой методической приёмки нет.</p>'+m.sourcePages.map(p=>sourceButton(p.id)).join('')+'</section>';}
  return {meta,indexMeta,detail,rows,openSource,schemeSource,schemeNotice,tableNotice};
})();
// Old numeric progress and term keys remain usable after ES/RU corrections.
const recallIdBeforeR5=mi11RecallId;
mi11RecallId=function(w){return R5Content.meta(w)?.originalRecallKey||recallIdBeforeR5(w);};
wordRows=R5Content.rows;
// Use the unwrapped base dictionary header, avoiding the superseded R4 status.
wordsHTML=function(){return '<p class="warning">R5: словарь прошёл редакторскую вычитку. 103 новых контекстных примера отмечены отдельно. Независимая методическая приёмка ещё нужна; полный курс A1–B2 не завершён.</p>'+wordsBeforeR4();};
const cardBeforeR5=updateWordCard;
updateWordCard=function(){cardBeforeR5();if(reveal&&$('wordCard'))$('wordCard').insertAdjacentHTML('beforeend',R5Content.detail(currentWord));};
const recallBeforeR5=mi11RecallHTML;
mi11RecallHTML=function(){let html=recallBeforeR5();if(mi11RecallRevealed&&mi11RecallIndex>=0){const w=mi11RecallRecords()[mi11RecallIndex],i=DB.vocab.indexOf(w);if(i>=0)html+='<section class="panel">'+R5Content.detail(i)+'</section>';}return html;};
SchemeUI.sources=R5Content.schemeSource;
SchemeUI.sourceNotice=R5Content.schemeNotice;
const tablesBeforeR5=tablesHTML;
tablesHTML=function(){return tablesBeforeR5().replace(/<button onclick="srcGroup='grammar';srcIndex=(?:\d+|section);setLib\('originals'\)">[^<]*<\/button>/,'')+R5Content.tableNotice();};
document.addEventListener('click',e=>{const b=e.target.closest('[data-review-source]');if(!b)return;const raw=b.dataset.reviewSource;R5Content.openSource(/^\d+$/.test(raw)?Number(raw):raw);});
