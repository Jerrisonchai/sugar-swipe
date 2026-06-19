/* audio.js — Procedural sound effects via Web Audio API for Sugar Swipe */

window._SS = window._SS || {};

const AudioFX = {
  ctx: null,
  enabled: true,
  _volume: 0.5,

  /* ---- Init (must be called from user gesture) ---- */
  init() {
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {
      this.enabled = false;
      console.warn('Web Audio not available');
    }
  },

  toggle() {
    this.enabled = !this.enabled;
    return this.enabled;
  },

  volume(v) {
    this._volume = Math.max(0, Math.min(1, v));
  },

  /* ---- Sound Effects ---- */

  select() {
    // Soft pop click — short sine blip
    this._play(t => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, t);
      osc.frequency.exponentialRampToValueAtTime(1200, t + 0.03);
      gain.gain.setValueAtTime(this._volume * 0.15, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
      osc.connect(gain).connect(this.ctx.destination);
      osc.start(t); osc.stop(t + 0.08);
    });
  },

  swap() {
    // Whoosh slide — filtered noise sweep
    this._play(t => {
      const dur = 0.12;
      const buf = this.ctx.createBuffer(1, this.ctx.sampleRate * dur, this.ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1);

      const src = this.ctx.createBufferSource();
      const filter = this.ctx.createBiquadFilter();
      const gain = this.ctx.createGain();
      src.buffer = buf;
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(400, t);
      filter.frequency.exponentialRampToValueAtTime(1200, t + dur);
      filter.Q.value = 2;
      gain.gain.setValueAtTime(this._volume * 0.08, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
      src.connect(filter).connect(gain).connect(this.ctx.destination);
      src.start(t); src.stop(t + dur);
    });
  },

  match3() {
    // Sweet 3-note chime — C5, E5, G5
    const notes = [523.25, 659.25, 783.99]; // C5 E5 G5
    notes.forEach((freq, i) => {
      this._play(t => {
        const start = t + i * 0.06;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0, start);
        gain.gain.linearRampToValueAtTime(this._volume * 0.2, start + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.2);
        osc.connect(gain).connect(this.ctx.destination);
        osc.start(start); osc.stop(start + 0.2);
      });
    });
  },

  match4() {
    // Higher arpeggio — C5 E5 G5 C6 E6
    const notes = [523.25, 659.25, 783.99, 1046.5, 1318.5];
    notes.forEach((freq, i) => {
      this._play(t => {
        const start = t + i * 0.05;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0, start);
        gain.gain.linearRampToValueAtTime(this._volume * 0.22, start + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.25);
        osc.connect(gain).connect(this.ctx.destination);
        osc.start(start); osc.stop(start + 0.25);
      });
    });
  },

  cascade() {
    // Rising arpeggio sweep
    this._play(t => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(300, t);
      osc.frequency.exponentialRampToValueAtTime(1600, t + 0.35);
      gain.gain.setValueAtTime(this._volume * 0.12, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
      osc.connect(gain).connect(this.ctx.destination);
      osc.start(t); osc.stop(t + 0.4);
    });
  },

  specialActivate() {
    // Zap boom — noise burst + bass thump
    this._play(t => {
      // Noise burst
      const dur = 0.2;
      const buf = this.ctx.createBuffer(1, this.ctx.sampleRate * dur, this.ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / data.length, 2);

      const src = this.ctx.createBufferSource();
      const filter = this.ctx.createBiquadFilter();
      const gain = this.ctx.createGain();
      src.buffer = buf;
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(3000, t);
      filter.frequency.exponentialRampToValueAtTime(200, t + dur);
      gain.gain.setValueAtTime(this._volume * 0.25, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
      src.connect(filter).connect(gain).connect(this.ctx.destination);
      src.start(t); src.stop(t + dur);

      // Bass thump
      const osc = this.ctx.createOscillator();
      const gain2 = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(80, t);
      osc.frequency.exponentialRampToValueAtTime(30, t + 0.15);
      gain2.gain.setValueAtTime(this._volume * 0.3, t);
      gain2.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
      osc.connect(gain2).connect(this.ctx.destination);
      osc.start(t); osc.stop(t + 0.18);
    });
  },

  levelComplete() {
    // Victory fanfare — C major chord held
    const notes = [261.63, 329.63, 392, 523.25, 659.25]; // C4 E4 G4 C5 E5
    notes.forEach((freq, i) => {
      this._play(t => {
        const start = t + i * 0.08;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = i === 3 ? 'triangle' : 'sine';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0, start);
        gain.gain.linearRampToValueAtTime(this._volume * 0.18, start + 0.03);
        gain.gain.setValueAtTime(this._volume * 0.18, start + 0.5);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 1.2);
        osc.connect(gain).connect(this.ctx.destination);
        osc.start(start); osc.stop(start + 1.2);
      });
    });
  },

  levelFail() {
    // Gentle sad descending — C5 B4 A4
    const notes = [523.25, 493.88, 440];
    notes.forEach((freq, i) => {
      this._play(t => {
        const start = t + i * 0.2;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0, start);
        gain.gain.linearRampToValueAtTime(this._volume * 0.15, start + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.35);
        osc.connect(gain).connect(this.ctx.destination);
        osc.start(start); osc.stop(start + 0.35);
      });
    });
  },

  buttonTap() {
    // Ultra-short click
    this._play(t => {
      const dur = 0.03;
      const buf = this.ctx.createBuffer(1, this.ctx.sampleRate * dur, this.ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * 0.3;

      const src = this.ctx.createBufferSource();
      const gain = this.ctx.createGain();
      src.buffer = buf;
      gain.gain.setValueAtTime(this._volume * 0.1, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
      src.connect(gain).connect(this.ctx.destination);
      src.start(t); src.stop(t + dur);
    });
  },

  starEarned() {
    // Sparkle tinkle — high bell
    this._play(t => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1800, t);
      osc.frequency.setValueAtTime(2400, t + 0.05);
      osc.frequency.setValueAtTime(3200, t + 0.1);
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(this._volume * 0.2, t + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
      osc.connect(gain).connect(this.ctx.destination);
      osc.start(t); osc.stop(t + 0.3);
    });
  },

  /** Cash register ka-ching for purchases */
  purchase() {
    this._play(t => {
      const dur = 0.08;
      const buf = this.ctx.createBuffer(1, this.ctx.sampleRate * dur, this.ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * 0.3;
      const src = this.ctx.createBufferSource();
      const filter = this.ctx.createBiquadFilter();
      const gain = this.ctx.createGain();
      src.buffer = buf;
      filter.type = 'highpass';
      filter.frequency.value = 2000;
      gain.gain.setValueAtTime(this._volume * 0.15, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
      src.connect(filter).connect(gain).connect(this.ctx.destination);
      src.start(t); src.stop(t + dur);
    });
  },

  /** Sparkly success jingle for purchase confirm */
  purchaseSuccess() {
    var notes = [523, 659, 784, 1047];
    var self = this;
    notes.forEach(function(freq, i) {
      self._play(function(t) {
        var start = t + i * 0.07;
        var osc = self.ctx.createOscillator();
        var gain = self.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0, start);
        gain.gain.linearRampToValueAtTime(self._volume * 0.18, start + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.25);
        osc.connect(gain).connect(self.ctx.destination);
        osc.start(start); osc.stop(start + 0.25);
      });
    });
  },

  /** Spin wheel tick — rapid clicks during rotation */
  spinTick() {
    this._play(function(t) {
      var dur = 0.04;
      var buf = AudioFX.ctx.createBuffer(1, AudioFX.ctx.sampleRate * dur, AudioFX.ctx.sampleRate);
      var data = buf.getChannelData(0);
      for (var i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * 0.2;
      var src = AudioFX.ctx.createBufferSource();
      var filter = AudioFX.ctx.createBiquadFilter();
      var gain = AudioFX.ctx.createGain();
      src.buffer = buf;
      filter.type = 'highpass'; filter.frequency.value = 3000;
      gain.gain.setValueAtTime(AudioFX._volume * 0.1, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
      src.connect(filter).connect(gain).connect(AudioFX.ctx.destination);
      src.start(t); src.stop(t + dur);
    });
  },

  /** Spin wheel jackpot — exciting ascending jingle */
  spinWin() {
    var notes = [523, 659, 784, 1047, 1319];
    var self = this;
    notes.forEach(function(freq, i) {
      self._play(function(t) {
        var start = t + i * 0.08;
        var osc = self.ctx.createOscillator();
        var gain = self.ctx.createGain();
        osc.type = i === notes.length - 1 ? 'triangle' : 'sine';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0, start);
        gain.gain.linearRampToValueAtTime(self._volume * 0.2, start + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.4);
        osc.connect(gain).connect(self.ctx.destination);
        osc.start(start); osc.stop(start + 0.4);
      });
    });
  },

  /** Challenge complete notification */
  challengeComplete() {
    var notes = [659, 784, 1047];
    var self = this;
    notes.forEach(function(freq, i) {
      self._play(function(t) {
        var start = t + i * 0.1;
        var osc = self.ctx.createOscillator();
        var gain = self.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0, start);
        gain.gain.linearRampToValueAtTime(self._volume * 0.18, start + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.3);
        osc.connect(gain).connect(self.ctx.destination);
        osc.start(start); osc.stop(start + 0.3);
      });
    });
  },

  /** Streak claim — ascending happy melody */
  streakClaim() {
    this._play(function(t) {
      var notes = [392, 523, 659, 784, 1047];
      notes.forEach(function(freq, i) {
        var start = t + i * 0.06;
        var osc = AudioFX.ctx.createOscillator();
        var gain = AudioFX.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0, start);
        gain.gain.linearRampToValueAtTime(AudioFX._volume * 0.15, start + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.2);
        osc.connect(gain).connect(AudioFX.ctx.destination);
        osc.start(start); osc.stop(start + 0.2);
      });
    });
  },

  /* ---- Internals ---- */
  _play(fn) {
    if (!this.enabled || !this.ctx) return;
    try {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      fn(this.ctx.currentTime);
    } catch (e) { /* mute on error */ }
  },
};

window._SS.AudioFX = AudioFX;
