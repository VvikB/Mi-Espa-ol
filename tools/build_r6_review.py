"""Separate correction artifact/report paths; the initially accepted R6 stays immutable."""
from audit import ROOT
from build import build as build_base
OUT=ROOT/'audit/r6-quality-review'
def build():
 return build_base(output=ROOT/'.audit/working/Mi_Espanol_R6_REVIEW.html',revision='R6',audit_dir=OUT)
if __name__=='__main__':build()
