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

const express = require('express');
const fs = require('fs-extra');
const path = require('path');
const { marked } = require('marked');
const agentAPI = require('./api/agent-endpoints');

// Load version from package.json
let version;
try {
  version = JSON.parse(fs.readFileSync('./package.json', 'utf8'));
} catch (error) {
  console.error('Error loading package.json, using default:', error.message);
  version = { version: 'unknown' };
}

// Security utility for path validation
function validateAndResolvePath(inputPath, allowedRoot, description = 'path') {
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
  } catch (error) {
    console.error(`Path validation failed for ${description}:`, error.message)
    throw new Error(`Security validation failed: ${error.message}`)
  }
}

// Configuration validation schema
function validateConfig(config) {
  const errors = []

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
function getConfigPaths(config) {
  const activeWorkspace = config.workspaces.find(ws => ws.id === config.activeWorkspaceId)

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
function deepMerge(target, source) {
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
console.log('Server working directory:', process.cwd());
console.log('Server file location:', __dirname);
console.log('Anvil version:', version.version);
let config;
try {
  // Load factory configuration
  const factoryConfig = JSON.parse(fs.readFileSync('./config.json', 'utf8'));
  console.log('Factory config loaded successfully');

  // Load local overrides if they exist
  let localOverrides = {};
  try {
    if (fs.existsSync('./config.local.json')) {
      localOverrides = JSON.parse(fs.readFileSync('./config.local.json', 'utf8'));
      console.log('Local config overrides loaded:', Object.keys(localOverrides));
    } else {
      console.log('No config.local.json found, using factory defaults only');
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
  console.log('Config loaded and validated successfully:', config);
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

const app = express();
const PORT = process.env.PORT || config.server.port;

// Middleware
app.use(express.json({ limit: '10mb' }));

// Set up marked with options
marked.setOptions({
  breaks: true,
  gfm: true
});

// Mount agent API routes
app.use('/api/agents', agentAPI.router);

// Initialize agents on server start
agentAPI.initializeAgents().then(success => {
  if (success) {
    console.log('[SERVER] Agent system initialized');
  } else {
    console.warn('[SERVER] Agent system initialization failed - agents will not be available');
  }
});

// Serve static files from React build
app.use(express.static('dist'));

// Function to scan directory for markdown files
async function scanDirectory(dirPath, baseUrl = '') {
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
      const title = extractTitle(content);
      const description = extractDescription(content);
      const type = extractType(content);
      const id = extractId(content);
      const capabilityId = extractCapabilityId(content);
      const system = extractSystem(content);
      const component = extractComponent(content);

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

      const item = {
        name: file,
        title: title || file.replace('.md', ''),
        description: description,
        type: itemType,
        path: baseUrl ? `${baseUrl.replace(/^\//, '')}/${file}` : file,
        projectPath: dirPath // Add source project path for workspace support
      };

      if (id) {
        item.id = id;
      }

      if (capabilityId) {
        item.capabilityId = capabilityId;
      }

      if (system) {
        item.system = system;
      }

      if (component) {
        item.component = component;
      }

      items.push(item);
    }
  }

  return items;
}

// Function to scan multiple project paths and combine results
async function scanProjectPaths(projectPaths) {
  let allItems = [];

  for (const projectPath of projectPaths) {
    const resolvedPath = path.resolve(projectPath);
    const items = await scanDirectory(resolvedPath);
    allItems = allItems.concat(items);
  }

  return allItems;
}

// Function to find file across project paths
async function findFileInProjectPaths(filePath, projectPaths) {
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
function extractTitle(content) {
  const match = content.match(/^#\s+(.+)$/m);
  return match ? match[1] : null;
}

// Extract description from markdown metadata
function extractDescription(content) {
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

function extractComponent(content) {
  const match = content.match(/^-\s*\*\*Component\*\*:\s*(.+)$/m);
  return match ? match[1].trim() : null;
}

// API Routes
// Unified enabler template endpoint 
app.get('/api/enabler-template/:capabilityId?', async (req, res) => {
  try {
    const { capabilityId } = req.params;
    
    // Create a temporary enabler object with placeholders
    const placeholderEnabler = {
      name: '[Enabler Name]',
      id: 'ENB-XXXXXX',
      status: 'In Draft',
      approval: 'Not Approved',
      priority: 'High',
      description: '[What is the purpose?]'
    };
    
    // Generate template content using the same function as capability form
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

app.get('/api/capabilities', async (req, res) => {
  try {
    const configPaths = getConfigPaths(config);
    const allItems = await scanProjectPaths(configPaths.projectPaths);
    const templates = await scanDirectory(configPaths.templates, 'templates');

    // Separate capabilities and enablers
    const capabilities = allItems.filter(item => item.type === 'capability');
    const enablers = allItems.filter(item => item.type === 'enabler');

    res.json({
      capabilities,
      enablers,
      templates
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

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

    // Separate capabilities and enablers
    const capabilities = allItems.filter(item => item.type === 'capability');
    const enablers = allItems.filter(item => item.type === 'enabler');

    // Enhance capabilities with dependency information
    const enhancedCapabilities = await Promise.all(
      capabilities.map(async (capability) => {
        try {
          // Read the full capability file to extract dependencies
          let fullPath;
          if (capability.projectPath) {
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

      const fileLocation = await findFileInProjectPaths(cleanFilePath, configPaths.projectPaths);
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
      resolvedPath = validateAndResolvePath(cleanFilePath, projectRoot, 'file path')
      
      // Additional file type validation
      if (!resolvedPath.endsWith('.md')) {
        throw new Error('Only .md files are allowed')
      }
    } catch (securityError) {
      console.warn(`[SECURITY] File access denied: ${securityError.message}`, { filePath, cleanFilePath, projectRoot })
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
      const fileLocation = await findFileInProjectPaths(cleanFilePath, configPaths.projectPaths);
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
      resolvedPath = validateAndResolvePath(cleanFilePath, projectRoot, 'save path')
      
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
    
    // Create backup if file exists
    if (await fs.pathExists(resolvedPath)) {
      const backupDir = path.join(path.dirname(resolvedPath), 'backup');
      await fs.ensureDir(backupDir);
      const fileName = path.basename(resolvedPath);
      const backupPath = path.join(backupDir, `${fileName}.backup.${Date.now()}`);
      await fs.copy(resolvedPath, backupPath);
    }
    
    await fs.writeFile(resolvedPath, content, 'utf8');
    console.log('[SAVE] File written successfully to:', resolvedPath);
    
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
      const fileLocation = await findFileInProjectPaths(cleanFilePath, configPaths.projectPaths);
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
      resolvedPath = validateAndResolvePath(cleanFilePath, projectRoot, 'delete path')
      
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
    
    // Create backup before deleting
    const backupDir = path.join(path.dirname(resolvedPath), 'backup');
    await fs.ensureDir(backupDir);
    const backupPath = path.join(backupDir, `${fileName}.deleted.${Date.now()}`);
    await fs.copy(resolvedPath, backupPath);
    
    // Delete the file
    await fs.unlink(resolvedPath);
    
    res.json({
      success: true,
      message: 'File deleted successfully',
      backup: backupPath
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
    let oldCleanPath, newCleanPath;
    
    if (oldFilePath.startsWith('templates/')) {
      const configPaths = getConfigPaths(config);
      oldCleanPath = oldFilePath.replace('templates/', '');
      newCleanPath = newFilePath.replace('templates/', '');
      projectRoot = path.resolve(configPaths.templates);
    } else {
      // For capabilities and enablers - determine correct project path
      const configPaths = getConfigPaths(config);
      oldCleanPath = oldFilePath;

      // Extract just the filename from the new path to avoid nested directories
      const filename = path.basename(newFilePath);
      const newDir = path.dirname(newFilePath);

      // Find the matching project path
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
        projectRoot = path.resolve(matchingProjectPath.replace(/^\.\//, ''));
        newCleanPath = filename;
      } else {
        // Fallback to first project path
        projectRoot = path.resolve(configPaths.projectPaths[0]);
        newCleanPath = newFilePath;
      }
    }
    
    try {
      oldFullPath = validateAndResolvePath(oldCleanPath, projectRoot, 'old rename path');
      newFullPath = validateAndResolvePath(newCleanPath, projectRoot, 'new rename path');
      
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
    
    if (!await fs.pathExists(oldFullPath)) {
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

// Get all capabilities for linking
app.get('/api/links/capabilities', async (req, res) => {
  try {
    const configPaths = getConfigPaths(config);
    const allItems = await scanProjectPaths(configPaths.projectPaths);
    const capabilities = allItems.filter(item => item.type === 'capability');

    const capabilitiesWithIds = await Promise.all(
      capabilities.map(async (cap) => {
        const filePath = path.join(cap.projectPath, path.basename(cap.path));
        const content = await fs.readFile(filePath, 'utf8');
        return {
          id: extractId(content),
          title: cap.title,
          path: cap.path
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

// Helper function to extract ID from content
function extractId(content) {
  const match = content.match(/^-\s*\*\*ID\*\*:\s*(.+)$/m);
  return match ? match[1] : null;
}

// Update bi-directional dependencies when a capability is saved
async function updateBidirectionalDependencies(capabilityId, upstreamDeps, downstreamDeps) {
  try {
    const configPaths = getConfigPaths(config);
    const allItems = await scanProjectPaths(configPaths.projectPaths);
    const capabilities = allItems.filter(item => item.type === 'capability');

    // Process each capability to update their dependencies
    for (const cap of capabilities) {
      let fullPath = path.join(cap.projectPath, path.basename(cap.path));

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
      resolvedPath = validateAndResolvePath(cleanFilePath, projectRoot, 'capability path')
      
      // Additional file type validation
      if (!resolvedPath.endsWith('.md')) {
        throw new Error('Only .md files can be saved as capabilities')
      }
    } catch (securityError) {
      console.error('[BI-DIRECTIONAL] Security validation failed:', securityError.message);
      return res.status(403).json({ error: 'Access denied: ' + securityError.message });
    }
    
    // Create backup if file exists
    if (await fs.pathExists(resolvedPath)) {
      const backupDir = path.join(path.dirname(resolvedPath), 'backup');
      await fs.ensureDir(backupDir);
      const fileName = path.basename(resolvedPath);
      const backupPath = path.join(backupDir, `${fileName}.backup.${Date.now()}`);
      await fs.copy(resolvedPath, backupPath);
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

    let fullPath, projectRoot;

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
      const fileLocation = await findFileInProjectPaths(cleanFilePath, configPaths.projectPaths);
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

    // Get the relative path for validation
    const relativePath = path.relative(projectRoot, fullPath);
    let resolvedPath = path.resolve(fullPath);

    try {
      resolvedPath = validateAndResolvePath(relativePath, projectRoot, 'capability-enablers path')
      
      if (!resolvedPath.endsWith('.md')) {
        throw new Error('Only .md files can be saved as capabilities with enablers')
      }
    } catch (securityError) {
      console.error('[CAPABILITY-ENABLERS] Security validation failed:', securityError.message);
      return res.status(403).json({ error: 'Access denied: ' + securityError.message });
    }
    
    // Create backup if file exists
    if (await fs.pathExists(resolvedPath)) {
      const backupDir = path.join(path.dirname(resolvedPath), 'backup');
      await fs.ensureDir(backupDir);
      const fileName = path.basename(resolvedPath);
      const backupPath = path.join(backupDir, `${fileName}.backup.${Date.now()}`);
      await fs.copy(resolvedPath, backupPath);
    }
    
    await fs.writeFile(resolvedPath, content, 'utf8');
    console.log('[CAPABILITY-ENABLERS] Main capability file saved:', resolvedPath);
    
    // Update bi-directional dependencies
    await updateBidirectionalDependencies(capabilityId, upstreamDeps || [], downstreamDeps || []);
    
    // Create enabler files for each enabler with content
    if (enablers && enablers.length > 0) {
      for (const enabler of enablers) {
        if (enabler.id && enabler.name) {
          await createEnablerFile(enabler, capabilityId);
        }
      }
    }
    
    const title = extractTitle(content);
    res.json({
      success: true,
      title,
      enablersCreated: enablers.filter(e => e.id && e.name).length
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
      resolvedPath = validateAndResolvePath(cleanFilePath, projectRoot, 'capability-enablers path')
      
      if (!resolvedPath.endsWith('.md')) {
        throw new Error('Only .md files can be saved as capabilities with enablers')
      }
    } catch (securityError) {
      console.error('[CAPABILITY-ENABLERS] Security validation failed:', securityError.message);
      return res.status(403).json({ error: 'Access denied: ' + securityError.message });
    }
    
    // Create backup if file exists
    if (await fs.pathExists(resolvedPath)) {
      const backupDir = path.join(path.dirname(resolvedPath), 'backup');
      await fs.ensureDir(backupDir);
      const fileName = path.basename(resolvedPath);
      const backupPath = path.join(backupDir, `${fileName}.backup.${Date.now()}`);
      await fs.copy(resolvedPath, backupPath);
    }
    
    // Save the enabler file
    await fs.writeFile(resolvedPath, content, 'utf8');
    console.log('[ENABLER-REPARENTING] Enabler file saved:', resolvedPath);

    // Update enabler fields in parent capability table
    if (enablerData.capabilityId) {
      await updateCapabilityEnablerFields(enablerData, enablerData.capabilityId);
    }

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

      await handleEnablerReparenting(enablerData.id, enablerData.name, originalCapabilityId, enablerData.capabilityId);
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
    const enablerFileName = enabler.id ? `${enabler.id.toLowerCase()}-enabler.md` : `${enabler.name.toLowerCase().replace(/[^a-z0-9-]/g, '-')}-enabler.md`;

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
          if (content.includes(`ID**: ${capabilityId}`)) {
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
      // Build the new row with all enabler fields
      const newRow = `| ${enablerData.id} | ${enablerData.name || ''} | ${enablerData.description || ''} | ${enablerData.status || ''} | ${enablerData.approval || ''} | ${enablerData.priority || ''} |`;
      
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
          if (content.includes(`ID**: ${capabilityId}`)) {
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

async function generateEnablerContentFromTemplate(enabler, capabilityId) {
  try {
    // Try to load the enabler template
    const templatePath = path.join(__dirname, 'templates', 'enabler-template.md');
    let templateContent = await fs.readFile(templatePath, 'utf8');
    console.log('[ENABLER-TEMPLATE] Template loaded, length:', templateContent.length, 'chars');
    
    const currentDate = new Date().toISOString().split('T')[0];
    
    // Define replacement map for safer template processing
    const replacements = {
      // Basic placeholders
      '\\[Enabler Name\\]': enabler.name || '[Enabler Name]',
      'ENB-XXXXXX': enabler.id || 'ENB-XXXXXX',
      'CAP-XXXXXX \\(Parent Capability\\)': capabilityId || 'CAP-XXXXXX (Parent Capability)',
      'YYYY-MM-DD': currentDate,
      'X\\.Y': '1.0',
      '\\[What is the purpose\\?\\]': enabler.description || '[What is the purpose?]',
      
      // Title replacement
      '^# \\[Enabler Name\\]': `# ${enabler.name || '[Enabler Name]'}`,
      
      // Metadata section replacements
      '- \\*\\*Name\\*\\*: \\[Enabler Name\\]': `- **Name**: ${enabler.name || '[Enabler Name]'}`,
      '- \\*\\*ID\\*\\*: ENB-XXXXXX': `- **ID**: ${enabler.id || 'ENB-XXXXXX'}`,
      '- \\*\\*Capability ID\\*\\*: CAP-XXXXXX \\(Parent Capability\\)': `- **Capability ID**: ${capabilityId || 'CAP-XXXXXX (Parent Capability)'}`,
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

## Implementation Plan

### Task 1 - Approval Check
**Description**: Execute enabler implementation only if each enabler is approved.

**Steps**:
1. Check Enabler Approval field if it is "Approved"
- if it is approved, continue on to the next set of steps below
- if it is not approved, skip all remaining tasks
2. Continue on to next Task

### Task 2 - Design
**Description**: Create a design under the Technical Specifications Section

**IMPORTANT**: Do NOT write any implementation code until this task is complete.
**IMPORTANT**: Do NOT create separate files - update the enabler specification documents.

**Steps**:
1. Develop a Design documenting it under the Technical Specifications Section
2. Document any APIs that would appropriate fit in API Technical Specifications
3. Document any Data Models in the Data Models Section
4. Document any Sequence Diagrams in the Sequence Diagrams Section
5. Document any Class Diagrams in the Class Diagrams Section
6. Document any Data Flow Diagrams in the Data Flow Diagrams Section
7. Document any State Diagrams in the State Diagrams Section
8. Document any Dependency Flow Diagrams in the Enabler Dependency Flow Diagrams Section
9. Document any other designs under Technical Specifications Section

### Task 3 - Implement
**Description**: Execute requirement implementation only if each requirement is approved.

**Steps**:
1. For all requirements, check if Requirement Status is "Approved".
- if it is approved continue to next steps
- if is is not approved skip and perform no other tasks
2. Implement the requirement

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
    const { name, description, projectPaths } = req.body;

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
      createdDate: new Date().toISOString()
    };

    if (!config.workspaces) {
      config.workspaces = [];
    }

    config.workspaces.push(newWorkspace);

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
    const { name, description, projectPaths } = req.body;

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

    // Validate the entire updated config
    const validationErrors = validateConfig(config);
    if (validationErrors.length > 0) {
      workspace.projectPaths.pop(); // Rollback
      return res.status(400).json({ error: 'Path addition failed: ' + validationErrors.join(', ') });
    }

    // Save to config.local.json
    await fs.writeFile('./config.local.json', JSON.stringify(config, null, 2), 'utf8');

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

    res.json(workspace);
  } catch (error) {
    console.error('[WORKSPACE] Error removing project path:', error);
    res.status(500).json({ error: 'Error removing project path: ' + error.message });
  }
});

// Handle enabler reparenting by updating capability enabler lists
async function handleEnablerReparenting(enablerId, enablerName, oldCapabilityId, newCapabilityId) {
  try {
    console.log(`[REPARENTING] Moving enabler ${enablerId} from ${oldCapabilityId} to ${newCapabilityId}`);

    const configPaths = getConfigPaths(config);

    // Remove enabler from old capability if specified
    if (oldCapabilityId) {
      await removeEnablerFromCapability(oldCapabilityId, enablerId, enablerName, configPaths.projectPaths);
    }

    // Add enabler to new capability if specified
    if (newCapabilityId) {
      await addEnablerToCapability(newCapabilityId, enablerId, enablerName, configPaths.projectPaths);
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
  } catch (error) {
    console.error(`[REPARENTING] Error removing enabler from capability ${capabilityId}:`, error);
  }
}

async function addEnablerToCapability(capabilityId, enablerId, enablerName, projectPaths) {
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
      const newEnablerRow = `| ${enablerId} | ${enablerName} |  | Draft | Not Approved | High |`;
      
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

// Serve React app for all non-API routes
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
  }
});

app.listen(PORT, () => {
  console.log(`Anvil v${version.version} server running at http://localhost:${PORT}`);
});