import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Phone, PhoneOff, Mic, MicOff, Video, VideoOff, Minimize2, Maximize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useWebSocket } from '@/contexts/WebSocketContext';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface VideoCallDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  callType: 'audio' | 'video';
  remoteUsers?: Array<{
    id: string;
    name: string;
    email: string;
  }>;
  remoteUser?: {
    id: string;
    name: string;
    email: string;
  };
  channelId?: string;
  isIncoming?: boolean;
  callId?: string;
  isGroupCall?: boolean;
}

interface Participant {
  id: string;
  name: string;
  email: string;
  stream?: MediaStream;
  isConnected: boolean;
}

interface CallState {
  status: 'connecting' | 'ringing' | 'connected' | 'ended';
  duration: number;
  localStream?: MediaStream;
  participants: Participant[];
  peerConnections: Map<string, RTCPeerConnection>;
}

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

export function VideoCallDialog({
  open,
  onOpenChange,
  callType,
  remoteUsers = [],
  remoteUser,
  channelId,
  isIncoming = false,
  callId,
  isGroupCall = false
}: VideoCallDialogProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { send, connected, onMessage } = useWebSocket();
  const { toast } = useToast();

  // Initialize participants list
  const initialParticipants = isGroupCall
    ? (remoteUsers?.map(user => ({ ...user, isConnected: false })) || [])
    : remoteUser ? [{ ...remoteUser, isConnected: false }] : [];

  const [callState, setCallState] = useState<CallState>({
    status: isIncoming ? 'ringing' : 'connecting',
    duration: 0,
    participants: initialParticipants,
    peerConnections: new Map(),
  });
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(callType === 'audio');
  const [isMinimized, setIsMinimized] = useState(false);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const durationIntervalRef = useRef<NodeJS.Timeout>();
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());

  const startDurationTimer = useCallback(() => {
    durationIntervalRef.current = setInterval(() => {
      setCallState(prev => ({ ...prev, duration: prev.duration + 1 }));
    }, 1000);
  }, []);

  const stopDurationTimer = useCallback(() => {
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
    }
  }, []);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getGridLayout = (participantCount: number) => {
    if (participantCount <= 1) return 'grid-cols-1';
    if (participantCount === 2) return 'grid-cols-2';
    if (participantCount <= 4) return 'grid-cols-2 grid-rows-2';
    if (participantCount <= 6) return 'grid-cols-3 grid-rows-2';
    if (participantCount <= 9) return 'grid-cols-3 grid-rows-3';
    return 'grid-cols-4 grid-rows-3'; // For larger groups
  };

  const createPeerConnection = useCallback(async (participantId: string) => {
    const pc = new RTCPeerConnection(ICE_SERVERS);
    peerConnectionsRef.current.set(participantId, pc);

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        send({
          type: 'call:ice-candidate',
          payload: {
            callId,
            candidate: event.candidate,
            targetUserId: participantId,
          },
        });
      }
    };

    // Handle remote stream
    pc.ontrack = (event) => {
      console.log('Received remote track from', participantId, event.streams[0]);
      setCallState(prev => ({
        ...prev,
        participants: prev.participants.map(p =>
          p.id === participantId
            ? { ...p, stream: event.streams[0], isConnected: true }
            : p
        ),
        status: prev.status !== 'connected' ? 'connected' : prev.status,
      }));

      // Start timer when first participant connects
      if (prev.participants.every(p => !p.isConnected)) {
        startDurationTimer();
      }
    };

    // Handle connection state changes
    pc.onconnectionstatechange = () => {
      console.log('Connection state for', participantId, ':', pc.connectionState);
      if (pc.connectionState === 'connected') {
        setCallState(prev => ({
          ...prev,
          participants: prev.participants.map(p =>
            p.id === participantId ? { ...p, isConnected: true } : p
          ),
        }));
      } else if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
        setCallState(prev => ({
          ...prev,
          participants: prev.participants.map(p =>
            p.id === participantId ? { ...p, isConnected: false } : p
          ),
        }));
      }
    };

    return pc;
  }, [send, callId, startDurationTimer]);

  const startLocalStream = useCallback(async () => {
    try {
      const constraints = {
        audio: true,
        video: callType === 'video' && !isVideoOff ? {
          width: { ideal: 1280 },
          height: { ideal: 720 },
        } : false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      setCallState(prev => ({ ...prev, localStream: stream }));

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      return stream;
    } catch (error) {
      console.error('Error accessing media devices:', error);
      toast({
        variant: 'destructive',
        title: 'Camera/Microphone Access Denied',
        description: 'Please allow access to camera and microphone for calls.',
      });
      return null;
    }
  }, [callType, isVideoOff, toast]);

  const initiateCall = useCallback(async () => {
    try {
      // Check if we have participants to call
      if (callState.participants.length === 0) {
        toast({
          variant: 'destructive',
          title: 'No Participants',
          description: 'Cannot start call without participants.',
        });
        onOpenChange(false);
        return;
      }

      const stream = await startLocalStream();
      if (!stream) {
        return;
      }

      const callIdentifier = callId || `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Create peer connections for each participant
      const connectionPromises = callState.participants.map(async (participant) => {
        try {
          const pc = await createPeerConnection(participant.id);
          // Add local tracks to peer connection
          stream.getTracks().forEach(track => {
            pc.addTrack(track, stream);
          });
          return { participant, pc };
        } catch (error) {
          console.error('Failed to create peer connection for', participant.id, error);
          return null;
        }
      });

      const connections = (await Promise.all(connectionPromises)).filter(Boolean);

      if (connections.length === 0) {
        throw new Error('No peer connections could be established');
      }

      // Create offers for each connection
      const offerPromises = connections.map(async ({ participant, pc }) => {
        try {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          return { participant, offer };
        } catch (error) {
          console.error('Error creating offer for', participant.id, error);
          return null;
        }
      });

      const offers = (await Promise.all(offerPromises)).filter(Boolean);

    // For group calls, send a single message with all callee IDs
    // For individual calls, send to each participant
    if (isGroupCall) {
      const validOffers = offers.filter(result => result !== null);
      if (validOffers.length > 0) {
        const { participant, offer } = validOffers[0]; // Use first offer for group call initiation
        send({
          type: 'call:initiate',
          payload: {
            callId: callIdentifier,
            callerId: user?.id,
            calleeId: callState.participants.map(p => p.id), // Send array of all participant IDs
            callType,
            offer,
            channelId,
            isGroupCall,
          },
        });
      }
    } else {
      // Send individual offers for 1-on-1 calls
      offers.forEach(result => {
        if (result) {
          const { participant, offer } = result;
          send({
            type: 'call:initiate',
            payload: {
              callId: callIdentifier,
              callerId: user?.id,
              calleeId: participant.id,
              callType,
              offer,
              channelId,
              isGroupCall,
            },
          });
        }
      });
    }

    setCallState(prev => ({ ...prev, status: 'ringing' }));
  } catch (error) {
    console.error('Failed to initiate call:', error);
    toast({
      variant: 'destructive',
      title: 'Call Failed',
      description: 'Failed to start the call. Please try again.',
    });
    // Don't close dialog immediately, let user retry
  }
}, [startLocalStream, createPeerConnection, send, callId, user?.id, callState.participants, callType, channelId, isGroupCall, toast, onOpenChange]);

  const answerCall = useCallback(async (offer: RTCSessionDescriptionInit, callerId: string) => {
    const stream = await startLocalStream();
    if (!stream) return;

    const pc = await createPeerConnection(callerId);

    // Add local tracks to peer connection
    stream.getTracks().forEach(track => {
      pc.addTrack(track, stream);
    });

    try {
      // Set remote description (offer)
      await pc.setRemoteDescription(offer);

      // Create answer
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      // Send answer back
      send({
        type: 'call:answer',
        payload: {
          callId,
          answer,
          targetUserId: callerId,
        },
      });

      setCallState(prev => ({
        ...prev,
        participants: prev.participants.map(p =>
          p.id === callerId ? { ...p, isConnected: true } : p
        ),
        status: 'connected'
      }));
      startDurationTimer();
    } catch (error) {
      console.error('Error answering call:', error);
      endCall();
    }
  }, [startLocalStream, createPeerConnection, send, callId, startDurationTimer]);

  const endCall = useCallback(() => {
    // Stop all local tracks
    callState.localStream?.getTracks().forEach(track => track.stop());

    // Stop all remote tracks
    callState.participants.forEach(participant => {
      participant.stream?.getTracks().forEach(track => track.stop());
    });

    // Close all peer connections
    peerConnectionsRef.current.forEach(pc => pc.close());
    peerConnectionsRef.current.clear();

    // Clear timers
    stopDurationTimer();

    // Send end call signal to all participants
    callState.participants.forEach(participant => {
      send({
        type: 'call:end',
        payload: {
          callId,
          targetUserId: participant.id,
        },
      });
    });

    setCallState(prev => ({
      ...prev,
      status: 'ended',
      duration: 0,
      participants: prev.participants.map(p => ({ ...p, isConnected: false, stream: undefined })),
      peerConnections: new Map(),
    }));

    onOpenChange(false);
  }, [callState.localStream, callState.participants, send, callId, stopDurationTimer, onOpenChange]);

  const toggleMute = useCallback(() => {
    if (callState.localStream) {
      const audioTrack = callState.localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = isMuted;
        setIsMuted(!isMuted);
      }
    }
  }, [callState.localStream, isMuted]);

  const toggleVideo = useCallback(async () => {
    if (isVideoOff) {
      // Turn video on
      try {
        const videoStream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 } },
        });
        const videoTrack = videoStream.getVideoTracks()[0];

        if (callState.localStream) {
          const existingVideoTrack = callState.localStream.getVideoTracks()[0];
          if (existingVideoTrack) {
            callState.localStream.removeTrack(existingVideoTrack);
            existingVideoTrack.stop();
          }
          callState.localStream.addTrack(videoTrack);
        }

        setCallState(prev => ({
          ...prev,
          localStream: callState.localStream,
        }));

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = callState.localStream;
        }

        setIsVideoOff(false);
      } catch (error) {
        console.error('Error turning video on:', error);
      }
    } else {
      // Turn video off
      const videoTrack = callState.localStream?.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = false;
        setIsVideoOff(true);
      }
    }
  }, [isVideoOff, callState.localStream]);

  // Set up video elements when streams change
  useEffect(() => {
    if (localVideoRef.current && callState.localStream) {
      localVideoRef.current.srcObject = callState.localStream;
    }
    if (remoteVideoRef.current && callState.remoteStream) {
      remoteVideoRef.current.srcObject = callState.remoteStream;
    }
  }, [callState.localStream, callState.remoteStream]);

  // Handle WebSocket messages for call signaling
  useEffect(() => {
    const unsubscribe = onMessage((message: any) => {
      console.log('VideoCall received message:', message);
      switch (message.type) {
        case 'call:offer':
          if (message.payload.calleeId === user?.id && (!callId || message.payload.callId === callId)) {
            console.log('Received call offer from', message.payload.callerId);
            setCallId(message.payload.callId);
            answerCall(message.payload.offer, message.payload.callerId);
          }
          break;
        case 'call:answer':
          if (message.payload.callId === callId) {
            console.log('Received call answer from', message.payload.callerId);
            const pc = peerConnectionsRef.current.get(message.payload.callerId);
            if (pc) {
              pc.setRemoteDescription(message.payload.answer);
            }
          }
          break;
        case 'call:ice-candidate':
          if (message.payload.callId === callId) {
            console.log('Received ICE candidate from', message.payload.callerId);
            const pc = peerConnectionsRef.current.get(message.payload.callerId);
            if (pc) {
              pc.addIceCandidate(message.payload.candidate);
            }
          }
          break;
        case 'call:end':
          if (message.payload.callId === callId) {
            console.log('Call ended remotely by', message.payload.callerId);
            endCall();
          }
          break;
      }
    });

    return unsubscribe;
  }, [onMessage, user?.id, callId, answerCall, endCall]);

  // Start call when dialog opens
  useEffect(() => {
    if (open && !isIncoming) {
      initiateCall().catch((error) => {
        console.error('Failed to initiate call:', error);
        // Don't close dialog on error, let user try again
      });
    }
  }, [open, isIncoming, initiateCall]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      endCall();
    };
  }, [endCall]);

  const initials = isGroupCall
    ? 'G' // Group call initials
    : remoteUser?.name
        ?.split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase() || 'U';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`max-w-4xl ${isMinimized ? 'max-h-32' : 'max-h-[80vh]'} p-0 overflow-hidden`}>
        <div className="relative bg-black rounded-lg overflow-hidden">
          {/* Video grid for multiple participants */}
          <div className={`relative bg-gray-900 ${isMinimized ? 'h-32' : 'aspect-video'} flex items-center justify-center`}>
            {callState.participants.length === 0 && !isMinimized ? (
              <div className="text-center text-white">
                <h3 className="text-xl font-semibold">Waiting for participants...</h3>
                <p className="text-gray-300">
                  {callState.status === 'connecting' && 'Connecting...'}
                  {callState.status === 'ringing' && 'Ringing...'}
                  {callState.status === 'connected' && `Connected • ${formatDuration(callState.duration)}`}
                  {callState.status === 'ended' && 'Call ended'}
                </p>
              </div>
            ) : (
              <div className={`w-full h-full ${isMinimized ? 'grid-cols-1' : getGridLayout(callState.participants.length + 1)} gap-1 p-1`}>
                {/* Local video */}
                {callState.localStream && callType === 'video' && (
                  <div className="relative bg-gray-800 rounded-lg overflow-hidden flex items-center justify-center">
                    <video
                      ref={localVideoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute bottom-1 left-1 text-white text-xs bg-black/50 px-2 py-1 rounded">
                      You
                    </div>
                  </div>
                )}

                {/* Remote participant videos */}
                {callState.participants.map((participant) => (
                  <div key={participant.id} className="relative bg-gray-800 rounded-lg overflow-hidden flex items-center justify-center">
                    {participant.stream ? (
                      <video
                        autoPlay
                        playsInline
                        className="w-full h-full object-cover"
                        ref={(el) => {
                          if (el && participant.stream) {
                            el.srcObject = participant.stream;
                          }
                        }}
                      />
                    ) : (
                      <div className="text-center text-white">
                        <Avatar className="w-16 h-16 mx-auto mb-2">
                          <AvatarFallback className="text-lg bg-gray-700 text-white">
                            {participant.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <p className="text-sm">{participant.name}</p>
                        <p className="text-xs text-gray-400">
                          {participant.isConnected ? 'Connected' : 'Connecting...'}
                        </p>
                      </div>
                    )}
                    <div className="absolute bottom-1 left-1 text-white text-xs bg-black/50 px-2 py-1 rounded">
                      {participant.name}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Status overlay for minimized view */}
            {isMinimized && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                <div className="text-center text-white">
                  <h3 className="text-lg font-semibold">
                    {isGroupCall ? 'Group Call' : remoteUser?.name || 'Call'}
                  </h3>
                  <p className="text-sm text-gray-300">
                    {callState.status === 'connecting' && 'Connecting...'}
                    {callState.status === 'ringing' && 'Ringing...'}
                    {callState.status === 'connected' && `${formatDuration(callState.duration)} • ${callState.participants.filter(p => p.isConnected).length + 1} participants`}
                    {callState.status === 'ended' && 'Call ended'}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Call controls */}
          <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 to-transparent">
            <div className="flex items-center justify-center space-x-4">
              <Button
                variant="secondary"
                size="lg"
                onClick={toggleMute}
                className={`rounded-full w-12 h-12 p-0 ${isMuted ? 'bg-red-600 hover:bg-red-700' : ''}`}
              >
                {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </Button>

              {callType === 'video' && (
                <Button
                  variant="secondary"
                  size="lg"
                  onClick={toggleVideo}
                  className={`rounded-full w-12 h-12 p-0 ${isVideoOff ? 'bg-red-600 hover:bg-red-700' : ''}`}
                >
                  {isVideoOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
                </Button>
              )}

              <Button
                variant="secondary"
                size="lg"
                onClick={() => setIsMinimized(!isMinimized)}
                className="rounded-full w-12 h-12 p-0"
              >
                {isMinimized ? <Maximize2 className="w-5 h-5" /> : <Minimize2 className="w-5 h-5" />}
              </Button>

              <Button
                variant="destructive"
                size="lg"
                onClick={endCall}
                className="rounded-full w-12 h-12 p-0"
              >
                <PhoneOff className="w-5 h-5" />
              </Button>
            </div>
          </div>

          {/* Incoming call actions */}
          {isIncoming && callState.status === 'ringing' && (
            <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 to-transparent">
              <div className="flex items-center justify-center space-x-4">
                <Button
                  variant="destructive"
                  size="lg"
                  onClick={endCall}
                  className="rounded-full w-16 h-16 p-0"
                >
                  <PhoneOff className="w-6 h-6" />
                </Button>
                <Button
                  variant="default"
                  size="lg"
                  onClick={() => {
                    // Accept call would be implemented here
                    setCallState(prev => ({ ...prev, status: 'connecting' }));
                  }}
                  className="rounded-full w-16 h-16 p-0 bg-green-600 hover:bg-green-700"
                >
                  <Phone className="w-6 h-6" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
