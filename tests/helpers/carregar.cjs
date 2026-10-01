const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const cache = new Map();
function carregar(relative) {
  const filename = path.resolve(__dirname,'../..',relative);
  if (cache.has(filename)) return cache.get(filename).exports;
  const module = { exports: {} }; cache.set(filename,module);
  const source=ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
  const localRequire=(name)=>name==='zustand/middleware' ? {persist:initialize=>initialize} : name.startsWith('@/') ? carregar('src/'+name.slice(2)+'.ts') : require(name);
  vm.runInThisContext(`(function(require,module,exports){${source}\n})`,{filename})(localRequire,module,module.exports);
  return module.exports;
}
module.exports={carregar};
