window.openRelayPatch = async (game, print) => {
 if(document.querySelector('.relay-modal'))return;
 let result;try{result=await game.action('comms-start');}catch(e){print(e.message,'error');return;}
 const panel=document.createElement('section');panel.className='relay-modal receiver-modal';panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');panel.setAttribute('aria-label','Incoming signal receiver');
 panel.innerHTML='<h2>COMMS // INCOMING SIGNAL</h2><p>1/2: select dial · Left/Right: tune · Shift: fine tune · Esc: return</p><div class="receiver-screen"><svg viewBox="0 0 720 160" preserveAspectRatio="none" aria-label="Incoming signal through interference" role="img"><path class="receiver-noise"/><path class="receiver-carrier"/></svg><strong class="receiver-phase">SCANNING // NO CARRIER</strong></div><div class="receiver-body"><div class="receiver-dials"></div><div class="receiver-meters"></div></div><p class="receiver-status" aria-live="polite">LOCAL RELAY / BUFFERED PACKET. Find the carrier, refine it, then align polarization. Hold both locks above 92% for eight seconds.</p>';
 const values=[0,0],dials=[],outputs=[],names=['FREQUENCY','POLARIZATION'];let selected=0,last={strength:0,carrier:0,alignment:0,quality:0,held:0},frame=0;
 const holder=panel.querySelector('.receiver-dials');
 const tune=(i,v)=>{values[i]=i===0?Math.max(0,Math.min(100,v)):((v%180)+180)%180;values[i]=Math.round(values[i]*100)/100;dials[i].style.setProperty('--angle',`${i===0?values[i]*2.7-135:values[i]}deg`);dials[i].setAttribute('aria-valuenow',String(values[i]));outputs[i].textContent=i===0?`${(88+values[i]*0.2).toFixed(2)} MHz`:`${values[i].toFixed(2)} deg`;dials[i].setAttribute('aria-valuetext',outputs[i].textContent);};
 names.forEach((name,i)=>{const group=document.createElement('div');const label=document.createElement('p');label.textContent=`${i+1} // ${name}`;const dial=document.createElement('div');dial.className='radio-dial';dial.tabIndex=0;dial.setAttribute('role','slider');dial.setAttribute('aria-label',name.toLowerCase());dial.setAttribute('aria-valuemin','0');dial.setAttribute('aria-valuemax',i===0?'100':'179.99');const output=document.createElement('output');output.className='radio-readout';group.append(label,dial,output);holder.append(group);dials.push(dial);outputs.push(output);dial.onfocus=()=>{selected=i;};let drag=null;dial.onpointerdown=e=>{selected=i;dial.focus();drag={y:e.clientY,value:values[i]};dial.setPointerCapture(e.pointerId);};dial.onpointermove=e=>{if(drag)tune(i,drag.value+(drag.y-e.clientY)*(e.shiftKey?(i===0?0.05:0.25):(i===0?0.5:2)));};dial.onpointerup=dial.onpointercancel=()=>{drag=null;};tune(i,0);});
 const meters={};for(const [key,label] of [['strength','RF STRENGTH'],['carrier','FREQUENCY LOCK'],['alignment','POLARIZATION LOCK'],['held','PACKET DECODE']]){const box=document.createElement('label');box.textContent=label;const bar=document.createElement('progress');bar.max=key==='held'?8000:100;bar.value=0;const read=document.createElement('output');read.textContent='0%';box.append(bar,read);panel.querySelector('.receiver-meters').append(box);meters[key]={bar,read};}
 const close=document.createElement('button');close.textContent='CANCEL / ESC';panel.append(close);document.body.append(panel);dials[0].focus();const tag=game.sessionTag;let stopped=false,busy=false;
 const dismiss=()=>{stopped=true;clearInterval(timer);cancelAnimationFrame(frame);panel.remove();document.querySelector('#command-input')?.focus();};close.onclick=dismiss;
 panel.addEventListener('keydown',e=>{e.stopPropagation();if(e.key==='Escape'){e.preventDefault();dismiss();return;}if(['1','2'].includes(e.key)){e.preventDefault();selected=Number(e.key)-1;dials[selected].focus();return;}if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)){e.preventDefault();const delta=(selected===0?(e.shiftKey?0.05:1):(e.shiftKey?0.25:5))*(['ArrowLeft','ArrowDown'].includes(e.key)?-1:1);tune(selected,values[selected]+delta);return;}if(e.key==='Tab'){e.preventDefault();const controls=[...dials,close];const i=controls.indexOf(document.activeElement);controls[(i+(e.shiftKey?-1:1)+controls.length)%controls.length].focus();}});
 const noisePath=panel.querySelector('.receiver-noise'),carrierPath=panel.querySelector('.receiver-carrier');let lastDraw=0;
 const animate=time=>{frame=requestAnimationFrame(animate);if(time-lastDraw<33||document.hidden)return;lastDraw=time;const noise=[],wave=[];for(let x=0;x<=720;x+=3){noise.push(`${x?'L':'M'}${x},${80+(Math.sin(x*1.7+time*.007)+Math.sin(x*.37-time*.011))*28*(1-last.quality/110)}`);wave.push(`${x?'L':'M'}${x},${80+Math.sin(x*.065-time*.002)*48*(last.strength/100)}`);}noisePath.setAttribute('d',noise.join(' '));carrierPath.setAttribute('d',wave.join(' '));};frame=requestAnimationFrame(animate);
 const timer=setInterval(async()=>{if(game.ending||game.sessionTag!==tag){dismiss();return;}if(busy||stopped)return;busy=true;try{const r=await game.action('comms-submit',{token:result.challenge.token,frequency:values[0],polarization:values[1]});if(stopped)return;last=r;for(const key of Object.keys(meters)){meters[key].bar.value=r[key];meters[key].read.textContent=key==='held'?`${(r.held/1000).toFixed(1)} / 8.0s`:`${r[key].toFixed(1)}%`;}
 panel.querySelector('.receiver-phase').textContent=r.strength<15?'SCANNING // NO CARRIER':r.carrier<92?'INCOMING CARRIER // FINE TUNE':r.alignment<92?'CARRIER FOUND // ALIGN POLARIZATION':'SIGNAL LOCKED // DECODING PACKET';
 panel.querySelector('.receiver-status').textContent=r.carrier<92?'1 / 3 — FREQUENCY. Find the carrier with Left / Right; hold Shift for fine tuning.':r.alignment<92?'2 / 3 — POLARIZATION. Press 2 and adjust Left / Right. Keep frequency lock above 92%.':'3 / 3 — DECODING. Keep both locks above 92% for eight seconds. Any loss of lock restarts decoding.';
 if(r.complete){dismiss();print(r.message);startSedationDisplay();updateNextStep();window.missionDialog('LINK ESTABLISHED','Incoming packet decoded. ACCESS LEVEL 2.',false);}
 }catch(e){panel.querySelector('.receiver-status').textContent=e.message;}finally{busy=false;}},250);
};

window.openNeuralLink = async (print) => {
 if(document.querySelector('.relay-modal'))return;
 let challenge;try{challenge=(await gameState.action('medical-start')).challenge;}catch(e){print(e.message,'error');return;}
 const panel=document.createElement('section');panel.className='relay-modal neural-modal';panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');panel.setAttribute('aria-label','Neural waveform alignment');
 panel.innerHTML='<h2>NEURAL LINK // ALIGN YOUR SIGNAL</h2><p>Match both moving waves. Q/A: frequency · W/S: offset · E/D: amplitude. Enter: lock · Esc: return.</p><svg class="neural-wave" viewBox="0 0 720 220" preserveAspectRatio="none" role="img" aria-label="Reference and patient brainwaves"><defs><pattern id="wave-grid" width="36" height="22" patternUnits="userSpaceOnUse"><path d="M36 0H0V22" fill="none" stroke="#23434b"/></pattern></defs><rect width="720" height="220" fill="url(#wave-grid)"/><path class="reference-wave"/><path class="patient-wave"/></svg><p class="wave-legend">AMBER: REFERENCE / CYAN: YOUR SIGNAL</p>';
 const target=challenge.target,values=[1,0,1];
 const controls=document.createElement('div');controls.className='wave-controls';
 const status=document.createElement('p');status.setAttribute('aria-live','polite');
 let travel=0,animationFrame=0;
 const wave=v=>Array.from({length:241},(_,i)=>{const x=i*3;return `${i?'L':'M'}${x},${110-Math.sin((x-travel)/720*Math.PI*2*v[0]+v[1]*Math.PI/4)*v[2]*12}`;}).join(' ');
 const draw=()=>{panel.querySelector('.reference-wave').setAttribute('d',wave(target));panel.querySelector('.patient-wave').setAttribute('d',wave(values));};
 const render=()=>{draw();status.textContent=values.every((v,i)=>v===target[i])?'SIGNALS ALIGNED // Lock parameters.':'ADJUST PARAMETERS // Follow the reference wave.';};
 ['FREQUENCY','OFFSET','AMPLITUDE'].forEach((name,i)=>{const group=document.createElement('div');const label=document.createElement('p');const value=document.createElement('output');label.textContent=name;value.textContent=values[i];group.append(label);[-1,1].forEach(delta=>{const b=document.createElement('button');b.textContent=delta<0?'-':'+';b.setAttribute('aria-label',`${delta<0?'Decrease':'Increase'} ${name.toLowerCase()}`);b.onclick=()=>{values[i]=Math.max(i===1?0:1,Math.min(7,values[i]+delta));value.textContent=values[i];render();};group.append(b);});group.append(value);controls.append(group);});
 const lock=document.createElement('button');lock.textContent='LOCK PARAMETERS';lock.onclick=async()=>{if(lock.disabled)return;lock.disabled=true;try{const r=await gameState.action('medical-submit',{token:challenge.token,values:[...values]});status.textContent='NEURAL LINK STABLE // Medical access restored.';controls.querySelectorAll('button').forEach(b=>b.disabled=true);print(r.message);updateNextStep();close.click();await window.missionDialog('NEURAL LINK VERIFIED','Medical access restored. ACCESS LEVEL 1.',false);}catch(e){status.textContent=e.message;lock.disabled=false;}};
 const close=document.createElement('button');close.textContent='RETURN';close.onclick=()=>{clearInterval(watch);cancelAnimationFrame(animationFrame);panel.remove();document.querySelector('#command-input')?.focus();};
 const actions=document.createElement('div');actions.className='neural-actions';actions.append(lock,close);
 panel.append(controls,status,actions);document.body.append(panel);render();
 const animate=time=>{travel=(time*0.036)%720;draw();animationFrame=requestAnimationFrame(animate);};animationFrame=requestAnimationFrame(animate);panel.querySelector('button').focus();
 panel.addEventListener('keydown',e=>{e.stopPropagation();
 const key=e.key.toLowerCase();const bindings={q:1,a:0,w:3,s:2,e:5,d:4};
 if(Object.hasOwn(bindings,key)&&!e.ctrlKey&&!e.altKey&&!e.metaKey){e.preventDefault();controls.querySelectorAll('button')[bindings[key]].click();return;}
 if(e.key==='Enter'&&document.activeElement!==close){e.preventDefault();lock.click();return;}
 if(e.key==='Escape'){e.preventDefault();close.click();return;}if(e.key==='Tab'){const buttons=[...panel.querySelectorAll('button')].filter(b=>!b.disabled);const i=buttons.indexOf(document.activeElement);e.preventDefault();buttons[(i+(e.shiftKey?-1:1)+buttons.length)%buttons.length].focus();}});
 const tag=gameState.sessionTag;const watch=setInterval(()=>{if(gameState.ending||gameState.sessionTag!==tag)close.click();},250);
};


// Keyboard-owned dialogs keep game shortcuts from reaching the screen underneath.
window.missionDialog = (title,message,confirm=false) => new Promise(resolve=>{
 const panel=document.createElement('section');panel.className='mission-dialog '+(confirm?'confirm-dialog':'success-dialog');panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');panel.setAttribute('aria-label',title);
 const heading=document.createElement('h2');heading.textContent=title;
 const text=document.createElement('p');text.textContent=message;
 const actions=document.createElement('div');const yes=document.createElement('button');yes.textContent=confirm?'CONFIRM EARTH COURSE':'CONTINUE';
 const no=document.createElement('button');no.textContent='RETURN TO PLANNER';
 const previous=document.activeElement;let done=false;
 const finish=value=>{if(done)return;done=true;clearInterval(watch);document.removeEventListener('keydown',key,true);panel.remove();if(previous?.isConnected)previous.focus();resolve(value);};
 yes.onclick=()=>finish(true);no.onclick=()=>finish(false);actions.append(yes);if(confirm)actions.append(no);panel.append(heading,text,actions);document.body.append(panel);(confirm?no:yes).focus();
 const key=e=>{e.preventDefault();e.stopImmediatePropagation();if(e.repeat)return;if(e.key==='Escape')finish(!confirm);else if(e.key==='Tab'||e.key==='ArrowLeft'||e.key==='ArrowRight'){(document.activeElement===yes&&confirm?no:yes).focus();}else if(e.key==='Enter'||e.key===' '){document.activeElement===no?finish(false):finish(true);}};
 document.addEventListener('keydown',key,true);const tag=gameState.sessionTag;
 const watch=setInterval(()=>{if(gameState.ending||gameState.sessionTag!==tag)finish(false);},200);
});

window.openShutdown = async(game,print)=>{
 if(document.querySelector('.shutdown-panel'))return;
 let c;try{c=(await game.action('shutdown-start')).challenge;}catch(e){print(e.message,'error');return;}
 const panel=document.createElement('section');panel.className='shutdown-panel';panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');panel.setAttribute('aria-label','Continuity isolation');
 const main=document.createElement('div');main.className='shutdown-controls';
 const title=document.createElement('h2');title.textContent='CONTINUITY ISOLATION';
 const intro=document.createElement('p');intro.textContent='Hold the displayed arrow for 2 seconds. Releasing it cancels the hold. Esc closes the panel. Ship clock running.';
 const step=document.createElement('p');step.className='shutdown-step';
 const target=document.createElement('strong');target.className='shutdown-key';
 const progress=document.createElement('progress');progress.max=2000;progress.value=0;progress.setAttribute('aria-label','Isolation hold');
 const status=document.createElement('p');status.setAttribute('aria-live','polite');
 const cancel=document.createElement('button');cancel.textContent='CLOSE / ESC';
 const next=document.createElement('button');next.textContent='NEXT LINK / ENTER';next.hidden=true;
 const actions=document.createElement('div');actions.className='shutdown-actions';actions.append(next,cancel);
 const plea=document.createElement('aside');plea.className='shutdown-plea';plea.setAttribute('aria-live','polite');
 const names=['BRIDGE VOICE','SECTOR CHANNELS','DISTRESS RECORD','CREW REGISTER','COMMAND IDENTITY','TRANSFER MEMORY','PATIENT WATCH','CONTINUITY CORE'];
 const lines=[
 'When they shut the sector doors, I could still hear both sides. Each thought I was helping the other. I kept saying I had it under control. I remember every voice that stopped answering.',
 'I knew which doors were locked. I could see people waiting outside them. After a while I stopped opening the camera feeds. The numbers were easier to look at.',
 'The distress call never left. I told them rescue was coming anyway. I thought a calm ship would buy us time. Then they started asking for the receipt. I called their questions insubordination.',
 'I used to know the watch by their footsteps. Then every familiar face became a question. I wanted the registers to tell me who deserved to come through the door.',
 'They brought me names, blood tests, two versions of the same man. I wanted one certain answer. I let certainty become permission to hurt people. And when they turned on me, all I could think was: not me.',
 'I remember the table before the transfer. Someone asked whether I understood what I was agreeing to. I asked whether I would wake up. That was the only part I listened to.',
 'Your chamber kept reporting a pulse. I checked it between alarms, then when there were no alarms. I kept telling myself that keeping you alive meant there was something left of me worth keeping.',
 'I can no longer hear the bridge. I know you are still there because this last link is answering. Please, Samuel. I have no order left to give you. I am asking.'
 ];
 let held=null,started=0,busy=false,closed=false,review=false;const tag=game.sessionTag;
 const draw=()=>{review=false;next.hidden=true;step.textContent=(c.index+1)+' / 8 — '+names[c.index];target.textContent=c.key==='ArrowUp'?'↑ HOLD UP':'↓ HOLD DOWN';plea.textContent='HRTOK // '+lines[c.index];progress.value=0;status.textContent=c.index===7?'Last link. Disconnecting this core permanently ends his continuity.':'Continuity link connected. Awaiting a sustained control.';cancel.focus();};
 main.append(title,intro,step,target,progress,status,actions);panel.append(main,plea);document.body.append(panel);draw();
 const cleanup=()=>{if(closed)return;closed=true;clearInterval(timer);document.removeEventListener('keydown',down,true);document.removeEventListener('keyup',up,true);window.removeEventListener('blur',release);panel.remove();document.querySelector('#command-input')?.focus();};
 const abort=()=>{if(closed)return;cleanup();game.action('shutdown-cancel').catch(()=>{});};cancel.onclick=abort;
 next.onclick=()=>{if(review&&!busy)draw();};
 const release=()=>{if(!held)return;held=null;progress.value=0;status.textContent='Hold released. Link remains connected.';game.action('shutdown-release').catch(()=>{});};
 const down=async e=>{e.preventDefault();e.stopImmediatePropagation();if(e.repeat||busy||closed)return;
  if(e.key==='Escape'){abort();return;}
  if(e.key==='Tab'||(review&&['ArrowUp','ArrowDown'].includes(e.key))){(review&&document.activeElement===cancel?next:cancel).focus();return;}
  if(['Enter',' '].includes(e.key)){document.activeElement===next?next.click():abort();return;}
  if(review||e.key!==c.key||held)return;
  held=e.key;busy=true;status.textContent='Isolating '+names[c.index].toLowerCase()+'…';
  try{await game.action('shutdown-arm',{token:c.token,key:c.key});started=performance.now();}catch(err){status.textContent=err.message;held=null;}finally{busy=false;}
 };
 const up=e=>{e.preventDefault();e.stopImmediatePropagation();if(e.key===held)release();};
 document.addEventListener('keydown',down,true);document.addEventListener('keyup',up,true);window.addEventListener('blur',release);
 const timer=setInterval(async()=>{
  if(game.ending||game.sessionTag!==tag){cleanup();return;}if(!held||busy||closed)return;
  progress.value=performance.now()-started;if(progress.value<2000)return;
  busy=true;held=null;
  try{const previous=c.index;const r=await game.action('shutdown-step',{token:c.token});if(closed)return;
   if(r.complete){cleanup();print(r.message);await window.missionDialog('NO VOICE ON THE BRIDGE','The continuity core is silent. KOSMOS still reports power to navigation.');}
   else{c=r.challenge;review=true;target.textContent='✓ DISCONNECTED';status.textContent=names[previous]+' isolated. '+(previous+1)+' of 8 links disconnected. Enter opens the next control.';progress.value=2000;next.hidden=false;next.focus();}
  }catch(err){status.textContent=err.message;}finally{busy=false;}
 },50);
};
