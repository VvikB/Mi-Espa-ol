#!/usr/bin/env python3
"""Hash all non-ignored project files. Manifest excludes itself to avoid self-reference."""
from audit import ROOT,sha,write_json
import subprocess
excluded={'audit/project-files.json'}
paths=subprocess.check_output(['git','ls-files','--cached','--others','--exclude-standard','-z'],cwd=ROOT).decode().split('\0')
rows=[]
for path in sorted(set(paths)-excluded-{''}):
    p=ROOT/path
    if p.is_file():rows.append({'path':path,'bytes':p.stat().st_size,'sha256':sha(p.read_bytes())})
write_json(ROOT/'audit/project-files.json',rows)
print(f'{len(rows)} project files hashed; manifest itself deliberately excluded')
