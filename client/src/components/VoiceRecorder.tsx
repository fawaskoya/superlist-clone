import React, { useState, useRef, useCallback } from 'react';
import { Mic, MicOff, Square, Play, Pause } from 'lucide-react';
import { Button } from './ui/button';
import { useToast } from '@/hooks/use-toast';

interface VoiceRecorderProps {
  taskId: string;
  onRecordingComplete?: (voiceNote: any) => void;
}

export function VoiceRecorder({ taskId, onRecordingComplete }: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout>();
  const audioRef = useRef<HTMLAudioElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const { toast } = useToast();

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });

      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setRecordedBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));

        // Stop all tracks
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
        }
      };

      mediaRecorder.start(1000); // Collect data every second
      setIsRecording(true);

      // Start timer
      setRecordingTime(0);
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

      toast({
        title: 'Recording started',
        description: 'Speak clearly into your microphone',
      });
    } catch (error) {
      console.error('Error starting recording:', error);
      toast({
        variant: 'destructive',
        title: 'Recording failed',
        description: 'Could not access microphone. Please check permissions.',
      });
    }
  }, [toast]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);

      if (timerRef.current) {
        clearInterval(timerRef.current);
      }

      toast({
        title: 'Recording stopped',
        description: 'Processing your voice note...',
      });
    }
  }, [isRecording, toast]);

  const playRecording = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.play();
      setIsPlaying(true);
    }
  }, []);

  const pauseRecording = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  }, []);

  const uploadRecording = useCallback(async () => {
    if (!recordedBlob) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('audio', recordedBlob, 'voice-note.webm');

      const response = await fetch(`/api/tasks/${taskId}/voice-notes`, {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Upload failed');
      }

      const voiceNote = await response.json();

      toast({
        title: 'Voice note uploaded',
        description: 'Your voice note has been saved to the task',
      });

      // Reset state
      setRecordedBlob(null);
      setAudioUrl(null);
      setRecordingTime(0);

      // Call callback if provided
      if (onRecordingComplete) {
        onRecordingComplete(voiceNote);
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        variant: 'destructive',
        title: 'Upload failed',
        description: error instanceof Error ? error.message : 'Failed to upload voice note',
      });
    } finally {
      setIsUploading(false);
    }
  }, [recordedBlob, taskId, toast, onRecordingComplete]);

  const discardRecording = useCallback(() => {
    setRecordedBlob(null);
    setAudioUrl(null);
    setRecordingTime(0);
    toast({
      title: 'Recording discarded',
      description: 'Your recording has been deleted',
    });
  }, [toast]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2">
          {!isRecording && !recordedBlob && (
            <Button
              onClick={startRecording}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              <Mic className="w-4 h-4" />
              Record Voice Note
            </Button>
          )}

          {isRecording && (
            <>
              <Button
                onClick={stopRecording}
                variant="destructive"
                size="sm"
                className="flex items-center gap-2 animate-pulse"
              >
                <Square className="w-4 h-4" />
                Stop Recording ({formatTime(recordingTime)})
              </Button>
            </>
          )}
        </div>
      </div>

      {recordedBlob && audioUrl && (
        <div className="border rounded-lg p-4 bg-muted/50 space-y-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Recorded: {formatTime(recordingTime)}</span>
          </div>

          <audio
            ref={audioRef}
            src={audioUrl}
            onEnded={() => setIsPlaying(false)}
            className="w-full"
            controls
          />

          <div className="flex gap-2">
            <Button
              onClick={uploadRecording}
              disabled={isUploading}
              size="sm"
              className="flex items-center gap-2"
            >
              {isUploading ? 'Uploading...' : 'Save Voice Note'}
            </Button>
            <Button
              onClick={discardRecording}
              variant="outline"
              size="sm"
              disabled={isUploading}
            >
              Discard
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
