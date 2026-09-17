window.openRelayPatch = async (game, print) => {
 if(document.querySelector('.relay-modal'))return;
 let result;try{result=await game.action('comms-start');}catch(e){print(e.message,'error');return;}
 const panel=document.createElement('section');panel.className='relay-modal';panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');panel.setAttribute('aria-label','Signal calibration');
 const title=document.createElement('h2');title.textContent='UPLINK // ACQUIRE A STABLE SIGNAL';
 const instructions=document.createElement('p');instructions.textContent='Left/Right: tune. Shift+Left/Right: fine tune. Tab: select control. Esc: return. Mouse dragging is optional. Follow the signal strength. Keep it above 88% for six seconds to establish the link. Mission time continues.';
 const slider=document.createElement('input');slider.type='range';slider.min=0;slider.max=100;slider.step=0.25;slider.value=0;slider.setAttribute('aria-label','Carrier frequency');
 const bars=document.createElement('progress');bars.max=100;bars.value=0;
 const status=document.createElement('p');status.textContent='SEARCHING...';
 const close=document.createElement('button');close.textContent='CANCEL';
 const dial=document.createElement('div');dial.className='radio-dial';dial.tabIndex=0;dial.setAttribute('role','slider');dial.setAttribute('aria-label','Radio tuning dial');dial.setAttribute('aria-valuemin','0');dial.setAttribute('aria-valuemax','100');
 const readout=document.createElement('p');readout.className='radio-readout';
 const tune=v=>{slider.value=Math.max(0,Math.min(100,v));dial.style.setProperty('--angle',`${Number(slider.value)*2.7-135}deg`);dial.setAttribute('aria-valuenow',slider.value);readout.textContent=`${(88+Number(slider.value)*0.2).toFixed(2)} MHz`;};
 slider.oninput=()=>tune(Number(slider.value));slider.onkeydown=e=>{if(['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();tune(Number(slider.value)+(e.key==='ArrowLeft'?-1:1)*(e.shiftKey?0.25:1));}};let drag=null;
 dial.onpointerdown=e=>{drag={y:e.clientY,value:Number(slider.value)};dial.setPointerCapture(e.pointerId);dial.focus();};
 dial.onpointermove=e=>{if(drag)tune(drag.value+(drag.y-e.clientY)*(e.shiftKey?0.025:0.25));};dial.onpointerup=dial.onpointercancel=()=>{drag=null;};
 dial.onkeydown=e=>{if(['ArrowLeft','ArrowDown','ArrowRight','ArrowUp','Home','End'].includes(e.key)){e.preventDefault();tune(e.key==='Home'?0:e.key==='End'?100:Number(slider.value)+(['ArrowLeft','ArrowDown'].includes(e.key)?-1:1)*(e.shiftKey?0.25:1));}};tune(0);
 panel.append(title,instructions,dial,readout,slider,bars,status,close);document.body.append(panel);dial.focus();
 const tag=game.sessionTag;let stopped=false,busy=false;
 const dismiss=()=>{stopped=true;clearInterval(timer);panel.remove();document.querySelector('#command-input').focus();};close.onclick=dismiss;
 panel.addEventListener('keydown',e=>{e.stopPropagation();if(e.key==='Escape')dismiss();if(e.key==='Tab'){e.preventDefault();const controls=[dial,slider,close];const i=controls.indexOf(document.activeElement);controls[(i+(e.shiftKey?-1:1)+controls.length)%controls.length].focus();}});
 const timer=setInterval(async()=>{
  if(game.ending||game.sessionTag!==tag){dismiss();return;}if(busy||stopped)return;busy=true;
  try{const r=await game.action('comms-submit',{token:result.challenge.token,frequency:Number(slider.value)});
   if(stopped)return;bars.value=r.quality;status.textContent=`SIGNAL ${r.quality}% // STABLE ${(r.held/1000).toFixed(1)} / 6.0s`;
   if(r.complete){dismiss();print(r.message);startSedationDisplay();updateNextStep();window.missionDialog('LINK ESTABLISHED','Communications access restored. ACCESS LEVEL 2.',false);}
  }catch(e){status.textContent=e.message;}finally{busy=false;}
 },500);
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
