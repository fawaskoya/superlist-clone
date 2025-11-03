import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Eye, Edit3 } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  minHeight?: string;
}

export function MarkdownEditor({
  value,
  onChange,
  placeholder = 'Write in markdown...',
  className = '',
  minHeight = 'min-h-40',
}: MarkdownEditorProps) {
  return (
    <Tabs defaultValue="write" className={`w-full ${className}`}>
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="write" className="flex items-center gap-2" data-testid="tab-write">
          <Edit3 className="h-4 w-4" />
          Write
        </TabsTrigger>
        <TabsTrigger value="preview" className="flex items-center gap-2" data-testid="tab-preview">
          <Eye className="h-4 w-4" />
          Preview
        </TabsTrigger>
      </TabsList>

      <TabsContent value="write" className="mt-2">
        <Textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`${minHeight} font-mono text-sm`}
          data-testid="textarea-markdown-input"
        />
        <div className="text-xs text-muted-foreground mt-2">
          Supports markdown: **bold**, *italic*, [links](url), lists, and more
        </div>
      </TabsContent>

      <TabsContent value="preview" className="mt-2">
        <div
          className={`${minHeight} p-4 border rounded-md bg-muted/30 overflow-auto`}
          data-testid="markdown-preview"
        >
          {value ? (
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              className="prose prose-sm dark:prose-invert max-w-none"
            >
              {value}
            </ReactMarkdown>
          ) : (
            <div className="text-sm text-muted-foreground italic">
              Nothing to preview yet. Switch to Write tab to add content.
            </div>
          )}
        </div>
      </TabsContent>
    </Tabs>
  );
}
