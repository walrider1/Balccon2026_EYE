const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
test('help highlights phase-specific usages in the full list without solved commands',()=>{
 const ctx=vm.createContext({window:{}});
 vm.runInContext(fs.readFileSync('terminal-sketch/commands.js','utf8'),ctx);
 const commands=vm.runInContext('createCommands()',ctx);
 const registry={commands:new Map(commands.map(c=>[c.name,c]))};
 const help=commands.find(c=>c.name==='help');
 for(const [medical,comms,cortex,root,expected] of [
  [false,false,false,false,['hint','ls','cd','cat','auth']],
  [true,false,false,false,['hint','ls','cd','cat','auth']],
  [true,true,false,false,['hint','run','auth']],
  [true,true,true,false,['hint','root']],
  [true,true,true,true,['hint','cat','run']]
 ]){
  const rows=[];
  help.run({registry,game:{rootShares:{medical,comms,cortex},rootRecovered:root},print:(...args)=>rows.push(args)});
  const selected=rows.filter(r=>r[1]==='help-relevant').map(r=>r[2].split(' ')[0]).sort();
  assert.deepEqual(selected,expected.sort());
  assert.equal(rows.length,commands.filter(c=>c.showInHelp!==false).length+2);
  assert.doesNotMatch(rows.map(r=>r[0]).join('\n'),/MR-07-0412|cat \/medical|auth cortex CORTEX/);
 }
});
