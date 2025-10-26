# Anvil

[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![Version](https://img.shields.io/badge/version-3.1.2-green.svg)]()

## Overview

**An AI-Powered No-Code Development Framework** that takes you from **Idea → Requirements → Design → Code → Test** without writing a single line of code.

Anvil provides a clean, organized interface for defining product specifications that automatically transform into working software through AI-powered development workflows.

Anvil is not just a PRD management tool - it's a complete product development pipeline that transforms ideas into working software. Define your product requirements using structured capabilities and enablers, then watch as AI automatically generates your entire application with comprehensive testing through seamless integration with Claude Code and other AI development tools.

**Complete Development Pipeline:**
- 💡 **Idea**: Capture and organize product concepts
- 📋 **Requirements**: Structure capabilities, enablers, and detailed specifications
- 🎨 **Design**: Automated system architecture and component design
- ⚙️ **Code**: AI-generated implementation with full functionality
- 🧪 **Test**: Automated test generation and validation
- 🚀 **Deploy**: Ready-to-run applications from your specifications

### Philosophy & Focus

Anvil is specifically designed for the **right side of the engineering problem** - the **Technical Capabilities and Enablers** that form the architectural foundation of software systems.

Product development has two distinct sides:
- **Left Side (Creative Design Space)**: Experiences and Features - the domain of Product Managers and UX designers
- **Right Side (Technical Implementation)**: Technical Capabilities and Enablers - the domain of Engineers and Architects

Anvil focuses exclusively on the right side, helping engineering teams define, organize, and manage the technical capabilities that enable product experiences. A new platform is coming soon for the left side that will marry **Experiences and Features** (Product Managers) with **Technical Capabilities and Enablers** (Engineers) to build the architectural runway needed to support exceptional user experiences.

## What's New in v3.1.2

### 🗂️ **File Explorer Integration**
- **Folder Icon Feature**: Added clickable folder icon next to "Specification Path" in document viewer for capabilities and enablers
- **File Explorer Access**: Click the folder icon to instantly open your system's file explorer to the document's directory
- **Cross-Platform Support**: Works on Windows (explorer), macOS (open), and Linux (xdg-open) file managers
- **Inline Display**: Folder icon appears seamlessly at the end of the specification path line, not on a separate line

### 🧭 **Navigation Panel Improvements**
- **Smart Workspace Collapsing**: Navigation panel now only collapses capabilities/enablers when switching workspaces
- **Persistent Expansion**: Capabilities and enablers stay expanded when saving or creating new documents within the same workspace
- **Improved User Experience**: No more unexpected navigation state changes during normal document operations

### 🔧 **Technical Fixes**
- **API Endpoint Correction**: Fixed double `/api` path issue in open-explorer endpoint that was causing 404 errors
- **Fire-and-Forget Operation**: File explorer opening now returns success immediately without waiting for command completion
- **Enhanced Error Handling**: Improved error reporting and success feedback for file explorer operations
- **DOM Query Optimization**: Fixed querySelector scope to prevent null reference errors when attaching folder icon event handlers

### 🎯 **Document Viewer Enhancements**
- **Specification Path Visibility**: Enhanced specification path display in capability and enabler metadata sections
- **Comprehensive Debugging**: Added detailed logging for troubleshooting document enhancement processes
- **Improved HTML Enhancement**: Better DOM parsing and manipulation for adding interactive elements to rendered documents

## Previous Release: v3.1.1

### 🚀 **Performance & User Experience Improvements**
- **Status Field Alphabetical Sorting**: Status dropdown fields in capability and enabler forms are now sorted alphabetically for easier selection
- **New Capability Status**: Added "Ready for Refactor" status for capabilities to support design refactoring workflows
- **External Change Notifications**: Fixed cross-project file access to enable proper notifications for approval and status changes
- **Workspace Switching Improvements**: All capabilities and enablers now collapse automatically when switching workspaces for cleaner navigation
- **Priority Field Fix**: Fixed capability form editor to correctly display enabler priority values from markdown files

### 🛠️ **Critical Performance Fix**
- **Document Save Performance**: Resolved critical performance issue causing 150+ API calls after file saves, which was causing very long document view load times
- **Stable WebSocket Handling**: Fixed useEffect dependency loop that was creating cascading API call storms
- **Improved Load Times**: Document views now load quickly after saves with normal performance restored

### 🔧 **Technical Improvements**
- **Path Validation Enhancement**: Fixed server-side path validation to support cross-project file access in multi-project workspaces
- **Enabler Priority Integration**: Added priority field to DocumentItem interface and server-side metadata extraction
- **useRef Pattern Implementation**: Used stable function references for WebSocket handlers to prevent dependency loops
- **Enhanced Error Handling**: Improved error logging and debugging for file access and metadata extraction

### 🎯 **UI/UX Enhancements**
- **Form Field Organization**: Status dropdowns now display options in logical alphabetical order
- **Workspace Management**: Cleaner workspace switching experience with automatic content collapse
- **Priority Display**: Fixed priority field synchronization between capability tables and enabler files
- **Responsive Navigation**: Improved navigation responsiveness after workspace changes

## Previous Release: v3.1.0

### 🧹 **Code Cleanup & Simplification**
- **Agent System Removal**: Completely removed all agent-related code and infrastructure to simplify the codebase
- **Configuration Cleanup**: Removed agent configuration files and references from TypeScript configuration
- **UI Streamlining**: Removed agent dashboard components and navigation to focus on core document management functionality
- **Logging System Enhancement**: Added comprehensive logging system with execution IDs, file output to logs directory, and configurable log levels
- **Version Display**: Added version number display in the application header for better visibility

### 🔧 **Technical Improvements**
- **Global Log Level Configuration**: Log level now configurable via config.json with DEBUG, INFO, WARN, ERROR levels
- **Enhanced Console Output**: Added colored console logging with timestamp and execution ID tracking
- **Improved Error Handling**: Better error handling and logging throughout the application
- **TypeScript Configuration**: Cleaned up TypeScript includes to remove agent references

### 🎯 **Focus Shift**
- **Core Functionality Focus**: Streamlined application to focus exclusively on PRD management, capabilities, and enablers
- **Simplified Architecture**: Removed complex agent orchestration in favor of direct document management workflow
- **Performance Optimization**: Reduced application complexity and improved startup performance

## Previous Releases

### What's New in v2.6.7

### 🎨 **User Interface Enhancements**
- **Direct File Access Routing**: Fixed React Router to support direct file access (e.g., `SOFTWARE_DEVELOPMENT_PLAN.md`) without requiring type parameters
- **Anvil Logo Implementation Status**: Replaced "In Implementation" status icons with Anvil logo (`anvil.png`) in both navigation sidebar and status change notifications
- **Enhanced Icon Visibility**: Increased Anvil logo icon size by 50% for better visibility (24px in notifications, 29px in navigation)
- **Backup Directory Exclusion**: File watcher now properly excludes backup directories to prevent unnecessary monitoring and performance impact

### 🔧 **Technical Improvements**
- **Routing System Enhancement**: Added catch-all `/*.md` route to handle direct file access without breaking existing functionality
- **Requirements Search Fix**: Fixed server-side requirement parsing to enable searching within enabler functional and non-functional requirements
- **Backup System Removal**: Completely removed automatic backup functionality for cleaner file operations and faster performance
- **File Watcher Optimization**: Enhanced chokidar configuration with comprehensive backup directory exclusion patterns
- **DocumentView Component Updates**: Enhanced to handle both parametrized routes and direct file access seamlessly

### 🎯 **Development Workflow Improvements**
- **Named Development Processes**: Server and client processes now have descriptive names in Windows Task Manager for easier identification
- **Improved Build Process**: Updated build configuration with proper process naming for development environment
- **Enhanced Status Notifications**: Status change popups now display Anvil branding for "In Implementation" status

### ⚙️ **Infrastructure Updates**
- **Simplified Development Scripts**: Removed custom nodemon configuration for cleaner development setup
- **Enhanced Metadata Processing**: Updated server to use centralized extractMetadata function for complete data parsing
- **Type System Updates**: Extended DocumentMetadata interface to include requirements data for better type safety
- **File System Monitoring**: Improved file watching with explicit backup directory filtering for better performance

## What's New in v2.6.0

### 🔍 **Complete Search Functionality Restored**
- **Global Search Bar**: Added search input to header with real-time search across capabilities, enablers, and requirements
- **Search Results Sidebar**: Dedicated search results view replacing the normal sidebar when searching
- **Comprehensive Coverage**: Search through titles, IDs, descriptions, system/component fields, and requirement content
- **Categorized Results**: Results organized by type (Capabilities, Enablers, Requirements) with result counts
- **Click Navigation**: Click any search result to navigate directly to the document or containing enabler

### 📋 **Document Copy Functionality**
- **Complete Document Copying**: New Copy button for both capabilities and enablers positioned next to Edit/Delete actions
- **Smart Capability Copying**: When copying a capability, automatically copies all associated enablers with updated references
- **Enabler Copy with Renumbering**: Copy enablers with automatic requirement renumbering (FR-001, FR-002, NFR-001, etc.)
- **Unique ID Generation**: All copied documents receive new unique IDs following existing generation patterns
- **Intelligent Naming**: Adds "(Copy)" prefix to document names while preserving metadata structure

### 🎨 **UI/UX Improvements**
- **Enhanced Search Interface**: Search bar positioned in header with search/clear icons and responsive design
- **Improved Component Navigation**: System/component groups now have expand/collapse functionality with chevron indicators
- **Button Repositioning**: Copy button placed to the right of Delete button with improved visibility (chart-2 color scheme)
- **Workspace Selector Fix**: Fixed dropdown positioning to prevent cutoff on left side of screen
- **Error Display Enhancement**: Changed error backgrounds from pink to neutral gray for better readability

### 🔧 **Technical Enhancements**
- **TypeScript Integration**: Full TypeScript implementation for search functionality with proper interfaces
- **State Management**: Enhanced AppContext with search state management and real-time search execution
- **API Endpoints**: New `/api/copy/{type}/{path}` endpoints for document copying with comprehensive error handling
- **File System Operations**: Robust file operations with directory creation, path validation, and backup support
- **Requirements Processing**: Enhanced requirement extraction and renumbering logic for copied documents

## What's New in v2.5.1

### 🔧 **Critical Bug Fix: Requirements Search Functionality**
- **REQUIREMENTS PARSING FIX**: Fixed critical case sensitivity bug preventing requirements from being parsed and searchable
- **ENABLER FILE PARSING**: Requirements are now properly extracted from enabler markdown files during server startup
- **SEARCH INTEGRATION**: Requirements now appear in search results when searching for requirement text content
- **DEBUG CLEANUP**: Removed temporary debug logging from server to improve performance

### 🧪 **Technical Implementation**
- **SERVER METADATA EXTRACTION**: Fixed `extractMetadata` function case sensitivity issue (`'Enabler'` vs `'enabler'`)
- **REQUIREMENTS EXTRACTION**: Enhanced enabler file processing to include functional and non-functional requirements
- **SEARCH COVERAGE**: Complete search functionality now covers capabilities, enablers, and requirements
- **CLEAN CODEBASE**: Removed debug console.log statements for production-ready performance

## What's New in v2.5.0

### 🔍 Global Search Functionality
- **Smart Search**: Search across all capabilities, enablers, and requirements with automatic regex pattern matching
- **Instant Results**: Real-time search results displayed in the navigation sidebar
- **Context Navigation**: Click on any search result to navigate directly to the document or requirement
- **Comprehensive Coverage**: Searches through titles, IDs, descriptions, and requirement content

### 🎛️ Enhanced Navigation Controls
- **Enabler Filtering**: New toggle button next to "Enablers" section to show all enablers or filter by selected capability
- **Visual Indicators**: Clear filter icons (Filter/FilterX) to show current filtering state
- **Contextual Display**: Filter toggle only appears when a capability is selected

### ✅ Improved Approval Workflows
- **Bulk Enabler Approval**: New "Approve All" button in capability forms to approve all enablers at once
- **Consistent Interface**: Approval buttons follow the same pattern as existing requirement approval functionality
- **Streamlined Workflow**: Speeds up approval processes for large capabilities with multiple enablers

### Core Principles

#### Components-Capabilities-Enablers-Requirements Model
- **Components** are logical software systems or applications that contain capabilities
- **Capabilities** represent high-level business functions within components that deliver value to users
- **Enablers** are technical implementations that realize capabilities through specific functionality
- **Requirements** define specific functional and non-functional needs within enablers

#### Quality and Governance
- All development follows strict approval workflows
- Pre-condition verification prevents bypassing of quality gates
- State-based progression ensures proper task sequencing

#### Documentation-First Approach
- Specifications are created before implementation
- Technical diagrams and designs guide development
- All artifacts are version controlled and traceable

## Application Interface

<div align="center">
  <img src="https://raw.githubusercontent.com/darcydjr/anvil/main/docs/anvil-screenshot.png" alt="Anvil Application Screenshot" width="600">
  <br>
  <em>Anvil's clean interface showing capability management with structured metadata, enabler relationships, and comprehensive status tracking</em>
</div>

## Quick Start

### Launch Anvil

**Windows:**
```bash
start-anvil.bat
```

**Mac/Linux:**
```bash
chmod +x start-anvil.sh
./start-anvil.sh
```

**Manual Start:**
```bash
npm install  # First time only
npm start    # Start the server
```

The start scripts will:
- Automatically install dependencies if needed
- Start the Anvil server
- Open at http://localhost:3000

### Launch Claude Code for Implementation

Once you have your specifications ready in Anvil:

1. **Navigate to Project Directory**:
   ```bash
   cd /path/to/your/project
   ```
   (This should be the parent folder that contains your `specifications/` folder with capabilities and enablers)

2. **Launch Claude Code**:
   ```bash
   claude
   ```

3. **Implementation Commands**:

   **For Discovery (Documentation Only):**
   ```
   Claude, please read the SOFTWARE_DEVELOPMENT_PLAN.md in the specifications folder and perform DISCOVERY ONLY on this project. Create specifications documentation but DO NOT implement anything.
   ```

   **For Reverse Engineering Existing Applications:**
   ```
   Claude, I have an existing application that I want to reverse engineer and add new capabilities to. Please analyze the codebase, create capability and enabler specifications, and then suggest new capabilities I can add.
   ```

   **For Implementation (After Discovery Complete):**
   ```
   Claude, please read the SOFTWARE_DEVELOPMENT_PLAN.md in the specifications folder and develop the application specified in the specifications folder.
   ```

### Discovery Mode: Reverse Engineering Made Easy

**Discovery** in Anvil is designed for **reverse engineering existing applications** and quickly understanding their technical architecture to add new capabilities. This powerful workflow allows you to:

#### 🔍 **Analyze Existing Codebases**
- **Code Analysis**: Claude automatically scans your existing application files
- **Architecture Discovery**: Identifies current technical capabilities and enablers
- **Dependency Mapping**: Understands how components interact and depend on each other
- **Pattern Recognition**: Discovers existing patterns and conventions in your codebase

#### 📋 **Generate Specifications Documentation**
- **Auto-Generated Capabilities**: Creates capability documents based on existing functionality
- **Enabler Identification**: Breaks down complex features into manageable enablers
- **Requirements Extraction**: Identifies functional and non-functional requirements from code
- **Technical Specifications**: Documents APIs, data models, and system architecture

#### 🚀 **Plan New Capabilities**
- **Gap Analysis**: Identifies areas where new capabilities can be added
- **Extension Points**: Suggests logical places to add new features
- **Architectural Runway**: Plans the technical foundation needed for new capabilities
- **Implementation Roadmap**: Provides a clear path from current state to desired features

#### 💡 **Use Cases for Discovery Mode**
- **Legacy Application Modernization**: Understand and document existing systems before enhancement
- **Team Onboarding**: Quickly get new developers up to speed on complex codebases
- **Feature Planning**: Identify where new capabilities can be added to existing applications
- **Technical Debt Assessment**: Understand current architecture before refactoring
- **Compliance Documentation**: Generate technical specifications for audit requirements

## Implementation Workflow

Anvil is designed to work seamlessly with Claude Code for automated development implementation:

### Step 1: Product Definition in Anvil
1. **Create Capabilities**: Define high-level system capabilities using Anvil's capability forms
2. **Add Enablers**: Break down capabilities into detailed enablers with requirements
3. **Set Status Fields**: Configure Analysis Review and Design Review requirements for each document
4. **Development Plans**: Ensure each enabler includes a comprehensive Development Plan section

### Step 2: Automated Development Sequence
Claude Code will automatically:

1. **📋 Analysis Phase** (if Analysis Review = "Required"):
   - Read all capability and enabler specifications
   - Analyze requirements and dependencies
   - Generate technical analysis documentation
   - Update Status: "Ready for Analysis" → "In Analysis" → "Ready for Design"

2. **🎨 Design Phase** (if Design Review = "Required"):
   - Create system architecture designs
   - Design component interfaces and APIs
   - Generate design documentation
   - Update Status: "Ready for Design" → "In Design" → "Ready for Implementation"

3. **⚙️ Implementation Phase**:
   - Generate code following development plans
   - Implement functional and non-functional requirements
   - Create tests and documentation
   - Update Status: "Ready for Implementation" → "In Implementation" → "Implemented"

4. **🔄 Status Synchronization**:
   - Automatically update Anvil document statuses
   - Sync requirement completion states
   - Trigger automated workflow transitions

### Implementation Tips
- **Detailed Development Plans**: Include specific implementation steps, file structures, and dependencies
- **Clear Requirements**: Use Functional and Non-Functional requirement tables with priorities
- **Status Configuration**: Set Analysis Review and Design Review to "Required" for comprehensive implementation
- **Directory Structure**: Organize specifications in logical system/component folders for Claude to navigate
- **Regular Sync**: Refresh Anvil after implementation phases to see updated statuses

## Features

### Document Organization
- **Capabilities Section**: High-level capability documents
- **Enablers Section**: Detailed feature enabler documents
- **Templates Section**: Template files for creating new documents
- Automatic categorization based on Type metadata field

### Metadata System
- **Type**: Automatically categorizes documents (Capability, Enabler, Template)
- **ID**: Unique identifier (CAP-XXXX for capabilities, ENB-XXXX for enablers)
- **Description**: Brief description extracted and displayed in navigation
- **Title**: Clean titles without redundant prefixes

### User Interface
- Responsive design with editor swap-in functionality
- Clean, modern design with gradient header
- **Light/Dark Mode**: Toggle between light and dark themes in Settings
- Mobile-responsive design
- Hover effects and active states for navigation items
- **Global Search**: Real-time search across capabilities, enablers, and requirements with dedicated search results view
- **Document Copy**: Complete copy functionality for capabilities and enablers with smart ID generation and requirement renumbering
- **Expandable Navigation**: System/component groups with expand/collapse functionality for better organization
- **Enabler Filtering**: Toggle to show all enablers or filter by selected capability
- **Approval Management**: Bulk approval features for enablers and requirements

### Document Creation & Management
- **Create New Capabilities**: Generate new capability documents from templates
- **Create New Enablers**: Generate new enabler documents from templates
- **Smart Template Loading**: Automatically populates metadata with current date and generated IDs
- **Form-based Editor**: User-friendly web forms with markdown editing toggle
- **Auto-naming Convention**: Ensures proper file naming (-capability.md, -enabler.md)

## Architecture

### Frontend (React)
- **Framework**: React 18 with Vite for fast development and building
- **State Management**: React Context for global application state
- **Routing**: React Router for client-side navigation
- **Styling**: CSS modules with modern responsive design

### Backend (Node.js + Express)
- **Server**: Express.js REST API
- **File Operations**: Markdown file management and parsing
- **APIs**: RESTful endpoints for CRUD operations
- **Agent System**: Orchestrator-based subagent management

### AI Agent Layer
- **Orchestrator**: Central command system managing all subagents
- **Router**: Intelligent request routing to appropriate agents
- **Job Queue**: Concurrent execution with history tracking
- **Event System**: Real-time status updates and notifications

## Configuration

Anvil supports **workspace-based configuration** for managing multiple document collections:

### Workspace Features
- **Multiple Workspaces**: Create and manage multiple independent workspaces
- **Multi-Path Support**: Each workspace can have multiple project paths for document storage
- **Active Workspace**: Only one workspace is active at a time, determining which documents are visible
- **Centralized Templates**: Single templates directory shared across all workspaces

### Configuration Structure (config.json)
```json
{
  "workspaces": [
    {
      "id": "ws-default",
      "name": "Default Workspace",
      "description": "Primary document workspace",
      "isActive": true,
      "projectPaths": ["../specifications", "./docs"],
      "createdDate": "2025-09-17T22:30:00.000Z"
    }
  ],
  "activeWorkspaceId": "ws-default",
  "templates": "./templates",
  "server": { "port": 3000 },
  "ui": {
    "title": "Anvil",
    "description": "Product Requirements Document Browser"
  }
}
```

## API Endpoints

- `GET /api/capabilities` - Returns categorized documents (capabilities, enablers, templates)
- `GET /api/file/*` - Returns specific file content with rendered HTML
- `POST /api/copy/:type/*` - Copy capability or enabler with smart ID generation and requirement renumbering
- `GET /api/workspaces` - Get all workspaces and active workspace ID
- `POST /api/workspaces` - Create new workspace
- `GET /api/agents` - List all AI agents
- `POST /api/agents/analyze` - Analyze documents with AI

## Dependencies

### Server Dependencies
- **express**: Web server framework
- **marked**: Markdown parsing and rendering
- **fs-extra**: Enhanced file system operations
- **uuid**: Unique ID generation for agent jobs

### Client Dependencies
- **react**: UI framework
- **react-router-dom**: Client-side routing
- **axios**: HTTP client for API calls
- **lucide-react**: Icon library
- **mermaid**: Diagram rendering

## Release Notes & Version History

### v3.0.0 - Dynamic Enabler Status System ✅

#### 🔄 **Major Feature: Dynamic Enabler Synchronization**
- **ELIMINATES SYNC ISSUES**: Capability files now only store Enabler ID and Description, while Name, Status, Approval, and Priority are dynamically looked up from enabler files
- **SINGLE SOURCE OF TRUTH**: Enabler metadata is now the authoritative source, preventing data duplication and synchronization conflicts
- **AUTOMATIC ENHANCEMENT**: Server automatically enhances enabler tables with live data when serving capability documents
- **BACKWARD COMPATIBLE**: Handles both old format (6 columns) and new format (2 columns) seamlessly
- **ERROR HANDLING**: Clear indicators when enabler files are missing or not found

#### 🔧 **Technical Implementation**
- **SERVER ENHANCEMENT**: Added `enhanceEnablerTablesWithDynamicData()` function for real-time data injection
- **API EXTENSION**: New `/api/capabilities-dynamic` endpoint for enhanced capability data
- **MARKDOWN OPTIMIZATION**: Updated `markdownUtils.ts` to generate simplified enabler table format
- **TYPE SAFETY**: Enhanced TypeScript support for dynamic enabler data structures

#### 📊 **Benefits**
- **NO MORE MANUAL SYNC**: Changes to enabler status automatically appear in all related capability views
- **REDUCED MAINTENANCE**: Single point of data management for enabler metadata
- **IMPROVED ACCURACY**: Eliminates possibility of outdated enabler data in capability files
- **ENHANCED UX**: Always shows current enabler status without manual refresh

### v2.5.1 - Requirements Search Bug Fix ✅

#### 🔧 **Critical Bug Fix: Requirements Search Functionality**
- **CASE SENSITIVITY FIX**: Fixed critical bug in server.js where `extractMetadata` function was checking for uppercase 'Enabler' while `extractType` returns lowercase 'enabler'
- **REQUIREMENTS PARSING**: Requirements from enabler files are now properly parsed and included in search functionality
- **SEARCH COMPLETION**: All three document types (capabilities, enablers, requirements) now fully searchable
- **DEBUG CLEANUP**: Removed temporary debug console.log statements for production performance

#### 🧪 **Technical Implementation**
- **SERVER.JS FIX**: Changed condition from `if (type === 'Enabler')` to `if (type === 'enabler')` in extractMetadata function
- **REQUIREMENTS EXTRACTION**: Fixed functional and non-functional requirements extraction from enabler markdown files
- **SEARCH INTEGRATION**: Requirements now appear in sidebar search results when searching requirement text
- **PERFORMANCE OPTIMIZATION**: Cleaned debug logging for faster server response times

#### 🚀 **Deployment Steps Completed**
- **VERSION UPDATE**: Updated to v2.5.1 across package.json and README
- **SERVER RESTART**: Restarted server to apply requirements parsing fix
- **SEARCH VALIDATION**: Confirmed requirements now searchable (Log Application Start, Display HTML Content, etc.)
- **BACKWARDS COMPATIBLE**: All existing functionality preserved with enhanced search coverage

### v2.4.6 - Fix Enabler Updates Not Refreshing Parent Capability ✅

#### 🐛 **Critical Bug Fix: Real-Time Capability Refresh When Enabler Updated**
- **ENABLER-CAPABILITY SYNC**: Fixed issue where updating an enabler file didn't trigger refresh of its parent capability's enabler list in the UI
- **REAL-TIME BROADCAST**: Added `broadcastFileChange` calls after capability file updates in `updateCapabilityEnablerFields`, `removeEnablerFromCapability`, and `addEnablerToCapability` functions
- **WEBSOCKET INTEGRATION**: Enhanced file watcher system to properly notify clients when enabler changes affect capability files programmatically

#### 🔧 **Technical Implementation**
- **SERVER.JS UPDATES**: Modified enabler sync functions to broadcast file changes for capability files after updates
- **CAPABILITY SYNC**: Enhanced `updateCapabilityEnablerFields` function to notify clients when capability files are modified due to enabler changes
- **REPARENTING SUPPORT**: Added broadcasting for capability file changes during enabler reparenting operations

#### 🚀 **Deployment Steps Completed**
- **VERSION UPDATE**: Updated to v2.4.6 across package.json and README
- **CLIENT BUILD**: Rebuilt client application with latest changes
- **SERVER RESTART**: Restarted server to apply enabler-capability sync improvements
- **BACKWARDS COMPATIBLE**: All existing functionality preserved with improved real-time synchronization

### v2.4.5 - Template Form Field Fixes ✅

#### 🐛 **Critical Bug Fixes: Template Form Field Issues**
- **ENABLER FORM FIX**: Fixed enabler form showing explanatory requirement text ("Descriptive name for this specific requirement...") in name field by properly commenting field definitions in template
- **CAPABILITY ID AUTO-GENERATION**: Fixed capability template endpoint to generate unique IDs instead of showing "CAP-XXXXXX" placeholder
- **TEMPLATE COMMENT PROCESSING**: HTML comments in templates now properly prevent explanatory text from being processed as form content
- **UNIQUE ID GENERATION**: Each new capability now receives a properly generated unique ID (e.g., CAP-602488, CAP-136929)

#### ⚙️ **Infrastructure Enhancements**
- **SERVER TEMPLATE GENERATION**: Updated `/api/capability-template` endpoint to call `generateCapabilityId()` function for unique ID creation
- **WORKSPACE TEMPLATE FIXES**: Fixed enabler template field definitions in workspace SOFTWARE_DEVELOPMENT_PLAN.md files
- **COMMENT PRESERVATION**: Field definition comments preserved for documentation while preventing form field contamination
- **TEMPLATE CONSISTENCY**: Ensured both root and workspace template files maintain consistent field definition handling

#### 🔄 **Version Management**
- **VERSION BUMP**: Updated from 2.4.4 to 2.4.5 across all package.json files
- **CLIENT REBUILD**: Rebuilt React client application with template fixes
- **SERVER RESTART**: Restarted server to apply template generation improvements
- **BACKWARDS COMPATIBLE**: All existing functionality preserved with improved template handling

### v2.4.3 - Copy-to-Clipboard for Claude Commands ✅

#### ✨ **Enhancement: Copy-to-Clipboard Functionality in Software Development Plan**
- **COPY BUTTONS**: Added copy-to-clipboard buttons to code blocks containing "Claude, please" commands in the Software Development Plan
- **SMART DETECTION**: Automatically detects code blocks with Claude commands and adds copy icons in the upper right corner
- **VISUAL FEEDBACK**: Copy button changes to a checkmark when successfully copied with smooth animations
- **TOAST NOTIFICATIONS**: User-friendly success/error messages when copying to clipboard

#### ⚙️ **Infrastructure Enhancements**
- **ENHANCED MARKDOWN RENDERER**: Created sophisticated MarkdownRenderer component in Plan.jsx that properly handles code blocks
- **CODEBLOCK COMPONENT**: New CodeBlock component with integrated copy functionality and hover effects
- **CLIPBOARD API**: Utilizes modern navigator.clipboard API for secure clipboard access
- **CSS STYLING**: Added responsive copy button styling with backdrop blur and hover animations

#### 🎨 **User Experience Improvements**
- **INTUITIVE INTERFACE**: Copy buttons appear only on relevant code blocks to avoid visual clutter
- **RESPONSIVE DESIGN**: Copy buttons work well on both desktop and mobile devices
- **ACCESSIBILITY**: Copy buttons include proper title attributes and ARIA compliance
- **SMOOTH ANIMATIONS**: Subtle hover effects and state transitions for better user feedback

#### 🔄 **Version Management**
- **VERSION BUMP**: Updated from 2.4.2 to 2.4.3 across all package.json files
- **BUILD OPTIMIZATION**: Rebuilt client with enhanced Plan component functionality
- **BACKWARDS COMPATIBLE**: All existing functionality preserved with added convenience features

### v2.4.2 - Navigation Panel Alphabetical Sorting ✅

#### ✨ **Enhancement: Alphabetical Sorting in Navigation Panel**
- **CAPABILITY SORTING**: Implemented alphabetical sorting for capabilities within each system/component group in the navigation panel
- **ENABLER SORTING**: Added alphabetical sorting for enablers in the navigation panel for improved organization
- **CASE-INSENSITIVE SORTING**: Sorting is case-insensitive and uses localeCompare for proper alphabetical ordering
- **IMPROVED NAVIGATION**: Enhanced user experience with predictable, organized navigation structure

#### ⚙️ **Infrastructure Enhancements**
- **SIDEBAR COMPONENT**: Enhanced Sidebar.jsx with sorting logic for both capabilities and enablers
- **DYNAMIC SORTING**: Sorting is applied dynamically when rendering navigation items without affecting data fetching
- **RESPONSIVE SORTING**: Maintains existing functionality while adding organized display order
- **FALLBACK HANDLING**: Proper handling of missing names/titles with fallback to empty string for consistent sorting

#### 🔄 **Version Management**
- **VERSION BUMP**: Updated from 2.4.1 to 2.4.2 across all package.json files
- **BUILD OPTIMIZATION**: Rebuilt client with alphabetical sorting implementation
- **BACKWARDS COMPATIBLE**: All existing functionality preserved with enhanced navigation organization

### v2.4.1 - Capability ID Edit Mode Fix ✅

#### 🐛 **Critical Bug Fix: Capability ID Preservation in Edit Mode**
- **TEMPLATE ID PRESERVATION**: Fixed DocumentEditor.jsx to preserve existing IDs when loading templates for editing instead of generating new ones
- **CONDITIONAL ID GENERATION**: Modified initializeNewDocument function to only generate new IDs if the template doesn't already contain an ID
- **EDIT MODE INTEGRITY**: Capability edit mode now correctly displays the actual capability ID from the document instead of a generated default
- **TEMPLATE HANDLING**: Enhanced template processing logic to maintain document integrity during edit operations

#### ⚙️ **Infrastructure Enhancements**
- **ID VALIDATION LOGIC**: Added conditional checks to prevent overriding existing IDs during template-based document initialization
- **EDIT VS CREATE DISTINCTION**: Improved logic separation between creating new documents and editing existing ones
- **DATA CONSISTENCY**: Ensured form data populated from existing documents maintains all original metadata fields

#### 🔄 **Version Management**
- **VERSION BUMP**: Updated from 2.4.0 to 2.4.1 across all package.json files
- **BUILD OPTIMIZATION**: Rebuilt client with ID preservation fix
- **BACKWARDS COMPATIBLE**: All existing functionality preserved with improved edit mode reliability

### v2.4.0 - Navigation Panel Capability Display Fix ✅

#### 🐛 **Critical Bug Fix: Capability Name Display**
- **METADATA EXTRACTION**: Fixed missing `extractName` function call in `scanDirectory` function in server.js that was causing capability names to not display properly in navigation panel
- **NAME FIELD PROCESSING**: Added proper extraction and assignment of the Name metadata field to capability objects returned from API
- **NAVIGATION CONSISTENCY**: Capability navigation panel now correctly displays capability names from metadata instead of falling back to file names
- **SIDEBAR DISPLAY**: Fixed Sidebar.jsx display logic that relies on `capability.name` field being properly populated from document metadata

#### ⚙️ **Infrastructure Enhancements**
- **EXTRACT METADATA FUNCTION**: Created comprehensive `extractMetadata` function to consolidate all metadata field extraction in a single reusable function
- **API DATA CONSISTENCY**: Ensured all capability objects returned from `/api/capabilities` endpoint include complete metadata including name, id, title, and other fields
- **SERVER-SIDE PROCESSING**: Enhanced server-side metadata processing to match client-side expectations for navigation and display components

#### 🔄 **Version Management**
- **VERSION BUMP**: Updated from 2.3.9 to 2.4.0 across all package.json files
- **BUILD OPTIMIZATION**: Rebuilt client and server with navigation fix
- **BACKWARDS COMPATIBLE**: All existing functionality preserved with improved navigation reliability

### v2.3.7 - Template Structure Optimization ✅

#### 🎯 **Template Processing Improvements**
- **STREAMLINED TEMPLATE STRUCTURE**: Removed ```markdown code blocks from Capability and Enabler templates in SOFTWARE_DEVELOPMENT_PLAN.md for cleaner processing
- **HTML COMMENT MARKERS**: Templates now use only HTML comment boundaries (<!-- START TEMPLATE --> / <!-- END TEMPLATE -->) for improved server parsing
- **MERMAID DIAGRAM FIXES**: Fixed mermaid diagram rendering issues in capability templates by correcting markdown structure
- **SERVER OPTIMIZATION**: Updated template extraction logic to handle cleaner template structure without markdown block dependencies

#### ⚙️ **Infrastructure Enhancements**
- **TEMPLATE BOUNDARY DETECTION**: Enhanced server code to reliably extract templates using HTML comment markers
- **DIAGRAM RENDERING**: Improved mermaid diagram support in capability creation workflow
- **VERSION SYNCHRONIZATION**: Updated package.json versions across client and server for consistency

### v2.3.0 - Reactive UI with Real-Time File Updates ✅

#### ✨ **NEW: Real-Time File Change Detection**
- **WEBSOCKET INTEGRATION**: Added WebSocket server for real-time communication between server and client
- **FILE WATCHING**: Implemented automatic file system monitoring using chokidar for all markdown files in workspace project paths
- **AUTOMATIC REFRESH**: UI automatically updates when capabilities and enablers are modified externally (by Claude Code or other tools)
- **NO MORE F5**: Eliminates the need to manually refresh the browser when files change

#### 🎯 **Frontend Reactive Features**
- **NAVIGATION PANEL AUTO-REFRESH**: Sidebar automatically updates when capabilities/enablers are added, modified, or deleted
- **DOCUMENT VIEWER AUTO-REFRESH**: Currently viewed documents automatically reload when their content changes
- **WEBSOCKET SERVICE**: New client-side WebSocket service with automatic reconnection and error handling
- **SMART FILTERING**: Only refreshes UI when relevant markdown files (capabilities/enablers) are modified

#### ⚙️ **Backend Real-Time Infrastructure**
- **WEBSOCKET SERVER**: Integrated WebSocket support with HTTP server using ws library
- **FILE WATCHER SETUP**: Chokidar-based file watching with configurable paths from workspace settings
- **GRACEFUL SHUTDOWN**: Proper cleanup of file watchers and WebSocket connections on server shutdown
- **SHUTDOWN API**: Added /api/shutdown endpoint for clean server restarts
- **BROADCAST SYSTEM**: Efficient message broadcasting to all connected clients when files change

#### 📡 **Network Dependencies**
- **NEW DEPENDENCY**: ws (WebSocket library) for real-time communication
- **NEW DEPENDENCY**: chokidar (file system watcher) for detecting file changes
- **HTTP UPGRADE**: Server now uses HTTP server with WebSocket upgrade support

#### 🔄 **Version Management**
- **VERSION BUMP**: Updated from 2.2.0 to 2.3.0 across all package.json files
- **BUILD OPTIMIZATION**: Rebuilt client and server with reactive UI capabilities
- **BACKWARDS COMPATIBLE**: All existing functionality preserved with enhanced real-time capabilities

### v2.2.0 - Workspace Auto-Copy SOFTWARE_DEVELOPMENT_PLAN.md Feature ✅

#### ✨ **NEW: Automatic SOFTWARE_DEVELOPMENT_PLAN.md Copying**
- **WORKSPACE SETTING**: Added checkbox in workspace settings to automatically copy SOFTWARE_DEVELOPMENT_PLAN.md when creating new project paths
- **DEFAULT ENABLED**: New workspaces have auto-copy enabled by default for seamless project setup
- **SMART COPYING**: Only copies if destination file doesn't already exist, creates directories as needed
- **COMPREHENSIVE COVERAGE**: Works in three scenarios:
  1. **Workspace Creation**: Copies to all initial project paths
  2. **Workspace Updates**: Copies to newly added paths during workspace editing
  3. **Individual Path Addition**: Copies when adding single paths via workspace management

#### 🎯 **Frontend Enhancements**
- **SETTINGS UI**: Added copySwPlan checkbox to both create and edit workspace forms in Settings.jsx
- **FORM MANAGEMENT**: Proper state management for checkbox with default-enabled behavior
- **API INTEGRATION**: Updated workspace API calls to include copySwPlan setting
- **RESET LOGIC**: Enhanced form reset functionality to maintain checkbox state consistency

#### ⚙️ **Backend Implementation**
- **WORKSPACE ENDPOINTS**: Enhanced creation and update endpoints to handle copySwPlan setting
- **FILE OPERATIONS**: Robust file copying using fs-extra with proper error handling
- **DIRECTORY CREATION**: Automatic creation of destination directories when needed
- **ROLLBACK SUPPORT**: Comprehensive error handling with workspace rollback on failures
- **DETAILED LOGGING**: Informative console logs for copy operations, skips, and errors

#### 📁 **Documentation & Examples**
- **HELLO WORLD REFERENCE**: Added SOFTWARE_DEVELOPMENT_PLAN.md to examples/hello-world/ directory
- **IMPLEMENTATION GUIDE**: Updated workspace configuration documentation
- **FEATURE USAGE**: Clear instructions for enabling/disabling auto-copy functionality

#### 🔄 **Version Management**
- **VERSION BUMP**: Updated from 2.1.0 to 2.2.0 across all package.json files
- **BUILD OPTIMIZATION**: Rebuilt client and server with latest changes
- **COMPREHENSIVE TESTING**: Verified feature functionality with existing workspace configurations

### v2.1.0 - System Architecture Visualization & Technical Specifications Template Bug Fixes ✅

#### 🎯 **System Architecture Visualization Improvements**
- **ARCHITECTURE DIAGRAM REDESIGN**: Updated RelationshipDiagram.jsx to show only capability-to-capability dependencies, removing enabler clutter for cleaner system visualization
- **DEPENDENCY LABELING**: Added clear "Upstream Dependency" and "Downstream Impact" labels to show directional relationships between capabilities
- **90-DEGREE ANGLES**: Improved diagram layout with basis curve type for cleaner, more professional architecture diagrams
- **SYSTEM BOUNDARIES**: Fixed system grouping boundaries to properly organize capabilities by system and component

#### 🛠️ **Critical Bug Fixes**
- **TECHNICAL SPECIFICATIONS DUPLICATION FIX**: Resolved critical bug where saving capabilities/enablers would create duplicate "Technical Specifications (Template)" sections every time
- **TEMPLATE PRESERVATION LOGIC**: Implemented proper logic to preserve existing Technical Specifications content while only adding templates for completely new documents
- **JAVASCRIPT SYNTAX FIXES**: Fixed malformed if-else blocks in markdownUtils.js that were causing build failures with "Failed to parse source for import analysis" errors

#### ✨ **Navigation Enhancement**
- **IMPLEMENTED STATUS INDICATORS**: Added yellow lightning bolt icons (⚡) for capabilities and enablers with "Implemented" status in the navigation sidebar
- **VISUAL STATUS DISTINCTION**: Implemented items now show bright yellow (#fbbf24) lightning bolts instead of hollow ones, with sparkle (✨) indicators
- **CSS STYLING**: Added comprehensive styling for implemented status with proper icon coloring and hover effects

#### 🗂️ **Example Project Enhancements**
- **HELLO WORLD SPECIFICATIONS**: Created comprehensive example specifications in examples/hello-world/ including:
  - **CAP-230875**: Web Application capability with technical specifications and dependency flow diagrams
  - **ENB-678403**: Javascript Node Application enabler with functional/non-functional requirements
  - **Additional Enablers**: Application Lifecycle Logging, Display Hello World functionality, and more
- **FUNCTIONAL REQUIREMENTS**: Added detailed FR tables with proper requirements (Web Server, Root Route, Static Files, Graceful Shutdown, Launch Script)
- **NON-FUNCTIONAL REQUIREMENTS**: Specified technical constraints (Port 4443) and performance requirements

#### 🔧 **Infrastructure & Developer Experience**
- **GITIGNORE UPDATES**: Added backup directory patterns to prevent accidental commits of backup files (examples/*/backup/, **/backup/, *.backup)
- **CLIENT BUILD OPTIMIZATION**: Improved build process and resolved JavaScript syntax issues that were blocking successful builds
- **TEMPLATE SYSTEM**: Enhanced template generation logic to work correctly with the new preservation system

#### 📋 **Documentation & Development Standards**
- **TECHNICAL SPECIFICATIONS WORKFLOW**: Clarified workflow where AI looks for "(Template)" text and replaces it with actual content during design phase
- **STATUS MANAGEMENT**: Improved status field handling throughout the application for better workflow tracking
- **METADATA CONSISTENCY**: Enhanced metadata field consistency across all document types

### v2.0.0 - Claude Code AI Subagent System ✅

#### 🤖 **NEW: AI-Powered Development Automation**
Anvil now includes a comprehensive **Claude Code Subagent System** that transforms your specifications into working software through AI-orchestrated workflows.

**Key Features:**
- **Agent Control Center**: Access via Bot icon (🤖) in header or navigate to `/agents`
- **Requirements Analyzer**: Analyzes and validates capabilities and enablers with metadata extraction, completeness validation, dependency checks, and improvement suggestions
- **Predefined Workflows**: Full Implementation Pipeline, Quick Analysis, Design Only, Test Generation
- **Agent API Endpoints**: Complete REST API for agent management and execution
- **Real-time Monitoring**: Job queue with progress tracking and execution history

**Available Agents:**
- ✅ **Requirements Analyzer**: Analyzes and validates capabilities and enablers
- 🔄 **Design Architect** *(Coming Soon)*: Creates system designs from requirements
- 🔄 **Code Generator** *(Coming Soon)*: Generates implementation code
- 🔄 **Test Automator** *(Coming Soon)*: Creates comprehensive test suites
- 🔄 **Documentation Generator** *(Coming Soon)*: Produces technical documentation

#### 📋 **Components → Capabilities → Enablers → Requirements Model**
- **ARCHITECTURAL REDESIGN**: Updated core framework to implement hierarchical model where Components have Capabilities, and Enablers implement Capabilities by adhering to Requirements
- **METADATA ENHANCEMENT**: Added System and Component fields to capability metadata, plus Analysis Review and Code Review fields to enablers
- **DOCUMENTATION UPDATE**: Updated SOFTWARE_DEVELOPMENT_PLAN.md with new conceptual model and complete metadata field specifications
- **EXAMPLE CLEANUP**: Removed Development Plan sections from all example files to follow new clean specification format
- **TEMPLATE CONSISTENCY**: Updated document templates to match actual form editor metadata fields

#### 🔧 **Infrastructure Improvements**
- **PLAN ACCESSIBILITY**: Fixed SOFTWARE_DEVELOPMENT_PLAN.md accessibility by using static file serving approach like README
- **WORKSPACE INTEGRATION**: Added root directory to workspace configuration for better file access
- **CLIENT REBUILD**: Updated client build to reflect header component changes

### v1.1.3 - Mermaid Diagram Fix ✅
- **RELATIONSHIP DIAGRAM FIX**: Fixed Mermaid parsing error that caused "Parse error on line 15" when rendering component relationship diagrams
- **ROBUST ID GENERATION**: Improved node ID generation to ensure valid Mermaid identifiers by replacing special characters with underscores

### v1.1.2 - Discovery UI Updates ✅
- **DISCOVERY ICON**: Changed Discovery icon from search to lightbulb with consistent blue styling
- **FEATURE STATUS**: Added "Feature Not Yet Implemented" notice banner to Discovery page

### v1.1.1 - Discovery Feature and Smart Rebuild ✅
- **DISCOVERY FEATURE**: Added Discovery page with markdown-capable text editor and AI analysis engine
- **SMART REBUILD DETECTION**: Enhanced startup scripts to detect client changes and automatically rebuild when needed

### v1.0.2 - Defect Fixes and Version Management ✅
- **DUPLICATE ENABLER FIX**: Fixed duplicate enabler file creation issue
- **CENTRALIZED VERSION MANAGEMENT**: Updated all code to use package.json as single source of truth for version information

### v1.0.0 - Initial Open Source Release ✅
- **APACHE 2.0 LICENSE**: Released under Apache 2.0 license with full open source compliance
- **COMPREHENSIVE FEATURE SET**: Complete PRD management system with capabilities, enablers, and requirements tracking
- **REACT + NODE.JS**: Modern full-stack application with React frontend and Node.js Express backend

## Contributing

We welcome contributions! Please read our [Contributing Guidelines](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

## License

This project is licensed under the Apache License 2.0 - see the [LICENSE](LICENSE) file for details.

## Copyright

Copyright 2025 Darcy Davidson

## Acknowledgments

- Built with React and Node.js
- Uses Lucide React for icons
- Markdown rendering with marked.js
- Diagram support via Mermaid.js