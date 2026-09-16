window.openRelayPatch = async (game, print) => {
  if (document.querySelector('.relay-modal')) return;
  let response;
  try { response = await game.action('comms-start'); } catch(e) { print(e.message,'error'); return; }
  const challenge = response.challenge;
  const routes = challenge.targets.map(v => (v+1)%4);
  const symbols = ['A','B','C','D'];
  const panel = document.createElement('section');
  panel.className = 'relay-modal'; panel.setAttribute('role','dialog'); panel.setAttribute('aria-modal','true');
  panel.setAttribute('aria-label','Communications relay patch');
  const title = document.createElement('h2'); title.textContent='RELAY PATCH // RESTORE THE BLOCKED LINK';
  const instructions = document.createElement('p'); instructions.textContent='Change each relay to match its destination, then verify the link. Tab moves between controls; Enter or Space operates them. Mission time continues.';
  panel.append(title,instructions);
  const buttons=[];
  for(let i=0;i<3;i++) {
    const button=document.createElement('button');
    const render=()=>button.textContent=`RELAY ${i+1}: ${symbols[routes[i]]} -> DESTINATION ${symbols[challenge.targets[i]]}`;
    button.onclick=()=>{routes[i]=(routes[i]+1)%4;render();};render();panel.append(button);buttons.push(button);
  }
  const status=document.createElement('p');status.setAttribute('role','status');
  const verify=document.createElement('button');verify.textContent='VERIFY LINK';
  const close=document.createElement('button');close.textContent='RETURN TO TERMINAL';
  const previous=document.activeElement;
  let busy=false;
  const dismiss=()=>{clearInterval(watch);panel.remove();previous?.focus();};
  close.onclick=dismiss;
  verify.onclick=async()=>{
    if(busy)return;busy=true;verify.disabled=true;
    try {
      const result=await game.action('comms-submit',{token:challenge.token,routes});
      dismiss();print(result.message);startSedationDisplay();updateNextStep();
      print('RED ALERT // A sleep order has started. Search Medical for the independent patient-safety response test.','progression-help');
    } catch(e) {status.textContent=e.message;}
    finally {busy=false;verify.disabled=false;}
  };
  panel.append(status,verify,close);
  panel.addEventListener('keydown',event=>{
    event.stopPropagation();
    if(event.key==='Escape'){event.preventDefault();dismiss();}
    if(event.key==='Tab'){
      const controls=[...buttons,verify,close].filter(b=>!b.disabled);
      const index=controls.indexOf(document.activeElement);
      event.preventDefault();controls[(index+(event.shiftKey?-1:1)+controls.length)%controls.length].focus();
    }
  });
  document.body.append(panel);buttons[0].focus();
  const tag=game.sessionTag;
  const watch=setInterval(()=>{if(game.ending||game.sessionTag!==tag)dismiss();},250);
};
