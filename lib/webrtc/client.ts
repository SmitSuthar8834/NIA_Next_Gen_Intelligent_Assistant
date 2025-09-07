// client.ts
export class WebRTCClient {
  private peerConnection: RTCPeerConnection | null = null;
  private localStreams: MediaStream[] = []; // keep references to local / injected streams
  private remoteAudioElement: HTMLAudioElement | null = null;
  private onRemoteStreamCallback: ((s: MediaStream) => void) | null = null;
  private onIceCandidateCallback: ((cand: RTCIceCandidateInit) => void) | null = null;

  constructor(
    onRemoteStream?: (stream: MediaStream) => void,
    onIceCandidate?: (candidate: RTCIceCandidateInit) => void
  ) {
    this.onRemoteStreamCallback = onRemoteStream || null;
    this.onIceCandidateCallback = onIceCandidate || null;
  }

  setRemoteAudioElement(el: HTMLAudioElement | null) {
    this.remoteAudioElement = el;
    if (this.remoteAudioElement) {
      this.remoteAudioElement.autoplay = true;
    }
  }

  getPeerConnection() {
    return this.peerConnection;
  }

  async initialize(iceServers?: RTCIceServer[]) {
    const config: RTCConfiguration = {
      iceServers: iceServers ?? [{ urls: 'stun:stun.l.google.com:19302' }]
    };
    this.peerConnection = new RTCPeerConnection(config);

    this.peerConnection.onicecandidate = (e) => {
      if (e.candidate && this.onIceCandidateCallback) {
        this.onIceCandidateCallback(e.candidate.toJSON());
      }
    };

    this.peerConnection.onconnectionstatechange = () => {
      console.log('PC connectionState:', this.peerConnection?.connectionState);
    };
    this.peerConnection.oniceconnectionstatechange = () => {
      console.log('PC iceConnectionState:', this.peerConnection?.iceConnectionState);
    };

    this.peerConnection.ontrack = (event) => {
      try {
        console.log('ontrack event:', event.track.kind);
        let inboundStream: MediaStream | null = null;
        if (event.streams && event.streams.length > 0) {
          inboundStream = event.streams[0];
        } else {
          inboundStream = new MediaStream();
          inboundStream.addTrack(event.track);
        }
        // attach to page audio element if present
        if (this.remoteAudioElement && inboundStream) {
          try {
            this.remoteAudioElement.srcObject = inboundStream;
            // Try to play, but if blocked, page should call play after a gesture.
            this.remoteAudioElement.play().catch((err) => {
              console.debug('remoteAudio.play() blocked:', err);
            });
          } catch (err) {
            console.warn('Failed to set remoteAudioElement.srcObject:', err);
          }
        }
        if (this.onRemoteStreamCallback && inboundStream) {
          this.onRemoteStreamCallback(inboundStream);
        }
      } catch (err) {
        console.error('ontrack error:', err);
      }
    };

    // get user mic and add tracks (so join will automatically publish mic)
    try {
      const local = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.localStreams.push(local);
      local.getTracks().forEach((t) => this.peerConnection!.addTrack(t, local));
      console.log('Local microphone stream obtained and tracks added.');
    } catch (err) {
      console.warn('Failed to get microphone on initialize (user may call later):', err);
      // do not rethrow — allow pages that manage mic themselves
    }

    return this.peerConnection;
  }

  async createOffer(): Promise<RTCSessionDescriptionInit> {
    if (!this.peerConnection) throw new Error('PeerConnection not initialized');
    const offer = await this.peerConnection.createOffer({ offerToReceiveAudio: true });
    await this.peerConnection.setLocalDescription(offer);
    console.log('Created local offer');
    return this.peerConnection.localDescription!.toJSON();
  }

  async handleAnswer(answer: RTCSessionDescriptionInit) {
    if (!this.peerConnection) throw new Error('PeerConnection not initialized');
    await this.peerConnection.setRemoteDescription(answer);
    console.log('Set remote answer');
  }

  async handleOfferAndCreateAnswer(offer: RTCSessionDescriptionInit): Promise<RTCSessionDescriptionInit> {
    if (!this.peerConnection) throw new Error('PeerConnection not initialized');
    await this.peerConnection.setRemoteDescription(offer);
    const answer = await this.peerConnection.createAnswer();
    await this.peerConnection.setLocalDescription(answer);
    console.log('Created local answer for remote offer');
    return this.peerConnection.localDescription!.toJSON();
  }

  async addIceCandidate(candidate: RTCIceCandidateInit | RTCIceCandidate) {
    if (!this.peerConnection) throw new Error('PeerConnection not initialized');
    try {
      const cInit = ('candidate' in candidate) ? (candidate as RTCIceCandidateInit) : (candidate as any);
      await this.peerConnection.addIceCandidate(new RTCIceCandidate(cInit));
      console.log('Added ICE candidate');
    } catch (err) {
      console.warn('addIceCandidate failed:', err);
    }
  }

  /**
   * Injects an external MediaStream (e.g., TTS output) into the PeerConnection as outgoing tracks.
   * Keeps a reference so it can be removed/cleaned up later.
   */
  addInjectedStream(stream: MediaStream) {
    if (!this.peerConnection) throw new Error('PeerConnection not initialized');
    this.localStreams.push(stream);
    stream.getTracks().forEach((t) => {
      try {
        this.peerConnection!.addTrack(t, stream);
      } catch (err) {
        console.warn('Failed to add injected track:', err);
      }
    });
    console.log('Injected stream added to PeerConnection');
  }

  /**
   * Remove an injected stream (remove associated RTCRtpSenders and stop tracks).
   * Pass the same stream object that was added.
   */
  removeInjectedStream(stream: MediaStream) {
    if (!this.peerConnection) return;
    const senders = this.peerConnection.getSenders();
    stream.getTracks().forEach((track) => {
      const sender = senders.find((s) => s.track === track);
      if (sender && typeof this.peerConnection!.removeTrack === 'function') {
        try {
          this.peerConnection!.removeTrack(sender);
          console.log('Removed sender for injected track');
        } catch (err) {
          console.warn('Failed to remove sender:', err);
        }
      }
      try { track.stop(); } catch(e){/*ignore*/ }
    });
    // also remove from localStreams list
    this.localStreams = this.localStreams.filter(s => s !== stream);
  }

  toggleMute(): boolean {
    const micStream = this.localStreams.find(s => s.getAudioTracks().length > 0);
    if (!micStream) return false;
    const t = micStream.getAudioTracks()[0];
    t.enabled = !t.enabled;
    console.log('toggleMute -> now enabled:', t.enabled);
    return !t.enabled;
  }

  getConnectionState(): RTCPeerConnectionState | null {
    return this.peerConnection?.connectionState || null;
  }

  cleanup() {
    console.log('Cleaning WebRTCClient');
    this.localStreams.forEach(s => s.getTracks().forEach(t => { try { t.stop(); } catch(e){} }));
    this.localStreams = [];
    if (this.peerConnection) {
      try { this.peerConnection.close(); } catch (e) {}
      this.peerConnection = null;
    }
    if (this.remoteAudioElement) {
      try {
        this.remoteAudioElement.pause();
        this.remoteAudioElement.srcObject = null;
      } catch (e) {}
      this.remoteAudioElement = null;
    }
  }
}
