/* Mi Español — stage 11 reconstruction patch for the ARCHIVED baseline only.
   This patch does not restore missing Stage10 content or claim user acceptance. */
const MI11_SETTINGS_KEY='mi-espanol-recovery11-settings-v1';
const MI11_SETTINGS_DEFAULT={fontScale:'normal',reducedMotion:false,audioRate:0.85};
function mi11SafeParse(s){try{return JSON.parse(s)}catch(e){return null}}
function mi11IsObject(v){return v!==null&&typeof v==='object'&&!Array.isArray(v)}
function mi11Clean(v,depth=0,count={n:0}){
 if(++count.n>150000||depth>30)throw Error('Слишком сложная структура файла');
 if(v===null||typeof v==='string'||typeof v==='boolean')return v;
 if(typeof v==='number'&&Number.isFinite(v))return v;
 if(Array.isArray(v))return v.map(x=>mi11Clean(x,depth+1,count));
 if(!mi11IsObject(v))throw Error('Недопустимые данные в резервной копии');
 let o=Object.create(null);
 for(let k of Object.keys(v)){
  if(['__proto__','prototype','constructor'].includes(k))throw Error('Недопустимое имя поля');
  o[k]=mi11Clean(v[k],depth+1,count);
 }
 return o;
}
function mi11Merge(a,b){if(!mi11IsObject(a)||!mi11IsObject(b))return b;let o=Object.assign(Object.create(null),a);for(const k of Object.keys(b))o[k]=Object.hasOwn(a,k)?mi11Merge(a[k],b[k]):b[k];return o}
function mi11Hash(s){let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return ('00000000'+(h>>>0).toString(16)).slice(-8)}
function mi11Canonical(v){if(Array.isArray(v))return '['+v.map(mi11Canonical).join(',')+']';if(mi11IsObject(v))return '{'+Object.keys(v).sort().map(k=>JSON.stringify(k)+':'+mi11Canonical(v[k])).join(',')+'}';return JSON.stringify(v)}
let mi11Settings={...MI11_SETTINGS_DEFAULT,...(mi11SafeParse((()=>{try{return localStorage.getItem(MI11_SETTINGS_KEY)}catch(e){return null}})())||{})};
if(!['normal','large','xlarge'].includes(mi11Settings.fontScale))mi11Settings.fontScale='normal';
if(!Number.isFinite(Number(mi11Settings.audioRate)))mi11Settings.audioRate=0.85;
mi11Settings.audioRate=Math.min(1.35,Math.max(0.6,Number(mi11Settings.audioRate)));
audioRate=mi11Settings.audioRate;
function mi11ApplySettings(){document.body.dataset.mi11Size=mi11Settings.fontScale;document.body.dataset.mi11Reduce=mi11Settings.reducedMotion?'yes':'no'}
function mi11SetSetting(key,value){if(!Object.hasOwn(MI11_SETTINGS_DEFAULT,key))return;mi11Settings[key]=value;if(key==='audioRate')audioRate=Number(value);try{localStorage.setItem(MI11_SETTINGS_KEY,JSON.stringify(mi11Settings))}catch(e){alert('Настройка действует сейчас, но сохранение в браузере недоступно.')}mi11ApplySettings();render()}
function mi11Download(name,data){const blob=new Blob([data],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),4000)}
function mi11MakeBackup(progress){let data=mi11Clean(progress);let canonical=mi11Canonical(data);return {format:'mi-espanol-progress-2',schema:2,exportedAt:new Date().toISOString(),checksum:'fnv1a32:'+mi11Hash(canonical),state:data}}
function mi11ValidateBackup(obj){if(!mi11IsObject(obj)||!mi11IsObject(obj.state))throw Error('Отсутствуют данные прогресса');let data=mi11Clean(obj.state);if(obj.format==='mi-espanol-progress-2'){if(obj.checksum!=='fnv1a32:'+mi11Hash(mi11Canonical(data)))throw Error('Контрольная сумма не совпала. Файл может быть повреждён.')}else if(obj.format!=='mi-espanol-progress-1')throw Error('Неизвестный формат резервной копии');return data}
function mi11Export(){try{mi11Download('Mi_Espanol_progress_backup_v2.json',JSON.stringify(mi11MakeBackup(state),null,2))}catch(e){alert('Ошибка экспорта: '+e.message)}}
async function mi11Import(el){
 if(!el.files||!el.files[0])return;
 try{
  const f=el.files[0];if(f.size>15*1024*1024)throw Error('Файл слишком большой');
  const obj=JSON.parse(await f.text()),incoming=mi11ValidateBackup(obj),current=mi11Clean(state);
  const merged=mi11Merge(current,incoming);
  const keys=Object.keys(incoming);if(!confirm('Импорт '+obj.format+' от '+(obj.exportedAt||'неизвестной даты')+'. Поля: '+keys.join(', ')+'. При совпадениях приоритет у файла; остальные данные сохраняются. Продолжить?'))return;
  const previous=JSON.stringify(state),next=JSON.stringify(merged);
  try{localStorage.setItem(STORE,next);if(localStorage.getItem(STORE)!==next)throw Error('Нет подтверждения записи');state=merged;render();alert('Прогресс импортирован. Рекомендуется сохранить резервную копию.');}
  catch(e){try{localStorage.setItem(STORE,previous)}catch(_){ }state=mi11SafeParse(previous)||state;throw Error('Не удалось сохранить импорт: '+e.message)}
 }catch(e){alert('Импорт отменён: '+e.message)}finally{el.value=''}
}
// Preserve original runtime and all instructional records. Override only risky export/import handlers.
exportProgress=mi11Export;
importProgress=mi11Import;
const mi11OldSettingsHTML=settingsHTML;
settingsHTML=function(){
 const base=mi11OldSettingsHTML().replace('onchange="audioRate=Number(this.value)"','onchange="mi11SetSetting(\'audioRate\',Number(this.value))"').replace('value="0.85" selected','value="0.85"');
 const extras=`<section class="panel mi11-panel"><h3>Удобство на телефоне</h3><label for="mi11-size">Размер текста</label><select id="mi11-size" class="field" onchange="mi11SetSetting('fontScale',this.value)"><option value="normal" ${mi11Settings.fontScale==='normal'?'selected':''}>Стандартный</option><option value="large" ${mi11Settings.fontScale==='large'?'selected':''}>Крупный</option><option value="xlarge" ${mi11Settings.fontScale==='xlarge'?'selected':''}>Очень крупный</option></select><label><input type="checkbox" ${mi11Settings.reducedMotion?'checked':''} onchange="mi11SetSetting('reducedMotion',this.checked)"> Минимальная анимация</label><p class="settings-caption">Параметры сохраняются отдельно от учебного прогресса.</p></section><section class="panel mi11-panel"><h3>Резервная копия</h3><p class="warning">На iPhone локальное хранилище HTML-файла может очищаться браузером. Сохраняйте резервную копию после занятий.</p><button class="primary" onclick="mi11Export()">Сохранить копию v2</button><label class="field" for="mi11-backup">Восстановить из v1 или v2</label><input class="field" type="file" id="mi11-backup" accept=".json,application/json" onchange="mi11Import(this)"><p class="settings-caption">Импорт выполняется только после предварительной проверки и явного согласия.</p></section><section class="panel"><h3>Восстановление №11 — статус</h3><p class="warning">Это восстановленный кандидат на основе архивного HTML, а НЕ потерянная полная версия №10. В архиве 131 слово и 10 упражнений; содержимое №10 (459 слов, 58 упражнений, 6 сцен) ещё не восстановлено полностью.</p></section>`;
 return base.replace('<section class="panel"><h3>Паспорт сборки</h3>',extras+'<section class="panel"><h3>Паспорт сборки</h3>').replace('id="speech-speed"','id="speech-speed"');
};
const mi11OldRender=render;
render=function(){mi11OldRender();let el=document.getElementById('speech-speed');if(el)el.value=String(mi11Settings.audioRate)};
mi11ApplySettings();

