const test=require('node:test');
const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const backup=require('../mobile/backup.js');
const learning=require('../mobile/learning.js');
const digest=async x=>crypto.createHash('sha256').update(x).digest('hex');
const state=()=>({miMobileCourse7:learning.fresh(),miAdaptive7:{schema:1,events:[],availableMinutes:15,createdAt:1}});
test('native backup includes exact current progress and verified checksum',async()=>{
 const payload=state();
 const file=await backup.makeBackup(payload,digest);
 const read=await backup.validateBackup(JSON.parse(JSON.stringify(file)),digest);
 assert.deepEqual(read,payload);
 assert.equal(file.metadata.includesR6WebHistory,false);
 assert.match(file.checksum,/^sha256:[0-9a-f]{64}$/);
});
test('tampered native backup rejected without modifying existing state',async()=>{
 const payload=state(),file=await backup.makeBackup(payload,digest);
 file.payload.miAdaptive7.availableMinutes=99;
 await assert.rejects(backup.validateBackup(file,digest),/Контрольная сумма/);
 assert.equal(payload.miAdaptive7.availableMinutes,15); // export is a detached copy of app state
});
test('wrong backup format cannot be imported by validator',async()=>{
 await assert.rejects(backup.validateBackup({format:'mi-espanol-progress-3',schema:3},digest));
});
