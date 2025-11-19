import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Phone, Video } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { VideoCallDialog } from './VideoCallDialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface CallButtonProps {
  remoteUser: {
    id: string;
    name: string;
    email: string;
  };
  channelId?: string;
  variant?: 'default' | 'icon' | 'dropdown';
}

export function CallButton({ remoteUser, channelId, variant = 'icon' }: CallButtonProps) {
  const { t } = useTranslation();
  const [showCallDialog, setShowCallDialog] = useState(false);
  const [callType, setCallType] = useState<'audio' | 'video'>('audio');
  const [callId, setCallId] = useState<string>();

  const startCall = (type: 'audio' | 'video') => {
    setCallType(type);
    setCallId(`call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
    setShowCallDialog(true);
  };

  if (variant === 'dropdown') {
    return (
      <>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Phone className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => startCall('audio')}>
              <Phone className="h-4 w-4 mr-2" />
              {t('chat.startAudioCall', { defaultValue: 'Start Audio Call' })}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => startCall('video')}>
              <Video className="h-4 w-4 mr-2" />
              {t('chat.startVideoCall', { defaultValue: 'Start Video Call' })}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <VideoCallDialog
          open={showCallDialog}
          onOpenChange={setShowCallDialog}
          callType={callType}
          remoteUser={remoteUser}
          channelId={channelId}
          callId={callId}
        />
      </>
    );
  }

  if (variant === 'default') {
    return (
      <>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => startCall('audio')}
            className="flex items-center gap-2"
          >
            <Phone className="h-4 w-4" />
            {t('chat.audioCall', { defaultValue: 'Audio' })}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => startCall('video')}
            className="flex items-center gap-2"
          >
            <Video className="h-4 w-4" />
            {t('chat.videoCall', { defaultValue: 'Video' })}
          </Button>
        </div>

        <VideoCallDialog
          open={showCallDialog}
          onOpenChange={setShowCallDialog}
          callType={callType}
          remoteUser={remoteUser}
          channelId={channelId}
          callId={callId}
        />
      </>
    );
  }

  // Icon variant (default)
  return (
    <>
      <div className="flex gap-1">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => startCall('audio')}
          className="h-8 w-8"
          title={t('chat.startAudioCall', { defaultValue: 'Start Audio Call' })}
        >
          <Phone className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => startCall('video')}
          className="h-8 w-8"
          title={t('chat.startVideoCall', { defaultValue: 'Start Video Call' })}
        >
          <Video className="h-4 w-4" />
        </Button>
      </div>

      <VideoCallDialog
        open={showCallDialog}
        onOpenChange={setShowCallDialog}
        callType={callType}
        remoteUser={remoteUser}
        channelId={channelId}
        callId={callId}
      />
    </>
  );
}
