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
function mi11Merge(a,b){return StateStore.mergeProgress(a,b).progress}
function mi11Hash(s){let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return ('00000000'+(h>>>0).toString(16)).slice(-8)}
function mi11Canonical(v){if(Array.isArray(v))return '['+v.map(mi11Canonical).join(',')+']';if(mi11IsObject(v))return '{'+Object.keys(v).sort().map(k=>JSON.stringify(k)+':'+mi11Canonical(v[k])).join(',')+'}';return JSON.stringify(v)}
let mi11Settings=StateStore.accessibility();
audioRate=mi11Settings.audioRate;
function mi11ApplySettings(){document.body.dataset.mi11Size=mi11Settings.fontScale;document.body.dataset.mi11Reduce=mi11Settings.reducedMotion?'yes':'no'}
function mi11SetSetting(key,value){if(!Object.hasOwn(MI11_SETTINGS_DEFAULT,key))return;try{const candidate={...mi11Settings,[key]:value};StateStore.setAccessibility(candidate);mi11Settings=candidate;audioRate=mi11Settings.audioRate;mi11ApplySettings();render()}catch(error){alert('Настройка не сохранена: '+error.message)}}
function mi11Download(name,data){const blob=new Blob([data],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),4000)}
function mi11MakeBackup(progress){let data=StateStore.validateProgress(progress);let canonical=mi11Canonical(data);return {format:'mi-espanol-progress-2',schema:2,exportedAt:new Date().toISOString(),checksum:'fnv1a32:'+mi11Hash(canonical),state:data}}
function mi11ValidateBackup(obj){return BackupService.validateLegacy(obj)}
function mi11Export(){return BackupService.exportCurrent()}
async function mi11Import(el){if(!el.files||!el.files[0])return;try{return await BackupService.importFile(el.files[0])}finally{el.value=''}}
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

