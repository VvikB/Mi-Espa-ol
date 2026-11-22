import React, {useEffect,useMemo,useState} from 'react';
import {Modal,View,Text,Pressable,ScrollView,Image as RNImage,useWindowDimensions,StyleSheet,Platform} from 'react-native';
import {Image} from 'expo-image';
import originals from './originals';

export default function OriginalViewer({visible,initialId,onClose}){
 const {width}=useWindowDimensions();
 const [id,setId]=useState(initialId||originals.IDS[0]);
 const [scale,setScale]=useState(1);
 useEffect(()=>{if(visible&&originals.getOriginal(initialId)){setId(initialId);setScale(1);}},[visible,initialId]);
 const index=originals.IDS.indexOf(id);
 const asset=originals.getOriginal(id);
 const meta=asset?RNImage.resolveAssetSource(asset):null;
 const ratio=meta?.width>0&&meta?.height>0?meta.height/meta.width:1.4;
 const pictureWidth=Math.max(200,width-36)*scale;
 const pictureHeight=pictureWidth*ratio;
 function go(delta){
  const target=originals.IDS[index+delta];
  if(target){setId(target);setScale(1);}
 }
 return <Modal visible={!!visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
  <View style={s.screen}>
   <View style={s.header}>
    <Pressable accessibilityRole="button" onPress={onClose} style={s.button}><Text style={s.buttonText}>Готово</Text></Pressable>
    <View style={s.heading}><Text style={s.label}>Оригинальный лист · {index+1} / {originals.IDS.length}</Text><Text style={s.id}>{id}</Text></View>
   </View>
   <Text style={s.hint}>{Platform.OS==='ios'?'Увеличивай двумя пальцами или кнопками ±.':'Используй кнопки ± и прокручивай страницу.'} Исходное изображение не изменено.</Text>
   <ScrollView key={id+'-'+scale} horizontal={true} style={s.scroller} contentContainerStyle={{alignItems:'flex-start'}}>
    <ScrollView minimumZoomScale={1} maximumZoomScale={3} bouncesZoom={true} contentContainerStyle={{minHeight:pictureHeight,paddingBottom:18}}>
     {asset&&<Image source={asset} contentFit="contain" transition={150} style={{width:pictureWidth,height:pictureHeight,backgroundColor:'#ffffff'}} accessible accessibilityLabel={'Оригинальная грамматическая страница '+id}/>}
    </ScrollView>
   </ScrollView>
   <View style={s.controls}>
    <Pressable accessibilityRole="button" disabled={index<=0} onPress={()=>go(-1)} style={[s.button,index<=0&&s.disabled]}><Text style={s.buttonText}>‹ Назад</Text></Pressable>
    <Pressable accessibilityRole="button" onPress={()=>setScale(x=>Math.max(1,Math.round((x-.25)*100)/100))} style={s.button}><Text style={s.buttonText}>−</Text></Pressable>
    <Text style={s.zoom}>{Math.round(scale*100)}%</Text>
    <Pressable accessibilityRole="button" onPress={()=>setScale(x=>Math.min(3,Math.round((x+.25)*100)/100))} style={s.button}><Text style={s.buttonText}>＋</Text></Pressable>
    <Pressable accessibilityRole="button" disabled={index>=originals.IDS.length-1} onPress={()=>go(1)} style={[s.button,index>=originals.IDS.length-1&&s.disabled]}><Text style={s.buttonText}>Далее ›</Text></Pressable>
   </View>
  </View>
 </Modal>;
}
const s=StyleSheet.create({
 screen:{flex:1,backgroundColor:'#edf2f9',paddingTop:60,paddingBottom:32},
 header:{flexDirection:'row',alignItems:'center',paddingHorizontal:14,justifyContent:'space-between',gap:12},
 heading:{alignItems:'flex-end'},label:{fontSize:11,fontWeight:'700',color:'#52748e'},id:{fontSize:20,fontWeight:'800',color:'#15395d'},
 hint:{fontSize:12,color:'#64748b',padding:14,lineHeight:19},
 scroller:{flex:1,backgroundColor:'#dfe6ee'},
 controls:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',paddingHorizontal:10,paddingTop:12,gap:6},
 button:{backgroundColor:'#15395d',borderRadius:10,paddingVertical:12,paddingHorizontal:10,minWidth:45,alignItems:'center'},
 buttonText:{color:'white',fontWeight:'700',fontSize:12},disabled:{opacity:.4},zoom:{color:'#15395d',fontWeight:'800',fontSize:12}
});
