# Anvil

[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![Version](https://img.shields.io/badge/version-2.4.5-green.svg)]()

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
   Claude, please read the SOFTWARE_DEVELOPMENT_PLAN.md and perform DISCOVERY ONLY on this project. Create specifications documentation but DO NOT implement anything.
   ```

   **For Implementation (After Discovery Complete):**
   ```
   Claude, please read the SOFTWARE_DEVELOPMENT_PLAN.md and develop the application specified in the specifications folder.
   ```

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
- Mobile-responsive design
- Hover effects and active states for navigation items

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