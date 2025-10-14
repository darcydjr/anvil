/**
 * Type definitions for Anvil server
 */

import { FSWatcher } from 'chokidar';
import { Server as WebSocketServer } from 'ws';

// Configuration types
export interface ProjectPath {
  path: string;
  icon?: string;
}

export interface Workspace {
  id: string;
  name: string;
  description: string;
  isActive?: boolean;
  projectPaths: (string | ProjectPath)[];
  createdDate?: string;
  copySwPlan?: boolean;
}

export interface ServerConfig {
  port: number;
}

export interface UIConfig {
  title: string;
  description: string;
}

export interface DefaultsConfig {
  owner?: string;
  analysisReview?: 'Required' | 'Not Required';
  designReview?: 'Required' | 'Not Required';
  requirementsReview?: 'Required' | 'Not Required';
  codeReview?: 'Required' | 'Not Required';
}

export interface Config {
  workspaces: Workspace[];
  activeWorkspaceId: string;
  templates: string;
  server: ServerConfig;
  ui: UIConfig;
  defaults?: DefaultsConfig;
  importedComponents?: any[];
}

export interface ConfigPaths {
  projectPaths: string[];
  templates: string;
}

// Document types
export type DocumentType = 'capability' | 'enabler' | 'document' | 'template';
export type DocumentStatus = 'In Draft' | 'Ready for Analysis' | 'In Analysis' | 'Ready for Design' |
  'In Design' | 'Ready for Implementation' | 'In Development' | 'Ready for Testing' | 'In Testing' | 'Deployed';
export type ApprovalStatus = 'Not Approved' | 'Approved' | 'Rejected';
export type Priority = 'P0' | 'P1' | 'P2' | 'P3' | 'P4';

export interface DocumentMetadata {
  id?: string;
  name?: string;
  title?: string;
  description?: string;
  type?: string;
  status?: DocumentStatus;
  approval?: ApprovalStatus;
  priority?: Priority;
  system?: string;
  component?: string;
  capabilityId?: string;
}

export interface DocumentItem {
  name: string;
  title: string;
  description?: string;
  type: DocumentType;
  path: string;
  projectPath?: string;
  id?: string;
  capabilityId?: string;
  system?: string;
  component?: string;
  fullPath?: string;
  upstreamDependencies?: Dependency[];
  downstreamDependencies?: Dependency[];
  metadata?: DocumentMetadata;
}

export interface Dependency {
  id: string;
  description: string;
}

// Enabler types
export interface Enabler {
  id: string;
  name: string;
  description: string;
  status: DocumentStatus;
  approval: ApprovalStatus;
  priority: Priority;
  capabilityId?: string;
}

export interface EnablerData extends Enabler {
  [key: string]: any;
}

// Capability types
export interface Capability {
  id: string;
  name: string;
  description: string;
  status: DocumentStatus;
  approval: ApprovalStatus;
  priority: Priority;
}

// File location types
export interface FileLocation {
  fullPath: string;
  projectRoot: string;
}

// WebSocket message types
export interface FileChangeMessage {
  type: 'file:changed' | 'file:added' | 'file:removed';
  filePath: string;
}

// Discovery types
export interface DiscoveryAnalysis {
  capabilities: Capability[];
  enablers: Enabler[];
}

// Version info
export interface VersionInfo {
  version: string;
  [key: string]: any;
}

// Global server state
export interface ServerGlobals {
  fileWatcher: FSWatcher | null;
  wss: WebSocketServer | null;
  version: VersionInfo;
  config: Config;
}

// Helper function types
export type ExtractFunction = (content: string) => string | null;
export type ValidationFunction = (config: Config) => string[];
