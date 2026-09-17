const gameTimers = typeof window === 'undefined' ? globalThis : window;
class KosmosGame {
  constructor() {
    this.sessionNumber = 0;
    this.cortexVariants = ['9D3', '4A8', 'C72'];
    this.reset();
  }

  reset() {
    if (this.sedationTimeout) gameTimers.clearTimeout(this.sedationTimeout);
    if (this.missionTimeout) gameTimers.clearTimeout(this.missionTimeout);
    this.sessionNumber += 1;
    this.access = 0;
    this.rootRecovered = false;
    this.ending = false;
    this.neuralTransferDiscovered = false;
    this.sedationEndsAt = null;
    this.sedationTimeout = null;
    this.missionDuration = 20 * 60 * 1000;
    this.missionEndsAt = null;
    this.missionTimeout = null;
    this.missionRemaining = this.missionDuration;
    this.missionPaused = false;
    this.missionOnComplete = null;
    this.missionResolved = false;
    this.course = 'sun';
    this.cortexCodeIssued = false;
    this.cortexCodeAuthorized = false;
    this.rootShares = { medical: false, comms: false, cortex: false };
    this.cortexCode = `CORTEX-${this.cortexVariants[(this.sessionNumber - 1) % this.cortexVariants.length]}`;
  }

  requiredAccess(path) {
    if (path.startsWith('/home/operator/command/navigation')) return 3;
    if (path.startsWith('/home/operator/comms')) return 1;
    if (path.startsWith('/home/operator/command') ||
          path.startsWith('/home/operator/engineering') ||
          path.startsWith('/home/operator/botany') ||
          path.startsWith('/home/operator/food') ||
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
        ['BOTANY', '/botany', this.access >= 2 ? 'AVAILABLE' : 'ACCESS LEVEL 2 REQUIRED'],
        ['FOOD AND STORES', '/food', this.access >= 2 ? 'AVAILABLE' : 'ACCESS LEVEL 2 REQUIRED'],
      ['HIBERNATION', '/hibernation', this.access >= 2 ? 'PARTIAL ACCESS' : 'ACCESS LEVEL 2 REQUIRED']
    ];

    return `SHIP NETWORK SECTORS\n\n${sectors.map(([name, path, status]) => `${name.padEnd(16)} ${path.padEnd(16)} ${status}`).join('\n')}`;
  }

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
    return `SYSTEM STATUS\n\nCURRENT USER: SAMUEL KOVAC\nROLE: MEDICAL PATIENT\nACCESS: LEVEL ${this.access}${this.rootRecovered ? ' // ROOT' : ''}\nCOURSE: ${this.course === 'earth' ? 'EARTH TRANSFER' : 'SOLAR TERMINATION'}\nDESTINATION: ${this.course.toUpperCase()}\nMISSION TRAJECTORY: ${mission}\nROOT RECOVERY SHARES: ${shares}/3\nSEDATION PROTOCOL: ${sedation}`;
  }

  formatTime(milliseconds) {
    const totalSeconds = Math.max(0, Math.ceil(milliseconds / 1000));
    return `${String(Math.floor(totalSeconds / 60)).padStart(2, '0')}:${String(totalSeconds % 60).padStart(2, '0')}`;
  }

  authorize(domain, code) {
    const normalizedDomain = domain.toLowerCase();
    const normalizedCode = code.toUpperCase();

    if (normalizedDomain === 'medical') {
      if (normalizedCode !== 'MR-07-0412') return { ok: false, message: 'MEDICAL AUTHORIZATION REJECTED // Use MR-<two-digit chamber>-<four-digit date>. Remove the date slash: 04/12 becomes 0412. See /medical/recovery_service.txt.' };
      if (this.rootShares.medical) return { ok: false, message: 'MEDICAL ROOT SHARE ALREADY RECOVERED.' };
      this.access = Math.max(this.access, 1);
      this.rootShares.medical = true;
      return { ok: true, message: 'ACCESS LEVEL 1 GRANTED\nMEDICAL ROOT SHARE A: VALID\nCOMMUNICATIONS NETWORK: AVAILABLE\nNEXT: cd /comms, then cat recovery_service.txt' };
    }

    if (normalizedDomain === 'comms') {
      if (this.access < 1) return { ok: false, message: 'COMMUNICATIONS AUTHORIZATION REQUIRES ACCESS LEVEL 1.' };
      if (normalizedCode !== 'F-184-2317') return { ok: false, message: 'FORENSIC AUTHORIZATION REJECTED // Use primary records, not bridge announcements.' };
      if (this.rootShares.comms) return { ok: false, message: 'COMMUNICATIONS ROOT SHARE ALREADY RECOVERED.' };
      this.access = Math.max(this.access, 2);
      this.rootShares.comms = true;
      return { ok: true, message: 'ACCESS LEVEL 2 GRANTED\nCOMMUNICATIONS ROOT SHARE B: VALID\nCENTRAL DISCREPANCY RECORDED' };
    }

    if (normalizedDomain === 'cortex') {
      if (!this.cortexCodeIssued) return { ok: false, message: 'NO CORTEX ATTESTATION CODE ISSUED. Start the patient-safety challenge during sedation.' };
      if (normalizedCode !== this.cortexCode) return { ok: false, message: 'CORTEX ATTESTATION REJECTED.' };
      if (this.rootShares.cortex) return { ok: false, message: 'CORTEX ROOT SHARE ALREADY RECOVERED.' };
      this.rootShares.cortex = true;
      return { ok: true, message: 'PURPOSEFUL MOTOR RESPONSE ACCEPTED\nMEDICAL ROOT SHARE C: VALID\nROOT RECOVERY SERVICE READY\nNEXT STEP: root recover' };
    }

    return { ok: false, message: 'UNKNOWN AUTHORIZATION DOMAIN. Use medical, comms, or cortex.' };
  }

  startSedation(onComplete) {
    if (this.sedationEndsAt || this.rootRecovered) return;
    this.sedationEndsAt = Date.now() + 5 * 60 * 1000;
    this.sedationTimeout = gameTimers.setTimeout(() => {
      if (!this.rootRecovered && !this.ending) {
        this.ending = true;
        onComplete();
      }
    }, 5 * 60 * 1000);
  }

  startMission(onComplete) {
    if (this.missionEndsAt || this.missionResolved || this.ending) return;
    this.missionOnComplete = onComplete;
    this.missionRemaining = this.missionDuration;
    this.armMissionTimer();
  }

  armMissionTimer() {
    if (this.missionResolved || this.ending || !this.missionRemaining) return;
    this.missionPaused = false;
    this.missionEndsAt = Date.now() + this.missionRemaining;
    this.missionTimeout = gameTimers.setTimeout(() => {
      if (!this.missionResolved && !this.ending) {
        this.ending = true;
        this.missionOnComplete?.();
      }
    }, this.missionRemaining);
  }

  pauseMission() {
    if (!this.missionEndsAt || this.missionResolved || this.ending) return false;
    this.missionRemaining = Math.max(0, this.missionEndsAt - Date.now());
    gameTimers.clearTimeout(this.missionTimeout);
    this.missionTimeout = null;
    this.missionEndsAt = null;
    this.missionPaused = true;
    return true;
  }

  resumeMission() {
    if (!this.missionPaused || this.missionResolved || this.ending) return false;
    this.armMissionTimer();
    return true;
  }

  missionProgress() {
    const remaining = this.missionPaused
      ? this.missionRemaining
      : Math.max(0, (this.missionEndsAt || Date.now()) - Date.now());
    return Math.min(1, Math.max(0, 1 - remaining / this.missionDuration));
  }

  confirmEarthIntercept() {
    if (this.missionResolved || this.ending) return false;
    this.missionResolved = true;
    this.course = 'earth';
    if (this.missionTimeout) gameTimers.clearTimeout(this.missionTimeout);
    this.missionTimeout = null;
    this.missionEndsAt = null;
    this.missionPaused = false;
    return true;
  }

  canStartCortex() {
    return Boolean(this.sedationEndsAt) && !this.rootRecovered && !this.ending;
  }

  issueCortexCode() {
    this.cortexCodeIssued = true;
    return this.cortexCode;
  }

  recoverRoot() {
    if (this.rootRecovered) return { ok: false, message: 'ROOT ACCESS ALREADY ACTIVE.' };
    if (!Object.values(this.rootShares).every(Boolean)) {
      const missing = Object.entries(this.rootShares).filter(([, valid]) => !valid).map(([name]) => name.toUpperCase());
      return { ok: false, message: `ROOT RECOVERY INCOMPLETE // MISSING: ${missing.join(', ')}` };
    }

    this.rootRecovered = true;
    this.access = 3;
    if (this.sedationTimeout) gameTimers.clearTimeout(this.sedationTimeout);
    this.sedationTimeout = null;
    this.sedationEndsAt = null;
    return { ok: true, message: 'ROOT RECOVERY COMPLETE\nMEDICAL SEDATION: ABORTED\nNAVIGATION AUTHORITY: GRANTED\n\nNAVIGATION ARCHIVE MOUNTED: /home/operator/command/navigation\nReview the recovered flight records before you act.' };
  }

  registerFileRead(path) {
    if (path === '/home/operator/command/neural_transfer.txt') this.neuralTransferDiscovered = true;
  }

  finish() {
    this.ending = true;
    if (this.sedationTimeout) gameTimers.clearTimeout(this.sedationTimeout);
    this.sedationTimeout = null;
    if (this.missionTimeout) gameTimers.clearTimeout(this.missionTimeout);
    this.missionTimeout = null;
  }
}

if (typeof module !== 'undefined' && module.exports) module.exports = { KosmosGame };
else window.KosmosGame = KosmosGame;
