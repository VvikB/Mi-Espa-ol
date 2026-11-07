"""Reuse the complete six-lesson flow against the corrected artifact and report scope."""
from audit import ROOT
text=(ROOT/'tools/test_lessons.py').read_text().replace('from build import build','from build_r6_review import build').replace("artifact,manifest=build(revision='R6')","artifact,manifest=build()")
text=text.replace('restoration-r6','r6-quality-review')
exec(compile(text,str(ROOT/'tools/test_lessons.py'),'exec'),{'__name__':'__main__','__file__':str(ROOT/'tools/test_lessons.py')})
