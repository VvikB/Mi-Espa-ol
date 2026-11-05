/* R4 image-derived vocabulary: original records and progress indices stay intact. */
const rowsBeforeR4=wordRows;
wordRows=function(items){
  return rowsBeforeR4(items.map(w=>({...w,ru:w.ru+(w.recoveryStatus?' · из фотографии словаря; примеры и уровень ещё не приняты':'')})));
};
const wordsBeforeR4=wordsHTML;
wordsHTML=function(){return '<p class="warning">R4: добавлены записи из двух фотографий. Это восстановленный словарь, а не готовые уроки A1–B2. Примеры употребления и методическая приёмка новых записей ещё нужны.</p>'+wordsBeforeR4();};
