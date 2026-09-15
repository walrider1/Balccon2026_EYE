const message = document.querySelector('#message');
const controls = document.querySelector('#controls');
const login = document.querySelector('#login');
let busy = false;
async function call(action, fields = {}) {
  const response = await fetch('/api/admin', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({action,...fields}), signal: AbortSignal.timeout(10000) });
  const data = await response.json();
  if (!response.ok) {
    if (response.status === 401) { controls.hidden=true; login.hidden=false; }
    throw new Error(data.error || 'Server nije dostupan.');
  }
  return data;
}
async function status() {
  const data = await call('status');
  controls.hidden=false; login.hidden=true;
  const h = data.history;
  document.querySelector('#history').textContent = h ? `Sačuvano: ${h.total}/${h.retention}\nProsečno trajanje: ${Math.round(h.averageDurationMs/60000)} min\nIshodi: ${JSON.stringify(h.outcomes)}\n\n` + h.runs.slice(0,20).map(r=>`${new Date(r.endedAt).toLocaleString()} | ${r.outcome} | ${r.replayVariant || 'legacy'} | ${Math.round(r.durationMs/1000)} s | zapisi ${r.recordsRead} | ROOT ${r.rootRecovered}`).join('\n') : 'Nema istorije.';
  document.querySelector('#status').textContent = data.game
    ? `Pristup: ${data.game.access}\nROOT: ${data.game.rootRecovered}\n${data.game.objective.text}\nZavršetak: ${data.game.endingKind || 'nije završen'}\nAI API podešen: ${data.ai.configured}`
    : `U ovom browser profilu nema partije.\nAI API podešen: ${data.ai.configured}`;
}
async function perform(task) {
  if (busy) return; busy=true; message.textContent='';
  try { await task(); } catch(error) { message.textContent=error.message; }
  finally { busy=false; }
}
login.addEventListener('submit', event => { event.preventDefault(); perform(async () => {
  const input=document.querySelector('#password'); const password=input.value; input.value='';
  await call('login',{password}); await status();
}); });
document.querySelector('#refresh').onclick=()=>perform(status);
document.querySelector('#logout').onclick=()=>perform(async()=>{await call('logout');controls.hidden=true;login.hidden=false;});
document.querySelector('#reset').onclick=()=>perform(async()=>{
  if(!document.querySelector('#confirm-reset').checked) throw new Error('Potvrdi novu partiju.');
  await call('reset'); window.location.assign('/');
});
document.querySelector('#stop').onclick=()=>perform(async()=>{
  if(!document.querySelector('#confirm-stop').checked) throw new Error('Potvrdi zaustavljanje servera.');
  await call('stop'); controls.hidden=true; login.hidden=true; message.textContent='Server je zaustavljen. Sačuvani napredak ostaje na uređaju.';
});
perform(status);
