class AudioSystem {
  constructor() {
    this.ctx = null;
    this.enabled = false;
    this.humOsc = null;
    this.humGain = null;
  }

  init() {
    if (this.ctx) return;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (AudioContext) {
      this.ctx = new AudioContext();
    }
  }

  toggle(enable) {
    this.enabled = enable;
    if (this.enabled) {
      this.init();
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
      this.startHum();
    } else {
      this.stopHum();
    }
  }

  startHum() {
    if (!this.ctx || !this.enabled) return;
    if (this.humOsc) return;

    this.humOsc = this.ctx.createOscillator();
    this.humGain = this.ctx.createGain();

    this.humOsc.type = 'sine';
    this.humOsc.frequency.setValueAtTime(55, this.ctx.currentTime); // Low hum
    
    // Add some subtle modulation
    const lfo = this.ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.setValueAtTime(0.5, this.ctx.currentTime);
    const lfoGain = this.ctx.createGain();
    lfoGain.gain.setValueAtTime(5, this.ctx.currentTime);
    lfo.connect(lfoGain);
    lfoGain.connect(this.humOsc.frequency);
    lfo.start();

    this.humGain.gain.setValueAtTime(0.05, this.ctx.currentTime); // Very quiet

    this.humOsc.connect(this.humGain);
    this.humGain.connect(this.ctx.destination);
    this.humOsc.start();
  }

  stopHum() {
    if (this.humOsc) {
      this.humOsc.stop();
      this.humOsc.disconnect();
      this.humGain.disconnect();
      this.humOsc = null;
      this.humGain = null;
    }
  }

  playBeep(type = 'click') {
    if (!this.ctx || !this.enabled) return;
    
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    
    if (type === 'click') {
      osc.type = 'square';
      osc.frequency.setValueAtTime(800, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1200, this.ctx.currentTime + 0.05);
      gain.gain.setValueAtTime(0.05, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.05);
      osc.start(this.ctx.currentTime);
      osc.stop(this.ctx.currentTime + 0.05);
    } else if (type === 'type') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(400, this.ctx.currentTime);
      gain.gain.setValueAtTime(0.02, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.02);
      osc.start(this.ctx.currentTime);
      osc.stop(this.ctx.currentTime + 0.02);
    } else if (type === 'error') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(150, this.ctx.currentTime);
      osc.frequency.setValueAtTime(100, this.ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.01, this.ctx.currentTime + 0.2);
      osc.start(this.ctx.currentTime);
      osc.stop(this.ctx.currentTime + 0.2);
    } else if (type === 'radar') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1200, this.ctx.currentTime);
      gain.gain.setValueAtTime(0, this.ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.1, this.ctx.currentTime + 0.1);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.5);
      osc.start(this.ctx.currentTime);
      osc.stop(this.ctx.currentTime + 0.5);
    }
  }
}

export const audio = new AudioSystem();
