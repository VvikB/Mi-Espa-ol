#!/usr/bin/env python3
"""Additive preview of R7 on top of R6. Never overwrite R6-reviewed ZIP/HTML."""
from pathlib import Path
import subprocess, tempfile
from build import build
from audit import ROOT

def main():
    out=ROOT/'.audit/working/Mi_Espanol_R7_WEB_PREVIEW.html'
    out,_=build(output=out,revision='R6',audit_dir=ROOT/'audit/r7-preview')
    js='\n'.join((ROOT/'src/adaptive'/p).read_text(encoding='utf-8')
                 for p in ('core.js','bridge.js','web.js'))
    with tempfile.TemporaryDirectory() as tmp:
        p=Path(tmp)/'r7.js'
        p.write_text(js,encoding='utf-8')
        subprocess.run(['node','--check',str(p)],check=True)
    html=out.read_text(encoding='utf-8')
    if html.count('</body>')!=1: raise ValueError('Unexpected HTML shell')
    # Inline script, same offline behavior as the existing R6 HTML.
    safe=js.replace('</script','<\\/script')
    out.write_text(html.replace('</body>','<script>\n'+safe+'\n</script></body>'),encoding='utf-8')
    print('R7 WEB PREVIEW:',out)
if __name__=='__main__':main()
