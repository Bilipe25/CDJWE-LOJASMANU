const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const cache = new Map();
function carregar(relative, overrides = {}) {
  const filename = path.resolve(__dirname,'../..',relative);
  if (cache.has(filename)) return cache.get(filename).exports;
  const module = { exports: {} }; cache.set(filename,module);
  const source=ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,esModuleInterop:true}}).outputText;
  const localRequire=(name)=>Object.hasOwn(overrides,name) ? overrides[name] : name==='zustand/middleware' ? {persist:initialize=>initialize} : name.startsWith('@/') ? carregar('src/'+name.slice(2)+'.ts',overrides) : name.startsWith('.') ? carregar(path.relative(path.resolve(__dirname,'../..'),path.resolve(path.dirname(filename),name+'.ts')),overrides) : require(name);
  vm.runInThisContext(`(function(require,module,exports){${source}\n})`,{filename})(localRequire,module,module.exports);
  return module.exports;
}
module.exports={carregar};
