function getWebkitAudioContext(): typeof AudioContext | undefined {
  return (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
}

export class AudioManager {
  private context?: AudioContext;
  private masterVolume = 0.75;

  unlock(): void {
    const AudioContextConstructor = window.AudioContext ?? getWebkitAudioContext();
    if (!AudioContextConstructor) return;

    try {
      this.context ??= new AudioContextConstructor();
    } catch {
      return;
    }

    if (this.context.state === 'suspended') {
      void this.context.resume();
    }
  }

  pop(frequency = 420): void {
    this.playTone(frequency, 0.035, 'sine', 0.025);
  }

  splash(): void {
    this.playTone(170, 0.07, 'triangle', 0.04);
    window.setTimeout(() => this.playTone(260, 0.055, 'sine', 0.03), 30);
  }

  giggle(): void {
    this.playTone(520, 0.045, 'sine', 0.025);
    window.setTimeout(() => this.playTone(680, 0.04, 'sine', 0.022), 55);
  }

  private playTone(frequency: number, duration: number, type: OscillatorType, volume: number): void {
    this.unlock();
    if (!this.context) return;

    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    oscillator.type = type;
    oscillator.frequency.value = frequency;
    gain.gain.value = volume * this.masterVolume;
    oscillator.connect(gain);
    gain.connect(this.context.destination);
    oscillator.start();
    gain.gain.exponentialRampToValueAtTime(0.0001, this.context.currentTime + duration);
    oscillator.stop(this.context.currentTime + duration);
  }
}
