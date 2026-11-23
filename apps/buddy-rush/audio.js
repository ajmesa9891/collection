// Buddy Rush! — Procedural Web Audio Synthesizer (zero external audio files needed)
(function (global) {
  'use strict';

  class BuddyAudio {
    constructor() {
      this.ctx = null;
      this.sfxEnabled = true;
      this.musicEnabled = true;
      this.lastPopTime = 0;
      this.musicTimer = null;
      this.musicStep = 0;
      this.currentWorldTheme = 'meadow';
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

    setMusic(enabled) {
      this.musicEnabled = !!enabled;
      if (!this.musicEnabled) {
        this.stopMusic();
      }
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
      gain.gain.linearRampToValueAtTime(volume, now + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + duration + 0.02);
    }

    playGateGood() {
      this.playTone(523.25, 0.12, 'triangle', 0.16, 0);
      this.playTone(659.25, 0.12, 'triangle', 0.16, 0.055);
      this.playTone(783.99, 0.18, 'triangle', 0.18, 0.11);
    }

    playGateDouble() {
      const notes = [523.25, 659.25, 783.99, 1046.5, 1318.5];
      notes.forEach((n, i) => {
        this.playTone(n, 0.18, 'triangle', 0.16, i * 0.045);
      });
    }

    playGateBad() {
      this.playTone(340, 0.16, 'sine', 0.15, 0, 210);
      this.playTone(230, 0.18, 'sine', 0.12, 0.09, 150);
    }

    playStar() {
      this.playTone(880, 0.09, 'sine', 0.12, 0, 1174.66);
      this.playTone(1318.5, 0.14, 'triangle', 0.1, 0.05);
    }

    playPop() {
      if (!this.sfxEnabled) return;
      const nowMs = performance.now();
      if (nowMs - this.lastPopTime < 55) return;
      this.lastPopTime = nowMs;
      const pitch = 360 + Math.random() * 240;
      this.playTone(pitch, 0.075, 'sine', 0.11, 0, pitch * 1.45);
    }

    playBump() {
      this.playTone(180, 0.12, 'triangle', 0.16, 0, 95);
    }

    playBoost() {
      this.playTone(440, 0.25, 'sawtooth', 0.06, 0, 980);
      this.playTone(587.33, 0.22, 'triangle', 0.12, 0.04, 1174.66);
    }

    playRescue() {
      const notes = [587.33, 739.99, 880, 1174.66];
      notes.forEach((n, i) => {
        this.playTone(n, 0.22, 'sine', 0.15, i * 0.06);
      });
    }

    playBossHit() {
      const pitch = 140 + Math.random() * 60;
      this.playTone(pitch, 0.09, 'triangle', 0.14, 0, pitch * 0.6);
    }

    playStairStep(stepIndex) {
      const scale = [523.25, 587.33, 659.25, 783.99, 880, 1046.5, 1174.66];
      const freq = scale[Math.min(stepIndex, scale.length - 1)];
      this.playTone(freq, 0.2, 'triangle', 0.16, 0);
      this.playTone(freq * 1.5, 0.18, 'sine', 0.08, 0.04);
    }

    playVictory() {
      const melody = [
        [523.25, 0.14, 0],
        [659.25, 0.14, 0.12],
        [783.99, 0.14, 0.24],
        [1046.5, 0.36, 0.36],
        [783.99, 0.14, 0.54],
        [1046.5, 0.45, 0.68],
      ];
      melody.forEach(([f, d, delay]) => {
        this.playTone(f, d, 'triangle', 0.17, delay);
        this.playTone(f * 0.5, d, 'sine', 0.08, delay);
      });
    }

    playTryAgain() {
      this.playTone(440, 0.18, 'triangle', 0.13, 0);
      this.playTone(392, 0.18, 'triangle', 0.13, 0.16);
      this.playTone(349.23, 0.28, 'triangle', 0.14, 0.32);
    }

    playClick() {
      this.playTone(620, 0.06, 'sine', 0.1, 0, 740);
    }

    playPurchase() {
      this.playTone(587.33, 0.1, 'triangle', 0.15, 0);
      this.playTone(880, 0.12, 'triangle', 0.15, 0.08);
      this.playTone(1174.66, 0.22, 'triangle', 0.16, 0.16);
    }

    startMusic(worldId) {
      this.currentWorldTheme = worldId || 'meadow';
      if (!this.musicEnabled) return;
      this.stopMusic();
      this.musicStep = 0;

      const patterns = {
        meadow: [261.63, 329.63, 392.0, 523.25, 392.0, 329.63, 293.66, 392.0],
        candy:  [329.63, 392.0, 493.88, 587.33, 523.25, 440.0, 392.0, 493.88],
        jungle: [293.66, 349.23, 440.0, 523.25, 440.0, 349.23, 329.63, 440.0],
        frost:  [392.0, 493.88, 587.33, 783.99, 659.25, 587.33, 493.88, 587.33],
        space:  [261.63, 392.0, 493.88, 659.25, 587.33, 493.88, 392.0, 523.25],
      };

      const notes = patterns[this.currentWorldTheme] || patterns.meadow;
      this.musicTimer = window.setInterval(() => {
        if (!this.musicEnabled || !this.ctx || this.ctx.state !== 'running') return;
        const freq = notes[this.musicStep % notes.length];
        this.musicStep++;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now);
        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(0.032, now + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.26);
      }, 280);
    }

    stopMusic() {
      if (this.musicTimer !== null) {
        clearInterval(this.musicTimer);
        this.musicTimer = null;
      }
    }
  }

  global.BuddyAudio = new BuddyAudio();
})(window);
