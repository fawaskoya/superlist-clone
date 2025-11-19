import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Phone, PhoneOff, Video } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { VideoCallDialog } from './VideoCallDialog';

interface IncomingCallNotificationProps {
  caller: {
    id: string;
    name: string;
    email: string;
  };
  callType: 'audio' | 'video';
  callId: string;
  channelId?: string;
  onAccept: () => void;
  onReject: () => void;
}

export function IncomingCallNotification({
  caller,
  callType,
  callId,
  channelId,
  onAccept,
  onReject,
}: IncomingCallNotificationProps) {
  const { t } = useTranslation();
  const [showCallDialog, setShowCallDialog] = useState(false);

  const initials = caller.name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase() || 'U';

  const handleAccept = () => {
    setShowCallDialog(true);
    onAccept();
  };

  const handleReject = () => {
    onReject();
  };

  return (
    <>
      <div className="fixed top-4 right-4 z-50 bg-background border rounded-lg shadow-lg p-4 min-w-80">
        <div className="flex items-center gap-3">
          <Avatar className="w-12 h-12">
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>

          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h4 className="font-semibold">{caller.name}</h4>
              {callType === 'video' ? (
                <Video className="w-4 h-4 text-blue-500" />
              ) : (
                <Phone className="w-4 h-4 text-green-500" />
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {callType === 'video'
                ? t('chat.incomingVideoCall', { defaultValue: 'Incoming video call...' })
                : t('chat.incomingAudioCall', { defaultValue: 'Incoming audio call...' })
              }
            </p>
          </div>

          <div className="flex gap-2">
            <Button
              variant="destructive"
              size="sm"
              onClick={handleReject}
              className="rounded-full w-10 h-10 p-0"
            >
              <PhoneOff className="w-4 h-4" />
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={handleAccept}
              className="rounded-full w-10 h-10 p-0 bg-green-600 hover:bg-green-700"
            >
              <Phone className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      <VideoCallDialog
        open={showCallDialog}
        onOpenChange={setShowCallDialog}
        callType={callType}
        remoteUser={caller}
        channelId={channelId}
        callId={callId}
        isIncoming={true}
      />
    </>
  );
}




