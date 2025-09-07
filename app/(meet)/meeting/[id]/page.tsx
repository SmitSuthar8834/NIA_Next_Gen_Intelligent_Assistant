'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Mic, MicOff, Phone, PhoneOff, Users, ArrowLeft, Copy, Check } from 'lucide-react';
import { WebRTCClient } from '@/lib/webrtc/client';
import { EnhancedSignalingClient } from '@/lib/signaling';
import { useMeetingStore } from '@/stores/meeting';
import { useUser } from '@/hooks/useUser';
import { EnhancedSignalingMessage } from '@/lib/types/webrtc';

export default function MeetingPage() {
  const params = useParams();
  const router = useRouter();
  const meetingId = params.id as string;
  const { user, access_token } = useUser();

  // Debug logging
  console.log('Meeting Page - Room ID:', meetingId);
  console.log('Meeting Page - User:', user?.id);

  const webrtcClientRef = useRef<WebRTCClient | null>(null);
  const signalingClientRef = useRef<EnhancedSignalingClient | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const [currentUserId] = useState(() => user?.id || 'user-' + Math.random().toString(36).substr(2, 9));
  const [remoteUserId, setRemoteUserId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const copyRoomId = async () => {
    try {
      await navigator.clipboard.writeText(meetingId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy room ID:', err);
    }
  };

  const copyMeetingUrl = async () => {
    try {
      const url = window.location.href;
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy meeting URL:', err);
    }
  };

  const {
    isConnected,
    isMuted,
    isInCall,
    connectionStatus,
    participants,
    setConnected,
    setMuted,
    setInCall,
    setConnectionStatus,
    addParticipant,
    removeParticipant,
    reset
  } = useMeetingStore();

  // All hooks must be called before any conditional returns
  // Redirect to login if not authenticated
  useEffect(() => {
    if (!user && typeof window !== 'undefined') {
      const redirectUrl = encodeURIComponent(window.location.pathname);
      router.push(`/login?redirect=${redirectUrl}`);
    }
  }, [user, router]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (webrtcClientRef.current) {
        webrtcClientRef.current.cleanup();
      }
      if (signalingClientRef.current) {
        signalingClientRef.current.disconnect();
      }
      reset();
    };
  }, [reset]);

  // Monitor WebRTC connection state
  useEffect(() => {
    const interval = setInterval(() => {
      if (webrtcClientRef.current) {
        const state = webrtcClientRef.current.getConnectionState();
        if (state === 'connected' && connectionStatus !== 'connected') {
          setConnectionStatus('connected');
        } else if (state === 'disconnected' && connectionStatus === 'connected') {
          setConnectionStatus('disconnected');
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [connectionStatus]);

  // Don't render if not authenticated
  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center bg-white p-8 rounded-lg shadow-lg max-w-md">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 mb-4">Authentication Required</p>
          <p className="text-sm text-gray-500 mb-4">
            You need to be logged in to join meetings.
          </p>
          <Button
            onClick={() => {
              const redirectUrl = encodeURIComponent(window.location.pathname);
              router.push(`/login?redirect=${redirectUrl}`);
            }}
            className="w-full"
          >
            Go to Login
          </Button>
        </div>
      </div>
    );
  }

  const handleJoinCall = async () => {
    try {
      setConnectionStatus('connecting');

      // Check for microphone permissions first
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach(track => track.stop()); // Stop the test stream
      } catch (permissionError) {
        console.error('Microphone permission denied:', permissionError);
        alert('Microphone access is required for audio meetings. Please allow microphone access and try again.');
        setConnectionStatus('disconnected');
        return;
      }

      // Initialize WebRTC first
      const rtcClient = new WebRTCClient(
        (stream) => {
          console.log('Remote stream received');
          setConnectionStatus('connected');
        },
        (candidate) => {
          // Send ICE candidate via signaling
          signalingClientRef.current?.send({
            type: 'ice',
            from_user: currentUserId,
            to_user: remoteUserId || undefined,
            candidate
          });
        }
      );

      // Attach the page's audio element
      rtcClient.setRemoteAudioElement(remoteAudioRef.current);
      await rtcClient.initialize();
      webrtcClientRef.current = rtcClient;

      // Now initialize signaling and wait for connection
      await new Promise<void>((resolve, reject) => {
        const sigClient = new EnhancedSignalingClient(
          meetingId,
          handleSignalingMessage,
          (connected) => {
            console.log('WebSocket connection status changed:', connected);
            setConnected(connected);
            if (connected) {
              setConnectionStatus('connected');
              resolve();
            } else if (isInCall) {
              setConnectionStatus('disconnected');
            }
          },
          (participants) => {
            // Handle participants change
            console.log('Participants updated:', participants);
            // You can update your participants state here if needed
          },
          (userId, isActive) => {
            // Handle voice activity
            console.log('Voice activity:', userId, isActive);
          },
          currentUserId
        );

        console.log('Connecting with token:', access_token ? 'Token available' : 'No token');
        sigClient.connect(access_token || undefined);
        signalingClientRef.current = sigClient;

        setTimeout(() => {
          reject(new Error('WebSocket connection timeout'));
        }, 10000);
      });


      setInCall(true);
      addParticipant(currentUserId);

      // Now send join message since WebSocket is connected
      console.log('Sending join message...');
      signalingClientRef.current?.send({
        type: 'join',
        from_user: currentUserId
      });

    } catch (error) {
      console.error('Failed to join call:', error);
      setConnectionStatus('disconnected');
      alert('Failed to join call. Please check your microphone permissions and try again.');
    }
  };

  const handleLeaveCall = () => {
    webrtcClientRef.current?.cleanup();
    signalingClientRef.current?.disconnect();
    webrtcClientRef.current = null;
    signalingClientRef.current = null;
    reset();
  };

  const handleToggleMute = () => {
    if (webrtcClientRef.current) {
      const muted = webrtcClientRef.current.toggleMute();
      setMuted(muted);
    }
  };

  const playAIVoiceMessage = async (message: any) => {
    try {
      if (message.audio_data) {
        // Convert base64 audio to blob
        const audioBytes = atob(message.audio_data);
        const audioArray = new Uint8Array(audioBytes.length);
        for (let i = 0; i < audioBytes.length; i++) {
          audioArray[i] = audioBytes.charCodeAt(i);
        }

        const audioBlob = new Blob([audioArray], { type: 'audio/mp3' });
        const audioUrl = URL.createObjectURL(audioBlob);

        // Create and play audio element
        const audio = new Audio(audioUrl);
        audio.volume = 0.8;

        await audio.play();

        // Clean up URL after playing
        audio.addEventListener('ended', () => {
          URL.revokeObjectURL(audioUrl);
        });

        console.log('Playing AI voice message:', message.message);
      }
    } catch (error) {
      console.error('Error playing AI voice:', error);
    }
  };

  const handleSignalingMessage = async (message: EnhancedSignalingMessage) => {
    console.log('Handling signaling message:', message.type, 'from:', message.from_user);

    // Track participants first
    if (message.from_user !== currentUserId) {
      addParticipant(message.from_user);
      setRemoteUserId(message.from_user);
    }

    if (!webrtcClientRef.current) {
      console.warn('WebRTC client not initialized');
      return;
    }

    try {
      switch (message.type) {
        case 'join':
          if (message.from_user !== currentUserId) {
            // We received a join from another user, create an offer
            console.log('Creating offer for new participant:', message.from_user);
            const offer = await webrtcClientRef.current.createOffer();
            signalingClientRef.current?.send({
              type: 'offer',
              from_user: currentUserId,
              to_user: message.from_user,
              sdp: offer
            });
          }
          break;

        case 'offer':
          if (message.sdp && message.from_user !== currentUserId) {
            console.log('Handling offer from:', message.from_user);
            try {
              // handleOfferAndCreateAnswer will set remote desc and create local answer
              const answer = await webrtcClientRef.current!.handleOfferAndCreateAnswer(message.sdp);
              signalingClientRef.current?.send({
                type: 'answer',
                from_user: currentUserId,
                to_user: message.from_user,
                sdp: answer
              });
              console.log('Sent answer to:', message.from_user);
            } catch (error) {
              console.error('Error handling offer:', error);
            }
          }
          break;


        case 'answer':
          if (message.sdp && message.from_user !== currentUserId) {
            console.log('Handling answer from:', message.from_user);
            try {
              await webrtcClientRef.current.handleAnswer(message.sdp);
              console.log('Successfully handled answer from:', message.from_user);
              setConnectionStatus('connected');
            } catch (error) {
              console.error('Error handling answer:', error);
            }
          }
          break;

        case 'ice':
          if (message.candidate && message.from_user !== currentUserId) {
            console.log('Adding ICE candidate from:', message.from_user);
            await webrtcClientRef.current.addIceCandidate(message.candidate);
          }
          break;

        case 'ai_voice_message':
          if (message.from_user === 'ai-assistant') {
            console.log('AI speaking:', message.message);
            // Play AI voice audio
            await playAIVoiceMessage(message);
          }
          break;

        case 'ai_speaking_finished':
          if (message.from_user === 'ai-assistant') {
            console.log('AI finished speaking');
          }
          break;

        case 'leave':
          if (message.from_user !== currentUserId) {
            console.log('Participant left:', message.from_user);
            removeParticipant(message.from_user);
            if (message.from_user === remoteUserId) {
              setRemoteUserId(null);
              setConnectionStatus('disconnected');
            }
          }
          break;
      }
    } catch (error) {
      console.error('Error handling signaling message:', error);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8 bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="bg-white rounded-xl shadow-xl p-8 max-w-lg w-full border border-gray-200 relative">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push('/meetings')}
          className="absolute top-4 left-4 text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Meetings
        </Button>
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Mic className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Audio Meeting
          </h1>
          <p className="text-gray-600">
            Room: <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">{meetingId}</span>
          </p>
        </div>

        <div className="text-center mb-6">
          <audio ref={remoteAudioRef} autoPlay playsInline style={{ display: 'none' }} />
          <div className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-medium transition-all ${connectionStatus === 'connected' ? 'bg-green-100 text-green-800 border border-green-200' :
            connectionStatus === 'connecting' ? 'bg-yellow-100 text-yellow-800 border border-yellow-200' :
              'bg-gray-100 text-gray-800 border border-gray-200'
            }`}>
            <div className={`w-2 h-2 rounded-full mr-2 animate-pulse ${connectionStatus === 'connected' ? 'bg-green-500' :
              connectionStatus === 'connecting' ? 'bg-yellow-500' :
                'bg-gray-500'
              }`}></div>
            {connectionStatus === 'connected' ? 'Connected' :
              connectionStatus === 'connecting' ? 'Connecting...' :
                'Disconnected'}
          </div>
        </div>

        {participants.length > 0 && (
          <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center text-sm text-blue-700 mb-3 font-medium">
              <Users className="w-4 h-4 mr-2" />
              Participants ({participants.length})
            </div>
            <div className="space-y-2">
              {participants.map((participant, index) => (
                <div key={`${participant}-${index}`} className="flex items-center justify-between text-sm bg-white rounded px-3 py-2 border">
                  <span className="font-medium">
                    {participant === currentUserId ? `${participant} (You)` : participant}
                  </span>
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                    <span className="text-xs text-green-600">Online</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-center space-x-3 mb-6">
          {!isInCall ? (
            <Button
              onClick={handleJoinCall}
              className="flex items-center space-x-2 px-8 py-3 text-lg"
              disabled={connectionStatus === 'connecting'}
              size="lg"
            >
              <Phone className="w-5 h-5" />
              <span>{connectionStatus === 'connecting' ? 'Joining...' : 'Join Call'}</span>
            </Button>
          ) : (
            <>
              <Button
                onClick={handleToggleMute}
                variant={isMuted ? "destructive" : "outline"}
                className="flex items-center space-x-2 px-6 py-3"
                size="lg"
              >
                {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                <span>{isMuted ? 'Unmute' : 'Mute'}</span>
              </Button>

              <Button
                onClick={handleLeaveCall}
                variant="destructive"
                className="flex items-center space-x-2 px-6 py-3"
                size="lg"
              >
                <PhoneOff className="w-5 h-5" />
                <span>Leave</span>
              </Button>
            </>
          )}
        </div>

        <div className="text-center space-y-3">
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-sm text-blue-700 font-medium mb-3">Invite others to join:</p>

            <div className="space-y-2">
              <div className="flex items-center justify-between bg-white rounded border p-2">
                <span className="text-xs text-blue-600">Room ID:</span>
                <div className="flex items-center space-x-2">
                  <span className="font-mono text-sm">{meetingId}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={copyRoomId}
                    className="h-6 w-6 p-0"
                  >
                    {copied ? <Check className="w-3 h-3 text-green-600" /> : <Copy className="w-3 h-3" />}
                  </Button>
                </div>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={copyMeetingUrl}
                className="w-full text-xs"
              >
                {copied ? <Check className="w-3 h-3 mr-2 text-green-600" /> : <Copy className="w-3 h-3 mr-2" />}
                Copy Meeting URL
              </Button>
            </div>
          </div>

          <div className="text-xs text-gray-500">
            <p>• Make sure to allow microphone access when prompted</p>
            <p>• Audio-only meeting using WebRTC technology</p>
            <p>• Works best with Chrome, Firefox, or Safari</p>
          </div>
        </div>
      </div>
    </div>
  );
}