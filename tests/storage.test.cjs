const fs=require('node:fs');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const source=fs.readFileSync('src/storage.js','utf8');
const results=[];
function setup(seed={}) {
  const data=new Map(Object.entries(seed));let fail=false;
  const context=vm.createContext({document:{getElementById:()=>null},localStorage:{
    getItem:k=>data.get(k)??null,setItem:(k,v)=>{if(fail)throw Error('QuotaExceeded');data.set(k,v)},removeItem:k=>data.delete(k)
  }});
  vm.runInContext(source,context);
  return {run:s=>vm.runInContext(s,context),data,fail:()=>{fail=true}};
}
function test(name,fn){try{fn();results.push({test:name,status:'PASS'})}catch(error){results.push({test:name,status:'FAIL',error:error.message})}}
const old='mi-espanol-personal-v1',key='mi-espanol-recovery-state-v3';
test('migrate_legacy_without_rewriting_old_key',()=>{const value=JSON.stringify({week:3,vocab:{'0':{n:2,due:1}},unknown:{keep:'ñ'}});const x=setup({[old]:value});x.run('StateStore.saveProgress(StateStore.loadProgress())');assert.equal(x.data.get(old),value);assert.equal(JSON.parse(x.data.get(key)).progress.unknown.keep,'ñ')});
test('reject_invalid_week',()=>{const x=setup();assert.throws(()=>x.run('StateStore.validateProgress({week:99})'))});
test('reject_array_namespace',()=>{const x=setup();assert.throws(()=>x.run('StateStore.validateProgress({week:1,answers:[]})'))});
test('reject_negative_timestamp',()=>{const x=setup();assert.throws(()=>x.run('StateStore.validateProgress({vocab:{x:{due:-1}}})'))});
test('reject_prototype_key',()=>{const x=setup();assert.throws(()=>x.run("StateStore.clean(JSON.parse('{\"__proto__\":{\"polluted\":true}}'))"))});
test('reject_deep_structure',()=>{const x=setup();assert.throws(()=>x.run('(()=>{let x={};for(let i=0;i<40;i++)x={v:x};return StateStore.clean(x)})()'))});
test('newer_known_timestamp_wins_even_after_failure',()=>{const x=setup();assert.equal(x.run("StateStore.mergeProgress({answers:{x:{n:5,correct:true,last:100}}},{answers:{x:{n:0,correct:false,last:200}}}).progress.answers.x.n"),0)});
test('old_snapshot_does_not_rollback_current',()=>{const x=setup();assert.equal(x.run("StateStore.mergeProgress({answers:{x:{n:5,correct:true,last:200}}},{answers:{x:{n:0,correct:false,last:100}}}).progress.answers.x.n"),5)});
test('unknown_order_keeps_current_and_archives_other',()=>{const x=setup();const out=JSON.parse(x.run("JSON.stringify(StateStore.mergeProgress({answers:{x:{n:5,correct:true}}},{answers:{x:{n:0,correct:false}}}))"));assert.equal(out.progress.answers.x.n,5);assert.equal(out.conflicts[0].other.n,0)});
test('newer_record_does_not_discard_unknown_fields',()=>{const x=setup();assert.equal(x.run("StateStore.mergeProgress({vocab:{x:{n:1,last:100,privateField:'keep'}}},{vocab:{x:{n:2,last:200}}}).progress.vocab.x.privateField"),'keep')});
test('empty_profile_restores_week_and_unknown_namespace',()=>{const x=setup();const out=JSON.parse(x.run("JSON.stringify(StateStore.mergeProgress({week:1,answers:{},vocab:{},favorites:{},session:{}},{week:5,custom:{original:true}}).progress)"));assert.equal(out.week,5);assert.equal(out.custom.original,true)});
test('save_adds_timestamp_to_changed_records_only',()=>{const x=setup({[old]:JSON.stringify({week:1,vocab:{x:{n:1,due:1}}})});x.run("let p=StateStore.loadProgress();p.vocab.x.n=2;StateStore.saveProgress(p)");assert.ok(JSON.parse(x.data.get(key)).progress.vocab.x.updatedAt>0)});
test('unchanged_legacy_record_stays_valid_after_repeated_save',()=>{const x=setup({[old]:JSON.stringify({week:1,vocab:{x:{n:1,due:1}}})});x.run("let p=StateStore.loadProgress();StateStore.saveProgress(p);StateStore.saveProgress(p)");assert.equal(JSON.parse(x.data.get(key)).progress.vocab.x.n,1)});
test('malformed_raw_progress_is_preserved_and_writes_blocked',()=>{const raw='{broken';const x=setup({[old]:raw});x.run('StateStore.loadProgress()');assert.equal(x.run('StateStore.locked()'),true);assert.throws(()=>x.run('StateStore.saveProgress({week:1})'));assert.equal(x.data.get(old),raw);assert.equal(x.data.has(key),false)});
test('malformed_new_snapshot_does_not_fallback_and_overwrite',()=>{const x=setup({[key]:'{broken',[old]:'{"week":3}'});x.run('StateStore.loadProgress()');assert.equal(x.run('StateStore.locked()'),true);assert.equal(x.data.get(key),'{broken')});
test('quota_failure_preserves_previous_snapshot',()=>{const x=setup();x.run('StateStore.saveProgress({week:2})');const before=x.data.get(key);x.fail();assert.throws(()=>x.run('StateStore.saveProgress({week:3})'));assert.equal(x.data.get(key),before)});
test('new_backup_settings_replace_unconfigured_defaults',()=>{const x=setup();const theme=x.run("(()=>{let s=StateStore.snapshot();s.settings.theme='dark';s.settingsMeta.theme=100;return StateStore.mergeSnapshot(s).settings.theme})()");assert.equal(theme,'dark')});
test('older_backup_settings_do_not_rollback_current',()=>{const x=setup();x.run("StateStore.setTheme('dark')");assert.equal(x.run("(()=>{let s=StateStore.snapshot();s.settings.theme='light';s.settingsMeta.theme=1;return StateStore.mergeSnapshot(s).settings.theme})()"),'dark')});
test('repeated_import_deduplicates_conflict_archive',()=>{const x=setup({[old]:JSON.stringify({week:2,answers:{x:{n:5,correct:true}}})});const counts=JSON.parse(x.run("JSON.stringify((()=>{let s=StateStore.snapshot();s.progress.answers.x={n:0,correct:false};const first=StateStore.commit(StateStore.mergeSnapshot(s)).conflicts.length;const second=StateStore.commit(StateStore.mergeSnapshot(s)).conflicts.length;return [first,second]})())"));assert.equal(counts[0],1);assert.equal(counts[1],1)});
test('unknown_snapshot_and_settings_fields_preserved',()=>{const x=setup();const result=JSON.parse(x.run("JSON.stringify((()=>{let s=StateStore.snapshot();s.extension={keep:'payload'};s.settings.extra={keep:'settings'};return StateStore.mergeSnapshot(s)})())"));assert.equal(result.extension.keep,'payload');assert.equal(result.settings.extra.keep,'settings')});
test('newer_accessibility_keeps_existing_extension_fields',()=>{const x=setup();x.run("StateStore.setAccessibility({fontScale:'large',reducedMotion:false,audioRate:1,extension:'keep'})");assert.equal(x.run("(()=>{let s=StateStore.snapshot();s.settings.accessibility={fontScale:'normal',reducedMotion:true,audioRate:.7};s.settingsMeta.accessibility=Date.now()+1000;return StateStore.mergeSnapshot(s).settings.accessibility.extension})()"),'keep')});
const failed=results.filter(r=>r.status==='FAIL');
const output={runner:'node:vm + real storage module; deterministic synthetic localStorage',summary:{PASS:results.length-failed.length,FAIL:failed.length},results};
fs.mkdirSync('audit/restoration-r2',{recursive:true});fs.writeFileSync('audit/restoration-r2/storage-tests.json',JSON.stringify(output,null,2)+'\n');
console.log(output.summary);for(const r of failed)console.log(r);if(failed.length)process.exitCode=1;
