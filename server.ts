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

import express, { Request, Response } from 'express';
import * as fs from 'fs-extra';
import * as path from 'path';
import { marked } from 'marked';
import { logger } from './utils/logger';
import * as WebSocket from 'ws';
import * as chokidar from 'chokidar';
import { FSWatcher } from 'chokidar';
import * as http from 'http';
import { exec } from 'child_process';
import type {
  Config, ConfigPaths, DocumentItem, DocumentMetadata, Enabler, EnablerData,
  Capability, FileLocation, VersionInfo, Dependency
} from './types/server-types';
import { chatService } from './services/chatService';

// File watcher variable for graceful shutdown
let fileWatcher: FSWatcher | null = null;
let wss: WebSocket.Server | null = null; // WebSocket server

// Load version from package.json
let version: VersionInfo;
try {
  version = JSON.parse(fs.readFileSync('./package.json', 'utf8'));
} catch (error: any) {
  console.error('Error loading package.json, using default:', error.message);
  version = { version: 'unknown' };
}

// Security utility for path validation
function validateAndResolvePath(inputPath: string, allowedRoot: string, description: string = 'path'): string {
  try {
    // Normalize and resolve the path
    const normalizedInput = path.normalize(inputPath).replace(/^(\.[\\\/])+/, '')
    const resolvedPath = path.resolve(allowedRoot, normalizedInput)
    const resolvedRoot = path.resolve(allowedRoot)

    // Check if resolved path is within allowed root
    if (!resolvedPath.startsWith(resolvedRoot)) {
      throw new Error(`Invalid ${description}: Path traversal detected`)
    }

    // Additional security checks
    if (resolvedPath.includes('..') || resolvedPath.includes('node_modules')) {
      throw new Error(`Invalid ${description}: Suspicious path detected`)
    }

    return resolvedPath
  } catch (error: any) {
    console.error(`Path validation failed for ${description}:`, error.message)
    throw new Error(`Security validation failed: ${error.message}`)
  }
}

// Configuration validation schema
function validateConfig(config: Config): string[] {
  const errors: string[] = []

  // Validate required structure
  if (!config || typeof config !== 'object') {
    errors.push('Config must be a valid object')
    return errors
  }

  // Validate workspaces
  if (!config.workspaces || !Array.isArray(config.workspaces)) {
    errors.push('Config must have a workspaces array')
  }

  if (!config.activeWorkspaceId || typeof config.activeWorkspaceId !== 'string') {
    errors.push('Config must have an activeWorkspaceId')
  }

  const activeWorkspace = config.workspaces?.find(ws => ws.id === config.activeWorkspaceId)
  if (!activeWorkspace) {
    errors.push('Active workspace not found in workspaces array')
  } else {
    if (!activeWorkspace.projectPaths || !Array.isArray(activeWorkspace.projectPaths)) {
      errors.push('Active workspace must have projectPaths array')
    }
  }

  // Validate templates path
  if (!config.templates || typeof config.templates !== 'string') {
    errors.push('Config must have a templates path')
  }
  
  // Validate server config
  if (config.server) {
    if (config.server.port !== undefined) {
      const port = Number(config.server.port)
      if (!Number.isInteger(port) || port < 1 || port > 65535) {
        errors.push('Config server.port must be a valid port number (1-65535)')
      }
    }
  }
  
  // Validate UI config
  if (config.ui) {
    if (config.ui.title !== undefined && typeof config.ui.title !== 'string') {
      errors.push('Config ui.title must be a string')
    }
    if (config.ui.description !== undefined && typeof config.ui.description !== 'string') {
      errors.push('Config ui.description must be a string')
    }
  }
  
  // Validate defaults
  if (config.defaults) {
    const validOwnerPattern = /^[a-zA-Z0-9\s-_.]+$/
    if (config.defaults.owner !== undefined) {
      if (typeof config.defaults.owner !== 'string' || !validOwnerPattern.test(config.defaults.owner)) {
        errors.push('Config defaults.owner must be a valid name string')
      }
    }
    
    const validReviewValues = ['Required', 'Not Required']
    const reviewFields = ['analysisReview', 'designReview', 'requirementsReview', 'codeReview']
    for (const field of reviewFields) {
      if (config.defaults[field] !== undefined && !validReviewValues.includes(config.defaults[field])) {
        errors.push(`Config defaults.${field} must be either 'Required' or 'Not Required'`)
      }
    }
  }
  
  return errors
}

// Function to get resolved paths from workspace config
function getConfigPaths(config: Config): ConfigPaths {
  const activeWorkspace = config.workspaces.find(ws => ws.id === config.activeWorkspaceId)


  if (!activeWorkspace) {
    console.error(`[CONFIG] Active workspace not found: ${config.activeWorkspaceId}`)
    // Fallback to first workspace if available
    const fallbackWorkspace = config.workspaces[0]
    if (!fallbackWorkspace) {
      throw new Error('No workspaces available')
    }
    console.warn(`[CONFIG] Using fallback workspace: ${fallbackWorkspace.id}`)
    const fallbackPaths = fallbackWorkspace.projectPaths.map(pathItem => {
      if (typeof pathItem === 'string') {
        return pathItem // Legacy format
      }
      return pathItem.path // New format with icon
    })
    return {
      projectPaths: fallbackPaths,
      templates: config.templates
    }
  }

  // Extract just the path strings from path objects (support both legacy string format and new object format)
  const projectPaths = activeWorkspace.projectPaths.map(pathItem => {
    if (typeof pathItem === 'string') {
      return pathItem // Legacy format
    }
    return pathItem.path // New format with icon
  })

  return {
    projectPaths: projectPaths,
    templates: config.templates
  }
}

// Deep merge function for configuration objects
function deepMerge(target: any, source: any): any {
  const result = { ...target };

  for (const key in source) {
    if (source[key] !== null && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      result[key] = deepMerge(target[key] || {}, source[key]);
    } else {
      result[key] = source[key];
    }
  }

  return result;
}

// Load configuration with factory + local override pattern
logger.info('Server working directory', { cwd: process.cwd() });
logger.info('Server file location', { dirname: __dirname });
logger.info('Anvil version', { version: version.version });
let config: Config;
try {
  // Load factory configuration
  const factoryConfig = JSON.parse(fs.readFileSync('./config.json', 'utf8'));
  logger.info('Factory config loaded successfully');

  // Load local overrides if they exist
  let localOverrides = {};
  try {
    if (fs.existsSync('./config.local.json')) {
      localOverrides = JSON.parse(fs.readFileSync('./config.local.json', 'utf8'));
      logger.info('Local config overrides loaded', { overrides: Object.keys(localOverrides) });
    } else {
      logger.info('No config.local.json found, using factory defaults only');
    }
  } catch (localError) {
    console.warn('Error loading config.local.json, ignoring local overrides:', localError.message);
  }

  // Merge factory config with local overrides
  const mergedConfig = deepMerge(factoryConfig, localOverrides);

  // Validate final merged configuration
  const validationErrors = validateConfig(mergedConfig)
  if (validationErrors.length > 0) {
    console.error('Configuration validation failed:');
    validationErrors.forEach(error => console.error('  -', error))
    console.error('Using default configuration instead');
    throw new Error('Invalid configuration')
  }

  config = mergedConfig;
  // Set log level from config
  if (config.logging?.level) {
    logger.setLogLevel(config.logging.level);
  }

  const activeWorkspace = config.workspaces.find(w => w.id === config.activeWorkspaceId);
  logger.info('Config loaded and validated successfully', {
    port: config.server?.port,
    projectPaths: activeWorkspace?.projectPaths?.length,
    activeWorkspace: config.activeWorkspaceId,
    logLevel: config.logging?.level || 'INFO'
  });

  // Initialize chat service with AI assistant config
  if (config.aiAssistant) {
    chatService.setConfig(config.aiAssistant);
  }
} catch (error) {
  console.error('Error loading configuration, using defaults:', error.message);
  // Default workspace configuration
  config = {
    workspaces: [
      {
        id: "ws-default",
        name: "Default Workspace",
        description: "Default workspace",
        isActive: true,
        projectPaths: ["../specifications"]
      }
    ],
    activeWorkspaceId: "ws-default",
    templates: "./templates",
    server: {
      port: 3000
    },
    ui: {
      title: 'Anvil',
      description: 'Product Requirement Documents Browser'
    }
  };
}

// Function to reload config from disk
async function reloadConfig(): Promise<void> {
  try {
    console.log('[CONFIG] Reloading configuration from disk...');

    // Load factory configuration
    const factoryConfig = JSON.parse(fs.readFileSync('./config.json', 'utf8'));

    // Load local overrides if they exist
    let localOverrides = {};
    if (fs.existsSync('./config.local.json')) {
      localOverrides = JSON.parse(fs.readFileSync('./config.local.json', 'utf8'));
      console.log('[CONFIG] Reloaded local config overrides:', Object.keys(localOverrides));
    }

    // Merge factory config with local overrides
    const mergedConfig = deepMerge(factoryConfig, localOverrides);

    // Validate final merged configuration
    const validationErrors = validateConfig(mergedConfig);
    if (validationErrors.length > 0) {
      console.error('[CONFIG] Config validation failed during reload:', validationErrors);
      throw new Error('Config validation failed: ' + validationErrors.join(', '));
    }

    // Update global config
    config = mergedConfig;
    console.log('[CONFIG] Config reloaded successfully, activeWorkspaceId:', config.activeWorkspaceId);

    // Re-initialize chat service with updated AI assistant config
    if (config.aiAssistant) {
      chatService.setConfig(config.aiAssistant);
    }

  } catch (error) {
    console.error('[CONFIG] Error reloading configuration:', error.message);
    throw error;
  }
}

const app = express();
const PORT = process.env.PORT || config.server.port;

// Middleware
app.use(express.json({ limit: '10mb' }));

// Set up marked with options
marked.setOptions({
  breaks: true,
  gfm: true
});


// Serve static files from React build
app.use(express.static('dist'));

// Function to scan directory for markdown files
async function scanDirectory(dirPath: string, baseUrl: string = ''): Promise<DocumentItem[]> {
  const items = [];

  if (!await fs.pathExists(dirPath)) {
    return items;
  }

  const files = await fs.readdir(dirPath);

  for (const file of files) {
    const fullPath = path.join(dirPath, file);
    const stat = await fs.stat(fullPath);

    if (stat.isDirectory()) {
      const subItems = await scanDirectory(fullPath, `${baseUrl}/${file}`);
      if (subItems.length > 0) {
        items.push({
          name: file,
          type: 'directory',
          path: `${baseUrl}/${file}`,
          children: subItems
        });
      }
    } else if (file.endsWith('.md')) {
      const content = await fs.readFile(fullPath, 'utf8');
      const metadata = extractMetadata(content);
      const title = metadata.title;
      const name = metadata.name;
      const description = metadata.description;
      const type = metadata.type;
      const id = metadata.id;
      const capabilityId = metadata.capabilityId;
      const system = metadata.system;
      const component = metadata.component;
      const status = metadata.status;
      const approval = metadata.approval;

      // Determine type based on filename or explicit type field
      let itemType = 'document'
      if (baseUrl.includes('/templates')) {
        itemType = 'template'
      } else if (file.includes('-capability.md')) {
        itemType = 'capability'
      } else if (file.includes('-enabler.md')) {
        itemType = 'enabler'
      } else if (type) {
        itemType = type
      }

      const item: DocumentItem = {
        name: name || file,
        title: title || file.replace('.md', ''),
        description: description,
        type: itemType as any,
        path: baseUrl ? `${baseUrl.replace(/^\//, '')}/${file}` : file,
        projectPath: dirPath, // Add source project path for workspace support
        fullPath: fullPath, // Add the absolute path for proper access
        id: id,
        system: system,
        component: component,
        status: status,
        approval: approval,
        priority: metadata.priority,
        capabilityId: capabilityId,
        ...(metadata.functionalRequirements && { functionalRequirements: metadata.functionalRequirements }),
        ...(metadata.nonFunctionalRequirements && { nonFunctionalRequirements: metadata.nonFunctionalRequirements })
      };

      items.push(item);
    }
  }

  return items;
}

// Function to scan multiple project paths and combine results
async function scanProjectPaths(projectPaths: string[]): Promise<DocumentItem[]> {
  let allItems = [];

  for (const projectPath of projectPaths) {
    const resolvedPath = path.resolve(projectPath);
    const items = await scanDirectory(resolvedPath);
    allItems = allItems.concat(items);
  }

  return allItems;
}

// Function to find file across project paths
async function findFileInProjectPaths(filePath: string, projectPaths: (string | { path: string; icon?: string })[]): Promise<FileLocation | null> {
  for (const projectPath of projectPaths) {
    // Ensure projectPath is a string - handle both legacy string format and new object format
    const pathString = typeof projectPath === 'string' ? projectPath : projectPath.path;
    const fullPath = path.join(path.resolve(pathString), filePath);
    if (await fs.pathExists(fullPath)) {
      return {
        fullPath,
        projectRoot: path.resolve(pathString)
      };
    }
  }
  return null;
}

// Extract title from markdown content
function extractTitle(content: string): string | null {
  const match = content.match(/^#\s+(.+)$/m);
  return match ? match[1] : null;
}

// Extract description from markdown metadata
function extractDescription(content: string): string | null {
  const match = content.match(/^-\s*\*\*Description\*\*:\s*(.+)$/m);
  return match ? match[1] : null;
}

// Remove redundant title header from content for display view
function removeRedundantHeader(content) {
  // Remove the first line if it starts with # (the title header)
  // This prevents duplicate titles since DocumentView shows title in header
  return content.replace(/^#\s+.+\n*/, '');
}

// Enhance dependency tables with capability names
async function enhanceDependencyTablesWithNames(html) {
  try {
    const configPaths = getConfigPaths(config);

    // Create a map of capability ID to name for quick lookup
    const capabilityMap = new Map();

    // Read all capability files from all project paths to build the map
    for (const projectPath of configPaths.projectPaths) {
      const resolvedPath = path.resolve(projectPath);
      if (!await fs.pathExists(resolvedPath)) {
        continue;
      }

      const files = await fs.readdir(resolvedPath);
      const capabilityFiles = files.filter(file => file.endsWith('-capability.md'));

      for (const file of capabilityFiles) {
        try {
          const filePath = path.join(resolvedPath, file);
          const content = await fs.readFile(filePath, 'utf8');
          const id = extractId(content);
          const name = extractName(content);

          if (id && name) {
            capabilityMap.set(id, name);
          }
        } catch (error) {
          console.warn(`Could not process capability file ${file}:`, error.message);
        }
      }
    }
    
    // Enhanced regex to find dependency table rows with capability IDs
    const dependencyTableRegex = /<tr>\s*<td>([A-Z]+-\d+)<\/td>\s*<td>([^<]*)<\/td>\s*<\/tr>/g;
    
    // Replace each table row with enhanced version that includes capability name
    const enhancedHtml = html.replace(dependencyTableRegex, (match, capabilityId, description) => {
      const capabilityName = capabilityMap.get(capabilityId);
      
      if (capabilityName) {
        // Add the name after the ID in the same cell
        return match.replace(
          `<td>${capabilityId}</td>`,
          `<td><strong>${capabilityId}</strong><br/><span style="font-size: 0.9em; opacity: 0.8;">${capabilityName}</span></td>`
        );
      }
      
      return match; // Return unchanged if no name found
    });
    
    return enhancedHtml;
  } catch (error) {
    console.warn('Error enhancing dependency tables:', error.message);
    return html; // Return original HTML if enhancement fails
  }
}

// Function to enhance enabler tables with dynamic data
async function enhanceEnablerTablesWithDynamicData(html) {
  try {
    const configPaths = getConfigPaths(config);

    // Create a map of enabler ID to enabler data for quick lookup
    const enablerMap = new Map();

    // Read all enabler files from all project paths to build the map
    for (const projectPath of configPaths.projectPaths) {
      // Ensure projectPath is a string - handle both legacy string format and new object format
      const pathString = typeof projectPath === 'string' ? projectPath : (projectPath as { path: string }).path;
      const resolvedPath = path.resolve(pathString);
      if (!await fs.pathExists(resolvedPath)) {
        continue;
      }

      const files = await fs.readdir(resolvedPath);
      const enablerFiles = files.filter(file => file.endsWith('-enabler.md'));

      for (const file of enablerFiles) {
        try {
          const filePath = path.join(resolvedPath, file);
          const content = await fs.readFile(filePath, 'utf8');
          const metadata = extractMetadata(content);

          if (metadata.id) {
            const enablerEntry = {
              id: metadata.id,
              name: metadata.name || metadata.title || 'Unnamed',
              status: metadata.status || 'Unknown',
              approval: metadata.approval || 'Unknown',
              priority: metadata.priority || 'Unknown'
            };

            // Debug logging for ENB-138959 specifically
            if (metadata.id === 'ENB-138959') {
              logger.debug('🔍 Loading ENB-138959 enabler metadata', {
                file: filePath,
                extractedPriority: metadata.priority,
                extractedStatus: metadata.status,
                extractedApproval: metadata.approval,
                finalEntry: enablerEntry
              });
            }

            enablerMap.set(metadata.id, enablerEntry);
          }
        } catch (err) {
          console.warn(`Error reading enabler file ${file}:`, err.message);
        }
      }
    }

    // Find and enhance enabler tables in the HTML
    // Look for tables with "Enabler ID" header
    let enhancedHtml = html.replace(
      /<table[\s\S]*?<\/table>/g,
      (tableMatch) => {
        // Check if this table has "Enabler ID" in the header
        if (tableMatch.includes('Enabler ID')) {
          // Transform the table to include dynamic data
          return tableMatch.replace(
            /<tr[^>]*>[\s\S]*?<\/tr>/g,
            (rowMatch, index) => {
              // Skip the header row and separator row
              if (rowMatch.includes('Enabler ID') || rowMatch.includes('---')) {
                return rowMatch;
              }

              // Extract enabler ID from the row
              const enablerIdMatch = rowMatch.match(/<td[^>]*>(ENB-\d+)<\/td>/);
              if (enablerIdMatch) {
                const enablerId = enablerIdMatch[1];
                const enablerData = enablerMap.get(enablerId);

                if (enablerData) {
                  // Check if this is single column (1), old 2-column format (2), or legacy 6-column format
                  const cellCount = (rowMatch.match(/<td[^>]*>/g) || []).length;

                  if (cellCount === 1) {
                    // Single column format: Only ID
                    return `<tr>
                      <td>${enablerData.id}</td>
                      <td>${enablerData.name}</td>
                      <td><span class="status-${enablerData.status.toLowerCase().replace(/\s+/g, '-')}">${enablerData.status}</span></td>
                      <td><span class="approval-${enablerData.approval.toLowerCase().replace(/\s+/g, '-')}">${enablerData.approval}</span></td>
                      <td><span class="priority-${enablerData.priority.toLowerCase()}">${enablerData.priority}</span></td>
                    </tr>`;
                  } else if (cellCount === 2) {
                    // Two column format: ID and Description
                    // Transform to full format with dynamic data
                    const descriptionMatch = rowMatch.match(/<td[^>]*>(?:ENB-\d+)<\/td>\s*<td[^>]*>(.*?)<\/td>/);
                    const description = descriptionMatch ? descriptionMatch[1] : '';

                    return `<tr>
                      <td>${enablerData.id}</td>
                      <td>${enablerData.name}</td>
                      <td><span class="status-${enablerData.status.toLowerCase().replace(/\s+/g, '-')}">${enablerData.status}</span></td>
                      <td><span class="approval-${enablerData.approval.toLowerCase().replace(/\s+/g, '-')}">${enablerData.approval}</span></td>
                      <td><span class="priority-${enablerData.priority.toLowerCase()}">${enablerData.priority}</span></td>
                    </tr>`;
                  } else {
                    // Legacy format: Update with fresh data
                    // Transform old format to new format without description column
                    return `<tr>
                      <td>${enablerData.id}</td>
                      <td>${enablerData.name}</td>
                      <td><span class="status-${enablerData.status.toLowerCase().replace(/\s+/g, '-')}">${enablerData.status}</span></td>
                      <td><span class="approval-${enablerData.approval.toLowerCase().replace(/\s+/g, '-')}">${enablerData.approval}</span></td>
                      <td><span class="priority-${enablerData.priority.toLowerCase()}">${enablerData.priority}</span></td>
                    </tr>`;
                  }
                } else {
                  // Enabler not found - show warning
                  return rowMatch.replace(
                    /<td[^>]*>(ENB-\d+)<\/td>/,
                    `<td><strong style="color: #d32f2f;">${enablerId} (Not Found)</strong></td>`
                  );
                }
              }

              return rowMatch;
            }
          );
        }
        return tableMatch;
      }
    );

    // Also update the table header if it's the new format (single column or old format)
    enhancedHtml = enhancedHtml.replace(
      /<tr[^>]*>\s*<th[^>]*>Enabler ID<\/th>\s*(<th[^>]*>Description<\/th>\s*)?<\/tr>/,
      `<tr>
        <th>Enabler ID</th>
        <th>Name</th>
        <th>Status</th>
        <th>Approval</th>
        <th>Priority</th>
      </tr>`
    );

    return enhancedHtml;
  } catch (error) {
    console.warn('Error enhancing enabler tables:', error.message);
    return html; // Return original HTML if enhancement fails
  }
}

// Extract type from markdown metadata
function extractType(content) {
  const match = content.match(/^-\s*\*\*Type\*\*:\s*(.+)$/m);
  return match ? match[1].toLowerCase() : null;
}

// Extract capability ID from enabler metadata
function extractCapabilityId(content) {
  const match = content.match(/^-\s*\*\*Capability ID\*\*:\s*(CAP-\d+)/m);
  return match ? match[1].trim() : null;
}

// Extract ID from metadata (for both capabilities and enablers)
function extractId(content) {
  const match = content.match(/^-\s*\*\*ID\*\*:\s*(.+)$/m);
  return match ? match[1].trim() : null;
}

function extractName(content) {
  const match = content.match(/^-\s*\*\*Name\*\*:\s*(.+)$/m);
  return match ? match[1].trim() : null;
}

function extractStatus(content) {
  const match = content.match(/^-\s*\*\*Status\*\*:\s*(.+)$/m);
  return match ? match[1].trim() : null;
}

function extractApproval(content) {
  const match = content.match(/^-\s*\*\*Approval\*\*:\s*(.+)$/m);
  return match ? match[1].trim() : null;
}

function extractPriority(content) {
  const match = content.match(/^-\s*\*\*Priority\*\*:\s*(.+)$/m);
  return match ? match[1].trim() : null;
}

function extractSystem(content) {
  const match = content.match(/^-\s*\*\*System\*\*:\s*(.+)$/m);
  return match ? match[1].trim() : null;
}

// Extract all metadata from content into a single object
function extractMetadata(content: string): DocumentMetadata {
  const type = extractType(content);
  const metadata: any = {
    id: extractId(content),
    name: extractName(content),
    title: extractTitle(content),
    description: extractDescription(content),
    type: type,
    status: extractStatus(content),
    approval: extractApproval(content),
    priority: extractPriority(content),
    system: extractSystem(content),
    component: extractComponent(content),
    capabilityId: extractCapabilityId(content)
  };

  // Add requirements for enablers
  if (type === 'enabler') {
    metadata.functionalRequirements = parseFunctionalRequirements(content);
    metadata.nonFunctionalRequirements = parseNonFunctionalRequirements(content);
  }

  return metadata;
}

// Requirement parsing functions
function parseFunctionalRequirements(markdown: string): any[] {
  return parseRequirementsTable(markdown, 'Functional Requirements', ['id', 'name', 'requirement', 'priority', 'status', 'approval']);
}

function parseNonFunctionalRequirements(markdown: string): any[] {
  return parseRequirementsTable(markdown, 'Non-Functional Requirements', ['id', 'name', 'type', 'requirement', 'priority', 'status', 'approval']);
}

function parseRequirementsTable(markdown: string, sectionTitle: string, fields: string[]): any[] {
  const lines = markdown.split('\n');
  const sectionIndex = lines.findIndex(line => line.includes(sectionTitle));

  if (sectionIndex === -1) return [];

  // Find the table start (look for | headers |)
  let tableStart = -1;
  for (let i = sectionIndex; i < lines.length; i++) {
    if (lines[i].trim().startsWith('|') && lines[i].includes('|')) {
      tableStart = i;
      break;
    }
  }

  if (tableStart === -1) return [];

  // Skip header and separator rows
  const dataStart = tableStart + 2;
  const requirements: any[] = [];

  for (let i = dataStart; i < lines.length; i++) {
    const line = lines[i].trim();

    // Stop if we hit an empty line or next section
    if (!line || (!line.startsWith('|') && line.startsWith('#'))) break;

    if (line.startsWith('|') && line.endsWith('|')) {
      const cells = line.split('|').map(cell => cell.trim()).filter(cell => cell !== '');

      if (cells.length >= fields.length) {
        const requirement: any = {};
        fields.forEach((field, index) => {
          requirement[field] = cells[index] || '';
        });
        requirements.push(requirement);
      }
    }
  }

  return requirements;
}

// ID Generation Functions (Server-side)
// Replicates client-side logic for generating unique IDs

/**
 * Generates a semi-unique 6-digit number based on current timestamp and random component
 * @returns {string} A 6-digit number string
 */
function generateSemiUniqueNumber() {
  // Use current timestamp (last 4 digits) + 2-digit random number
  const now = Date.now();
  const timeComponent = parseInt(now.toString().slice(-4));
  const randomComponent = Math.floor(Math.random() * 100);

  // Combine and ensure it's 6 digits
  const combined = timeComponent * 100 + randomComponent;

  // Ensure it's exactly 6 digits by padding or truncating
  return combined.toString().padStart(6, '0').slice(-6);
}

/**
 * Scans all project files to get existing IDs
 * @param {string} prefix - The ID prefix to search for ('CAP-' or 'ENB-')
 * @returns {Promise<string[]>} Array of existing IDs
 */
async function scanExistingIds(prefix) {
  try {
    const configPaths = getConfigPaths(config);
    const allItems = await scanProjectPaths(configPaths.projectPaths);

    const existingIds = [];
    for (const item of allItems) {
      if (item.metadata && item.metadata.id && item.metadata.id.startsWith(prefix)) {
        existingIds.push(item.metadata.id);
      }
    }

    return existingIds;
  } catch (error) {
    console.error(`[ID-SCAN] Error scanning existing ${prefix} IDs:`, error);
    return [];
  }
}

/**
 * Generates a unique capability ID
 * @returns {Promise<string>} New capability ID in format CAP-123456
 */
async function generateCapabilityId() {
  const existingIds = await scanExistingIds('CAP-');
  let attempts = 0;
  const maxAttempts = 100;

  while (attempts < maxAttempts) {
    const newNumber = generateSemiUniqueNumber();
    const newId = `CAP-${newNumber}`;

    if (!existingIds.includes(newId)) {
      return newId;
    }

    attempts++;
    // Small delay to ensure different timestamp
    const start = Date.now();
    while (Date.now() - start < 1) { /* wait */ }
  }

  // Fallback to sequential numbering if semi-unique generation fails
  let sequentialNum = 100000;
  while (existingIds.includes(`CAP-${sequentialNum}`)) {
    sequentialNum++;
  }

  return `CAP-${sequentialNum}`;
}

/**
 * Generates a unique enabler ID
 * @returns {Promise<string>} New enabler ID in format ENB-123456
 */
async function generateEnablerId() {
  const existingIds = await scanExistingIds('ENB-');
  let attempts = 0;
  const maxAttempts = 100;

  while (attempts < maxAttempts) {
    const newNumber = generateSemiUniqueNumber();
    const newId = `ENB-${newNumber}`;

    if (!existingIds.includes(newId)) {
      return newId;
    }

    attempts++;
    // Small delay to ensure different timestamp
    const start = Date.now();
    while (Date.now() - start < 1) { /* wait */ }
  }

  // Fallback to sequential numbering if semi-unique generation fails
  let sequentialNum = 100000;
  while (existingIds.includes(`ENB-${sequentialNum}`)) {
    sequentialNum++;
  }

  return `ENB-${sequentialNum}`;
}

/**
 * Generates a unique functional requirement ID
 * @returns {Promise<string>} New FR ID in format FR-123456
 */
async function generateFunctionalRequirementId() {
  const existingIds = await scanExistingIds('FR-');
  let attempts = 0;
  const maxAttempts = 100;

  while (attempts < maxAttempts) {
    const newNumber = generateSemiUniqueNumber();
    const newId = `FR-${newNumber}`;

    if (!existingIds.includes(newId)) {
      return newId;
    }

    attempts++;
    // Small delay to ensure different timestamp
    const start = Date.now();
    while (Date.now() - start < 1) { /* wait */ }
  }

  // Fallback to sequential numbering if semi-unique generation fails
  let sequentialNum = 100000;
  while (existingIds.includes(`FR-${sequentialNum}`)) {
    sequentialNum++;
  }

  return `FR-${sequentialNum}`;
}

/**
 * Generates a unique non-functional requirement ID
 * @returns {Promise<string>} New NFR ID in format NFR-123456
 */
async function generateNonFunctionalRequirementId() {
  const existingIds = await scanExistingIds('NFR-');
  let attempts = 0;
  const maxAttempts = 100;

  while (attempts < maxAttempts) {
    const newNumber = generateSemiUniqueNumber();
    const newId = `NFR-${newNumber}`;

    if (!existingIds.includes(newId)) {
      return newId;
    }

    attempts++;
    // Small delay to ensure different timestamp
    const start = Date.now();
    while (Date.now() - start < 1) { /* wait */ }
  }

  // Fallback to sequential numbering if semi-unique generation fails
  let sequentialNum = 100000;
  while (existingIds.includes(`NFR-${sequentialNum}`)) {
    sequentialNum++;
  }

  return `NFR-${sequentialNum}`;
}

/**
 * Copy a capability document with all its enablers
 */
async function copyCapability(originalContent, originalPath, configPaths, originalDirectory = null) {
  // Generate new capability ID
  const newCapabilityId = await generateCapabilityId();

  // Extract original capability info
  const originalName = extractName(originalContent);
  const originalId = extractId(originalContent);

  // Create new name with "(Copy)" prefix
  const newName = `(Copy) ${originalName}`;

  // Update capability content
  let newContent = originalContent;

  // Replace ID
  newContent = newContent.replace(
    /^-\s*\*\*ID\*\*:\s*.+$/m,
    `- **ID**: ${newCapabilityId}`
  );

  // Replace title/name
  newContent = newContent.replace(
    /^#\s+(.+)$/m,
    `# ${newName}`
  );

  // Replace name in metadata if it exists
  newContent = newContent.replace(
    /^-\s*\*\*Name\*\*:\s*.+$/m,
    `- **Name**: ${newName}`
  );

  // Create new file path
  const pathParts = originalPath.split('/');
  const fileName = pathParts[pathParts.length - 1];
  const numericId = newCapabilityId.replace(/^CAP-/, '');
  const newFileName = fileName.replace(/^(.+)-capability\.md$/, `${numericId}-capability.md`);
  const newPath = [...pathParts.slice(0, -1), newFileName].join('/');

  // Use original directory if provided, otherwise fall back to first project path
  const targetDir = originalDirectory || configPaths.projectPaths[0];
  const fullNewPath = path.resolve(path.join(targetDir, path.basename(newFileName)));

  // Create directory if it doesn't exist
  await fs.ensureDir(path.dirname(fullNewPath));

  // Find and copy all enablers for this capability first
  const copiedEnablers = await copyCapabilityEnablers(originalId, newCapabilityId, configPaths);

  // Update enabler table with copied enabler IDs
  if (copiedEnablers.length > 0) {
    copiedEnablers.forEach(enabler => {
      // Replace old enabler ID with new one in the enabler table
      const oldIdPattern = new RegExp(`\\b${enabler.originalId}\\b`, 'g');
      newContent = newContent.replace(oldIdPattern, enabler.newId);
    });
  }

  // Write new capability file with updated enabler table
  await fs.writeFile(fullNewPath, newContent);

  // Return the new path relative to the project paths
  let relativeNewPath = newPath;
  if (originalDirectory) {
    // Find which project path contains this directory
    for (const projectPath of configPaths.projectPaths) {
      const resolvedProjectPath = path.resolve(projectPath);
      if (originalDirectory.startsWith(resolvedProjectPath)) {
        relativeNewPath = path.relative(resolvedProjectPath, fullNewPath).replace(/\\/g, '/');
        break;
      }
    }
  }

  return {
    newPath: relativeNewPath,
    newId: newCapabilityId,
    newName,
    copiedEnablers
  };
}

/**
 * Copy all enablers for a capability
 */
async function copyCapabilityEnablers(originalCapabilityId, newCapabilityId, configPaths) {
  const copiedEnablers = [];

  console.log(`[COPY-ENABLERS] Looking for enablers for capability: ${originalCapabilityId}`);
  console.log(`[COPY-ENABLERS] Project paths:`, configPaths.projectPaths);

  // Scan for enablers belonging to the original capability
  const allItems = await scanProjectPaths(configPaths.projectPaths);
  console.log(`[COPY-ENABLERS] All items found:`, allItems.map(item => ({ name: item.name, type: item.type, path: item.path })));

  const enablerFiles = allItems.filter(item =>
    item.path.endsWith('-enabler.md') &&
    item.type === 'enabler'
  );

  console.log(`[COPY-ENABLERS] Found ${enablerFiles.length} total enabler files`);

  for (const enablerFile of enablerFiles) {
    try {
      // Read the enabler file content
      const fullPath = path.resolve(path.join(enablerFile.projectPath, enablerFile.path));
      const enablerContent = await fs.readFile(fullPath, 'utf8');

      // Check if this enabler belongs to the original capability
      const enablerCapabilityId = extractCapabilityId(enablerContent);
      console.log(`[COPY-ENABLERS] Enabler ${enablerFile.name} has capability ID: ${enablerCapabilityId}, looking for: ${originalCapabilityId}`);

      if (enablerCapabilityId !== originalCapabilityId) {
        continue;
      }

      console.log(`[COPY-ENABLERS] Found matching enabler: ${enablerFile.name}`);

      const newEnablerId = await generateEnablerId();
      const originalName = extractName(enablerContent);
      const newName = `(Copy) ${originalName}`;

      // Update enabler content
      let newContent = enablerContent;

      // Replace enabler ID
      newContent = newContent.replace(
        /^-\s*\*\*ID\*\*:\s*.+$/m,
        `- **ID**: ${newEnablerId}`
      );

      // Replace capability ID reference
      newContent = newContent.replace(
        /^-\s*\*\*Capability ID\*\*:\s*.+$/m,
        `- **Capability ID**: ${newCapabilityId}`
      );

      // Replace title/name
      newContent = newContent.replace(
        /^#\s+(.+)$/m,
        `# ${newName}`
      );

      // Replace name in metadata if it exists
      newContent = newContent.replace(
        /^-\s*\*\*Name\*\*:\s*.+$/m,
        `- **Name**: ${newName}`
      );

      // Renumber requirements
      newContent = await renumberRequirements(newContent);

      // Create new file path
      const originalPath = enablerFile.path;
      const pathParts = originalPath.split('/');
      const fileName = pathParts[pathParts.length - 1];
      const numericId = newEnablerId.replace(/^ENB-/, '');
      const newFileName = fileName.replace(/^(.+)-enabler\.md$/, `${numericId}-enabler.md`);
      const newPath = [...pathParts.slice(0, -1), newFileName].join('/');

      // Write new enabler file in the same directory as the original enabler
      const originalEnablerDirectory = path.dirname(fullPath);
      const fullNewPath = path.resolve(path.join(originalEnablerDirectory, path.basename(newFileName)));
      await fs.ensureDir(path.dirname(fullNewPath));
      await fs.writeFile(fullNewPath, newContent);

      // Calculate relative path from project root
      let relativeNewPath = newPath;
      for (const projectPath of configPaths.projectPaths) {
        const resolvedProjectPath = path.resolve(projectPath);
        if (originalEnablerDirectory.startsWith(resolvedProjectPath)) {
          relativeNewPath = path.relative(resolvedProjectPath, fullNewPath).replace(/\\/g, '/');
          break;
        }
      }

      copiedEnablers.push({
        originalId: extractId(enablerContent),
        newId: newEnablerId,
        newPath: relativeNewPath,
        newName
      });

    } catch (error) {
      console.error(`Error copying enabler ${enablerFile.path}:`, error);
    }
  }

  console.log(`[COPY-ENABLERS] Copied ${copiedEnablers.length} enablers`);
  return copiedEnablers;
}

/**
 * Copy an enabler document with renumbered requirements
 */
async function copyEnabler(originalContent, originalPath, configPaths, originalDirectory = null) {
  // Generate new enabler ID
  const newEnablerId = await generateEnablerId();

  // Extract original enabler info
  const originalName = extractName(originalContent);
  const capabilityId = extractCapabilityId(originalContent);

  // Create new name with "(Copy)" prefix
  const newName = `(Copy) ${originalName}`;

  // Update enabler content
  let newContent = originalContent;

  // Replace ID
  newContent = newContent.replace(
    /^-\s*\*\*ID\*\*:\s*.+$/m,
    `- **ID**: ${newEnablerId}`
  );

  // Replace title/name
  newContent = newContent.replace(
    /^#\s+(.+)$/m,
    `# ${newName}`
  );

  // Replace name in metadata if it exists
  newContent = newContent.replace(
    /^-\s*\*\*Name\*\*:\s*.+$/m,
    `- **Name**: ${newName}`
  );

  // Renumber requirements
  newContent = await renumberRequirements(newContent);

  // Create new file path
  const pathParts = originalPath.split('/');
  const fileName = pathParts[pathParts.length - 1];
  const numericId = newEnablerId.replace(/^ENB-/, '');
  const newFileName = fileName.replace(/^(.+)-enabler\.md$/, `${numericId}-enabler.md`);
  const newPath = [...pathParts.slice(0, -1), newFileName].join('/');

  // Use original directory if provided, otherwise fall back to first project path
  const targetDir = originalDirectory || configPaths.projectPaths[0];
  const fullNewPath = path.resolve(path.join(targetDir, path.basename(newFileName)));

  // Create directory if it doesn't exist
  await fs.ensureDir(path.dirname(fullNewPath));

  // Write new enabler file
  await fs.writeFile(fullNewPath, newContent);

  // Return the new path relative to the project paths
  let relativeNewPath = newPath;
  if (originalDirectory) {
    // Find which project path contains this directory
    for (const projectPath of configPaths.projectPaths) {
      const resolvedProjectPath = path.resolve(projectPath);
      if (originalDirectory.startsWith(resolvedProjectPath)) {
        relativeNewPath = path.relative(resolvedProjectPath, fullNewPath).replace(/\\/g, '/');
        break;
      }
    }
  }

  return {
    newPath: relativeNewPath,
    newId: newEnablerId,
    newName,
    capabilityId
  };
}

/**
 * Renumber all requirements in an enabler with unique IDs
 */
async function renumberRequirements(content) {
  let updatedContent = content;

  // Find all FR- IDs and replace with unique ones
  const frMatches = updatedContent.match(/\|\s*FR-\d+\s*\|/g) || [];
  for (const match of frMatches) {
    const newFrId = await generateFunctionalRequirementId();
    updatedContent = updatedContent.replace(match, `| ${newFrId} |`);
  }

  // Find all NFR- IDs and replace with unique ones
  const nfrMatches = updatedContent.match(/\|\s*NFR-\d+\s*\|/g) || [];
  for (const match of nfrMatches) {
    const newNfrId = await generateNonFunctionalRequirementId();
    updatedContent = updatedContent.replace(match, `| ${newNfrId} |`);
  }

  return updatedContent;
}

function extractComponent(content) {
  const match = content.match(/^-\s*\*\*Component\*\*:\s*(.+)$/m);
  return match ? match[1].trim() : null;
}

// API Routes
// Unified enabler template endpoint 
app.get('/api/enabler-template/:capabilityId?', async (req, res) => {
  try {
    const { capabilityId } = req.params;

    // Generate a unique enabler ID for the template
    const generatedId = await generateEnablerId();

    // Create a temporary enabler object with placeholders
    const placeholderEnabler = {
      name: '[Enabler Name]',
      id: generatedId,
      status: 'In Draft',
      approval: 'Not Approved',
      priority: 'High',
      description: '[What is the purpose?]'
    };
    
    // Generate template content using the template generator that extracts from SOFTWARE_DEVELOPMENT_PLAN.md
    const templateContent = await generateEnablerContentFromTemplate(
      placeholderEnabler,
      capabilityId || 'CAP-XXXXXX (Parent Capability)'
    );
    
    console.log('[ENABLER-TEMPLATE-API] Serving unified template, length:', templateContent.length, 'chars');
    res.json({ content: templateContent });
  } catch (error) {
    console.error('[ENABLER-TEMPLATE-API] Error serving template:', error);
    res.status(500).json({ error: 'Error loading enabler template: ' + error.message });
  }
});

app.get('/api/capability-template', async (req, res) => {
  try {
    // Generate a unique capability ID for the template
    const generatedId = await generateCapabilityId();

    // Create a temporary capability object with placeholders
    const placeholderCapability = {
      name: '[Capability Name]',
      id: generatedId,
      status: 'In Draft',
      approval: 'Not Approved',
      priority: 'High',
      description: '[Clear business value statement explaining what business problem this solves]'
    };

    // Generate template content using the template generator that extracts from SOFTWARE_DEVELOPMENT_PLAN.md
    const templateContent = await generateCapabilityContentFromTemplate(placeholderCapability);

    console.log('[CAPABILITY-TEMPLATE-API] Serving unified template, length:', templateContent.length, 'chars');
    res.json({ content: templateContent });
  } catch (error) {
    console.error('[CAPABILITY-TEMPLATE-API] Error serving template:', error);
    res.status(500).json({ error: 'Error loading capability template: ' + error.message });
  }
});

app.get('/api/capabilities', async (req, res) => {
  logger.info('API call: /api/capabilities', { timestamp: new Date().toISOString(), userAgent: req.get('User-Agent') });
  try {
    const configPaths = getConfigPaths(config);
    const allItems = await scanProjectPaths(configPaths.projectPaths);
    const templates = await scanDirectory(configPaths.templates, 'templates');

    // Filter out non-document files and separate capabilities and enablers
    const excludedFiles = ['SOFTWARE_DEVELOPMENT_PLAN.md', 'README.md', 'CONTRIBUTING.md', 'LICENSE', 'NOTICE'];
    const filteredItems = allItems.filter(item => {
      // Exclude specific files by name
      const fileName = path.basename(item.path || '');
      if (excludedFiles.includes(fileName)) {
        return false;
      }
      // Only include items with proper document types
      return item.type === 'capability' || item.type === 'enabler';
    });

    const capabilities = filteredItems.filter(item => item.type === 'capability');
    const enablers = filteredItems.filter(item => item.type === 'enabler');

    res.json({
      capabilities,
      enablers,
      templates
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// New API endpoint for dynamic enabler lookup
app.get('/api/capabilities-dynamic', async (req, res) => {
  const startTime = Date.now();
  logger.info('API call: /api/capabilities-dynamic', { timestamp: new Date().toISOString(), userAgent: req.get('User-Agent') });
  try {
    const configPaths = getConfigPaths(config);
    const allItems = await scanProjectPaths(configPaths.projectPaths);
    const templates = await scanDirectory(configPaths.templates, 'templates');

    // Filter out non-document files and separate capabilities and enablers
    const excludedFiles = ['SOFTWARE_DEVELOPMENT_PLAN.md', 'README.md', 'CONTRIBUTING.md', 'LICENSE', 'NOTICE'];
    const filteredItems = allItems.filter(item => {
      const fileName = path.basename(item.path || '');
      if (excludedFiles.includes(fileName)) {
        return false;
      }
      return item.type === 'capability' || item.type === 'enabler';
    });

    const capabilities = filteredItems.filter(item => item.type === 'capability');
    const enablers = filteredItems.filter(item => item.type === 'enabler');

    // Create enabler lookup map for fast access, grouped by project path
    const enablerMap = new Map();
    const enablersByProjectPath = new Map();

    enablers.forEach(enabler => {
      if (enabler.id && enabler.projectPath) {
        enablerMap.set(enabler.id, enabler);

        // Group enablers by project path
        if (!enablersByProjectPath.has(enabler.projectPath)) {
          enablersByProjectPath.set(enabler.projectPath, new Map());
        }
        enablersByProjectPath.get(enabler.projectPath).set(enabler.id, enabler);
      }
    });

    // Process capabilities to include dynamic enabler data
    const enhancedCapabilities = await Promise.all(
      capabilities.map(async (capability) => {
        try {
          // Read capability file to extract enabler IDs
          const capabilityPath = path.join(capability.projectPath, path.basename(capability.path));
          const content = await fs.readFile(capabilityPath, 'utf8');

          // Parse enabler table to extract enabler IDs
          const enablerIds = extractEnablerIds(content);

          // Get enablers from the same project path as the capability
          const projectPathEnablers = enablersByProjectPath.get(capability.projectPath) || new Map();

          // Lookup enabler data dynamically - only from the same project path
          const enablerDetails = enablerIds.map(enablerIdRow => {
            // First try to find enabler in the same project path
            let enablerData = projectPathEnablers.get(enablerIdRow.id);

            // If not found in same project path, check globally (for backwards compatibility)
            // but warn about it
            if (!enablerData) {
              enablerData = enablerMap.get(enablerIdRow.id);
              if (enablerData && enablerData.projectPath !== capability.projectPath) {
                console.warn(`[NAVIGATION] Enabler ${enablerIdRow.id} found in different project path:`, {
                  capability: capability.path,
                  capabilityProjectPath: capability.projectPath,
                  enablerProjectPath: enablerData.projectPath,
                  enablerPath: enablerData.path
                });
                // Don't include cross-project enablers
                enablerData = null;
              }
            }

            if (enablerData) {
              return {
                id: enablerData.id,
                name: enablerData.name || enablerData.title,
                description: enablerIdRow.description || '', // Keep description from capability
                status: enablerData.status,
                approval: enablerData.approval,
                priority: enablerData.priority
              };
            } else {
              // Return placeholder if enabler not found in same project path
              return {
                id: enablerIdRow.id,
                name: 'Enabler Not Found (Different Project)',
                description: enablerIdRow.description || '',
                status: 'Unknown',
                approval: 'Unknown',
                priority: 'Unknown'
              };
            }
          });

          return {
            ...capability,
            enablers: enablerDetails
          };

        } catch (error) {
          console.warn(`Error processing capability ${capability.path}:`, error);
          return capability;
        }
      })
    );

    const duration = Date.now() - startTime;
    logger.info('API call completed: /api/capabilities-dynamic', { duration: `${duration}ms`, capabilityCount: enhancedCapabilities.length, enablerCount: enablers.length });

    res.json({
      capabilities: enhancedCapabilities,
      enablers,
      templates
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Helper function to extract enabler IDs from capability content
function extractEnablerIds(content: string): { id: string; description: string }[] {
  const lines = content.split('\n');
  const enablerSectionIndex = lines.findIndex(line => line.includes('## Enablers'));

  if (enablerSectionIndex === -1) {
    return [];
  }

  const enablerIds: { id: string; description: string }[] = [];
  let foundTable = false;

  for (let i = enablerSectionIndex; i < lines.length; i++) {
    const line = lines[i];

    // Stop when we hit the next section
    if (line.startsWith('## ') && i > enablerSectionIndex) {
      break;
    }

    if (line.startsWith('|') && !line.includes('---')) {
      if (!foundTable) {
        foundTable = true;
        continue; // Skip header row
      }

      const columns = line.split('|').map(col => col.trim()).filter(col => col);
      if (columns.length >= 3) {
        const enablerIdCol = columns[0] || '';
        const descriptionCol = columns[2] || '';

        // Extract ENB-XXXXXX pattern
        const enablerIdMatch = enablerIdCol.match(/ENB-\d+/);
        if (enablerIdMatch) {
          enablerIds.push({
            id: enablerIdMatch[0],
            description: descriptionCol
          });
        }
      }
    }
  }

  return enablerIds;
}

// Helper function to parse dependencies using markdownUtils parseTable function
function parseTableFromContent(content, sectionTitle) {
  const lines = content.split('\n')
  const sectionIndex = lines.findIndex(line => line.includes(sectionTitle))

  if (sectionIndex === -1) {
    return []
  }

  const result = []
  let foundTable = false

  for (let i = sectionIndex; i < lines.length; i++) {
    const line = lines[i]

    if (line.startsWith('|') && !line.includes('---')) {
      if (!foundTable) {
        foundTable = true
        continue // Skip header row
      }

      const cells = line.split('|').map(cell => cell.trim())
      // Remove first and last empty cells (from leading/trailing pipes), but keep middle empty cells
      if (cells.length > 0 && cells[0] === '') cells.shift()
      if (cells.length > 0 && cells[cells.length - 1] === '') cells.pop()

      if (cells.length >= 2) {
        result.push({
          id: cells[0] || '',
          description: cells[1] || ''
        })
      }
    } else if (foundTable && line.startsWith('#')) {
      break
    }
  }

  return result.filter(row => row.id.trim() || row.description.trim()) // Filter completely empty rows
}

// Enhanced capabilities endpoint with dependencies for diagram generation
app.get('/api/capabilities-with-dependencies', async (req, res) => {
  try {
    const configPaths = getConfigPaths(config);
    const allItems = await scanProjectPaths(configPaths.projectPaths);
    const templates = await scanDirectory(configPaths.templates, 'templates');

    // Filter out non-document files and separate capabilities and enablers
    const excludedFiles = ['SOFTWARE_DEVELOPMENT_PLAN.md', 'README.md', 'CONTRIBUTING.md', 'LICENSE', 'NOTICE'];
    const filteredItems = allItems.filter(item => {
      // Exclude specific files by name
      const fileName = path.basename(item.path || '');
      if (excludedFiles.includes(fileName)) {
        return false;
      }
      // Only include items with proper document types
      return item.type === 'capability' || item.type === 'enabler';
    });

    const capabilities = filteredItems.filter(item => item.type === 'capability');
    const enablers = filteredItems.filter(item => item.type === 'enabler');

    // Enhance capabilities with dependency information
    const enhancedCapabilities = await Promise.all(
      capabilities.map(async (capability) => {
        try {
          // Read the full capability file to extract dependencies
          let fullPath;
          if (capability.fullPath) {
            // Use the fullPath if it's already available
            fullPath = capability.fullPath;
          } else if (capability.projectPath) {
            // Construct path from projectPath and relative path
            fullPath = path.join(capability.projectPath, path.basename(capability.path));
          } else {
            // Fallback: try to find the file in project paths
            const fileLocation = await findFileInProjectPaths(capability.path, configPaths.projectPaths);
            fullPath = fileLocation ? fileLocation.fullPath : null;
          }

          if (!fullPath || !await fs.pathExists(fullPath)) {
            console.warn(`[CAPABILITIES-WITH-DEPS] Could not find capability file: ${capability.path}`);
            return {
              ...capability,
              upstreamDependencies: [],
              downstreamDependencies: []
            };
          }

          const content = await fs.readFile(fullPath, 'utf8');

          // Extract upstream dependencies using parseTable function
          const upstreamDependencies = parseTableFromContent(content, 'Internal Upstream Dependency');

          // Extract downstream dependencies using parseTable function
          const downstreamDependencies = parseTableFromContent(content, 'Internal Downstream Impact');

          return {
            ...capability,
            upstreamDependencies,
            downstreamDependencies
          };
        } catch (error) {
          console.error(`[CAPABILITIES-WITH-DEPS] Error processing capability ${capability.name}:`, error);
          return {
            ...capability,
            upstreamDependencies: [],
            downstreamDependencies: []
          };
        }
      })
    );

    res.json({
      capabilities: enhancedCapabilities,
      enablers,
      templates
    });
  } catch (error) {
    console.error('[CAPABILITIES-WITH-DEPS] Error loading capabilities with dependencies:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/file/*', async (req, res) => {
  try {
    const filePath = req.params[0];
    const configPaths = getConfigPaths(config);

    // Handle different file types based on configuration
    let fullPath;
    let projectRoot;
    let cleanFilePath;
    let fileLocation = null;

    if (filePath.startsWith('templates/')) {
      cleanFilePath = filePath.replace('templates/', '');
      fullPath = path.join(configPaths.templates, cleanFilePath);
      projectRoot = path.resolve(configPaths.templates);
    } else {
      // Try to find file in project paths
      cleanFilePath = filePath;
      // Remove common prefixes
      if (filePath.startsWith('examples/')) {
        cleanFilePath = filePath.replace('examples/', '');
      } else if (filePath.startsWith('specifications/')) {
        cleanFilePath = filePath.replace('specifications/', '');
      }

      fileLocation = await findFileInProjectPaths(cleanFilePath, configPaths.projectPaths);
      if (fileLocation) {
        fullPath = fileLocation.fullPath;
        projectRoot = fileLocation.projectRoot;
      } else {
        // Fallback to first project path
        const firstProjectPath = path.resolve(configPaths.projectPaths[0]);
        fullPath = path.join(firstProjectPath, cleanFilePath);
        projectRoot = firstProjectPath;
      }
    }
    
    // Enhanced security validation
    let resolvedPath
    try {
      if (fileLocation) {
        // File was found by findFileInProjectPaths - it's already validated to be in an allowed project path
        resolvedPath = fileLocation.fullPath
      } else {
        // File not found in project paths - validate against project root
        resolvedPath = validateAndResolvePath(cleanFilePath, projectRoot, 'file path')
      }

      // Additional file type validation
      if (!resolvedPath.endsWith('.md')) {
        throw new Error('Only .md files are allowed')
      }
    } catch (securityError) {
      console.warn(`[SECURITY] File access denied: ${securityError.message}`, { filePath, cleanFilePath, projectRoot, fullPath })
      return res.status(403).json({ error: 'Access denied: ' + securityError.message })
    }
    
    if (!await fs.pathExists(resolvedPath)) {
      return res.status(404).json({ error: 'File not found' });
    }
    
    const content = await fs.readFile(resolvedPath, 'utf8');
    const displayContent = removeRedundantHeader(content);
    let html = marked(displayContent);
    
    // Enhance dependency tables with capability names
    html = await enhanceDependencyTablesWithNames(html);

    // Enhance enabler tables with dynamic data
    html = await enhanceEnablerTablesWithDynamicData(html);
    
    // Get all file paths for relative path calculation
    const allItems = await scanProjectPaths(configPaths.projectPaths);
    const allFilePaths = allItems.map(item => item.fullPath);

    res.json({
      content,
      html,
      title: extractTitle(content),
      filePath: fullPath, // Add the actual file path
      allFilePaths: allFilePaths // Add all file paths for relative calculation
    });
  } catch (error) {
    console.error('Error loading file:', error);
    res.status(500).json({ error: 'Error loading file: ' + error.message });
  }
});

// Main route
// Save file content
app.post('/api/file/*', async (req, res) => {
  try {
    const filePath = req.params[0];
    const { content } = req.body;
    
    console.log('[SAVE] Attempting to save file:', filePath);
    console.log('[SAVE] Content length:', content ? content.length : 'no content');
    
    if (!content) {
      console.error('[SAVE] Error: Content is required');
      return res.status(400).json({ error: 'Content is required' });
    }
    
    // Handle different file types based on configuration
    let fullPath;
    let projectRoot;
    let cleanFilePath;
    let fileLocation = null;

    if (filePath.startsWith('templates/')) {
      const configPaths = getConfigPaths(config);
      const templatePath = path.resolve(configPaths.templates);
      cleanFilePath = filePath.replace('templates/', '');
      fullPath = path.join(templatePath, cleanFilePath);
      projectRoot = path.resolve(templatePath);
      console.log('[SAVE] Using templates path:', templatePath);
    } else {
      // Find file in project paths or use first project path for new files
      const configPaths = getConfigPaths(config);
      cleanFilePath = filePath;

      // Remove common prefixes
      if (filePath.startsWith('examples/')) {
        cleanFilePath = filePath.replace('examples/', '');
      } else if (filePath.startsWith('specifications/')) {
        cleanFilePath = filePath.replace('specifications/', '');
      }

      // Try to find existing file in project paths
      fileLocation = await findFileInProjectPaths(cleanFilePath, configPaths.projectPaths);
      if (fileLocation) {
        fullPath = fileLocation.fullPath;
        projectRoot = fileLocation.projectRoot;
        console.log('[SAVE] Found existing file in project path:', projectRoot);
      } else {
        // Use first project path for new files
        const firstProjectPath = path.resolve(configPaths.projectPaths[0]);
        fullPath = path.join(firstProjectPath, cleanFilePath);
        projectRoot = firstProjectPath;
        console.log('[SAVE] Using first project path for new file:', firstProjectPath);
      }

      console.log('[SAVE] Original filePath:', filePath);
      console.log('[SAVE] Clean filePath:', cleanFilePath);
      console.log('[SAVE] Project root adjusted to:', projectRoot);
    }
    
    let resolvedPath
    try {
      if (fileLocation) {
        // File was found by findFileInProjectPaths - it's already validated to be in an allowed project path
        resolvedPath = fileLocation.fullPath
      } else {
        // New file - validate against project root
        resolvedPath = validateAndResolvePath(cleanFilePath, projectRoot, 'save path')
      }
      
      // Additional file type validation
      if (!resolvedPath.endsWith('.md')) {
        throw new Error('Only .md files can be saved')
      }
      
      console.log('[SAVE] Full path:', fullPath);
      console.log('[SAVE] Resolved path:', resolvedPath);
      console.log('[SAVE] Project root:', projectRoot);
    } catch (securityError) {
      console.error('[SAVE] Security validation failed:', securityError.message);
      return res.status(403).json({ error: 'Access denied: ' + securityError.message });
    }
    
    
    await fs.writeFile(resolvedPath, content, 'utf8');
    console.log('[SAVE] File written successfully to:', resolvedPath);

    // Broadcast file change to trigger client refresh
    broadcastFileChange('change', resolvedPath);
    console.log('[SAVE] Broadcasted file change:', path.basename(resolvedPath));

    const title = extractTitle(content);
    const description = extractDescription(content);
    const type = extractType(content);
    
    // Sync enabler fields to capability table if this is an enabler file
    if (cleanFilePath.endsWith('-enabler.md')) {
      try {
        console.log('[SAVE-ENABLER-SYNC] Detected enabler file, syncing to capability table');
        
        // Parse enabler data from the saved content
        const enablerData = {
          id: extractId(content),
          name: extractName(content),
          description: extractDescription(content) || '',
          status: extractStatus(content),
          approval: extractApproval(content),
          priority: extractPriority(content)
        };
        
        const capabilityId = extractCapabilityId(content);
        
        console.log('[SAVE-ENABLER-SYNC] Extracted enabler data:', enablerData);
        console.log('[SAVE-ENABLER-SYNC] Capability ID:', capabilityId);
        
        if (enablerData.id && capabilityId) {
          await updateCapabilityEnablerFields(enablerData, capabilityId);
          console.log('[SAVE-ENABLER-SYNC] Successfully synced enabler fields to capability');
        } else {
          console.log('[SAVE-ENABLER-SYNC] Missing enabler ID or capability ID, skipping sync');
        }
      } catch (syncError) {
        console.error('[SAVE-ENABLER-SYNC] Error syncing enabler to capability:', syncError);
        // Don't fail the save operation due to sync error, just log it
      }
    }
    
    console.log('[SAVE] Success - Title:', title, 'Type:', type);
    res.json({
      success: true,
      title,
      description,
      type
    });
  } catch (error) {
    console.error('[SAVE] Error saving file:', error);
    console.error('[SAVE] Error stack:', error.stack);
    res.status(500).json({ error: 'Error saving file: ' + error.message });
  }
});

// Delete file
app.delete('/api/file/*', async (req, res) => {
  try {
    const filePath = req.params[0];
    
    // Handle different file types based on configuration
    let fullPath;
    let projectRoot;
    let cleanFilePath;
    let fileLocation = null;

    if (filePath.startsWith('templates/')) {
      const configPaths = getConfigPaths(config);
      cleanFilePath = filePath.replace('templates/', '');
      fullPath = path.join(configPaths.templates, cleanFilePath);
      projectRoot = path.resolve(configPaths.templates);
    } else {
      // Find file in project paths
      const configPaths = getConfigPaths(config);
      cleanFilePath = filePath;

      // Remove common prefixes
      if (filePath.startsWith('examples/')) {
        cleanFilePath = filePath.replace('examples/', '');
      } else if (filePath.startsWith('specifications/')) {
        cleanFilePath = filePath.replace('specifications/', '');
      }

      // Try to find file in project paths
      fileLocation = await findFileInProjectPaths(cleanFilePath, configPaths.projectPaths);
      if (fileLocation) {
        fullPath = fileLocation.fullPath;
        projectRoot = fileLocation.projectRoot;
      } else {
        // Fallback to first project path
        const firstProjectPath = path.resolve(configPaths.projectPaths[0]);
        fullPath = path.join(firstProjectPath, cleanFilePath);
        projectRoot = firstProjectPath;
      }
    }
    
    let resolvedPath
    try {
      if (fileLocation) {
        // File was found by findFileInProjectPaths - it's already validated to be in an allowed project path
        resolvedPath = fileLocation.fullPath
      } else {
        // File not found in project paths - validate against project root
        resolvedPath = validateAndResolvePath(cleanFilePath, projectRoot, 'delete path')
      }
      
      // Additional file type validation
      if (!resolvedPath.endsWith('.md')) {
        throw new Error('Only .md files can be deleted')
      }
    } catch (securityError) {
      console.warn(`[SECURITY] File deletion denied: ${securityError.message}`, { filePath, cleanFilePath, projectRoot })
      return res.status(403).json({ error: 'Access denied: ' + securityError.message })
    }
    
    if (!await fs.pathExists(resolvedPath)) {
      return res.status(404).json({ error: 'File not found' });
    }
    
    const fileName = path.basename(resolvedPath);
    
    // Handle enabler deletion - remove from parent capability before deleting file
    if (fileName.endsWith('-enabler.md')) {
      console.log(`[ENABLER-DELETE] Deleting enabler file: ${fileName}`);
      
      try {
        // Read the enabler file to get its capability ID and enabler ID
        const enablerContent = await fs.readFile(resolvedPath, 'utf8');
        const enablerCapabilityId = extractCapabilityId(enablerContent);
        const enablerId = extractId(enablerContent);
        const enablerName = extractName(enablerContent);
        
        if (enablerCapabilityId && enablerId) {
          console.log(`[ENABLER-DELETE] Removing enabler ${enablerId} from capability ${enablerCapabilityId}`);
          const configPaths = getConfigPaths(config);
          await removeEnablerFromCapability(enablerCapabilityId, enablerId, enablerName, configPaths.projectPaths);
          console.log(`[ENABLER-DELETE] Successfully removed enabler from capability`);
        } else {
          console.warn(`[ENABLER-DELETE] Could not extract capability ID or enabler ID from ${fileName}`);
        }
      } catch (enablerError) {
        console.error(`[ENABLER-DELETE] Error removing enabler from capability: ${enablerError.message}`);
        // Continue with deletion even if capability update fails
      }
    }
    
    // Delete the file
    await fs.unlink(resolvedPath);

    res.json({
      success: true,
      message: 'File deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting file:', error);
    res.status(500).json({ error: 'Error deleting file: ' + error.message });
  }
});

// Rename file
app.put('/api/file/rename/*', async (req, res) => {
  try {
    const oldFilePath = req.params[0];
    const { newFilePath } = req.body;
    
    console.log('[RENAME] Attempting to rename file:', oldFilePath, 'to:', newFilePath);
    
    if (!newFilePath) {
      return res.status(400).json({ error: 'New file path is required' });
    }
    
    // Handle different file types based on configuration
    let oldFullPath, newFullPath;
    let projectRoot;
    let oldProjectRoot, newProjectRoot;
    let oldCleanPath, newCleanPath;
    
    if (oldFilePath.startsWith('templates/')) {
      const configPaths = getConfigPaths(config);
      oldCleanPath = oldFilePath.replace('templates/', '');
      newCleanPath = newFilePath.replace('templates/', '');
      projectRoot = path.resolve(configPaths.templates);
      oldProjectRoot = projectRoot;
      newProjectRoot = projectRoot;
    } else {
      // For capabilities and enablers - search for existing file across all project paths
      const configPaths = getConfigPaths(config);
      oldCleanPath = oldFilePath;

      // First, find where the old file actually exists
      let foundOldFile = false;
      for (const projectPath of configPaths.projectPaths) {
        const normalizedProjectPath = projectPath.replace(/^\.\//, '');
        const testRoot = path.resolve(normalizedProjectPath);
        const testPath = path.resolve(testRoot, oldFilePath);

        try {
          if (await fs.pathExists(testPath)) {
            oldProjectRoot = testRoot;
            foundOldFile = true;
            console.log(`[RENAME] Found old file at: ${testPath}`);
            break;
          }
        } catch (err) {
          // Continue searching
        }
      }

      if (!foundOldFile) {
        return res.status(404).json({ error: 'Original file not found in any project path' });
      }

      // Extract just the filename from the new path to avoid nested directories
      const filename = path.basename(newFilePath);
      const newDir = path.dirname(newFilePath);

      // Find the matching project path for the new file location
      let matchingProjectPath = null;
      for (const projectPath of configPaths.projectPaths) {
        const normalizedProjectPath = projectPath.replace(/^\.\//, '');
        if (newDir === projectPath || newDir === normalizedProjectPath) {
          matchingProjectPath = projectPath;
          break;
        }
      }

      if (matchingProjectPath) {
        // Use the specific project path and just the filename
        newProjectRoot = path.resolve(matchingProjectPath.replace(/^\.\//, ''));
        newCleanPath = filename;
      } else {
        // Fallback - keep in same directory as old file
        newProjectRoot = oldProjectRoot;
        newCleanPath = filename;
      }

      // For backward compatibility, set projectRoot to oldProjectRoot
      projectRoot = oldProjectRoot;
    }
    
    try {
      if (oldFilePath.startsWith('templates/')) {
        // Template files - use same project root for both
        oldFullPath = validateAndResolvePath(oldCleanPath, projectRoot, 'old rename path');
        newFullPath = validateAndResolvePath(newCleanPath, projectRoot, 'new rename path');
      } else {
        // Capability/Enabler files - may be cross-project move
        oldFullPath = validateAndResolvePath(oldCleanPath, oldProjectRoot, 'old rename path');
        newFullPath = validateAndResolvePath(newCleanPath, newProjectRoot, 'new rename path');
      }

      // Additional file type validation
      if (!oldFullPath.endsWith('.md') || !newFullPath.endsWith('.md')) {
        throw new Error('Only .md files can be renamed');
      }
    } catch (securityError) {
      console.warn(`[SECURITY] File rename denied: ${securityError.message}`, {
        oldFilePath, newFilePath, oldCleanPath, newCleanPath, projectRoot
      });
      return res.status(403).json({ error: 'Access denied: ' + securityError.message });
    }
    
    // Note: We already verified the old file exists during path resolution for non-template files
    if (oldFilePath.startsWith('templates/') && !await fs.pathExists(oldFullPath)) {
      return res.status(404).json({ error: 'Original file not found' });
    }

    // Check if trying to rename to the same path (no-op)
    if (oldFullPath === newFullPath) {
      return res.json({
        success: true,
        message: 'File paths are identical, no rename needed',
        oldPath: oldFilePath,
        newPath: newFilePath
      });
    }

    if (await fs.pathExists(newFullPath)) {
      return res.status(409).json({ error: 'Target file already exists' });
    }
    
    // Ensure target directory exists
    await fs.ensureDir(path.dirname(newFullPath));
    
    // Rename the file
    await fs.rename(oldFullPath, newFullPath);
    
    console.log('[RENAME] File renamed successfully:', oldFullPath, 'to:', newFullPath);
    
    res.json({
      success: true,
      message: 'File renamed successfully',
      oldPath: oldFilePath,
      newPath: newFilePath
    });
  } catch (error) {
    console.error('Error renaming file:', error);
    res.status(500).json({ error: 'Error renaming file: ' + error.message });
  }
});

// Copy document (capability or enabler)
app.post('/api/copy/:type/*', async (req, res) => {
  try {
    const { type } = req.params;
    const originalPath = req.params[0];

    if (type !== 'capability' && type !== 'enabler') {
      return res.status(400).json({ error: 'Invalid document type. Must be capability or enabler.' });
    }

    const configPaths = getConfigPaths(config);
    let resolvedPath = null;

    // Find the file in project paths
    for (const projectPath of configPaths.projectPaths) {
      const fullPath = path.resolve(path.join(projectPath, originalPath));
      if (await fs.pathExists(fullPath)) {
        resolvedPath = fullPath;
        break;
      }
    }

    if (!resolvedPath) {
      return res.status(404).json({ error: 'Original document not found' });
    }

    // Read original file
    const originalContent = await fs.readFile(resolvedPath, 'utf8');

    // Extract the original directory to preserve it for the copy
    const originalDirectory = path.dirname(resolvedPath);

    if (type === 'capability') {
      // Copy capability with all its enablers
      const result = await copyCapability(originalContent, originalPath, configPaths, originalDirectory);
      res.json(result);
    } else {
      // Copy enabler with renumbered requirements
      const result = await copyEnabler(originalContent, originalPath, configPaths, originalDirectory);
      res.json(result);
    }

  } catch (error) {
    console.error('Error copying document:', error);
    res.status(500).json({ error: 'Error copying document: ' + error.message });
  }
});

// Get all capabilities for linking
app.get('/api/links/capabilities', async (req, res) => {
  try {
    const configPaths = getConfigPaths(config);
    const allItems = await scanProjectPaths(configPaths.projectPaths);

    // Filter to only include files that end with -capability.md
    const capabilities = allItems.filter(item => {
      if (item.type !== 'capability') return false;

      const fileName = path.basename(item.path || '');
      return fileName.endsWith('-capability.md');
    });

    const capabilitiesWithIds = await Promise.all(
      capabilities.map(async (cap) => {
        const filePath = path.join(cap.projectPath, path.basename(cap.path));
        const content = await fs.readFile(filePath, 'utf8');
        return {
          id: extractId(content),
          title: cap.title,
          path: cap.path,
          system: extractSystem(content),
          component: extractComponent(content)
        };
      })
    );

    res.json({
      capabilities: capabilitiesWithIds
    });
  } catch (error) {
    console.error('[CAPABILITIES] Error loading capabilities for links:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get all enablers for linking
app.get('/api/links/enablers', async (req, res) => {
  try {
    const configPaths = getConfigPaths(config);
    const allItems = await scanProjectPaths(configPaths.projectPaths);

    // Filter to only include files that end with -enabler.md
    const enablers = allItems.filter(item => {
      if (item.type !== 'enabler') return false;

      const fileName = path.basename(item.path || '');
      return fileName.endsWith('-enabler.md');
    });

    const enablersWithIds = await Promise.all(
      enablers.map(async (enabler) => {
        const filePath = path.join(enabler.projectPath, path.basename(enabler.path));
        const content = await fs.readFile(filePath, 'utf8');
        const capabilityId = extractCapabilityId(content);

        // Find the capability to get its metadata
        let capabilityName = '';
        let capabilitySystem = '';
        let capabilityComponent = '';

        if (capabilityId) {
          // First, try to find the capability in the same project path as the enabler
          const capabilitiesInSameProject = allItems.filter(item =>
            item.type === 'capability' &&
            item.projectPath === enabler.projectPath &&
            path.basename(item.path || '').endsWith('-capability.md')
          );

          // Search capabilities in the same project path first
          for (const capability of capabilitiesInSameProject) {
            try {
              const capFilePath = path.join(capability.projectPath, path.basename(capability.path));
              const capContent = await fs.readFile(capFilePath, 'utf8');
              const capId = extractId(capContent);

              if (capId === capabilityId) {
                capabilityName = capability.title;
                capabilitySystem = extractSystem(capContent) || '';
                capabilityComponent = extractComponent(capContent) || '';
                break;
              }
            } catch (error) {
              console.warn(`Could not read capability file for ${capabilityId}:`, error);
            }
          }

          // If we didn't find the capability in the same project, warn about cross-project reference
          if (!capabilityName) {
            for (const cap of allItems.filter(item => item.type === 'capability')) {
              try {
                const capFilePath = path.join(cap.projectPath, path.basename(cap.path));
                const capContent = await fs.readFile(capFilePath, 'utf8');
                const capId = extractId(capContent);

                if (capId === capabilityId) {
                  console.warn(`[ENABLER-LINKS] Enabler ${extractId(content)} references capability ${capabilityId} from different project path:`, {
                    enablerProjectPath: enabler.projectPath,
                    capabilityProjectPath: cap.projectPath
                  });
                  // Still include it for backwards compatibility, but mark it
                  capabilityName = `${cap.title} (Different Project)`;
                  capabilitySystem = extractSystem(capContent) || '';
                  capabilityComponent = extractComponent(capContent) || '';
                  break;
                }
              } catch (error) {
                // Continue searching
              }
            }
          }
        }

        return {
          id: extractId(content),
          name: enabler.title,
          path: enabler.path,
          capabilityId,
          capabilityName,
          capabilitySystem,
          capabilityComponent
        };
      })
    );

    res.json(enablersWithIds);
  } catch (error) {
    console.error('[ENABLERS] Error loading enablers for links:', error);
    res.status(500).json({ error: error.message });
  }
});

// Note: extractId function is already defined earlier in the file

// Update bi-directional dependencies when a capability is saved
async function updateBidirectionalDependencies(capabilityId, upstreamDeps, downstreamDeps) {
  try {
    const configPaths = getConfigPaths(config);
    const allItems = await scanProjectPaths(configPaths.projectPaths);
    const capabilities = allItems.filter(item => item.type === 'capability');

    // Process each capability to update their dependencies
    for (const cap of capabilities) {
      let fullPath;
      if (cap.fullPath) {
        // Use the fullPath if it's already available
        fullPath = cap.fullPath;
      } else {
        // Construct path from projectPath and relative path
        fullPath = path.join(cap.projectPath, path.basename(cap.path));
      }

      if (!await fs.pathExists(fullPath)) {
        continue;
      }
      
      let content = await fs.readFile(fullPath, 'utf8');
      const targetCapId = extractId(content);
      
      if (!targetCapId) continue;
      
      let needsUpdate = false;
      let lines = content.split('\n');
      
      // Find the internal upstream and downstream sections
      let upstreamStart = -1, upstreamEnd = -1;
      let downstreamStart = -1, downstreamEnd = -1;
      
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes('### Internal Upstream Dependency')) {
          upstreamStart = i;
        } else if (lines[i].includes('### Internal Downstream Impact')) {
          if (upstreamStart !== -1 && upstreamEnd === -1) {
            upstreamEnd = i;
          }
          downstreamStart = i;
        } else if (upstreamStart !== -1 && upstreamEnd === -1 && lines[i].startsWith('### ')) {
          upstreamEnd = i;
        } else if (downstreamStart !== -1 && downstreamEnd === -1 && lines[i].startsWith('### ')) {
          downstreamEnd = i;
        }
      }
      
      if (upstreamEnd === -1) upstreamEnd = lines.length;
      if (downstreamEnd === -1) downstreamEnd = lines.length;
      
      // Check if this capability is in our downstream list (they should have upstream dependency to us)
      const shouldHaveUpstream = downstreamDeps.some(dep => dep.id === targetCapId);
      
      // Check if this capability is in our upstream list (they should have downstream dependency to us)  
      const shouldHaveDownstream = upstreamDeps.some(dep => dep.id === targetCapId);
      
      if (shouldHaveUpstream) {
        // Add upstream dependency pointing to capabilityId
        let hasUpstreamDep = false;
        for (let i = upstreamStart + 1; i < upstreamEnd; i++) {
          if (lines[i].includes(`| ${capabilityId} |`)) {
            hasUpstreamDep = true;
            break;
          }
        }
        
        if (!hasUpstreamDep) {
          // Find the table and add a row
          let tableEnd = upstreamStart + 3; // Skip header rows
          while (tableEnd < upstreamEnd && lines[tableEnd].includes('|')) {
            tableEnd++;
          }
          
          const depFromDownstream = downstreamDeps.find(dep => dep.id === targetCapId);
          const newRow = `| ${capabilityId} | ${depFromDownstream?.description || 'Auto-generated reverse dependency'} |`;
          lines.splice(tableEnd, 0, newRow);
          needsUpdate = true;
        }
      } else {
        // Remove upstream dependency to capabilityId if it exists
        for (let i = upstreamStart + 1; i < upstreamEnd; i++) {
          if (lines[i].includes(`| ${capabilityId} |`)) {
            lines.splice(i, 1);
            needsUpdate = true;
            break;
          }
        }
      }
      
      if (shouldHaveDownstream) {
        // Add downstream dependency pointing to capabilityId
        let hasDownstreamDep = false;
        for (let i = downstreamStart + 1; i < downstreamEnd; i++) {
          if (lines[i].includes(`| ${capabilityId} |`)) {
            hasDownstreamDep = true;
            break;
          }
        }
        
        if (!hasDownstreamDep) {
          // Find the table and add a row
          let tableEnd = downstreamStart + 3; // Skip header rows
          while (tableEnd < downstreamEnd && lines[tableEnd].includes('|')) {
            tableEnd++;
          }
          
          const depFromUpstream = upstreamDeps.find(dep => dep.id === targetCapId);
          const newRow = `| ${capabilityId} | ${depFromUpstream?.description || 'Auto-generated reverse dependency'} |`;
          lines.splice(tableEnd, 0, newRow);
          needsUpdate = true;
        }
      } else {
        // Remove downstream dependency to capabilityId if it exists
        for (let i = downstreamStart + 1; i < downstreamEnd; i++) {
          if (lines[i].includes(`| ${capabilityId} |`)) {
            lines.splice(i, 1);
            needsUpdate = true;
            break;
          }
        }
      }
      
      if (needsUpdate) {
        await fs.writeFile(fullPath, lines.join('\n'), 'utf8');
        console.log(`[BI-DIRECTIONAL] Updated dependencies for capability ${targetCapId}`);
      }
    }
  } catch (error) {
    console.error('[BI-DIRECTIONAL] Error updating dependencies:', error);
  }
}

// API endpoint for saving capability with bi-directional dependency updates
app.post('/api/capability-with-dependencies/*', async (req, res) => {
  try {
    const filePath = req.params[0];
    const { content, capabilityId, upstreamDeps, downstreamDeps } = req.body;
    
    console.log('[BI-DIRECTIONAL] Saving capability with bi-directional dependencies:', capabilityId);
    
    // First save the main file
    const configPaths = getConfigPaths(config);
    let cleanFilePath = filePath;
    if (filePath.startsWith('examples/')) {
      cleanFilePath = filePath.replace('examples/', '');
    } else if (filePath.startsWith('specifications/')) {
      cleanFilePath = filePath.replace('specifications/', '');
    }

    // Try to find existing file or use first project path for new files
    const fileLocation = await findFileInProjectPaths(cleanFilePath, configPaths.projectPaths);
    let fullPath, projectRoot;
    if (fileLocation) {
      fullPath = fileLocation.fullPath;
      projectRoot = fileLocation.projectRoot;
    } else {
      const firstProjectPath = path.resolve(configPaths.projectPaths[0]);
      fullPath = path.join(firstProjectPath, cleanFilePath);
      projectRoot = firstProjectPath;
    }
    let resolvedPath;
    try {
      if (fileLocation) {
        // File was found by findFileInProjectPaths - it's already validated to be in an allowed project path
        resolvedPath = fileLocation.fullPath
      } else {
        // New file - validate against project root
        resolvedPath = validateAndResolvePath(cleanFilePath, projectRoot, 'capability path')
      }
      
      // Additional file type validation
      if (!resolvedPath.endsWith('.md')) {
        throw new Error('Only .md files can be saved as capabilities')
      }
    } catch (securityError) {
      console.error('[BI-DIRECTIONAL] Security validation failed:', securityError.message);
      return res.status(403).json({ error: 'Access denied: ' + securityError.message });
    }
    
    
    await fs.writeFile(resolvedPath, content, 'utf8');
    console.log('[BI-DIRECTIONAL] Main capability file saved:', resolvedPath);
    
    // Update bi-directional dependencies
    await updateBidirectionalDependencies(capabilityId, upstreamDeps || [], downstreamDeps || []);
    
    const title = extractTitle(content);
    res.json({
      success: true,
      title
    });
  } catch (error) {
    console.error('[BI-DIRECTIONAL] Error saving capability with dependencies:', error);
    res.status(500).json({ error: 'Error saving capability: ' + error.message });
  }
});

// API endpoint for saving capability with bi-directional dependencies AND enabler file creation
app.post('/api/capability-with-enablers/*', async (req, res) => {
  try {
    const filePath = req.params[0];
    const { content, capabilityId, upstreamDeps, downstreamDeps, enablers } = req.body;

    console.log('[CAPABILITY-ENABLERS] Saving capability with enablers:', capabilityId, `Found ${enablers.length} enablers`);

    // First save the main capability file
    const configPaths = getConfigPaths(config);

    console.log('[CAPABILITY-ENABLERS] Processing filePath:', filePath);

    // Check if this capability already exists somewhere else (path change detection)
    let existingCapabilityPath = null;
    if (capabilityId) {
      existingCapabilityPath = await findCapabilityDirectory(capabilityId);
      if (existingCapabilityPath) {
        // Find the exact capability file
        const files = await fs.readdir(existingCapabilityPath);
        for (const file of files) {
          if (file.endsWith('-capability.md')) {
            const existingFilePath = path.join(existingCapabilityPath, file);
            const existingContent = await fs.readFile(existingFilePath, 'utf8');
            if (existingContent.includes(`**ID**: ${capabilityId}`)) {
              existingCapabilityPath = existingFilePath;
              break;
            }
          }
        }
      }
    }

    let fullPath, projectRoot;
    let fileLocation = null;

    // Check if the filePath contains a specific workspace path
    const matchingProjectPath = configPaths.projectPaths.find(projectPath => {
      // Normalize both paths for comparison (handle ./, .\, / and \ separators)
      const normalizedProjectPath = path.normalize(projectPath).replace(/^\.[\\/]/, '').replace(/\\/g, '/');
      const normalizedFilePath = filePath.replace(/\\/g, '/');

      return normalizedFilePath.startsWith(normalizedProjectPath + '/') ||
             normalizedFilePath.startsWith(normalizedProjectPath);
    });

    if (matchingProjectPath) {
      // User selected a specific path - use it directly
      projectRoot = path.resolve(matchingProjectPath);

      // Extract the relative path after the project path
      const normalizedProjectPath = path.normalize(matchingProjectPath).replace(/^\.[\\/]/, '').replace(/\\/g, '/');
      const normalizedFilePath = filePath.replace(/\\/g, '/');

      let relativePath;
      if (normalizedFilePath.startsWith(normalizedProjectPath + '/')) {
        relativePath = normalizedFilePath.substring(normalizedProjectPath.length + 1);
      } else if (normalizedFilePath.startsWith(normalizedProjectPath)) {
        relativePath = normalizedFilePath.substring(normalizedProjectPath.length);
        if (relativePath.startsWith('/')) relativePath = relativePath.substring(1);
      } else {
        relativePath = path.basename(filePath); // fallback to just filename
      }

      fullPath = path.join(projectRoot, relativePath);
      console.log('[CAPABILITY-ENABLERS] Using selected path:', {
        matchingProjectPath,
        normalizedProjectPath,
        normalizedFilePath,
        projectRoot,
        relativePath,
        fullPath
      });
    } else {
      // Legacy behavior - clean the path and search for existing files
      let cleanFilePath = filePath;
      if (filePath.startsWith('examples/')) {
        cleanFilePath = filePath.replace('examples/', '');
      } else if (filePath.startsWith('specifications/')) {
        cleanFilePath = filePath.replace('specifications/', '');
      }

      // Try to find existing file or use first project path for new files
      fileLocation = await findFileInProjectPaths(cleanFilePath, configPaths.projectPaths);
      if (fileLocation) {
        fullPath = fileLocation.fullPath;
        projectRoot = fileLocation.projectRoot;
      } else {
        const firstProjectPath = path.resolve(configPaths.projectPaths[0]);
        fullPath = path.join(firstProjectPath, cleanFilePath);
        projectRoot = firstProjectPath;
      }
      console.log('[CAPABILITY-ENABLERS] Using legacy path resolution:', { cleanFilePath, fullPath, projectRoot });
    }

    let resolvedPath = path.resolve(fullPath);

    try {
      if (fileLocation) {
        // File was found by findFileInProjectPaths - it's already validated to be in an allowed project path
        resolvedPath = fileLocation.fullPath
      } else {
        // New file - validate against project root
        const relativePath = path.relative(projectRoot, fullPath);
        resolvedPath = validateAndResolvePath(relativePath, projectRoot, 'capability-enablers path')
      }

      if (!resolvedPath.endsWith('.md')) {
        throw new Error('Only .md files can be saved as capabilities with enablers')
      }
    } catch (securityError) {
      console.error('[CAPABILITY-ENABLERS] Security validation failed:', securityError.message);
      return res.status(403).json({ error: 'Access denied: ' + securityError.message });
    }

    // Check if this is a path change (existing capability being moved to new location)
    const isPathChange = existingCapabilityPath &&
                        path.resolve(existingCapabilityPath) !== path.resolve(resolvedPath);

    if (isPathChange) {
      console.log('[CAPABILITY-ENABLERS] Path change detected - moving capability and enablers');
      console.log('[CAPABILITY-ENABLERS] From:', existingCapabilityPath);
      console.log('[CAPABILITY-ENABLERS] To:', resolvedPath);

      // Ensure the target directory exists
      await fs.ensureDir(path.dirname(resolvedPath));

      // Move the capability file
      if (await fs.pathExists(existingCapabilityPath)) {
        await fs.move(existingCapabilityPath, resolvedPath);
        console.log('[CAPABILITY-ENABLERS] Moved capability file');
      }

      // Find and move all associated enabler files
      const oldDirectory = path.dirname(existingCapabilityPath);
      const newDirectory = path.dirname(resolvedPath);

      if (enablers && enablers.length > 0) {
        for (const enabler of enablers) {
          if (enabler.id && enabler.id !== 'ENB-XXXXXX') {
            const enablerFileName = `${enabler.id.replace(/^(CAP|ENB)-/i, '')}-enabler.md`;
            const oldEnablerPath = path.join(oldDirectory, enablerFileName);
            const newEnablerPath = path.join(newDirectory, enablerFileName);

            if (await fs.pathExists(oldEnablerPath) &&
                path.resolve(oldEnablerPath) !== path.resolve(newEnablerPath)) {
              try {
                await fs.move(oldEnablerPath, newEnablerPath);
                console.log('[CAPABILITY-ENABLERS] Moved enabler file:', enablerFileName);
              } catch (moveError) {
                console.error('[CAPABILITY-ENABLERS] Failed to move enabler file:', enablerFileName, moveError.message);
              }
            }
          }
        }
      }

      // Write the updated content to the new location
      await fs.writeFile(resolvedPath, content, 'utf8');
      console.log('[CAPABILITY-ENABLERS] Updated capability file content at new location');
    } else {
      // Normal save operation
      await fs.writeFile(resolvedPath, content, 'utf8');
      console.log('[CAPABILITY-ENABLERS] Main capability file saved:', resolvedPath);
    }

    // Update bi-directional dependencies
    await updateBidirectionalDependencies(capabilityId, upstreamDeps || [], downstreamDeps || []);

    // Create/update enabler files for each enabler with content
    if (enablers && enablers.length > 0) {
      for (const enabler of enablers) {
        // Skip enablers with placeholder IDs
        if (enabler.id && enabler.name && enabler.id !== 'ENB-XXXXXX') {
          await createEnablerFile(enabler, capabilityId);
        } else if (enabler.id === 'ENB-XXXXXX') {
          console.log('[CAPABILITY-ENABLERS] Skipping enabler creation - placeholder ID detected:', enabler.id);
        }
      }
    }

    const title = extractTitle(content);
    res.json({
      success: true,
      title,
      enablersCreated: enablers.filter(e => e.id && e.name && e.id !== 'ENB-XXXXXX').length,
      pathChanged: isPathChange
    });
  } catch (error) {
    console.error('[CAPABILITY-ENABLERS] Error saving capability with enablers:', error);
    res.status(500).json({ error: 'Error saving capability: ' + error.message });
  }
});

// Enhanced enabler save with reparenting logic
app.post('/api/enabler-with-reparenting/*', async (req, res) => {
  try {
    const filePath = req.params[0];
    const { content, enablerData, originalCapabilityId } = req.body;
    
    console.log('[ENABLER-REPARENTING] Saving enabler with reparenting logic:', enablerData.id);
    console.log('[ENABLER-REPARENTING] Original capability:', originalCapabilityId);
    console.log('[ENABLER-REPARENTING] New capability:', enablerData.capabilityId);
    
    // First save the enabler file (standard save)
    const configPaths = getConfigPaths(config);
    let cleanFilePath = filePath;
    if (filePath.startsWith('examples/')) {
      cleanFilePath = filePath.replace('examples/', '');
    } else if (filePath.startsWith('specifications/')) {
      cleanFilePath = filePath.replace('specifications/', '');
    }

    // Try to find existing file or determine save location based on capability
    const fileLocation = await findFileInProjectPaths(cleanFilePath, configPaths.projectPaths);
    let fullPath, projectRoot;

    if (fileLocation) {
      // Existing file - use its current location
      fullPath = fileLocation.fullPath;
      projectRoot = fileLocation.projectRoot;
    } else if (enablerData.capabilityId) {
      // New enabler with capability ID - find capability directory
      const capabilityDir = await findCapabilityDirectory(enablerData.capabilityId);
      if (capabilityDir) {
        console.log(`[ENABLER-REPARENTING] Using capability directory: ${capabilityDir}`);
        fullPath = path.join(capabilityDir, cleanFilePath);
        projectRoot = capabilityDir;
      } else {
        console.warn(`[ENABLER-REPARENTING] Capability directory not found for ${enablerData.capabilityId}, using default path`);
        const firstProjectPath = path.resolve(configPaths.projectPaths[0]);
        fullPath = path.join(firstProjectPath, cleanFilePath);
        projectRoot = firstProjectPath;
      }
    } else {
      // New enabler without capability ID - use default path
      const firstProjectPath = path.resolve(configPaths.projectPaths[0]);
      fullPath = path.join(firstProjectPath, cleanFilePath);
      projectRoot = firstProjectPath;
    }
    let resolvedPath = path.resolve(fullPath);

    try {
      if (fileLocation) {
        // File was found by findFileInProjectPaths - it's already validated to be in an allowed project path
        resolvedPath = fileLocation.fullPath
      } else {
        // New file - validate against project root
        resolvedPath = validateAndResolvePath(cleanFilePath, projectRoot, 'capability-enablers path')
      }
      
      if (!resolvedPath.endsWith('.md')) {
        throw new Error('Only .md files can be saved as capabilities with enablers')
      }
    } catch (securityError) {
      console.error('[CAPABILITY-ENABLERS] Security validation failed:', securityError.message);
      return res.status(403).json({ error: 'Access denied: ' + securityError.message });
    }
    
    
    // Save the enabler file
    await fs.writeFile(resolvedPath, content, 'utf8');
    console.log('[ENABLER-REPARENTING] Enabler file saved:', resolvedPath);

    // Handle reparenting/parenting if capability ID changed or assigned for first time
    if (enablerData.capabilityId && (!originalCapabilityId || originalCapabilityId !== enablerData.capabilityId)) {
      console.log('[ENABLER-REPARENTING] Capability assignment detected - updating capability enabler lists');
      console.log(`[ENABLER-REPARENTING] Original: ${originalCapabilityId || 'null'} -> New: ${enablerData.capabilityId}`);

      // Handle file move for reparenting (not initial parenting)
      if (originalCapabilityId && originalCapabilityId !== enablerData.capabilityId) {
        const newCapabilityDir = await findCapabilityDirectory(enablerData.capabilityId);
        if (newCapabilityDir) {
          const fileName = path.basename(resolvedPath);
          const newPath = path.join(newCapabilityDir, fileName);

          if (path.resolve(newPath) !== path.resolve(resolvedPath)) {
            console.log(`[ENABLER-REPARENTING] Moving enabler from ${resolvedPath} to ${newPath}`);
            try {
              await fs.move(resolvedPath, newPath);
              console.log('[ENABLER-REPARENTING] Enabler file moved successfully');
            } catch (moveError) {
              console.error('[ENABLER-REPARENTING] Failed to move enabler file:', moveError.message);
              // Continue with capability updates even if file move fails
            }
          }
        }
      }

      await handleEnablerReparenting(enablerData.id, enablerData.name, originalCapabilityId, enablerData.capabilityId, enablerData.description);
    } else if (enablerData.capabilityId) {
      // Not reparenting - just update enabler fields in the existing capability table
      await updateCapabilityEnablerFields(enablerData, enablerData.capabilityId);
    }

    const title = extractTitle(content);
    res.json({
      success: true,
      title,
      reparented: originalCapabilityId && enablerData.capabilityId && originalCapabilityId !== enablerData.capabilityId
    });
  } catch (error) {
    console.error('[ENABLER-REPARENTING] Error saving enabler with reparenting:', error);
    res.status(500).json({ error: 'Error saving enabler: ' + error.message });
  }
});

async function createEnablerFile(enabler, capabilityId) {
  try {
    // Use ID for filename to ensure uniqueness
    const enablerFileName = enabler.id ?
      `${enabler.id.replace(/^(CAP|ENB)-/i, '')}-enabler.md` :
      `${enabler.name.toLowerCase().replace(/[^a-z0-9-]/g, '-')}-enabler.md`;

    // Try to find capability directory first
    let enablerPath;
    if (capabilityId) {
      const capabilityDir = await findCapabilityDirectory(capabilityId);
      if (capabilityDir) {
        console.log(`[ENABLER-CREATE] Using capability directory: ${capabilityDir}`);
        enablerPath = path.join(capabilityDir, enablerFileName);
      } else {
        console.warn(`[ENABLER-CREATE] Capability directory not found for ${capabilityId}, using default path`);
        const configPaths = getConfigPaths(config);
        const firstProjectPath = path.resolve(configPaths.projectPaths[0]);
        enablerPath = path.join(firstProjectPath, enablerFileName);
      }
    } else {
      // No capability ID, use default path
      const configPaths = getConfigPaths(config);
      const firstProjectPath = path.resolve(configPaths.projectPaths[0]);
      enablerPath = path.join(firstProjectPath, enablerFileName);
    }

    // Check if enabler file already exists
    if (await fs.pathExists(enablerPath)) {
      console.log('[ENABLER-UPDATE] Enabler file exists, updating metadata:', enablerFileName);
      await updateEnablerMetadata(enablerPath, enabler, capabilityId);
      return;
    }

    // Load enabler template and customize it
    const enablerContent = await generateEnablerContentFromTemplate(enabler, capabilityId);
    await fs.writeFile(enablerPath, enablerContent, 'utf8');
    console.log('[ENABLER-CREATE] Created enabler file:', enablerFileName);
  } catch (error) {
    console.error('[ENABLER-CREATE] Error creating enabler file for', enabler.id, ':', error);
  }
}

async function updateEnablerMetadata(enablerPath, enabler, capabilityId) {
  try {
    // Read the existing enabler file
    const existingContent = await fs.readFile(enablerPath, 'utf8');
    
    // Update metadata fields in the existing content
    let updatedContent = existingContent;
    
    // Update name if provided (and update title too)
    if (enabler.name) {
      updatedContent = updatedContent.replace(
        /^-\s*\*\*Name\*\*:\s*(.+)$/m,
        `- **Name**: ${enabler.name}`
      );
      // Also update the title header
      updatedContent = updatedContent.replace(
        /^# .+$/m,
        `# ${enabler.name}`
      );
    }
    
    // Update status if provided
    if (enabler.status) {
      updatedContent = updatedContent.replace(
        /^-\s*\*\*Status\*\*:\s*(.+)$/m,
        `- **Status**: ${enabler.status}`
      );
    }
    
    // Update approval if provided
    if (enabler.approval) {
      updatedContent = updatedContent.replace(
        /^-\s*\*\*Approval\*\*:\s*(.+)$/m,
        `- **Approval**: ${enabler.approval}`
      );
    }
    
    // Update priority if provided
    if (enabler.priority) {
      updatedContent = updatedContent.replace(
        /^-\s*\*\*Priority\*\*:\s*(.+)$/m,
        `- **Priority**: ${enabler.priority}`
      );
    }
    
    // Update capability ID if provided
    if (capabilityId) {
      updatedContent = updatedContent.replace(
        /^-\s*\*\*Capability ID\*\*:\s*(.+)$/m,
        `- **Capability ID**: ${capabilityId}`
      );
    }
    
    // Write the updated content back to the file
    await fs.writeFile(enablerPath, updatedContent, 'utf8');
    console.log('[ENABLER-UPDATE] Updated metadata for:', enablerPath);
    
    // Update all enabler fields in the parent capability's enabler table
    if (capabilityId) {
      await updateCapabilityEnablerFields(enabler, capabilityId);
    }
  } catch (error) {
    console.error('[ENABLER-UPDATE] Error updating enabler metadata:', error);
  }
}

async function updateCapabilityEnablerFields(enablerData, capabilityId) {
  try {
    const configPaths = getConfigPaths(config);
    
    // Find the capability file by searching for the capability ID in the content across all project paths
    let capabilityFile = null;

    for (const projectPath of configPaths.projectPaths) {
      const resolvedPath = path.resolve(projectPath);
      if (!await fs.pathExists(resolvedPath)) {
        continue;
      }

      const files = await fs.readdir(resolvedPath);
      for (const file of files) {
        if (file.endsWith('-capability.md')) {
          const filePath = path.join(resolvedPath, file);
          const content = await fs.readFile(filePath, 'utf8');
          if (content.includes(`**ID**: ${capabilityId}`)) {
            capabilityFile = filePath;
            console.log('[CAPABILITY-SYNC] Found capability file:', file);
            break;
          }
        }
      }
      if (capabilityFile) break;
    }
    
    if (!capabilityFile) {
      console.log('[CAPABILITY-SYNC] Capability file not found for ID:', capabilityId);
      return;
    }
    
    // Read the capability file
    let capabilityContent = await fs.readFile(capabilityFile, 'utf8');
    
    // Find and update the enabler row in the enabler table
    // Look for the enabler row by ID and update all columns
    const enablerRowRegex = new RegExp(`^\\|\\s*${enablerData.id}\\s*\\|([^\\n]+)`, 'gm');
    
    const match = enablerRowRegex.exec(capabilityContent);
    if (match) {
      // Build the new row with only ID and description (2 columns only)
      const newRow = `| ${enablerData.id} | ${enablerData.description || enablerData.name || ''} |`;
      
      capabilityContent = capabilityContent.replace(enablerRowRegex, newRow);
      
      // Write the updated content back
      await fs.writeFile(capabilityFile, capabilityContent, 'utf8');
      console.log('[CAPABILITY-SYNC] Updated enabler fields in capability:', path.basename(capabilityFile));
      console.log('[CAPABILITY-SYNC] Updated enabler:', enablerData.id, 'with fields:', {
        name: enablerData.name,
        status: enablerData.status,
        approval: enablerData.approval,
        priority: enablerData.priority
      });

      // Broadcast file change for the capability file to trigger client refresh
      broadcastFileChange('change', capabilityFile);
      console.log('[CAPABILITY-SYNC] Broadcasted capability file change:', path.basename(capabilityFile));
    } else {
      console.log('[CAPABILITY-SYNC] Enabler row not found:', enablerData.id);
    }
  } catch (error) {
    console.error('[CAPABILITY-SYNC] Error updating capability enabler fields:', error);
  }
}

async function findCapabilityDirectory(capabilityId) {
  try {
    const configPaths = getConfigPaths(config);

    // Find the capability file by searching for the capability ID in the content across all project paths
    for (const projectPath of configPaths.projectPaths) {
      const resolvedPath = path.resolve(projectPath);
      if (!await fs.pathExists(resolvedPath)) {
        continue;
      }

      const files = await fs.readdir(resolvedPath);
      for (const file of files) {
        if (file.endsWith('-capability.md')) {
          const filePath = path.join(resolvedPath, file);
          const content = await fs.readFile(filePath, 'utf8');
          if (content.includes(`**ID**: ${capabilityId}`)) {
            console.log('[CAPABILITY-DIRECTORY] Found capability directory:', resolvedPath);
            return resolvedPath;
          }
        }
      }
    }

    console.log('[CAPABILITY-DIRECTORY] Capability directory not found for ID:', capabilityId);
    return null;
  } catch (error) {
    console.error('[CAPABILITY-DIRECTORY] Error finding capability directory:', error);
    return null;
  }
}

async function extractEnablerTemplateFromSoftwarePlan() {
  try {
    console.log('[ENABLER-TEMPLATE] Starting template extraction from SOFTWARE_DEVELOPMENT_PLAN.md');

    // ALWAYS use the SOFTWARE_DEVELOPMENT_PLAN.md file relative to server working directory
    const swPlanPath = path.join(process.cwd(), 'SOFTWARE_DEVELOPMENT_PLAN.md');
    console.log('[ENABLER-TEMPLATE] Using SOFTWARE_DEVELOPMENT_PLAN.md file relative to server:', swPlanPath);

    if (await fs.pathExists(swPlanPath)) {
      const swPlanContent = await fs.readFile(swPlanPath, 'utf8');

      const enablerTemplateStart = swPlanContent.indexOf('### Enabler Template Structure:');
      if (enablerTemplateStart !== -1) {
        const startMarker = swPlanContent.indexOf('<!-- START ENABLER TEMPLATE -->', enablerTemplateStart);
        if (startMarker !== -1) {
          const endMarker = swPlanContent.indexOf('<!-- END ENABLER TEMPLATE -->', startMarker);
          if (endMarker !== -1) {
            const templateStart = swPlanContent.indexOf('\n', startMarker) + 1;
            const templateEnd = endMarker;
            const templateContent = swPlanContent.substring(templateStart, templateEnd);
            console.log('[ENABLER-TEMPLATE] Successfully extracted template from SOFTWARE_DEVELOPMENT_PLAN.md');
            return templateContent;
          }
        }
      }
    }

    console.warn('[ENABLER-TEMPLATE] SOFTWARE_DEVELOPMENT_PLAN.md not found or does not contain enabler template');
    throw new Error('SOFTWARE_DEVELOPMENT_PLAN.md not found or does not contain enabler template');

  } catch (error) {
    console.error('[ENABLER-TEMPLATE] Error extracting template from SOFTWARE_DEVELOPMENT_PLAN.md:', error);
    throw error;
  }
}

async function extractCapabilityTemplateFromSoftwarePlan() {
  try {
    // ALWAYS use the SOFTWARE_DEVELOPMENT_PLAN.md file relative to server working directory
    const swPlanPath = path.join(process.cwd(), 'SOFTWARE_DEVELOPMENT_PLAN.md');
    console.log('[CAPABILITY-TEMPLATE] Using SOFTWARE_DEVELOPMENT_PLAN.md file relative to server:', swPlanPath);

    if (await fs.pathExists(swPlanPath)) {
      const swPlanContent = await fs.readFile(swPlanPath, 'utf8');

      const capabilityTemplateStart = swPlanContent.indexOf('### Capability Template Structure:');
      if (capabilityTemplateStart !== -1) {
        const startMarker = swPlanContent.indexOf('<!-- START CAPABILITY TEMPLATE -->', capabilityTemplateStart);
        if (startMarker !== -1) {
          const endMarker = swPlanContent.indexOf('<!-- END CAPABILITY TEMPLATE -->', startMarker);
          if (endMarker !== -1) {
            const templateStart = swPlanContent.indexOf('\n', startMarker) + 1;
            const templateEnd = endMarker;
            const templateContent = swPlanContent.substring(templateStart, templateEnd);
            console.log('[CAPABILITY-TEMPLATE] Successfully extracted template from SOFTWARE_DEVELOPMENT_PLAN.md');
            return templateContent;
          }
        }
      }
    }

    throw new Error('SOFTWARE_DEVELOPMENT_PLAN.md not found or does not contain capability template');

  } catch (error) {
    console.error('[CAPABILITY-TEMPLATE] Error extracting template from SOFTWARE_DEVELOPMENT_PLAN.md:', error);
    throw error;
  }
}

async function generateCapabilityContentFromTemplate(capability) {
  try {
    // Extract the capability template from SOFTWARE_DEVELOPMENT_PLAN.md
    let templateContent = await extractCapabilityTemplateFromSoftwarePlan();
    console.log('[CAPABILITY-TEMPLATE] Template extracted from SOFTWARE_DEVELOPMENT_PLAN.md, length:', templateContent.length, 'chars');

    const currentDate = new Date().toISOString().split('T')[0];

    // Define replacement map for safer template processing
    const replacements = {
      // Basic placeholders
      '\\[Capability Name\\]': capability.name || '[Capability Name]',
      'CAP-XXXXXX': capability.id || 'CAP-XXXXXX',
      'YYYY-MM-DD': currentDate,
      'X\\.Y': '1.0',
      '\\[Clear business value statement explaining what business problem this solves\\]': capability.description || '[Clear business value statement explaining what business problem this solves]',

      // Title replacement
      '^# \\[Capability Name\\]': `# ${capability.name || '[Capability Name]'}`,

      // Metadata section replacements
      '- \\*\\*Name\\*\\*: \\[Business Function Name\\]': `- **Name**: ${capability.name || '[Business Function Name]'}`,
      '- \\*\\*ID\\*\\*: CAP-XXXXXX': `- **ID**: ${capability.id || 'CAP-XXXXXX'}`,
      '- \\*\\*Status\\*\\*: \\[Current State\\]': `- **Status**: ${capability.status || 'In Draft'}`,
      '- \\*\\*Approval\\*\\*: Not Approved': `- **Approval**: ${capability.approval || 'Not Approved'}`,
      '- \\*\\*Priority\\*\\*: \\[High/Medium/Low\\]': `- **Priority**: ${capability.priority || 'High'}`,
      '- \\*\\*Analysis Review\\*\\*: \\[Required/Not Required\\]': `- **Analysis Review**: ${config.defaults?.analysisReview || 'Required'}`,
      '- \\*\\*Owner\\*\\*: \\[Team/Person\\]': `- **Owner**: ${config.defaults?.owner || 'Product Team'}`,
      '- \\*\\*Created Date\\*\\*: YYYY-MM-DD': `- **Created Date**: ${currentDate}`,
      '- \\*\\*Last Updated\\*\\*: YYYY-MM-DD': `- **Last Updated**: ${currentDate}`,
      '- \\*\\*Version\\*\\*: X\\.Y': `- **Version**: ${version.version}`
    }

    // Apply replacements with validation
    try {
      for (const [pattern, replacement] of Object.entries(replacements)) {
        const regex = new RegExp(pattern, pattern.startsWith('^') ? 'm' : 'g')
        templateContent = templateContent.replace(regex, replacement)
      }

      // Validate that critical fields were replaced
      if (capability.name && templateContent.includes('[Capability Name]')) {
        console.warn('[TEMPLATE] Warning: Some [Capability Name] placeholders may not have been replaced')
      }
      if (capability.id && templateContent.includes('CAP-XXXXXX')) {
        console.warn('[TEMPLATE] Warning: Some CAP-XXXXXX placeholders may not have been replaced')
      }
    } catch (replacementError) {
      console.error('[TEMPLATE] Error during template replacement:', replacementError)
      // Continue with partially replaced template rather than failing completely
    }

    console.log('[CAPABILITY-TEMPLATE] Template generation completed successfully')
    return templateContent;

  } catch (error) {
    console.error('[CAPABILITY-TEMPLATE] Error generating template:', error);
    // Fallback to a basic template if SOFTWARE_DEVELOPMENT_PLAN.md template extraction fails
    const currentDate = new Date().toISOString().split('T')[0];
    return `# ${capability.name || '[Capability Name]'}

## Metadata
- **Name**: ${capability.name || '[Business Function Name]'}
- **Type**: Capability
- **System**: [System Name]
- **Component**: [Component Name]
- **ID**: ${capability.id || 'CAP-XXXXXX'}
- **Owner**: ${config.defaults?.owner || 'Product Team'}
- **Status**: ${capability.status || 'In Draft'}
- **Approval**: ${capability.approval || 'Not Approved'}
- **Priority**: ${capability.priority || 'High'}
- **Analysis Review**: ${config.defaults?.analysisReview || 'Required'}

## Purpose
${capability.description || '[Clear business value statement explaining what business problem this solves]'}

## Technical Specifications (Template)

### Capability Dependency Flow Diagram
[Diagram showing capability relationships]

## Enablers
| ID | Name | Status | Priority |
|----|------|--------|----------|
| ENB-XXXXXX | [Enabler Name] | [Status] | [Priority] |

## Dependencies
[List other capabilities this depends on]

## Success Criteria
[Measurable criteria for determining when this capability is successfully implemented]

## Risks and Assumptions
[Key risks and assumptions for this capability]`;
  }
}

async function generateEnablerContentFromTemplate(enabler, capabilityId) {
  try {
    // Extract the enabler template from SOFTWARE_DEVELOPMENT_PLAN.md
    let templateContent = await extractEnablerTemplateFromSoftwarePlan();
    console.log('[ENABLER-TEMPLATE] Template extracted from SOFTWARE_DEVELOPMENT_PLAN.md, length:', templateContent.length, 'chars');
    
    const currentDate = new Date().toISOString().split('T')[0];
    
    // Define replacement map for safer template processing
    const replacements = {
      // Basic placeholders
      '\\[Enabler Name\\]': enabler.name || '[Enabler Name]',
      'ENB-XXXXXX': enabler.id || 'ENB-XXXXXX',
      'CAP-XXXXXX': capabilityId || 'CAP-XXXXXX',
      'YYYY-MM-DD': currentDate,
      'X\\.Y': '1.0',
      '\\[What is the purpose\\?\\]': enabler.description || '[What is the purpose?]',
      
      // Title replacement
      '^# \\[Enabler Name\\]': `# ${enabler.name || '[Enabler Name]'}`,
      
      // Metadata section replacements
      '- \\*\\*Name\\*\\*: \\[Enabler Name\\]': `- **Name**: ${enabler.name || '[Enabler Name]'}`,
      '- \\*\\*ID\\*\\*: ENB-XXXXXX': `- **ID**: ${enabler.id || 'ENB-XXXXXX'}`,
      '- \\*\\*Capability ID\\*\\*: CAP-XXXXXX': `- **Capability ID**: ${capabilityId || 'CAP-XXXXXX'}`,
      '- \\*\\*Status\\*\\*: In Draft': `- **Status**: ${enabler.status || 'In Draft'}`,
      '- \\*\\*Approval\\*\\*: Not Approved': `- **Approval**: ${enabler.approval || 'Not Approved'}`,
      '- \\*\\*Priority\\*\\*: High': `- **Priority**: ${enabler.priority || 'High'}`,
      '- \\*\\*Analysis Review\\*\\*: Required': `- **Analysis Review**: ${config.defaults?.analysisReview || 'Required'}`,
      '- \\*\\*Design Review\\*\\*: Required': `- **Design Review**: ${config.defaults?.designReview || 'Required'}`,
      '- \\*\\*Code Review\\*\\*: Not Required': `- **Code Review**: ${config.defaults?.codeReview || 'Not Required'}`,
      '- \\*\\*Created Date\\*\\*: YYYY-MM-DD': `- **Created Date**: ${currentDate}`,
      '- \\*\\*Last Updated\\*\\*: YYYY-MM-DD': `- **Last Updated**: ${currentDate}`,
      '- \\*\\*Version\\*\\*: X\\.Y': `- **Version**: ${version.version}`
    }
    
    // Apply replacements with validation
    try {
      for (const [pattern, replacement] of Object.entries(replacements)) {
        const regex = new RegExp(pattern, pattern.startsWith('^') ? 'm' : 'g')
        templateContent = templateContent.replace(regex, replacement)
      }
      
      // Validate that critical fields were replaced
      if (enabler.name && templateContent.includes('[Enabler Name]')) {
        console.warn('[TEMPLATE] Warning: Some [Enabler Name] placeholders may not have been replaced')
      }
      if (enabler.id && templateContent.includes('ENB-XXXXXX')) {
        console.warn('[TEMPLATE] Warning: Some ENB-XXXXXX placeholders may not have been replaced')
      }
    } catch (replacementError) {
      console.error('[TEMPLATE] Error during template replacement:', replacementError)
      // Continue with partially replaced template rather than failing completely
    }

    // Remove Development Plan section from enabler template
    // (Development Plan should only be in SOFTWARE_DEVELOPMENT_PLAN.md)
    const developmentPlanIndex = templateContent.indexOf('# Development Plan');
    if (developmentPlanIndex !== -1) {
      templateContent = templateContent.substring(0, developmentPlanIndex).trim();
      console.log('[ENABLER-TEMPLATE] Removed Development Plan section from enabler template');
    }

    return templateContent;
    
  } catch (templateErr) {
    console.error('[ENABLER-CREATE] Template loading failed:', templateErr.message);
    console.error('[ENABLER-CREATE] Template error details:', templateErr.stack);
    // Fallback to the old hardcoded content if template loading fails
    return generateEnablerContentFallback(enabler, capabilityId);
  }
}

function generateEnablerContentFallback(enabler, capabilityId) {
  const currentDate = new Date().toISOString().split('T')[0];
  
  return `# ${enabler.name}

## Metadata
- **Name**: ${enabler.name}
- **Type**: Enabler
- **ID**: ${enabler.id}
- **Capability ID**: ${capabilityId}
- **Status**: ${enabler.status || 'Draft'}
- **Approval**: ${enabler.approval || 'Not Approved'}
- **Priority**: ${enabler.priority || 'High'}
- **Owner**: Product Team
- **Developer**: [Development Team/Lead]
- **Created Date**: ${currentDate}
- **Last Updated**: ${currentDate}
- **Version**: ${version.version}

## Technical Overview
### Purpose
${enabler.description || '[What is the purpose?]'}

## Functional Requirements

| ID | Requirement | Priority | Status | Notes |
|----|-------------|----------|--------|-------|
| | | | | |

## Non-Functional Requirements

| Type | Requirement | Target | Measurement | Notes |
|------|-------------|--------|-------------|-------|
| | | | | |

## Technical Specifications

### Enabler Dependency Flow Diagram
\`\`\`mermaid
flowchart TD
    ${enabler.id.replace(/-/g, '_')}["${enabler.id}<br/>${enabler.name}<br/>📡"]
    
    %% Add your dependency flows here
    
    classDef enabler fill:#e3f2fd,stroke:#1976d2,stroke-width:2px
    class ${enabler.id.replace(/-/g, '_')} enabler
\`\`\`

### API Technical Specifications (if applicable)

| API Type | Operation | Channel / Endpoint | Description | Request / Publish Payload | Response / Subscribe Data |
|----------|-----------|---------------------|-------------|----------------------------|----------------------------|
| | | | | | |

### Data Models
\`\`\`mermaid
erDiagram
    Entity {
        string id PK
        string name
        string description
    }
    
    %% Add relationships and more entities here
\`\`\`

### Class Diagrams
\`\`\`mermaid
classDiagram
    class ${enabler.id.replace(/-/g, '_')}_Class {
        +String property
        +method() void
    }
    
    %% Add more classes and relationships here
\`\`\`

### Sequence Diagrams
\`\`\`mermaid
sequenceDiagram
    participant A as Actor
    participant S as System
    
    A->>S: Request
    S-->>A: Response
    
    %% Add more interactions here
\`\`\`

### Dataflow Diagrams
\`\`\`mermaid
flowchart TD
    Input[Input Data] --> Process[Process]
    Process --> Output[Output Data]
    
    %% Add your dataflow diagrams here
\`\`\`

### State Diagrams
\`\`\`mermaid
stateDiagram-v2
    [*] --> Initial
    Initial --> Processing
    Processing --> Complete
    Complete --> [*]
    
    %% Add more states and transitions here
\`\`\`

## Dependencies
### Internal Dependencies
- [Service/Component]: [Why needed]

### External Dependencies
- [Third-party service]: [Integration details]

## Notes
[Any additional context, assumptions, or open questions]
`;
}

// Serve README
app.get('/README.md', async (req, res) => {
  try {
    const readmePath = path.join(__dirname, 'README.md');
    const content = await fs.readFile(readmePath, 'utf8');
    const html = marked(content);
    
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Anvil - Documentation</title>
        <style>
          body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            max-width: 1000px; 
            margin: 0 auto; 
            padding: 2rem;
            line-height: 1.6;
            background: #f5f7fa;
            color: #2c3e50;
          }
          .header {
            background: linear-gradient(135deg, #4a90e2 0%, #2c5aa0 100%);
            color: white;
            padding: 2rem;
            border-radius: 10px;
            margin-bottom: 2rem;
            text-align: center;
          }
          .content {
            background: white;
            padding: 2rem;
            border-radius: 10px;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          }
          h1, h2, h3 { color: #4a90e2; }
          h1 { border-bottom: 3px solid #4a90e2; padding-bottom: 0.5rem; }
          code { background: #f8f9fa; padding: 0.2rem 0.4rem; border-radius: 4px; }
          pre { background: #f8f9fa; padding: 1rem; border-radius: 8px; overflow-x: auto; }
          table { width: 100%; border-collapse: collapse; margin: 1rem 0; }
          th, td { border: 1px solid #e9ecef; padding: 0.8rem; text-align: left; }
          th { background: #f8f9fa; }
          .back-link { 
            display: inline-block; 
            margin-bottom: 1rem; 
            color: #4a90e2; 
            text-decoration: none; 
            font-weight: 600;
          }
          .back-link:hover { text-decoration: underline; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Anvil Documentation</h1>
          <p>Complete guide to features and usage</p>
        </div>
        <a href="/" class="back-link">← Back to Anvil</a>
        <div class="content">
          ${html}
        </div>
      </body>
      </html>
    `);
  } catch (error) {
    res.status(500).send('Error loading documentation');
  }
});

// Serve SOFTWARE_DEVELOPMENT_PLAN
app.get('/SOFTWARE_DEVELOPMENT_PLAN.md', async (req, res) => {
  try {
    const planPath = path.join(__dirname, 'SOFTWARE_DEVELOPMENT_PLAN.md');
    const content = await fs.readFile(planPath, 'utf8');
    const html = marked(content);

    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Anvil - Software Development Plan</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            max-width: 1000px;
            margin: 0 auto;
            padding: 2rem;
            line-height: 1.6;
            background: #f5f7fa;
            color: #2c3e50;
          }
          .header {
            background: linear-gradient(135deg, #4a90e2 0%, #2c5aa0 100%);
            color: white;
            padding: 2rem;
            border-radius: 10px;
            margin-bottom: 2rem;
            text-align: center;
          }
          .content {
            background: white;
            padding: 2rem;
            border-radius: 10px;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          }
          h1, h2, h3 { color: #4a90e2; }
          h1 { border-bottom: 3px solid #4a90e2; padding-bottom: 0.5rem; }
          code { background: #f8f9fa; padding: 0.2rem 0.4rem; border-radius: 4px; }
          pre { background: #f8f9fa; padding: 1rem; border-radius: 8px; overflow-x: auto; }
          table { width: 100%; border-collapse: collapse; margin: 1rem 0; }
          th, td { border: 1px solid #e9ecef; padding: 0.8rem; text-align: left; }
          th { background: #f8f9fa; }
          .back-link {
            display: inline-block;
            margin-bottom: 1rem;
            color: #4a90e2;
            text-decoration: none;
            font-weight: 600;
          }
          .back-link:hover { text-decoration: underline; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Software Development Plan</h1>
          <p>Comprehensive guide for discovering, analyzing, designing, implementing, testing, refactoring, and retiring software applications</p>
        </div>
        <a href="/" class="back-link">← Back to Anvil</a>
        <div class="content">
          ${html}
        </div>
      </body>
      </html>
    `);
  } catch (error) {
    res.status(500).send('Error loading Software Development Plan');
  }
});

// Get full configuration
app.get('/api/config', (req, res) => {
  try {
    console.log('[CONFIG] Returning full config:', config);
    res.json(config);
  } catch (error) {
    console.error('[CONFIG] Error getting config:', error);
    res.status(500).json({ error: 'Error getting configuration' });
  }
});

// Logs endpoint
app.get('/api/logs', (req: Request, res: Response) => {
  try {
    const lines = parseInt(req.query.lines as string) || 100;
    const logs = logger.getRecentLogs(lines);
    res.json({ logs, executionId: logger.getExecutionId() });
  } catch (error) {
    logger.error('Failed to get logs', { error: error.message });
    res.status(500).json({ error: 'Failed to get logs' });
  }
});

// Shutdown API endpoint
app.post('/api/shutdown', (req, res) => {
  try {
    res.json({ success: true, message: 'Server shutdown initiated' });

    // Close server gracefully after sending response
    setTimeout(() => {
      gracefulShutdown();
    }, 1000);
  } catch (error) {
    console.error('[SHUTDOWN] Error shutting down server:', error);
    res.status(500).json({ error: 'Error shutting down server' });
  }
});

// Discovery API - Analyze text and generate capabilities/enablers
app.post('/api/discovery/analyze', async (req, res) => {
  try {
    const { text } = req.body;

    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Text content is required' });
    }

    console.log('[DISCOVERY] Analyzing text for capabilities and enablers');

    // AI Analysis logic to extract capabilities and enablers
    const analysis = await analyzeTextForDiscovery(text);

    res.json(analysis);
  } catch (error) {
    console.error('[DISCOVERY] Error analyzing text:', error);
    res.status(500).json({ error: 'Error analyzing text: ' + error.message });
  }
});

// Discovery API - Create documents from analysis results
app.post('/api/discovery/create', async (req, res) => {
  try {
    const { type, documentData, context = {} } = req.body;

    if (!type || !documentData) {
      return res.status(400).json({ error: 'Type and document data are required' });
    }

    console.log('[DISCOVERY] Creating document:', type, documentData.name, 'with context:', context);

    const result = await createDocumentFromDiscovery(type, documentData, context);

    res.json(result);
  } catch (error) {
    console.error('[DISCOVERY] Error creating document:', error);
    res.status(500).json({ error: 'Error creating document: ' + error.message });
  }
});

// Update full configuration
app.post('/api/config', async (req, res) => {
  try {
    const newConfig = req.body;
    console.log('[CONFIG] Updating full config:', newConfig);

    // Validate the new configuration
    const errors = validateConfig(newConfig);
    if (errors.length > 0) {
      return res.status(400).json({ error: 'Invalid configuration', details: errors });
    }

    // Update the global config
    Object.assign(config, newConfig);

    // Save to config.local.json file (runtime overrides)
    await fs.writeJson('./config.local.json', config, { spaces: 2 });

    console.log('[CONFIG] Configuration updated successfully');
    res.json({ message: 'Configuration updated successfully', config });
  } catch (error) {
    console.error('[CONFIG] Error updating config:', error);
    res.status(500).json({ error: 'Error updating configuration' });
  }
});

// Get config defaults
app.get('/api/config/defaults', (req, res) => {
  try {
    const defaults = config.defaults || { owner: 'Product Team' };
    console.log('[CONFIG] Returning defaults:', defaults);
    res.json(defaults);
  } catch (error) {
    console.error('[CONFIG] Error getting defaults:', error);
    res.status(500).json({ error: 'Error getting config defaults' });
  }
});

// Update config defaults
app.post('/api/config/defaults', async (req, res) => {
  try {
    const { owner, analysisReview, designReview, requirementsReview, codeReview } = req.body;
    
    console.log('[CONFIG] Updating defaults:', req.body);
    
    // Validate input values
    const validReviewValues = ['Required', 'Not Required']
    const validOwnerPattern = /^[a-zA-Z0-9\s-_.]+$/
    
    if (owner !== undefined) {
      if (typeof owner !== 'string' || !validOwnerPattern.test(owner) || owner.length > 100) {
        return res.status(400).json({ error: 'Invalid owner name. Must be alphanumeric with spaces, hyphens, underscores, and periods only.' })
      }
    }
    
    const reviewFields = { analysisReview, designReview, requirementsReview, codeReview }
    for (const [field, value] of Object.entries(reviewFields)) {
      if (value !== undefined && !validReviewValues.includes(value)) {
        return res.status(400).json({ error: `Invalid ${field} value. Must be either 'Required' or 'Not Required'.` })
      }
    }
    
    // Update the config object
    if (!config.defaults) {
      config.defaults = {};
    }
    
    if (owner !== undefined) config.defaults.owner = owner;
    if (analysisReview !== undefined) config.defaults.analysisReview = analysisReview;
    if (designReview !== undefined) config.defaults.designReview = designReview;
    if (requirementsReview !== undefined) config.defaults.requirementsReview = requirementsReview;
    if (codeReview !== undefined) config.defaults.codeReview = codeReview;
    
    // Validate the entire updated config before saving
    const validationErrors = validateConfig(config)
    if (validationErrors.length > 0) {
      console.error('[CONFIG] Validation failed after update:', validationErrors);
      return res.status(400).json({ error: 'Configuration validation failed: ' + validationErrors.join(', ') })
    }
    
    // Write back to config.local.json
    await fs.writeFile('./config.local.json', JSON.stringify(config, null, 2), 'utf8');
    console.log('[CONFIG] Config updated and validated successfully');
    
    res.json({ success: true, defaults: config.defaults });
  } catch (error) {
    console.error('[CONFIG] Error updating config:', error);
    res.status(500).json({ error: 'Error updating config: ' + error.message });
  }
});

// Chat API Endpoints

// Send a message to the AI assistant
app.post('/api/chat/message', async (req, res) => {
  try {
    const { sessionId, message } = req.body;

    if (!sessionId || typeof sessionId !== 'string') {
      return res.status(400).json({ error: 'Session ID is required' });
    }

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Message is required' });
    }

    logger.info('[CHAT] Received message', {
      sessionId,
      messageLength: message.length
    });

    const response = await chatService.sendMessage(sessionId, message);

    res.json({
      success: true,
      response,
      sessionId
    });
  } catch (error: any) {
    logger.error('[CHAT] Error sending message', { error: error.message });
    res.status(500).json({
      error: 'Error sending message to AI assistant: ' + error.message
    });
  }
});

// Get chat history for a session
app.get('/api/chat/history/:sessionId', (req, res) => {
  try {
    const { sessionId } = req.params;

    if (!sessionId) {
      return res.status(400).json({ error: 'Session ID is required' });
    }

    const history = chatService.getSessionHistory(sessionId);

    res.json({
      success: true,
      sessionId,
      messages: history
    });
  } catch (error: any) {
    logger.error('[CHAT] Error getting chat history', { error: error.message });
    res.status(500).json({ error: 'Error getting chat history: ' + error.message });
  }
});

// Clear a chat session
app.delete('/api/chat/session/:sessionId', (req, res) => {
  try {
    const { sessionId } = req.params;

    if (!sessionId) {
      return res.status(400).json({ error: 'Session ID is required' });
    }

    chatService.clearSession(sessionId);

    res.json({
      success: true,
      message: 'Chat session cleared'
    });
  } catch (error: any) {
    logger.error('[CHAT] Error clearing session', { error: error.message });
    res.status(500).json({ error: 'Error clearing session: ' + error.message });
  }
});

// Get current AI assistant configuration
app.get('/api/chat/config', (req, res) => {
  try {
    res.json({
      success: true,
      config: config.aiAssistant || null
    });
  } catch (error: any) {
    logger.error('[CHAT] Error getting chat config', { error: error.message });
    res.status(500).json({ error: 'Error getting chat configuration: ' + error.message });
  }
});

// Workspace Management API Endpoints

// Get all workspaces
app.get('/api/workspaces', (req, res) => {
  try {
    res.json({
      workspaces: config.workspaces || [],
      activeWorkspaceId: config.activeWorkspaceId
    });
  } catch (error) {
    console.error('[WORKSPACE] Error getting workspaces:', error);
    res.status(500).json({ error: 'Error getting workspaces' });
  }
});

// Create new workspace
app.post('/api/workspaces', async (req, res) => {
  try {
    const { name, description, projectPaths, copySwPlan } = req.body;

    if (!name || typeof name !== 'string') {
      return res.status(400).json({ error: 'Workspace name is required' });
    }

    if (!projectPaths || !Array.isArray(projectPaths) || projectPaths.length === 0) {
      return res.status(400).json({ error: 'At least one project path is required' });
    }

    const newWorkspace = {
      id: `ws-${Date.now()}`,
      name: name.trim(),
      description: description?.trim() || '',
      isActive: false,
      projectPaths: projectPaths,
      copySwPlan: copySwPlan !== false, // Default to true
      createdDate: new Date().toISOString()
    };

    if (!config.workspaces) {
      config.workspaces = [];
    }

    config.workspaces.push(newWorkspace);

    // Copy SOFTWARE_DEVELOPMENT_PLAN.md to all project paths if workspace has copySwPlan enabled
    if (newWorkspace.copySwPlan !== false) {
      for (const pathItem of projectPaths) {
        const pathString = typeof pathItem === 'string' ? pathItem : pathItem.path;
        try {
          const sourcePath = path.join(__dirname, 'SOFTWARE_DEVELOPMENT_PLAN.md');
          const destPath = path.join(pathString, 'SOFTWARE_DEVELOPMENT_PLAN.md');

          // Check if source file exists
          if (await fs.pathExists(sourcePath)) {
            // Ensure destination directory exists
            await fs.ensureDir(pathString);

            // Only copy if destination doesn't already exist
            if (!(await fs.pathExists(destPath))) {
              await fs.copy(sourcePath, destPath);
              console.log(`[WORKSPACE] Copied SOFTWARE_DEVELOPMENT_PLAN.md to ${destPath}`);
            } else {
              console.log(`[WORKSPACE] SOFTWARE_DEVELOPMENT_PLAN.md already exists at ${destPath}, skipping copy`);
            }
          } else {
            console.log(`[WORKSPACE] Source SOFTWARE_DEVELOPMENT_PLAN.md not found at ${sourcePath}, skipping copy`);
          }
        } catch (error: any) {
          console.warn(`[WORKSPACE] Failed to copy SOFTWARE_DEVELOPMENT_PLAN.md to ${pathString}:`, error.message);
          // Don't fail the request if copy fails, just log warning
        }
      }
    }

    // Validate the entire updated config
    const validationErrors = validateConfig(config);
    if (validationErrors.length > 0) {
      config.workspaces.pop(); // Rollback
      return res.status(400).json({ error: 'Workspace validation failed: ' + validationErrors.join(', ') });
    }

    // Save to config.local.json
    await fs.writeFile('./config.local.json', JSON.stringify(config, null, 2), 'utf8');

    res.json(newWorkspace);
  } catch (error) {
    console.error('[WORKSPACE] Error creating workspace:', error);
    res.status(500).json({ error: 'Error creating workspace: ' + error.message });
  }
});

// Update workspace
app.put('/api/workspaces/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, projectPaths, copySwPlan } = req.body;

    const workspaceIndex = config.workspaces?.findIndex(ws => ws.id === id);
    if (workspaceIndex === -1) {
      return res.status(404).json({ error: 'Workspace not found' });
    }

    const workspace = config.workspaces[workspaceIndex];
    const originalWorkspace = { ...workspace };

    if (name !== undefined) {
      if (!name || typeof name !== 'string') {
        return res.status(400).json({ error: 'Invalid workspace name' });
      }
      workspace.name = name.trim();
    }

    if (description !== undefined) {
      workspace.description = description?.trim() || '';
    }

    if (projectPaths !== undefined) {
      if (!Array.isArray(projectPaths) || projectPaths.length === 0) {
        return res.status(400).json({ error: 'At least one project path is required' });
      }
      workspace.projectPaths = projectPaths;
    }

    if (copySwPlan !== undefined) {
      workspace.copySwPlan = copySwPlan !== false; // Default to true
    }

    // Copy SOFTWARE_DEVELOPMENT_PLAN.md to new project paths if workspace has copySwPlan enabled
    if (projectPaths !== undefined && workspace.copySwPlan !== false) {
      // Find new paths that weren't in the original workspace
      const originalPaths = originalWorkspace.projectPaths || [];
      const originalPathStrings = originalPaths.map(p => typeof p === 'string' ? p : p.path);
      const newPaths = projectPaths.filter(pathItem => {
        const pathString = typeof pathItem === 'string' ? pathItem : pathItem.path;
        return !originalPathStrings.includes(pathString);
      });

      for (const pathItem of newPaths) {
        const pathString = typeof pathItem === 'string' ? pathItem : pathItem.path;
        try {
          const sourcePath = path.join(__dirname, 'SOFTWARE_DEVELOPMENT_PLAN.md');
          const destPath = path.join(pathString, 'SOFTWARE_DEVELOPMENT_PLAN.md');

          // Check if source file exists
          if (await fs.pathExists(sourcePath)) {
            // Ensure destination directory exists
            await fs.ensureDir(pathString);

            // Only copy if destination doesn't already exist
            if (!(await fs.pathExists(destPath))) {
              await fs.copy(sourcePath, destPath);
              console.log(`[WORKSPACE] Copied SOFTWARE_DEVELOPMENT_PLAN.md to ${destPath}`);
            } else {
              console.log(`[WORKSPACE] SOFTWARE_DEVELOPMENT_PLAN.md already exists at ${destPath}, skipping copy`);
            }
          } else {
            console.log(`[WORKSPACE] Source SOFTWARE_DEVELOPMENT_PLAN.md not found at ${sourcePath}, skipping copy`);
          }
        } catch (error: any) {
          console.warn(`[WORKSPACE] Failed to copy SOFTWARE_DEVELOPMENT_PLAN.md to ${pathString}:`, error.message);
          // Don't fail the request if copy fails, just log warning
        }
      }
    }

    // Validate the entire updated config
    const validationErrors = validateConfig(config);
    if (validationErrors.length > 0) {
      config.workspaces[workspaceIndex] = originalWorkspace; // Rollback
      return res.status(400).json({ error: 'Workspace validation failed: ' + validationErrors.join(', ') });
    }

    // Save to config.local.json
    await fs.writeFile('./config.local.json', JSON.stringify(config, null, 2), 'utf8');

    res.json(workspace);
  } catch (error) {
    console.error('[WORKSPACE] Error updating workspace:', error);
    res.status(500).json({ error: 'Error updating workspace: ' + error.message });
  }
});

// Set active workspace
app.post('/api/workspaces/:id/activate', async (req, res) => {
  try {
    const { id } = req.params;

    const workspace = config.workspaces?.find(ws => ws.id === id);
    if (!workspace) {
      return res.status(404).json({ error: 'Workspace not found' });
    }

    const oldActiveId = config.activeWorkspaceId;
    config.activeWorkspaceId = id;

    // Update isActive flags
    config.workspaces.forEach(ws => {
      ws.isActive = ws.id === id;
    });

    // Validate the entire updated config
    const validationErrors = validateConfig(config);
    if (validationErrors.length > 0) {
      config.activeWorkspaceId = oldActiveId; // Rollback
      config.workspaces.forEach(ws => {
        ws.isActive = ws.id === oldActiveId;
      });
      return res.status(400).json({ error: 'Workspace activation failed: ' + validationErrors.join(', ') });
    }

    // Save to config.local.json
    await fs.writeFile('./config.local.json', JSON.stringify(config, null, 2), 'utf8');

    // Reload config from disk to pick up any new workspaces
    await reloadConfig();

    // Update file watchers to monitor the new active workspace paths
    setupFileWatchers();

    res.json({
      activeWorkspaceId: config.activeWorkspaceId,
      workspace: workspace
    });
  } catch (error) {
    console.error('[WORKSPACE] Error activating workspace:', error);
    res.status(500).json({ error: 'Error activating workspace: ' + error.message });
  }
});

// Delete workspace
app.delete('/api/workspaces/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (config.activeWorkspaceId === id) {
      return res.status(400).json({ error: 'Cannot delete the active workspace' });
    }

    const workspaceIndex = config.workspaces?.findIndex(ws => ws.id === id);
    if (workspaceIndex === -1) {
      return res.status(404).json({ error: 'Workspace not found' });
    }

    config.workspaces.splice(workspaceIndex, 1);

    // Save to config.local.json
    await fs.writeFile('./config.local.json', JSON.stringify(config, null, 2), 'utf8');

    res.json({ success: true });
  } catch (error) {
    console.error('[WORKSPACE] Error deleting workspace:', error);
    res.status(500).json({ error: 'Error deleting workspace: ' + error.message });
  }
});

// Add project path to workspace
app.post('/api/workspaces/:id/paths', async (req, res) => {
  try {
    const { id } = req.params;
    const { path: projectPath } = req.body;

    if (!projectPath || typeof projectPath !== 'string') {
      return res.status(400).json({ error: 'Project path is required' });
    }

    const workspace = config.workspaces?.find(ws => ws.id === id);
    if (!workspace) {
      return res.status(404).json({ error: 'Workspace not found' });
    }

    if (workspace.projectPaths.includes(projectPath)) {
      return res.status(400).json({ error: 'Project path already exists in workspace' });
    }

    workspace.projectPaths.push(projectPath);

    // Copy SOFTWARE_DEVELOPMENT_PLAN.md if workspace has copySwPlan enabled
    if (workspace.copySwPlan !== false) {
      try {
        const sourcePath = path.join(__dirname, 'SOFTWARE_DEVELOPMENT_PLAN.md');
        const destPath = path.join(projectPath, 'SOFTWARE_DEVELOPMENT_PLAN.md');

        // Check if source file exists
        if (await fs.pathExists(sourcePath)) {
          // Ensure destination directory exists
          await fs.ensureDir(projectPath);

          // Only copy if destination doesn't already exist
          if (!(await fs.pathExists(destPath))) {
            await fs.copy(sourcePath, destPath);
            console.log(`[WORKSPACE] Copied SOFTWARE_DEVELOPMENT_PLAN.md to ${destPath}`);
          } else {
            console.log(`[WORKSPACE] SOFTWARE_DEVELOPMENT_PLAN.md already exists at ${destPath}, skipping copy`);
          }
        } else {
          console.log(`[WORKSPACE] Source SOFTWARE_DEVELOPMENT_PLAN.md not found at ${sourcePath}, skipping copy`);
        }
      } catch (error) {
        console.warn(`[WORKSPACE] Failed to copy SOFTWARE_DEVELOPMENT_PLAN.md to ${projectPath}:`, error.message);
        // Don't fail the request if copy fails, just log warning
      }
    }

    // Validate the entire updated config
    const validationErrors = validateConfig(config);
    if (validationErrors.length > 0) {
      workspace.projectPaths.pop(); // Rollback
      return res.status(400).json({ error: 'Path addition failed: ' + validationErrors.join(', ') });
    }

    // Save to config.local.json
    await fs.writeFile('./config.local.json', JSON.stringify(config, null, 2), 'utf8');

    // Update file watchers to monitor the new project path
    setupFileWatchers();

    res.json(workspace);
  } catch (error) {
    console.error('[WORKSPACE] Error adding project path:', error);
    res.status(500).json({ error: 'Error adding project path: ' + error.message });
  }
});

// Remove project path from workspace
app.delete('/api/workspaces/:id/paths', async (req, res) => {
  try {
    const { id } = req.params;
    const { path: projectPath } = req.body;

    if (!projectPath || typeof projectPath !== 'string') {
      return res.status(400).json({ error: 'Project path is required' });
    }

    const workspace = config.workspaces?.find(ws => ws.id === id);
    if (!workspace) {
      return res.status(404).json({ error: 'Workspace not found' });
    }

    if (workspace.projectPaths.length <= 1) {
      return res.status(400).json({ error: 'Cannot remove the last project path from workspace' });
    }

    const pathIndex = workspace.projectPaths.indexOf(projectPath);
    if (pathIndex === -1) {
      return res.status(404).json({ error: 'Project path not found in workspace' });
    }

    workspace.projectPaths.splice(pathIndex, 1);

    // Save to config.local.json
    await fs.writeFile('./config.local.json', JSON.stringify(config, null, 2), 'utf8');

    // Update file watchers to stop monitoring the removed project path
    setupFileWatchers();

    res.json(workspace);
  } catch (error) {
    console.error('[WORKSPACE] Error removing project path:', error);
    res.status(500).json({ error: 'Error removing project path: ' + error.message });
  }
});

// Handle enabler reparenting by updating capability enabler lists
async function handleEnablerReparenting(enablerId, enablerName, oldCapabilityId, newCapabilityId, enablerDescription = null) {
  try {
    console.log(`[REPARENTING] Moving enabler ${enablerId} from ${oldCapabilityId} to ${newCapabilityId}`);

    const configPaths = getConfigPaths(config);

    // Remove enabler from old capability if specified
    if (oldCapabilityId) {
      await removeEnablerFromCapability(oldCapabilityId, enablerId, enablerName, configPaths.projectPaths);
    }

    // Add enabler to new capability if specified
    if (newCapabilityId) {
      await addEnablerToCapability(newCapabilityId, enablerId, enablerName, configPaths.projectPaths, enablerDescription);
    }

    console.log(`[REPARENTING] Successfully reparented enabler ${enablerId}`);
  } catch (error) {
    console.error(`[REPARENTING] Error handling enabler reparenting:`, error);
    throw error;
  }
}

async function removeEnablerFromCapability(capabilityId, enablerId, enablerName, projectPaths) {
  try {
    // Find the capability file
    const capabilityFile = await findCapabilityFile(capabilityId, projectPaths);
    if (!capabilityFile) {
      console.warn(`[REPARENTING] Could not find capability file for ${capabilityId}`);
      return;
    }
    
    // Read and parse the capability file
    const content = await fs.readFile(capabilityFile, 'utf8');
    const lines = content.split('\n');
    
    // Find and remove the enabler from the enablers table
    let inEnablersSection = false;
    let inEnablersTable = false;
    const updatedLines = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      if (line.trim() === '## Enablers') {
        inEnablersSection = true;
        updatedLines.push(line);
        continue;
      }
      
      if (inEnablersSection && line.startsWith('## ')) {
        inEnablersSection = false;
        inEnablersTable = false;
      }
      
      if (inEnablersSection && line.includes('| Enabler ID |')) {
        inEnablersTable = true;
        updatedLines.push(line);
        continue;
      }
      
      if (inEnablersTable && line.includes('|') && line.includes(enablerId)) {
        // Skip this line (remove the enabler)
        console.log(`[REPARENTING] Removed enabler ${enablerId} from capability ${capabilityId}`);
        continue;
      }
      
      updatedLines.push(line);
    }

    // Write the updated content back
    await fs.writeFile(capabilityFile, updatedLines.join('\n'), 'utf8');
    console.log(`[REPARENTING] Updated capability file: ${capabilityFile}`);

    // Broadcast file change for the capability file to trigger client refresh
    broadcastFileChange('change', capabilityFile);
    console.log(`[REPARENTING] Broadcasted capability file change: ${path.basename(capabilityFile)}`);
  } catch (error) {
    console.error(`[REPARENTING] Error removing enabler from capability ${capabilityId}:`, error);
  }
}

async function addEnablerToCapability(capabilityId, enablerId, enablerName, projectPaths, enablerDescription = null) {
  try {
    // Find the capability file
    const capabilityFile = await findCapabilityFile(capabilityId, projectPaths);
    if (!capabilityFile) {
      console.warn(`[REPARENTING] Could not find capability file for ${capabilityId}`);
      return;
    }
    
    // Read and parse the capability file
    const content = await fs.readFile(capabilityFile, 'utf8');
    const lines = content.split('\n');
    
    // Find the enablers table and add the new enabler
    let inEnablersSection = false;
    let lastTableLineIndex = -1;
    let foundTableHeader = false;
    const updatedLines = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      if (line.trim() === '## Enablers') {
        inEnablersSection = true;
        foundTableHeader = false;
      }
      
      if (inEnablersSection && line.startsWith('## ') && !line.startsWith('## Enablers')) {
        inEnablersSection = false;
      }
      
      // Look for the enablers table header (more flexible matching)
      if (inEnablersSection && line.includes('Enabler ID') && line.includes('|')) {
        foundTableHeader = true;
        console.log(`[REPARENTING] Found enablers table header: ${line.trim()}`);
      }
      
      // Track the last row in the enablers table
      if (inEnablersSection && foundTableHeader && line.includes('|') && 
          !line.includes('Enabler ID') && !line.includes('---') && 
          line.trim() !== '' && line.trim() !== '|') {
        lastTableLineIndex = updatedLines.length;
        console.log(`[REPARENTING] Found table row at index ${lastTableLineIndex}: ${line.trim()}`);
      }
      
      updatedLines.push(line);
    }
    
    // Add the new enabler row after the last table row or after the header if no rows exist
    if (foundTableHeader) {
      const description = enablerDescription || enablerName;
      const newEnablerRow = `| ${enablerId} | ${description} |`;
      
      if (lastTableLineIndex >= 0) {
        // Insert after the last row
        updatedLines.splice(lastTableLineIndex + 1, 0, newEnablerRow);
        console.log(`[REPARENTING] Added enabler ${enablerId} to capability ${capabilityId} after existing rows`);
      } else {
        // No existing rows - find the table header and insert after the separator
        for (let i = 0; i < updatedLines.length; i++) {
          if (updatedLines[i].includes('Enabler ID') && updatedLines[i].includes('|')) {
            // Look for the separator line after the header
            if (i + 1 < updatedLines.length && updatedLines[i + 1].includes('---')) {
              updatedLines.splice(i + 2, 0, newEnablerRow);
              console.log(`[REPARENTING] Added enabler ${enablerId} to capability ${capabilityId} as first row`);
              break;
            }
          }
        }
      }
    } else {
      console.warn(`[REPARENTING] Could not find enablers table in capability ${capabilityId}. InSection: ${inEnablersSection}, FoundHeader: ${foundTableHeader}`);
      
      // Debug: Print the content structure
      console.log('[REPARENTING] Capability file structure:');
      updatedLines.forEach((line, index) => {
        if (line.includes('Enabler') || line.startsWith('##')) {
          console.log(`  ${index}: ${line}`);
        }
      });
    }

    // Write the updated content back
    await fs.writeFile(capabilityFile, updatedLines.join('\n'), 'utf8');
    console.log(`[REPARENTING] Updated capability file: ${capabilityFile}`);

    // Broadcast file change for the capability file to trigger client refresh
    broadcastFileChange('change', capabilityFile);
    console.log(`[REPARENTING] Broadcasted capability file change: ${path.basename(capabilityFile)}`);
  } catch (error) {
    console.error(`[REPARENTING] Error adding enabler to capability ${capabilityId}:`, error);
  }
}

async function findCapabilityFile(capabilityId, projectPaths) {
  try {
    for (const projectPath of projectPaths) {
      const resolvedPath = path.resolve(projectPath);
      if (!await fs.pathExists(resolvedPath)) {
        continue;
      }

      const files = await fs.readdir(resolvedPath);
      const capabilityFiles = files.filter(file => file.endsWith('-capability.md'));

      for (const file of capabilityFiles) {
        const filePath = path.join(resolvedPath, file);
        const content = await fs.readFile(filePath, 'utf8');

        // Check if this capability file contains the target ID
        if (content.includes(`**ID**: ${capabilityId}`)) {
          return filePath;
        }
      }
    }

    return null;
  } catch (error) {
    console.error(`[REPARENTING] Error finding capability file for ${capabilityId}:`, error);
    return null;
  }
}

// Open file explorer to document directory
app.post('/api/open-explorer', async (req, res) => {
  try {
    const { filePath } = req.body;

    if (!filePath) {
      return res.status(400).json({ error: 'File path is required' });
    }

    // Find the file using existing findFileInProjectPaths function
    const configPaths = getConfigPaths(config);
    let cleanFilePath = filePath;

    // Remove common prefixes
    if (filePath.startsWith('specifications/')) {
      cleanFilePath = filePath.replace('specifications/', '');
    }

    const fileLocation = await findFileInProjectPaths(cleanFilePath, configPaths.projectPaths);

    if (!fileLocation) {
      return res.status(404).json({ error: 'File not found in project paths' });
    }

    const directoryPath = path.dirname(fileLocation.fullPath);

    // Platform-specific command to open file explorer
    let command: string;
    if (process.platform === 'win32') {
      // Windows: Open Explorer to the directory
      command = `explorer "${directoryPath}"`;
    } else if (process.platform === 'darwin') {
      // macOS: Open Finder to the directory
      command = `open "${directoryPath}"`;
    } else {
      // Linux: Try common file managers
      command = `xdg-open "${directoryPath}"`;
    }

    // Execute the command without waiting for callback (fire and forget)
    exec(command, (error) => {
      if (error) {
        logger.error('Failed to open file explorer:', error);
      } else {
        logger.info(`Opened file explorer to: ${directoryPath}`);
      }
    });

    // Return success immediately since opening explorer is a "fire and forget" operation
    res.json({ success: true, directory: directoryPath });

  } catch (error) {
    logger.error('Error opening file explorer:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Shutdown server endpoint
app.post('/api/shutdown', (req, res) => {
  console.log('Shutdown request received');
  res.json({ message: 'Server shutting down...' });
  
  // Close server gracefully
  setTimeout(() => {
    console.log('Anvil server shutting down gracefully');
    if (fileWatcher) {
      console.log('[FILE-WATCH] Closing file watcher');
      fileWatcher.close();
    }
    process.exit(0);
  }, 100);
});

// Discovery Analysis Functions
async function analyzeTextForDiscovery(inputText) {
  try {
    console.log('[DISCOVERY] Starting analysis of input text');

    // Extract key information patterns
    const capabilities = await extractCapabilities(inputText);
    const enablers = await extractEnablers(inputText);
    const summary = generateAnalysisSummary(inputText, capabilities, enablers);

    return {
      capabilities,
      enablers,
      summary,
      originalText: inputText
    };
  } catch (error) {
    console.error('[DISCOVERY] Analysis error:', error);
    throw new Error('Failed to analyze text: ' + error.message);
  }
}

async function extractCapabilities(text) {
  const capabilities = [];

  // Look for high-level features, systems, or major functionality
  const capabilityPatterns = [
    /(?:^|\n)#\s+(.+?)(?:\n|$)/g, // Main headers
    /(?:capability|system|platform|service):\s*(.+?)(?:\n|$)/gi,
    /(?:we need|build|create|implement)\s+(?:a|an)?\s*(.+?)(?:\s+(?:system|platform|service|capability))/gi,
    /(?:main|primary|core)\s+(?:feature|functionality|system):\s*(.+?)(?:\n|$)/gi
  ];

  for (let patternIndex = 0; patternIndex < capabilityPatterns.length; patternIndex++) {
    const pattern = capabilityPatterns[patternIndex];
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const name = match[1].trim();
      if (name && name.length > 3 && name.length < 100) {
        const id = await generateCapabilityId();
        capabilities.push({
          id,
          name: capitalizeFirst(name),
          description: extractDescriptionFromContext(text, name),
          enablers: []
        });
      }
    }
  }

  // If no patterns found, create a default capability from the title or first line
  if (capabilities.length === 0) {
    const firstLine = text.split('\n')[0].replace(/^#+\s*/, '').trim();
    if (firstLine) {
      capabilities.push({
        id: await generateCapabilityId(),
        name: capitalizeFirst(firstLine),
        description: 'Auto-generated capability from discovery analysis',
        enablers: []
      });
    }
  }

  return capabilities.slice(0, 5); // Limit to 5 capabilities
}

async function extractEnablers(text) {
  const enablers = [];

  // Look for specific features, components, or implementation details
  const enablerPatterns = [
    /(?:^|\n)##\s+(.+?)(?:\n|$)/g, // Sub-headers
    /(?:^|\n)-\s+(.+?)(?:\n|$)/g, // Bullet points
    /(?:feature|component|module|service):\s*(.+?)(?:\n|$)/gi,
    /(?:includes?|features?|supports?):\s*(.+?)(?:\n|$)/gi,
    /(?:^|\n)\*\s+(.+?)(?:\n|$)/g, // Asterisk bullet points
    /(?:implement|create|build|add)\s+(.+?)(?:\s+(?:feature|component|functionality))/gi
  ];

  for (let patternIndex = 0; patternIndex < enablerPatterns.length; patternIndex++) {
    const pattern = enablerPatterns[patternIndex];
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const name = match[1].trim();
      if (name && name.length > 3 && name.length < 100 && !isGenericTerm(name)) {
        const id = await generateEnablerId();
        enablers.push({
          id,
          name: capitalizeFirst(name),
          description: extractDescriptionFromContext(text, name),
          requirements: extractRequirements(text, name)
        });
      }
    }
  }

  return [...new Map(enablers.map(e => [e.name.toLowerCase(), e])).values()].slice(0, 10); // Remove duplicates, limit to 10
}

function extractDescriptionFromContext(text, itemName) {
  // Try to find sentences that mention the item
  const sentences = text.split(/[.!?]+/);
  for (const sentence of sentences) {
    if (sentence.toLowerCase().includes(itemName.toLowerCase()) && sentence.length > itemName.length + 10) {
      return sentence.trim();
    }
  }
  return `${itemName} functionality as described in the requirements`;
}

function extractRequirements(text, enablerName) {
  const requirements = [];

  // Look for requirement-like statements near the enabler name
  const lines = text.split('\n');
  const enablerLineIndex = lines.findIndex(line =>
    line.toLowerCase().includes(enablerName.toLowerCase())
  );

  if (enablerLineIndex !== -1) {
    // Look at following lines for requirements
    for (let i = enablerLineIndex + 1; i < Math.min(enablerLineIndex + 5, lines.length); i++) {
      const line = lines[i].trim();
      if (line.match(/^\s*[-*]\s+/) || line.match(/^\s*\d+\.\s+/)) {
        const req = line.replace(/^\s*[-*\d.]\s*/, '').trim();
        if (req.length > 10 && req.length < 150) {
          requirements.push(req);
        }
      }
    }
  }

  return requirements.slice(0, 5); // Limit to 5 requirements per enabler
}

function generateAnalysisSummary(text, capabilities, enablers) {
  const wordCount = text.split(/\s+/).length;
  return `Analyzed ${wordCount} words and identified ${capabilities.length} capabilities and ${enablers.length} enablers. The system appears to focus on ${capabilities.map(c => c.name).join(', ')} with supporting features including ${enablers.slice(0, 3).map(e => e.name).join(', ')}.`;
}

function isGenericTerm(term) {
  const genericTerms = ['features', 'functionality', 'system', 'platform', 'service', 'component', 'module', 'api', 'interface', 'data', 'user', 'admin'];
  return genericTerms.some(generic => term.toLowerCase().includes(generic) && term.split(' ').length === 1);
}

function capitalizeFirst(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

async function findCapabilityById(capabilityId) {
  try {
    const configPaths = getConfigPaths(config);

    for (const projectPath of configPaths.projectPaths) {
      const resolvedPath = path.resolve(projectPath);

      if (await fs.pathExists(resolvedPath)) {
        const files = await fs.readdir(resolvedPath);

        for (const file of files) {
          if (file.endsWith('-capability.md')) {
            const filePath = path.join(resolvedPath, file);
            const content = await fs.readFile(filePath, 'utf8');
            const metadata = extractMetadata(content);

            if (metadata.id === capabilityId) {
              return {
                id: metadata.id,
                name: metadata.name,
                path: filePath,
                metadata
              };
            }
          }
        }
      }
    }

    return null;
  } catch (error) {
    console.error('[DISCOVERY] Error finding capability by ID:', error);
    return null;
  }
}

async function createDocumentFromDiscovery(type: string, documentData: any, context: { parentCapabilityPath?: string } = {}) {
  try {
    let targetDirectory;

    // For enablers, try to use the same directory as the parent capability
    if (type === 'enabler' && context.parentCapabilityPath) {
      targetDirectory = path.dirname(context.parentCapabilityPath);
      console.log('[DISCOVERY] Using capability directory for enabler:', targetDirectory);
    } else if (type === 'enabler' && documentData.capabilityId) {
      // Try to find the capability by ID to get its directory
      const capability = await findCapabilityById(documentData.capabilityId);
      if (capability && capability.path) {
        targetDirectory = path.dirname(capability.path);
        console.log('[DISCOVERY] Found capability directory by ID:', targetDirectory);
      }
    }

    // Fallback to default project path
    if (!targetDirectory) {
      const configPaths = getConfigPaths(config);
      targetDirectory = path.resolve(configPaths.projectPaths[0]);
      console.log('[DISCOVERY] Using default project path:', targetDirectory);
    }

    let fileName;
    let content;

    if (type === 'capability') {
      // Remove prefix from ID (CAP- or ENB-) to get just the number
      const numericId = documentData.id.replace(/^(CAP|ENB)-/i, '');
      fileName = `${numericId}-capability.md`;
      content = await generateCapabilityContentFromDiscovery(documentData);
    } else if (type === 'enabler') {
      // Remove prefix from ID (CAP- or ENB-) to get just the number
      const numericId = documentData.id.replace(/^(CAP|ENB)-/i, '');
      fileName = `${numericId}-enabler.md`;
      content = await generateEnablerContentFromDiscovery(documentData);
    } else {
      throw new Error('Invalid document type');
    }

    const filePath = path.join(targetDirectory, fileName);

    // Check if file already exists
    if (await fs.pathExists(filePath)) {
      throw new Error(`File ${fileName} already exists`);
    }

    await fs.writeFile(filePath, content, 'utf8');
    console.log('[DISCOVERY] Created document:', fileName);

    return {
      success: true,
      fileName,
      type,
      id: documentData.id
    };
  } catch (error) {
    console.error('[DISCOVERY] Document creation error:', error);
    throw error;
  }
}

async function generateCapabilityContentFromDiscovery(capabilityData) {
  const currentDate = new Date().toISOString().split('T')[0];

  return `# ${capabilityData.name}

## Metadata
- **Name**: ${capabilityData.name}
- **Type**: Capability
- **ID**: ${capabilityData.id}
- **Status**: In Draft
- **Approval**: Not Approved
- **Priority**: Medium
- **Owner**: Product Team
- **Analysis Review**: Required
- **Design Review**: Required
- **Code Review**: Not Required
- **Created Date**: ${currentDate}
- **Last Updated**: ${currentDate}
- **Version**: ${version.version}

## Business Overview
### Purpose
${capabilityData.description}

### Business Value
This capability provides strategic business value by enabling ${capabilityData.name.toLowerCase()} functionality for end users.

## Architecture Overview
### High-Level Design
The ${capabilityData.name} capability will be implemented as a modular system supporting scalable operations.

### Dependencies
- System Infrastructure
- Data Management Layer
- User Interface Framework

## Enabler Dependencies
${capabilityData.enablers && capabilityData.enablers.length > 0 ?
  capabilityData.enablers.map(enabler => `| ${enabler} | Supporting functionality | Medium |`).join('\n') :
  '| TBD | To be determined | Medium |'
}

*Generated from Discovery analysis*`;
}

async function generateEnablerContentFromDiscovery(enablerData) {
  const currentDate = new Date().toISOString().split('T')[0];

  return `# ${enablerData.name}

## Metadata
- **Name**: ${enablerData.name}
- **Type**: Enabler
- **ID**: ${enablerData.id}
- **Capability ID**: TBD
- **Status**: In Draft
- **Approval**: Not Approved
- **Priority**: Medium
- **Owner**: Product Team
- **Developer**: Development Team
- **Created Date**: ${currentDate}
- **Last Updated**: ${currentDate}
- **Version**: ${version.version}

## Technical Overview
### Purpose
${enablerData.description}

## Functional Requirements
${enablerData.requirements && enablerData.requirements.length > 0 ?
  enablerData.requirements.map((req, index) => `| FR-${String(index + 1).padStart(3, '0')} | ${req} | High | Not Started |`).join('\n') :
  '| FR-001 | Core functionality requirement | High | Not Started |'
}

## Non-Functional Requirements
| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| NFR-001 | Performance and scalability | High | Not Started |
| NFR-002 | Security and data protection | High | Not Started |
| NFR-003 | Maintainability and documentation | Medium | Not Started |

*Generated from Discovery analysis*`;
}

// Serve React app for all non-API routes
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
  }
});

// Create HTTP server for WebSocket support
const server = http.createServer(app);

// Initialize WebSocket server
wss = new WebSocket.Server({ server });

// WebSocket connection handler
wss.on('connection', (ws) => {
  console.log('Client connected to WebSocket');

  ws.on('close', () => {
    console.log('Client disconnected from WebSocket');
  });

  // Send initial connection acknowledgment
  ws.send(JSON.stringify({ type: 'connected', message: 'WebSocket connected' }));
});

// Function to broadcast file changes to all connected clients
function broadcastFileChange(changeType, filePath) {
  if (wss) {
    const message = JSON.stringify({
      type: 'file-change',
      changeType, // 'add', 'change', 'unlink'
      filePath
    });

    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  }
}

// Function to setup file watchers for markdown files
function setupFileWatchers() {
  if (fileWatcher) {
    console.log('Closing existing file watcher...');
    fileWatcher.close();
  }

  try {
    const configPaths = getConfigPaths(config);

    console.log('Setting up file watchers for .md files in paths:', configPaths.projectPaths);

    // Test if directories exist and find actual .md files
    const allMdFiles = [];
    configPaths.projectPaths.forEach(p => {
      const exists = fs.existsSync(p);
      console.log(`Testing directory access: ${p}`, exists ? 'EXISTS' : 'NOT FOUND');

      if (exists) {
        try {
          const files = fs.readdirSync(p);
          const mdFiles = files
            .filter(file => file.endsWith('.md') && !file.includes('backup'))
            .map(file => path.join(p, file));
          allMdFiles.push(...mdFiles);
          console.log(`Found .md files in ${p}:`, files.filter(file => file.endsWith('.md') && !file.includes('backup')));
        } catch (err) {
          console.error(`Error reading directory ${p}:`, err.message);
        }
      }
    });

    console.log('All .md files to watch:', allMdFiles);

    // Watch the directories and all existing .md files
    const watchTargets = [...configPaths.projectPaths, ...allMdFiles];

    fileWatcher = chokidar.watch(watchTargets, {
      persistent: true,
      ignoreInitial: true,
      usePolling: true,
      interval: 1000,
      ignored: [
        '**/backup/**',
        '**/backup',
        /backup/
      ],
      awaitWriteFinish: {
        stabilityThreshold: 300,
        pollInterval: 100
      }
    });

    fileWatcher
      .on('ready', () => {
        console.log('File watcher is ready. Watching for changes...');
        console.log('Watched files:', fileWatcher.getWatched());
      })
      .on('add', (filePath) => {
        console.log('File added:', filePath);
        if (filePath.endsWith('.md')) {
          broadcastFileChange('add', filePath);
        }
      })
      .on('change', (filePath) => {
        console.log('File changed:', filePath);
        if (filePath.endsWith('.md')) {
          broadcastFileChange('change', filePath);
        }
      })
      .on('unlink', (filePath) => {
        console.log('File removed:', filePath);
        if (filePath.endsWith('.md')) {
          broadcastFileChange('unlink', filePath);
        }
      })
      .on('error', (error) => {
        console.error('File watcher error:', error);
        // Try polling mode if native watching fails
        console.log('Retrying with polling mode...');
        setupFileWatchersWithPolling();
      });

  } catch (error) {
    console.error('Failed to setup file watchers:', error);
    // Fallback to polling mode
    setupFileWatchersWithPolling();
  }
}

// Fallback function for polling mode
function setupFileWatchersWithPolling() {
  if (fileWatcher) {
    fileWatcher.close();
  }

  try {
    const configPaths = getConfigPaths(config);

    console.log('Setting up file watchers with POLLING for .md files in paths:', configPaths.projectPaths);

    // Test if directories exist and find actual .md files
    const allMdFiles = [];
    configPaths.projectPaths.forEach(p => {
      const exists = fs.existsSync(p);
      console.log(`Testing directory access (POLLING): ${p}`, exists ? 'EXISTS' : 'NOT FOUND');

      if (exists) {
        try {
          const files = fs.readdirSync(p);
          const mdFiles = files
            .filter(file => file.endsWith('.md') && !file.includes('backup'))
            .map(file => path.join(p, file));
          allMdFiles.push(...mdFiles);
          console.log(`Found .md files (POLLING) in ${p}:`, files.filter(file => file.endsWith('.md') && !file.includes('backup')));
        } catch (err) {
          console.error(`Error reading directory (POLLING) ${p}:`, err.message);
        }
      }
    });

    console.log('All .md files to watch (POLLING):', allMdFiles);

    // Watch the directories and all existing .md files
    const watchTargets = [...configPaths.projectPaths, ...allMdFiles];

    fileWatcher = chokidar.watch(watchTargets, {
      persistent: true,
      ignoreInitial: true,
      usePolling: true, // Force polling mode
      interval: 1000, // Poll every second
      ignored: [
        '**/backup/**',
        '**/backup',
        /backup/
      ],
      awaitWriteFinish: {
        stabilityThreshold: 300,
        pollInterval: 100
      }
    });

    fileWatcher
      .on('ready', () => {
        console.log('File watcher (POLLING) is ready. Watching for changes...');
      })
      .on('add', (filePath) => {
        console.log('File added (POLLING):', filePath);
        if (filePath.endsWith('.md')) {
          broadcastFileChange('add', filePath);
        }
      })
      .on('change', (filePath) => {
        console.log('File changed (POLLING):', filePath);
        if (filePath.endsWith('.md')) {
          broadcastFileChange('change', filePath);
        }
      })
      .on('unlink', (filePath) => {
        console.log('File removed (POLLING):', filePath);
        if (filePath.endsWith('.md')) {
          broadcastFileChange('unlink', filePath);
        }
      })
      .on('error', (error) => {
        console.error('File watcher (POLLING) error:', error);
      });

  } catch (error) {
    console.error('Failed to setup file watchers with polling:', error);
  }
}

// Graceful shutdown handling
function gracefulShutdown() {
  console.log('Shutting down gracefully...');

  if (fileWatcher) {
    fileWatcher.close();
  }

  if (wss) {
    wss.clients.forEach((client) => {
      client.close();
    });
    wss.close();
  }

  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
}

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

server.listen(PORT, () => {
  logger.info(`Anvil server running`, {
    version: version.version,
    port: PORT,
    url: `http://localhost:${PORT}`,
    executionId: logger.getExecutionId()
  });

  // Setup file watchers after server starts
  setupFileWatchers();
});