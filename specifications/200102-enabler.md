# Document Copy Functionality

## Metadata
- **Name**: Document Copy Functionality
- **Type**: Enabler
- **ID**: ENB-200102
- **Capability ID**: CAP-100234
- **Owner**: Product Team
- **Status**: Implemented
- **Approval**: Approved
- **Priority**: Medium
- **Analysis Review**: Not Required
- **Code Review**: Not Required

## Technical Overview
### Purpose
Creates independent copies of capabilities and enablers with automatic new unique ID generation, requirement renumbering, and relationship preservation to ensure copied documents are fully functional.

## Functional Requirements
| ID | Name | Requirement | Status | Priority | Approval |
|----|------|-------------|--------|----------|----------|
| FR-200120 | Capability Copying | Copy entire capability documents with new unique IDs and preserved metadata | Implemented | High | Approved |
| FR-200121 | Enabler Copying | Copy enabler documents with new IDs and proper capability association | Implemented | High | Approved |
| FR-200122 | ID Regeneration | Generate new unique IDs for copied documents to prevent collisions | Implemented | High | Approved |
| FR-200123 | Requirement Renumbering | Renumber all functional and non-functional requirements in copied enablers | Implemented | Medium | Approved |
| FR-200124 | Child Enabler Cascade | When copying capabilities, optionally copy all associated child enablers | Implemented | Medium | Approved |

## Non-Functional Requirements
| ID | Name | Requirement | Type | Status | Priority | Approval |
|----|------|-------------|------|--------|----------|----------|
| NFR-200120 | Atomicity | Copy operations must be atomic - either complete fully or fail without partial copies | Reliability | Implemented | High | Approved |
| NFR-200121 | Copy Performance | Document copy operations should complete within 3 seconds for typical documents | Performance | Implemented | Medium | Approved |

## Technical Specifications

### Implementation Details
- **API Endpoints**: POST `/api/copy/:type/*` (server.ts)
- **Backend Functions**: copyCapability(), copyEnabler() in server.ts
- **ID Generation**: Uses semi-unique number generation with collision detection

### Key Features
1. **Smart ID Generation**: Scans existing documents to ensure unique ID creation
2. **Metadata Preservation**: Copies all metadata fields while updating IDs and dates
3. **Requirement Renumbering**: Sequential renumbering of FR and NFR entries
4. **Relationship Updates**: Updates capability ID references in copied enablers
5. **File Naming**: Generates proper filenames based on new numeric IDs

### API Integration
- POST `/api/copy/capability/*` - Copy capability document
- POST `/api/copy/enabler/*` - Copy enabler document
- Uses GET `/api/file/*` internally to read source documents

## External Dependencies
- File System (fs-extra) for file operations
- ID generation utilities
- Markdown parsing utilities

## Testing Strategy
- Unit tests for ID generation and collision detection
- Integration tests for capability and enabler copy workflows
- Verification tests ensuring requirement renumbering correctness
