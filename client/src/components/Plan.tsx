import React, { useState, useEffect } from 'react';
import { Save, RotateCcw, Eye, Edit3, Copy, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import { apiService } from '../services/apiService';

interface CodeBlockProps {
  children: string
  index: number
  onCopy: (text: string, index: number) => void
  copiedIndex: number | null
}

function CodeBlock({ children, index, onCopy, copiedIndex }: CodeBlockProps): JSX.Element {
  const code = children.trim();
  const hasClaudeCommand = code.includes('Claude, please');

  return (
    <div className="relative mb-4">
      <pre className="bg-muted/50 text-foreground rounded-lg p-4 overflow-x-auto border border-border">
        <code className="text-sm font-mono">{code}</code>
        {hasClaudeCommand && (
          <button
            className="absolute top-2 right-2 p-2 bg-muted hover:bg-muted/80 rounded-md transition-colors"
            onClick={() => onCopy(code, index)}
            title="Copy to clipboard"
          >
            {copiedIndex === index ? (
              <Check size={16} className="text-chart-2" />
            ) : (
              <Copy size={16} className="text-muted-foreground" />
            )}
          </button>
        )}
      </pre>
    </div>
  );
}

interface MarkdownRendererProps {
  content: string
  onCopy: (text: string, index: number) => void
  copiedIndex: number | null
}

function MarkdownRenderer({ content, onCopy, copiedIndex }: MarkdownRendererProps): JSX.Element {
  const lines = content.split('\n');
  const elements: Array<{ type: string; content: string; index?: number }> = [];
  let currentElement = '';
  let elementType = 'text';
  let inCodeBlock = false;
  let codeBlockIndex = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.startsWith('```')) {
      if (inCodeBlock) {
        // End code block
        elements.push({
          type: 'codeblock',
          content: currentElement,
          index: codeBlockIndex++
        });
        currentElement = '';
        inCodeBlock = false;
      } else {
        // Start code block
        if (currentElement.trim()) {
          elements.push({
            type: elementType,
            content: currentElement
          });
        }
        currentElement = '';
        inCodeBlock = true;
        elementType = 'codeblock';
      }
    } else if (inCodeBlock) {
      currentElement += line + '\n';
    } else {
      if (currentElement) currentElement += '\n';
      currentElement += line;
      elementType = 'text';
    }
  }

  // Handle remaining content
  if (currentElement.trim()) {
    if (inCodeBlock) {
      elements.push({
        type: 'codeblock',
        content: currentElement,
        index: codeBlockIndex++
      });
    } else {
      elements.push({
        type: 'text',
        content: currentElement
      });
    }
  }

  return (
    <div>
      {elements.map((element, index) => {
        if (element.type === 'codeblock') {
          return (
            <CodeBlock
              key={index}
              index={element.index!}
              onCopy={onCopy}
              copiedIndex={copiedIndex}
            >
              {element.content}
            </CodeBlock>
          );
        } else {
          return (
            <div
              key={index}
              dangerouslySetInnerHTML={{
                __html: formatTextMarkdown(element.content)
              }}
            />
          );
        }
      })}
    </div>
  );
}

function formatTextMarkdown(markdown: string): string {
  return markdown
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^#### (.+)$/gm, '<h4>$1</h4>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code>$1</code>')
    .replace(/^\- (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/^(?!<[uh]|<li)(.+)$/gm, '<p>$1</p>')
    .replace(/<p><\/p>/g, '');
}

export default function Plan(): JSX.Element {
  const [content, setContent] = useState<string>('');
  const [originalContent, setOriginalContent] = useState<string>('');
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  useEffect(() => {
    loadPlan();
  }, []);

  const loadPlan = async (): Promise<void> => {
    try {
      setLoading(true);
      const response = await apiService.getFile('SOFTWARE_DEVELOPMENT_PLAN.md');
      if (response.content) {
        setContent(response.content);
        setOriginalContent(response.content);
      }
    } catch (error) {
      console.error('Error loading plan:', error);
      toast.error('Failed to load Software Development Plan');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (): Promise<void> => {
    try {
      setSaving(true);
      await apiService.saveFile('SOFTWARE_DEVELOPMENT_PLAN.md', content);
      setOriginalContent(content);
      toast.success('Software Development Plan saved successfully');
    } catch (error) {
      console.error('Error saving plan:', error);
      toast.error('Failed to save Software Development Plan');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = (): void => {
    setContent(originalContent);
    toast.info('Changes reverted');
  };

  const hasChanges = content !== originalContent;

  const handleCopyToClipboard = async (text: string, index: number): Promise<void> => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIndex(index);
      toast.success('Copied to clipboard!');
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch (err) {
      toast.error('Failed to copy to clipboard');
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="flex flex-col items-center justify-center min-h-screen">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-muted-foreground">Loading Software Development Plan...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="bg-card rounded-lg shadow-md border border-border mb-6">
        <div className="p-6 border-b border-border flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Software Development Plan</h1>
            <p className="text-muted-foreground">Comprehensive guide for discovering, analyzing, designing, implementing, testing, refactoring, and retiring software applications</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex rounded-md border border-border overflow-hidden">
              <button
                className={`flex items-center gap-2 px-3 py-2 text-sm ${!isEditing ? 'bg-primary text-primary-foreground' : 'bg-background text-foreground hover:bg-accent hover:text-accent-foreground'} transition-colors`}
                onClick={() => setIsEditing(false)}
                title="Preview Mode"
              >
                <Eye size={16} />
                Preview
              </button>
              <button
                className={`flex items-center gap-2 px-3 py-2 text-sm border-l border-border ${isEditing ? 'bg-primary text-primary-foreground' : 'bg-background text-foreground hover:bg-accent hover:text-accent-foreground'} transition-colors`}
                onClick={() => setIsEditing(true)}
                title="Edit Mode"
              >
                <Edit3 size={16} />
                Edit
              </button>
            </div>
            {isEditing && (
              <>
                <button
                  className="flex items-center gap-2 px-3 py-2 text-sm bg-muted text-foreground rounded-md hover:bg-muted/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={handleReset}
                  disabled={!hasChanges}
                  title="Reset Changes"
                >
                  <RotateCcw size={16} />
                  Reset
                </button>
                <button
                  className="flex items-center gap-2 px-3 py-2 text-sm bg-chart-2 text-white rounded-md hover:bg-chart-2/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={handleSave}
                  disabled={!hasChanges || saving}
                  title="Save Changes"
                >
                  <Save size={16} />
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </>
            )}
          </div>
        </div>

        <div className="p-6">
          {isEditing ? (
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full h-[600px] px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring text-foreground font-mono text-sm resize-none placeholder:text-muted-foreground"
              placeholder="Enter your Software Development Plan content..."
              spellCheck={false}
            />
          ) : (
            <div className="markdown-content">
              {content ? (
                <MarkdownRenderer content={content} onCopy={handleCopyToClipboard} copiedIndex={copiedIndex} />
              ) : (
                <p className="text-muted-foreground">No content available</p>
              )}
            </div>
          )}
        </div>

        {hasChanges && (
          <div className="bg-chart-4/10 border-t border-chart-4/30 p-3 text-center">
            <p className="text-sm text-foreground font-medium">You have unsaved changes</p>
          </div>
        )}
      </div>
    </div>
  );
}
