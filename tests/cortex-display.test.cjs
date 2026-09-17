const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
function fixture(){
 const source=fs.readFileSync('terminal-sketch/app.js','utf8');const start=source.indexOf('const cortexGame = {'),end=source.indexOf('const plannerGame = {',start);
 const style={},timers=[],classes=new Set();
 const ctx=vm.createContext({Date:{now:()=>1000},console,
 window:{setTimeout:(fn,delay)=>{timers.push({fn,delay});return timers.length;},clearTimeout:()=>{}},
 cortexPulse:{textContent:'',className:'',style:{setProperty:(k,v)=>style[k]=v},offsetWidth:42,classList:{add:k=>classes.add(k),remove:k=>classes.delete(k)}},
 cortexTrack:{clientWidth:600,classList:{add:()=>{},remove:()=>{}}},cortexStatus:{textContent:''},
 gameState:{clockOffset:0},sfx:{play:()=>{}}});
 vm.runInContext(source.slice(start,end)+';globalThis.subject=cortexGame;',ctx);return {ctx,game:ctx.subject,style,timers,classes};
}
test('Cortex animation uses each server window and offsets elapsed delivery time',()=>{
 const f=fixture();Object.assign(f.game,{active:true,signalIndex:0,hits:0,challenge:{target:'a',issuedAt:900,expiresAt:3000}});f.game.nextSignal();
 assert.equal(f.style['--cortex-duration'],'2100ms');assert.equal(f.style['--cortex-delay'],'-100ms');assert.equal(f.style['--cortex-distance'],'468px');assert.equal(f.timers.at(-1).delay,2000);assert.ok(f.classes.has('pulse-active'));
 f.game.challenge={target:'s',issuedAt:1000,expiresAt:1865};f.game.nextSignal();assert.equal(f.style['--cortex-duration'],'865ms');assert.equal(f.style['--cortex-delay'],'0ms');
});
test('Cortex shows a waiting state and ignores extra keys during server acknowledgement',async()=>{
 const f=fixture();let resolve,count=0;f.ctx.gameState.action=()=>{count++;return new Promise(r=>resolve=r);};
 Object.assign(f.game,{active:true,target:'a',hits:0,challenge:{token:'test'}});
 const pending=f.game.resolve('a');assert.equal(f.game.target,null);assert.match(f.ctx.cortexStatus.textContent,/CHECKING RESPONSE/);
 await f.game.resolve('a');assert.equal(count,1);
 resolve({index:1,hits:1,misses:0,done:false,challenge:{target:'s',issuedAt:1250,expiresAt:3285}});await pending;
 assert.match(f.ctx.cortexStatus.textContent,/RESPONSE ACCEPTED/);assert.equal(f.timers.at(-1).delay,250);
});
