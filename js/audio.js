/**
 * 音效系统 - 使用 Web Audio API 生成可爱的音效
 */
class AudioManager {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    this.initialized = false;
  }

  init() {
    if (this.initialized) return;
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.initialized = true;
    } catch (e) {
      this.enabled = false;
    }
  }

  playTone(freq, duration, type = 'square', volume = 0.15) {
    if (!this.enabled || !this.ctx) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
    gain.gain.setValueAtTime(volume, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + duration);
  }

  shoot() {
    this.playTone(880, 0.08, 'square', 0.08);
    setTimeout(() => this.playTone(1100, 0.05, 'square', 0.05), 30);
  }

  shootPower() {
    this.playTone(660, 0.1, 'sawtooth', 0.08);
    setTimeout(() => this.playTone(990, 0.08, 'square', 0.06), 40);
  }

  hit() {
    this.playTone(200, 0.15, 'square', 0.12);
    this.playTone(150, 0.1, 'sawtooth', 0.08);
  }

  explosion() {
    this.playTone(100, 0.3, 'sawtooth', 0.15);
    setTimeout(() => this.playTone(60, 0.4, 'square', 0.1), 50);
    setTimeout(() => this.playTone(40, 0.3, 'triangle', 0.08), 150);
  }

  powerup() {
    const notes = [523, 659, 784, 1047];
    notes.forEach((f, i) => {
      setTimeout(() => this.playTone(f, 0.15, 'square', 0.1), i * 80);
    });
  }

  playerHit() {
    this.playTone(150, 0.2, 'sawtooth', 0.2);
    setTimeout(() => this.playTone(100, 0.3, 'square', 0.15), 100);
  }

  bomb() {
    this.playTone(80, 0.5, 'sawtooth', 0.2);
    setTimeout(() => this.playTone(50, 0.8, 'square', 0.15), 100);
    setTimeout(() => this.playTone(120, 0.3, 'triangle', 0.1), 300);
  }

  gameOver() {
    const notes = [523, 466, 392, 349, 262];
    notes.forEach((f, i) => {
      setTimeout(() => this.playTone(f, 0.3, 'square', 0.12), i * 200);
    });
  }

  waveStart() {
    const notes = [523, 659, 784];
    notes.forEach((f, i) => {
      setTimeout(() => this.playTone(f, 0.2, 'triangle', 0.1), i * 120);
    });
  }
}

window.AudioManager = AudioManager;
