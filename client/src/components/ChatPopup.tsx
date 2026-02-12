/*
 * Copyright 2025 Darcy Davidson
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import React, { useState, useEffect, useRef } from 'react';
import { Send, Loader2, Trash2, MessageSquare, X, Minimize2 } from 'lucide-react';
import { Button } from './ui/button';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useApp } from '../contexts/AppContext';

// Create axios instance with auth token interceptor
const api = axios.create({
  baseURL: '/',
});

// Add request interceptor to inject authentication token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface ChatConfig {
  provider: 'claude' | 'openai';
  model?: string;
  maxTokens?: number;
}

interface ChatPopupProps {
  isOpen: boolean;
  onClose: () => void;
}

const ChatPopup: React.FC<ChatPopupProps> = ({ isOpen, onClose }) => {
  const { capabilities, enablers, workspaces, activeWorkspaceId } = useApp();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId] = useState(() => `session-${Date.now()}`);
  const [config, setConfig] = useState<ChatConfig | null>(null);
  const [isMinimized, setIsMinimized] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Load chat configuration on mount
  useEffect(() => {
    if (isOpen) {
      loadConfig();
      loadChatHistory();
    }
  }, [isOpen]);

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadConfig = async () => {
    try {
      const response = await api.get('/api/chat/config');
      if (response.data.success && response.data.config) {
        setConfig(response.data.config);
      } else {
        toast.error('AI assistant not configured. Please check config.json');
      }
    } catch (error: any) {
      console.error('Error loading chat config:', error);
      toast.error('Failed to load chat configuration');
    }
  };

  const loadChatHistory = async () => {
    try {
      const response = await api.get(`/api/chat/history/${sessionId}`);
      if (response.data.success && response.data.messages) {
        setMessages(response.data.messages.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        })));
      }
    } catch (error: any) {
      console.error('Error loading chat history:', error);
      // Don't show error toast for empty history
    }
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    if (!config) {
      toast.error('AI assistant not configured');
      return;
    }

    const userMessage: ChatMessage = {
      role: 'user',
      content: inputMessage,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      // Build workspace context
      const activeWorkspace = workspaces.find(w => w.id === activeWorkspaceId);
      const workspaceContext = activeWorkspace ? {
        workspaceId: activeWorkspace.id,
        workspaceName: activeWorkspace.name,
        projectPaths: Array.isArray(activeWorkspace.projectPaths)
          ? activeWorkspace.projectPaths.map(p => typeof p === 'string' ? p : p.path)
          : [],
        availableCapabilities: capabilities.map(c => c.name || c.title || c.id || '').filter(Boolean),
        availableEnablers: enablers.map(e => e.name || e.title || e.id || '').filter(Boolean),
      } : undefined;

      const response = await api.post('/api/chat/message', {
        sessionId,
        message: inputMessage,
        workspaceContext
      });

      if (response.data.success) {
        const assistantMessage: ChatMessage = {
          role: 'assistant',
          content: response.data.response,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, assistantMessage]);
      } else {
        throw new Error(response.data.error || 'Failed to get response');
      }
    } catch (error: any) {
      console.error('Error sending message:', error);
      toast.error(error.response?.data?.error || 'Failed to send message');

      // Add error message to chat
      const errorMessage: ChatMessage = {
        role: 'assistant',
        content: `Error: ${error.response?.data?.error || error.message}`,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const clearChat = async () => {
    if (window.confirm('Are you sure you want to clear the chat history?')) {
      try {
        await api.delete(`/api/chat/session/${sessionId}`);
        setMessages([]);
        toast.success('Chat history cleared');
      } catch (error: any) {
        console.error('Error clearing chat:', error);
        toast.error('Failed to clear chat history');
      }
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatTimestamp = (timestamp: Date) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed top-20 right-4 w-96 bg-background border border-border rounded-lg shadow-2xl flex flex-col z-50"
      style={{ height: isMinimized ? 'auto' : '600px', maxHeight: '80vh' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-border bg-card rounded-t-lg">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-primary" />
          <div>
            <h3 className="text-sm font-semibold">AI Chat</h3>
            {config && (
              <p className="text-xs text-muted-foreground">
                {config.provider === 'claude' ? 'Claude' : 'OpenAI'}
                {workspaces.find(w => w.id === activeWorkspaceId)?.name &&
                  ` • ${workspaces.find(w => w.id === activeWorkspaceId)?.name}`}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsMinimized(!isMinimized)}
            className="h-7 w-7"
          >
            <Minimize2 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={clearChat}
            disabled={messages.length === 0}
            className="h-7 w-7"
            title="Clear chat"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-7 w-7"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
                <MessageSquare className="h-12 w-12 mb-2 opacity-50" />
                <p className="text-sm">Start a conversation</p>
              </div>
            ) : (
              messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-lg p-3 ${
                      message.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-semibold">
                        {message.role === 'user' ? 'You' : config?.provider === 'claude' ? 'Claude' : 'AI'}
                      </span>
                      <span className="text-xs opacity-70">
                        {formatTimestamp(message.timestamp)}
                      </span>
                    </div>
                    <div className="text-xs whitespace-pre-wrap break-words">
                      {message.content}
                    </div>
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-3 border-t border-border bg-card rounded-b-lg">
            <div className="flex gap-2">
              <textarea
                ref={textareaRef}
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={config ? "Type a message..." : "AI assistant not configured"}
                disabled={isLoading || !config}
                className="flex-1 min-h-[40px] max-h-[100px] p-2 text-sm rounded border border-border bg-background resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                rows={2}
              />
              <Button
                onClick={sendMessage}
                disabled={!inputMessage.trim() || isLoading || !config}
                size="icon"
                className="h-10 w-10"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
            {!config && (
              <p className="text-xs text-destructive mt-1">
                AI assistant not configured
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default ChatPopup;
