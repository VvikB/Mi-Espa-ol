import React, {useEffect,useMemo,useState} from 'react';
import {View,Text,TextInput,ScrollView,Pressable,StyleSheet,Alert,ActivityIndicator} from 'react-native';
import {StatusBar} from 'expo-status-bar';
import * as Speech from 'expo-speech';
import Storage from 'expo-sqlite/kv-store';
import learning from './learning';
const adaptive=require('../src/adaptive/core.js');
const bridge=require('../src/adaptive/bridge.js');
const KEY='mi-espanol-r7-native-preview-v1';
const NAV=[['today','Сегодня'],['lessons','Уроки'],['words','Слова'],['grammar','Грамматика'],['progress','Прогресс']];
const SKILLS=[['vocabulary','Слова'],['grammar','Грамматика'],['reading','Чтение'],['listening','Аудирование'],['writing','Письмо'],['speaking','Разговор']];
const format=n=>Math.max(0,Math.floor(n||0));
const colors={navy:'#15395d',sky:'#e7f0f9',ink:'#20344b',muted:'#64748b',white:'#fff',line:'#d7e3ef',background:'#f5f7fb',accent:'#2f77bb'};

function Action({children,onPress,secondary=false,disabled=false}){
 return <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress} style={[s.action,secondary&&s.secondary,disabled&&s.disabled]}>
 <Text style={[s.actionText,secondary&&s.secondaryText]}>{children}</Text></Pressable>;
}
function Panel({children}){return <View style={s.panel}>{children}</View>;}
function Heading({children}){return <Text style={s.h2}>{children}</Text>;}
function Note({children}){return <Text style={s.note}>{children}</Text>;}
function SmallStat({number,caption}){return <View style={s.stat}><Text style={s.statNumber}>{number}</Text><Note>{caption}</Note></View>;}
const today=learning.day;
function nextWordReview(course){return Object.values(course.cardReviews||{}).filter(x=>x.due<=Date.now()).length;}
const initial=()=>({miAdaptive7:{schema:1,events:[],availableMinutes:15,createdAt:Date.now()},miMobileCourse7:learning.fresh()});

export default function App(){
 const [store,setStore]=useState(null);
 const [loadError,setLoadError]=useState('');
 const [tab,setTab]=useState('today');
 const [minutes,setMinutes]=useState('15');
 const [lessonId,setLessonId]=useState(null);
 const [answer,setAnswer]=useState('');
 const [feedback,setFeedback]=useState(null);
 const [heard,setHeard]=useState(false);
 const [transcript,setTranscript]=useState(false);
 const [showTranslation,setShowTranslation]=useState(false);
 const [showReference,setShowReference]=useState(false);
 const [wordSearch,setWordSearch]=useState('');
 const [cardIndex,setCardIndex]=useState(0);
 const [cardRevealed,setCardRevealed]=useState(false);
 const [section,setSection]=useState(0);
 const [tableIndex,setTableIndex]=useState(0);
 const [manualSkill,setManualSkill]=useState('vocabulary');
 const [manualMinutes,setManualMinutes]=useState('10');
 const [manualWords,setManualWords]=useState('0');
 const [notice,setNotice]=useState('');
 useEffect(()=>{let alive=true;(async()=>{try{
   const raw=await Storage.getItem(KEY);
   const next=raw?JSON.parse(raw):initial();
   bridge.read(next);learning.read(next);
   if(alive){setStore(next);setMinutes(String(bridge.read(next).availableMinutes));}
 }catch(e){if(alive)setLoadError(e.message);}})();
 return()=>{alive=false;Speech.stop();};},[]);
 async function save(next){
  try{
   bridge.read(next);learning.read(next);
   await Storage.setItem(KEY,JSON.stringify(next));
   setStore(next);return true;
  }catch(e){Alert.alert('Сохранение не выполнено',e.message);return false;}
 }
 function say(text,callback){
  if(!text)return;
  try{Speech.stop();Speech.speak(text,{language:'es-ES',rate:0.82,onDone:()=>callback?.(),onError:()=>Alert.alert('Озвучка','Голос устройства недоступен. Можно открыть текст для чтения без зачёта аудирования.')});}
  catch(e){Alert.alert('Озвучка',e.message);}
 }
 function openLesson(id){
  setLessonId(id);setTab('lessons');setFeedback(null);setAnswer('');setHeard(false);setTranscript(false);
  setShowTranslation(false);setShowReference(false);
 }
 async function startLesson(id){
  try{const ok=await save(learning.begin(store,id));if(ok)openLesson(id);}
  catch(e){Alert.alert('Урок',e.message);}
 }
 function resetTask(){setAnswer('');setFeedback(null);setHeard(false);setTranscript(false);setShowReference(false);}
 async function submitTask(task){
  if(!task)return;
  if(!task.stage&&task.type!=='gap'&&!['writing','speaking'].includes(task.type)&&!answer.trim())
   return Alert.alert('Введите ответ','Сначала выберите или напишите ответ.');
  if(['writing','speaking'].includes(task.type)&&!answer.trim())
   return Alert.alert('Практика','Напишите свою фразу или заметку о произнесённом ответе.');
  try {
   const result=learning.assess(task,answer,{heard,transcript,selfAssessed:['writing','speaking'].includes(task.type)});
   setFeedback(result);
  }catch(e){Alert.alert('Проверка',e.message);}
 }
 async function nextTask(task){
  try{
   const result=feedback||learning.assess(task,'');
   const before=learning.read(store).active,step=before?.step;
   let next=learning.advance(store,result);
   // Non-objective exposure and self-checks never increase objective accuracy.
   if(!task.stage&&task.type!=='gap'){
    const event={
     id:'native-task-'+before.lessonId+'-'+step+'-'+Date.now()+'-'+Math.random().toString(36).slice(2),
     day:today(),skill:result.skill||task.skill||'reading',minutes:0,words:0,
     attempted:result.objective?1:0,correct:result.objective&&result.ok?1:0,
     objective:result.objective===true,selfAssessed:result.kind==='self',sourceId:task.id
    };
    next=bridge.add(next,event,adaptive);
   }
   if(await save(next)){
    resetTask();
    if(!learning.read(next).active){setLessonId(null);setNotice('Урок пройден. Можно повторить материал или перейти к следующему.');}
   }
  }catch(e){Alert.alert('Сохранение задания',e.message);}
 }
 async function rateCard(remembered){
  try{const next=learning.updateCard(store,cardIndex,remembered);
   if(await save(next)){setCardRevealed(false);setCardIndex((cardIndex+1)%learning.COURSE.words.length);}
  }catch(e){Alert.alert('Карточки',e.message);}
 }
 if(loadError)return <View style={s.loading}><Text style={s.h2}>Не удалось открыть сохранённые данные</Text><Note>{loadError}</Note><Note>Мы не обнуляем и не заменяем неизвестный прогресс. Проверь предыдущую версию или обратись к отчёту разработчика.</Note></View>;
 if(!store)return <View style={s.loading}><ActivityIndicator/><Text>Загрузка Mi Español…</Text></View>;
 const profile=bridge.read(store),course=learning.read(store),report=adaptive.weekSummary(profile.events,today());
 const active=course.active;
 const opened=lessonId&&learning.COURSE.lessons.find(l=>l.id===lessonId);
 const currentTask=opened&&active?.lessonId===opened.id?opened.tasks[active.step]:null;
 const due=learning.COURSE.lessons.filter(l=>!learning.lessonProgress(store,l.id)?.completed).length;
 const found=learning.COURSE.words.filter(w=>(w.es+' '+w.ru+' '+w.cat).toLocaleLowerCase().includes(wordSearch.toLocaleLowerCase())).slice(0,80);
 const grammar=learning.COURSE.atlas[section],table=grammar.tables[tableIndex]||grammar.tables[0];
 const chip=(label,handler,selected=false)=><Pressable key={label} accessibilityRole="button" onPress={handler} style={[s.chip,selected&&s.chipSelected]}><Text style={[s.chipText,selected&&s.chipSelectedText]}>{label}</Text></Pressable>;
 const body=()=>{
 if(tab==='today')return <>
  <Text style={s.eyebrow}>TU CAMINO · A1</Text><Text style={s.title}>¡Hola! 👋</Text>
  <Note>Шесть авторских уроков и настоящая библиотека из R6 теперь доступны в нативном прототипе.</Note>
  <View style={s.stats}><SmallStat number={learning.COURSE.words.length} caption="слов в библиотеке"/><SmallStat number={learning.COURSE.lessons.length} caption="уроков A1"/><SmallStat number={report.activeDays} caption="дней практики за 7 дней"/></View>
  <Panel><Heading>Сегодня · {today()}</Heading><Note>Время — ориентир, а не обязательный норматив. Пропущенные занятия не считаются поражением.</Note>
   <View style={s.inline}><TextInput value={minutes} onChangeText={setMinutes} keyboardType="number-pad" accessibilityLabel="Доступные минуты" style={[s.input,{width:90}]}/><Action onPress={()=>{const n=Number(minutes);if(!Number.isInteger(n)||n<0||n>180)return Alert.alert('Время','Введите от 0 до 180 минут');save(bridge.setMinutes(store,n));}}>Сохранить</Action></View>
   <Note>Выделено: {profile.availableMinutes} минут · карточек к повторению: {nextWordReview(course)}</Note>
  </Panel>
  <Panel><Heading>Продолжить обучение</Heading>
   {active?<><Text style={s.body}>Урок {active.lessonId} · шаг {active.step+1}</Text><Action onPress={()=>openLesson(active.lessonId)}>Продолжить урок</Action></>:
    <><Text style={s.body}>{due===0?'Все шесть уроков пройдены. Можно повторять.':'Выбери урок и начни обучение.'}</Text><Action onPress={()=>{setTab('lessons');setLessonId(null);}}>Открыть уроки</Action></>}
  </Panel>
  <Panel><Heading>Неделя в цифрах</Heading>
   <Text style={s.big}>{format(report.minutes)} мин</Text><Note>{report.wordsPracticed} слов в практике; {report.correct} из {report.attempted} объективно проверенных ответов.</Note>
   <Note>Счётчик включает только события нового R7, без старых результатов HTML R6.</Note>
  </Panel>
 </>;
 if(tab==='lessons')return opened?<>
   <Pressable onPress={()=>{setLessonId(null);Speech.stop();}}><Text style={s.back}>‹ К списку уроков</Text></Press>
   <Text style={s.eyebrow}>{opened.id} · A1</Text><Text style={s.title}>{opened.title}</Text>
   <Panel><Heading>Цель урока</Heading><Text style={s.body}>{opened.objective}</Text><Note>{opened.situation}</Note><Note>Исходные материалы: {opened.originalMaterials.join(', ')}</Note></Panel>
   {!currentTask?<Panel><Heading>Учебный материал</Heading><Text style={s.body}>Ты можешь изучить содержание и начать упражнения.</Text>
     {opened.explanations.map(x=><View key={x.id} style={s.section}><Text style={s.h3}>{x.title}</Text><Text style={s.body}>{x.text}</Text><Pressable onPress={()=>setShowReference(!showReference)}><Text style={s.link}>{showReference?'Скрыть справку':'Дополнительная справка'}</Text></Pressable>{showReference&&<Note>{x.referenceText}</Note>}</View>)}
     <Action onPress={()=>startLesson(opened.id)}>Начать / продолжить упражнения</Action></Panel>
   :<Panel><View style={s.inline}><Text style={s.h3}>Шаг {active.step+1} / {opened.tasks.length}</Text><Text style={s.eyebrow}>{currentTask.control?'КОНТРОЛЬ':'ПРАКТИКА'}</Text></View>
    <View style={s.track}><View style={[s.trackFill,{width:(100*(active.step+1)/opened.tasks.length)+'%'}]}/></View>
    <Text style={s.body}>{currentTask.prompt}</Text>
    {currentTask.stage==='explanation'&&opened.explanations.map(x=><View key={x.id} style={s.section}><Text style={s.h3}>{x.title}</Text><Text style={s.body}>{x.text}</Text><Pressable onPress={()=>setShowReference(!showReference)}><Text style={s.link}>{showReference?'Скрыть':'Подробнее'}</Text></Pressable>{showReference&&<Note>{x.referenceText}</Note>}</View>)}
    {currentTask.stage==='dialogue'&&<>{opened.dialogue.map(x=><View key={x.id} style={s.section}><Text style={s.h3}>{x.speaker}</Text><Text style={s.spanish}>{x.es}</Text>{showTranslation&&<Note>{x.ru}</Note>}<Action secondary onPress={()=>say(x.es)}>▶ Слушать</Action></View>)}<Action secondary onPress={()=>setShowTranslation(!showTranslation)}>{showTranslation?'Скрыть перевод':'Показать перевод'}</Action></>}
    {currentTask.stage==='lexicon'&&opened.lexicon.map(x=><View key={x.id} style={s.section}><View style={s.inline}><View style={{flex:1}}><Text style={s.spanish}>{x.es}</Text><Note>{x.ru} · {x.note}</Note></View><Pressable onPress={()=>say(x.es)}><Text style={s.link}>🔊</Text></Pressable></View></View>)}
    {!currentTask.stage&&currentTask.type==='reading'&&<View style={s.section}><Text style={s.spanish}>{currentTask.text}</Text></View>}
    {!currentTask.stage&&currentTask.type==='listening'&&<>
      <Action secondary onPress={()=>{setHeard(false);say(currentTask.text,()=>setHeard(true));}}>🔊 Прослушать испанский</Action>
      <Note>{heard?'Прослушивание завершено':'Прослушайте аудио до конца перед проверкой'}</Note>
      <Pressable onPress={()=>setTranscript(true)}><Text style={s.link}>Нет звука? Открыть текст вместо аудио</Text></Pressable>
      {transcript&&<><Text style={s.spanish}>{currentTask.text}</Text><Note>Результат учитывается как чтение, а не аудирование.</Note></>}
    </>}
    {!currentTask.stage&&['input','reading','listening'].includes(currentTask.type)&&<>
      {!!currentTask.options.length?currentTask.options.map((x,i)=><Pressable key={i} onPress={()=>setAnswer(x)} style={[s.option,answer===x&&s.optionSelected]}><Text style={s.body}>{x}</Text></Pressable>):
        <><TextInput value={answer} onChangeText={setAnswer} accessibilityLabel="Ответ на испанском" autoCapitalize="none" autoCorrect={false} style={s.input} placeholder="Respuesta en español"/><View style={s.chips}>{'áéíóúüñ¿¡'.split('').map(c=>chip(c,()=>setAnswer(v=>v+c)))}</View></>}
    </>}
    {!currentTask.stage&&['writing','speaking'].includes(currentTask.type)&&<>
     <TextInput multiline value={answer} onChangeText={setAnswer} accessibilityLabel="Собственный текст или заметка" style={[s.input,{minHeight:110,textAlignVertical:'top'}]} placeholder="Напиши свои фразы…"/>
     <Note>Свободный текст и произношение не оцениваются автоматически. Это самопроверка.</Note>
    </>}
    {feedback&&<View style={[s.section,{backgroundColor:colors.sky}]}>
      <Text style={s.h3}>{feedback.kind==='self'?'Самостоятельная работа записана':feedback.kind==='study'?'Материал просмотрен':!feedback.objective?'Ответ сохранён без объективной оценки':feedback.ok?'Верно':'Повтори правило'}</Text>
      {!['self','study'].includes(feedback.kind)&&<Text style={s.spanish}>Эталон: {currentTask.expected}</Text>}
      {!!currentTask.explanation&&<Note>{currentTask.explanation}</Note>}
      {feedback.kind==='listening'&&!feedback.objective&&<Note>Оценка аудирования не выставлена.</Note>}
    </View>}
    {feedback||currentTask.stage||currentTask.type==='gap'?<Action onPress={()=>nextTask(currentTask)}>{active.step===opened.tasks.length-1?'Завершить урок':'Следующий шаг →'}</Action>:
      <Action onPress={()=>submitTask(currentTask)}>Проверить ответ</Action>}
   </Panel>}
 </>:<>
   <Text style={s.eyebrow}>ACADEMIA · A1</Text><Text style={s.title}>Мои уроки</Text><Note>Авторский учебный материал R6 сохранён без сокращения тем до демонстрационных заглушек.</Note>
   {learning.COURSE.lessons.map((l,i)=>{const p=learning.lessonProgress(store,l.id);return <Panel key={l.id}>
     <View style={s.inline}><Text style={s.eyebrow}>{l.id} · {l.estimatedMinutes} мин (ориентир)</Text><Text style={s.eyebrow}>{p.completed?'✓ ПРОЙДЕН':'A1'}</Text></View>
     <Heading>{l.title}</Heading><Text style={s.body}>{l.objective}</Text>
     <Note>Заданий: {l.tasks.length} · пройдено: {p.done} · проверка целей: {p.correct}/{p.checked}</Note>
     <Action onPress={()=>openLesson(l.id)}>Открыть урок</Action>
     <Action secondary onPress={()=>startLesson(l.id)}>{course.active?.lessonId===l.id?'Продолжить':'Начать упражнения'}</Action>
   </Panel>;})}
 </>;
 if(tab==='words')return <>
  <Text style={s.eyebrow}>DICCIONARIO</Text><Text style={s.title}>Словарь</Text>
  <Panel><Heading>Карточки · {learning.COURSE.words.length}</Heading>
   <Action secondary onPress={()=>{const dueIds=Object.entries(course.cardReviews).filter(([id,r])=>r.due<=Date.now()).sort((a,b)=>a[1].due-b[1].due).map(([id])=>Number(id));
     const unseen=learning.COURSE.words.find(w=>!course.cardReviews[w.id]);
     const target=dueIds[0]??unseen?.id??0;setCardIndex(target);setCardRevealed(false);
   }}>Повторить к сроку / новое слово</Action>
   <Text style={s.spanish}>{learning.COURSE.words[cardIndex].es}</Text>
   {cardRevealed&&<><Text style={s.h3}>{learning.COURSE.words[cardIndex].ru}</Text><Note>{learning.COURSE.words[cardIndex].note}</Note></>}
   <Action secondary onPress={()=>say(learning.COURSE.words[cardIndex].es)}>🔊 Произнести</Action>
   {!cardRevealed?<Action onPress={()=>setCardRevealed(true)}>Показать перевод</Action>:
   <View style={s.inline}><Action secondary onPress={()=>rateCard(false)}>Не помню</Action><Action onPress={()=>rateCard(true)}>Помню</Action></View>}
  </Panel>
  <TextInput value={wordSearch} onChangeText={setWordSearch} placeholder="Поиск на español или русском" accessibilityLabel="Поиск словаря" style={s.input}/>
  <Note>Показаны первые {found.length} совпадений. Уточни запрос для остальных.</Note>
  {found.map(w=><View key={w.id} style={s.wordRow}><View style={{flex:1}}><Text style={s.spanish}>{w.es}</Text><Note>{w.ru}</Note></View><Pressable onPress={()=>say(w.es)}><Text style={s.link}>🔊</Text></Pressable><Pressable onPress={()=>{setCardIndex(w.id);setCardRevealed(false);}}><Text style={s.link}>Карточка</Text></Pressable></View>)}
 </>;
 if(tab==='grammar')return <>
  <Text style={s.eyebrow}>BIBLIOTECA</Text><Text style={s.title}>Грамматика</Text>
  <Note>{learning.COURSE.atlas.length} разделов · 73 таблицы из R6. Цифровые таблицы не заменяют оригинальные сканы.</Note>
  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{flexGrow:0}} contentContainerStyle={s.chips}>{learning.COURSE.atlas.map((a,i)=>chip((i+1)+'. '+a.title,()=>{setSection(i);setTableIndex(0);},i===section))}</ScrollView>
  <Panel><Heading>{grammar.title}</Heading><View style={s.chips}>{grammar.tables.map((t,i)=>chip(t.title,()=>setTableIndex(i),i===tableIndex))}</View>
   <Text style={s.h3}>{table.title}</Text>
   <ScrollView horizontal nestedScrollEnabled><View style={s.table}>
    <View style={s.tableRow}>{table.headers.map((h,i)=><Text key={i} style={[s.cell,s.headerCell]}>{String(h)}</Text>)}</View>
    {table.rows.map((r,i)=><View key={i} style={s.tableRow}>{r.map((c,j)=><Text key={j} style={s.cell}>{String(c)}</Text>)}</View>)}
   </View></ScrollView>
  </Panel>
  <Note>Изображения оригинальных 16 грамматических листов остаются в веб-версии. Их просмотр с масштабированием будет отдельным этапом мобильного переноса.</Note>
 </>;
 if(tab==='progress')return <>
  <Text style={s.eyebrow}>MI PROGRESO</Text><Text style={s.title}>Мой прогресс</Text>
  <View style={s.stats}><SmallStat number={format(report.minutes)} caption="минут за неделю"/><SmallStat number={report.activeDays} caption="активных дней"/><SmallStat number={report.wordsPracticed} caption="слов в практике"/></View>
  <Panel><Heading>Пройденные уроки</Heading>
   {learning.COURSE.lessons.map(l=>{const p=learning.lessonProgress(store,l.id);return <View key={l.id} style={s.section}><Text style={s.body}>{p.completed?'✓':'○'} {l.id} · {l.title}</Text><Note>Заданий с результатом: {p.done}/{p.total}; проверенных: {p.correct}/{p.checked}</Note></View>;})}
  </Panel>
  <Panel><Heading>Записать дополнительную практику</Heading>
    <View style={s.chips}>{SKILLS.map(([v,l])=>chip(l,()=>setManualSkill(v),manualSkill===v))}</View>
    <Text style={s.body}>Минут</Text><TextInput style={s.input} value={manualMinutes} onChangeText={setManualMinutes} keyboardType="number-pad"/>
    <Text style={s.body}>Слов в практике</Text><TextInput style={s.input} value={manualWords} onChangeText={setManualWords} keyboardType="number-pad"/>
    <Action onPress={async()=>{const m=Number(manualMinutes),w=Number(manualWords);
      if(!Number.isInteger(m)||m<0||m>180||!Number.isInteger(w)||w<0||w>500)return Alert.alert('Проверь значения','Минуты: 0–180, слова: 0–500');
      try{const n=bridge.add(store,{id:'manual-'+Date.now()+'-'+Math.random().toString(36).slice(2),day:today(),skill:manualSkill,minutes:m,words:w,attempted:0,correct:0,objective:false},adaptive);if(await save(n))setNotice('Практика записана');}catch(e){Alert.alert('Ошибка',e.message);}
    }}>Сохранить фактическое занятие</Action>
    <Note>Ручная запись не повышает показатель проверенных знаний.</Note>
  </Panel>
  <Panel><Heading>Защита данных</Heading><Note>Нативный прогресс хранится локально в отдельном хранилище. Автоматическая синхронизация с Web R6 пока не реализована; не удаляй приложение без резервной копии.</Note></Panel>
 </>;
 };
 return <View style={s.screen}><StatusBar style="dark"/><ScrollView key={tab+'-'+(lessonId||'')+'-'+(active?.step??'')} style={s.main} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
   {body()}{!!notice&&<Note>{notice}</Note>}
   <Text style={s.footer}>Mi Español · R7 native preview · A1 • Offline content</Text>
  </ScrollView>
  <View style={s.nav}>{NAV.map(([id,label])=><Pressable accessibilityRole="tab" accessibilityState={{selected:tab===id}} key={id} onPress={()=>{Speech.stop();setTab(id);setLessonId(null);setNotice('');}} style={[s.navItem,tab===id&&s.navSelected]}><Text numberOfLines={1} style={[s.navLabel,tab===id&&s.navTextSelected]}>{label}</Text></Pressable>)}</View>
 </View>;
}
const s=StyleSheet.create({
 screen:{flex:1,backgroundColor:colors.background},main:{flex:1},content:{paddingHorizontal:18,paddingTop:65,paddingBottom:55,gap:16},
 loading:{flex:1,alignItems:'center',justifyContent:'center',padding:30,gap:15},
 eyebrow:{color:colors.accent,fontSize:11,letterSpacing:1.4,fontWeight:'800',textTransform:'uppercase'},
 title:{fontSize:32,fontWeight:'800',color:colors.navy,marginVertical:4},
 h2:{fontSize:20,fontWeight:'700',color:colors.navy,marginBottom:6},
 h3:{fontSize:16,fontWeight:'700',color:colors.ink,marginBottom:5},
 spanish:{fontSize:19,color:colors.navy,lineHeight:28},
 body:{color:colors.ink,fontSize:15,lineHeight:23},
 note:{color:colors.muted,fontSize:12,lineHeight:19},
 big:{fontSize:30,fontWeight:'800',color:colors.navy},
 panel:{backgroundColor:colors.white,borderRadius:20,padding:17,gap:11,borderWidth:1,borderColor:'#e6edf4'},
 stats:{flexDirection:'row',gap:8},stat:{flex:1,backgroundColor:colors.white,padding:12,borderRadius:15,minWidth:0},
 statNumber:{fontSize:22,fontWeight:'800',color:colors.navy},inline:{flexDirection:'row',gap:9,alignItems:'center',justifyContent:'space-between',flexWrap:'wrap'},
 section:{borderTopWidth:1,borderTopColor:colors.line,paddingTop:12,gap:7},
 action:{backgroundColor:colors.navy,paddingVertical:13,paddingHorizontal:15,borderRadius:13,alignItems:'center',justifyContent:'center',minHeight:42,flexGrow:0},
 actionText:{color:colors.white,fontWeight:'700',fontSize:14},secondary:{backgroundColor:colors.sky},
 secondaryText:{color:colors.navy},disabled:{opacity:.45},input:{backgroundColor:colors.white,borderWidth:1,borderColor:'#bfcfe1',borderRadius:12,padding:12,color:colors.navy,fontSize:16},
 chips:{flexDirection:'row',flexWrap:'wrap',gap:7,paddingVertical:5},
 chip:{backgroundColor:colors.sky,borderRadius:12,paddingVertical:8,paddingHorizontal:11,maxWidth:260},
 chipSelected:{backgroundColor:colors.navy},chipText:{color:colors.navy,fontSize:12,fontWeight:'600'},chipSelectedText:{color:colors.white},
 link:{color:colors.accent,fontSize:14,fontWeight:'700',padding:7},
 back:{color:colors.accent,fontWeight:'700',fontSize:15,paddingVertical:8},
 track:{height:7,backgroundColor:colors.line,borderRadius:5,overflow:'hidden'},trackFill:{height:7,backgroundColor:colors.accent},
 option:{padding:13,borderRadius:12,backgroundColor:colors.background,borderWidth:1,borderColor:colors.line},
 optionSelected:{borderColor:colors.accent,backgroundColor:colors.sky},
 wordRow:{padding:12,backgroundColor:colors.white,borderRadius:12,flexDirection:'row',alignItems:'center',gap:9},
 table:{paddingVertical:6},tableRow:{flexDirection:'row'},cell:{width:132,borderWidth:1,borderColor:colors.line,padding:10,fontSize:13,color:colors.ink},headerCell:{backgroundColor:colors.sky,fontWeight:'700'},
 footer:{color:colors.muted,fontSize:11,textAlign:'center',marginTop:14},
 nav:{flexDirection:'row',backgroundColor:colors.white,borderTopWidth:1,borderColor:colors.line,paddingBottom:22,paddingTop:10},
 navItem:{flex:1,alignItems:'center',justifyContent:'center',paddingVertical:6},navSelected:{borderTopWidth:2,borderTopColor:colors.accent},
 navLabel:{fontSize:11,color:colors.muted},navTextSelected:{color:colors.navy,fontWeight:'800'}
});
