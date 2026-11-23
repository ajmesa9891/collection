// Bouncy Hoops! — Procedural Web Audio Synthesizer
(function (global) {
  'use strict';

  class BounceAudio {
    constructor() {
      this.ctx = null;
      this.sfxEnabled = true;
    }

    unlock() {
      if (!this.ctx) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return;
        this.ctx = new AudioCtx();
      }
      if (this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
    }

    setSfx(enabled) {
      this.sfxEnabled = !!enabled;
    }

    playTone(freq, duration, type = 'sine', volume = 0.14, delay = 0, slideTo = null) {
      if (!this.sfxEnabled) return;
      this.unlock();
      if (!this.ctx) return;

      const now = this.ctx.currentTime + delay;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, now);
      if (slideTo !== null) {
        osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), now + duration);
      }

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(volume, now + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + duration + 0.02);
    }

    playLaunch(powerRatio) {
      const base = 240 + powerRatio * 180;
      this.playTone(base, 0.18, 'triangle', 0.16, 0, base * 1.9);
    }

    playBounce(intensity = 1) {
      const f = 190 + Math.min(1, intensity) * 140;
      this.playTone(f, 0.11, 'sine', 0.13 * Math.max(0.4, intensity), 0, f * 0.62);
    }

    playTrampoline() {
      this.playTone(220, 0.24, 'triangle', 0.18, 0, 740);
      this.playTone(330, 0.18, 'sine', 0.11, 0.05, 880);
    }

    playPortal() {
      this.playTone(440, 0.18, 'sine', 0.14, 0, 1046.5);
      this.playTone(880, 0.16, 'triangle', 0.1, 0.06, 523.25);
    }

    playStar() {
      this.playTone(880, 0.09, 'sine', 0.14, 0, 1174.66);
      this.playTone(1318.5, 0.16, 'triangle', 0.12, 0.05);
    }

    playSwish() {
      const notes = [523.25, 659.25, 783.99, 1046.5, 1318.5];
      notes.forEach((n, i) => {
        this.playTone(n, 0.22, 'triangle', 0.16, i * 0.055);
      });
    }

    playRimClank() {
      this.playTone(310, 0.09, 'square', 0.06, 0, 210);
    }

    playClick() {
      this.playTone(620, 0.06, 'sine', 0.1, 0, 760);
    }

    playUnlock() {
      this.playTone(587.33, 0.12, 'triangle', 0.15, 0);
      this.playTone(880, 0.14, 'triangle', 0.15, 0.09);
      this.playTone(1174.66, 0.26, 'triangle', 0.17, 0.18);
    }
  }

  global.BounceAudio = new BounceAudio();
})(window);
