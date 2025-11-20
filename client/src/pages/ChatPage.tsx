import React, { useState } from 'react';
import { ChatPanel } from '@/components/chat/ChatPanel';

export function ChatPage() {
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null);

  return (
    <div className="h-full">
      <ChatPanel
        selectedChannelId={selectedChannelId}
        onChannelSelect={setSelectedChannelId}
      />
    </div>
  );
}





