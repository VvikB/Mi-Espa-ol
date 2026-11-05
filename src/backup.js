/* R2: current snapshots use SHA-256; old v1/v2 remain read-compatible. */
const BackupService = (() => {
  const FORMAT='mi-espanol-progress-3';
  async function checksum(body) {
    if(!crypto.subtle)throw Error('Браузер не поддерживает проверку SHA-256 в этом режиме. Используйте защищённый контекст или локальный файл в поддерживаемом браузере.');
    const hash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(StateStore.canonical(body)));
    return 'sha256:'+Array.from(new Uint8Array(hash),n=>n.toString(16).padStart(2,'0')).join('');
  }
  function validateLegacy(obj) {
    const data=StateStore.clean(obj);
    if(!data||!mi11IsObject(data.state))throw Error('В файле отсутствует прогресс');
    if(data.format==='mi-espanol-progress-2') {
      if(data.schema!==2||data.checksum!=='fnv1a32:'+mi11Hash(mi11Canonical(data.state)))throw Error('Контрольная сумма или версия старой копии неверна');
    } else if(data.format!=='mi-espanol-progress-1')throw Error('Неизвестный формат копии');
    return StateStore.validateProgress(data.state);
  }
  async function create(progress=state) {
    const payload=StateStore.snapshot();payload.progress=StateStore.validateProgress(progress);
    const body={format:FORMAT,schema:3,exportedAt:new Date().toISOString(),payload};
    return {...body,checksum:await checksum(body)};
  }
  async function validate(obj) {
    const data=StateStore.clean(obj);
    if(data.format!==FORMAT) {
      const current=StateStore.snapshot();
      return {...current,progress:validateLegacy(data),conflicts:[]};
    }
    if(data.schema!==3||typeof data.exportedAt!=='string'||!Number.isFinite(Date.parse(data.exportedAt)))throw Error('Повреждена версия или дата копии');
    const body={format:data.format,schema:data.schema,exportedAt:data.exportedAt,payload:data.payload};
    if(data.checksum!==await checksum(body))throw Error('Контрольная сумма не совпала. Импорт отменён.');
    return StateStore.validateSnapshot(data.payload);
  }
  async function exportCurrent() {
    try {
      if(StateStore.locked())throw Error('Исходные данные повреждены. Сначала сохраните исходные данные отдельной кнопкой.');
      mi11Download('Mi_Espanol_progress_backup_v3.json',JSON.stringify(await create(),null,2));
    } catch(error) {alert('Экспорт не выполнен: '+error.message);}
  }
  async function importFile(file) {
    try {
      if(file.size>15*1024*1024)throw Error('Максимальный размер — 15 МБ');
      if(StateStore.locked())throw Error('Текущие исходные данные не прошли проверку. Импорт заблокирован для их защиты.');
      const parsed=JSON.parse(await file.text());
      const incoming=await validate(parsed);
      const merged=StateStore.mergeSnapshot(incoming),newConflicts=merged.conflicts.length-StateStore.snapshot().conflicts.length;
      const count=Object.keys(incoming.progress.answers||{}).length+Object.keys(incoming.progress.vocab||{}).length+Object.keys(incoming.progress.miRecall11||{}).length;
      if(!confirm((parsed.format==='mi-espanol-progress-1'?'Копия v1: контрольной суммы нет; проверена структура. ':'Копия проверена. ')+count+' записей результатов. Объединить с текущим прогрессом? Более новые результаты сохранятся. Неоднозначные значения останутся в журнале конфликтов'+(newConflicts>0?' ('+newConflicts+')':'')+'.'))return false;
      const committed=StateStore.commit(merged);
      state=committed.progress;mi11Settings=committed.settings.accessibility;audioRate=mi11Settings.audioRate;
      applyTheme();mi11ApplySettings();render();alert('Копия объединена. Прогресс и настройки сохранены.');return true;
    } catch(error) {alert('Импорт отменён: '+error.message);return false;}
  }
  function exportRaw() {mi11Download('Mi_Espanol_original_storage.json',JSON.stringify({format:'mi-espanol-unverified-storage',raw:StateStore.raw(),error:StateStore.error()},null,2));}
  return {create,validate,validateLegacy,exportCurrent,importFile,exportRaw};
})();
const beforeR2Settings=settingsHTML;
settingsHTML=function(){
  const snapshot=StateStore.snapshot();
  return beforeR2Settings().replace('Сохранить копию v2','Сохранить копию v3').replace('Восстановить из v1 или v2','Восстановить из v1, v2 или v3').replace('Параметры сохраняются отдельно от учебного прогресса.','Настройки включены в резервную копию v3.')+
  `<section class="panel"><h3>Сохранность данных</h3><p>${StateStore.error()?esc(StateStore.error()):'Прогресс и настройки сохраняются единым снимком. Прежние ключи хранилища остаются без изменений.'}</p><p>Неоднозначных значений при объединении: ${snapshot.conflicts.length}. Они сохраняются в резервной копии, а не удаляются.</p>${StateStore.locked()?'<button type="button" data-export-raw>Сохранить исходные данные без изменений</button>':''}<p class="muted">Для переноса на другое устройство скачайте копию. Надёжность хранения в Safari на физическом iPhone требует отдельной проверки.</p></section>`;
};
const beforeR2Render=render;
render=function(){beforeR2Render();StateStore.showIssue();};
document.addEventListener('click',event=>{if(event.target.closest('[data-export-raw]'))BackupService.exportRaw();});
