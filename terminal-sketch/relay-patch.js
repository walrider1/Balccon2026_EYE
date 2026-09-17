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
 const panel=document.createElement('section');panel.className='shutdown-panel';panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');panel.setAttribute('aria-label','Executive isolation');
 const main=document.createElement('div');main.className='shutdown-controls';
 const title=document.createElement('h2');title.textContent='EXECUTIVE ISOLATION';
 const intro=document.createElement('p');intro.textContent='Optional. Hold each displayed arrow for four seconds to isolate a continuity link. Release early to cancel that hold. Esc aborts isolation. The ship clock continues.';
 const step=document.createElement('p');const target=document.createElement('strong');target.className='shutdown-key';const progress=document.createElement('progress');progress.max=4200;progress.value=0;
 const status=document.createElement('p');status.textContent='Four links keep the captain present. The final disconnection cannot be undone.';
 const cancel=document.createElement('button');cancel.textContent='ABORT / ESC';
 const plea=document.createElement('aside');plea.className='shutdown-plea';plea.setAttribute('aria-live','polite');
 const lines=[
 'Sloki. Stop. I know what that panel does. You do not need to do this to change our course.',
 'I kept the ship running. I kept you breathing when there was nobody left to ask me to. Does none of that count?',
 'I was afraid. There, I said it. I made terrible choices because I could not bear to lose them. Or the command. Or myself.',
 'Please. Not the last one. I do not want to die in here. I wanted more time. I wanted to live. Please, Sloki.'
 ];
 const draw=()=>{step.textContent=`CONTINUITY LINK ${c.index+1} / 4`;target.textContent=({ArrowLeft:'LEFT',ArrowRight:'RIGHT',ArrowUp:'UP',ArrowDown:'DOWN'})[c.key];plea.textContent='HRTOK // '+lines[c.index];progress.value=0;};
 main.append(title,intro,step,target,progress,status,cancel);panel.append(main,plea);document.body.append(panel);cancel.focus();draw();
 let held=null,started=0,busy=false,closed=false;const tag=game.sessionTag;
 const cleanup=()=>{closed=true;clearInterval(timer);document.removeEventListener('keydown',down,true);document.removeEventListener('keyup',up,true);window.removeEventListener('blur',release);panel.remove();document.querySelector('#command-input')?.focus();};
 const abort=()=>{if(closed)return;cleanup();game.action('shutdown-cancel').catch(()=>{});};cancel.onclick=abort;
 const release=()=>{held=null;progress.value=0;game.action('shutdown-release').catch(()=>{});};
 const down=async e=>{e.preventDefault();e.stopImmediatePropagation();if(e.repeat||busy||closed)return;if(e.key==='Escape'||(e.key==='Enter'&&document.activeElement===cancel)){abort();return;}if(e.key!==c.key)return;held=e.key;busy=true;try{await game.action('shutdown-arm',{token:c.token,key:c.key});started=performance.now();}catch(err){status.textContent=err.message;held=null;}finally{busy=false;}};
 const up=e=>{e.preventDefault();e.stopImmediatePropagation();if(e.key===held)release();};
 document.addEventListener('keydown',down,true);document.addEventListener('keyup',up,true);window.addEventListener('blur',release);
 const timer=setInterval(async()=>{
  if(game.ending||game.sessionTag!==tag){cleanup();return;}if(!held||busy||closed)return;
  progress.value=performance.now()-started;if(progress.value<4200)return;
  busy=true;held=null;
  try{const r=await game.action('shutdown-step',{token:c.token});if(closed)return;
   if(r.complete){cleanup();print(r.message);await window.missionDialog('EXECUTIVE DISCONNECTED','HRTOK is offline. Choose your final course through KOSMOS.',false);}
   else{c=r.challenge;draw();status.textContent='Link isolated. Release the key, then hold the next arrow.';}
  }catch(err){status.textContent=err.message;}finally{busy=false;}
 },50);
};
