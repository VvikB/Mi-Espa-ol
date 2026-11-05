/* R2: one authoritative local snapshot; legacy keys are read, never overwritten. */
const StateStore = (() => {
  const KEY = 'mi-espanol-recovery-state-v3';
  const LEGACY = 'mi-espanol-personal-v1';
  const THEME = 'mi-espanol-theme-v1';
  const ACCESS = 'mi-espanol-recovery11-settings-v1';
  const defaults = {fontScale:'normal', reducedMotion:false, audioRate:.85};
  const recordMaps = ['answers','vocab','miRecall11','miVisual11','miSchemePractice'];
  let current, issue = '', locked = false;
  const raw = Object.create(null);
  const object = v => v !== null && typeof v === 'object' && !Array.isArray(v);
  function clean(v, depth=0, count={n:0}) {
    if (++count.n > 150000 || depth > 30) throw Error('Слишком сложная структура данных');
    if (v === null || typeof v === 'string' || typeof v === 'boolean') return v;
    if (typeof v === 'number' && Number.isFinite(v)) return v;
    if (Array.isArray(v)) return v.map(x=>clean(x,depth+1,count));
    if (!object(v)) throw Error('Недопустимое значение');
    const result=Object.create(null);
    for (const key of Object.keys(v)) {
      if (['__proto__','constructor','prototype'].includes(key)) throw Error('Недопустимое имя поля');
      result[key]=clean(v[key],depth+1,count);
    }
    return result;
  }
  function canonical(v) {
    if (Array.isArray(v)) return '['+v.map(canonical).join(',')+']';
    if (object(v)) return '{'+Object.keys(v).sort().map(k=>JSON.stringify(k)+':'+canonical(v[k])).join(',')+'}';
    return JSON.stringify(v);
  }
  const clone = v => clean(v);
  function emptyProgress() {return {week:1,answers:{},vocab:{},favorites:{},session:{}};}
  function validateProgress(value) {
    if (!object(value)) throw Error('Прогресс должен быть объектом');
    const data=clean(value);
    if (data.week!==undefined && (!Number.isInteger(data.week)||data.week<1||data.week>12)) throw Error('Недопустимая неделя');
    for (const key of ['answers','vocab','favorites','session','miRecall11','miVisual11','miSchemePractice','miRoute3','miJourney3']) {
      if (data[key]!==undefined&&!object(data[key])) throw Error('Повреждён раздел '+key);
    }
    for (const key of recordMaps) for (const [id,r] of Object.entries(data[key]||{})) {
      if (!object(r)) throw Error('Повреждена запись '+key+'/'+id);
      for (const name of ['n','steps']) if (r[name]!==undefined&&(!Number.isInteger(r[name])||r[name]<0||r[name]>5)) throw Error('Недопустимый интервал');
      for (const name of ['due','next','last','updatedAt']) if (r[name]!==undefined&&(typeof r[name]!=='number'||!Number.isFinite(r[name])||r[name]<0)) throw Error('Недопустимое время записи');
      for (const name of ['attempts','correct']) if (r[name]!==undefined) {
        if (name==='correct'&&key==='answers') {if(typeof r[name]!=='boolean')throw Error('Недопустимый результат');}
        else if (!Number.isInteger(r[name])||r[name]<0) throw Error('Недопустимый счётчик');
      }
      if (typeof r.correct==='number'&&r.attempts!==undefined&&r.correct>r.attempts) throw Error('Неверный счётчик верных ответов');
      if(r.lastAt!==undefined&&(typeof r.lastAt!=='string'||!Number.isFinite(Date.parse(r.lastAt))))throw Error('Недопустимая дата');
    }
    if(data.miJourney3!==undefined) {
      const j=data.miJourney3,skills=['vocabulary','grammar','reading','listening','writing','speaking'];
      if(j.schema!==1||!Array.isArray(j.events)||j.events.length>5000||!object(j.completedDays)||!object(j.completedSessions))throw Error('Повреждён журнал занятий');
      if(j.events.some(e=>!object(e)||typeof e.id!=='string'||typeof e.contentId!=='string'||!skills.includes(e.skill)||!Number.isFinite(e.at)))throw Error('Повреждено событие занятия');
      if(new Set(j.events.map(e=>e.id)).size!==j.events.length)throw Error('Повторные ID событий');
      if(j.active!==null&&j.active!==undefined) {
        const a=j.active;
        if(!object(a)||a.schema!==1||typeof a.id!=='string'||!Array.isArray(a.tasks)||!a.tasks.length||a.tasks.length>60||!Number.isInteger(a.step)||a.step<0||a.step>=a.tasks.length||!object(a.results)||!object(a.drafts)||!object(a.playback)||!object(a.attempts))throw Error('Повреждено незавершённое занятие');
        if(a.tasks.some(t=>!object(t)||typeof t.id!=='string'||typeof t.contentId!=='string'||!skills.includes(t.skill)||!['input','reading','listening','writing','speaking','gap'].includes(t.type)))throw Error('Повреждено задание');
        if(a.tasks.some(t=>t.type==='input'&&(typeof t.expected!=='string'||typeof t.prompt!=='string')||['reading','listening'].includes(t.type)&&(typeof t.text!=='string'||typeof t.meaning!=='string'||!Array.isArray(t.options)||t.options.some(x=>typeof x!=='string'))))throw Error('Повреждены данные задания');
      }
    }
    return {...emptyProgress(),...data};
  }
  function validateSettings(value) {
    if (!object(value)) throw Error('Повреждены настройки');
    const result=clean(value);
    if (!['light','dark','system'].includes(result.theme)) throw Error('Неизвестная тема');
    if (!object(result.accessibility)) throw Error('Повреждены настройки доступности');
    const a=result.accessibility;
    if (!['normal','large','xlarge'].includes(a.fontScale)||typeof a.reducedMotion!=='boolean'||!Number.isFinite(a.audioRate)||a.audioRate<.6||a.audioRate>1.35) throw Error('Недопустимая настройка');
    return result;
  }
  function fresh() {return {schema:3,progress:emptyProgress(),settings:{theme:'system',accessibility:{...defaults}},settingsMeta:{theme:0,accessibility:0},conflicts:[]};}
  function validateSnapshot(value) {
    if (!object(value)||value.schema!==3) throw Error('Неизвестная версия локальных данных');
    const s=clean(value);
    s.progress=validateProgress(s.progress);s.settings=validateSettings(s.settings);
    if (!object(s.settingsMeta)||Object.values(s.settingsMeta).some(v=>!Number.isFinite(v)||v<0)||!Array.isArray(s.conflicts)||s.conflicts.length>10000) throw Error('Повреждены метаданные');
    return s;
  }
  function read(key) {const value=localStorage.getItem(key);raw[key]=value;return value;}
  function initialize() {
    if(current)return;
    current=fresh();
    try {
      const saved=read(KEY),progress=read(LEGACY),theme=read(THEME),access=read(ACCESS);
      if(saved!==null){current=validateSnapshot(JSON.parse(saved));return;}
      if(progress!==null)current.progress=validateProgress(JSON.parse(progress));
      if(theme!==null){current.settings.theme=theme;current.settingsMeta.theme=1;}
      if(access!==null){current.settings.accessibility={...defaults,...clean(JSON.parse(access))};current.settingsMeta.accessibility=1;}
      current.settings=validateSettings(current.settings);
    } catch(error) {locked=true;issue='Сохранение приостановлено: исходные данные не удалось проверить. Они не изменены. Сохраните их копию. '+error.message;current=fresh();}
  }
  function showIssue() {
    const el=document.getElementById('recovery-storage-status');
    if(el){el.textContent=issue;el.hidden=!issue;}
  }
  function commit(snapshot) {
    initialize();
    if(locked)throw Error(issue);
    const next=validateSnapshot(snapshot),text=JSON.stringify(next);
    const previous=localStorage.getItem(KEY);
    try {
      localStorage.setItem(KEY,text);
      if(localStorage.getItem(KEY)!==text)throw Error('Запись не подтверждена');
    } catch(error) {
      try {if(previous===null)localStorage.removeItem(KEY);else localStorage.setItem(KEY,previous);}catch(_){}
      issue='Не удалось сохранить прогресс. Экспортируйте резервную копию.';showIssue();throw error;
    }
    current=next;issue='';showIssue();return clone(current);
  }
  function stampRecords(progress) {
    for (const map of recordMaps) for (const [id,r] of Object.entries(progress[map]||{})) {
      const prior=current.progress[map]?.[id];
      const strip=x=>{const y={...x};delete y.updatedAt;return y;};
      if(!prior||canonical(strip(prior))!==canonical(strip(r)))r.updatedAt=Date.now();
      else if(prior.updatedAt!==undefined)r.updatedAt=prior.updatedAt;
    }
  }
  function saveProgress(progress) {
    initialize();const next=validateProgress(progress);stampRecords(next);
    if(next.miJourney3?.active&&canonical(next.miJourney3.active)!==canonical(current.progress.miJourney3?.active||null))next.miJourney3.active.updatedAt=Date.now();
    commit({...current,progress:next});
    if(progress.miJourney3?.active&&next.miJourney3?.active)progress.miJourney3.active.updatedAt=next.miJourney3.active.updatedAt;
    for(const map of recordMaps)for(const [id,r]of Object.entries(next[map]||{}))if(object(progress[map]?.[id])&&r.updatedAt!==undefined)progress[map][id].updatedAt=r.updatedAt;
    return true;
  }
  function timestamp(record) {
    if(!object(record))return 0;
    return Math.max(0,...['updatedAt','last','at','lastAt'].map(k=>typeof record[k]==='number'?record[k]:typeof record[k]==='string'?Date.parse(record[k])||0:0));
  }
  function mergeProgress(left,right) {
    const a=validateProgress(left),b=validateProgress(right),conflicts=[];
    function merge(x,y,path) {
      if(canonical(x)===canonical(y))return clone(x);
      if(path==='miJourney3.events'&&Array.isArray(x)&&Array.isArray(y)){
        const events=new Map(x.map(e=>[e.id,clone(e)]));
        for(const e of y){if(!events.has(e.id))events.set(e.id,clone(e));else if(canonical(events.get(e.id))!==canonical(e))conflicts.push({path:path+'.'+e.id,kept:clone(events.get(e.id)),other:clone(e),reason:'Конфликт неизменяемого события'});}
        return [...events.values()].sort((a,b)=>a.at-b.at||a.id.localeCompare(b.id));
      }
      if(path==='miJourney3.active'){
        if(x===null&&object(y)&&!a.miJourney3?.completedSessions?.[y.id])return clone(y);
        if(object(x)&&y===null)return clone(x);
        if(object(x)&&object(y)&&x.id===y.id&&timestamp(x)!==timestamp(y))return mergeRecord(timestamp(x)>timestamp(y)?x:y,timestamp(x)>timestamp(y)?y:x);
      }

      if(object(x)&&object(y)){
        const parts=path.split('.');
        if(parts.length===2&&recordMaps.includes(parts[0])) {
          const tx=timestamp(x),ty=timestamp(y);
          if(tx!==ty)return mergeRecord(tx>ty?x:y,tx>ty?y:x);
          conflicts.push({path,kept:clone(x),other:clone(y),reason:'Нет надёжного порядка времени'});return mergeRecord(x,y);
        }
        const o=clone(x);
        for(const k of Object.keys(y))o[k]=Object.hasOwn(x,k)?merge(x[k],y[k],path?path+'.'+k:k):clone(y[k]);
        return o;
      }
      conflicts.push({path,kept:clone(x),other:clone(y),reason:'Сохранено текущее значение'});return clone(x);
    }
    function mergeRecord(winner,other) {const r=clone(other);for(const k of Object.keys(winner))r[k]=clone(winner[k]);return r;}
    // A fresh, empty profile must be restorable without a synthetic conflict on week=1.
    const blank=canonical(a)===canonical(emptyProgress());
    return {progress:blank?b:merge(a,b,''),conflicts};
  }
  function mergeSnapshot(incoming) {
    initialize();const validated=validateSnapshot(incoming),merged=mergeProgress(current.progress,validated.progress);
    const next={...clone(current),progress:merged.progress};
    const conflicts=[...current.conflicts,...validated.conflicts,...merged.conflicts];
    for(const key of ['theme','accessibility']) {
      const t=current.settingsMeta[key]||0,u=validated.settingsMeta[key]||0;
      if(t===0||u>t){next.settings[key]=key==='accessibility'?{...current.settings.accessibility,...clone(validated.settings.accessibility)}:clone(validated.settings[key]);next.settingsMeta[key]=u;}
      else if(canonical(current.settings[key])!==canonical(validated.settings[key]))conflicts.push({path:'settings.'+key,kept:clone(current.settings[key]),other:clone(validated.settings[key]),reason:'Сохранены текущие настройки'});
    }
    // Preserve extension fields without interpreting or silently dropping them.
    for(const [target,source,path,known] of [
      [next,validated,'payload',['schema','progress','settings','settingsMeta','conflicts']],
      [next.settings,validated.settings,'settings',['theme','accessibility']],
      [next.settingsMeta,validated.settingsMeta,'settingsMeta',['theme','accessibility']]
    ]) for(const key of Object.keys(source)) {
      if(known.includes(key))continue;
      if(!Object.hasOwn(target,key))target[key]=clone(source[key]);
      else if(canonical(target[key])!==canonical(source[key]))conflicts.push({path:path+'.'+key,kept:clone(target[key]),other:clone(source[key]),reason:'Неизвестное поле сохранено без переопределения'});
    }
    next.conflicts=[...new Map(conflicts.map(c=>[canonical(c),c])).values()];
    return validateSnapshot(next);
  }
  return {
    key:KEY,clean,canonical,validateProgress,validateSnapshot,validateSettings,mergeProgress,mergeSnapshot,commit,
    loadProgress(){initialize();return clone(current.progress);},
    snapshot(){initialize();return clone(current);},
    theme(){initialize();return current.settings.theme;},
    accessibility(){initialize();return clone(current.settings.accessibility);},
    setTheme(theme){initialize();return commit({...current,settings:{...current.settings,theme},settingsMeta:{...current.settingsMeta,theme:Date.now()}});},
    setAccessibility(accessibility){initialize();return commit({...current,settings:{...current.settings,accessibility},settingsMeta:{...current.settingsMeta,accessibility:Date.now()}});},
    saveProgress,showIssue,error(){initialize();return issue;},
    raw(){initialize();return clone(raw);},locked(){initialize();return locked;}
  };
})();
