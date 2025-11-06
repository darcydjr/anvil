# Template API Endpoints

## Metadata
- **Name**: Template API Endpoints
- **Type**: Enabler
- **ID**: ENB-200700
- **Capability ID**: CAP-700890
- **Owner**: Product Team
- **Status**: Implemented
- **Approval**: Approved
- **Priority**: High
- **Analysis Review**: Not Required
- **Code Review**: Not Required

## Technical Overview
### Purpose
RESTful API endpoints for retrieving capability and enabler templates with auto-generated unique IDs for new document creation.

## Functional Requirements
| ID | Name | Requirement | Status | Priority | Approval |
|----|------|-------------|--------|----------|----------|
| FR-200700 | Get Capability Template | Return capability template with generated unique ID | Implemented | High | Approved |
| FR-200701 | Get Enabler Template | Return enabler template with generated unique ID | Implemented | High | Approved |
| FR-200702 | Template Content | Load template content from template files | Implemented | High | Approved |

## Non-Functional Requirements
| ID | Name | Requirement | Type | Status | Priority | Approval |
|----|------|-------------|------|--------|----------|----------|
| NFR-200700 | Template Availability | Templates must always be available for document creation | Reliability | Implemented | High | Approved |

## Technical Specifications

### Implementation
- Endpoints:
  - GET `/api/capability-template`
  - GET `/api/enabler-template`
- Location: server.ts
- ID Generation: Calls generateCapabilityId() and generateEnablerId()

## External Dependencies
- Template files
- ID generation functions
- File system access

## Testing Strategy
- Template retrieval tests
- ID injection tests
- API endpoint tests
