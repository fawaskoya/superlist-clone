import { useState, useRef } from 'react';
import { Upload, File, Download, Trash2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { formatDistance } from 'date-fns';

interface FileAttachment {
  id: string;
  taskId: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  uploadedById: string;
  createdAt: string;
  thumbnailUrl?: string;
  uploadedBy: {
    id: string;
    name: string;
    email: string;
  };
}

interface FileAttachmentsProps {
  taskId: string;
}

export function FileAttachments({ taskId }: FileAttachmentsProps) {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const { data: attachments = [], isLoading } = useQuery<FileAttachment[]>({
    queryKey: ['/api/tasks', taskId, 'attachments'],
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch(`/api/tasks/${taskId}/attachments`, {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Upload failed');
      }

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks', taskId, 'attachments'] });
      queryClient.invalidateQueries({ queryKey: ['/api/tasks', taskId, 'activities'] });
      toast({ title: 'Success', description: 'File uploaded successfully' });
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    },
    onError: (error: Error) => {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
      setUploading(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (attachmentId: string) => {
      return apiRequest('DELETE', `/api/attachments/${attachmentId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks', taskId, 'attachments'] });
      queryClient.invalidateQueries({ queryKey: ['/api/tasks', taskId, 'activities'] });
      toast({ title: 'Success', description: 'File deleted successfully' });
    },
    onError: (error: Error) => {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    },
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast({ variant: 'destructive', title: 'Error', description: 'File size must be less than 10MB' });
        return;
      }
      setUploading(true);
      uploadMutation.mutate(file);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const handleDownload = (attachmentId: string, originalName: string) => {
    window.open(`/api/attachments/${attachmentId}`, '_blank');
  };

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Loading attachments...</div>;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium">Attachments ({attachments.length})</h4>
        <Button
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          data-testid="button-upload-file"
        >
          {uploading ? (
            <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Uploading...</>
          ) : (
            <><Upload className="h-4 w-4 mr-2" /> Upload</>
          )}
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={handleFileSelect}
          data-testid="input-file-upload"
        />
      </div>

      {attachments.length === 0 ? (
        <div className="text-sm text-muted-foreground italic py-4 text-center border rounded-md bg-muted/30">
          No attachments yet. Upload a file to get started.
        </div>
      ) : (
        <div className="space-y-2">
          {attachments.map((attachment) => (
            <div
              key={attachment.id}
              className="flex items-center justify-between p-3 border rounded-md hover-elevate"
              data-testid={`attachment-${attachment.id}`}
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                {attachment.mimeType.startsWith('image/') && attachment.thumbnailUrl ? (
                  <img
                    src={attachment.thumbnailUrl}
                    alt={attachment.originalName}
                    className="h-10 w-10 object-cover rounded border flex-shrink-0"
                  />
                ) : (
                  <File className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate" title={attachment.originalName}>
                    {attachment.originalName}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {formatFileSize(attachment.size)} · {attachment.uploadedBy.name} · {formatDistance(new Date(attachment.createdAt), new Date(), { addSuffix: true })}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDownload(attachment.id, attachment.originalName)}
                  data-testid={`button-download-${attachment.id}`}
                >
                  <Download className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => deleteMutation.mutate(attachment.id)}
                  disabled={deleteMutation.isPending}
                  data-testid={`button-delete-${attachment.id}`}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
