(function (root) {
  class EyeDirector {
    constructor() { this.previous = null; this.lastReply = 0; }
    update(state, now = Date.now()) {
      const old = this.previous;
      this.previous = state;
      if (!state || !state.started) { this.lastReply = 0; return { clip: 'Sleep_standby', loop: true }; }
      if (!old || old.sessionTag !== state.sessionTag) {
        this.lastReply = 0;
        if (!state.endingKind) return { clip: 'Awakening', loop: false };
      }
      if (state.endingKind) {
        const clip = ({shutdown:'Death', sun:'Death', earth:'Long_blink', transfer:'Long_blink', sedation:'Sleep_standby', mission:'Sleep_standby'})[state.endingKind] || 'Sleep_standby';
        return { clip, loop: clip === 'Sleep_standby', hold: true };
      }
      if (!old?.started) return { clip: 'Awakening', loop: false };
      if (state.rootRecovered && !old.rootRecovered) return { clip: 'Shocked', loop: false };
      if (state.ai?.pendingUntil > now) return { clip: 'Reading', loop: true };
      if (state.ai?.at > this.lastReply && now - state.ai.at < 10000) {
        this.lastReply = state.ai.at;
        const clip = ({ GUIDE:'Stivker_hint', PROBE:'Curious', WARN:'Squint_sus2',
          DEFLECT:'Eye_roll', CONFESS_PARTIAL:'Pain', THREATEN:'Judgmental' })[state.ai.intent]
          || ({ GUARDED:'Looking', COMMANDING:'Judgmental', MANIPULATIVE:'Squint_sus',
            THREATENED:'Panic', CRACKED:'Pain2', COOPERATIVE:'Long_blink' })[state.ai.mood]
          || 'Looking';
        return { clip, loop: false };
      }
      if (state.readCount > (old.readCount || 0)) return { clip: 'Reading', loop: false };
      if (state.sedationEndsAt && !state.rootRecovered && state.sedationEndsAt - now < 60000) return { clip: 'Panic2', loop: true };
      return null;
    }
  }
  if (typeof module !== 'undefined') module.exports = { EyeDirector };
  else root.EyeDirector = EyeDirector;
})(typeof window !== 'undefined' ? window : globalThis);
