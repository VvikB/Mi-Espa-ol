import React, {useEffect,useState} from 'react';
import {View,Text,TextInput,ScrollView,Pressable,StyleSheet,Alert,ActivityIndicator} from 'react-native';
import {StatusBar} from 'expo-status-bar';
import Storage from 'expo-sqlite/kv-store';
const core=require('../src/adaptive/core.js');
const bridge=require('../src/adaptive/bridge.js');
const key='mi-espanol-r7-native-preview-v1';
const day=()=>{
 const n=new Date(),d=new Date(n.getTime()-n.getTimezoneOffset()*60000);
 return d.toISOString().slice(0,10);
};
const newState=()=>({miAdaptive7:{schema:1,events:[],availableMinutes:15,createdAt:Date.now()}});
export default function App(){
 const [progress,setProgress]=useState(null);
 const [minutes,setMinutes]=useState('15');
 const [words,setWords]=useState('0');
 const [duration,setDuration]=useState('10');
 const [skill,setSkill]=useState('vocabulary');
 useEffect(()=>{(async()=>{try{
   const raw=await Storage.getItem(key);
   const data=raw?JSON.parse(raw):newState();const a=bridge.read(data);
   setProgress(data);setMinutes(String(a.availableMinutes));
 }catch(e){Alert.alert('Ошибка данных','Данные не изменены: '+e.message);}})();},[]);
 async function save(next){
  try{bridge.read(next);await Storage.setItem(key,JSON.stringify(next));setProgress(next);}
  catch(e){Alert.alert('Не удалось сохранить',e.message);}
 }
 if(!progress)return <View style={styles.loading}><ActivityIndicator/><Text>Загрузка локальных записей R7</Text></View>;
 const a=bridge.read(progress),report=core.weekSummary(a.events,day());
 const plan=core.dailyPlan({day:day(),availableMinutes:a.availableMinutes,due:[],nextLessonId:null});
 const Button=({children,onPress})=><Pressable accessibilityRole="button" onPress={onPress} style={styles.button}><Text style={styles.buttonText}>{children}</Text></Pressable>;
 return <ScrollView style={styles.root} contentContainerStyle={styles.container}>
  <StatusBar style="auto"/>
  <Text style={styles.eyebrow}>MI ESPAÑOL · R7 NATIVE PREVIEW</Text>
  <Text style={styles.title}>¡Buenos días!</Text>
  <Text style={styles.note}>Первые нативные экраны. Это отдельная тестовая база: данные HTML R6 пока не перенесены и не синхронизируются.</Text>
  <View style={styles.card}><Text style={styles.h}>Сегодня · {day()}</Text>
   <Text>Доступно минут: {a.availableMinutes} · назначено: {plan.assignedMinutes}</Text>
   <TextInput style={styles.input} keyboardType="number-pad" accessibilityLabel="Минут в день" value={minutes} onChangeText={setMinutes}/>
   <Button onPress={()=>{const n=Number(minutes);if(!Number.isInteger(n))return Alert.alert('Ошибка','Укажите целое число');try{save(bridge.setMinutes(progress,n));}catch(e){Alert.alert('Ошибка',e.message);}}}>Сохранить время</Button>
  </View>
  <View style={styles.card}><Text style={styles.h}>Твоя неделя</Text>
   <Text style={styles.big}>{report.minutes} мин</Text><Text>{report.activeDays} дней занятий · {report.wordsPracticed} слов в практике</Text>
   <Text style={styles.note}>Слова в практике не означают автоматически выученные слова.</Text>
  </View>
  <View style={styles.card}><Text style={styles.h}>Записать фактическое занятие</Text>
   <Text>Выбери навык:</Text>
   <View style={styles.chips}>{[['vocabulary','Слова'],['grammar','Грамматика'],['reading','Чтение'],['listening','Слушание'],['writing','Письмо'],['speaking','Разговор']].map(([v,label])=><Pressable key={v} onPress={()=>setSkill(v)} style={[styles.chip,skill===v&&styles.selected]}><Text style={skill===v?styles.light:null}>{label}</Text></Pressable>)}</View>
   <Text>Минуты</Text><TextInput value={duration} onChangeText={setDuration} accessibilityLabel="Фактические минуты" keyboardType="number-pad" style={styles.input}/>
   <Text>Слов в практике</Text><TextInput value={words} onChangeText={setWords} accessibilityLabel="Слова в практике" keyboardType="number-pad" style={styles.input}/>
   <Button onPress={()=>{const m=Number(duration),w=Number(words);
     if(!Number.isInteger(m)||m<0||m>180||!Number.isInteger(w)||w<0||w>500)return Alert.alert('Проверь данные','Минуты 0–180, слова 0–500');
     const event={id:'native-'+Date.now()+'-'+Math.random().toString(36).slice(2),day:day(),skill,minutes:m,words:w,attempted:0,correct:0,objective:false};
     save(bridge.add(progress,event,core));
   }}>Сохранить занятие</Button>
  </View>
  <Text style={styles.note}>Следующий этап: подключение исходных уроков, чтения, аудио, прогресса и резервных копий R6 через проверенный миграционный адаптер. Не заменяет HTML.</Text>
 </ScrollView>;
}
const styles=StyleSheet.create({
 root:{flex:1,backgroundColor:'#f2f6fb'},container:{paddingHorizontal:20,paddingTop:65,paddingBottom:70,gap:16},
 loading:{flex:1,alignItems:'center',justifyContent:'center',gap:12},
 eyebrow:{fontSize:11,letterSpacing:1.5,color:'#53708b',fontWeight:'700'},
 title:{fontSize:32,fontWeight:'800',color:'#183a62'},
 h:{fontSize:20,fontWeight:'700',color:'#183a62',marginBottom:10},
 card:{backgroundColor:'#fff',borderRadius:20,padding:18,gap:8},
 note:{fontSize:12,lineHeight:19,color:'#64748b'},big:{fontSize:34,fontWeight:'800',color:'#183a62'},
 input:{borderWidth:1,borderColor:'#bdcbd8',borderRadius:12,padding:12,fontSize:18,color:'#17375a'},
 button:{backgroundColor:'#173b63',padding:14,borderRadius:12,alignItems:'center'},
 buttonText:{color:'#fff',fontWeight:'700'},
 chips:{flexDirection:'row',flexWrap:'wrap',gap:7,marginVertical:8},
 chip:{borderRadius:12,padding:8,backgroundColor:'#eef2f7'},selected:{backgroundColor:'#173b63'},light:{color:'#fff'}
});
