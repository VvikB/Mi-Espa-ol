/* Native R7 backup envelope. Export-only for now: no destructive import.
   Integrity SHA-256 detects accidental file corruption; it is not encryption/authentication.
*/
const learning=require('./learning.js');
const adaptive=require('../src/adaptive/core.js');
const bridge=require('../src/adaptive/bridge.js');
function validateState(state) {
 if(!state||typeof state!=='object'||Array.isArray(state))throw Error('Неправильный профиль');
 bridge.read(state);learning.read(state);
 return state;
}
function backupBody(state,at=new Date().toISOString()){
 validateState(state);
 if(typeof at!=='string'||!Number.isFinite(Date.parse(at)))throw Error('Неверная дата');
 return {format:'mi-espanol-native-r7-progress-1',schema:1,exportedAt:at,
  metadata:{lessons:learning.COURSE.lessons.length,words:learning.COURSE.words.length,
   includesR6WebHistory:false,deviceScope:'local-native-r7'},payload:state};
}
async function makeBackup(state,sha256){
 if(typeof sha256!=='function')throw Error('SHA-256 недоступен');
 const body=backupBody(state),checksum=await sha256(JSON.stringify(body));
 if(!/^[a-f0-9]{64}$/i.test(checksum))throw Error('Неправильная контрольная сумма');
 return {...body,checksum:'sha256:'+checksum.toLowerCase()};
}
async function validateBackup(backup,sha256){
 if(!backup||backup.format!=='mi-espanol-native-r7-progress-1'||backup.schema!==1||typeof backup.checksum!=='string')
  throw Error('Это не резервная копия Mi Español R7');
 const {checksum,...body}=backup;
 const actual='sha256:'+(await sha256(JSON.stringify(body))).toLowerCase();
 if(actual!==checksum)throw Error('Контрольная сумма копии не совпадает');
 validateState(body.payload);
 return body.payload;
}
module.exports={validateState,backupBody,makeBackup,validateBackup};
