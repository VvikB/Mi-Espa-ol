// Run the established storage suite, redirecting only its generated evidence.
const fs=require('node:fs'),path=require('node:path'),Module=require('node:module');
const file=path.resolve(__dirname,'../tests/storage.test.cjs');
const source=fs.readFileSync(file,'utf8').replaceAll('audit/restoration-r3','audit/r6-quality-review/unit-verification-2026-11-07');
const runner=new Module(file,module);runner.filename=file;runner.paths=Module._nodeModulePaths(path.dirname(file));runner._compile(source,file);
