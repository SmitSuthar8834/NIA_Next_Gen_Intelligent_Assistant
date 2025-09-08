/**
 * Voice Activity Detection (VAD) utility for WebRTC meetings
 * Detects when a user is speaking and manages voice activity coordination
 */

export interface VoiceActivityOptions {
  sensitivity: number; // 0-1, higher = more sensitive
  minSpeechDuration: number; // minimum ms of speech to trigger
  silenceDuration: number; // ms of silence before ending speech
  aiMode: boolean; // reduces sensitivity when AI is speaking
}

export class VoiceActivityDetector {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private dataArray: Uint8Array<ArrayBuffer> | null = null;
  private animationFrame: number | null = null;

  private isDetecting = false;
  private isSpeaking = false;
  private speechStartTime = 0;
  private lastSpeechTime = 0;

  private options: VoiceActivityOptions = {
    sensitivity: 0.3,
    minSpeechDuration: 300,
    silenceDuration: 1000,
    aiMode: false,
  };

  private onVoiceStartCallback?: () => void;
  private onVoiceEndCallback?: () => void;
  private onAudioLevelCallback?: (level: number) => void;

  constructor(options?: Partial<VoiceActivityOptions>) {
    if (options) {
      this.options = { ...this.options, ...options };
    }
  }

  async startDetection(stream: MediaStream): Promise<void> {
    try {
      // Create audio context
      this.audioContext = new AudioContext();

      // Create analyser
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256;
      this.analyser.smoothingTimeConstant = 0.8;

      // Create source from stream
      this.source = this.audioContext.createMediaStreamSource(stream);
      this.source.connect(this.analyser);

      // Create data array for analysis
      this.dataArray = new Uint8Array(
        new ArrayBuffer(this.analyser.frequencyBinCount)
      ) as Uint8Array<ArrayBuffer>;

      this.isDetecting = true;
      this.analyze();

      console.log("Voice activity detection started");
    } catch (error) {
      console.error("Failed to start voice activity detection:", error);
      throw error;
    }
  }

  stopDetection(): void {
    this.isDetecting = false;

    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }

    if (this.source) {
      this.source.disconnect();
      this.source = null;
    }

    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }

    this.analyser = null;
    this.dataArray = null;

    // End any active speech
    if (this.isSpeaking) {
      this.endSpeech();
    }

    console.log("Voice activity detection stopped");
  }

  private analyze(): void {
    if (!this.isDetecting || !this.analyser || !this.dataArray) {
      return;
    }

    // Get frequency data
    this.analyser.getByteFrequencyData(this.dataArray!);

    // Calculate average volume
    const average =
      this.dataArray.reduce((sum, value) => sum + value, 0) /
      this.dataArray.length;
    const normalizedLevel = average / 255;

    // Call audio level callback
    if (this.onAudioLevelCallback) {
      this.onAudioLevelCallback(normalizedLevel);
    }

    // Adjust sensitivity based on AI mode
    const effectiveSensitivity = this.options.aiMode
      ? this.options.sensitivity * 0.5 // Reduce sensitivity when AI is speaking
      : this.options.sensitivity;

    const threshold = effectiveSensitivity * 255;
    const now = Date.now();

    if (average > threshold) {
      // Voice detected
      if (!this.isSpeaking) {
        this.speechStartTime = now;
      }
      this.lastSpeechTime = now;

      // Check if we've been speaking long enough to trigger
      if (
        !this.isSpeaking &&
        now - this.speechStartTime >= this.options.minSpeechDuration
      ) {
        this.startSpeech();
      }
    } else {
      // No voice detected
      if (
        this.isSpeaking &&
        now - this.lastSpeechTime >= this.options.silenceDuration
      ) {
        this.endSpeech();
      }
    }

    // Continue analysis
    this.animationFrame = requestAnimationFrame(() => this.analyze());
  }

  private startSpeech(): void {
    if (this.isSpeaking) return;

    this.isSpeaking = true;
    console.log("Voice activity started");

    if (this.onVoiceStartCallback) {
      this.onVoiceStartCallback();
    }
  }

  private endSpeech(): void {
    if (!this.isSpeaking) return;

    this.isSpeaking = false;
    console.log("Voice activity ended");

    if (this.onVoiceEndCallback) {
      this.onVoiceEndCallback();
    }
  }

  // Public methods for configuration
  setSensitivity(level: number): void {
    this.options.sensitivity = Math.max(0, Math.min(1, level));
  }

  setAIMode(enabled: boolean): void {
    this.options.aiMode = enabled;
    console.log(
      `AI mode ${enabled ? "enabled" : "disabled"} - sensitivity adjusted`
    );
  }

  setMinSpeechDuration(ms: number): void {
    this.options.minSpeechDuration = Math.max(100, ms);
  }

  setSilenceDuration(ms: number): void {
    this.options.silenceDuration = Math.max(500, ms);
  }

  // Event handlers
  onVoiceStart(callback: () => void): void {
    this.onVoiceStartCallback = callback;
  }

  onVoiceEnd(callback: () => void): void {
    this.onVoiceEndCallback = callback;
  }

  onAudioLevel(callback: (level: number) => void): void {
    this.onAudioLevelCallback = callback;
  }

  // Getters
  get isActive(): boolean {
    return this.isDetecting;
  }

  get speaking(): boolean {
    return this.isSpeaking;
  }

  get currentOptions(): VoiceActivityOptions {
    return { ...this.options };
  }
}

// Factory function for easy creation
export function createVoiceActivityDetector(
  options?: Partial<VoiceActivityOptions>
): VoiceActivityDetector {
  return new VoiceActivityDetector(options);
}

// Utility function to test microphone and VAD
export async function testVoiceActivityDetection(
  duration: number = 5000
): Promise<void> {
  console.log(`Testing voice activity detection for ${duration}ms...`);

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const vad = new VoiceActivityDetector({ sensitivity: 0.3 });

    vad.onVoiceStart(() => console.log("🎤 Speech detected!"));
    vad.onVoiceEnd(() => console.log("🔇 Speech ended"));
    vad.onAudioLevel((level) => {
      if (level > 0.1) {
        console.log(`📊 Audio level: ${(level * 100).toFixed(1)}%`);
      }
    });

    await vad.startDetection(stream);

    setTimeout(() => {
      vad.stopDetection();
      stream.getTracks().forEach((track) => track.stop());
      console.log("Voice activity detection test completed");
    }, duration);
  } catch (error) {
    console.error("Failed to test voice activity detection:", error);
  }
}
