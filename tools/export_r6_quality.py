"""Export the corrected review packet without touching the first R6 report."""
from audit import ROOT
text=(ROOT/'tools/export_lessons.py').read_text().replace("docs/r6/","docs/r6-quality-review/").replace("audit/restoration-r6/","audit/r6-quality-review/")
# Include the scaffolds and preserved optional explanations in the reviewer packet.
text=text.replace("if l.get('alphabet'):", "for e in l['explanations']:\n   if e.get('referenceText'):out+=['Справка (не обязательное заучивание): '+e['referenceText'],'']\n  for support in l.get('scaffolding',[]):out+=['### '+support['title'],'']+['- '+es+' — '+ru for es,ru in support['entries']]+['']\n  if l.get('finalListening'):out+=['### Новый аудиоконтроль (текст открыт только в пакете проверки)','',l['finalListening']['text'],'']\n  if l.get('alphabet'):")
exec(compile(text,str(ROOT/'tools/export_lessons.py'),'exec'),{'__name__':'__main__','__file__':str(ROOT/'tools/export_lessons.py')})
