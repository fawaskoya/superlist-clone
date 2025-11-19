import React, { useState, useEffect, useCallback } from 'react';
import { useWebSocket } from '@/contexts/WebSocketContext';
import { useAuth } from '@/contexts/AuthContext';
import { IncomingCallNotification } from './chat/IncomingCallNotification';

interface IncomingCall {
  id: string;
  caller: {
    id: string;
    name: string;
    email: string;
  };
  callType: 'audio' | 'video';
  callId: string;
  channelId?: string;
}

export function CallNotificationManager() {
  const { onMessage } = useWebSocket();
  const { user } = useAuth();
  const [incomingCalls, setIncomingCalls] = useState<IncomingCall[]>([]);

  // Listen for WebSocket messages
  useEffect(() => {
    const unsubscribe = onMessage((message: any) => {
      if (message.type === 'call:incoming') {
        const callData = message.payload;

        // Only show if call is for current user
        if (callData.calleeId === user?.id) {
          const newCall: IncomingCall = {
            id: callData.callId,
            caller: callData.caller,
            callType: callData.callType,
            callId: callData.callId,
            channelId: callData.channelId,
          };

          setIncomingCalls(prev => [...prev, newCall]);

          // Auto-dismiss after 30 seconds if not answered
          setTimeout(() => {
            setIncomingCalls(prev => prev.filter(call => call.id !== newCall.id));
          }, 30000);
        }
      }
    });

    return unsubscribe;
  }, [onMessage, user?.id]);

  const handleAcceptCall = useCallback((callId: string) => {
    setIncomingCalls(prev => prev.filter(call => call.id !== callId));
  }, []);

  const handleRejectCall = useCallback((callId: string) => {
    setIncomingCalls(prev => prev.filter(call => call.id !== callId));
    // Send rejection signal via WebSocket
  }, []);

  return (
    <>
      {incomingCalls.map(call => (
        <IncomingCallNotification
          key={call.id}
          caller={call.caller}
          callType={call.callType}
          callId={call.callId}
          channelId={call.channelId}
          onAccept={() => handleAcceptCall(call.id)}
          onReject={() => handleRejectCall(call.id)}
        />
      ))}
    </>
  );
}
