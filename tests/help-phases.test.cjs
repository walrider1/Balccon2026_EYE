const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
test('help highlights phase-specific usages in the full list without solved commands',()=>{
 const ctx=vm.createContext({window:{}});
 vm.runInContext(fs.readFileSync('terminal-sketch/commands.js','utf8'),ctx);
 const commands=vm.runInContext('createCommands()',ctx);
 assert.equal(commands.some(c=>c.name==='hint'),false);
 const registry={commands:new Map(commands.map(c=>[c.name,c]))};
 const help=commands.find(c=>c.name==='help');
 for(const [medical,comms,cortex,root,expected] of [
  [false,false,false,false,['ls','cd','cat','auth','run']],
  [true,false,false,false,['ls','cd','cat','auth','run']],
  [true,true,false,false,['run','auth']],
  [true,true,true,false,['root']],
  [true,true,true,true,['ls','cat','run','central','course']]
 ]){
  const rows=[];
  help.run({registry,game:{rootShares:{medical,comms,cortex},rootRecovered:root},print:(...args)=>rows.push(args)});
  const selected=rows.filter(r=>r[1]==='help-relevant').map(r=>r[2].split(' ')[0]).sort();
  assert.deepEqual(selected,expected.sort());
  assert.equal(rows.length,commands.filter(c=>c.showInHelp!==false).length+2);
  assert.doesNotMatch(rows.map(r=>r[0]).join('\n'),/MR-07-0412|cat \/medical|auth cortex CORTEX/);
 }
});

test('authentication help explains syntax without attempting authorization',async()=>{
 const ctx=vm.createContext({window:{}});
 vm.runInContext(fs.readFileSync('terminal-sketch/commands.js','utf8'),ctx);
 const auth=vm.runInContext('createCommands()',ctx).find(c=>c.name==='auth');
 const output=[];
 await auth.run({game:{ending:false,authorize:()=>assert.fail('Help must not authorize')},args:['help'],print:t=>output.push(t)});
 assert.match(output.join(''),/Domain selects the controller/);
 assert.doesNotMatch(output.join(''),/MR-07-0412/);
 assert.ok(auth.aliases.includes('authentication'));
});
