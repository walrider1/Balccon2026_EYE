window.openRelayPatch = async (game, print) => {
 if(document.querySelector('.relay-modal'))return;
 let result;try{result=await game.action('comms-start');}catch(e){print(e.message,'error');return;}
 const panel=document.createElement('section');panel.className='relay-modal';panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');panel.setAttribute('aria-label','Signal calibration');
 const title=document.createElement('h2');title.textContent='UPLINK // ACQUIRE A STABLE SIGNAL';
 const instructions=document.createElement('p');instructions.textContent='Tune the carrier with Left/Right or drag the radio dial vertically (Shift for fine tuning). Follow the signal strength. Keep it above 88% for six seconds to establish the link. Mission time continues.';
 const slider=document.createElement('input');slider.type='range';slider.min=0;slider.max=100;slider.step=0.25;slider.value=0;slider.setAttribute('aria-label','Carrier frequency');
 const bars=document.createElement('progress');bars.max=100;bars.value=0;
 const status=document.createElement('p');status.textContent='SEARCHING...';
 const close=document.createElement('button');close.textContent='CANCEL';
 const dial=document.createElement('div');dial.className='radio-dial';dial.tabIndex=0;dial.setAttribute('role','slider');dial.setAttribute('aria-label','Radio tuning dial');dial.setAttribute('aria-valuemin','0');dial.setAttribute('aria-valuemax','100');
 const readout=document.createElement('p');readout.className='radio-readout';
 const tune=v=>{slider.value=Math.max(0,Math.min(100,v));dial.style.setProperty('--angle',`${Number(slider.value)*2.7-135}deg`);dial.setAttribute('aria-valuenow',slider.value);readout.textContent=`${(88+Number(slider.value)*0.2).toFixed(2)} MHz`;};
 slider.oninput=()=>tune(Number(slider.value));let drag=null;
 dial.onpointerdown=e=>{drag={y:e.clientY,value:Number(slider.value)};dial.setPointerCapture(e.pointerId);dial.focus();};
 dial.onpointermove=e=>{if(drag)tune(drag.value+(drag.y-e.clientY)*(e.shiftKey?0.025:0.25));};dial.onpointerup=dial.onpointercancel=()=>{drag=null;};
 dial.onkeydown=e=>{if(['ArrowLeft','ArrowDown','ArrowRight','ArrowUp','Home','End'].includes(e.key)){e.preventDefault();tune(e.key==='Home'?0:e.key==='End'?100:Number(slider.value)+(['ArrowLeft','ArrowDown'].includes(e.key)?-1:1)*(e.shiftKey?0.25:1));}};tune(0);
 panel.append(title,instructions,dial,readout,slider,bars,status,close);document.body.append(panel);slider.focus();
 const tag=game.sessionTag;let stopped=false,busy=false;
 const dismiss=()=>{stopped=true;clearInterval(timer);panel.remove();document.querySelector('#command-input').focus();};close.onclick=dismiss;
 panel.addEventListener('keydown',e=>{e.stopPropagation();if(e.key==='Escape')dismiss();if(e.key==='Tab'){e.preventDefault();const controls=[dial,slider,close];const i=controls.indexOf(document.activeElement);controls[(i+(e.shiftKey?-1:1)+controls.length)%controls.length].focus();}});
 const timer=setInterval(async()=>{
  if(game.ending||game.sessionTag!==tag){dismiss();return;}if(busy||stopped)return;busy=true;
  try{const r=await game.action('comms-submit',{token:result.challenge.token,frequency:Number(slider.value)});
   if(stopped)return;bars.value=r.quality;status.textContent=`SIGNAL ${r.quality}% // STABLE ${(r.held/1000).toFixed(1)} / 6.0s`;
   if(r.complete){dismiss();print(r.message);startSedationDisplay();updateNextStep();}
  }catch(e){status.textContent=e.message;}finally{busy=false;}
 },500);
};

window.openNeuralLink = (print) => {
 if(document.querySelector('.relay-modal'))return;
 const panel=document.createElement('section');panel.className='relay-modal neural-modal';panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');panel.setAttribute('aria-label','Neural waveform alignment');
 panel.innerHTML='<h2>NEURAL LINK // ALIGN YOUR SIGNAL</h2><p>Match the amber reference with your cyan waveform. Adjust frequency, offset and amplitude, then lock the parameters. This recovery exercise is optional.</p><svg class="neural-wave" viewBox="0 0 720 220" role="img" aria-label="Reference and patient brainwaves"><defs><pattern id="wave-grid" width="36" height="22" patternUnits="userSpaceOnUse"><path d="M36 0H0V22" fill="none" stroke="#23434b"/></pattern></defs><rect width="720" height="220" fill="url(#wave-grid)"/><path class="reference-wave"/><path class="patient-wave"/></svg><p class="wave-legend">AMBER: REFERENCE / CYAN: YOUR SIGNAL</p>';
 const target=[3+Math.floor(Math.random()*3),2+Math.floor(Math.random()*5),3+Math.floor(Math.random()*3)],values=[1,0,1];
 const controls=document.createElement('div');controls.className='wave-controls';
 const status=document.createElement('p');status.setAttribute('aria-live','polite');
 const wave=v=>Array.from({length:241},(_,i)=>{const x=i*3;return `${i?'L':'M'}${x},${110-Math.sin(x/720*Math.PI*2*v[0]+v[1]*Math.PI/4)*v[2]*12}`;}).join(' ');
 const render=()=>{panel.querySelector('.reference-wave').setAttribute('d',wave(target));panel.querySelector('.patient-wave').setAttribute('d',wave(values));status.textContent=values.every((v,i)=>v===target[i])?'SIGNALS ALIGNED // Lock parameters.':'ADJUST PARAMETERS // Follow the reference wave.';};
 ['FREQUENCY','OFFSET','AMPLITUDE'].forEach((name,i)=>{const group=document.createElement('div');const label=document.createElement('p');const value=document.createElement('output');label.textContent=name;value.textContent=values[i];group.append(label);[-1,1].forEach(delta=>{const b=document.createElement('button');b.textContent=delta<0?'-':'+';b.setAttribute('aria-label',`${delta<0?'Decrease':'Increase'} ${name.toLowerCase()}`);b.onclick=()=>{values[i]=Math.max(i===1?0:1,Math.min(7,values[i]+delta));value.textContent=values[i];render();};group.append(b);});group.append(value);controls.append(group);});
 const lock=document.createElement('button');lock.textContent='LOCK PARAMETERS';lock.onclick=()=>{if(values.every((v,i)=>v===target[i])){status.textContent='NEURAL LINK STABLE // Recovery exercise complete. Return to your medical records.';lock.disabled=true;controls.querySelectorAll('button').forEach(b=>b.disabled=true);close.focus();print('NEURAL LINK // Patient waveform synchronized.');}else status.textContent='LOCK REJECTED // The waveforms differ. Adjust and try again.';};
 const close=document.createElement('button');close.textContent='RETURN';close.onclick=()=>{clearInterval(watch);panel.remove();document.querySelector('#command-input')?.focus();};
 panel.append(controls,status,lock,close);document.body.append(panel);render();panel.querySelector('button').focus();
 panel.addEventListener('keydown',e=>{e.stopPropagation();if(e.key==='Escape')close.click();if(e.key==='Tab'){const buttons=[...panel.querySelectorAll('button')].filter(b=>!b.disabled);const i=buttons.indexOf(document.activeElement);e.preventDefault();buttons[(i+(e.shiftKey?-1:1)+buttons.length)%buttons.length].focus();}});
 const tag=gameState.sessionTag;const watch=setInterval(()=>{if(gameState.ending||gameState.sessionTag!==tag)close.click();},250);
};
