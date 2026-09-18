const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync('terminal-sketch/app.js', 'utf8');
const fn = source.slice(source.indexOf('function restoreKeyboardFocus() {'), source.indexOf("window.addEventListener('focus',"));
function fixture() {
  const calls = [];
  const input = name => ({ disabled:false, focus:()=>calls.push(name) });
  const state = {document:{hidden:false, body:{}, documentElement:{}, querySelector:()=>null},
    resetInProgress:false, bootScreen:{classList:{contains:()=>false}},
    bootInput:input('boot'), commandInput:input('command'), centralInput:input('central'),
    game:{classList:{contains:()=>false}}, gameState:{ending:false}, activeChannel:'command'};
  state.document.activeElement=state.document.body;
  vm.createContext(state);vm.runInContext(fn,state);
  return {state,calls,restore:()=>state.restoreKeyboardFocus()};
}
test('startup restores boot input and ready game restores terminal input',()=>{
 const f=fixture();f.restore();assert.deepEqual(f.calls,['boot']);
 f.state.bootScreen.classList.contains=()=>true;f.restore();assert.deepEqual(f.calls,['boot','command']);
});
test('focus recovery preserves user selection and modal focus',()=>{
 const f=fixture();f.state.document.activeElement={disabled:false,getClientRects:()=>[{}]};
 f.restore();assert.equal(f.calls.length,0);
 f.state.document.activeElement=f.state.document.body;
 f.state.bootScreen.classList.contains=()=>true;f.state.document.querySelector=()=>({});
 f.restore();assert.equal(f.calls.length,0);
});
test('disabled and hidden inputs are not focused; AI channel is preserved',()=>{
 const f=fixture();f.state.bootInput.disabled=true;f.restore();assert.equal(f.calls.length,0);
 f.state.bootScreen.classList.contains=()=>true;f.state.activeChannel='central';
 f.restore();assert.deepEqual(f.calls,['central']);
 f.state.document.hidden=true;f.restore();assert.equal(f.calls.length,1);
});
