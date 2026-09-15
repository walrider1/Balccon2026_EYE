(function (target) {
  class HrtokClient {
    constructor(options = {}) {
      this.fetch = options.fetch || target.fetch.bind(target);
      this.sessionId = options.sessionId || target.crypto.randomUUID();
      this.timeoutMs = options.timeoutMs || 18000;
      this.sequence = 0;
      this.queue = [];
      this.active = false;
      this.closed = false;
    }

    send(payload) {
      if (this.closed) return Promise.reject(new Error('session_closed'));
      if (this.queue.length >= 6) return Promise.reject(new Error('queue_full'));
      return new Promise((resolve, reject) => {
        this.queue.push({ payload: { ...payload, sessionId: this.sessionId, requestId: `${this.sessionId}_${++this.sequence}` }, resolve, reject });
        this.drain();
      });
    }

    async drain() {
      if (this.active || this.closed) return;
      this.active = true;
      while (this.queue.length && !this.closed) {
        const item = this.queue.shift();
        this.controller = new AbortController();
        const timer = setTimeout(() => this.controller?.abort(), this.timeoutMs);
        try {
          const response = await this.fetch('/api/central', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(item.payload), signal: this.controller.signal
          });
          if (!response.ok) throw new Error(`central_${response.status}`);
          const reply = await response.json();
          if (this.closed) throw new Error('session_closed');
          if (typeof reply.message !== 'string') throw new Error('invalid_response');
          item.resolve(reply);
        } catch (error) { item.reject(error); }
        finally { clearTimeout(timer); this.controller = null; }
      }
      this.active = false;
    }

    close() {
      this.closed = true;
      this.controller?.abort();
      for (const item of this.queue.splice(0)) item.reject(new Error('session_closed'));
    }
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = { HrtokClient };
  else target.HrtokClient = HrtokClient;
})(typeof window === 'undefined' ? globalThis : window);
