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

import { spawn, ChildProcess } from 'child_process';
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
  process?: ChildProcess;
}

class ChatService {
  private sessions: Map<string, ChatSession> = new Map();
  private config: AIAssistantConfig | null = null;

  constructor() {
    logger.info('ChatService initialized');
  }

  /**
   * Configure the chat service with AI assistant settings
   */
  setConfig(config: AIAssistantConfig): void {
    this.config = config;
    logger.info('ChatService configured', { provider: config.provider });
  }

  /**
   * Send a message to the configured AI assistant
   */
  async sendMessage(sessionId: string, message: string): Promise<string> {
    if (!this.config) {
      throw new Error('Chat service not configured. Please check config.json');
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

      if (this.config.provider === 'claude-code') {
        response = await this.sendToClaudeCode(message);
      } else if (this.config.provider === 'copilot') {
        response = await this.sendToCopilot(message);
      } else {
        throw new Error(`Unknown AI provider: ${this.config.provider}`);
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
   * Send message to Claude Code CLI
   */
  private async sendToClaudeCode(message: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const claudePath = this.config?.claudeCodePath || 'claude-code';

      logger.info('Spawning Claude Code process', { command: claudePath });

      // Spawn claude-code process with the message
      const process = spawn(claudePath, ['--message', message], {
        stdio: ['pipe', 'pipe', 'pipe'],
        shell: true
      });

      let output = '';
      let errorOutput = '';

      process.stdout?.on('data', (data: Buffer) => {
        output += data.toString();
      });

      process.stderr?.on('data', (data: Buffer) => {
        errorOutput += data.toString();
      });

      process.on('close', (code: number) => {
        if (code === 0) {
          resolve(output.trim());
        } else {
          logger.error('Claude Code process failed', {
            exitCode: code,
            stderr: errorOutput
          });
          reject(new Error(`Claude Code failed with exit code ${code}: ${errorOutput}`));
        }
      });

      process.on('error', (error: Error) => {
        logger.error('Failed to spawn Claude Code process', { error: error.message });
        reject(new Error(`Failed to start Claude Code: ${error.message}`));
      });

      // Set timeout for long-running processes
      setTimeout(() => {
        if (!process.killed) {
          process.kill();
          reject(new Error('Claude Code request timed out after 60 seconds'));
        }
      }, 60000);
    });
  }

  /**
   * Send message to GitHub Copilot CLI
   */
  private async sendToCopilot(message: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const copilotPath = this.config?.copilotPath || 'gh copilot';
      const command = `${copilotPath} suggest "${message.replace(/"/g, '\\"')}"`;

      logger.info('Spawning GitHub Copilot process', { command: copilotPath });

      // Spawn copilot process
      const process = spawn(command, [], {
        stdio: ['pipe', 'pipe', 'pipe'],
        shell: true
      });

      let output = '';
      let errorOutput = '';

      process.stdout?.on('data', (data: Buffer) => {
        output += data.toString();
      });

      process.stderr?.on('data', (data: Buffer) => {
        errorOutput += data.toString();
      });

      process.on('close', (code: number) => {
        if (code === 0) {
          resolve(output.trim());
        } else {
          logger.error('GitHub Copilot process failed', {
            exitCode: code,
            stderr: errorOutput
          });
          reject(new Error(`GitHub Copilot failed with exit code ${code}: ${errorOutput}`));
        }
      });

      process.on('error', (error: Error) => {
        logger.error('Failed to spawn GitHub Copilot process', { error: error.message });
        reject(new Error(`Failed to start GitHub Copilot: ${error.message}`));
      });

      // Set timeout
      setTimeout(() => {
        if (!process.killed) {
          process.kill();
          reject(new Error('GitHub Copilot request timed out after 60 seconds'));
        }
      }, 60000);
    });
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
    const session = this.sessions.get(sessionId);
    if (session?.process) {
      session.process.kill();
    }
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
