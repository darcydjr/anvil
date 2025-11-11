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

import Anthropic from '@anthropic-ai/sdk';
import { AIAssistantConfig } from '../types/server-types';
import { logger } from '../utils/logger';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface ChatSession {
  id: string;
  messages: ChatMessage[];
}

export interface WorkspaceContext {
  workspaceId: string;
  workspaceName: string;
  projectPaths: string[];
  availableCapabilities?: string[];
  availableEnablers?: string[];
}

class ChatService {
  private sessions: Map<string, ChatSession> = new Map();
  private config: AIAssistantConfig | null = null;
  private anthropic: Anthropic | null = null;

  constructor() {
    logger.info('ChatService initialized');
  }

  /**
   * Configure the chat service with AI assistant settings
   */
  setConfig(config: AIAssistantConfig): void {
    this.config = config;

    logger.info('ChatService setConfig called', {
      provider: config.provider,
      hasApiKeyInConfig: !!config.apiKey,
      hasApiKeyInEnv: !!process.env.ANTHROPIC_API_KEY
    });

    // Initialize Anthropic client if provider is Claude
    if (config.provider === 'claude' && config.apiKey) {
      this.anthropic = new Anthropic({
        apiKey: config.apiKey,
      });
      logger.info('ChatService configured with Claude API from config', {
        provider: config.provider,
        model: config.model || 'claude-3-5-sonnet-20241022'
      });
    } else if (config.provider === 'claude' && !config.apiKey) {
      logger.warn('Claude provider selected but no API key in config. Checking environment...');
      // Try to get from environment
      const envApiKey = process.env.ANTHROPIC_API_KEY;
      logger.info('Environment API key check', {
        found: !!envApiKey,
        length: envApiKey ? envApiKey.length : 0
      });

      if (envApiKey) {
        this.anthropic = new Anthropic({
          apiKey: envApiKey,
        });
        logger.info('ChatService configured with Claude API from environment');
      } else {
        logger.error('No API key found in config or environment');
      }
    } else {
      logger.warn('Unsupported provider or missing configuration', { provider: config.provider });
    }

    logger.info('ChatService initialization complete', {
      anthropicInitialized: !!this.anthropic
    });
  }

  /**
   * Send a message to the configured AI assistant
   */
  async sendMessage(sessionId: string, message: string, workspaceContext?: WorkspaceContext): Promise<string> {
    logger.info('sendMessage called', {
      hasConfig: !!this.config,
      hasAnthropic: !!this.anthropic,
      provider: this.config?.provider
    });

    if (!this.config) {
      logger.error('sendMessage failed: no config');
      throw new Error('Chat service not configured. Please check config.json');
    }

    if (!this.anthropic) {
      logger.error('sendMessage failed: anthropic client not initialized', {
        provider: this.config.provider,
        hasApiKeyInConfig: !!this.config.apiKey,
        hasApiKeyInEnv: !!process.env.ANTHROPIC_API_KEY
      });
      throw new Error('AI assistant not properly initialized. Please check your API key configuration.');
    }

    logger.info('Sending message to AI assistant', {
      sessionId,
      provider: this.config.provider,
      messageLength: message.length
    });

    // Get or create session
    let session = this.sessions.get(sessionId);
    if (!session) {
      session = {
        id: sessionId,
        messages: []
      };
      this.sessions.set(sessionId, session);
    }

    // Add user message to history
    session.messages.push({
      role: 'user',
      content: message,
      timestamp: new Date()
    });

    try {
      let response: string;

      if (this.config.provider === 'claude') {
        response = await this.sendToClaude(session.messages, message, workspaceContext);
      } else {
        throw new Error(`Unsupported AI provider: ${this.config.provider}`);
      }

      // Add assistant response to history
      session.messages.push({
        role: 'assistant',
        content: response,
        timestamp: new Date()
      });

      return response;
    } catch (error: any) {
      logger.error('Error sending message to AI assistant', {
        error: error.message,
        provider: this.config.provider
      });
      throw error;
    }
  }

  /**
   * Send message to Claude API
   */
  private async sendToClaude(messageHistory: ChatMessage[], currentMessage: string, workspaceContext?: WorkspaceContext): Promise<string> {
    if (!this.anthropic) {
      throw new Error('Anthropic client not initialized');
    }

    logger.info('Calling Claude API', {
      messageCount: messageHistory.length,
      hasWorkspaceContext: !!workspaceContext
    });

    // Build system prompt with workspace context
    let systemPrompt = `You are an AI assistant integrated into Anvil, a Product Specifications Driven Development tool. You help users create, modify, and manage product specifications.

**Your Capabilities:**
- Create new capability and enabler specification files in markdown format
- Modify existing specifications
- Answer questions about the current workspace and specifications
- Help with product planning and architecture
- Suggest improvements to specifications

**Specification File Format:**
All specification files follow this markdown structure:
\`\`\`markdown
---
id: unique-id
name: Specification Name
status: Draft|In Progress|Complete
approval: Required|Not Required
priority: High|Medium|Low
owner: Owner Name
---

# Specification Name

## Description
Detailed description here...

## Requirements
- Requirement 1
- Requirement 2
\`\`\`

**Important Guidelines:**
- Always use proper markdown formatting
- Include YAML frontmatter with required fields (id, name, status, approval, priority, owner)
- Be specific and clear in specifications
- When creating files, provide the complete file content
- When user asks to create/modify files, provide the exact content they should save`;

    if (workspaceContext) {
      systemPrompt += `\n\n**Current Workspace:** ${workspaceContext.workspaceName}
**Workspace ID:** ${workspaceContext.workspaceId}
**Project Paths:** ${workspaceContext.projectPaths.join(', ')}`;

      if (workspaceContext.availableCapabilities && workspaceContext.availableCapabilities.length > 0) {
        systemPrompt += `\n**Existing Capabilities:** ${workspaceContext.availableCapabilities.join(', ')}`;
      }

      if (workspaceContext.availableEnablers && workspaceContext.availableEnablers.length > 0) {
        systemPrompt += `\n**Existing Enablers:** ${workspaceContext.availableEnablers.join(', ')}`;
      }
    }

    systemPrompt += `\n\n**Response Format:**
When providing file content, use this format:
\`\`\`
FILE: path/to/file.md
---
[complete file content here]
---
\`\`\`

Be helpful, concise, and focused on the user's product development needs.`;

    // Convert message history to Anthropic format
    const messages = messageHistory.map(msg => ({
      role: msg.role,
      content: msg.content
    }));

    try {
      const response = await this.anthropic.messages.create({
        model: this.config?.model || 'claude-3-haiku-20240307',
        max_tokens: this.config?.maxTokens || 1024,
        system: systemPrompt,
        messages: messages as any,
      });

      // Extract text content from response
      const textContent = response.content
        .filter((block: any) => block.type === 'text')
        .map((block: any) => block.text)
        .join('\n');

      logger.info('Received response from Claude API', {
        responseLength: textContent.length,
        stopReason: response.stop_reason
      });

      return textContent;
    } catch (error: any) {
      logger.error('Claude API request failed', {
        error: error.message,
        status: error.status
      });

      if (error.status === 401) {
        throw new Error('Invalid API key. Please check your Anthropic API key configuration.');
      } else if (error.status === 429) {
        throw new Error('Rate limit exceeded. Please try again later.');
      } else {
        throw new Error(`Claude API error: ${error.message}`);
      }
    }
  }

  /**
   * Get chat history for a session
   */
  getSessionHistory(sessionId: string): ChatMessage[] {
    const session = this.sessions.get(sessionId);
    return session?.messages || [];
  }

  /**
   * Clear a chat session
   */
  clearSession(sessionId: string): void {
    this.sessions.delete(sessionId);
    logger.info('Chat session cleared', { sessionId });
  }

  /**
   * Get all active sessions
   */
  getActiveSessions(): string[] {
    return Array.from(this.sessions.keys());
  }
}

// Export singleton instance
export const chatService = new ChatService();
