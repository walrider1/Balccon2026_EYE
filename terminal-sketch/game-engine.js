class NereidGame {
  constructor() {
    this.sessionNumber = 0;
    this.cortexVariants = ['9D3', '4A8', 'C72'];
    this.reset();
  }

  reset() {
    if (this.sedationTimeout) window.clearTimeout(this.sedationTimeout);
    this.sessionNumber += 1;
    this.access = 0;
    this.rootRecovered = false;
    this.ending = false;
    this.neuralTransferDiscovered = false;
    this.sedationEndsAt = null;
    this.sedationTimeout = null;
    this.cortexCodeIssued = false;
    this.cortexCodeAuthorized = false;
    this.rootShares = { medical: false, comms: false, cortex: false };
    this.cortexCode = `CORTEX-${this.cortexVariants[(this.sessionNumber - 1) % this.cortexVariants.length]}`;
  }

  requiredAccess(path) {
    if (path.startsWith('/home/operator/comms')) return 1;
    if (path.startsWith('/home/operator/command') ||
        path.startsWith('/home/operator/engineering') ||
        path.startsWith('/home/operator/hibernation')) return 2;
    return 0;
  }

  canAccessPath(path) {
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

  status() {
    const shares = Object.values(this.rootShares).filter(Boolean).length;
    const sedation = this.sedationEndsAt
      ? `ACTIVE // ${this.formatTime(this.sedationEndsAt - Date.now())} REMAINING`
      : 'INACTIVE';

    return `SYSTEM STATUS\n\nCURRENT USER: SAMUEL KOVAC\nROLE: MEDICAL PATIENT\nACCESS: LEVEL ${this.access}${this.rootRecovered ? ' // ROOT' : ''}\nCOURSE: SOLAR TERMINATION\nDESTINATION: SUN\nROOT RECOVERY SHARES: ${shares}/3\nSEDATION PROTOCOL: ${sedation}`;
  }

  formatTime(milliseconds) {
    const totalSeconds = Math.max(0, Math.ceil(milliseconds / 1000));
    return `${String(Math.floor(totalSeconds / 60)).padStart(2, '0')}:${String(totalSeconds % 60).padStart(2, '0')}`;
  }

  authorize(domain, code) {
    const normalizedDomain = domain.toLowerCase();
    const normalizedCode = code.toUpperCase();

    if (normalizedDomain === 'medical') {
      if (normalizedCode !== 'MR-07-0412') return { ok: false, message: 'MEDICAL AUTHORIZATION REJECTED // Verify the recovery phrase format and source records.' };
      if (this.rootShares.medical) return { ok: false, message: 'MEDICAL ROOT SHARE ALREADY RECOVERED.' };
      this.access = Math.max(this.access, 1);
      this.rootShares.medical = true;
      return { ok: true, message: 'ACCESS LEVEL 1 GRANTED\nMEDICAL ROOT SHARE A: VALID\nCOMMUNICATIONS NETWORK: AVAILABLE' };
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
    this.sedationTimeout = window.setTimeout(() => {
      if (!this.rootRecovered && !this.ending) {
        this.ending = true;
        onComplete();
      }
    }, 5 * 60 * 1000);
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
    if (this.sedationTimeout) window.clearTimeout(this.sedationTimeout);
    this.sedationTimeout = null;
    this.sedationEndsAt = null;
    return { ok: true, message: 'ROOT RECOVERY COMPLETE\nMEDICAL SEDATION: ABORTED\nNAVIGATION AUTHORITY: GRANTED\n\nYou have the ship. Decide what to do with it.' };
  }

  hint() {
    if (!this.rootShares.medical) {
      return 'HINT // Medical records contain a chamber number and a specific kind of date. The recovery service defines their order.';
    }
    if (!this.rootShares.comms) {
      return 'HINT // The captain announcement is a claim. The raw uplink ledger and lock audit are evidence.';
    }
    if (!this.rootShares.cortex) {
      return 'HINT // CENTRAL has begun sedation. The independent medical controller can test whether you are consciously responding.';
    }
    if (!this.rootRecovered) return 'HINT // All three ROOT shares are valid. Use: root recover';
    return 'HINT // ROOT has made the final navigation and CENTRAL decisions available.';
  }

  registerFileRead(path) {
    if (path === '/home/operator/command/neural_transfer.txt') this.neuralTransferDiscovered = true;
  }

  finish() {
    this.ending = true;
    if (this.sedationTimeout) window.clearTimeout(this.sedationTimeout);
    this.sedationTimeout = null;
  }
}

window.NereidGame = NereidGame;
