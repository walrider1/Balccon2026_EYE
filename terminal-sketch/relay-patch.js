window.openRelayPatch = async (game, print) => {
 if(document.querySelector('.relay-modal'))return;
 let result;try{result=await game.action('comms-start');}catch(e){print(e.message,'error');return;}
 const panel=document.createElement('section');panel.className='relay-modal';panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');panel.setAttribute('aria-label','Signal calibration');
 const title=document.createElement('h2');title.textContent='UPLINK // ACQUIRE A STABLE SIGNAL';
 const instructions=document.createElement('p');instructions.textContent='Tune the carrier with Left/Right or drag the slider. Follow the signal strength. Keep it above 88% for six seconds to establish the link. Mission time continues.';
 const slider=document.createElement('input');slider.type='range';slider.min=0;slider.max=100;slider.value=0;slider.setAttribute('aria-label','Carrier frequency');
 const bars=document.createElement('progress');bars.max=100;bars.value=0;
 const status=document.createElement('p');status.textContent='SEARCHING...';
 const close=document.createElement('button');close.textContent='CANCEL';
 panel.append(title,instructions,slider,bars,status,close);document.body.append(panel);slider.focus();
 const tag=game.sessionTag;let stopped=false,busy=false;
 const dismiss=()=>{stopped=true;clearInterval(timer);panel.remove();document.querySelector('#command-input').focus();};close.onclick=dismiss;
 panel.addEventListener('keydown',e=>{e.stopPropagation();if(e.key==='Escape')dismiss();if(e.key==='Tab'){e.preventDefault();(document.activeElement===slider?close:slider).focus();}});
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
 const panel=document.createElement('section');panel.className='relay-modal';panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');panel.setAttribute('aria-label','Neural connection exercise');
 const heading=document.createElement('h2');heading.textContent='NEURAL LINK // CONNECT THE PATH';
 const info=document.createElement('p');info.textContent='Connect numbered cells in order, from 1 to 6. Click or use Tab and Enter. A wrong connection restarts the path. This recovery exercise is optional.';
 panel.append(heading,info);let next=1;
 for(const n of [3,1,5,2,6,4]){const b=document.createElement('button');b.textContent=String(n);b.onclick=()=>{if(n!==next){next=1;panel.querySelectorAll('button').forEach(x=>x.disabled=false);info.textContent='CONNECTION LOST // Begin again at 1.';return;}b.disabled=true;next++;info.textContent=`CONNECTED ${n}/6`;if(next===7){info.textContent='NEURAL PATH RESTORED. Your medical record contains the chamber and override date needed by the recovery controller.';}};panel.append(b);}
 const close=document.createElement('button');close.textContent='RETURN';close.onclick=()=>{clearInterval(watch);panel.remove();document.querySelector('#command-input').focus();};panel.append(close);
 panel.addEventListener('keydown',e=>{e.stopPropagation();if(e.key==='Escape')close.click();if(e.key==='Tab'){const controls=[...panel.querySelectorAll('button')].filter(b=>!b.disabled);const i=controls.indexOf(document.activeElement);e.preventDefault();controls[(i+(e.shiftKey?-1:1)+controls.length)%controls.length].focus();}});
 document.body.append(panel);panel.querySelector('button').focus();
 const tag=gameState.sessionTag;const watch=setInterval(()=>{if(gameState.ending||gameState.sessionTag!==tag)close.click();},250);
};
