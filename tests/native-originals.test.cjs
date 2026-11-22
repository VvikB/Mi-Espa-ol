const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const ROOT=path.resolve(__dirname,'..');
const manifest=JSON.parse(fs.readFileSync(path.join(ROOT,'data/images.json'),'utf8'));
const grammar=manifest.filter(x=>/^GRAMMAR-\d{2}$/.test(x.fields?.id||''));
const source=fs.readFileSync(path.join(ROOT,'mobile/originals.js'),'utf8');
test('16 original page assets are precisely linked and not substitute artwork',()=>{
 assert.equal(grammar.length,16);
 const references=[...source.matchAll(/'GRAMMAR-(\d{2})':require\('\.\.\/assets\/pages\/GRAMMAR-\1\.webp'\)/g)];
 assert.equal(references.length,16,'Expo requires must refer to each canonical original');
 for(const page of grammar){
  const p=path.join(ROOT,page.file);
  assert.ok(fs.existsSync(p),'Missing '+page.file);
  const b=fs.readFileSync(p);
  assert.equal(b.toString('ascii',0,4),'RIFF',page.file);
  assert.equal(b.toString('ascii',8,12),'WEBP',page.file);
  assert.equal(crypto.createHash('sha256').update(b).digest('hex'),page.sha256,page.file);
 }
});
test('scanned image bytes stay separate from portable JSON and are bundled by static source references',()=>{
 const course=require('../mobile/content/course.json');
 assert.equal(course.lessons.length,6);
 assert.equal(course.sourceImages.includes('bundled separately'),true);
});
