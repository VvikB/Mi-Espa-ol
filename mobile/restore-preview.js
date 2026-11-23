/* Read-only R7 backup restoration preflight.
 * NEVER writes to SQLite, never merges automatically and never imports Web R6 backups.
 * Run before any future user-confirmed restore. Integrity is not authenticity.
 */
const backup=require('./backup.js');
const learning=require('./learning.js');
const bridge=require('../src/adaptive/bridge.js');
const own=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);
function count(value){return value&&typeof value==='object'&&!Array.isArray(value)?Object.keys(value).length:0;}
function snapshot(state){
 backup.validateState(state);
 const course=learning.read(state),adaptive=bridge.read(state);
 return Object.freeze({
  lessonsCompleted:count(course.completedLessons),
  taskResults:count(course.results),
  wordReviews:count(course.cardReviews),
  taskReviews:count(course.taskReviews),
  journalEvents:adaptive.events.length,
  activeLesson:course.active?.lessonId||null,
  availableMinutes:adaptive.availableMinutes
 });
}
function equal(a,b){return JSON.stringify(a)===JSON.stringify(b);}
function summary(current,incoming){
 const keys=['miMobileCourse7','miAdaptive7'];
 return keys.map(key=>{
  const before=own(current,key)?current[key]:null;
  const after=own(incoming,key)?incoming[key]:null;
  return {namespace:key,existing:own(current,key),incoming:own(incoming,key),
   differs:!equal(before,after)};
 });
}
async function previewRestore(current,envelope,sha256){
 if(typeof sha256!=='function')throw Error('SHA-256 недоступен');
 backup.validateState(current);
 // Refuse the wrong format, modified files, and malformed data before comparisons.
 const incoming=await backup.validateBackup(envelope,sha256);
 const changes=summary(current,incoming);
 const existingSnapshot=snapshot(current),incomingSnapshot=snapshot(incoming);
 const conflicts=changes.filter(x=>x.differs&&x.existing).map(x=>x.namespace);
 const missing=changes.filter(x=>!x.incoming&&x.existing).map(x=>x.namespace);
 // NO state is returned: even an accidental caller cannot treat preview as a replacement profile.
 return Object.freeze({
  kind:'native-r7-restore-preview',
  safeToAutoApply:false,
  writesPerformed:0,
  requiresExplicitApproval:true,
  sameContent:changes.every(x=>!x.differs),
  existing:existingSnapshot,
  backup:incomingSnapshot,
  namespaces:changes,
  conflicts,
  missingFromBackup:missing,
  warning:'Это только проверка. Данные не импортированы. Перед восстановлением потребуется отдельная резервная копия текущего состояния, явное подтверждение, политика конфликтов и откат.'
 });
}
module.exports={snapshot,previewRestore};
