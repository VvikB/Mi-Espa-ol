#!/usr/bin/env python3
"""Transport large archives without changing their content. Python 3 standard library."""
import argparse,hashlib,json
from pathlib import Path

def digest(path):
    h=hashlib.sha256()
    with path.open('rb') as f:
        for block in iter(lambda:f.read(1024*1024),b''):h.update(block)
    return h.hexdigest()

def split(source,directory,mib=20):
    directory.mkdir(parents=True,exist_ok=False)
    parts=[]
    with source.open('rb') as f:
        for i,block in enumerate(iter(lambda:f.read(mib*1024*1024),b'')):
            p=directory/f'part-{i:04d}.bin';p.write_bytes(block)
            parts.append({'name':p.name,'bytes':len(block),'sha256':digest(p)})
    manifest={'original_name':source.name,'bytes':source.stat().st_size,'sha256':digest(source),'parts':parts}
    (directory/'parts.json').write_text(json.dumps(manifest,indent=2))
    return manifest

def join(manifest_path,output):
    manifest=json.loads(manifest_path.read_text())
    # Validate each part before creating output; never overwrite an existing archive.
    paths=[]
    for entry in manifest['parts']:
        if Path(entry['name']).name!=entry['name']:raise ValueError('Unsafe part path')
        p=manifest_path.parent/entry['name']
        if p.stat().st_size!=entry['bytes'] or digest(p)!=entry['sha256']:raise ValueError('Invalid part: '+p.name)
        paths.append(p)
    try:
        with output.open('xb') as target:
            for p in paths:
                with p.open('rb') as f:
                    for block in iter(lambda:f.read(1024*1024),b''):target.write(block)
        if output.stat().st_size!=manifest['bytes'] or digest(output)!=manifest['sha256']:raise ValueError('Combined SHA-256 mismatch; output is unverified')
    except FileExistsError:raise
    return manifest['sha256']

if __name__=='__main__':
    p=argparse.ArgumentParser();sub=p.add_subparsers(dest='cmd',required=True)
    a=sub.add_parser('split');a.add_argument('source',type=Path);a.add_argument('directory',type=Path)
    a=sub.add_parser('join');a.add_argument('manifest',type=Path);a.add_argument('output',type=Path)
    args=p.parse_args()
    print(split(args.source,args.directory) if args.cmd=='split' else join(args.manifest,args.output))
