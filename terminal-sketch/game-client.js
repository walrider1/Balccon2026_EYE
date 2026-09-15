// Display helpers contain no authority: every state change is verified by the server.
class RemoteKosmosGame {
 constructor() { this.access=0; this.rootShares={medical:false,comms:false,cortex:false}; this.course='sun'; this.missionDuration=900000; this.missionRemaining=900000; this.revision=-1; this.queue=Promise.resolve(); }
  requiredAccess(path) {
    if (path.startsWith('/home/operator/command/navigation')) return 3;
    if (path.startsWith('/home/operator/comms')) return 1;
    if (path.startsWith('/home/operator/command') ||
        path.startsWith('/home/operator/engineering') ||
        path.startsWith('/home/operator/hibernation')) return 2;
    return 0;
  }
  canAccessPath(path) {
    if (path.startsWith('/home/operator/command/navigation') && !this.rootRecovered) return false;
    return this.access >= this.requiredAccess(path);
  }
  visibleEntries(fs, path) {
    return (fs.list(path) || []).filter(({ name }) => this.canAccessPath(`${path}/${name}`));
  }
  availableSectors() {
    const sectors = [
      ['MEDICAL', '/medical', 'AVAILABLE'],
      ['COMMUNICATIONS', '/comms', this.access >= 1 ? 'AVAILABLE' : 'ACCESS LEVEL 1 REQUIRED'],
      ['COMMAND', '/command', this.access >= 2 ? 'PARTIAL ACCESS' : 'ACCESS LEVEL 2 REQUIRED'],
      ['ENGINEERING', '/engineering', this.access >= 2 ? 'PARTIAL ACCESS' : 'ACCESS LEVEL 2 REQUIRED'],
      ['HIBERNATION', '/hibernation', this.access >= 2 ? 'PARTIAL ACCESS' : 'ACCESS LEVEL 2 REQUIRED']
    ];

    return `SHIP NETWORK SECTORS\n\n${sectors.map(([name, path, status]) => `${name.padEnd(16)} ${path.padEnd(16)} ${status}`).join('\n')}`;
  }
  objectiveText() { return this.objective ? `RECOVERY ${this.objective.phase}/3 // ${this.objective.text}` : 'RECOVERY // CONNECTING'; }
  status() {
    const shares = Object.values(this.rootShares).filter(Boolean).length;
    const sedation = this.sedationEndsAt
      ? `ACTIVE // ${this.formatTime(this.sedationEndsAt - Date.now())} REMAINING`
      : 'INACTIVE';

    const mission = this.missionPaused
      ? 'PAUSED FOR ORBITAL BURN PLANNING'
      : this.missionEndsAt && !this.missionResolved
      ? `${this.formatTime(this.missionEndsAt - Date.now())} TO SOLAR ARRIVAL`
      : this.missionResolved ? 'EARTH INTERCEPT CONFIRMED' : 'PENDING TERMINAL BOOT';
    return `SYSTEM STATUS\n${this.objectiveText()}\n\nCURRENT USER: SAMUEL KOVAC\nROLE: MEDICAL PATIENT\nACCESS: LEVEL ${this.access}${this.rootRecovered ? ' // ROOT' : ''}\nCOURSE: ${this.course === 'earth' ? 'EARTH TRANSFER' : 'SOLAR TERMINATION'}\nDESTINATION: ${this.course.toUpperCase()}\nMISSION TRAJECTORY: ${mission}\nROOT RECOVERY SHARES: ${shares}/3\nSEDATION PROTOCOL: ${sedation}\nOPTIONAL CTF: ${!this.ctf ? 'NOT STARTED // use ctf' : this.ctf.completed ? 'VERIFIED' : this.ctf.expired ? 'EXPIRED // use ctf to retry' : this.formatTime(this.ctf.endsAt + this.clockOffset - Date.now())}`;
  }
  formatTime(milliseconds) {
    const totalSeconds = Math.max(0, Math.ceil(milliseconds / 1000));
    return `${String(Math.floor(totalSeconds / 60)).padStart(2, '0')}:${String(totalSeconds % 60).padStart(2, '0')}`;
  }
  missionProgress() {
    const remaining = this.missionPaused
      ? this.missionRemaining
      : Math.max(0, (this.missionEndsAt || Date.now()) - Date.now());
    return Math.min(1, Math.max(0, 1 - remaining / this.missionDuration));
  }
  canStartCortex() {
    return Boolean(this.sedationEndsAt) && !this.rootRecovered && !this.ending;
  }

 apply(state) {
   if (state.revision < this.revision) return;
   this.clockOffset=Date.now()-state.serverNow;
   Object.assign(this,state);
   for(const field of ['sedationEndsAt','missionEndsAt','resetAt']) if(this[field]!==null) this[field]+=this.clockOffset;
 }
 async request(url, body) {
   const response=await fetch(url,{method:body?'POST':'GET',headers:body?{'Content-Type':'application/json'}:undefined,body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(10000)});
   const data=await response.json();
   if(!response.ok) throw new Error(data.error || 'SERVER UNAVAILABLE');
   const changedSession = this.sessionTag && (data.state || data).sessionTag !== this.sessionTag;
   if (body?.action === 'reset' || changedSession) this.revision=-1;
   if (changedSession && body?.action !== 'reset') this.onSessionChange?.();
   this.apply(data.state || data); return data;
 }
 action(action, fields={}) {
   const task=this.queue.then(()=>this.request('/api/game/action',{...fields,action}));
   this.queue=task.catch(()=>{}); return task;
 }
 refresh() { const task=this.queue.then(()=>this.request('/api/game')); this.queue=task.catch(()=>{}); return task; }
 initialize() { return this.refresh(); }
 authorize(domain,code) { return this.action('authorize',{domain,code}); }
 recoverRoot() { return this.action('root'); }
 async hint() { return (await this.action('hint')).message; }
 registerFileRead() { return this.refresh(); }
 startSedation() {} // Deadlines are issued by the server at authorization.
 startMission() { return this.action('start'); }
 pauseMission() { return this.action('planner-start'); }
 resumeMission() { return this.action('planner-exit'); }
 async confirmEarthIntercept() { await this.action('planner-commit'); return this.missionResolved; }
 issueCortexCode() { return this.cortexCode; }
}
if (typeof module !== 'undefined' && module.exports) module.exports={RemoteKosmosGame};
else window.KosmosGame=RemoteKosmosGame;
