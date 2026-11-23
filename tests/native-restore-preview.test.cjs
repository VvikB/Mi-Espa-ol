const test=require('node:test');
const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const backup=require('../mobile/backup.js');
const preview=require('../mobile/restore-preview.js');
const learning=require('../mobile/learning.js');
const digest=async x=>crypto.createHash('sha256').update(x).digest('hex');
const fresh=()=>({miAdaptive7:{schema:1,events:[],availableMinutes:15,createdAt:1},miMobileCourse7:learning.fresh()});
test('preflight reports exact same payload without a write or replacement state',async()=>{
 const live=fresh(),signed=await backup.makeBackup(live,digest);
 const original=JSON.stringify(live);
 const report=await preview.previewRestore(live,signed,digest);
 assert.equal(report.sameContent,true);
 assert.equal(report.safeToAutoApply,false);
 assert.equal(report.writesPerformed,0);
 assert.equal(report.requiresExplicitApproval,true);
 assert.ok(!Object.hasOwn(report,'state'));
 assert.equal(JSON.stringify(live),original);
});
test('conflicting progress is flagged, existing history remains unchanged',async()=>{
 const live=fresh(),older=fresh();
 older.miAdaptive7.availableMinutes=5;
 const signed=await backup.makeBackup(older,digest);
 const original=JSON.stringify(live);
 const report=await preview.previewRestore(live,signed,digest);
 assert.equal(report.sameContent,false);
 assert.deepEqual(report.conflicts,['miAdaptive7']);
 assert.equal(report.existing.availableMinutes,15);
 assert.equal(report.backup.availableMinutes,5);
 assert.equal(JSON.stringify(live),original);
});
test('tampering fails before any comparison or write',async()=>{
 const live=fresh(),signed=await backup.makeBackup(fresh(),digest);
 signed.payload.miAdaptive7.availableMinutes=90;
 await assert.rejects(preview.previewRestore(live,signed,digest),/Контрольная сумма/);
 assert.equal(live.miAdaptive7.availableMinutes,15);
});
test('R6 Web export cannot be silently restored as native',async()=>{
 await assert.rejects(preview.previewRestore(fresh(),{format:'mi-espanol-progress-3',schema:3},digest),/не резервная копия/);
});
test('unsupported live profile is refused, never overwritten',async()=>{
 const signed=await backup.makeBackup(fresh(),digest);
 await assert.rejects(preview.previewRestore({miAdaptive7:{schema:99}},signed,digest));
});
