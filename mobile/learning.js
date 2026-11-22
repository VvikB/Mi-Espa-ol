/* Portable R7 mobile course assessment and progress helpers.
   R6 IDs are immutable. Mobile results are kept separate from legacy R6.
*/
const COURSE=require('./content/course.json');
const validTypes=['input','reading','listening','writing','speaking','gap'];
const fresh=()=>({schema:1,results:{},active:null,cardReviews:{},completedLessons:{}});
const clone=x=>JSON.parse(JSON.stringify(x));
const day=()=>{
  const d=new Date(),local=new Date(d.getTime()-d.getTimezoneOffset()*60000);
  return local.toISOString().slice(0,10);
};
function validate(p){
  if(!p || typeof p!=='object' || p.schema!==1 || !p.results || typeof p.results!=='object' ||
     !p.cardReviews || typeof p.cardReviews!=='object' || !p.completedLessons || typeof p.completedLessons!=='object')
    throw Error('Некорректная версия учебного прогресса');
  if(p.active!==null && (typeof p.active!=='object' || !COURSE.lessons.some(l=>l.id===p.active.lessonId) ||
      !Number.isInteger(p.active.step) || p.active.step<0 || p.active.step>19))
    throw Error('Неподдерживаемое незавершённое занятие');
  return p;
}
function read(state){return validate(state?.miMobileCourse7===undefined?fresh():state.miMobileCourse7);}
function withCourse(state,course){validate(course);return {...state,miMobileCourse7:course};}
function begin(state,lessonId) {
 const lesson=COURSE.lessons.find(l=>l.id===lessonId);
 if(!lesson) throw Error('Неизвестный урок');
 const p=clone(read(state));
 if(p.active && p.active.lessonId===lessonId) return withCourse(state,p);
 p.active={lessonId,step:0,startedAt:Date.now()};
 return withCourse(state,p);
}
function norm(s){return String(s||'').trim().toLocaleLowerCase('es').normalize('NFC').replace(/[¿¡!?.,;:]/g,'').replace(/\s+/g,' ');}
function assess(task,answer,{heard=false,transcript=false,selfAssessed=false}={}) {
 if(!task||!validTypes.includes(task.type))throw Error('Неизвестный тип задания');
 if(task.stage||task.type==='gap')return {kind:'study',ok:null,objective:false};
 if(task.type==='writing'||task.type==='speaking')
   return {kind:'self',ok:null,objective:false,selfAssessed:!!selfAssessed,answer:String(answer||'')};
 const expected=[task.expected,...(task.alternatives||[])].filter(x=>typeof x==='string');
 if(!expected.length)throw Error('Задание без проверочного ответа');
 const ok=expected.some(x=>norm(x)===norm(answer));
 const objective=task.type!=='listening'||(heard===true&&transcript!==true);
 return {kind:task.type,ok,objective,answer:String(answer||''),skill:task.type==='listening'&&!objective?'reading':task.skill};
}
function advance(state,assessment) {
 const p=clone(read(state)),a=p.active;
 if(!a)throw Error('Нет активного урока');
 const lesson=COURSE.lessons.find(l=>l.id===a.lessonId),task=lesson?.tasks[a.step];
 if(!task)throw Error('Неизвестное задание');
 const prior=p.results[task.id];
 p.results[task.id]={...assessment,at:Date.now(),lessonId:a.lessonId,taskId:task.id,attempts:(prior?.attempts||0)+1};
 if(a.step===lesson.tasks.length-1) {
  p.completedLessons[a.lessonId]={at:Date.now(),completedTasks:lesson.tasks.length};
  p.active=null;
 }else p.active.step++;
 return withCourse(state,p);
}
function updateCard(state,index,remembered) {
 if(!Number.isInteger(index)||index<0||index>=COURSE.words.length)throw Error('Неизвестная карточка');
 const p=clone(read(state)),old=p.cardReviews[index]||{steps:0};
 const steps=remembered?Math.min(old.steps+1,5):0;
 p.cardReviews[index]={steps,last:Date.now(),due:Date.now()+[0,1,3,7,14,30][steps]*86400000};
 return withCourse(state,p);
}
function lessonProgress(state,id) {
 const lesson=COURSE.lessons.find(l=>l.id===id);
 if(!lesson)return null;
 const p=read(state),done=lesson.tasks.filter(t=>p.results[t.id]!==undefined).length;
 const checks=lesson.tasks.filter(t=>t.control&&p.results[t.id]?.objective);
 const correct=checks.filter(t=>p.results[t.id]?.ok).length;
 return {done,total:lesson.tasks.length,correct,checked:checks.length,completed:!!p.completedLessons[id]};
}
module.exports={COURSE,fresh,read,withCourse,begin,assess,advance,updateCard,lessonProgress,day,norm};
