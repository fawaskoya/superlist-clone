import React from 'react';
import { Play, Pause, Download, Trash2 } from 'lucide-react';
import { Button } from './ui/button';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface VoiceNote {
  id: string;
  taskId: string;
  audioPath: string;
  transcription: string | null;
  duration: number;
  createdAt: string;
  uploadedBy: {
    id: string;
    name: string;
    email: string;
  };
}

interface VoiceNotesProps {
  taskId: string;
}

export function VoiceNotes({ taskId }: VoiceNotesProps) {
  const { toast } = useToast();

  const { data: voiceNotes = [], isLoading } = useQuery<VoiceNote[]>({
    queryKey: ['/api/tasks', taskId, 'voice-notes'],
  });

  const deleteMutation = useMutation({
    mutationFn: async (voiceNoteId: string) => {
      return apiRequest('DELETE', `/api/voice-notes/${voiceNoteId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks', taskId, 'voice-notes'] });
      queryClient.invalidateQueries({ queryKey: ['/api/tasks', taskId, 'activities'] });
      toast({ title: 'Success', description: 'Voice note deleted successfully' });
    },
    onError: (error: Error) => {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    },
  });

  const downloadAudio = async (voiceNoteId: string, filename: string) => {
    try {
      const response = await fetch(`/api/voice-notes/${voiceNoteId}/audio`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to download audio');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Download failed',
        description: 'Could not download the voice note',
      });
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Loading voice notes...</div>;
  }

  if (voiceNotes.length === 0) {
    return <div className="text-sm text-muted-foreground">No voice notes yet</div>;
  }

  return (
    <div className="space-y-3">
      {voiceNotes.map((voiceNote) => (
        <div key={voiceNote.id} className="border rounded-lg p-3 bg-muted/30">
          <div className="flex items-start justify-between mb-2">
            <div className="flex-1">
              <div className="text-xs text-muted-foreground mb-1">
                {voiceNote.uploadedBy.name} • {format(new Date(voiceNote.createdAt), 'MMM d, HH:mm')} • {formatDuration(voiceNote.duration)}
              </div>

              {voiceNote.transcription && (
                <div className="text-sm mb-2 p-2 bg-background rounded border-l-2 border-primary/30">
                  <div className="text-xs font-medium text-primary mb-1">Transcription:</div>
                  {voiceNote.transcription}
                </div>
              )}

              <audio
                controls
                className="w-full"
                preload="metadata"
              >
                <source src={`/api/voice-notes/${voiceNote.id}/audio`} type="audio/webm" />
                Your browser does not support the audio element.
              </audio>
            </div>

            <div className="flex gap-1 ml-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => downloadAudio(voiceNote.id, `voice-note-${voiceNote.id}.webm`)}
                className="h-8 w-8 p-0"
              >
                <Download className="w-3 h-3" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => deleteMutation.mutate(voiceNote.id)}
                disabled={deleteMutation.isPending}
                className="h-8 w-8 p-0 text-destructive hover:text-destructive"
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
